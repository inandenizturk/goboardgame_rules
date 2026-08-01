# Go board game with staking rules

This repository contains a browser Go (baduk) board game. The unified game in
`index.html` keeps the original canvas board and information panel while moving
the rules into a reusable, UI-free engine. The older standalone HTML variants
and wallet previews remain in place for reference.

## Run the game

The project has no build step and no npm dependencies. Serve the directory
locally so the browser can load the ES modules:

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000/>. Select one of the available per-move stakes:
`0.00125`, `0.0025`, or `0.005` SOL.

The game uses a simulated one-SOL wallet when no browser wallet extension is
available. If Phantom or Solflare is installed, the page detects and connects
to it, but this project does not send on-chain transactions. The UI always
labels the active mode as either `SIMULATED MODE` or the connected extension.

## Rules engine

`js/go-engine.js` implements:

- group and liberty detection;
- captures, suicide prohibition, and positional superko;
- explicit pass and resignation actions;
- game end after two consecutive passes; and
- Tromp-Taylor area scoring with configurable 6.5 komi by default.

The engine is pure with respect to the UI: legality queries simulate on a
copied board and never mutate the live game state. It stores the board, player
to move, captures, move history, pass count, and position history explicitly.

## Staking and payout

`js/betting.js` contains the staking functions. A legal stone placement costs
the selected stake; passes do not cost a move fee. The payout rule described in
the original project is retained:

> The winner receives 75% of what they invested plus 33.33% of the total the
> opponent paid per stone.

The named constants are `WINNER_INVESTMENT_SHARE` (`0.75`) and
`OPPONENT_STONE_FEE_SHARE` (`1 / 3`). The payout is an estimate for the local
game UI; no SOL transfer is attempted.

## Tests

Run the built-in Node test suite without installing anything:

```bash
node --test tests/
```

The tests cover single- and multi-stone captures, suicide, positional ko,
ko threats, two-pass game end, komi scoring, and the payout calculation.

Original project link: https://x.com/inan_turk_deniz/status/1853314811217465661
