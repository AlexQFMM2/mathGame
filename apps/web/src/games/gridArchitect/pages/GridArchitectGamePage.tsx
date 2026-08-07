import {evaluateGeometryPuzzle} from "@math-game/grid-architect-core";
import {useEffect, useReducer, useRef, useState} from "react";
import {AppIcon} from "../../../components/AppIcon";
import {formatElapsedTime} from "../../../components/formatElapsedTime";
import {GamePauseOverlay} from "../../../components/GamePauseOverlay";
import {GamePlayHeader} from "../../../components/GamePlayHeader";
import {browserClipboard} from "../../../platform/clipboard";
import {localSaveStore} from "../../../platform/saveStore";
import {GeometryConditionCards} from "../components/GeometryConditionCards";
import {GridArchitectBoard} from "../components/GridArchitectBoard";
import {GridArchitectHintDialog} from "../components/GridArchitectHintDialog";
import {GridArchitectToolbar} from "../components/GridArchitectToolbar";
import {
  GRID_ARCHITECT_SAVE_KEY,
  createSavedGridArchitectGame,
  gridArchitectSessionReducer,
  isGridArchitectSessionComplete,
  type GridArchitectSession,
} from "../state/session";
import type {GridArchitectGameResult} from "./GridArchitectResultPage";
import {GRID_ARCHITECT_DIFFICULTY_LABELS} from "./labels";
import "./GridArchitectGamePage.css";

export function GridArchitectGamePage({initialSession, onExit, onFinish}: {
  readonly initialSession: GridArchitectSession;
  readonly onExit: () => void;
  readonly onFinish: (result: GridArchitectGameResult) => void;
}) {
  const [session, dispatch] = useReducer(gridArchitectSessionReducer, initialSession);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const finishedRef = useRef(false);
  const complete = isGridArchitectSessionComplete(session);
  const metrics = evaluateGeometryPuzzle(session.puzzle, {selectedCellIds: session.selectedCellIds}).metrics;
  const puzzleId = session.puzzle.id.toUpperCase();
  useEffect(() => {
    const timer = window.setInterval(() => dispatch({type: "tick"}), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!complete) void localSaveStore.save(GRID_ARCHITECT_SAVE_KEY, createSavedGridArchitectGame(session));
  }, [complete, session]);
  useEffect(() => {
    if (!complete || finishedRef.current) return;
    finishedRef.current = true;
    void localSaveStore.remove(GRID_ARCHITECT_SAVE_KEY);
    window.setTimeout(() => onFinish({
      difficulty: session.puzzle.difficulty,
      elapsedSeconds: session.elapsedSeconds,
      errors: session.errors,
      hints: session.hints,
      puzzleId: session.puzzle.id,
      puzzle: session.puzzle,
      selectedCellIds: session.selectedCellIds,
    }), 420);
  }, [complete, onFinish, session]);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "p" || event.key === " ") { event.preventDefault(); dispatch({type: "toggle-pause"}); }
      else if (event.key.toLowerCase() === "z" && (event.ctrlKey || event.metaKey)) dispatch({type: "undo"});
      else if (event.key === "Escape") dispatch({type: "dismiss-hint"});
      else if (event.key === "Enter") dispatch({type: "check"});
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  const exit = () => void localSaveStore.save(GRID_ARCHITECT_SAVE_KEY, createSavedGridArchitectGame(session)).then(onExit);
  return (
    <section className={`grid-architect-game-page grid-architect-game-page--${session.puzzle.difficulty}`}>
      <div className="grid-architect-game-page__orb" aria-hidden="true" />
      <GamePlayHeader gameTitle="格点建筑师" difficultyLabel={GRID_ARCHITECT_DIFFICULTY_LABELS[session.puzzle.difficulty]} errors={session.errors} elapsedLabel={formatElapsedTime(session.elapsedSeconds)} onExit={exit} onPause={() => dispatch({type: "toggle-pause"})} />
      <div className="grid-architect-game-page__caption">
        <button className={`grid-architect-game-page__challenge grid-architect-game-page__challenge--${copyState}`} type="button" onClick={() => void browserClipboard.writeText(puzzleId).then((ok) => setCopyState(ok ? "copied" : "failed"))} aria-label={`复制题号 ${puzzleId}`}>
          <span>题号</span><code>{puzzleId}</code><AppIcon name={copyState === "copied" ? "check" : "copy"} size={10} /><i>{copyState === "copied" ? "已复制" : "复制"}</i>
        </button>
        <span>点击格子建造，再点一次拆除</span>
      </div>
      <GridArchitectBoard puzzle={session.puzzle} selectedCellIds={session.selectedCellIds} conditionResults={session.checked ? session.conditionResults : []} hintCellId={session.pendingHint?.cellId ?? null} onToggle={(cellId) => dispatch({type: "toggle-cell", cellId})} />
      <div className="grid-architect-game-page__metrics" aria-label={`当前面积 ${metrics.area}，周长 ${metrics.perimeter}`}>
        <span><small>当前面积</small><strong>{metrics.area}</strong></span><i /><span><small>当前周长</small><strong>{metrics.perimeter}</strong></span><b>{metrics.connected ? "已连通" : session.selectedCellIds.length === 0 ? "等待建造" : "有断开"}</b>
      </div>
      <GeometryConditionCards puzzle={session.puzzle} results={session.conditionResults} checked={session.checked} />
      <GridArchitectToolbar canUndo={session.history.length > 0} canReset={session.selectedCellIds.length > 0} onUndo={() => dispatch({type: "undo"})} onReset={() => dispatch({type: "reset"})} onHint={() => dispatch({type: "request-hint"})} onCheck={() => dispatch({type: "check"})} />
      {session.checked && !complete && <p className="grid-architect-game-page__error" role="status">还有条件没有满足，红色标记处可以继续调整。</p>}
      {session.paused && <GamePauseOverlay onResume={() => dispatch({type: "toggle-pause"})} />}
      {session.pendingHint !== null && <GridArchitectHintDialog hint={session.pendingHint} onApply={() => dispatch({type: "apply-hint"})} onClose={() => dispatch({type: "dismiss-hint"})} />}
      {complete && <div className="grid-architect-game-page__complete" aria-live="polite"><span><AppIcon name="check" size={30} /></span><strong>方案成立</strong></div>}
    </section>
  );
}
