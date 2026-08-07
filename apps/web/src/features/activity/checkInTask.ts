import {GAME_CATALOG, type GameId} from "@math-game/game-core";

export const PENDING_CHECK_IN_TASK_SAVE_KEY = "math-game:activity:pending-task:v1";

export interface PendingCheckInTask {
  readonly schemaVersion: 1;
  readonly dateKey: string;
  readonly mode: "daily" | "makeup";
  readonly gameId: GameId;
}

function isValidDateKey(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function createPendingCheckInTask(
  dateKey: string,
  mode: PendingCheckInTask["mode"],
  gameId: GameId,
): PendingCheckInTask {
  return {schemaVersion: 1, dateKey, mode, gameId};
}

export function restorePendingCheckInTask(value: unknown): PendingCheckInTask | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const knownGameIds = new Set<GameId>(GAME_CATALOG.map((game) => game.id));
  return candidate.schemaVersion === 1
    && typeof candidate.dateKey === "string"
    && isValidDateKey(candidate.dateKey)
    && (candidate.mode === "daily" || candidate.mode === "makeup")
    && knownGameIds.has(candidate.gameId as GameId)
    ? candidate as unknown as PendingCheckInTask
    : null;
}
