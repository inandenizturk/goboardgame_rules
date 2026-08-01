import assert from "node:assert/strict";
import test from "node:test";

import { GoEngine } from "../js/go-engine.js";

test("captures a single stone", () => {
  const game = new GoEngine({ size: 3 });
  game.play(0, 1);
  game.play(0, 0);
  const result = game.play(1, 0);
  assert.equal(result.captured, 1);
  assert.equal(game.getBoard()[0][0], null);
  assert.equal(game.captures.black, 1);
});

test("captures a multi-stone group", () => {
  const game = new GoEngine({ size: 3 });
  game.play(1, 0);
  game.play(0, 0);
  game.play(0, 2);
  game.play(0, 1);
  const result = game.play(1, 1);
  assert.equal(result.captured, 2);
  assert.equal(game.getBoard()[0][0], null);
  assert.equal(game.getBoard()[0][1], null);
});

test("rejects suicide without mutating the board", () => {
  const game = new GoEngine({ size: 3 });
  game.play(0, 1);
  game.play(0, 0);
  game.play(1, 0);
  game.play(2, 0);
  game.play(2, 1);
  game.play(2, 2);
  game.play(1, 2);
  const before = game.getState();
  assert.deepEqual(game.getMoveLegality(1, 1), { legal: false, reason: "suicide" });
  assert.deepEqual(game.getState(), before);
});

function createClassicKo() {
  const game = new GoEngine({ size: 5 });
  for (const move of [
    [1, 2], [0, 0], [2, 1], [0, 1], [3, 2],
    [2, 2], [0, 4], [1, 3], [4, 4], [3, 3],
    [0, 3], [2, 4], [4, 0], [4, 1], [2, 3],
  ]) {
    game.play(...move);
  }
  return game;
}

test("rejects ko recapture until a threat changes the position", () => {
  const game = createClassicKo();
  assert.equal(game.getBoard()[2][2], null);
  assert.deepEqual(game.getMoveLegality(2, 2), { legal: false, reason: "ko" });
  game.play(1, 1);
  game.play(3, 1);
  assert.equal(game.play(2, 2).legal, true);
  assert.equal(game.getBoard()[2][3], null);
});

test("two consecutive passes end the game", () => {
  const game = new GoEngine({ size: 5 });
  assert.equal(game.pass().gameOver, false);
  const result = game.pass();
  assert.equal(result.gameOver, true);
  assert.equal(game.getState().result.method, "area");
});

test("area scoring applies komi on a small board", () => {
  const game = new GoEngine({ size: 5, komi: 6.5 });
  game.play(2, 2);
  game.play(0, 0);
  game.pass();
  game.pass();
  const result = game.getState().result;
  assert.equal(result.blackStones, 1);
  assert.equal(result.whiteStones, 1);
  assert.equal(result.black, 1);
  assert.equal(result.white, 7.5);
  assert.equal(result.winner, "white");
});
