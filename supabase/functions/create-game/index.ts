import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── CORS headers returned on every response ──────────────────────────────────
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function generateCode(length = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function buildBoard(width: number, height: number) {
  const total = width * height;
  const pairCount = total / 2;

  // Use letters; cycle back if more pairs than letters
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const values: string[] = [];
  for (let i = 0; i < pairCount; i++) {
    values.push(alphabet[i % alphabet.length]);
  }

  // Two of each value → shuffle
  const pairs = [...values, ...values];
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }

  const cards = pairs.map((value, id) => ({
    id,
    value,
    matched: false,
    matchedBy: null,
  }));
  return { cards, width, height };
}

// ── Handler ───────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const { playerId, boardWidth = 4, boardHeight = 4 } = await req.json();

    if (!playerId) {
      return new Response(JSON.stringify({ error: "playerId is required" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if ((boardWidth * boardHeight) % 2 !== 0) {
      return new Response(
        JSON.stringify({ error: "Board must have an even number of cells" }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Retry on code collision (very unlikely but safe)
    let code = "";
    for (let attempt = 0; attempt < 5; attempt++) {
      code = generateCode();
      const { data: existing } = await supabase
        .from("games")
        .select("code")
        .eq("code", code)
        .maybeSingle();

      if (!existing) break;
    }

    const board = buildBoard(boardWidth, boardHeight);

    const { error } = await supabase.from("games").insert({
      code,
      player1: playerId,
      player2: null,
      board,
      flipped: [],
      current_turn: playerId,
      lock: false,
      status: "waiting",
    });

    if (error) throw error;

    return new Response(JSON.stringify({ code }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-game error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
