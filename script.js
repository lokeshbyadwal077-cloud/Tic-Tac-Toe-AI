/* =========================================================
   Tic-Tac-Toe AI — Game Logic
   Human = "X"  |  AI = "O"
   The AI uses the Minimax Algorithm, which means it looks
   at every possible future of the game and always picks the
   move that leads to the best outcome for itself, assuming
   the human also plays perfectly. Result: the AI can never lose.
   ========================================================= */

// ---------- DOM references ----------
const boardEl        = document.getElementById("board");
const cells           = document.querySelectorAll(".cell");
const statusBar       = document.getElementById("statusBar");
const statusIcon      = document.getElementById("statusIcon");
const statusText      = document.getElementById("statusText");
const restartBtn      = document.getElementById("restartBtn");
const resultOverlay   = document.getElementById("resultOverlay");
const resultEmoji     = document.getElementById("resultEmoji");
const resultTitle     = document.getElementById("resultTitle");
const resultDesc      = document.getElementById("resultDesc");
const playAgainBtn    = document.getElementById("playAgainBtn");
const scoreXEl        = document.getElementById("scoreX");
const scoreOEl        = document.getElementById("scoreO");
const scoreDrawEl     = document.getElementById("scoreDraw");

// ---------- Game constants ----------
const HUMAN = "X";
const AI = "O";
const EMPTY = "";

// All 8 possible winning lines (rows, columns, diagonals)
const WINNING_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6],            // diagonals
];

// ---------- Game state ----------
let board = Array(9).fill(EMPTY);   // the 9 cells, flat array
let gameOver = false;               // stops input once someone wins/draws
let scores = { X: 0, O: 0, draw: 0 };

// =========================================================
// 1. BOARD SETUP & CLICK HANDLING
// =========================================================

// Attach a click listener to every cell
cells.forEach((cell) => {
  cell.addEventListener("click", () => handleCellClick(cell));
});

function handleCellClick(cell) {
  const index = Number(cell.dataset.index);

  // Ignore clicks on filled cells, or if the game has ended,
  // or if it's currently the AI's turn (board is "locked")
  if (board[index] !== EMPTY || gameOver || boardEl.classList.contains("ai-turn")) {
    return;
  }

  // Human places their mark
  placeMark(index, HUMAN);

  // Check if that move ended the game
  if (checkGameEnd(HUMAN)) return;

  // Otherwise, it's the AI's turn — give it a tiny "thinking" delay
  // so the move doesn't feel instant/robotic
  lockBoard(true);
  setStatus("AI is thinking...", "o");

  setTimeout(() => {
    const bestMove = getBestMove();
    placeMark(bestMove, AI);
    lockBoard(false);

    if (checkGameEnd(AI)) return;

    setStatus("Your turn", "x");
  }, 500); // half-second delay feels natural, not laggy
}

// Places a mark on the board (both in data + on screen)
function placeMark(index, player) {
  board[index] = player;

  const cell = cells[index];
  cell.classList.add("filled", player === HUMAN ? "x-mark" : "o-mark");

  // Wrap the symbol in a span so we can animate it popping in
  cell.innerHTML = `<span class="mark-inner">${player}</span>`;
}

// Temporarily disables clicking (used while AI is "thinking")
function lockBoard(shouldLock) {
  boardEl.classList.toggle("ai-turn", shouldLock);
  cells.forEach((cell) => {
    if (board[Number(cell.dataset.index)] === EMPTY) {
      cell.classList.toggle("locked", shouldLock);
    }
  });
}

// =========================================================
// 2. WIN / DRAW DETECTION
// =========================================================

// Returns the winning combination (array of 3 indices) if there is
// one for the given player, otherwise returns null
function getWinningCombo(currentBoard, player) {
  for (const combo of WINNING_COMBOS) {
    const [a, b, c] = combo;
    if (
      currentBoard[a] === player &&
      currentBoard[b] === player &&
      currentBoard[c] === player
    ) {
      return combo;
    }
  }
  return null;
}

function isBoardFull(currentBoard) {
  return currentBoard.every((cell) => cell !== EMPTY);
}

// Called after every move to check win/draw and update the UI accordingly.
// Returns true if the game has ended (so the caller can stop further logic).
function checkGameEnd(lastPlayer) {
  const winCombo = getWinningCombo(board, lastPlayer);

  if (winCombo) {
    gameOver = true;
    highlightWinningCells(winCombo);

    if (lastPlayer === HUMAN) {
      scores.X++;
      updateScoreboard();
      setStatus("You won!", "x", "win");
      showResult("🎉", "You Win!", "Nice one — you found a way past the AI.");
    } else {
      scores.O++;
      updateScoreboard();
      setStatus("AI wins", "o", "lose");
      showResult("🤖", "AI Wins!", "The AI played perfectly this round. Try again!");
    }
    return true;
  }

  if (isBoardFull(board)) {
    gameOver = true;
    scores.draw++;
    updateScoreboard();
    setStatus("It's a draw", "x", "draw");
    showResult("🤝", "It's a Draw!", "Well played — nobody gave the other an opening.");
    return true;
  }

  return false;
}

function highlightWinningCells(combo) {
  combo.forEach((index) => cells[index].classList.add("win-cell"));
}

// =========================================================
// 3. MINIMAX ALGORITHM — the AI's brain
// =========================================================
//
// How it works, in plain terms:
// The AI imagines every possible way the rest of the game could play out.
// For each imaginary game, it assumes:
//   - The AI (O) always tries to WIN (maximize its score)
//   - The human (X) always tries to make the AI LOSE (minimize its score)
// It scores finished games as:
//   +10  → AI wins   (better score if it wins sooner, hence the depth adjustment)
//   -10  → Human wins
//    0   → Draw
// Then it works backwards: at each step, the AI picks the move that leads
// to the best guaranteed outcome, assuming the human also plays their best.
// Because it explores literally every branch, it never misses a winning
// move or a necessary block — which is why it can never lose.
// =========================================================

function minimax(currentBoard, depth, isMaximizing) {
  // Base cases: someone already won, or the board is full (draw)
  const aiWinCombo = getWinningCombo(currentBoard, AI);
  if (aiWinCombo) return 10 - depth; // win faster = higher score

  const humanWinCombo = getWinningCombo(currentBoard, HUMAN);
  if (humanWinCombo) return depth - 10; // lose slower = less negative

  if (isBoardFull(currentBoard)) return 0; // draw

  if (isMaximizing) {
    // AI's turn — trying to get the HIGHEST possible score
    let bestScore = -Infinity;

    for (let i = 0; i < 9; i++) {
      if (currentBoard[i] === EMPTY) {
        currentBoard[i] = AI;                              // try the move
        const score = minimax(currentBoard, depth + 1, false); // see what happens next
        currentBoard[i] = EMPTY;                            // undo the move (backtrack)
        bestScore = Math.max(bestScore, score);
      }
    }
    return bestScore;
  } else {
    // Human's turn (simulated) — trying to get the LOWEST possible score
    let bestScore = Infinity;

    for (let i = 0; i < 9; i++) {
      if (currentBoard[i] === EMPTY) {
        currentBoard[i] = HUMAN;
        const score = minimax(currentBoard, depth + 1, true);
        currentBoard[i] = EMPTY;
        bestScore = Math.min(bestScore, score);
      }
    }
    return bestScore;
  }
}

// Loops through every empty cell, runs minimax on each possible move,
// and returns the index of the move with the best score for the AI.
function getBestMove() {
  // Small opening-move optimization: if the board is empty, taking the
  // center is a strong classic move and skips unnecessary computation.
  if (board.every((cell) => cell === EMPTY)) {
    return 4;
  }

  let bestScore = -Infinity;
  let bestMove = -1;

  for (let i = 0; i < 9; i++) {
    if (board[i] === EMPTY) {
      board[i] = AI;
      const score = minimax(board, 0, false);
      board[i] = EMPTY;

      if (score > bestScore) {
        bestScore = score;
        bestMove = i;
      }
    }
  }

  return bestMove;
}

// =========================================================
// 4. STATUS BAR / RESULT OVERLAY HELPERS
// =========================================================

function setStatus(text, turn, state) {
  statusText.textContent = text;
  statusIcon.textContent = turn === "x" ? "X" : "O";

  // Reset state classes, then apply the current one
  statusBar.classList.remove("turn-o", "win", "lose", "draw");

  if (turn === "o") statusBar.classList.add("turn-o");
  if (state) statusBar.classList.add(state);
}

function showResult(emoji, title, desc) {
  resultEmoji.textContent = emoji;
  resultTitle.textContent = title;
  resultDesc.textContent = desc;

  // Small delay so the winning-cell highlight animation is visible
  // for a moment before the overlay covers the board
  setTimeout(() => {
    resultOverlay.hidden = false;
  }, 600);
}

function updateScoreboard() {
  scoreXEl.textContent = scores.X;
  scoreOEl.textContent = scores.O;
  scoreDrawEl.textContent = scores.draw;
}

// =========================================================
// 5. RESTART / RESET LOGIC
// =========================================================

function resetBoard() {
  board = Array(9).fill(EMPTY);
  gameOver = false;

  cells.forEach((cell) => {
    cell.innerHTML = "";
    cell.classList.remove("filled", "x-mark", "o-mark", "win-cell", "locked");
  });

  lockBoard(false);
  resultOverlay.hidden = true;
  setStatus("Your turn", "x");
}

restartBtn.addEventListener("click", resetBoard);
playAgainBtn.addEventListener("click", resetBoard);

// =========================================================
// 6. INITIAL STATE
// =========================================================
setStatus("Your turn", "x");
updateScoreboard();s
