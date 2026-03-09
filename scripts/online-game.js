import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { imagePaths } from "./image-paths.js";

// ── Supabase config ──────────────────────────────────────────────────────────
const SUPABASE_URL = "https://npkvjfgcsjcapgqwfgut.supabase.co";
const PUBLIC_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wa3ZqZmdjc2pjYXBncXdmZ3V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MjMxNDcsImV4cCI6MjA4ODE5OTE0N30.gzdKuLtNz0i-6fsbrxrZlbHwiBnkxiNqJ9pjv9QSkoo";

const supabase = createClient(SUPABASE_URL, PUBLIC_ANON_KEY);

// ── Game state ───────────────────────────────────────────────────────────────
let playerId = null; // this player's UUID (from anonymous auth)
let playerName = null; // this player's display name
let authToken = null; // cached JWT for use in beforeunload
let gameCode = null; // current game code
let boardWidth = 4; // columns
let boardHeight = 4; // rows
let realtimeChannel = null;
let lobbyTimerId = null; // client-side 10-min lobby expiry timer
let pollIntervalId = null; // polling fallback while waiting for player 2
let currentGameState = null; // last authoritative game state from server
// ── DOM refs ─────────────────────────────────────────────────────────────────
const lobby = document.getElementById("lobby");
const gameScreen = document.getElementById("game-screen");

const playerNameInput = document.getElementById("player-name");
const boardWidthSelect = document.getElementById("board-width");
const boardHeightSelect = document.getElementById("board-height");
const createBtn = document.getElementById("create-btn");
const gameCodeDisplay = document.getElementById("game-code-display");
const gameCodeSpan = document.getElementById("game-code");

const joinCodeInput = document.getElementById("join-code");
const joinBtn = document.getElementById("join-btn");

const lobbyError = document.getElementById("lobby-error");

const statusText = document.getElementById("status-text");
const scoreP1 = document.getElementById("score-p1");
const scoreP2 = document.getElementById("score-p2");
const leaveBtn = document.getElementById("leave-btn");

const memoryContainer = document.getElementById("memory-container");

const resultOverlay = document.getElementById("result-overlay");
const resultTitle = document.getElementById("result-title");
const resultSub = document.getElementById("result-sub");
const playAgainBtn = document.getElementById("play-again-btn");

// ── Helpers ───────────────────────────────────────────────────────────────────
function showLobbyError(msg) {
  lobbyError.textContent = msg;
  lobbyError.classList.remove("hidden");
}

function clearLobbyError() {
  lobbyError.classList.add("hidden");
}

function clearLobbyTimer() {
  if (lobbyTimerId) {
    clearTimeout(lobbyTimerId);
    lobbyTimerId = null;
  }
}

function getDisplayName() {
  return playerNameInput.value.trim() || "Anonym";
}

/**
 * Signs the player in anonymously (or reuses an existing session).
 * Updates their display name in auth metadata.
 * Sets the module-level `playerId` (UUID) and `playerName`.
 */
async function signIn(displayName) {
  // Reuse existing session if already signed in
  const {
    data: { session: existing },
  } = await supabase.auth.getSession();

  let session = existing;

  if (!session) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw new Error("Auth failed: " + error.message);
    session = data.session;
  }

  // Store / update the display name in user metadata
  await supabase.auth.updateUser({ data: { display_name: displayName } });

  playerId = session.user.id; // UUID
  playerName = displayName;
  authToken = session.access_token;
}

/** Returns the current JWT for use in fetch Authorization headers. */
async function getAuthToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  authToken = session?.access_token ?? authToken; // keep cache fresh
  return authToken ?? "";
}

/**
 * Tells the server this player is leaving.
 * Server deletes the row when status=waiting, sets abandoned when playing.
 */
async function leaveGame() {
  if (!gameCode) return;
  const code = gameCode; // capture before showLobby() clears it
  const token = await getAuthToken();
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/leave-game`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: PUBLIC_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code }),
    });
  } catch (_) {
    // Best-effort — don't block the UI
  }
}

/**
 * Calls the create-game Edge Function.
 * Returns the generated game code string.
 */
async function createGame(displayName, width, height) {
  const token = await getAuthToken();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/create-game`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: PUBLIC_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      displayName,
      boardWidth: width,
      boardHeight: height,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error ${res.status}`);
  }

  const data = await res.json();
  return data.code;
}

/**
 * Joins an existing game by updating player2 and status.
 * Returns the full game row.
 */
/**
 * Joins an existing game via the join-game Edge Function.
 * Server validates joinability, expiry, and self-join using the service role key.
 */
async function joinGame(code, displayName) {
  const token = await getAuthToken();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/join-game`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: PUBLIC_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ code, displayName }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
  return data;
}

/**
 * Sends a flip-card move to the make-move Edge Function.
 * The server is authoritative; the client never modifies game state directly.
 */
async function flipCard(cardId) {
  const token = await getAuthToken();
  await fetch(`${SUPABASE_URL}/functions/v1/make-move`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: PUBLIC_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    // playerId is NOT sent — the server reads it from the verified JWT
    body: JSON.stringify({ code: gameCode, cardId }),
  });
}

// ── Realtime subscription ─────────────────────────────────────────────────────

/**
 * Subscribes to postgres_changes on the games table for this game code.
 * Every UPDATE event triggers a full re-render via handleGameUpdate().
 */
function subscribeToGame(code) {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }

  realtimeChannel = supabase
    .channel("game-" + code)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "games",
        filter: `code=eq.${code}`,
      },
      (payload) => {
        handleGameUpdate(payload.new);
      },
    )
    .subscribe();

  // Polling fallback: covers both lobby (waiting for P2) and gameplay
  // (in case Realtime postgres_changes is blocked by RLS).
  if (pollIntervalId) clearInterval(pollIntervalId);
  pollIntervalId = setInterval(async () => {
    // Stop only when the game is fully torn down
    if (!gameCode) {
      clearInterval(pollIntervalId);
      pollIntervalId = null;
      return;
    }
    const { data } = await supabase
      .from("games")
      .select("*")
      .eq("code", code)
      .maybeSingle();
    if (!data) return;
    handleGameUpdate(data);
    // Stop polling for terminal states (closeGame/showResult handle cleanup)
    const terminal = ["finished", "abandoned", "expired"];
    if (terminal.includes(data.status)) {
      clearInterval(pollIntervalId);
      pollIntervalId = null;
    }
  }, 1500);
}

// ── Game update handler ───────────────────────────────────────────────────────
function handleGameUpdate(game) {
  // ── Terminal states that close the game ──────────────────────────────────
  if (game.status === "expired") {
    clearLobbyTimer();
    closeGame("Spilløkten utløp etter 10 minutter.");
    return;
  }
  if (game.status === "abandoned") {
    clearLobbyTimer();
    closeGame("Motstanderen forlot spillet.");
    return;
  }

  // Store authoritative state
  currentGameState = game;

  const cards = game.board?.cards ?? [];
  const flipped = game.flipped ?? [];
  const width = game.board?.width ?? boardWidth;
  const height = game.board?.height ?? boardHeight;

  boardWidth = width;
  boardHeight = height;

  // ── Host waiting for player2 to join ─────────────────────────────────────
  // Transition to game screen when status flips to "playing"
  if (game.status === "playing" && gameScreen.classList.contains("hidden")) {
    clearLobbyTimer();
    showGameScreen(game);
    return;
  }

  // Still waiting — do nothing until someone joins
  if (game.status === "waiting") return;

  renderBoard(cards, flipped, width, height);
  updateStatusBar(game);
  updateScoreboard(cards, game);

  if (game.status === "finished") {
    showResult(cards, game);
  }
}

/**
 * Called when the server terminates the game (expired / abandoned).
 * Cleans up subscription and returns the player to the lobby with a message.
 */
function closeGame(reason) {
  clearLobbyTimer();
  if (pollIntervalId) {
    clearInterval(pollIntervalId);
    pollIntervalId = null;
  }
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
  const code = gameCode;
  gameCode = null;
  currentGameState = null;

  // Show lobby
  gameScreen.classList.add("hidden");
  lobby.classList.remove("hidden");
  gameCodeDisplay.classList.add("hidden");
  resultOverlay.classList.add("hidden");

  // Display reason to the player
  showLobbyError(reason);
  console.info(`Game ${code} closed: ${reason}`);
}

// ── Render ────────────────────────────────────────────────────────────────────

/**
 * Renders the memory board grid using a stable DOM — card elements are created
 * once and updated in-place on subsequent calls, so click listeners are never
 * lost mid-click and there is no visual flash between updates.
 *
 * - matched cards → show image (green)
 * - flipped cards → show image (purple); includes optimistically-flipped cards
 * - hidden cards  → question mark via CSS, clickable
 */
function renderBoard(cards, flipped, width, height) {
  memoryContainer.style.gridTemplateColumns = `repeat(${width}, 1fr)`;
  memoryContainer.style.gridTemplateRows = `repeat(${height}, 1fr)`;

  // Create card elements on first render or when the board size changes
  if (memoryContainer.children.length !== cards.length) {
    memoryContainer.innerHTML = "";
    cards.forEach((card) => {
      const el = document.createElement("div");
      el.className = "memory-card";
      el.dataset.cardId = String(card.id);
      memoryContainer.appendChild(el);
    });
  }

  // Update each card's state in-place — never destroy existing elements
  cards.forEach((card) => {
    const el = memoryContainer.querySelector(`[data-card-id="${card.id}"]`);
    if (!el) return;

    const isFlipped = flipped.includes(card.id);
    const isMatched = card.matched;
    const wasMatched = el.classList.contains("matched");
    const wasFlipped = el.classList.contains("flipped");
    const wasFaceDown = !wasFlipped && !wasMatched;

    if (isMatched && !wasMatched) {
      el.innerHTML = `<img src="${imagePaths[card.value]}" alt="">`;
      el.className = "memory-card matched";
      el.onclick = null;
    } else if (isFlipped && !wasFlipped && !wasMatched) {
      el.innerHTML = `<img src="${imagePaths[card.value]}" alt="">`;
      el.className = "memory-card flipped";
      el.onclick = null;
    } else if (!isFlipped && !isMatched && !wasFaceDown) {
      // Card was flipped/matched but is now face-down (mismatch resolved)
      el.innerHTML = "";
      el.className = "memory-card";
      el.onclick = () => flipCard(card.id);
    } else if (wasFaceDown && !el.onclick) {
      // First render: ensure face-down cards have a click handler
      el.onclick = () => flipCard(card.id);
    }
  });
}

function updateStatusBar(game) {
  const isMyTurn = game.current_turn === playerId;
  const turnName =
    game.current_turn === game.player1
      ? (game.player1_name ?? "Player 1")
      : (game.player2_name ?? "Player 2");

  if (game.status === "waiting") {
    statusText.textContent = "Venter på motstander…";
    statusText.className = "";
  } else if (game.status === "finished") {
    statusText.textContent = "Spillet er over!";
    statusText.className = "";
  } else if (isMyTurn) {
    statusText.textContent = "Din tur!";
    statusText.className = "your-turn";
  } else {
    statusText.textContent = `${turnName} sin tur…`;
    statusText.className = "their-turn";
  }
}

function getScores(cards, game) {
  return {
    p1Score: cards.filter((c) => c.matched && c.matchedBy === game.player1)
      .length,
    p2Score: cards.filter((c) => c.matched && c.matchedBy === game.player2)
      .length,
    p1Name: game.player1_name ?? "Spiller 1",
    p2Name: game.player2_name ?? "Spiller 2",
  };
}

function updateScoreboard(cards, game) {
  const { p1Score, p2Score, p1Name, p2Name } = getScores(cards, game);
  scoreP1.textContent = `${p1Name}  ${p1Score}`;
  scoreP2.textContent = `${p2Name}  ${p2Score}`;
}

function showResult(cards, game) {
  const { p1Score, p2Score, p1Name, p2Name } = getScores(cards, game);

  if (p1Score > p2Score) {
    resultTitle.textContent =
      playerId === game.player1 ? "Du vant! 🎉" : `${p1Name} vant!`;
  } else if (p2Score > p1Score) {
    resultTitle.textContent =
      playerId === game.player2 ? "Du vant! 🎉" : `${p2Name} vant!`;
  } else {
    resultTitle.textContent = "Uavgjort!";
  }

  resultSub.textContent = `${p1Name} ${p1Score} – ${p2Score} ${p2Name}`;
  resultOverlay.classList.remove("hidden");
}

// ── Screen transitions ────────────────────────────────────────────────────────
function showGameScreen(game) {
  lobby.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  resultOverlay.classList.add("hidden");

  currentGameState = game;

  const cards = game.board?.cards ?? [];
  const flipped = game.flipped ?? [];
  boardWidth = game.board?.width ?? boardWidth;
  boardHeight = game.board?.height ?? boardHeight;

  renderBoard(cards, flipped, boardWidth, boardHeight);
  updateStatusBar(game);
  updateScoreboard(cards, game);
}

function showLobby() {
  clearLobbyTimer();
  if (pollIntervalId) {
    clearInterval(pollIntervalId);
    pollIntervalId = null;
  }
  gameScreen.classList.add("hidden");
  lobby.classList.remove("hidden");
  gameCodeDisplay.classList.add("hidden");
  clearLobbyError();

  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  gameCode = null;
  currentGameState = null;
}

// ── Event listeners ───────────────────────────────────────────────────────────
createBtn.addEventListener("click", async () => {
  clearLobbyError();
  const displayName = getDisplayName();
  boardWidth = parseInt(boardWidthSelect.value, 10);
  boardHeight = parseInt(boardHeightSelect.value, 10);

  if ((boardWidth * boardHeight) % 2 !== 0) {
    showLobbyError("Kolonner × Rader må være et partall.");
    return;
  }

  createBtn.disabled = true;
  createBtn.textContent = "Oppretter…";

  try {
    await signIn(displayName); // sets playerId (UUID) + playerName
    gameCode = await createGame(displayName, boardWidth, boardHeight);
    gameCodeSpan.textContent = gameCode;
    gameCodeDisplay.classList.remove("hidden");

    subscribeToGame(gameCode);

    // Client-side fallback: expire the lobby after 10 minutes if no one joins
    lobbyTimerId = setTimeout(
      async () => {
        await leaveGame();
        showLobby();
        showLobbyError("Lobbyen utløp — ingen ble med etter 10 minutter.");
      },
      10 * 60 * 1000,
    );
  } catch (err) {
    showLobbyError(err.message);
  } finally {
    createBtn.disabled = false;
    createBtn.textContent = "Opprett spill";
  }
});

joinBtn.addEventListener("click", async () => {
  clearLobbyError();
  const displayName = getDisplayName();
  const code = joinCodeInput.value.trim().toUpperCase();

  if (!code) {
    showLobbyError("Vennligst skriv inn en spillkode.");
    return;
  }

  joinBtn.disabled = true;
  joinBtn.textContent = "Kobler til…";

  try {
    await signIn(displayName); // sets playerId (UUID) + playerName

    // Prevent joining own game
    if (gameCode && code === gameCode) {
      throw new Error("Du kan ikke bli med i ditt eget spill.");
    }

    const game = await joinGame(code, displayName);
    gameCode = game.code;

    subscribeToGame(gameCode);
    showGameScreen(game);
  } catch (err) {
    showLobbyError(err.message);
  } finally {
    joinBtn.disabled = false;
    joinBtn.textContent = "Bli med";
  }
});

leaveBtn.addEventListener("click", async () => {
  leaveBtn.disabled = true;
  await leaveGame();
  showLobby();
  leaveBtn.disabled = false;
});

// Notify the server if the player closes the tab or navigates away mid-game
window.addEventListener("beforeunload", () => {
  if (!gameCode || !authToken) return;
  // fetch with keepalive runs even after the page starts unloading
  fetch(`${SUPABASE_URL}/functions/v1/leave-game`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: PUBLIC_ANON_KEY,
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ code: gameCode }),
    keepalive: true,
  });
});

playAgainBtn.addEventListener("click", () => {
  showLobby();
});
