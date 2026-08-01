import { GoEngine } from "./go-engine.js";
import { calculatePayout, investmentByPlayer } from "./betting.js";
import { WalletSession } from "./wallet.js";

const BOARD_SIZE = 19;
const canvas = document.querySelector("#goBoard");
const context = canvas.getContext("2d");
const engine = new GoEngine({ size: BOARD_SIZE, komi: 6.5 });
const wallet = new WalletSession();
let selectedPosition = null;
let walletConnected = false;

const elements = {
  connectWallet: document.querySelector("#connectWallet"),
  walletMode: document.querySelector("#walletMode"),
  walletBalance: document.querySelector("#walletBalance"),
  walletAddress: document.querySelector("#walletAddress"),
  stake: document.querySelector("#stake"),
  playerTurn: document.querySelector("#playerTurn"),
  passCount: document.querySelector("#passCount"),
  blackInvested: document.querySelector("#blackInvested"),
  whiteInvested: document.querySelector("#whiteInvested"),
  capturedWhite: document.querySelector("#capturedWhite"),
  capturedBlack: document.querySelector("#capturedBlack"),
  message: document.querySelector("#message"),
  playMove: document.querySelector("#playMove"),
  pass: document.querySelector("#pass"),
  resign: document.querySelector("#resign"),
  result: document.querySelector("#result"),
};

function stake() {
  return Number(elements.stake.value);
}

function setMessage(text, error = false) {
  elements.message.textContent = text;
  elements.message.classList.toggle("error", error);
}

function playerName(player) {
  return player === "black" ? "Black" : "White";
}

function formatSol(amount) {
  return Number(amount).toFixed(5);
}

function updateWallet() {
  const state = wallet.getState();
  elements.walletBalance.textContent = state.balance.toFixed(3);
  elements.walletMode.textContent = state.mode === "extension"
    ? `${state.providerName.toUpperCase()} EXTENSION`
    : "SIMULATED MODE";
  elements.walletMode.className = `mode ${state.mode}`;
  elements.walletAddress.textContent = state.publicKey
    ? `${state.mode === "extension" ? "Connected" : "Using"}: ${state.publicKey}`
    : "No wallet connected. Connect to start.";
  elements.connectWallet.textContent = state.mode === "extension"
    ? `${state.providerName} Connected`
    : walletConnected ? "Simulated Wallet Ready" : "Connect Wallet";
}

function updateView() {
  const state = engine.getState();
  const investments = investmentByPlayer(state.moveHistory, stake());
  elements.playerTurn.textContent = state.gameOver ? "Game over" : playerName(state.currentPlayer);
  elements.passCount.textContent = state.passCount;
  elements.blackInvested.textContent = formatSol(investments.black);
  elements.whiteInvested.textContent = formatSol(investments.white);
  elements.capturedWhite.textContent = state.captures.black;
  elements.capturedBlack.textContent = state.captures.white;
  elements.playMove.disabled = state.gameOver;
  elements.pass.disabled = state.gameOver;
  elements.resign.disabled = state.gameOver;
  elements.stake.disabled = state.moveHistory.some((move) => move.type === "move");
  drawBoard();
  if (state.gameOver && state.result) {
    showResult(state.result, investments, state.moveHistory);
  }
}

function showResult(result, investments, moveHistory) {
  if (result.method === "resignation") {
    elements.result.innerHTML = `<strong>${playerName(result.winner)} wins by resignation.</strong>`;
  } else {
    const payout = calculatePayout({
      winner: result.winner,
      investments,
      costPerMove: stake(),
      moveHistory,
    });
    elements.result.innerHTML = `
      <strong>${result.winner === "draw" ? "Draw" : `${playerName(result.winner)} wins`}</strong>
      <br>Area score: Black ${result.black.toFixed(1)}, White ${result.white.toFixed(1)}
      (including ${result.komi.toFixed(1)} komi).
      ${result.winner === "draw" ? "" : `<br>Estimated payout: ${payout.amount.toFixed(5)} SOL`}
    `;
  }
  elements.result.hidden = false;
}

function drawBoard() {
  const board = engine.getBoard();
  const cellSize = canvas.width / (BOARD_SIZE + 1);
  context.fillStyle = "#deb887";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#000";
  context.lineWidth = 1;
  for (let index = 0; index < BOARD_SIZE; index += 1) {
    const position = (index + 1) * cellSize;
    context.beginPath();
    context.moveTo(cellSize, position);
    context.lineTo(cellSize * BOARD_SIZE, position);
    context.stroke();
    context.beginPath();
    context.moveTo(position, cellSize);
    context.lineTo(position, cellSize * BOARD_SIZE);
    context.stroke();
  }
  context.fillStyle = "#000";
  for (const index of [3, 9, 15]) {
    for (const other of [3, 9, 15]) {
      context.beginPath();
      context.arc((index + 1) * cellSize, (other + 1) * cellSize, 3, 0, Math.PI * 2);
      context.fill();
    }
  }
  board.forEach((row, rowIndex) => row.forEach((color, colIndex) => {
    if (!color) return;
    const x = (colIndex + 1) * cellSize;
    const y = (rowIndex + 1) * cellSize;
    context.fillStyle = "rgb(0 0 0 / 30%)";
    context.beginPath();
    context.arc(x + 2, y + 2, cellSize * 0.4, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = color;
    context.strokeStyle = "#000";
    context.beginPath();
    context.arc(x, y, cellSize * 0.4, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    if (color === "white") {
      context.fillStyle = "rgb(255 255 255 / 20%)";
      context.beginPath();
      context.arc(x - cellSize * 0.15, y - cellSize * 0.15, cellSize * 0.2, 0, Math.PI * 2);
      context.fill();
    }
  }));
  if (selectedPosition) {
    context.strokeStyle = "#ff0000";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(
      (selectedPosition.col + 1) * cellSize,
      (selectedPosition.row + 1) * cellSize,
      cellSize * 0.45,
      0,
      Math.PI * 2,
    );
    context.stroke();
  }
}

function requireWallet() {
  if (!walletConnected) {
    setMessage("Connect the wallet button first (extension or simulated mode).", true);
    return false;
  }
  return true;
}

elements.connectWallet.addEventListener("click", async () => {
  try {
    const preferred = wallet.availableWallets()[0] ?? "Phantom";
    await wallet.connect(preferred);
    walletConnected = true;
    updateWallet();
    setMessage(wallet.getState().mode === "extension"
      ? `Connected to ${wallet.getState().providerName}. Transactions are not sent by this demo.`
      : "No wallet extension detected. Using simulated mode.");
  } catch (error) {
    setMessage(`Wallet connection failed: ${error.message}`, true);
  }
});

canvas.addEventListener("click", (event) => {
  if (engine.gameOver) return;
  const rect = canvas.getBoundingClientRect();
  const cellSize = canvas.width / (BOARD_SIZE + 1);
  const col = Math.round((event.clientX - rect.left) / rect.width * canvas.width / cellSize - 1);
  const row = Math.round((event.clientY - rect.top) / rect.height * canvas.height / cellSize - 1);
  const legality = engine.getMoveLegality(row, col);
  if (!legality.legal) {
    setMessage(`Illegal move: ${legality.reason}.`, true);
    return;
  }
  selectedPosition = { row, col };
  setMessage(`${playerName(engine.currentPlayer)} selected ${row + 1},${col + 1}. Press Play Move.`);
  drawBoard();
});

elements.playMove.addEventListener("click", () => {
  if (!requireWallet()) return;
  if (!selectedPosition) {
    setMessage("Select an empty legal point on the board first.", true);
    return;
  }
  if (!wallet.spend(stake())) {
    setMessage("Insufficient simulated wallet balance.", true);
    return;
  }
  const result = engine.play(selectedPosition.row, selectedPosition.col);
  if (!result.legal) {
    wallet.balance += stake();
    setMessage(`Illegal move: ${result.reason}.`, true);
    return;
  }
  selectedPosition = null;
  updateWallet();
  updateView();
  setMessage(`${playerName(result.player)} played. ${result.captured} stone(s) captured.`);
});

elements.pass.addEventListener("click", () => {
  if (!requireWallet()) return;
  const result = engine.pass();
  updateView();
  setMessage(result.gameOver ? "Two consecutive passes ended the game." : `${playerName(result.player)} passed.`);
});

elements.resign.addEventListener("click", () => {
  if (!requireWallet()) return;
  const result = engine.resign();
  updateView();
  setMessage(`${playerName(result.winner)} wins by resignation.`);
});

elements.stake.addEventListener("change", updateView);
updateWallet();
updateView();
