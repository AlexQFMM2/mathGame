import type {SudokuDigit} from "@math-game/sudoku-core";
import {AppIcon} from "../../../components/AppIcon";
import {GamePlayHeader} from "../../../components/GamePlayHeader";
import {GamePauseOverlay} from "../../../components/GamePauseOverlay";
import {formatElapsedTime} from "../../../components/formatElapsedTime";
import {useEffect, useMemo, useReducer, useRef} from "react";
import {GameToolbar} from "../components/GameToolbar";
import {HintDialog} from "../components/HintDialog";
import {NumberPad} from "../components/NumberPad";
import {SudokuBoard} from "../components/SudokuBoard";
import {
  SUDOKU_SAVE_KEY,
  createSavedGame,
  isSessionComplete,
  sudokuSessionReducer,
  type SudokuSession,
} from "../state/session";
import {DIFFICULTY_LABELS} from "./labels";
import {localSaveStore} from "../../../platform/saveStore";
import type {GameResult} from "./ResultPage";
import "./SudokuGamePage.css";

interface SudokuGamePageProps {
  readonly initialSession: SudokuSession;
  readonly onExit: () => void;
  readonly onFinish: (result: GameResult) => void;
}

export function SudokuGamePage({initialSession, onExit, onFinish}: SudokuGamePageProps) {
  const [session, dispatch] = useReducer(sudokuSessionReducer, initialSession);
  const finishedRef = useRef(false);
  const complete = isSessionComplete(session);

  useEffect(() => {
    const timer = window.setInterval(() => dispatch({type: "tick"}), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!complete) {
      void localSaveStore.save(SUDOKU_SAVE_KEY, createSavedGame(session));
    }
  }, [complete, session]);

  useEffect(() => {
    if (!complete || finishedRef.current) {
      return;
    }
    finishedRef.current = true;
    void localSaveStore.remove(SUDOKU_SAVE_KEY);
    window.setTimeout(() => onFinish({
      difficulty: session.puzzle.difficulty,
      elapsedSeconds: session.elapsedSeconds,
      errors: session.errors,
      hints: session.hints,
      puzzleId: session.puzzle.id,
      puzzle: session.puzzle,
      values: session.values,
    }), 420);
  }, [complete, onFinish, session]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key >= "1" && event.key <= "9") {
        dispatch({type: "input", digit: Number(event.key) as SudokuDigit});
      } else if (event.key === "Backspace" || event.key === "Delete") {
        dispatch({type: "erase"});
      } else if (event.key.toLowerCase() === "n") {
        dispatch({type: "toggle-notes"});
      } else if (event.key.toLowerCase() === "p" || event.key === " ") {
        event.preventDefault();
        dispatch({type: "toggle-pause"});
      } else if (event.key === "Escape") {
        dispatch({type: "dismiss-hint"});
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const completedCounts = useMemo(() => {
    const counts = Array(10).fill(0) as number[];
    for (const value of session.values) {
      if (value !== 0) counts[value] = (counts[value] ?? 0) + 1;
    }
    return counts;
  }, [session.values]);

  const exit = () => {
    void localSaveStore.save(SUDOKU_SAVE_KEY, createSavedGame(session)).then(onExit);
  };

  return (
    <section className={`sudoku-game-page${session.mistakeIndex !== null ? " sudoku-game-page--mistake" : ""}`}>
      <div className="sudoku-game-page__bubble sudoku-game-page__bubble--one" aria-hidden="true" />
      <div className="sudoku-game-page__bubble sudoku-game-page__bubble--two" aria-hidden="true" />
      <GamePlayHeader
        gameTitle="数独"
        difficultyLabel={DIFFICULTY_LABELS[session.puzzle.difficulty]}
        errors={session.errors}
        elapsedLabel={formatElapsedTime(session.elapsedSeconds)}
        onExit={exit}
        onPause={() => dispatch({type: "toggle-pause"})}
      />

      <p className="sudoku-game-page__caption">
        <span>{session.inputMode === "notes" ? "笔记模式已开启" : "选择格子，再填写数字"}</span>
        <b>{session.puzzle.clueCount} 个提示数</b>
      </p>

      <SudokuBoard
        puzzle={session.puzzle}
        values={session.values}
        notes={session.notes}
        selectedIndex={session.selectedIndex}
        hintIndex={session.pendingHint?.index ?? null}
        mistakeIndex={session.mistakeIndex}
        onSelect={(index) => dispatch({type: "select", index})}
      />

      <div className="sudoku-game-page__controls">
        <GameToolbar
          canUndo={session.history.length > 0}
          notesActive={session.inputMode === "notes"}
          onUndo={() => dispatch({type: "undo"})}
          onErase={() => dispatch({type: "erase"})}
          onToggleNotes={() => dispatch({type: "toggle-notes"})}
          onHint={() => dispatch({type: "request-hint"})}
        />
        <NumberPad
          completedCounts={completedCounts}
          onInput={(digit) => dispatch({type: "input", digit})}
        />
      </div>

      {session.mistakeIndex !== null && <p className="sudoku-game-page__error" role="status">这个数字与答案不符，再看看同行、同列和同宫。</p>}
      {session.paused && <GamePauseOverlay onResume={() => dispatch({type: "toggle-pause"})} />}
      {session.pendingHint !== null && (
        <HintDialog
          hint={session.pendingHint}
          onApply={() => dispatch({type: "apply-hint"})}
          onClose={() => dispatch({type: "dismiss-hint"})}
        />
      )}
      {complete && <div className="sudoku-game-page__complete" aria-live="polite"><span><AppIcon name="check" size={30} /></span><strong>完成</strong></div>}
    </section>
  );
}
