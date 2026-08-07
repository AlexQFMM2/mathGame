import {evaluateRelation} from "./evaluator.ts";
import type {
  ArithmeticOperator,
  CrossMathExpression,
  CrossMathGridCell,
  CrossMathPuzzle,
  CrossMathRelation,
  CrossMathSymbol,
  CrossMathValueState,
  RelationOperator,
  VariableName,
} from "./types.ts";

const ARITHMETIC_BY_SYMBOL: Readonly<Partial<Record<CrossMathSymbol, ArithmeticOperator>>> = {
  "+": "add",
  "−": "subtract",
  "×": "multiply",
  "÷": "divide",
};

const RELATION_BY_SYMBOL: Readonly<Partial<Record<CrossMathSymbol, RelationOperator>>> = {
  "=": "equal",
  ">": "greater",
  "<": "less",
  "≥": "greater-or-equal",
  "≤": "less-or-equal",
};

export interface ReconstructedCrossMathGrid {
  readonly relations: readonly CrossMathRelation[];
  readonly unresolvedRelationIds: readonly string[];
  readonly invalidRelationIds: readonly string[];
}

function resolvedSymbol(
  cell: Extract<CrossMathGridCell, {readonly kind: "symbol"}>,
  values: CrossMathValueState,
): CrossMathSymbol | null {
  return cell.fillable === true ? values.symbols[cell.id] ?? null : cell.symbol;
}

function cellExpression(cell: CrossMathGridCell): CrossMathExpression | null {
  if (cell.kind === "value") return {kind: "cell", cellId: cell.id};
  if (cell.kind === "variable") return {kind: "variable", name: cell.variable};
  return null;
}

function orderedRouteCells(puzzle: CrossMathPuzzle, relationId: string): readonly CrossMathGridCell[] | null {
  const cells = puzzle.cells.filter((cell) => cell.kind !== "blocked" && cell.relationIds.includes(relationId));
  if (cells.length < 3 || cells.length % 2 === 0) return null;
  const horizontal = cells.every((cell) => cell.row === cells[0]?.row);
  const vertical = cells.every((cell) => cell.column === cells[0]?.column);
  if (!horizontal && !vertical) return null;
  const ordered = [...cells].sort((left, right) => horizontal ? left.column - right.column : left.row - right.row);
  const contiguous = ordered.slice(1).every((cell, index) => {
    const previous = ordered[index];
    return previous !== undefined && (horizontal
      ? cell.column === previous.column + 1
      : cell.row === previous.row + 1);
  });
  return contiguous ? ordered : null;
}

function parseArithmeticSide(
  cells: readonly CrossMathGridCell[],
  symbols: readonly CrossMathSymbol[],
): CrossMathExpression | null {
  if (cells.length === 0 || cells.length % 2 === 0 || symbols.length !== (cells.length - 1) / 2) return null;
  const operands = cells.filter((_, index) => index % 2 === 0).map(cellExpression);
  if (operands.some((operand) => operand === null)) return null;
  const operators = symbols.map((symbol) => ARITHMETIC_BY_SYMBOL[symbol]);
  if (operators.some((operator) => operator === undefined)) return null;
  const binary = (
    operator: ArithmeticOperator,
    left: CrossMathExpression,
    right: CrossMathExpression,
  ): CrossMathExpression => ({kind: "binary", operator, left, right});

  // Standard ×/÷ precedence, then left-associative +/−. Operand order always
  // follows the physical token order; this parser never commutes or reverses.
  const terms: CrossMathExpression[] = [];
  const lowPrecedence: ArithmeticOperator[] = [];
  let current = operands[0] as CrossMathExpression;
  for (let index = 0; index < operators.length; index += 1) {
    const operator = operators[index] as ArithmeticOperator;
    const next = operands[index + 1] as CrossMathExpression;
    if (operator === "multiply" || operator === "divide") {
      current = binary(operator, current, next);
    } else {
      terms.push(current);
      lowPrecedence.push(operator);
      current = next;
    }
  }
  terms.push(current);
  return lowPrecedence.reduce((expression, operator, index) => (
    binary(operator, expression, terms[index + 1] as CrossMathExpression)
  ), terms[0] as CrossMathExpression);
}

function parseRoute(
  puzzle: CrossMathPuzzle,
  values: CrossMathValueState,
  relationId: string,
): CrossMathRelation | "unresolved" | "invalid" {
  const line = orderedRouteCells(puzzle, relationId);
  if (line === null) return "invalid";
  if (line.some((cell, index) => index % 2 === 0 ? cellExpression(cell) === null : cell.kind !== "symbol")) return "invalid";
  const symbolCells = line.filter((cell): cell is Extract<CrossMathGridCell, {readonly kind: "symbol"}> => cell.kind === "symbol");
  const symbols = symbolCells.map((cell) => resolvedSymbol(cell, values));
  if (symbols.some((symbol) => symbol === null)) return "unresolved";
  const resolved = symbols as CrossMathSymbol[];
  const relationSymbolIndices = resolved
    .map((symbol, index) => RELATION_BY_SYMBOL[symbol] === undefined ? -1 : index)
    .filter((index) => index >= 0);
  if (relationSymbolIndices.length !== 1) return "invalid";
  const relationSymbolIndex = relationSymbolIndices[0] as number;
  const relationCellIndex = relationSymbolIndex * 2 + 1;
  const relationOperator = RELATION_BY_SYMBOL[resolved[relationSymbolIndex] as CrossMathSymbol];
  const left = parseArithmeticSide(
    line.slice(0, relationCellIndex),
    resolved.slice(0, relationSymbolIndex),
  );
  const right = parseArithmeticSide(
    line.slice(relationCellIndex + 1),
    resolved.slice(relationSymbolIndex + 1),
  );
  if (relationOperator === undefined || left === null || right === null) return "invalid";

  const metadata = puzzle.relations.find((relation) => relation.id === relationId);
  const valueCells = line.filter((cell) => cell.kind === "value");
  const variableNames = [...new Set(line
    .filter((cell) => cell.kind === "variable")
    .map((cell) => cell.variable))] as VariableName[];
  return {
    id: relationId,
    left,
    operator: relationOperator,
    right,
    cellIds: valueCells.map((cell) => cell.id),
    variableNames,
    hintLabel: metadata?.hintLabel ?? relationId,
  };
}

export function reconstructCrossMathGrid(
  puzzle: CrossMathPuzzle,
  values: CrossMathValueState,
): ReconstructedCrossMathGrid {
  const relationIds = [...new Set([
    ...puzzle.relations.map((relation) => relation.id),
    ...puzzle.cells
      .filter((cell) => cell.kind === "symbol")
      .flatMap((cell) => cell.relationIds),
  ])];
  const relations: CrossMathRelation[] = [];
  const unresolvedRelationIds: string[] = [];
  const invalidRelationIds: string[] = [];
  for (const relationId of relationIds) {
    const parsed = parseRoute(puzzle, values, relationId);
    if (parsed === "unresolved") unresolvedRelationIds.push(relationId);
    else if (parsed === "invalid") invalidRelationIds.push(relationId);
    else relations.push(parsed);
  }
  return {relations, unresolvedRelationIds, invalidRelationIds};
}

export function getInvalidCrossMathGridRelationIds(
  puzzle: CrossMathPuzzle,
  values: CrossMathValueState,
  requireComplete = false,
): readonly string[] {
  const reconstructed = reconstructCrossMathGrid(puzzle, values);
  return [...new Set([
    ...reconstructed.invalidRelationIds,
    ...(requireComplete ? reconstructed.unresolvedRelationIds : []),
    ...reconstructed.relations
      .filter((relation) => {
        const result = evaluateRelation(relation, values);
        return result === false || requireComplete && result !== true;
      })
      .map((relation) => relation.id),
  ])];
}
