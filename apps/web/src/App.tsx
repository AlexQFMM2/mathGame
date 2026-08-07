import {
  generateCrossMath,
  type CrossMathChallengeReference,
  type CrossMathDifficulty,
} from "@math-game/crossmath-core";
import type {GameId} from "@math-game/game-core";
import {
  generateSudoku,
  type SudokuChallengeReference,
  type SudokuDifficulty,
} from "@math-game/sudoku-core";
import {lazy, Suspense, useEffect, useState} from "react";
import {BottomNavigation, type MainTab} from "./components/BottomNavigation";
import {GameViewport} from "./components/GameViewport";
import {GenerationErrorPage} from "./components/GenerationErrorPage";
import {CalendarPage} from "./features/activity/CalendarPage";
import {
  ACTIVITY_SAVE_KEY,
  ACTIVITY_V2_SAVE_KEY,
  ACTIVITY_V3_SAVE_KEY,
  ACTIVITY_V4_SAVE_KEY,
  EMPTY_ACTIVITY_RECORD,
  getDayProgress,
  LEGACY_ACTIVITY_SAVE_KEY,
  recordCheckInTaskCompletion,
  recordGameCompletion,
  restoreActivityRecord,
  type ActivityRecord,
} from "./features/activity/activity";
import {
  createPendingCheckInTask,
  PENDING_CHECK_IN_TASK_SAVE_KEY,
  restorePendingCheckInTask,
  type PendingCheckInTask,
} from "./features/activity/checkInTask";
import {ProfilePage} from "./features/profile/ProfilePage";
import {CrossMathDifficultyPage} from "./games/crossmath/pages/CrossMathDifficultyPage";
import {CrossMathGamePage} from "./games/crossmath/pages/CrossMathGamePage";
import {CrossMathGeneratingPage} from "./games/crossmath/pages/CrossMathGeneratingPage";
import {CrossMathResultPage, type CrossMathGameResult} from "./games/crossmath/pages/CrossMathResultPage";
import {
  CROSSMATH_SAVE_KEY,
  createCrossMathSession,
  restoreSavedCrossMathGame,
  type CrossMathSession,
  type SavedCrossMathGame,
} from "./games/crossmath/state/session";
import {DifficultyPage} from "./games/sudoku/pages/DifficultyPage";
import {GeneratingPage} from "./games/sudoku/pages/GeneratingPage";
import {HomePage} from "./games/sudoku/pages/HomePage";
import {ResultPage, type GameResult} from "./games/sudoku/pages/ResultPage";
import {SudokuGamePage} from "./games/sudoku/pages/SudokuGamePage";
import {
  SUDOKU_SAVE_KEY,
  createSudokuSession,
  restoreSavedGame,
  type SavedSudokuGame,
  type SudokuSession,
} from "./games/sudoku/state/session";
import {localSaveStore} from "./platform/saveStore";

const ComponentPreviewPage = import.meta.env.DEV
  ? lazy(async () => {
    const module = await import("./games/sudoku/preview/ComponentPreviewPage");
    return {default: module.ComponentPreviewPage};
  })
  : null;

type AppScreen =
  | {readonly name: "home"}
  | {readonly name: "calendar"}
  | {readonly name: "profile"}
  | {readonly name: "sudoku-difficulty"}
  | {readonly name: "sudoku-generating"; readonly difficulty: SudokuDifficulty; readonly seed: number}
  | {readonly name: "sudoku-game"; readonly initialSession: SudokuSession}
  | {readonly name: "sudoku-result"; readonly result: GameResult; readonly checkInStatus?: string}
  | {readonly name: "crossmath-difficulty"}
  | {readonly name: "crossmath-generating"; readonly difficulty: CrossMathDifficulty; readonly seed: number}
  | {readonly name: "crossmath-game"; readonly initialSession: CrossMathSession}
  | {readonly name: "crossmath-result"; readonly result: CrossMathGameResult; readonly checkInStatus?: string}
  | {readonly name: "generation-error"; readonly gameId: GameId; readonly message: string};

function createSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0xffff_ffff)) >>> 0;
}

export function App() {
  const [screen, setScreen] = useState<AppScreen>({name: "home"});
  const [savedSudokuGame, setSavedSudokuGame] = useState<SavedSudokuGame | null>(null);
  const [savedCrossMathGame, setSavedCrossMathGame] = useState<SavedCrossMathGame | null>(null);
  const [activity, setActivity] = useState<ActivityRecord>(EMPTY_ACTIVITY_RECORD);
  const [pendingCheckInTask, setPendingCheckInTask] = useState<PendingCheckInTask | null>(null);

  useEffect(() => {
    void Promise.all([
      localSaveStore.load(SUDOKU_SAVE_KEY),
      localSaveStore.load(CROSSMATH_SAVE_KEY),
      localSaveStore.load(PENDING_CHECK_IN_TASK_SAVE_KEY),
      localSaveStore.has(ACTIVITY_SAVE_KEY),
      localSaveStore.load(ACTIVITY_SAVE_KEY),
      localSaveStore.has(ACTIVITY_V4_SAVE_KEY),
      localSaveStore.load(ACTIVITY_V4_SAVE_KEY),
      localSaveStore.has(ACTIVITY_V3_SAVE_KEY),
      localSaveStore.load(ACTIVITY_V3_SAVE_KEY),
      localSaveStore.has(ACTIVITY_V2_SAVE_KEY),
      localSaveStore.load(ACTIVITY_V2_SAVE_KEY),
      localSaveStore.load(LEGACY_ACTIVITY_SAVE_KEY),
    ]).then(([
      sudokuSaveValue,
      crossMathSaveValue,
      pendingTaskValue,
      activityExists,
      activityValue,
      activityV4Exists,
      activityV4Value,
      activityV3Exists,
      activityV3Value,
      activityV2Exists,
      activityV2Value,
      legacyActivityValue,
    ]) => {
      const restoredSudoku = restoreSavedGame(sudokuSaveValue);
      const restoredCrossMath = restoreSavedCrossMathGame(crossMathSaveValue);
      const restoredPendingTask = restorePendingCheckInTask(pendingTaskValue);
      setSavedSudokuGame(restoredSudoku);
      setSavedCrossMathGame(restoredCrossMath);
      const pendingHasGame = restoredPendingTask?.gameId === "sudoku"
        ? restoredSudoku !== null
        : restoredPendingTask?.gameId === "crossmath"
          ? restoredCrossMath !== null
          : false;
      setPendingCheckInTask(pendingHasGame ? restoredPendingTask : null);
      if (!pendingHasGame && restoredPendingTask !== null) {
        void localSaveStore.remove(PENDING_CHECK_IN_TASK_SAVE_KEY).catch(() => undefined);
      }
      const restoredActivity = activityExists
        ? restoreActivityRecord(activityValue ?? {})
        : activityV4Exists
          ? restoreActivityRecord(null, activityV4Value ?? {})
          : activityV3Exists
            ? restoreActivityRecord(null, null, activityV3Value ?? {})
            : activityV2Exists
              ? restoreActivityRecord(null, null, null, activityV2Value ?? {})
              : restoreActivityRecord(null, null, null, null, legacyActivityValue);
      setActivity(restoredActivity);
      if (!activityExists) void localSaveStore.save(ACTIVITY_SAVE_KEY, restoredActivity).catch(() => undefined);
    });
  }, []);

  const savePendingTask = (task: PendingCheckInTask | null) => {
    setPendingCheckInTask(task);
    if (task === null) void localSaveStore.remove(PENDING_CHECK_IN_TASK_SAVE_KEY).catch(() => undefined);
    else void localSaveStore.save(PENDING_CHECK_IN_TASK_SAVE_KEY, task).catch(() => undefined);
  };

  const prepareSudoku = (
    difficulty: SudokuDifficulty,
    seed: number,
    checkInTask: PendingCheckInTask | null = null,
  ) => {
    savePendingTask(checkInTask);
    setScreen({name: "sudoku-generating", difficulty, seed});
    window.setTimeout(() => {
      try {
        setScreen({name: "sudoku-game", initialSession: createSudokuSession(generateSudoku(difficulty, seed))});
      } catch {
        savePendingTask(null);
        setScreen({name: "generation-error", gameId: "sudoku", message: "这次数独题面没有生成成功，请重新选择难度。"});
      }
    }, 80);
  };

  const prepareCrossMath = (
    difficulty: CrossMathDifficulty,
    seed: number,
    checkInTask: PendingCheckInTask | null = null,
  ) => {
    savePendingTask(checkInTask);
    setScreen({name: "crossmath-generating", difficulty, seed});
    window.setTimeout(() => {
      try {
        setScreen({name: "crossmath-game", initialSession: createCrossMathSession(generateCrossMath(difficulty, seed))});
      } catch {
        savePendingTask(null);
        setScreen({name: "generation-error", gameId: "crossmath", message: "这次关系网络没有生成成功，请重新选择难度。"});
      }
    }, 80);
  };

  const goHome = () => {
    void Promise.all([
      localSaveStore.load(SUDOKU_SAVE_KEY),
      localSaveStore.load(CROSSMATH_SAVE_KEY),
    ]).then(([sudokuValue, crossMathValue]) => {
      setSavedSudokuGame(restoreSavedGame(sudokuValue));
      setSavedCrossMathGame(restoreSavedCrossMathGame(crossMathValue));
      setScreen({name: "home"});
    });
  };

  const changeMainTab = (tab: MainTab) => {
    if (tab === "home") setScreen({name: "home"});
    else if (tab === "calendar") setScreen({name: "calendar"});
    else setScreen({name: "profile"});
  };

  const completeActivity = (gameId: GameId, elapsedSeconds: number): string | undefined => {
    const completedAt = new Date();
    const task = pendingCheckInTask?.gameId === gameId ? pendingCheckInTask : null;
    const nextActivity = task === null
      ? recordGameCompletion(activity, gameId, elapsedSeconds, completedAt)
      : recordCheckInTaskCompletion(
          activity,
          task.dateKey,
          task.mode,
          gameId,
          elapsedSeconds,
          completedAt,
        );
    setActivity(nextActivity);
    void localSaveStore.save(ACTIVITY_SAVE_KEY, nextActivity).catch(() => undefined);
    let checkInStatus: string | undefined;
    if (task !== null) {
      const progress = getDayProgress(nextActivity, task.dateKey);
      const [, month, day] = task.dateKey.split("-").map(Number);
      checkInStatus = progress.isComplete
        ? task.mode === "daily"
          ? "今日任务完成，打卡成功"
          : `${month} 月 ${day} 日任务完成，补签成功`
        : "任务已完成";
    }
    savePendingTask(null);
    return checkInStatus;
  };

  if (ComponentPreviewPage !== null && new URLSearchParams(window.location.search).has("preview")) {
    return <GameViewport><Suspense fallback={null}><ComponentPreviewPage /></Suspense></GameViewport>;
  }

  return (
    <GameViewport>
      {screen.name === "home" && (
        <HomePage
          savedSudokuGame={savedSudokuGame}
          savedCrossMathGame={savedCrossMathGame}
          onChooseSudoku={() => setScreen({name: "sudoku-difficulty"})}
          onChooseCrossMath={() => setScreen({name: "crossmath-difficulty"})}
          onResumeSudoku={() => {
            if (savedSudokuGame !== null) setScreen({name: "sudoku-game", initialSession: savedSudokuGame.session});
          }}
          onResumeCrossMath={() => {
            if (savedCrossMathGame !== null) setScreen({name: "crossmath-game", initialSession: savedCrossMathGame.session});
          }}
        />
      )}
      {screen.name === "calendar" && (
        <CalendarPage activity={activity} onStartCheckInTask={(dateKey, mode, gameId) => {
          const task = createPendingCheckInTask(dateKey, mode, gameId);
          if (gameId === "sudoku") prepareSudoku("medium", createSeed(), task);
          else prepareCrossMath("easy", createSeed(), task);
        }} />
      )}
      {screen.name === "profile" && <ProfilePage activity={activity} />}

      {screen.name === "sudoku-difficulty" && (
        <DifficultyPage
          hasSavedGame={savedSudokuGame !== null}
          onBack={() => setScreen({name: "home"})}
          onSelect={(difficulty) => prepareSudoku(difficulty, createSeed())}
          onStartChallenge={(reference: SudokuChallengeReference) => prepareSudoku(reference.difficulty, reference.seed)}
        />
      )}
      {screen.name === "sudoku-generating" && <GeneratingPage difficulty={screen.difficulty} />}
      {screen.name === "sudoku-game" && (
        <SudokuGamePage key={screen.initialSession.puzzle.id} initialSession={screen.initialSession} onExit={goHome} onFinish={(result) => {
          setSavedSudokuGame(null);
          setScreen({name: "sudoku-result", result, checkInStatus: completeActivity("sudoku", result.elapsedSeconds)});
        }} />
      )}
      {screen.name === "sudoku-result" && (
        <ResultPage result={screen.result} checkInStatus={screen.checkInStatus} onHome={() => setScreen({name: "home"})} onNewGame={() => setScreen({name: "sudoku-difficulty"})} />
      )}

      {screen.name === "crossmath-difficulty" && (
        <CrossMathDifficultyPage
          hasSavedGame={savedCrossMathGame !== null}
          onBack={() => setScreen({name: "home"})}
          onSelect={(difficulty) => prepareCrossMath(difficulty, createSeed())}
          onStartChallenge={(reference: CrossMathChallengeReference) => prepareCrossMath(reference.difficulty, reference.seed)}
        />
      )}
      {screen.name === "crossmath-generating" && <CrossMathGeneratingPage difficulty={screen.difficulty} />}
      {screen.name === "crossmath-game" && (
        <CrossMathGamePage key={screen.initialSession.puzzle.id} initialSession={screen.initialSession} onExit={goHome} onFinish={(result) => {
          setSavedCrossMathGame(null);
          setScreen({name: "crossmath-result", result, checkInStatus: completeActivity("crossmath", result.elapsedSeconds)});
        }} />
      )}
      {screen.name === "crossmath-result" && (
        <CrossMathResultPage result={screen.result} checkInStatus={screen.checkInStatus} onHome={() => setScreen({name: "home"})} onNewGame={() => setScreen({name: "crossmath-difficulty"})} />
      )}

      {screen.name === "generation-error" && (
        <GenerationErrorPage message={screen.message} onBack={() => {
          if (screen.gameId === "sudoku") setScreen({name: "sudoku-difficulty"});
          else setScreen({name: "crossmath-difficulty"});
        }} />
      )}
      {(screen.name === "home" || screen.name === "calendar" || screen.name === "profile") && (
        <BottomNavigation activeTab={screen.name} onChange={changeMainTab} />
      )}
    </GameViewport>
  );
}
