import {
  generateSudoku,
  type SudokuChallengeReference,
  type SudokuDifficulty,
} from "@math-game/sudoku-core";
import {lazy, Suspense, useEffect, useState} from "react";
import {GameViewport} from "./components/GameViewport";
import {BottomNavigation, type MainTab} from "./components/BottomNavigation";
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
  | {readonly name: "difficulty"}
  | {readonly name: "generating"; readonly difficulty: SudokuDifficulty; readonly seed: number}
  | {readonly name: "game"; readonly initialSession: SudokuSession}
  | {readonly name: "result"; readonly result: GameResult; readonly checkInStatus?: string};

function createSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0xffff_ffff)) >>> 0;
}

export function App() {
  const [screen, setScreen] = useState<AppScreen>({name: "home"});
  const [savedGame, setSavedGame] = useState<SavedSudokuGame | null>(null);
  const [activity, setActivity] = useState<ActivityRecord>(EMPTY_ACTIVITY_RECORD);
  const [pendingCheckInTask, setPendingCheckInTask] = useState<PendingCheckInTask | null>(null);

  useEffect(() => {
    void Promise.all([
      localSaveStore.load(SUDOKU_SAVE_KEY),
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
      savedGameValue,
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
      const restoredGame = restoreSavedGame(savedGameValue);
      const restoredPendingTask = restorePendingCheckInTask(pendingTaskValue);
      setSavedGame(restoredGame);
      setPendingCheckInTask(restoredGame === null ? null : restoredPendingTask);
      if (restoredGame === null && restoredPendingTask !== null) {
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
      if (!activityExists) {
        void localSaveStore.save(ACTIVITY_SAVE_KEY, restoredActivity).catch(() => undefined);
      }
    });
  }, []);

  const prepareGame = (
    difficulty: SudokuDifficulty,
    seed: number,
    checkInTask: PendingCheckInTask | null = null,
  ) => {
    setPendingCheckInTask(checkInTask);
    if (checkInTask === null) {
      void localSaveStore.remove(PENDING_CHECK_IN_TASK_SAVE_KEY).catch(() => undefined);
    } else {
      void localSaveStore.save(PENDING_CHECK_IN_TASK_SAVE_KEY, checkInTask).catch(() => undefined);
    }
    setScreen({name: "generating", difficulty, seed});
    window.setTimeout(() => {
      const puzzle = generateSudoku(difficulty, seed);
      setScreen({
        name: "game",
        initialSession: createSudokuSession(puzzle),
      });
    }, 80);
  };

  const startGame = (difficulty: SudokuDifficulty) => prepareGame(difficulty, createSeed());
  const startChallenge = (reference: SudokuChallengeReference) => (
    prepareGame(reference.difficulty, reference.seed)
  );

  const goHome = () => {
    void localSaveStore.load(SUDOKU_SAVE_KEY).then((value) => {
      setSavedGame(restoreSavedGame(value));
      setScreen({name: "home"});
    });
  };

  const changeMainTab = (tab: MainTab) => {
    if (tab === "home") setScreen({name: "home"});
    else if (tab === "calendar") setScreen({name: "calendar"});
    else setScreen({name: "profile"});
  };

  if (ComponentPreviewPage !== null && new URLSearchParams(window.location.search).has("preview")) {
    return (
      <GameViewport>
        <Suspense fallback={null}><ComponentPreviewPage /></Suspense>
      </GameViewport>
    );
  }

  return (
    <GameViewport>
      {screen.name === "home" && (
        <HomePage
          savedGame={savedGame}
          onChooseSudoku={() => setScreen({name: "difficulty"})}
          onResume={() => {
            if (savedGame !== null) {
              setScreen({name: "game", initialSession: savedGame.session});
            }
          }}
        />
      )}
      {screen.name === "calendar" && (
        <CalendarPage
          activity={activity}
          onStartCheckInTask={(dateKey, mode, gameId) => {
            const task = createPendingCheckInTask(dateKey, mode, gameId);
            if (gameId === "sudoku") {
              prepareGame("medium", createSeed(), task);
            }
          }}
        />
      )}
      {screen.name === "profile" && (
        <ProfilePage activity={activity} />
      )}
      {screen.name === "difficulty" && (
        <DifficultyPage
          hasSavedGame={savedGame !== null}
          onBack={() => setScreen({name: "home"})}
          onSelect={startGame}
          onStartChallenge={startChallenge}
        />
      )}
      {screen.name === "generating" && <GeneratingPage difficulty={screen.difficulty} />}
      {screen.name === "game" && (
        <SudokuGamePage
          key={screen.initialSession.puzzle.id}
          initialSession={screen.initialSession}
          onExit={goHome}
          onFinish={(result) => {
            setSavedGame(null);
            const completedAt = new Date();
            const nextActivity = pendingCheckInTask === null
              ? recordGameCompletion(activity, "sudoku", result.elapsedSeconds, completedAt)
              : recordCheckInTaskCompletion(
                activity,
                pendingCheckInTask.dateKey,
                pendingCheckInTask.mode,
                pendingCheckInTask.gameId,
                result.elapsedSeconds,
                completedAt,
              );
            setActivity(nextActivity);
            void localSaveStore.save(ACTIVITY_SAVE_KEY, nextActivity).catch(() => undefined);

            let checkInStatus: string | undefined;
            if (pendingCheckInTask !== null) {
              const progress = getDayProgress(nextActivity, pendingCheckInTask.dateKey);
              const [, month, day] = pendingCheckInTask.dateKey.split("-").map(Number);
              checkInStatus = progress.isComplete
                ? pendingCheckInTask.mode === "daily"
                  ? "今日任务完成，打卡成功"
                  : `${month} 月 ${day} 日任务完成，补签成功`
                : "本项任务已完成，继续完成其余任务即可签到";
            }
            setPendingCheckInTask(null);
            void localSaveStore.remove(PENDING_CHECK_IN_TASK_SAVE_KEY).catch(() => undefined);
            setScreen({name: "result", result, checkInStatus});
          }}
        />
      )}
      {screen.name === "result" && (
        <ResultPage
          result={screen.result}
          checkInStatus={screen.checkInStatus}
          onHome={() => setScreen({name: "home"})}
          onNewGame={() => setScreen({name: "difficulty"})}
        />
      )}
      {(screen.name === "home" || screen.name === "calendar" || screen.name === "profile") && (
        <BottomNavigation activeTab={screen.name} onChange={changeMainTab} />
      )}
    </GameViewport>
  );
}
