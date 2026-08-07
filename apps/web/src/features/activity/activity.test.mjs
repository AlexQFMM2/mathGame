import assert from "node:assert/strict";
import test from "node:test";
import {
  EMPTY_ACTIVITY_RECORD,
  formatLocalDateKey,
  getActivitySummary,
  getCurrentStreak,
  getDayProgress,
  getMonthlyTrophyTier,
  getMonthProgress,
  migrateActivityRecordV2,
  migrateActivityRecordV3,
  migrateActivityRecordV4,
  migrateLegacyActivityRecord,
  recordCheckInTaskCompletion,
  recordGameCompletion,
  restoreActivityRecord,
} from "./activity.ts";
import {createPendingCheckInTask, restorePendingCheckInTask} from "./checkInTask.ts";

function completeCheckInTask(activity, date, mode = "daily", elapsedSeconds = 60, completedAt = date) {
  const withSudoku = recordCheckInTaskCompletion(
    activity,
    formatLocalDateKey(date),
    mode,
    "sudoku",
    elapsedSeconds,
    completedAt,
  );
  return recordCheckInTaskCompletion(
    withSudoku,
    formatLocalDateKey(date),
    mode,
    "crossmath",
    elapsedSeconds,
    completedAt,
  );
}

test("ordinary games update statistics but do not sign in automatically", () => {
  const date = new Date(2026, 7, 7, 23, 30);
  const first = recordGameCompletion(EMPTY_ACTIVITY_RECORD, "sudoku", 180, date);
  const second = recordGameCompletion(first, "sudoku", 120, new Date(2026, 7, 7, 23, 50));
  assert.equal(second.days["2026-08-07"].games.sudoku.completedGames, 2);
  assert.equal(second.days["2026-08-07"].games.sudoku.bestSeconds, 120);
  assert.deepEqual(getDayProgress(second, "2026-08-07"), {
    completedTasks: 1,
    totalTasks: 3,
    totalGames: 2,
    tasksComplete: true,
    isComplete: false,
    isCheckedIn: false,
    isMakeup: false,
    tasks: [
      {gameId: "sudoku", completed: true, completedGames: 2},
      {gameId: "crossmath", completed: false, completedGames: 0},
      {gameId: "grid-architect", completed: false, completedGames: 0},
    ],
  });
});

test("daily check-in completes after either selected game task", () => {
  const date = new Date(2026, 7, 7, 18);
  const result = recordCheckInTaskCompletion(
    EMPTY_ACTIVITY_RECORD,
    "2026-08-07",
    "daily",
    "sudoku",
    60,
    date,
  );
  assert.equal(result.days["2026-08-07"].games.sudoku.completedGames, 1);
  assert.equal(result.days["2026-08-07"].games.crossmath, undefined);
  assert.deepEqual(result.days["2026-08-07"].checkIn, {recordedAt: date.toISOString()});
  assert.equal(getDayProgress(result, "2026-08-07").tasksComplete, true);
  assert.equal(getDayProgress(result, "2026-08-07").isCheckedIn, true);
  assert.equal(recordCheckInTaskCompletion(result, "2026-08-07", "daily", "sudoku", 30, date), result);

  const crossMathChoice = recordCheckInTaskCompletion(
    EMPTY_ACTIVITY_RECORD,
    "2026-08-07",
    "daily",
    "crossmath",
    75,
    date,
  );
  assert.equal(crossMathChoice.days["2026-08-07"].games.sudoku, undefined);
  assert.equal(getDayProgress(crossMathChoice, "2026-08-07").isCheckedIn, true);

  const geometryChoice = recordCheckInTaskCompletion(
    EMPTY_ACTIVITY_RECORD,
    "2026-08-07",
    "daily",
    "grid-architect",
    82,
    date,
  );
  assert.equal(geometryChoice.days["2026-08-07"].games["grid-architect"].completedGames, 1);
  assert.equal(getDayProgress(geometryChoice, "2026-08-07").isCheckedIn, true);
});

test("daily and makeup task targets reject future or mismatched dates", () => {
  const now = new Date(2026, 7, 7, 18);
  assert.equal(
    recordCheckInTaskCompletion(EMPTY_ACTIVITY_RECORD, "2026-08-08", "daily", "sudoku", 60, now),
    EMPTY_ACTIVITY_RECORD,
  );
  assert.equal(
    recordCheckInTaskCompletion(EMPTY_ACTIVITY_RECORD, "2026-08-07", "makeup", "sudoku", 60, now),
    EMPTY_ACTIVITY_RECORD,
  );
  assert.equal(
    recordCheckInTaskCompletion(EMPTY_ACTIVITY_RECORD, "2026-02-30", "makeup", "sudoku", 60, now),
    EMPTY_ACTIVITY_RECORD,
  );
});

test("makeup confirms the selected past date after either real game task", () => {
  const completedAt = new Date(2026, 7, 7, 18);
  const result = recordCheckInTaskCompletion(
    EMPTY_ACTIVITY_RECORD,
    "2026-08-06",
    "makeup",
    "sudoku",
    90,
    completedAt,
  );
  assert.deepEqual(result.days["2026-08-06"], {
    requiredGameIds: ["sudoku", "crossmath", "grid-architect"],
    games: {
      sudoku: {completedGames: 1, bestSeconds: 90, lastCompletedAt: completedAt.toISOString()},
    },
    makeup: {recordedAt: completedAt.toISOString()},
  });
  assert.equal(getDayProgress(result, "2026-08-06").isMakeup, true);
  assert.equal(getDayProgress(result, "2026-08-06").totalGames, 1);
});

test("month progress and trophy tier count completed makeup tasks", () => {
  let activity = EMPTY_ACTIVITY_RECORD;
  const marchFirst = new Date(2028, 2, 1, 12);
  for (let day = 1; day <= 29; day += 1) {
    activity = day <= 4
      ? completeCheckInTask(activity, new Date(2028, 1, day, 12), "makeup", 60, marchFirst)
      : completeCheckInTask(activity, new Date(2028, 1, day, 12));
  }
  assert.deepEqual(getMonthProgress(activity, 2028, 1), {
    completedDays: 29,
    totalDays: 29,
    totalGames: 29,
    makeupDays: 4,
    trophyTier: "gold",
    isComplete: true,
  });
});

test("trophy remains locked until every day of the month is complete", () => {
  let activity = EMPTY_ACTIVITY_RECORD;
  const completedAt = new Date(2028, 2, 1, 12);
  for (let day = 1; day <= 4; day += 1) {
    activity = completeCheckInTask(activity, new Date(2028, 1, day, 12), "makeup", 60, completedAt);
  }
  assert.deepEqual(getMonthProgress(activity, 2028, 1), {
    completedDays: 4,
    totalDays: 29,
    totalGames: 4,
    makeupDays: 4,
    trophyTier: null,
    isComplete: false,
  });
});

test("trophy tiers use 0-4 gold, 5-14 silver and 15+ bronze", () => {
  assert.equal(getMonthlyTrophyTier(0), "gold");
  assert.equal(getMonthlyTrophyTier(4), "gold");
  assert.equal(getMonthlyTrophyTier(5), "silver");
  assert.equal(getMonthlyTrophyTier(14), "silver");
  assert.equal(getMonthlyTrophyTier(15), "bronze");
});

test("current streak and profile summary use completed check-in tasks", () => {
  let activity = EMPTY_ACTIVITY_RECORD;
  activity = completeCheckInTask(activity, new Date(2026, 7, 5, 12));
  activity = completeCheckInTask(activity, new Date(2026, 7, 6, 12), "makeup", 60, new Date(2026, 7, 7, 10));
  activity = completeCheckInTask(activity, new Date(2026, 7, 7, 12));
  assert.equal(getCurrentStreak(activity, new Date(2026, 7, 7, 23)), 3);
  assert.deepEqual(getActivitySummary(activity, new Date(2026, 7, 7, 23)), {
    checkedInDays: 3,
    totalGames: 3,
    completedMonths: 0,
    currentStreak: 3,
  });
});

test("v4 migration removes mistaken confirmations that have no completed game", () => {
  const invalidMakeup = {
    schemaVersion: 4,
    days: {
      "2026-08-05": {
        requiredGameIds: ["sudoku"],
        games: {},
        makeup: {recordedAt: "2026-08-07T12:00:00.000Z"},
      },
      "2026-08-06": {
        requiredGameIds: ["sudoku"],
        games: {
          sudoku: {completedGames: 1, bestSeconds: 90, lastCompletedAt: "2026-08-06T12:00:00.000Z"},
        },
        makeup: {recordedAt: "2026-08-07T12:00:00.000Z"},
      },
    },
  };
  const migrated = migrateActivityRecordV4(invalidMakeup);
  assert.equal(migrated.schemaVersion, 5);
  assert.equal(migrated.days["2026-08-05"], undefined);
  assert.equal(getDayProgress(migrated, "2026-08-06").isMakeup, true);
});

test("v3 and v2 completed tasks migrate into explicit v5 check-ins", () => {
  const day = {
    requiredGameIds: ["sudoku"],
    games: {
      sudoku: {completedGames: 2, bestSeconds: 90, lastCompletedAt: "2026-08-06T12:00:00.000Z"},
    },
  };
  const migratedV3 = migrateActivityRecordV3({schemaVersion: 3, days: {"2026-08-06": day}});
  const migratedV2 = migrateActivityRecordV2({schemaVersion: 2, days: {"2026-08-06": day}});
  for (const migrated of [migratedV3, migratedV2]) {
    assert.equal(migrated.schemaVersion, 5);
    assert.deepEqual(migrated.days["2026-08-06"].checkIn, {recordedAt: "2026-08-06T12:00:00.000Z"});
  }
  assert.deepEqual(restoreActivityRecord(null, null, {schemaVersion: 3, days: {"2026-08-06": day}}), migratedV3);
  assert.deepEqual(restoreActivityRecord(null, null, null, {schemaVersion: 2, days: {"2026-08-06": day}}), migratedV2);
});

test("legacy activity and pending task context restore safely", () => {
  const legacy = {
    schemaVersion: 1,
    days: {
      "2026-08-07": {completedGames: 2, bestSeconds: 90, lastCompletedAt: "2026-08-07T12:00:00.000Z"},
    },
  };
  const migrated = migrateLegacyActivityRecord(legacy);
  assert.equal(migrated.schemaVersion, 5);
  assert.deepEqual(restoreActivityRecord(null, null, null, null, legacy), migrated);

  const pending = createPendingCheckInTask("2026-08-06", "makeup", "sudoku");
  assert.deepEqual(restorePendingCheckInTask(pending), pending);
  assert.equal(restorePendingCheckInTask({...pending, dateKey: "2026-02-30"}), null);
  assert.equal(restorePendingCheckInTask({...pending, mode: "bad"}), null);
});

test("invalid v5 activity data resets safely", () => {
  assert.deepEqual(restoreActivityRecord(null), EMPTY_ACTIVITY_RECORD);
  assert.deepEqual(restoreActivityRecord({schemaVersion: 5, days: {}}), EMPTY_ACTIVITY_RECORD);
  assert.deepEqual(restoreActivityRecord({
    schemaVersion: 5,
    days: {"2026-08-06": {requiredGameIds: ["sudoku"], games: {}, makeup: {recordedAt: "2026-08-07T12:00:00.000Z"}}},
  }), EMPTY_ACTIVITY_RECORD);
  assert.deepEqual(restoreActivityRecord({
    schemaVersion: 5,
    days: {"2026-08-06": {requiredGameIds: ["sudoku"], games: {}, checkIn: {recordedAt: "2026-08-06T12:00:00.000Z"}}},
  }), EMPTY_ACTIVITY_RECORD);
});
