import {GAME_CATALOG, type GameId} from "@math-game/game-core";

export const ACTIVITY_SAVE_KEY = "math-game:activity:v5";
export const ACTIVITY_V4_SAVE_KEY = "math-game:activity:v4";
export const ACTIVITY_V3_SAVE_KEY = "math-game:activity:v3";
export const ACTIVITY_V2_SAVE_KEY = "math-game:activity:v2";
export const LEGACY_ACTIVITY_SAVE_KEY = "math-game:activity:v1";
export const ACTIVITY_SCHEMA_VERSION = 5 as const;

export const DAILY_TASK_GAME_IDS: readonly GameId[] = GAME_CATALOG
  .filter((game) => game.status === "available")
  .map((game) => game.id);

export interface DailyGameActivity {
  readonly completedGames: number;
  readonly bestSeconds: number;
  readonly lastCompletedAt: string;
}

export interface DailyActivity {
  readonly requiredGameIds: readonly GameId[];
  readonly games: Readonly<Partial<Record<GameId, DailyGameActivity>>>;
  readonly checkIn?: {
    readonly recordedAt: string;
  };
  readonly makeup?: {
    readonly recordedAt: string;
  };
}

export interface ActivityRecord {
  readonly schemaVersion: typeof ACTIVITY_SCHEMA_VERSION;
  readonly days: Readonly<Record<string, DailyActivity>>;
}

export interface DailyTaskProgress {
  readonly gameId: GameId;
  readonly completed: boolean;
  readonly completedGames: number;
}

export interface DayProgress {
  readonly completedTasks: number;
  readonly totalTasks: number;
  readonly totalGames: number;
  readonly tasksComplete: boolean;
  readonly isComplete: boolean;
  readonly isCheckedIn: boolean;
  readonly isMakeup: boolean;
  readonly tasks: readonly DailyTaskProgress[];
}

export interface MonthProgress {
  readonly completedDays: number;
  readonly totalDays: number;
  readonly totalGames: number;
  readonly makeupDays: number;
  readonly trophyTier: MonthlyTrophyTier | null;
  readonly isComplete: boolean;
}

export type MonthlyTrophyTier = "gold" | "silver" | "bronze";

export interface ActivitySummary {
  readonly checkedInDays: number;
  readonly totalGames: number;
  readonly completedMonths: number;
  readonly currentStreak: number;
}

interface LegacyDailyActivity {
  readonly completedGames: number;
  readonly bestSeconds: number;
  readonly lastCompletedAt: string;
}

interface LegacyActivityRecord {
  readonly schemaVersion: 1;
  readonly days: Readonly<Record<string, LegacyDailyActivity>>;
}

interface ActivityRecordV2 {
  readonly schemaVersion: 2;
  readonly days: Readonly<Record<string, {
    readonly requiredGameIds: readonly GameId[];
    readonly games: Readonly<Partial<Record<GameId, DailyGameActivity>>>;
  }>>;
}

interface ActivityRecordV3 {
  readonly schemaVersion: 3;
  readonly days: Readonly<Record<string, {
    readonly requiredGameIds: readonly GameId[];
    readonly games: Readonly<Partial<Record<GameId, DailyGameActivity>>>;
    readonly makeup?: {readonly recordedAt: string};
  }>>;
}

interface ActivityRecordV4 {
  readonly schemaVersion: 4;
  readonly days: Readonly<Record<string, DailyActivity>>;
}

export const EMPTY_ACTIVITY_RECORD: ActivityRecord = {
  schemaVersion: ACTIVITY_SCHEMA_VERSION,
  days: {},
};

export function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatMonthKey(year: number, monthIndex: number): string {
  return `${year}-${(monthIndex + 1).toString().padStart(2, "0")}`;
}

export function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function getDayProgress(
  activity: ActivityRecord,
  dateKey: string,
  taskGameIds?: readonly GameId[],
): DayProgress {
  const entry = activity.days[dateKey];
  const requiredGameIds = taskGameIds ?? entry?.requiredGameIds ?? DAILY_TASK_GAME_IDS;
  const tasks = requiredGameIds.map((gameId) => {
    const completedGames = entry?.games[gameId]?.completedGames ?? 0;
    return {gameId, completed: completedGames > 0, completedGames};
  });
  const completedTasks = tasks.filter((task) => task.completed).length;
  const totalGames = Object.values(entry?.games ?? {}).reduce(
    (sum, game) => sum + (game?.completedGames ?? 0),
    0,
  );
  const isMakeup = entry?.makeup !== undefined;
  const isCheckedIn = entry?.checkIn !== undefined;
  const tasksComplete = tasks.length > 0 && completedTasks > 0;

  return {
    completedTasks,
    totalTasks: tasks.length,
    totalGames,
    tasksComplete,
    isComplete: isCheckedIn || isMakeup,
    isCheckedIn,
    isMakeup,
    tasks,
  };
}

export function recordGameCompletion(
  activity: ActivityRecord,
  gameId: GameId,
  elapsedSeconds: number,
  completedAt = new Date(),
): ActivityRecord {
  const dateKey = formatLocalDateKey(completedAt);
  return recordGameCompletionForDate(activity, dateKey, gameId, elapsedSeconds, completedAt);
}

function recordGameCompletionForDate(
  activity: ActivityRecord,
  dateKey: string,
  gameId: GameId,
  elapsedSeconds: number,
  completedAt: Date,
): ActivityRecord {
  if (!isValidDateKey(dateKey)) return activity;
  const previousDay = activity.days[dateKey];
  const previousGame = previousDay?.games[gameId];
  const normalizedSeconds = Math.max(0, Math.trunc(elapsedSeconds));
  const nextGame: DailyGameActivity = {
    completedGames: (previousGame?.completedGames ?? 0) + 1,
    bestSeconds: previousGame === undefined
      ? normalizedSeconds
      : Math.min(previousGame.bestSeconds, normalizedSeconds),
    lastCompletedAt: completedAt.toISOString(),
  };

  return {
    schemaVersion: ACTIVITY_SCHEMA_VERSION,
    days: {
      ...activity.days,
      [dateKey]: {
        ...previousDay,
        requiredGameIds: previousDay?.requiredGameIds ?? DAILY_TASK_GAME_IDS,
        games: {...previousDay?.games, [gameId]: nextGame},
      },
    },
  };
}

export function recordCheckInTaskCompletion(
  activity: ActivityRecord,
  dateKey: string,
  mode: "daily" | "makeup",
  gameId: GameId,
  elapsedSeconds: number,
  completedAt = new Date(),
): ActivityRecord {
  const todayKey = formatLocalDateKey(completedAt);
  const eligible = mode === "daily" ? dateKey === todayKey : dateKey < todayKey;
  if (!isValidDateKey(dateKey) || !eligible || getDayProgress(activity, dateKey).isComplete) {
    return activity;
  }
  const withCompletedGame = recordGameCompletionForDate(
    activity,
    dateKey,
    gameId,
    elapsedSeconds,
    completedAt,
  );
  const completedDay = withCompletedGame.days[dateKey];
  if (completedDay === undefined || !getDayProgress(withCompletedGame, dateKey).tasksComplete) {
    return withCompletedGame;
  }
  const confirmation = {recordedAt: completedAt.toISOString()};
  return {
    schemaVersion: ACTIVITY_SCHEMA_VERSION,
    days: {
      ...withCompletedGame.days,
      [dateKey]: {
        ...completedDay,
        ...(mode === "daily" ? {checkIn: confirmation} : {makeup: confirmation}),
      },
    },
  };
}

export function getMonthProgress(
  activity: ActivityRecord,
  year: number,
  monthIndex: number,
  taskGameIds?: readonly GameId[],
): MonthProgress {
  const totalDays = getDaysInMonth(year, monthIndex);
  const monthKey = formatMonthKey(year, monthIndex);
  const days = Array.from({length: totalDays}, (_, index) => (
    getDayProgress(
      activity,
      `${monthKey}-${String(index + 1).padStart(2, "0")}`,
      taskGameIds,
    )
  ));
  const makeupDays = days.filter((day) => day.isMakeup).length;
  const isComplete = days.length > 0 && days.every((day) => day.isComplete);

  return {
    completedDays: days.filter((day) => day.isComplete).length,
    totalDays,
    totalGames: days.reduce((sum, day) => sum + day.totalGames, 0),
    makeupDays,
    trophyTier: isComplete ? getMonthlyTrophyTier(makeupDays) : null,
    isComplete,
  };
}

export function getMonthlyTrophyTier(makeupDays: number): MonthlyTrophyTier {
  if (makeupDays < 5) return "gold";
  if (makeupDays < 15) return "silver";
  return "bronze";
}

export function getCurrentStreak(
  activity: ActivityRecord,
  today = new Date(),
  taskGameIds?: readonly GameId[],
): number {
  let streak = 0;
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  while (getDayProgress(activity, formatLocalDateKey(cursor), taskGameIds).isComplete) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function getActivitySummary(
  activity: ActivityRecord,
  today = new Date(),
  taskGameIds?: readonly GameId[],
): ActivitySummary {
  const monthKeys = new Set<string>();
  let checkedInDays = 0;
  let totalGames = 0;
  for (const dateKey of Object.keys(activity.days)) {
    const day = getDayProgress(activity, dateKey, taskGameIds);
    if (day.isComplete) checkedInDays += 1;
    totalGames += day.totalGames;
    monthKeys.add(dateKey.slice(0, 7));
  }
  const completedMonths = [...monthKeys].filter((monthKey) => {
    const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
    return match !== null
      && getMonthProgress(activity, Number(match[1]), Number(match[2]) - 1, taskGameIds).isComplete;
  }).length;

  return {
    checkedInDays,
    totalGames,
    completedMonths,
    currentStreak: getCurrentStreak(activity, today, taskGameIds),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidDateKey(dateKey: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (match === null) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return month >= 1
    && month <= 12
    && day >= 1
    && day <= getDaysInMonth(year, month - 1);
}

function isValidGameActivity(value: unknown): value is DailyGameActivity {
  if (!isRecord(value)) return false;
  return Number.isInteger(value.completedGames)
    && Number(value.completedGames) > 0
    && Number.isInteger(value.bestSeconds)
    && Number(value.bestSeconds) >= 0
    && typeof value.lastCompletedAt === "string"
    && !Number.isNaN(Date.parse(value.lastCompletedAt));
}

function isValidTimestampRecord(value: unknown): boolean {
  return isRecord(value)
    && typeof value.recordedAt === "string"
    && !Number.isNaN(Date.parse(value.recordedAt));
}

function hasValidRequiredGames(day: Record<string, unknown>, knownGameIds: ReadonlySet<GameId>): boolean {
  return Array.isArray(day.requiredGameIds)
    && day.requiredGameIds.length > 0
    && new Set(day.requiredGameIds).size === day.requiredGameIds.length
    && day.requiredGameIds.every((gameId) => knownGameIds.has(gameId as GameId));
}

function hasValidGames(day: Record<string, unknown>, knownGameIds: ReadonlySet<GameId>): boolean {
  return isRecord(day.games)
    && Object.entries(day.games).every(([gameId, game]) => (
      knownGameIds.has(gameId as GameId) && isValidGameActivity(game)
    ));
}

function hasCompletedRequiredGames(day: {
  readonly requiredGameIds: readonly GameId[];
  readonly games: Readonly<Partial<Record<GameId, DailyGameActivity>>>;
}): boolean {
  return day.requiredGameIds.every((gameId) => (day.games[gameId]?.completedGames ?? 0) > 0);
}

function hasCompletedAnyRequiredGame(day: {
  readonly requiredGameIds: readonly GameId[];
  readonly games: Readonly<Partial<Record<GameId, DailyGameActivity>>>;
}): boolean {
  return day.requiredGameIds.some((gameId) => (day.games[gameId]?.completedGames ?? 0) > 0);
}

function latestRequiredGameCompletion(day: {
  readonly requiredGameIds: readonly GameId[];
  readonly games: Readonly<Partial<Record<GameId, DailyGameActivity>>>;
}): string {
  return day.requiredGameIds
    .map((gameId) => day.games[gameId]?.lastCompletedAt ?? "")
    .sort()
    .at(-1) ?? "";
}

function normalizeActivityRecord(value: unknown): ActivityRecord | null {
  if (!isRecord(value) || value.schemaVersion !== ACTIVITY_SCHEMA_VERSION || !isRecord(value.days)) {
    return null;
  }
  const knownGameIds = new Set<GameId>(GAME_CATALOG.map((game) => game.id));
  const valid = Object.entries(value.days).every(([dateKey, day]) => (
    isValidDateKey(dateKey)
    && isRecord(day)
    && hasValidGames(day, knownGameIds)
    && hasValidRequiredGames(day, knownGameIds)
    && Object.entries(day.games as Record<string, unknown>).length > 0
    && (day.makeup === undefined || isValidTimestampRecord(day.makeup))
    && (day.checkIn === undefined || isValidTimestampRecord(day.checkIn))
    && !(day.makeup !== undefined && day.checkIn !== undefined)
    && (day.checkIn === undefined || hasCompletedAnyRequiredGame(day as unknown as DailyActivity))
    && (day.makeup === undefined || hasCompletedAnyRequiredGame(day as unknown as DailyActivity))
  ));
  return valid ? value as unknown as ActivityRecord : null;
}

function normalizeActivityRecordV3(value: unknown): ActivityRecordV3 | null {
  if (!isRecord(value) || value.schemaVersion !== 3 || !isRecord(value.days)) return null;
  const knownGameIds = new Set<GameId>(GAME_CATALOG.map((game) => game.id));
  const valid = Object.entries(value.days).every(([dateKey, day]) => (
    isValidDateKey(dateKey)
    && isRecord(day)
    && hasValidGames(day, knownGameIds)
    && hasValidRequiredGames(day, knownGameIds)
    && (Object.entries(day.games as Record<string, unknown>).length > 0 || isValidTimestampRecord(day.makeup))
    && (day.makeup === undefined || isValidTimestampRecord(day.makeup))
  ));
  return valid ? value as unknown as ActivityRecordV3 : null;
}

function normalizeActivityRecordV4(value: unknown): ActivityRecordV4 | null {
  if (!isRecord(value) || value.schemaVersion !== 4 || !isRecord(value.days)) return null;
  const knownGameIds = new Set<GameId>(GAME_CATALOG.map((game) => game.id));
  const valid = Object.entries(value.days).every(([dateKey, day]) => (
    isValidDateKey(dateKey)
    && isRecord(day)
    && hasValidGames(day, knownGameIds)
    && hasValidRequiredGames(day, knownGameIds)
    && (Object.entries(day.games as Record<string, unknown>).length > 0
      || isValidTimestampRecord(day.makeup)
      || isValidTimestampRecord(day.checkIn))
    && (day.makeup === undefined || isValidTimestampRecord(day.makeup))
    && (day.checkIn === undefined || isValidTimestampRecord(day.checkIn))
    && !(day.makeup !== undefined && day.checkIn !== undefined)
  ));
  return valid ? value as unknown as ActivityRecordV4 : null;
}

function normalizeActivityRecordV2(value: unknown): ActivityRecordV2 | null {
  if (!isRecord(value) || value.schemaVersion !== 2 || !isRecord(value.days)) return null;
  const knownGameIds = new Set<GameId>(GAME_CATALOG.map((game) => game.id));
  const valid = Object.entries(value.days).every(([dateKey, day]) => (
    isValidDateKey(dateKey)
    && isRecord(day)
    && hasValidGames(day, knownGameIds)
    && Object.entries(day.games as Record<string, unknown>).length > 0
    && hasValidRequiredGames(day, knownGameIds)
  ));
  return valid ? value as unknown as ActivityRecordV2 : null;
}

function normalizeLegacyActivityRecord(value: unknown): LegacyActivityRecord | null {
  if (!isRecord(value) || value.schemaVersion !== 1 || !isRecord(value.days)) {
    return null;
  }
  const valid = Object.entries(value.days).every(([dateKey, entry]) => (
    isValidDateKey(dateKey) && isValidGameActivity(entry)
  ));
  return valid ? value as unknown as LegacyActivityRecord : null;
}

function migrateDaysToCurrent(
  days: Readonly<Record<string, {
    readonly requiredGameIds: readonly GameId[];
    readonly games: Readonly<Partial<Record<GameId, DailyGameActivity>>>;
    readonly makeup?: {readonly recordedAt: string};
  }>>,
): ActivityRecord["days"] {
  return Object.fromEntries(Object.entries(days).flatMap(([dateKey, day]) => {
    const tasksComplete = hasCompletedRequiredGames(day);
    if (day.makeup !== undefined) {
      if (hasCompletedAnyRequiredGame(day)) return [[dateKey, day]];
      if (Object.keys(day.games).length === 0) return [];
      const {makeup: _discarded, ...withoutInvalidMakeup} = day;
      return [[dateKey, withoutInvalidMakeup]];
    }
    if (!tasksComplete) return [[dateKey, day]];
    return [[dateKey, {...day, checkIn: {recordedAt: latestRequiredGameCompletion(day)}}]];
  }));
}

export function migrateActivityRecordV4(value: unknown): ActivityRecord {
  const previous = normalizeActivityRecordV4(value);
  if (previous === null) return EMPTY_ACTIVITY_RECORD;
  return {
    schemaVersion: ACTIVITY_SCHEMA_VERSION,
    days: Object.fromEntries(Object.entries(previous.days).flatMap(([dateKey, day]) => {
      const hasCompletedTask = hasCompletedAnyRequiredGame(day);
      if (day.checkIn !== undefined && hasCompletedTask) return [[dateKey, day]];
      if (day.makeup !== undefined && hasCompletedTask) return [[dateKey, day]];
      const {checkIn: _checkIn, makeup: _makeup, ...withoutInvalidConfirmation} = day;
      return Object.keys(day.games).length === 0 ? [] : [[dateKey, withoutInvalidConfirmation]];
    })),
  };
}

export function migrateActivityRecordV3(value: unknown): ActivityRecord {
  const previous = normalizeActivityRecordV3(value);
  if (previous === null) return EMPTY_ACTIVITY_RECORD;
  return {schemaVersion: ACTIVITY_SCHEMA_VERSION, days: migrateDaysToCurrent(previous.days)};
}

export function migrateActivityRecordV2(value: unknown): ActivityRecord {
  const previous = normalizeActivityRecordV2(value);
  if (previous === null) return EMPTY_ACTIVITY_RECORD;
  return {schemaVersion: ACTIVITY_SCHEMA_VERSION, days: migrateDaysToCurrent(previous.days)};
}

export function migrateLegacyActivityRecord(value: unknown): ActivityRecord {
  const legacy = normalizeLegacyActivityRecord(value);
  if (legacy === null) return EMPTY_ACTIVITY_RECORD;
  return {
    schemaVersion: ACTIVITY_SCHEMA_VERSION,
    days: Object.fromEntries(Object.entries(legacy.days).map(([dateKey, entry]) => [
      dateKey,
      {
        requiredGameIds: ["sudoku"],
        games: {sudoku: entry},
        checkIn: {recordedAt: entry.lastCompletedAt},
      },
    ])),
  };
}

export function restoreActivityRecord(
  value: unknown,
  previousV4Value: unknown = null,
  previousV3Value: unknown = null,
  previousV2Value: unknown = null,
  legacyValue: unknown = null,
): ActivityRecord {
  if (value !== null && value !== undefined) {
    return normalizeActivityRecord(value) ?? EMPTY_ACTIVITY_RECORD;
  }
  if (previousV4Value !== null && previousV4Value !== undefined) {
    return migrateActivityRecordV4(previousV4Value);
  }
  if (previousV3Value !== null && previousV3Value !== undefined) {
    return migrateActivityRecordV3(previousV3Value);
  }
  if (previousV2Value !== null && previousV2Value !== undefined) {
    return migrateActivityRecordV2(previousV2Value);
  }
  return migrateLegacyActivityRecord(legacyValue);
}
