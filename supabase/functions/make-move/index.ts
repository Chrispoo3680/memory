import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── CORS headers returned on every response ──────────────────────────────────
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Handler ───────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const { code, playerId, cardId } = await req.json();

    if (!code || !playerId || cardId === undefined) {
      return json({ error: "code, playerId, and cardId are required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Fetch game ────────────────────────────────────────────────────────────
    const { data: game, error: fetchError } = await supabase
      .from("games")
      .select("*")
      .eq("code", code)
      .single();

    if (fetchError || !game) return json({ error: "Game not found" }, 404);

    // ── Validate move ─────────────────────────────────────────────────────────
    if (game.status !== "playing")
      return json({ error: "Game is not in progress" }, 409);
    if (game.lock) return json({ error: "Game is locked" }, 409);
    if (game.current_turn !== playerId)
      return json({ error: "Not your turn" }, 403);

    const card = (game.board.cards as any[]).find((c) => c.id === cardId);
    if (!card) return json({ error: "Card not found" }, 404);
    if (card.matched) return json({ error: "Card already matched" }, 409);
    if ((game.flipped as number[]).includes(cardId)) {
      return json({ error: "Card already flipped" }, 409);
    }

    // Can only flip if 0 or 1 cards are currently face-up
    if ((game.flipped as number[]).length >= 2) {
      return json({ error: "Wait for current flips to resolve" }, 409);
    }

    // ── Lock game ─────────────────────────────────────────────────────────────
    await supabase.from("games").update({ lock: true }).eq("code", code);

    // ── Flip the card ─────────────────────────────────────────────────────────
    const newFlipped: number[] = [...(game.flipped as number[]), cardId];
    let newBoard = { ...game.board, cards: [...(game.board.cards as any[])] };
    let newCurrentTurn = game.current_turn;
    let newStatus = game.status;

    if (newFlipped.length === 2) {
      const [id1, id2] = newFlipped;
      const c1 = newBoard.cards.find((c: any) => c.id === id1);
      const c2 = newBoard.cards.find((c: any) => c.id === id2);

      if (c1.value === c2.value) {
        // ── Match ─────────────────────────────────────────────────────────────
        newBoard.cards = newBoard.cards.map((c: any) =>
          c.id === id1 || c.id === id2
            ? { ...c, matched: true, matchedBy: playerId }
            : c,
        );

        const allMatched = newBoard.cards.every((c: any) => c.matched);
        newStatus = allMatched ? "finished" : "playing";
        // Current player keeps their turn on a match

        await supabase
          .from("games")
          .update({
            board: newBoard,
            flipped: [],
            current_turn: newCurrentTurn,
            status: newStatus,
            lock: false,
          })
          .eq("code", code);
      } else {
        // ── No match — show both cards briefly, then hide ─────────────────────
        // First update: both cards visible
        await supabase
          .from("games")
          .update({
            board: newBoard,
            flipped: newFlipped,
            lock: true, // keep locked during the delay
          })
          .eq("code", code);

        // Give clients ~1.5 s to show the mismatch
        await sleep(1500);

        // Determine next player
        newCurrentTurn =
          playerId === game.player1 ? game.player2 : game.player1;

        // Second update: hide cards + switch turn + unlock
        await supabase
          .from("games")
          .update({
            flipped: [],
            current_turn: newCurrentTurn,
            lock: false,
          })
          .eq("code", code);
      }
    } else {
      // Only one card flipped so far — just record it and unlock
      await supabase
        .from("games")
        .update({
          flipped: newFlipped,
          lock: false,
        })
        .eq("code", code);
    }

    return json({ success: true });
  } catch (err) {
    console.error("make-move error:", err);
    return json({ error: String(err) }, 500);
  }
});
