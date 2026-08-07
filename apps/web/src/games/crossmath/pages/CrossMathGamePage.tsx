import {useEffect, useReducer, useRef, useState} from "react";
import {AppIcon} from "../../../components/AppIcon";
import {formatElapsedTime} from "../../../components/formatElapsedTime";
import {GamePauseOverlay} from "../../../components/GamePauseOverlay";
import {GamePlayHeader} from "../../../components/GamePlayHeader";
import {browserClipboard} from "../../../platform/clipboard";
import {localSaveStore} from "../../../platform/saveStore";
import {CrossMathBoard} from "../components/CrossMathBoard";
import {CrossMathHintDialog} from "../components/CrossMathHintDialog";
import {CrossMathTileBank} from "../components/CrossMathTileBank";
import {CrossMathToolbar} from "../components/CrossMathToolbar";
import {CrossMathVariablePanel} from "../components/CrossMathVariablePanel";
import {
  CROSSMATH_SAVE_KEY,
  createCrossMathValueState,
  createSavedCrossMathGame,
  crossMathSessionReducer,
  isCrossMathSessionComplete,
  type CrossMathSession,
} from "../state/session";
import {CROSSMATH_DIFFICULTY_LABELS} from "./labels";
import type {CrossMathGameResult} from "./CrossMathResultPage";
import "./CrossMathGamePage.css";

interface CrossMathGamePageProps {
  readonly initialSession: CrossMathSession;
  readonly onExit: () => void;
  readonly onFinish: (result: CrossMathGameResult) => void;
}

export function CrossMathGamePage({initialSession, onExit, onFinish}: CrossMathGamePageProps) {
  const [session, dispatch] = useReducer(crossMathSessionReducer, initialSession);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const finishedRef = useRef(false);
  const complete = isCrossMathSessionComplete(session);
  const values = createCrossMathValueState(session);
  const placedCount = Object.keys(session.placements).length;
  const puzzleId = session.puzzle.id.toUpperCase();

  const copyPuzzleId = async () => {
    setCopyState(await browserClipboard.writeText(puzzleId) ? "copied" : "failed");
  };

  useEffect(() => {
    const timer = window.setInterval(() => dispatch({type: "tick"}), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!complete) void localSaveStore.save(CROSSMATH_SAVE_KEY, createSavedCrossMathGame(session));
  }, [complete, session]);

  useEffect(() => {
    if (!complete || finishedRef.current) return;
    finishedRef.current = true;
    void localSaveStore.remove(CROSSMATH_SAVE_KEY);
    window.setTimeout(() => onFinish({
      difficulty: session.puzzle.difficulty,
      elapsedSeconds: session.elapsedSeconds,
      errors: session.errors,
      hints: session.hints,
      puzzleId: session.puzzle.id,
      puzzle: session.puzzle,
      values: createCrossMathValueState(session),
    }), 420);
  }, [complete, onFinish, session]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "p" || event.key === " ") {
        event.preventDefault();
        dispatch({type: "toggle-pause"});
      } else if (event.key.toLowerCase() === "z" && (event.ctrlKey || event.metaKey)) {
        dispatch({type: "undo"});
      } else if (event.key === "Escape") {
        dispatch({type: "dismiss-hint"});
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const exit = () => {
    void localSaveStore.save(CROSSMATH_SAVE_KEY, createSavedCrossMathGame(session)).then(onExit);
  };

  return (
    <section className={`crossmath-game-page crossmath-game-page--${session.puzzle.difficulty}`}>
      <div className="crossmath-game-page__orb" aria-hidden="true" />
      <GamePlayHeader
        gameTitle="算术填字"
        difficultyLabel={CROSSMATH_DIFFICULTY_LABELS[session.puzzle.difficulty]}
        errors={session.errors}
        elapsedLabel={formatElapsedTime(session.elapsedSeconds)}
        onExit={exit}
        onPause={() => dispatch({type: "toggle-pause"})}
      />
      <div className="crossmath-game-page__caption">
        <div>
          <button
            className={`crossmath-game-page__challenge crossmath-game-page__challenge--${copyState}`}
            type="button"
            onClick={() => void copyPuzzleId()}
            aria-label={`复制题号 ${puzzleId}`}
          >
            <span>题号</span>
            <code>{puzzleId}</code>
            <AppIcon name={copyState === "copied" ? "check" : "copy"} size={10} />
            <i>{copyState === "copied" ? "已复制" : copyState === "failed" ? "长按复制" : "复制"}</i>
          </button>
          <b>{placedCount}/{session.puzzle.tiles.length} 已放置</b>
        </div>
        <span>{session.selectedTileId === null ? "以关系符为中心 · 分别计算两侧" : "卡牌已选中，请选择空格"}</span>
      </div>
      <CrossMathBoard
        puzzle={session.puzzle}
        values={values}
        mistakeRelationIds={session.mistakeRelationIds}
        hintDestinationId={session.pendingHint?.destinationId ?? null}
        hintRelationId={session.pendingHint?.relationId ?? null}
        onPlace={(destinationId) => dispatch({type: "place", destinationId})}
      />
      <CrossMathVariablePanel
        variableNames={session.puzzle.variableNames}
        values={values}
        hintDestinationId={session.pendingHint?.destinationId ?? null}
        onPlace={(destinationId) => dispatch({type: "place", destinationId})}
      />
      <div className="crossmath-game-page__controls">
        <CrossMathTileBank
          tiles={session.puzzle.tiles}
          placements={session.placements}
          selectedTileId={session.selectedTileId}
          onSelect={(tileId) => dispatch({type: "select-tile", tileId})}
        />
        <CrossMathToolbar
          canUndo={session.history.length > 0}
          canReset={placedCount > 0}
          onUndo={() => dispatch({type: "undo"})}
          onReset={() => dispatch({type: "reset"})}
          onHint={() => dispatch({type: "request-hint"})}
        />
      </div>
      {session.mistakeRelationIds.length > 0 && <p className="crossmath-game-page__error" role="status">这些支流还不成立，冲突卡牌已退回牌池。</p>}
      {session.paused && <GamePauseOverlay onResume={() => dispatch({type: "toggle-pause"})} />}
      {session.pendingHint !== null && <CrossMathHintDialog hint={session.pendingHint} onApply={() => dispatch({type: "apply-hint"})} onClose={() => dispatch({type: "dismiss-hint"})} />}
      {complete && <div className="crossmath-game-page__complete" aria-live="polite"><span><AppIcon name="check" size={30} /></span><strong>全部成立</strong></div>}
    </section>
  );
}
