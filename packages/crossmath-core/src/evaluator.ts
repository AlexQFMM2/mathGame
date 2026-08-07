import {
  addRational,
  compareRational,
  divideRational,
  multiplyRational,
  subtractRational,
} from "./rational.ts";
import type {
  CrossMathExpression,
  CrossMathRelation,
  CrossMathValueState,
  Rational,
  RelationOperator,
} from "./types.ts";

export function evaluateExpression(
  expression: CrossMathExpression,
  values: CrossMathValueState,
): Rational | null {
  switch (expression.kind) {
    case "cell":
      return values.cells[expression.cellId] ?? null;
    case "variable":
      return values.variables[expression.name] ?? null;
    case "literal":
      return expression.value;
    case "binary": {
      const left = evaluateExpression(expression.left, values);
      const right = evaluateExpression(expression.right, values);
      if (left === null || right === null) return null;
      switch (expression.operator) {
        case "add": return addRational(left, right);
        case "subtract": return subtractRational(left, right);
        case "multiply": return multiplyRational(left, right);
        case "divide": return divideRational(left, right);
      }
    }
  }
}

export function compareByOperator(
  left: Rational,
  operator: RelationOperator,
  right: Rational,
): boolean {
  const comparison = compareRational(left, right);
  switch (operator) {
    case "equal": return comparison === 0;
    case "greater": return comparison > 0;
    case "less": return comparison < 0;
    case "greater-or-equal": return comparison >= 0;
    case "less-or-equal": return comparison <= 0;
  }
}

export function evaluateRelation(
  relation: CrossMathRelation,
  values: CrossMathValueState,
): boolean | null {
  const left = evaluateExpression(relation.left, values);
  const right = evaluateExpression(relation.right, values);
  return left === null || right === null ? null : compareByOperator(left, relation.operator, right);
}
