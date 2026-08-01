export const WINNER_INVESTMENT_SHARE = 0.75;
export const OPPONENT_STONE_FEE_SHARE = 1 / 3;

export function calculateInvestment(moveCount, costPerMove) {
  return Math.max(0, moveCount) * costPerMove;
}

export function investmentByPlayer(moveHistory, costPerMove) {
  return moveHistory.reduce(
    (totals, move) => {
      if (move.type === "move") {
        totals[move.player] += costPerMove;
      }
      return totals;
    },
    { black: 0, white: 0 },
  );
}

export function calculatePayout({ winner, investments, costPerMove, moveHistory }) {
  if (winner !== "black" && winner !== "white") {
    return { winner, amount: 0 };
  }
  const opponent = winner === "black" ? "white" : "black";
  const opponentMoves = moveHistory.filter(
    (move) => move.type === "move" && move.player === opponent,
  ).length;
  const opponentPaid = opponentMoves * costPerMove;
  const amount = investments[winner] * WINNER_INVESTMENT_SHARE
    + opponentPaid * OPPONENT_STONE_FEE_SHARE;
  return {
    winner,
    amount,
    winnerInvestmentShare: investments[winner] * WINNER_INVESTMENT_SHARE,
    opponentFeeShare: opponentPaid * OPPONENT_STONE_FEE_SHARE,
  };
}
