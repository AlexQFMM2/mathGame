import {evaluateGeometryPuzzle, geometryCellId, measureGeometrySelection, mirrorGeometryCellId} from "./geometry.ts";
import {findMinimumGeometryPerimeter, solveGeometryPuzzle} from "./solver.ts";
import type {
  GeometryCell,
  GeometryCondition,
  GeometrySelection,
  GridArchitectChallengeReference,
  GridArchitectDifficulty,
  GridArchitectPuzzle,
  SymmetryKind,
} from "./types.ts";

const DIFFICULTY_CODES: Readonly<Record<GridArchitectDifficulty, string>> = {
  starter: "s",
  easy: "e",
  normal: "n",
  hard: "h",
};

const CODE_DIFFICULTIES: Readonly<Record<string, GridArchitectDifficulty>> = {
  s: "starter",
  e: "easy",
  n: "normal",
  h: "hard",
};

interface ShapeConstraintSpec {
  readonly size: number;
  readonly targetArea: number;
  readonly obstacleCount: number;
  readonly symmetry: SymmetryKind | null;
  readonly perimeterMode: "equal" | "at-most" | "minimum";
  readonly requireNoHoles: boolean;
}

interface BoardFeatures {
  readonly landmarkId: string;
  readonly obstacleIds: ReadonlySet<string>;
}

function xorshift(seed: number): () => number {
  let state = seed >>> 0 || 0x9e37_79b9;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state >>> 0;
  };
}

function shuffle<T>(values: readonly T[], seed: number): T[] {
  const result = [...values];
  const random = xorshift(seed);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = random() % (index + 1);
    [result[index], result[target]] = [result[target] as T, result[index] as T];
  }
  return result;
}

function generateShapeConstraints(difficulty: GridArchitectDifficulty, seed: number): ShapeConstraintSpec {
  const random = xorshift(seed ^ 0x2f61_53ad);
  if (difficulty === "starter") {
    return {size: 5, targetArea: 5 + random() % 3, obstacleCount: 0, symmetry: null, perimeterMode: "equal", requireNoHoles: false};
  }
  if (difficulty === "easy") {
    return {
      size: 6,
      targetArea: 8 + (random() % 2) * 2,
      obstacleCount: 2,
      symmetry: seed % 2 === 0 ? "vertical" : null,
      perimeterMode: "equal",
      requireNoHoles: false,
    };
  }
  if (difficulty === "normal") {
    return {
      size: 7,
      targetArea: 10 + (random() % 2) * 2,
      obstacleCount: 5,
      symmetry: seed % 2 === 0 ? "horizontal" : "vertical",
      perimeterMode: seed % 3 === 0 ? "at-most" : "equal",
      requireNoHoles: true,
    };
  }
  return {
    size: 8,
    targetArea: 12,
    obstacleCount: 6,
    symmetry: seed % 2 === 0 ? "central" : "vertical",
    perimeterMode: seed % 3 === 0 ? "minimum" : "at-most",
    requireNoHoles: true,
  };
}

function symmetryClosure(size: number, id: string, symmetry: SymmetryKind | null): readonly string[] {
  if (symmetry === null) return [id];
  const mirror = mirrorGeometryCellId({rows: size, columns: size}, id, symmetry);
  return mirror === null || mirror === id ? [id] : [id, mirror];
}

function selectBoardFeatures(spec: ShapeConstraintSpec, seed: number): BoardFeatures {
  const center = Math.floor((spec.size - 1) / 2);
  const landmarkId = spec.symmetry === "vertical"
    ? geometryCellId(center, Math.floor(spec.size / 2) - 1)
    : spec.symmetry === "horizontal"
      ? geometryCellId(Math.floor(spec.size / 2) - 1, center)
      : geometryCellId(center, center);
  const reserved = new Set(symmetryClosure(spec.size, landmarkId, spec.symmetry));
  if (spec.symmetry === "central" && spec.size % 2 === 0) {
    [geometryCellId(3, 4), geometryCellId(4, 3)].forEach((id) => reserved.add(id));
  }
  const all = Array.from({length: spec.size * spec.size}, (_, index) => (
    geometryCellId(Math.floor(index / spec.size), index % spec.size)
  ));
  const obstacleIds = new Set<string>();
  for (const candidate of shuffle(all.filter((id) => !reserved.has(id)), seed ^ 0x6d3a_9f21)) {
    const closure = symmetryClosure(spec.size, candidate, spec.symmetry);
    if (closure.some((id) => reserved.has(id)) || obstacleIds.size + closure.length > spec.obstacleCount) continue;
    closure.forEach((id) => obstacleIds.add(id));
    if (obstacleIds.size >= spec.obstacleCount) break;
  }
  return {landmarkId, obstacleIds};
}

function createCells(spec: ShapeConstraintSpec, features: BoardFeatures): readonly GeometryCell[] {
  return Array.from({length: spec.size * spec.size}, (_, index) => {
    const row = Math.floor(index / spec.size);
    const column = index % spec.size;
    const id = geometryCellId(row, column);
    return {
      id,
      row,
      column,
      terrain: id === features.landmarkId ? "landmark" : features.obstacleIds.has(id) ? "obstacle" : "ground",
    };
  });
}

function baseConditions(spec: ShapeConstraintSpec): GeometryCondition[] {
  const conditions: GeometryCondition[] = [
    {id: "area", kind: "area-equal", target: spec.targetArea, label: `面积正好 ${spec.targetArea} 格`},
    {id: "connected", kind: "connected", label: "所有建筑连成一个整体"},
    {id: "landmarks", kind: "include-landmarks", label: "覆盖地图上的星标地基"},
  ];
  if (spec.symmetry !== null) {
    conditions.push({
      id: "symmetry",
      kind: "symmetry",
      symmetry: spec.symmetry,
      label: spec.symmetry === "horizontal" ? "建筑上下对称" : spec.symmetry === "vertical" ? "建筑左右对称" : "建筑中心对称",
    });
  }
  if (spec.requireNoHoles) conditions.push({id: "holes", kind: "no-holes", label: "建筑内部不能留下洞口"});
  return conditions;
}

function buildGeometryBoard(
  difficulty: GridArchitectDifficulty,
  seed: number,
  spec: ShapeConstraintSpec,
  features: BoardFeatures,
): GridArchitectPuzzle | null {
  const cells = createCells(spec, features);
  const provisional: GridArchitectPuzzle = {
    id: formatGridArchitectChallengeId(difficulty, seed),
    difficulty,
    seed: seed >>> 0,
    rows: spec.size,
    columns: spec.size,
    cells,
    conditions: baseConditions(spec),
    knowledgeTags: difficulty === "starter"
      ? ["数格子", "连通图形"]
      : difficulty === "easy"
        ? ["面积与周长", "轴对称"]
        : difficulty === "normal"
          ? ["组合图形", "障碍与对称"]
          : ["中心对称", "多条件优化"],
    solution: {selectedCellIds: []},
  };
  const witnessResult = solveGeometryPuzzle(provisional, 1, {maxVisits: 180_000});
  const witness = witnessResult.solutions[0];
  if (witness === undefined) return null;
  const witnessPerimeter = measureGeometrySelection(provisional, witness).perimeter;
  let perimeterCondition: GeometryCondition;
  let solution: GeometrySelection = witness;
  if (spec.perimeterMode === "minimum") {
    const minimum = findMinimumGeometryPerimeter(provisional, 400_000);
    if (minimum === null) return null;
    perimeterCondition = {id: "perimeter", kind: "minimum-perimeter", target: minimum.perimeter, label: `使用最短周长 ${minimum.perimeter}`};
    solution = minimum.solution;
  } else if (spec.perimeterMode === "at-most") {
    perimeterCondition = {id: "perimeter", kind: "perimeter-at-most", target: witnessPerimeter, label: `周长不超过 ${witnessPerimeter}`};
  } else {
    perimeterCondition = {id: "perimeter", kind: "perimeter-equal", target: witnessPerimeter, label: `周长正好 ${witnessPerimeter}`};
  }
  return {...provisional, conditions: [...provisional.conditions, perimeterCondition], solution};
}

function solveGeneratedPuzzle(puzzle: GridArchitectPuzzle): boolean {
  if (!evaluateGeometryPuzzle(puzzle, puzzle.solution).solved) return false;
  return solveGeometryPuzzle(puzzle, 1, {maxVisits: 220_000}).solutions.length >= 1;
}

function createPuzzle(difficulty: GridArchitectDifficulty, seed: number): GridArchitectPuzzle {
  const spec = generateShapeConstraints(difficulty, seed);
  for (let attempt = 0; attempt < 48; attempt += 1) {
    const attemptSeed = (seed ^ Math.imul(attempt + 1, 0x9e37_79b1)) >>> 0;
    const features = selectBoardFeatures(spec, attemptSeed);
    const puzzle = buildGeometryBoard(difficulty, seed, spec, features);
    if (puzzle !== null && solveGeneratedPuzzle(puzzle)) return puzzle;
  }
  throw new Error("Grid architect generation exceeded its bounded retry budget.");
}

export function formatGridArchitectChallengeId(difficulty: GridArchitectDifficulty, seed: number): string {
  return `geo-${DIFFICULTY_CODES[difficulty]}-${(seed >>> 0).toString(36)}`;
}

export function parseGridArchitectChallengeId(value: string): GridArchitectChallengeReference | null {
  const match = /^geo-([senh])-([0-9a-z]+)$/i.exec(value.trim());
  if (match === null) return null;
  const difficulty = CODE_DIFFICULTIES[(match[1] as string).toLowerCase()];
  const seed = Number.parseInt(match[2] as string, 36);
  return difficulty === undefined || !Number.isSafeInteger(seed) || seed < 0 || seed > 0xffff_ffff
    ? null
    : {difficulty, seed};
}

const CACHE = new Map<string, GridArchitectPuzzle>();

export function generateGridArchitect(difficulty: GridArchitectDifficulty, seed: number): GridArchitectPuzzle {
  const normalizedSeed = seed >>> 0;
  const key = `${difficulty}:${normalizedSeed}`;
  const cached = CACHE.get(key);
  if (cached !== undefined) return cached;
  const puzzle = createPuzzle(difficulty, normalizedSeed);
  CACHE.set(key, puzzle);
  return puzzle;
}
