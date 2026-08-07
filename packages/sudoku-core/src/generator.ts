import {findLogicalHint} from "./hints.ts";
import {countSearchNodes, countSolutions} from "./solver.ts";
import {
  SUDOKU_CELL_COUNT,
  SUDOKU_SIZE,
  type SudokuAnalysis,
  type SudokuDifficulty,
  type SudokuDigit,
  type SudokuGrid,
  type SudokuPuzzle,
  type SudokuValue,
} from "./types.ts";

const TARGET_CLUES: Readonly<Record<SudokuDifficulty, number>> = {
  easy: 42,
  medium: 34,
  hard: 28,
};

const MAX_SEED = 0xffff_ffff;

export interface SudokuChallengeReference {
  readonly id: string;
  readonly difficulty: SudokuDifficulty;
  readonly seed: number;
}

export function parseSudokuChallengeId(value: string): SudokuChallengeReference | null {
  const normalized = value.trim().toLowerCase();
  const match = /^(easy|medium|hard)-([0-9a-z]+)$/.exec(normalized);
  if (match === null) {
    return null;
  }
  const difficulty = match[1] as SudokuDifficulty;
  const seedText = match[2] ?? "";
  const seed = Number.parseInt(seedText, 36);
  if (
    !Number.isSafeInteger(seed)
    || seed <= 0
    || seed > MAX_SEED
    || seed.toString(36) !== seedText
  ) {
    return null;
  }
  return {
    id: `${difficulty}-${seed.toString(36)}`,
    difficulty,
    seed,
  };
}

function normalizeSeed(seed: number): number {
  const normalized = Number.isFinite(seed) ? Math.trunc(seed) >>> 0 : 1;
  return normalized === 0 ? 0x6d2b79f5 : normalized;
}

export function createSeededRandom(seed: number): () => number {
  let state = normalizeSeed(seed);
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function shuffled<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    const currentValue = result[index];
    const targetValue = result[target];
    if (currentValue !== undefined && targetValue !== undefined) {
      result[index] = targetValue;
      result[target] = currentValue;
    }
  }
  return result;
}

function groupedOrder(random: () => number): number[] {
  const groups = shuffled([0, 1, 2], random);
  return groups.flatMap((group) => (
    shuffled([0, 1, 2], random).map((withinGroup) => group * 3 + withinGroup)
  ));
}

function generateSolvedGrid(random: () => number): SudokuGrid {
  const digits = shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9] as const, random);
  const rows = groupedOrder(random);
  const columns = groupedOrder(random);
  return rows.flatMap((row) => columns.map((column) => {
    const patternIndex = (row * 3 + Math.floor(row / 3) + column) % SUDOKU_SIZE;
    return digits[patternIndex] as SudokuDigit;
  }));
}

function carvePuzzle(solution: SudokuGrid, targetClues: number, random: () => number): SudokuGrid {
  const puzzle: SudokuValue[] = [...solution];
  const visited = new Set<number>();
  const order = shuffled(Array.from({length: SUDOKU_CELL_COUNT}, (_, index) => index), random);
  let clueCount = SUDOKU_CELL_COUNT;

  for (const index of order) {
    if (clueCount <= targetClues || visited.has(index)) {
      continue;
    }
    const mirror = SUDOKU_CELL_COUNT - 1 - index;
    const pair = index === mirror ? [index] : [index, mirror];
    if (clueCount - pair.length < targetClues || pair.some((cell) => visited.has(cell))) {
      continue;
    }

    const previous = pair.map((cell) => puzzle[cell] ?? 0);
    pair.forEach((cell) => {
      visited.add(cell);
      puzzle[cell] = 0;
    });

    if (countSolutions(puzzle, 2) === 1) {
      clueCount -= pair.length;
    } else {
      pair.forEach((cell, pairIndex) => {
        puzzle[cell] = previous[pairIndex] ?? 0;
      });
    }
  }

  if (clueCount > targetClues) {
    for (const index of order) {
      if (clueCount <= targetClues || puzzle[index] === 0) {
        continue;
      }
      const previous = puzzle[index] ?? 0;
      puzzle[index] = 0;
      if (countSolutions(puzzle, 2) === 1) {
        clueCount -= 1;
      } else {
        puzzle[index] = previous;
      }
    }
  }

  return puzzle;
}

export function analyzeSudoku(grid: SudokuGrid): SudokuAnalysis {
  const working: SudokuValue[] = [...grid];
  let logicalSteps = 0;

  while (true) {
    const hint = findLogicalHint(working);
    if (hint === null) {
      break;
    }
    working[hint.index] = hint.digit;
    logicalSteps += 1;
  }

  return {
    clueCount: grid.filter((value) => value !== 0).length,
    logicalSteps,
    unresolvedAfterSingles: working.filter((value) => value === 0).length,
    searchNodes: countSearchNodes(grid),
  };
}

export function generateSudoku(
  difficulty: SudokuDifficulty,
  seed = Date.now(),
): SudokuPuzzle {
  const normalizedSeed = normalizeSeed(seed);
  const random = createSeededRandom(normalizedSeed);
  const candidates: {readonly solution: SudokuGrid; readonly puzzle: SudokuGrid; readonly score: number}[] = [];
  const attemptCount = difficulty === "hard" ? 6 : difficulty === "medium" ? 4 : 3;

  for (let attempt = 0; attempt < attemptCount; attempt += 1) {
    const solution = generateSolvedGrid(random);
    const puzzle = carvePuzzle(solution, TARGET_CLUES[difficulty], random);
    const analysis = analyzeSudoku(puzzle);
    candidates.push({
      solution,
      puzzle,
      score: analysis.unresolvedAfterSingles * 1_000 + analysis.searchNodes,
    });
  }

  candidates.sort((left, right) => left.score - right.score);
  const selectedIndex = difficulty === "easy"
    ? 0
    : difficulty === "hard"
      ? candidates.length - 1
      : Math.floor(candidates.length / 2);
  const selected = candidates[selectedIndex];
  if (selected === undefined) {
    throw new Error("Sudoku generation did not produce a candidate.");
  }

  const clueCount = selected.puzzle.filter((value) => value !== 0).length;
  return {
    id: `${difficulty}-${normalizedSeed.toString(36)}`,
    difficulty,
    seed: normalizedSeed,
    puzzle: selected.puzzle,
    solution: selected.solution,
    clueCount,
  };
}
