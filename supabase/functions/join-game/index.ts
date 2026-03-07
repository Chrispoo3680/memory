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
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify caller identity from JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { code, displayName = "Anonymous" } = await req.json();
    if (!code) return json({ error: "code is required" }, 400);

    // Fetch the game using the service role — bypasses RLS
    const { data: game, error: fetchError } = await supabase
      .from("games")
      .select("*")
      .eq("code", code.toUpperCase())
      .maybeSingle();

    if (fetchError) return json({ error: fetchError.message }, 500);
    if (!game)      return json({ error: "Game not found." }, 404);

    // Validate joinability
    if (game.status !== "waiting") {
      return json({ error: "Game is not available to join." }, 409);
    }
    if (game.expires_at && new Date(game.expires_at) < new Date()) {
      return json({ error: "This game lobby has expired." }, 410);
    }
    if (game.player1 === user.id) {
      return json({ error: "You cannot join your own game." }, 403);
    }

    // Join the game
    const { data: updated, error: updateError } = await supabase
      .from("games")
      .update({
        player2: user.id,
        player2_name: displayName,
        status: "playing",
      })
      .eq("code", code.toUpperCase())
      .select()
      .single();

    if (updateError) return json({ error: updateError.message }, 500);

    return json(updated);
  } catch (err) {
    console.error("join-game error:", err);
    return json({ error: String(err) }, 500);
  }
});
