export type GridArchitectDifficulty = "starter" | "easy" | "normal" | "hard";

export type GeometryTerrain = "ground" | "obstacle" | "landmark";

export interface GeometryCell {
  readonly id: string;
  readonly row: number;
  readonly column: number;
  readonly terrain: GeometryTerrain;
}

export type SymmetryKind = "horizontal" | "vertical" | "central";

interface GeometryConditionBase {
  readonly id: string;
  readonly label: string;
}

export type GeometryCondition =
  | GeometryConditionBase & {readonly kind: "area-equal"; readonly target: number}
  | GeometryConditionBase & {readonly kind: "perimeter-equal"; readonly target: number}
  | GeometryConditionBase & {readonly kind: "perimeter-at-most"; readonly target: number}
  | GeometryConditionBase & {readonly kind: "minimum-perimeter"; readonly target: number}
  | GeometryConditionBase & {readonly kind: "connected"}
  | GeometryConditionBase & {readonly kind: "no-holes"}
  | GeometryConditionBase & {readonly kind: "include-landmarks"}
  | GeometryConditionBase & {readonly kind: "symmetry"; readonly symmetry: SymmetryKind};

export interface GeometrySelection {
  readonly selectedCellIds: readonly string[];
}

export interface GeometryMetrics {
  readonly area: number;
  readonly perimeter: number;
  readonly connected: boolean;
  readonly holes: number;
}

export interface GeometryConditionResult {
  readonly conditionId: string;
  readonly satisfied: boolean;
  readonly actual: string | number;
  readonly target: string | number;
  readonly conflictCellIds: readonly string[];
}

export interface GeometryEvaluation {
  readonly solved: boolean;
  readonly metrics: GeometryMetrics;
  readonly conditionResults: readonly GeometryConditionResult[];
}

export interface GridArchitectPuzzle {
  readonly id: string;
  readonly difficulty: GridArchitectDifficulty;
  readonly seed: number;
  readonly rows: number;
  readonly columns: number;
  readonly cells: readonly GeometryCell[];
  readonly conditions: readonly GeometryCondition[];
  readonly knowledgeTags: readonly string[];
  readonly solution: GeometrySelection;
}

export interface GridArchitectChallengeReference {
  readonly difficulty: GridArchitectDifficulty;
  readonly seed: number;
}

export interface GeometrySolveResult {
  readonly solutions: readonly GeometrySelection[];
  readonly visits: number;
  readonly exhausted: boolean;
}

export interface GeometryHint {
  readonly action: "build" | "remove";
  readonly cellId: string;
  readonly message: string;
  readonly reason: string;
}
