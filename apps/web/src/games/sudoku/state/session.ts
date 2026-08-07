import {
  findLogicalHint,
  getCandidates,
  getPeerIndices,
  indexToPosition,
  type SudokuDigit,
  type SudokuHint,
  type SudokuPuzzle,
  type SudokuValue,
} from "@math-game/sudoku-core";

export const SUDOKU_SAVE_KEY = "math-game:sudoku:active:v1";
export const SUDOKU_SAVE_SCHEMA_VERSION = 1 as const;

export type SudokuInputMode = "value" | "notes";

interface SessionSnapshot {
  readonly values: readonly SudokuValue[];
  readonly notes: readonly number[];
}

export interface SudokuSession {
  readonly puzzle: SudokuPuzzle;
  readonly values: readonly SudokuValue[];
  readonly notes: readonly number[];
  readonly selectedIndex: number | null;
  readonly inputMode: SudokuInputMode;
  readonly history: readonly SessionSnapshot[];
  readonly errors: number;
  readonly hints: number;
  readonly elapsedSeconds: number;
  readonly paused: boolean;
  readonly pendingHint: SudokuHint | null;
  readonly mistakeIndex: number | null;
}

export interface SavedSudokuGame {
  readonly schemaVersion: typeof SUDOKU_SAVE_SCHEMA_VERSION;
  readonly savedAt: string;
  readonly session: SudokuSession;
}

export type SudokuSessionAction =
  | {readonly type: "select"; readonly index: number}
  | {readonly type: "input"; readonly digit: SudokuDigit}
  | {readonly type: "erase"}
  | {readonly type: "undo"}
  | {readonly type: "toggle-notes"}
  | {readonly type: "toggle-pause"}
  | {readonly type: "tick"}
  | {readonly type: "request-hint"}
  | {readonly type: "apply-hint"}
  | {readonly type: "dismiss-hint"};

function digitMask(digit: SudokuDigit): number {
  return 1 << digit;
}

function snapshot(session: SudokuSession): SessionSnapshot {
  return {values: session.values, notes: session.notes};
}

function withHistory(
  session: SudokuSession,
  values: readonly SudokuValue[],
  notes: readonly number[],
): SudokuSession {
  return {
    ...session,
    values,
    notes,
    history: [...session.history, snapshot(session)].slice(-100),
    mistakeIndex: null,
  };
}

function fillCell(
  session: SudokuSession,
  index: number,
  digit: SudokuDigit,
): SudokuSession {
  const values = [...session.values];
  const notes = [...session.notes];
  values[index] = digit;
  notes[index] = 0;
  for (const peer of getPeerIndices(index)) {
    notes[peer] = (notes[peer] ?? 0) & ~digitMask(digit);
  }
  return withHistory(session, values, notes);
}

export function createSudokuSession(puzzle: SudokuPuzzle): SudokuSession {
  return {
    puzzle,
    values: [...puzzle.puzzle],
    notes: Array(81).fill(0) as number[],
    selectedIndex: puzzle.puzzle.findIndex((value) => value === 0),
    inputMode: "value",
    history: [],
    errors: 0,
    hints: 0,
    elapsedSeconds: 0,
    paused: false,
    pendingHint: null,
    mistakeIndex: null,
  };
}

export function sudokuSessionReducer(
  session: SudokuSession,
  action: SudokuSessionAction,
): SudokuSession {
  switch (action.type) {
    case "select":
      if (action.index < 0 || action.index >= 81) {
        return session;
      }
      return {...session, selectedIndex: action.index, mistakeIndex: null};

    case "input": {
      const index = session.selectedIndex;
      if (
        index === null
        || session.puzzle.puzzle[index] !== 0
        || session.paused
        || session.pendingHint !== null
      ) {
        return session;
      }
      if (session.inputMode === "notes") {
        if (session.values[index] !== 0 || !getCandidates(session.values, index).includes(action.digit)) {
          return {...session, mistakeIndex: index};
        }
        const notes = [...session.notes];
        notes[index] = (notes[index] ?? 0) ^ digitMask(action.digit);
        return withHistory(session, session.values, notes);
      }
      if (session.puzzle.solution[index] !== action.digit) {
        return {...session, errors: session.errors + 1, mistakeIndex: index};
      }
      return fillCell(session, index, action.digit);
    }

    case "erase": {
      const index = session.selectedIndex;
      if (
        index === null
        || session.puzzle.puzzle[index] !== 0
        || session.paused
        || session.pendingHint !== null
      ) {
        return session;
      }
      if (session.values[index] === 0 && session.notes[index] === 0) {
        return session;
      }
      const values = [...session.values];
      const notes = [...session.notes];
      values[index] = 0;
      notes[index] = 0;
      return withHistory(session, values, notes);
    }

    case "undo": {
      const previous = session.history.at(-1);
      if (previous === undefined || session.paused || session.pendingHint !== null) {
        return session;
      }
      return {
        ...session,
        values: previous.values,
        notes: previous.notes,
        history: session.history.slice(0, -1),
        pendingHint: null,
        mistakeIndex: null,
      };
    }

    case "toggle-notes":
      return session.paused || session.pendingHint !== null
        ? session
        : {...session, inputMode: session.inputMode === "value" ? "notes" : "value"};

    case "toggle-pause":
      return {...session, paused: !session.paused, pendingHint: null, mistakeIndex: null};

    case "tick":
      return session.paused ? session : {...session, elapsedSeconds: session.elapsedSeconds + 1};

    case "request-hint": {
      if (session.paused || session.pendingHint !== null) {
        return session;
      }
      const logicalHint = findLogicalHint(session.values);
      const revealIndex = session.values.findIndex((value) => value === 0);
      const hint = logicalHint ?? (revealIndex >= 0 ? {
        technique: "reveal" as const,
        target: indexToPosition(revealIndex),
        index: revealIndex,
        digit: session.puzzle.solution[revealIndex] as SudokuDigit,
        candidates: getCandidates(session.values, revealIndex),
      } : null);
      return hint === null
        ? session
        : {...session, pendingHint: hint, selectedIndex: hint.index, mistakeIndex: null};
    }

    case "apply-hint": {
      if (session.pendingHint === null) {
        return session;
      }
      const next = fillCell(
        session,
        session.pendingHint.index,
        session.pendingHint.digit,
      );
      return {...next, hints: session.hints + 1, pendingHint: null};
    }

    case "dismiss-hint":
      return {...session, pendingHint: null};
  }
}

export function isSessionComplete(session: SudokuSession): boolean {
  return session.values.every((value, index) => value === session.puzzle.solution[index]);
}

export function noteDigits(mask: number): readonly SudokuDigit[] {
  return ([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).filter(
    (digit) => (mask & digitMask(digit)) !== 0,
  );
}

export function createSavedGame(session: SudokuSession): SavedSudokuGame {
  return {
    schemaVersion: SUDOKU_SAVE_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    session: {...session, paused: false, pendingHint: null, mistakeIndex: null},
  };
}

export function restoreSavedGame(value: unknown): SavedSudokuGame | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const candidate = value as Partial<SavedSudokuGame>;
  const session = candidate.session;
  const isIntegerInRange = (entry: unknown, minimum: number, maximum: number) => (
    Number.isInteger(entry) && Number(entry) >= minimum && Number(entry) <= maximum
  );
  const isGrid = (entry: unknown, allowEmpty: boolean) => (
    Array.isArray(entry)
    && entry.length === 81
    && entry.every((cell) => isIntegerInRange(cell, allowEmpty ? 0 : 1, 9))
  );
  const isNoteList = (entry: unknown) => (
    Array.isArray(entry)
    && entry.length === 81
    && entry.every((mask) => isIntegerInRange(mask, 0, 0b11_1111_1110))
  );
  if (
    candidate.schemaVersion !== SUDOKU_SAVE_SCHEMA_VERSION
    || typeof candidate.savedAt !== "string"
    || typeof session !== "object"
    || session === null
    || !isGrid(session.values, true)
    || !isNoteList(session.notes)
    || !Array.isArray(session.history)
    || !session.history.every((entry) => (
      typeof entry === "object"
      && entry !== null
      && isGrid((entry as Partial<SessionSnapshot>).values, true)
      && isNoteList((entry as Partial<SessionSnapshot>).notes)
    ))
    || !isGrid(session.puzzle?.puzzle, true)
    || !isGrid(session.puzzle?.solution, false)
    || !["easy", "medium", "hard"].includes(session.puzzle.difficulty)
    || typeof session.puzzle.id !== "string"
    || !isIntegerInRange(session.selectedIndex, 0, 80) && session.selectedIndex !== null
    || !["value", "notes"].includes(session.inputMode)
    || !isIntegerInRange(session.errors, 0, Number.MAX_SAFE_INTEGER)
    || !isIntegerInRange(session.hints, 0, Number.MAX_SAFE_INTEGER)
    || !isIntegerInRange(session.elapsedSeconds, 0, Number.MAX_SAFE_INTEGER)
  ) {
    return null;
  }
  return value as SavedSudokuGame;
}

export function formatElapsedTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remaining = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remaining}`;
}
