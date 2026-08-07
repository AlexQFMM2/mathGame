import {solveGeometryPuzzle} from "./solver.ts";
import type {GeometryHint, GeometrySelection, GridArchitectPuzzle} from "./types.ts";

export function findGeometryHint(
  puzzle: GridArchitectPuzzle,
  selection: GeometrySelection,
): GeometryHint | null {
  const selected = new Set(selection.selectedCellIds);
  const continuation = solveGeometryPuzzle(puzzle, 1, {
    maxVisits: 200_000,
    requiredCellIds: [...selected],
  }).solutions[0];
  if (continuation !== undefined) {
    const buildable = continuation.selectedCellIds.find((id) => !selected.has(id));
    return buildable === undefined
      ? null
      : {action: "build", cellId: buildable, message: "可以从这一格继续", reason: "保留当前建筑时，这一格可以通向一组满足全部条件的方案。"};
  }
  for (const removable of selected) {
    const remaining = [...selected].filter((id) => id !== removable);
    const repaired = solveGeometryPuzzle(puzzle, 1, {
      maxVisits: 200_000,
      requiredCellIds: remaining,
    }).solutions[0];
    if (repaired !== undefined) {
      return {action: "remove", cellId: removable, message: "先拆除这一格", reason: "保留其他建筑时，拆除这一格可以重新得到可完成的方案。"};
    }
  }
  return null;
}
