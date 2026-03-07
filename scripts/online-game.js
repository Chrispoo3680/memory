import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ── Supabase config ──────────────────────────────────────────────────────────
const SUPABASE_URL = "https://npkvjfgcsjcapgqwfgut.supabase.co";
const PUBLIC_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wa3ZqZmdjc2pjYXBncXdmZ3V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MjMxNDcsImV4cCI6MjA4ODE5OTE0N30.gzdKuLtNz0i-6fsbrxrZlbHwiBnkxiNqJ9pjv9QSkoo";

const supabase = createClient(SUPABASE_URL, PUBLIC_ANON_KEY);

// ── Game state ───────────────────────────────────────────────────────────────
let playerId = null; // this player's name / id
let gameCode = null; // current game code
let boardWidth = 4; // columns
let boardHeight = 4; // rows
let realtimeChannel = null;

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

function getPlayerName() {
  return playerNameInput.value.trim() || "Anonymous";
}

// ── Server calls ─────────────────────────────────────────────────────────────

/**
 * Calls the create-game Edge Function.
 * Returns the generated game code string.
 */
async function createGame(pId, width, height) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/create-game`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      playerId: pId,
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
async function joinGame(code, pId) {
  const { data, error } = await supabase
    .from("games")
    .update({ player2: pId, status: "playing" })
    .eq("code", code)
    .eq("status", "waiting") // only join games still waiting for a second player
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Game not found or already started.");
  }

  return data;
}

/**
 * Sends a flip-card move to the make-move Edge Function.
 * The server is authoritative; the client never modifies game state directly.
 */
async function flipCard(cardId) {
  await fetch(`${SUPABASE_URL}/functions/v1/make-move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: gameCode, playerId, cardId }),
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
}

// ── Game update handler ───────────────────────────────────────────────────────
function handleGameUpdate(game) {
  const cards = game.board?.cards ?? [];
  const flipped = game.flipped ?? [];
  const width = game.board?.width ?? boardWidth;
  const height = game.board?.height ?? boardHeight;

  boardWidth = width;
  boardHeight = height;

  // If the host is still on the lobby (waiting for player2), switch to game screen
  if (!gameScreen.classList.contains("hidden") === false) {
    showGameScreen(game);
    return;
  }

  renderBoard(cards, flipped, width, height);
  updateStatusBar(game);
  updateScoreboard(cards, game.player1, game.player2);

  if (game.status === "finished") {
    showResult(cards, game.player1, game.player2);
  }
}

// ── Render ────────────────────────────────────────────────────────────────────

/**
 * Renders the memory board grid.
 * - matched cards → show value (green)
 * - flipped cards → show value (purple)
 * - hidden cards  → show "?"
 */
function renderBoard(cards, flipped, width, height) {
  memoryContainer.style.gridTemplateColumns = `repeat(${width}, 1fr)`;
  memoryContainer.style.gridTemplateRows = `repeat(${height}, 1fr)`;
  memoryContainer.innerHTML = "";

  cards.forEach((card) => {
    const el = document.createElement("div");
    el.className = "memory-card";

    const isFlipped = flipped.includes(card.id);
    const isMatched = card.matched;

    if (isMatched) {
      el.textContent = card.value;
      el.classList.add("matched");
    } else if (isFlipped) {
      el.textContent = card.value;
      el.classList.add("flipped");
    } else {
      el.textContent = "?";
    }

    if (!isMatched) {
      el.addEventListener("click", () => flipCard(card.id));
    }

    memoryContainer.appendChild(el);
  });
}

function updateStatusBar(game) {
  const isMyTurn = game.current_turn === playerId;

  if (game.status === "waiting") {
    statusText.textContent = "Waiting for opponent…";
    statusText.className = "";
  } else if (game.status === "finished") {
    statusText.textContent = "Game over!";
    statusText.className = "";
  } else if (isMyTurn) {
    statusText.textContent = "Your turn!";
    statusText.className = "your-turn";
  } else {
    statusText.textContent = `${game.current_turn}'s turn…`;
    statusText.className = "their-turn";
  }
}

function updateScoreboard(cards, player1, player2) {
  const p1Score = cards.filter(
    (c) => c.matched && c.matchedBy === player1,
  ).length;
  const p2Score = cards.filter(
    (c) => c.matched && c.matchedBy === player2,
  ).length;

  scoreP1.textContent = `${player1 ?? "P1"}  ${p1Score}`;
  scoreP2.textContent = `${player2 ?? "P2"}  ${p2Score}`;
}

function showResult(cards, player1, player2) {
  const p1Score = cards.filter(
    (c) => c.matched && c.matchedBy === player1,
  ).length;
  const p2Score = cards.filter(
    (c) => c.matched && c.matchedBy === player2,
  ).length;

  if (p1Score > p2Score) {
    resultTitle.textContent =
      playerId === player1 ? "You win! 🎉" : `${player1} wins!`;
  } else if (p2Score > p1Score) {
    resultTitle.textContent =
      playerId === player2 ? "You win! 🎉" : `${player2} wins!`;
  } else {
    resultTitle.textContent = "It's a tie!";
  }

  resultSub.textContent = `${player1} ${p1Score} – ${p2Score} ${player2}`;
  resultOverlay.classList.remove("hidden");
}

// ── Screen transitions ────────────────────────────────────────────────────────
function showGameScreen(game) {
  lobby.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  resultOverlay.classList.add("hidden");

  const cards = game.board?.cards ?? [];
  const flipped = game.flipped ?? [];
  boardWidth = game.board?.width ?? boardWidth;
  boardHeight = game.board?.height ?? boardHeight;

  renderBoard(cards, flipped, boardWidth, boardHeight);
  updateStatusBar(game);
  updateScoreboard(cards, game.player1, game.player2);
}

function showLobby() {
  gameScreen.classList.add("hidden");
  lobby.classList.remove("hidden");
  gameCodeDisplay.classList.add("hidden");
  clearLobbyError();

  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  gameCode = null;
}

// ── Event listeners ───────────────────────────────────────────────────────────
createBtn.addEventListener("click", async () => {
  clearLobbyError();
  playerId = getPlayerName();
  boardWidth = parseInt(boardWidthSelect.value, 10);
  boardHeight = parseInt(boardHeightSelect.value, 10);

  if ((boardWidth * boardHeight) % 2 !== 0) {
    showLobbyError("Columns × Rows must be an even number.");
    return;
  }

  createBtn.disabled = true;
  createBtn.textContent = "Creating…";

  try {
    gameCode = await createGame(playerId, boardWidth, boardHeight);
    gameCodeSpan.textContent = gameCode;
    gameCodeDisplay.classList.remove("hidden");

    // Host subscribes now; when player2 joins the row updates to status="playing"
    // and handleGameUpdate will call showGameScreen automatically.
    subscribeToGame(gameCode);
  } catch (err) {
    showLobbyError(err.message);
  } finally {
    createBtn.disabled = false;
    createBtn.textContent = "Create Game";
  }
});

joinBtn.addEventListener("click", async () => {
  clearLobbyError();
  playerId = getPlayerName();
  const code = joinCodeInput.value.trim().toUpperCase();

  if (!code) {
    showLobbyError("Please enter a game code.");
    return;
  }

  joinBtn.disabled = true;
  joinBtn.textContent = "Joining…";

  try {
    const game = await joinGame(code, playerId);
    gameCode = game.code;

    subscribeToGame(gameCode);
    showGameScreen(game);
  } catch (err) {
    showLobbyError(err.message);
  } finally {
    joinBtn.disabled = false;
    joinBtn.textContent = "Join Game";
  }
});

leaveBtn.addEventListener("click", () => {
  showLobby();
});

playAgainBtn.addEventListener("click", () => {
  showLobby();
});
