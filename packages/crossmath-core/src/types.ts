export type CrossMathDifficulty = "starter" | "easy" | "normal" | "hard";

export interface Rational {
  readonly numerator: number;
  readonly denominator: number;
}

export type ArithmeticOperator = "add" | "subtract" | "multiply" | "divide";
export type RelationOperator = "equal" | "greater" | "less" | "greater-or-equal" | "less-or-equal";
export type VariableName = "a" | "b" | "c";
export type CrossMathSymbol = "+" | "−" | "×" | "÷" | "=" | ">" | "<" | "≥" | "≤";

export type CrossMathExpression =
  | {readonly kind: "cell"; readonly cellId: string}
  | {readonly kind: "variable"; readonly name: VariableName}
  | {readonly kind: "literal"; readonly value: Rational}
  | {
      readonly kind: "binary";
      readonly operator: ArithmeticOperator;
      readonly left: CrossMathExpression;
      readonly right: CrossMathExpression;
    };

export interface CrossMathRelation {
  readonly id: string;
  readonly left: CrossMathExpression;
  readonly operator: RelationOperator;
  readonly right: CrossMathExpression;
  readonly cellIds: readonly string[];
  readonly variableNames: readonly VariableName[];
  readonly hintLabel: string;
}

export interface CrossMathValueCell {
  readonly id: string;
  readonly row: number;
  readonly column: number;
  readonly kind: "value";
  readonly fixedValue?: Rational;
  readonly relationIds: readonly string[];
  readonly prefix?: string;
  readonly suffix?: string;
}

export interface CrossMathVariableCell {
  readonly id: string;
  readonly row: number;
  readonly column: number;
  readonly kind: "variable";
  readonly variable: VariableName;
  readonly relationIds: readonly string[];
}

export interface CrossMathSymbolCell {
  readonly id: string;
  readonly row: number;
  readonly column: number;
  readonly kind: "symbol";
  readonly symbol: CrossMathSymbol;
  readonly fillable?: boolean;
  readonly relationIds: readonly string[];
}

export interface CrossMathBlockedCell {
  readonly id: string;
  readonly row: number;
  readonly column: number;
  readonly kind: "blocked";
  readonly relationIds: readonly string[];
}

export type CrossMathGridCell = CrossMathValueCell | CrossMathVariableCell | CrossMathSymbolCell | CrossMathBlockedCell;

export interface CrossMathNumberTile {
  readonly id: string;
  readonly kind: "number";
  readonly value: Rational;
}

export interface CrossMathSymbolTile {
  readonly id: string;
  readonly kind: "symbol";
  readonly symbol: CrossMathSymbol;
}

export type CrossMathTile = CrossMathNumberTile | CrossMathSymbolTile;

export interface CrossMathSolution {
  readonly cells: Readonly<Record<string, Rational>>;
  readonly variables: Readonly<Partial<Record<VariableName, Rational>>>;
}

export interface CrossMathPuzzle {
  readonly id: string;
  readonly difficulty: CrossMathDifficulty;
  readonly seed: number;
  readonly rows: number;
  readonly columns: number;
  readonly cells: readonly CrossMathGridCell[];
  readonly relations: readonly CrossMathRelation[];
  readonly tiles: readonly CrossMathTile[];
  readonly variableNames: readonly VariableName[];
  readonly knowledgeTags: readonly string[];
  readonly solution: CrossMathSolution;
}

export interface CrossMathValueState {
  readonly cells: Readonly<Record<string, Rational>>;
  readonly variables: Readonly<Partial<Record<VariableName, Rational>>>;
  readonly symbols: Readonly<Record<string, CrossMathSymbol>>;
}

export interface CrossMathHint {
  readonly destinationId: string;
  readonly value: Rational;
  readonly relationId: string | null;
  readonly explanation: string;
  readonly movesExistingTile?: boolean;
}

export interface CrossMathChallengeReference {
  readonly difficulty: CrossMathDifficulty;
  readonly seed: number;
}
