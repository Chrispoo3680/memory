import { createClient } from "npm:@supabase/supabase-js";

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { code } = await req.json();
    if (!code) return json({ error: "code is required" }, 400);

    const { data: game, error: fetchError } = await supabase
      .from("games")
      .select("id, status, player1, player2")
      .eq("code", code)
      .maybeSingle();

    if (fetchError) return json({ error: fetchError.message }, 500);

    // Game already gone or finished — nothing to do
    if (!game || game.status === "finished") {
      return json({ success: true });
    }

    // Only the two players in the game may leave it
    if (game.player1 !== user.id && game.player2 !== user.id) {
      return json({ error: "Not a participant" }, 403);
    }

    if (game.status === "waiting") {
      // Host cancelled the lobby before anyone joined — delete the row entirely
      await supabase.from("games").delete().eq("code", code);
    } else {
      // Mid-game abandonment — mark abandoned so the other player is notified
      await supabase
        .from("games")
        .update({ status: "abandoned" })
        .eq("code", code);
    }

    return json({ success: true });
  } catch (err) {
    console.error("leave-game error:", err);
    return json({ error: String(err) }, 500);
  }
});
