import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateInvestment,
  calculatePayout,
  investmentByPlayer,
  OPPONENT_STONE_FEE_SHARE,
  WINNER_INVESTMENT_SHARE,
} from "../js/betting.js";

test("calculates investments and the README payout formula", () => {
  const moves = [
    { type: "move", player: "black" },
    { type: "move", player: "white" },
    { type: "move", player: "black" },
  ];
  const investments = investmentByPlayer(moves, 0.00125);
  assert.equal(calculateInvestment(3, 0.00125), 0.00375);
  assert.deepEqual(investments, { black: 0.0025, white: 0.00125 });
  const payout = calculatePayout({
    winner: "black",
    investments,
    costPerMove: 0.00125,
    moveHistory: moves,
  });
  assert.equal(WINNER_INVESTMENT_SHARE, 0.75);
  assert.equal(OPPONENT_STONE_FEE_SHARE, 1 / 3);
  assert.ok(Math.abs(payout.amount - 0.002291666666666667) < Number.EPSILON);
});
