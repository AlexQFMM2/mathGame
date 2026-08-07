import {evaluateRelation} from "./evaluator.ts";
import {formatRational, rationalKey} from "./rational.ts";
import {
  getDestinationValue,
  getPuzzleDestinationIds,
  setDestinationValue,
} from "./solver.ts";
import type {CrossMathHint, CrossMathPuzzle, CrossMathValueState, Rational, VariableName} from "./types.ts";

function relationIncludesDestination(
  puzzle: CrossMathPuzzle,
  relationId: string,
  destinationId: string,
): boolean {
  const relation = puzzle.relations.find((item) => item.id === relationId);
  if (relation === undefined) return false;
  return destinationId.startsWith("var:")
    ? relation.variableNames.includes(destinationId.slice(4) as VariableName)
    : relation.cellIds.includes(destinationId);
}

export function findCrossMathHint(
  puzzle: CrossMathPuzzle,
  values: CrossMathValueState,
  availableValues: readonly Rational[],
): CrossMathHint | null {
  const destinations = getPuzzleDestinationIds(puzzle)
    .filter((destinationId) => destinationId.startsWith("var:") || puzzle.solution.cells[destinationId] !== undefined)
    .filter((destinationId) => getDestinationValue(values, destinationId) === null);
  for (const destinationId of destinations) {
    const candidates = new Map<string, Rational>();
    for (const value of availableValues) {
      const next = setDestinationValue(values, destinationId, value);
      const related = puzzle.relations.filter((relation) => relationIncludesDestination(puzzle, relation.id, destinationId));
      if (related.every((relation) => evaluateRelation(relation, next) !== false)) {
        candidates.set(rationalKey(value), value);
      }
    }
    if (candidates.size === 1) {
      const value = [...candidates.values()][0] as Rational;
      const relation = puzzle.relations.find((item) => relationIncludesDestination(puzzle, item.id, destinationId)) ?? null;
      return {
        destinationId,
        value,
        relationId: relation?.id ?? null,
        explanation: relation === null
          ? `这里可以确定为 ${formatRational(value)}。`
          : `观察“${relation.hintLabel}”，这里只能放 ${formatRational(value)}。`,
      };
    }
  }
  const destinationId = destinations[0];
  if (destinationId === undefined) return null;
  const value = destinationId.startsWith("var:")
    ? puzzle.solution.variables[destinationId.slice(4) as VariableName]
    : puzzle.solution.cells[destinationId];
  return value === undefined ? null : {
    destinationId,
    value,
    relationId: null,
    explanation: `这一步需要综合多条关系，可以先确定 ${destinationId.startsWith("var:") ? destinationId.slice(4) : "这个空格"} = ${formatRational(value)}。`,
  };
}
