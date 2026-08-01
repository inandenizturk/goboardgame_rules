const COLORS = Object.freeze({
  BLACK: "black",
  WHITE: "white",
});

const OPPONENT = Object.freeze({
  black: "white",
  white: "black",
});

export class GoEngine {
  constructor({ size = 19, komi = 6.5 } = {}) {
    if (!Number.isInteger(size) || size < 1) {
      throw new RangeError("board size must be a positive integer");
    }
    this.size = size;
    this.komi = komi;
    this.board = Array(size * size).fill(null);
    this.currentPlayer = COLORS.BLACK;
    this.captures = { black: 0, white: 0 };
    this.moveHistory = [];
    this.passCount = 0;
    this.gameOver = false;
    this.result = null;
    this._seenPositions = new Set([this._positionKey(this.board, this.currentPlayer)]);
  }

  getState() {
    return {
      board: this.getBoard(),
      currentPlayer: this.currentPlayer,
      captures: { ...this.captures },
      moveHistory: [...this.moveHistory],
      passCount: this.passCount,
      gameOver: this.gameOver,
      result: this.result ? { ...this.result } : null,
      komi: this.komi,
    };
  }

  getBoard() {
    return Array.from({ length: this.size }, (_, row) =>
      this.board.slice(row * this.size, (row + 1) * this.size),
    );
  }

  isValidMove(row, col) {
    return this.getMoveLegality(row, col).legal;
  }

  getMoveLegality(row, col) {
    if (this.gameOver) {
      return { legal: false, reason: "game-over" };
    }
    if (!this._inBounds(row, col)) {
      return { legal: false, reason: "out-of-bounds" };
    }
    const index = this._index(row, col);
    if (this.board[index] !== null) {
      return { legal: false, reason: "occupied" };
    }
    const simulation = this._simulateMove(this.board, this.currentPlayer, row, col);
    if (!simulation.legal) {
      return { legal: false, reason: simulation.reason };
    }
    const positionKey = this._positionKey(simulation.board, OPPONENT[this.currentPlayer]);
    if (this._seenPositions.has(positionKey)) {
      return { legal: false, reason: "ko" };
    }
    return {
      legal: true,
      captures: simulation.captured,
      positionKey,
    };
  }

  play(row, col) {
    const legality = this.getMoveLegality(row, col);
    if (!legality.legal) {
      return legality;
    }
    const simulation = this._simulateMove(this.board, this.currentPlayer, row, col);
    this.board = simulation.board;
    this.captures[this.currentPlayer] += simulation.captured;
    this.passCount = 0;
    this.moveHistory.push({
      type: "move",
      row,
      col,
      player: this.currentPlayer,
      captured: simulation.captured,
    });
    this.currentPlayer = OPPONENT[this.currentPlayer];
    this._seenPositions.add(legality.positionKey);
    return {
      legal: true,
      captured: simulation.captured,
      player: this.moveHistory.at(-1).player,
    };
  }

  pass() {
    if (this.gameOver) {
      return { legal: false, reason: "game-over" };
    }
    const player = this.currentPlayer;
    this.passCount += 1;
    this.moveHistory.push({ type: "pass", player });
    this.currentPlayer = OPPONENT[player];
    this._seenPositions.add(this._positionKey(this.board, this.currentPlayer));
    if (this.passCount >= 2) {
      this.gameOver = true;
      this.result = this.score();
    }
    return { legal: true, player, gameOver: this.gameOver, result: this.result };
  }

  resign() {
    if (this.gameOver) {
      return { legal: false, reason: "game-over" };
    }
    const player = this.currentPlayer;
    const winner = OPPONENT[player];
    this.gameOver = true;
    this.moveHistory.push({ type: "resign", player });
    this.result = {
      black: null,
      white: null,
      komi: this.komi,
      winner,
      method: "resignation",
    };
    return { legal: true, winner, result: this.result };
  }

  score() {
    const territory = this._territory();
    const black = territory.blackStones + territory.blackTerritory;
    const white = territory.whiteStones + territory.whiteTerritory + this.komi;
    return {
      black,
      white,
      komi: this.komi,
      blackTerritory: territory.blackTerritory,
      whiteTerritory: territory.whiteTerritory,
      blackStones: territory.blackStones,
      whiteStones: territory.whiteStones,
      winner: black === white ? "draw" : black > white ? "black" : "white",
      method: "area",
    };
  }

  _simulateMove(board, player, row, col) {
    const nextBoard = board.slice();
    const index = this._index(row, col);
    nextBoard[index] = player;
    let captured = 0;
    const opponent = OPPONENT[player];
    for (const neighbor of this._neighbors(row, col)) {
      if (nextBoard[this._index(...neighbor)] !== opponent) {
        continue;
      }
      const group = this._group(nextBoard, neighbor[0], neighbor[1]);
      if (group.liberties.size === 0) {
        captured += group.stones.size;
        for (const stone of group.stones) {
          nextBoard[stone] = null;
        }
      }
    }
    const ownGroup = this._group(nextBoard, row, col);
    if (ownGroup.liberties.size === 0) {
      return { legal: false, reason: "suicide" };
    }
    return { legal: true, board: nextBoard, captured };
  }

  _group(board, row, col) {
    const color = board[this._index(row, col)];
    const stones = new Set();
    const liberties = new Set();
    const stack = [[row, col]];
    while (stack.length > 0) {
      const [currentRow, currentCol] = stack.pop();
      const currentIndex = this._index(currentRow, currentCol);
      if (stones.has(currentIndex) || board[currentIndex] !== color) {
        continue;
      }
      stones.add(currentIndex);
      for (const [neighborRow, neighborCol] of this._neighbors(currentRow, currentCol)) {
        const neighborIndex = this._index(neighborRow, neighborCol);
        if (board[neighborIndex] === null) {
          liberties.add(neighborIndex);
        } else if (board[neighborIndex] === color && !stones.has(neighborIndex)) {
          stack.push([neighborRow, neighborCol]);
        }
      }
    }
    return { stones, liberties };
  }

  _territory() {
    let blackStones = 0;
    let whiteStones = 0;
    const visited = new Set();
    let blackTerritory = 0;
    let whiteTerritory = 0;
    for (let index = 0; index < this.board.length; index += 1) {
      if (this.board[index] === COLORS.BLACK) {
        blackStones += 1;
      } else if (this.board[index] === COLORS.WHITE) {
        whiteStones += 1;
      } else if (!visited.has(index)) {
        const region = new Set([index]);
        const borderingColors = new Set();
        const stack = [index];
        visited.add(index);
        while (stack.length > 0) {
          const current = stack.pop();
          const row = Math.floor(current / this.size);
          const col = current % this.size;
          for (const [neighborRow, neighborCol] of this._neighbors(row, col)) {
            const neighborIndex = this._index(neighborRow, neighborCol);
            const color = this.board[neighborIndex];
            if (color === null && !visited.has(neighborIndex)) {
              visited.add(neighborIndex);
              region.add(neighborIndex);
              stack.push(neighborIndex);
            } else if (color !== null) {
              borderingColors.add(color);
            }
          }
        }
        if (borderingColors.size === 1) {
          const owner = [...borderingColors][0];
          if (owner === COLORS.BLACK) {
            blackTerritory += region.size;
          } else {
            whiteTerritory += region.size;
          }
        }
      }
    }
    return { blackStones, whiteStones, blackTerritory, whiteTerritory };
  }

  _positionKey(board, player) {
    return `${player}:${board.map((cell) => cell?.[0] ?? ".").join("")}`;
  }

  _neighbors(row, col) {
    return [
      [row - 1, col],
      [row + 1, col],
      [row, col - 1],
      [row, col + 1],
    ].filter(([neighborRow, neighborCol]) => this._inBounds(neighborRow, neighborCol));
  }

  _inBounds(row, col) {
    return Number.isInteger(row) && Number.isInteger(col)
      && row >= 0 && row < this.size && col >= 0 && col < this.size;
  }

  _index(row, col) {
    return row * this.size + col;
  }
}

export { COLORS };
