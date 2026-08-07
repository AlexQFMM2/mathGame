import type {
  GeometryCell,
  GeometryConditionResult,
  GeometryEvaluation,
  GeometryMetrics,
  GeometrySelection,
  GridArchitectPuzzle,
  SymmetryKind,
} from "./types.ts";

const DIRECTIONS = [
  {row: -1, column: 0},
  {row: 1, column: 0},
  {row: 0, column: -1},
  {row: 0, column: 1},
] as const;

export function geometryCellId(row: number, column: number): string {
  return `cell-${row}-${column}`;
}

function parseCellId(id: string): {readonly row: number; readonly column: number} | null {
  const match = /^cell-(\d+)-(\d+)$/.exec(id);
  return match === null ? null : {row: Number(match[1]), column: Number(match[2])};
}

export function mirrorGeometryCellId(
  puzzle: Pick<GridArchitectPuzzle, "rows" | "columns">,
  cellId: string,
  symmetry: SymmetryKind,
): string | null {
  const position = parseCellId(cellId);
  if (position === null || position.row >= puzzle.rows || position.column >= puzzle.columns) return null;
  const row = symmetry === "horizontal" || symmetry === "central"
    ? puzzle.rows - 1 - position.row
    : position.row;
  const column = symmetry === "vertical" || symmetry === "central"
    ? puzzle.columns - 1 - position.column
    : position.column;
  return geometryCellId(row, column);
}

function selectedSet(puzzle: GridArchitectPuzzle, selection: GeometrySelection): Set<string> {
  const allowed = new Set(puzzle.cells.filter((cell) => cell.terrain !== "obstacle").map((cell) => cell.id));
  return new Set(selection.selectedCellIds.filter((id) => allowed.has(id)));
}

function getDisconnectedIds(selected: ReadonlySet<string>): readonly string[] {
  const first = selected.values().next().value as string | undefined;
  if (first === undefined) return [];
  const reached = new Set([first]);
  const queue = [first];
  while (queue.length > 0) {
    const current = parseCellId(queue.shift() as string);
    if (current === null) continue;
    for (const direction of DIRECTIONS) {
      const neighbor = geometryCellId(current.row + direction.row, current.column + direction.column);
      if (selected.has(neighbor) && !reached.has(neighbor)) {
        reached.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return [...selected].filter((id) => !reached.has(id));
}

function countHoles(puzzle: GridArchitectPuzzle, selected: ReadonlySet<string>): {readonly count: number; readonly cellIds: readonly string[]} {
  const outside = new Set<string>();
  const queue: string[] = [];
  const enqueue = (row: number, column: number) => {
    const id = geometryCellId(row, column);
    if (!selected.has(id) && !outside.has(id)) {
      outside.add(id);
      queue.push(id);
    }
  };
  for (let row = 0; row < puzzle.rows; row += 1) {
    enqueue(row, 0);
    enqueue(row, puzzle.columns - 1);
  }
  for (let column = 0; column < puzzle.columns; column += 1) {
    enqueue(0, column);
    enqueue(puzzle.rows - 1, column);
  }
  while (queue.length > 0) {
    const current = parseCellId(queue.shift() as string);
    if (current === null) continue;
    for (const direction of DIRECTIONS) {
      const row = current.row + direction.row;
      const column = current.column + direction.column;
      if (row >= 0 && row < puzzle.rows && column >= 0 && column < puzzle.columns) enqueue(row, column);
    }
  }
  const enclosed = puzzle.cells
    .map((cell) => cell.id)
    .filter((id) => !selected.has(id) && !outside.has(id));
  const unseen = new Set(enclosed);
  let count = 0;
  while (unseen.size > 0) {
    count += 1;
    const start = unseen.values().next().value as string;
    unseen.delete(start);
    const component = [start];
    while (component.length > 0) {
      const current = parseCellId(component.shift() as string);
      if (current === null) continue;
      for (const direction of DIRECTIONS) {
        const neighbor = geometryCellId(current.row + direction.row, current.column + direction.column);
        if (unseen.delete(neighbor)) component.push(neighbor);
      }
    }
  }
  return {count, cellIds: enclosed};
}

export function measureGeometrySelection(
  puzzle: GridArchitectPuzzle,
  selection: GeometrySelection,
): GeometryMetrics {
  const selected = selectedSet(puzzle, selection);
  let perimeter = 0;
  for (const id of selected) {
    const position = parseCellId(id);
    if (position === null) continue;
    for (const direction of DIRECTIONS) {
      if (!selected.has(geometryCellId(position.row + direction.row, position.column + direction.column))) {
        perimeter += 1;
      }
    }
  }
  const holes = countHoles(puzzle, selected);
  return {
    area: selected.size,
    perimeter,
    connected: selected.size > 0 && getDisconnectedIds(selected).length === 0,
    holes: holes.count,
  };
}

export function evaluateGeometryPuzzle(
  puzzle: GridArchitectPuzzle,
  selection: GeometrySelection,
  ignoredConditionKinds: readonly string[] = [],
): GeometryEvaluation {
  const selected = selectedSet(puzzle, selection);
  const metrics = measureGeometrySelection(puzzle, selection);
  const ignored = new Set(ignoredConditionKinds);
  const results: GeometryConditionResult[] = puzzle.conditions
    .filter((condition) => !ignored.has(condition.kind))
    .map((condition) => {
      if (condition.kind === "area-equal") {
        return {conditionId: condition.id, satisfied: metrics.area === condition.target, actual: metrics.area, target: condition.target, conflictCellIds: []};
      }
      if (condition.kind === "perimeter-equal" || condition.kind === "minimum-perimeter") {
        return {conditionId: condition.id, satisfied: metrics.perimeter === condition.target, actual: metrics.perimeter, target: condition.target, conflictCellIds: []};
      }
      if (condition.kind === "perimeter-at-most") {
        return {conditionId: condition.id, satisfied: metrics.perimeter <= condition.target, actual: metrics.perimeter, target: `≤ ${condition.target}`, conflictCellIds: []};
      }
      if (condition.kind === "connected") {
        const disconnected = getDisconnectedIds(selected);
        return {conditionId: condition.id, satisfied: metrics.connected, actual: metrics.connected ? "已连通" : "有断开", target: "一个整体", conflictCellIds: disconnected};
      }
      if (condition.kind === "no-holes") {
        const holes = countHoles(puzzle, selected);
        return {conditionId: condition.id, satisfied: holes.count === 0, actual: holes.count, target: 0, conflictCellIds: holes.cellIds};
      }
      if (condition.kind === "include-landmarks") {
        const missing = puzzle.cells.filter((cell) => cell.terrain === "landmark" && !selected.has(cell.id)).map((cell) => cell.id);
        return {conditionId: condition.id, satisfied: missing.length === 0, actual: missing.length === 0 ? "已覆盖" : `缺 ${missing.length} 处`, target: "覆盖全部地标", conflictCellIds: missing};
      }
      const asymmetric = [...selected].filter((id) => {
        const mirror = mirrorGeometryCellId(puzzle, id, condition.symmetry);
        return mirror === null || !selected.has(mirror);
      });
      return {
        conditionId: condition.id,
        satisfied: asymmetric.length === 0 && selected.size > 0,
        actual: asymmetric.length === 0 && selected.size > 0 ? "已对称" : "未对称",
        target: condition.symmetry === "horizontal" ? "上下对称" : condition.symmetry === "vertical" ? "左右对称" : "中心对称",
        conflictCellIds: asymmetric,
      };
    });
  return {solved: results.length > 0 && results.every((result) => result.satisfied), metrics, conditionResults: results};
}

export function isGeometryCell(value: unknown): value is GeometryCell {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const cell = value as Record<string, unknown>;
  return typeof cell.id === "string"
    && Number.isInteger(cell.row)
    && Number.isInteger(cell.column)
    && (cell.terrain === "ground" || cell.terrain === "obstacle" || cell.terrain === "landmark");
}
