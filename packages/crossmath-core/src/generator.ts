import {isCrossMathSolved} from "./solver.ts";
import {evaluateExpression, evaluateRelation} from "./evaluator.ts";
import {reconstructCrossMathGrid} from "./gridRelations.ts";
import {generateConstraintMap} from "./constraintMap.ts";
import {compareRational, rational} from "./rational.ts";
import type {
  ArithmeticOperator,
  CrossMathChallengeReference,
  CrossMathDifficulty,
  CrossMathExpression,
  CrossMathGridCell,
  CrossMathPuzzle,
  CrossMathRelation,
  CrossMathSymbol,
  CrossMathSymbolCell,
  Rational,
  RelationOperator,
  VariableName,
} from "./types.ts";

const DIFFICULTY_CODES: Readonly<Record<CrossMathDifficulty, string>> = {
  starter: "s",
  easy: "e",
  normal: "n",
  hard: "h",
};

const CODE_DIFFICULTIES: Readonly<Record<string, CrossMathDifficulty>> = {
  s: "starter",
  e: "easy",
  n: "normal",
  h: "hard",
};

const ARITHMETIC_SYMBOLS: Readonly<Record<ArithmeticOperator, CrossMathSymbolCell["symbol"]>> = {
  add: "+",
  subtract: "−",
  multiply: "×",
  divide: "÷",
};

const RELATION_SYMBOLS: Readonly<Record<RelationOperator, CrossMathSymbolCell["symbol"]>> = {
  equal: "=",
  greater: ">",
  less: "<",
  "greater-or-equal": "≥",
  "less-or-equal": "≤",
};

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

function ref(cellId: string): CrossMathExpression {
  return {kind: "cell", cellId};
}

function variable(name: VariableName): CrossMathExpression {
  return {kind: "variable", name};
}

function binary(
  operator: ArithmeticOperator,
  left: CrossMathExpression,
  right: CrossMathExpression,
): CrossMathExpression {
  return {kind: "binary", operator, left, right};
}

function withHiddenCells(base: CrossMathPuzzle, target: number, seed: number): CrossMathPuzzle {
  const candidates = shuffle(
    base.cells.filter((cell) => cell.kind === "value").map((cell) => cell.id),
    seed ^ 0xa511_e9b3,
  );
  return materializeHidden(base, new Set(candidates.slice(0, target)), seed);
}

function materializeHidden(base: CrossMathPuzzle, hidden: ReadonlySet<string>, seed: number): CrossMathPuzzle {
  const tiles = shuffle([...base.tiles, ...[...hidden].map((cellId) => ({
    id: `tile-cell-${cellId}`,
    kind: "number" as const,
    value: base.solution.cells[cellId] as Rational,
  }))], seed ^ 0x63d8_3595);
  return {
    ...base,
    cells: base.cells.map((cell) => cell.kind === "value" && hidden.has(cell.id)
      ? {...cell, fixedValue: undefined}
      : cell),
    tiles,
  };
}

function replaceCellWithVariable(
  expression: CrossMathExpression,
  cellId: string,
  name: VariableName,
): CrossMathExpression {
  if (expression.kind === "cell") return expression.cellId === cellId ? variable(name) : expression;
  if (expression.kind !== "binary") return expression;
  return {
    ...expression,
    left: replaceCellWithVariable(expression.left, cellId, name),
    right: replaceCellWithVariable(expression.right, cellId, name),
  };
}

function withVariables(
  base: CrossMathPuzzle,
  assignments: Readonly<Record<string, VariableName>>,
): CrossMathPuzzle {
  const solutionCells = {...base.solution.cells};
  const variables: Partial<Record<VariableName, Rational>> = {};
  for (const [cellId, name] of Object.entries(assignments)) {
    const value = solutionCells[cellId];
    if (value === undefined) throw new Error(`Missing variable source ${cellId}.`);
    variables[name] = value;
    delete solutionCells[cellId];
  }
  const variableNames = [...new Set(Object.values(assignments))];
  return {
    ...base,
    cells: base.cells.map((cell) => {
      const name = assignments[cell.id];
      return name === undefined || cell.kind !== "value"
        ? cell
        : {id: cell.id, row: cell.row, column: cell.column, kind: "variable" as const, variable: name, relationIds: cell.relationIds};
    }),
    relations: base.relations.map((relation) => {
      let left = relation.left;
      let right = relation.right;
      const variableNames = [...relation.variableNames];
      let cellIds = [...relation.cellIds];
      for (const [cellId, name] of Object.entries(assignments)) {
        left = replaceCellWithVariable(left, cellId, name);
        right = replaceCellWithVariable(right, cellId, name);
        if (cellIds.includes(cellId)) {
          cellIds = cellIds.filter((id) => id !== cellId);
          if (!variableNames.includes(name)) variableNames.push(name);
        }
      }
      return {...relation, left, right, cellIds, variableNames};
    }),
    tiles: variableNames.map((name) => {
      const source = Object.entries(assignments).find(([, candidate]) => candidate === name)?.[0];
      if (source === undefined) throw new Error(`Missing source for variable ${name}.`);
      return {id: `tile-var-${name}`, kind: "number" as const, value: base.solution.cells[source] as Rational};
    }),
    variableNames,
    solution: {cells: solutionCells, variables},
  };
}

function withHiddenSymbols(base: CrossMathPuzzle, target: number, seed: number): CrossMathPuzzle {
  const candidates = shuffle(
    base.cells.filter((cell): cell is CrossMathSymbolCell => cell.kind === "symbol").map((cell) => cell.id),
    seed ^ 0xc42b_7a19,
  );
  const hiddenIds = new Set<string>();
  for (const symbol of ["+", "−", "×", "÷", ">", "<", "≥", "≤", "="] as const) {
    const candidateId = candidates.find((id) => {
      const cell = base.cells.find((item) => item.id === id);
      return cell?.kind === "symbol" && cell.symbol === symbol;
    });
    if (candidateId !== undefined && hiddenIds.size < target) hiddenIds.add(candidateId);
  }
  for (const candidateId of candidates) {
    if (hiddenIds.size >= target) break;
    hiddenIds.add(candidateId);
  }
  const symbolTiles = base.cells
    .filter((cell): cell is CrossMathSymbolCell => cell.kind === "symbol" && hiddenIds.has(cell.id))
    .map((cell) => ({
      id: `tile-${cell.id}`,
      kind: "symbol" as const,
      symbol: cell.symbol as CrossMathSymbol,
    }));
  return {
    ...base,
    cells: base.cells.map((cell) => cell.kind === "symbol" && hiddenIds.has(cell.id)
      ? {...cell, fillable: true}
      : cell),
    tiles: shuffle([...base.tiles, ...symbolTiles], seed ^ 0x91d4_5b27),
  };
}

interface TributaryPoint {
  readonly row: number;
  readonly column: number;
}

interface TributaryRoute {
  readonly start: TributaryPoint;
  readonly middle: TributaryPoint;
  readonly end: TributaryPoint;
}

const TRIBUTARY_DIRECTIONS: readonly TributaryPoint[] = [
  {row: -1, column: 0},
  {row: 1, column: 0},
  {row: 0, column: -1},
  {row: 0, column: 1},
];

function tributaryPointKey(point: TributaryPoint): string {
  return `${point.row}:${point.column}`;
}

function tributaryCellId(point: TributaryPoint): string {
  return `node-${point.row}-${point.column}`;
}

function tributaryEdgeKey(left: TributaryPoint, right: TributaryPoint): string {
  return [tributaryPointKey(left), tributaryPointKey(right)].sort().join("|");
}

function tributaryAxisKey(point: TributaryPoint, route: TributaryRoute): string {
  const axis = route.start.row === route.end.row ? "horizontal" : "vertical";
  return `${tributaryPointKey(point)}:${axis}`;
}

function tributaryPath(
  start: TributaryPoint,
  direction: TributaryPoint,
): TributaryRoute | null {
  const middle = {row: start.row + direction.row, column: start.column + direction.column};
  const end = {row: start.row + direction.row * 2, column: start.column + direction.column * 2};
  const inside = [middle, end].every((point) => (
    point.row >= 0 && point.row < 7 && point.column >= 0 && point.column < 7
  ));
  return inside ? {start, middle, end} : null;
}

function orientForReading(route: TributaryRoute): TributaryRoute {
  const alreadyForward = route.start.row === route.end.row
    ? route.start.column < route.end.column
    : route.start.row < route.end.row;
  return alreadyForward ? route : {start: route.end, middle: route.middle, end: route.start};
}

function generateTributaryRoutes(
  seed: number,
  targetRoutes: number,
  minimumMerges: number,
): readonly TributaryRoute[] {
  const allPoints = Array.from({length: 7 * 7}, (_, index) => ({
    row: Math.floor(index / 7),
    column: index % 7,
  }));
  const allStraightRoutes: TributaryRoute[] = [];
  for (let row = 0; row < 7; row += 1) {
    for (let column = 0; column < 7; column += 1) {
      for (const direction of [{row: 0, column: 1}, {row: 1, column: 0}]) {
        const route = tributaryPath({row, column}, direction);
        if (route !== null) allStraightRoutes.push(route);
      }
    }
  }

  class PointSets {
    readonly parents = new Map<string, string>();

    find(key: string): string {
      const parent = this.parents.get(key);
      if (parent === undefined) {
        this.parents.set(key, key);
        return key;
      }
      if (parent === key) return key;
      const root = this.find(parent);
      this.parents.set(key, root);
      return root;
    }

    union(left: string, right: string): void {
      const leftRoot = this.find(left);
      const rightRoot = this.find(right);
      if (leftRoot !== rightRoot) this.parents.set(rightRoot, leftRoot);
    }
  }

  for (let scatterAttempt = 0; scatterAttempt < 160; scatterAttempt += 1) {
    const attemptSeed = (seed ^ Math.imul(scatterAttempt + 1, 0x9e37_79b1)) >>> 0;
    const anchorTarget = Math.min(49, targetRoutes + 12 + scatterAttempt % 5);
    const anchors = new Set(shuffle(allPoints, attemptSeed ^ 0x4f1b_3c27)
      .slice(0, anchorTarget)
      .map(tributaryPointKey));
    // A five-cell relation needs two logical steps. Longer straight links are
    // deliberately sealed; their intermediate relation would be ambiguous.
    const candidates = allStraightRoutes.filter((route) => (
      anchors.has(tributaryPointKey(route.start))
      && anchors.has(tributaryPointKey(route.end))
    ));
    if (candidates.length < targetRoutes) continue;

    const pointSets = new PointSets();
    for (const route of candidates) {
      const keys = [route.start, route.middle, route.end].map(tributaryPointKey);
      pointSets.union(keys[0] as string, keys[1] as string);
      pointSets.union(keys[1] as string, keys[2] as string);
    }
    const componentRoutes = new Map<string, TributaryRoute[]>();
    for (const route of candidates) {
      const root = pointSets.find(tributaryPointKey(route.start));
      componentRoutes.set(root, [...(componentRoutes.get(root) ?? []), route]);
    }
    const viableComponents = [...componentRoutes.values()].filter((routes) => routes.length >= targetRoutes);
    if (viableComponents.length === 0) continue;

    for (const component of shuffle(viableComponents, attemptSeed ^ 0xb529_7a4d)) {
      for (const firstRoute of shuffle(component, attemptSeed ^ 0x68e3_1da4)) {
        const routes: TributaryRoute[] = [];
        const usedNodes = new Set<string>();
        const usedAxes = new Set<string>();
        let merges = 0;
        const addRoute = (route: TributaryRoute) => {
          const shared = [route.start, route.middle, route.end]
            .filter((point) => usedNodes.has(tributaryPointKey(point))).length;
          routes.push(route);
          if (shared >= 2) merges += 1;
          for (const point of [route.start, route.middle, route.end]) {
            usedNodes.add(tributaryPointKey(point));
            usedAxes.add(tributaryAxisKey(point, route));
          }
        };
        addRoute(firstRoute);

        while (routes.length < targetRoutes) {
          const available = component.filter((candidate) => (
            !routes.includes(candidate)
            && [candidate.start, candidate.middle, candidate.end]
              .some((point) => usedNodes.has(tributaryPointKey(point)))
            && [candidate.start, candidate.middle, candidate.end]
              .every((point) => !usedAxes.has(tributaryAxisKey(point, candidate)))
          ));
          if (available.length === 0) break;
          const ranked = shuffle(available, attemptSeed ^ Math.imul(routes.length + 1, 0x85eb_ca6b))
            .sort((left, right) => {
              const sharedCount = (route: TributaryRoute) => [route.start, route.middle, route.end]
                .filter((point) => usedNodes.has(tributaryPointKey(point))).length;
              return sharedCount(right) - sharedCount(left);
            });
          const route = merges < minimumMerges
            ? ranked.find((candidate) => [candidate.start, candidate.middle, candidate.end]
                .filter((point) => usedNodes.has(tributaryPointKey(point))).length >= 2) ?? ranked[0]
            : ranked[0];
          if (route === undefined) break;
          addRoute(route);
        }
        if (routes.length === targetRoutes && merges >= minimumMerges) return routes;
      }
    }
  }
  throw new Error("Point-cloud links could not produce one connected tributary network within the scatter budget.");
}

function midpoint(left: TributaryPoint, right: TributaryPoint): TributaryPoint {
  return {row: left.row + right.row, column: left.column + right.column};
}

function relationForComparison(comparison: -1 | 0 | 1, index: number): RelationOperator {
  if (comparison === 0) return "equal";
  if (comparison > 0) return index % 2 === 0 ? "greater" : "greater-or-equal";
  return index % 2 === 0 ? "less" : "less-or-equal";
}

interface TributaryDifficultyConfig {
  readonly routeCount: number;
  readonly minimumMerges: number;
  readonly hiddenNumbers: number;
  readonly hiddenSymbols: number;
  readonly elementaryLimit: number;
  readonly elementaryDenominator: number;
}

const TRIBUTARY_DIFFICULTIES: Readonly<Record<CrossMathDifficulty, TributaryDifficultyConfig>> = {
  starter: {routeCount: 9, minimumMerges: 1, hiddenNumbers: 7, hiddenSymbols: 2, elementaryLimit: 20, elementaryDenominator: 1},
  easy: {routeCount: 12, minimumMerges: 2, hiddenNumbers: 10, hiddenSymbols: 3, elementaryLimit: 100, elementaryDenominator: 1},
  normal: {routeCount: 14, minimumMerges: 2, hiddenNumbers: 12, hiddenSymbols: 4, elementaryLimit: 20, elementaryDenominator: 10},
  hard: {routeCount: 16, minimumMerges: 3, hiddenNumbers: 12, hiddenSymbols: 6, elementaryLimit: 100, elementaryDenominator: 1},
};

function applyArithmetic(operator: ArithmeticOperator, left: Rational, right: Rational): Rational | null {
  return evaluateExpression(binary(
    operator,
    {kind: "literal", value: left},
    {kind: "literal", value: right},
  ), {cells: {}, variables: {}, symbols: {}});
}

function validateCompletedTributaryMap(puzzle: CrossMathPuzzle): void {
  const values = {cells: puzzle.solution.cells, variables: puzzle.solution.variables, symbols: {}};
  const reconstructed = reconstructCrossMathGrid(puzzle, values);
  if (reconstructed.unresolvedRelationIds.length > 0 || reconstructed.invalidRelationIds.length > 0) {
    throw new Error("The completed map cannot be reconstructed from its visible relation symbols.");
  }
  if (reconstructed.relations.length !== puzzle.relations.length) {
    throw new Error("The completed map does not reconstruct every generated tributary.");
  }
  for (const relation of reconstructed.relations) {
    if (evaluateRelation(relation, values) !== true) {
      throw new Error(`${relation.id} is false when read from its visible relation symbol.`);
    }
    const generated = puzzle.relations.find((candidate) => candidate.id === relation.id);
    if (
      generated === undefined
      || JSON.stringify([generated.left, generated.operator, generated.right])
        !== JSON.stringify([relation.left, relation.operator, relation.right])
    ) {
      throw new Error(`${relation.id} changed meaning between generation and visible-grid reconstruction.`);
    }
  }
}

interface TributaryValueCandidate {
  readonly left: number;
  readonly middle: number;
  readonly right: number;
  readonly operator: "add" | "subtract";
}

function collapseTributaryValues(
  routes: readonly TributaryRoute[],
  expressionFirstByRoute: readonly boolean[],
  seed: number,
  limit: number,
  denominator: number,
): {readonly values: Readonly<Record<string, Rational>>; readonly operators: readonly ArithmeticOperator[]} | null {
  const random = xorshift(seed ^ 0xe231_774b);
  const orientedRoutes = routes.map(orientForReading);
  const maximumUnits = limit * denominator;
  const operandUnits = Math.min(9 * denominator, maximumUnits);
  const firstPoint = routes[0]?.start;
  if (firstPoint === undefined) return null;
  const initialValues: Record<string, number> = {
    [tributaryCellId(firstPoint)]: 2 + random() % 4,
  };

  const candidatesFor = (
    route: TributaryRoute,
    expressionFirst: boolean,
    values: Readonly<Record<string, number>>,
  ): TributaryValueCandidate[] => {
    const leftKnown = values[tributaryCellId(route.start)];
    const middleKnown = values[tributaryCellId(route.middle)];
    const rightKnown = values[tributaryCellId(route.end)];
    const leftDomain = leftKnown === undefined ? Array.from({length: maximumUnits + 1}, (_, value) => value) : [leftKnown];
    const middleDomain = middleKnown === undefined
      ? Array.from({length: expressionFirst ? operandUnits + 1 : maximumUnits + 1}, (_, value) => value)
      : [middleKnown];
    const rightDomain = rightKnown === undefined
      ? Array.from({length: operandUnits + 1}, (_, value) => value)
      : [rightKnown];
    const candidates: TributaryValueCandidate[] = [];
    if (expressionFirst) {
      for (const left of leftDomain) {
        for (const middle of middleDomain) {
          const addResult = left + middle;
          if (addResult <= maximumUnits && (rightKnown === undefined || rightKnown === addResult)) {
            candidates.push({left, middle, right: addResult, operator: "add"});
          }
          const subtractResult = left - middle;
          if (subtractResult >= 0 && (rightKnown === undefined || rightKnown === subtractResult)) {
            candidates.push({left, middle, right: subtractResult, operator: "subtract"});
          }
        }
      }
    } else {
      for (const middle of middleDomain) {
        for (const right of rightDomain) {
          const addResult = middle + right;
          if (addResult <= maximumUnits && (leftKnown === undefined || leftKnown === addResult)) {
            candidates.push({left: addResult, middle, right, operator: "add"});
          }
          const subtractResult = middle - right;
          if (subtractResult >= 0 && (leftKnown === undefined || leftKnown === subtractResult)) {
            candidates.push({left: subtractResult, middle, right, operator: "subtract"});
          }
        }
      }
    }
    const nonTrivial = candidates.filter((candidate) => (
      expressionFirst ? candidate.middle !== 0 : candidate.right !== 0
    ));
    const trivial = candidates.filter((candidate) => (
      expressionFirst ? candidate.middle === 0 : candidate.right === 0
    ));
    return [...shuffle(nonTrivial, random()), ...shuffle(trivial, random())];
  };

  let visits = 0;
  const visit = (
    values: Readonly<Record<string, number>>,
    operators: readonly (ArithmeticOperator | null)[],
  ): {readonly values: Readonly<Record<string, number>>; readonly operators: readonly ArithmeticOperator[]} | null => {
    visits += 1;
    if (visits > 20_000) return null;
    if (operators.every((operator) => operator !== null)) {
      return {values, operators: operators as readonly ArithmeticOperator[]};
    }

    const unresolved = orientedRoutes
      .map((route, index) => ({route, index}))
      .filter(({index}) => operators[index] === null);
    const mostAssigned = Math.max(...unresolved.map(({route}) => (
      [route.start, route.middle, route.end]
        .filter((point) => values[tributaryCellId(point)] !== undefined)
        .length
    )));
    let selected: {readonly route: TributaryRoute; readonly index: number; readonly candidates: readonly TributaryValueCandidate[]} | null = null;
    for (const item of unresolved) {
      const assigned = [item.route.start, item.route.middle, item.route.end]
        .filter((point) => values[tributaryCellId(point)] !== undefined)
        .length;
      if (assigned !== mostAssigned) continue;
      const candidates = candidatesFor(item.route, expressionFirstByRoute[item.index] ?? true, values);
      if (candidates.length === 0) return null;
      if (selected === null || candidates.length < selected.candidates.length) {
        selected = {...item, candidates};
      }
    }
    if (selected === null) return null;

    for (const candidate of selected.candidates) {
      const nextValues = {
        ...values,
        [tributaryCellId(selected.route.start)]: candidate.left,
        [tributaryCellId(selected.route.middle)]: candidate.middle,
        [tributaryCellId(selected.route.end)]: candidate.right,
      };
      const nextOperators = [...operators];
      nextOperators[selected.index] = candidate.operator;
      const result = visit(nextValues, nextOperators);
      if (result !== null) return result;
    }
    return null;
  };

  const collapsed = visit(initialValues, Array.from({length: routes.length}, () => null));
  if (collapsed === null) return null;
  return {
    values: Object.fromEntries(Object.entries(collapsed.values).map(([id, value]) => [id, rational(value, denominator)])),
    operators: collapsed.operators,
  };
}

function populateTributaryMap(
  difficulty: CrossMathDifficulty,
  seed: number,
  layoutSeed: number,
  routes: readonly TributaryRoute[],
): CrossMathPuzzle {
  const config = TRIBUTARY_DIFFICULTIES[difficulty];
  const nodes = new Map<string, TributaryPoint>();
  for (const route of routes) {
    nodes.set(tributaryPointKey(route.start), route.start);
    nodes.set(tributaryPointKey(route.middle), route.middle);
    nodes.set(tributaryPointKey(route.end), route.end);
  }
  const orderedNodes = shuffle([...nodes.values()], layoutSeed ^ 0xd271_39a5);
  const expressionFirstByRoute = shuffle(
    routes.map((_, index) => index % 2 === 0),
    layoutSeed ^ 0x51b7_a82d,
  );
  const elementary = collapseTributaryValues(
    routes,
    expressionFirstByRoute,
    layoutSeed,
    config.elementaryLimit,
    config.elementaryDenominator,
  );
  if (elementary === null) {
    throw new Error("Elementary tributary values could not satisfy every merged route.");
  }
  const solutionCells: Record<string, Rational> = {...elementary.values};

  const degree = new Map<string, number>();
  for (const route of routes) {
    for (const point of [route.start, route.middle, route.end]) {
      const key = tributaryPointKey(point);
      degree.set(key, (degree.get(key) ?? 0) + 1);
    }
  }
  const forcedNormalFractionOperators = new Map<number, ArithmeticOperator>();
  if (difficulty === "normal") {
    const maximumSharedValue = rational(config.elementaryLimit * 3 - 2, 3);
    const fractionCandidates = routes.map((generatedRoute, index) => {
      const route = orientForReading(generatedRoute);
      const points = [route.start, route.middle, route.end];
      const exclusiveIndices = points
        .map((point, pointIndex) => ({point, pointIndex}))
        .filter(({point}) => degree.get(tributaryPointKey(point)) === 1)
        .map(({pointIndex}) => pointIndex);
      const sharedIndex = [0, 1, 2].find((pointIndex) => !exclusiveIndices.includes(pointIndex));
      const sharedValue = sharedIndex === undefined ? undefined : solutionCells[tributaryCellId(points[sharedIndex] as TributaryPoint)];
      return exclusiveIndices.length === 2
        && sharedIndex !== undefined
        && sharedValue !== undefined
        && compareRational(sharedValue, maximumSharedValue) <= 0
        ? {route, index, sharedIndex, sharedValue, expressionFirst: expressionFirstByRoute[index] ?? true}
        : null;
    }).filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null);
    const selected = shuffle(fractionCandidates, layoutSeed ^ 0x782f_a04b).slice(0, 2);
    if (selected.length < 2) throw new Error("Normal map could not isolate two fraction tributaries.");
    selected.forEach((candidate, fractionIndex) => {
      const fraction = rational(fractionIndex + 1, 3);
      const sum = applyArithmetic("add", candidate.sharedValue, fraction);
      if (sum === null) throw new Error("Normal fraction tributary could not be populated.");
      const ids = [candidate.route.start, candidate.route.middle, candidate.route.end].map(tributaryCellId);
      if (candidate.expressionFirst) {
        if (candidate.sharedIndex === 0) {
          solutionCells[ids[1] as string] = fraction;
          solutionCells[ids[2] as string] = sum;
          forcedNormalFractionOperators.set(candidate.index, "add");
        } else if (candidate.sharedIndex === 1) {
          solutionCells[ids[0] as string] = sum;
          solutionCells[ids[2] as string] = fraction;
          forcedNormalFractionOperators.set(candidate.index, "subtract");
        } else {
          solutionCells[ids[0] as string] = sum;
          solutionCells[ids[1] as string] = fraction;
          forcedNormalFractionOperators.set(candidate.index, "subtract");
        }
      } else if (candidate.sharedIndex === 0) {
        solutionCells[ids[1] as string] = sum;
        solutionCells[ids[2] as string] = fraction;
        forcedNormalFractionOperators.set(candidate.index, "subtract");
      } else if (candidate.sharedIndex === 1) {
        solutionCells[ids[0] as string] = sum;
        solutionCells[ids[2] as string] = fraction;
        forcedNormalFractionOperators.set(candidate.index, "add");
      } else {
        solutionCells[ids[0] as string] = sum;
        solutionCells[ids[1] as string] = fraction;
        forcedNormalFractionOperators.set(candidate.index, "add");
      }
    });
  }
  const variableAssignments: Record<string, VariableName> = {};
  if (difficulty === "hard") {
    const groups = new Map<string, TributaryPoint[]>();
    for (const point of orderedNodes.filter((candidate) => (degree.get(tributaryPointKey(candidate)) ?? 0) >= 2)) {
      const value = solutionCells[tributaryCellId(point)] as Rational;
      const key = `${value.numerator}/${value.denominator}`;
      groups.set(key, [...(groups.get(key) ?? []), point]);
    }
    const variablePairs = shuffle(
      [...groups.values()].filter((points) => points.length >= 2),
      layoutSeed ^ 0xa64c_91f3,
    ).slice(0, 3);
    if (variablePairs.length < 3) throw new Error("Tributary network does not have three natural shared-value pairs.");
    const names = ["a", "b", "c"] as const;
    for (let index = 0; index < names.length; index += 1) {
      const points = variablePairs[index] as TributaryPoint[];
      const first = points[0] as TributaryPoint;
      const second = points[1] as TributaryPoint;
      variableAssignments[tributaryCellId(first)] = names[index] as VariableName;
      variableAssignments[tributaryCellId(second)] = names[index] as VariableName;
    }
  }

  const operators = shuffle<ArithmeticOperator>(["add", "subtract", "multiply", "divide"], layoutSeed ^ 0x39f2_c04d);
  const relations: CrossMathRelation[] = [];
  const symbolCells: CrossMathGridCell[] = [];
  routes.forEach((generatedRoute, index) => {
    const route = orientForReading(generatedRoute);
    const expressionFirst = expressionFirstByRoute[index] ?? true;
    const id = `tributary-${index}`;
    const startId = tributaryCellId(route.start);
    const middleId = tributaryCellId(route.middle);
    const endId = tributaryCellId(route.end);
    const routeCellIds = [startId, middleId, endId];
    const touchesVariable = routeCellIds.some((cellId) => variableAssignments[cellId] !== undefined);
    const keepEquality = forcedNormalFractionOperators.has(index)
      || difficulty === "starter"
      || difficulty === "easy" && index % 3 !== 0
      || difficulty === "normal" && index % 2 === 0
      || difficulty === "hard" && (touchesVariable || index % 3 === 0);
    const equalityOperator = forcedNormalFractionOperators.get(index) ?? elementary.operators[index];
    if (keepEquality && equalityOperator === undefined) throw new Error("A collapsed route is missing its operator.");
    let operator = keepEquality
      ? equalityOperator as ArithmeticOperator
      : operators[index % operators.length] as ArithmeticOperator;
    const arithmeticRightId = expressionFirst ? middleId : endId;
    if (operator === "divide" && (solutionCells[arithmeticRightId] as Rational).numerator === 0) operator = "add";
    const left = expressionFirst ? binary(operator, ref(startId), ref(middleId)) : ref(startId);
    const right = expressionFirst ? ref(endId) : binary(operator, ref(middleId), ref(endId));
    const leftValue = evaluateExpression(left, {cells: solutionCells, variables: {}, symbols: {}});
    const rightValue = evaluateExpression(right, {cells: solutionCells, variables: {}, symbols: {}});
    if (leftValue === null || rightValue === null) throw new Error("Generated tributary expression is invalid.");
    const relationOperator = keepEquality
      ? "equal"
      : relationForComparison(compareRational(leftValue, rightValue), index);
    relations.push({
      id,
      left,
      operator: relationOperator,
      right,
      cellIds: [startId, middleId, endId],
      variableNames: [],
      hintLabel: `第 ${index + 1} 条${route.start.row === route.end.row ? "横向" : "纵向"}支流`,
    });
    const firstPosition = midpoint(route.start, route.middle);
    const secondPosition = midpoint(route.middle, route.end);
    const arithmeticPosition = expressionFirst ? firstPosition : secondPosition;
    const relationPosition = expressionFirst ? secondPosition : firstPosition;
    symbolCells.push({
      id: `${id}-arithmetic`,
      row: arithmeticPosition.row,
      column: arithmeticPosition.column,
      kind: "symbol",
      symbol: ARITHMETIC_SYMBOLS[operator],
      relationIds: [id],
    }, {
      id: `${id}-relation`,
      row: relationPosition.row,
      column: relationPosition.column,
      kind: "symbol",
      symbol: RELATION_SYMBOLS[relationOperator],
      relationIds: [id],
    });
  });

  const valueCells: CrossMathGridCell[] = orderedNodes.map((point) => {
    const id = tributaryCellId(point);
    return {
      id,
      row: point.row * 2,
      column: point.column * 2,
      kind: "value",
      fixedValue: solutionCells[id] as Rational,
      relationIds: relations.filter((relation) => relation.cellIds.includes(id)).map((relation) => relation.id),
    };
  });
  const base: CrossMathPuzzle = {
    id: formatCrossMathChallengeId(difficulty, seed),
    difficulty,
    seed: seed >>> 0,
    rows: 13,
    columns: 13,
    cells: [...valueCells, ...symbolCells],
    relations,
    tiles: [],
    variableNames: [],
    knowledgeTags: difficulty === "starter"
      ? ["20 以内加减", "支流路径"]
      : difficulty === "easy"
        ? ["百以内四则", "大小关系", "支流路径"]
        : difficulty === "normal"
          ? ["分数与小数", "四则混合", "支流路径"]
          : ["共享未知数", "支流路径", "四则与大小关系"],
    solution: {cells: solutionCells, variables: {}},
  };
  return difficulty === "hard" ? withVariables(base, variableAssignments) : base;
}

function placeInBlockedGrid(
  puzzle: CrossMathPuzzle,
  rows: number,
  columns: number,
  rowOffset: number,
  columnOffset: number,
): CrossMathPuzzle {
  const activeCells = puzzle.cells.map((cell) => ({
    ...cell,
    row: cell.row + rowOffset,
    column: cell.column + columnOffset,
  }));
  const occupied = new Set(activeCells.map((cell) => `${cell.row}:${cell.column}`));
  const blockedCells: CrossMathGridCell[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (!occupied.has(`${row}:${column}`)) {
        blockedCells.push({id: `blocked-${row}-${column}`, row, column, kind: "blocked", relationIds: []});
      }
    }
  }
  return {...puzzle, rows, columns, cells: [...blockedCells, ...activeCells]};
}

function createTributaryPuzzle(difficulty: CrossMathDifficulty, seed: number): CrossMathPuzzle {
  const config = TRIBUTARY_DIFFICULTIES[difficulty];
  const generated = generateConstraintMap(
    difficulty,
    seed,
    config.routeCount,
    formatCrossMathChallengeId(difficulty, seed),
  );
  const completedMap = difficulty === "hard"
    ? withVariables(generated.puzzle, generated.variableAssignments)
    : generated.puzzle;
  validateCompletedTributaryMap(completedMap);
  const withNumbers = withHiddenCells(completedMap, config.hiddenNumbers, seed);
  const hiddenNumberCount = withNumbers.tiles.filter((tile) => tile.kind === "number").length - withNumbers.variableNames.length;
  if (hiddenNumberCount < config.hiddenNumbers) {
    throw new Error(`Only ${hiddenNumberCount}/${config.hiddenNumbers} number cells were available to hide.`);
  }
  const puzzle = withHiddenSymbols(withNumbers, config.hiddenSymbols, seed);
  const generatedWitness = {
    cells: puzzle.solution.cells,
    variables: puzzle.solution.variables,
    symbols: Object.fromEntries(puzzle.cells
      .filter((cell): cell is CrossMathSymbolCell => cell.kind === "symbol" && cell.fillable === true)
      .map((cell) => [cell.id, cell.symbol])),
  };
  if (!isCrossMathSolved(puzzle, generatedWitness)) {
    throw new Error("The post-hide puzzle rejected its generated solution witness.");
  }
  return puzzle;
}

export function formatCrossMathChallengeId(difficulty: CrossMathDifficulty, seed: number): string {
  return `cross-${DIFFICULTY_CODES[difficulty]}-${(seed >>> 0).toString(36)}`;
}

export function parseCrossMathChallengeId(value: string): CrossMathChallengeReference | null {
  const match = /^cross-([senh])-([0-9a-z]+)$/i.exec(value.trim());
  if (match === null) return null;
  const difficulty = CODE_DIFFICULTIES[(match[1] as string).toLowerCase()];
  const seed = Number.parseInt(match[2] as string, 36);
  return difficulty === undefined || !Number.isSafeInteger(seed) || seed < 0 || seed > 0xffff_ffff
    ? null
    : {difficulty, seed};
}

const generatedPuzzleCache = new Map<string, CrossMathPuzzle>();

export function generateCrossMath(difficulty: CrossMathDifficulty, seed: number): CrossMathPuzzle {
  const normalizedSeed = seed >>> 0;
  const key = `${difficulty}:${normalizedSeed}`;
  const cached = generatedPuzzleCache.get(key);
  if (cached !== undefined) return cached;
  const puzzle = createTributaryPuzzle(difficulty, normalizedSeed);
  generatedPuzzleCache.set(key, puzzle);
  return puzzle;
}
