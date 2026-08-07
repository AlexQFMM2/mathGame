import {evaluateRelation} from "./evaluator.ts";
import {reconstructCrossMathGrid} from "./gridRelations.ts";
import {rational, rationalKey} from "./rational.ts";
import type {
  ArithmeticOperator,
  CrossMathDifficulty,
  CrossMathGridCell,
  CrossMathPuzzle,
  CrossMathRelation,
  CrossMathSymbol,
  Rational,
  RelationOperator,
  VariableName,
} from "./types.ts";

type Axis = "horizontal" | "vertical";

type TemplateToken =
  | {readonly kind: "unknown"; readonly occurrenceId: string}
  | {readonly kind: "coefficient"; readonly value: Rational}
  | {readonly kind: "symbol"; readonly symbol: CrossMathSymbol};

interface RelationTemplate {
  readonly id: string;
  readonly tokens: readonly TemplateToken[];
  readonly hintLabel: string;
}

interface OccupiedToken {
  readonly row: number;
  readonly column: number;
  readonly kind: "unknown" | "coefficient" | "symbol";
  readonly value?: Rational;
  readonly symbol?: CrossMathSymbol;
  readonly relationIds: string[];
  readonly axes: Set<Axis>;
}

interface PlacedConstraintMap {
  readonly cells: readonly CrossMathGridCell[];
  readonly relations: readonly CrossMathRelation[];
  readonly coefficientValues: Readonly<Record<string, Rational>>;
  readonly unknownCellIds: readonly string[];
}

const ARITHMETIC_SYMBOLS: Readonly<Record<ArithmeticOperator, CrossMathSymbol>> = {
  add: "+",
  subtract: "−",
  multiply: "×",
  divide: "÷",
};

const RELATION_SYMBOLS: Readonly<Record<RelationOperator, CrossMathSymbol>> = {
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

class ValueSets {
  readonly parents = new Map<string, string>();

  find(value: string): string {
    const parent = this.parents.get(value);
    if (parent === undefined) {
      this.parents.set(value, value);
      return value;
    }
    if (parent === value) return value;
    const root = this.find(parent);
    this.parents.set(value, root);
    return root;
  }

  union(left: string, right: string): void {
    const leftRoot = this.find(left);
    const rightRoot = this.find(right);
    if (leftRoot !== rightRoot) this.parents.set(rightRoot, leftRoot);
  }
}

function relationOperatorFor(difficulty: CrossMathDifficulty, index: number, random: () => number): RelationOperator {
  if (difficulty === "starter") return "equal";
  const equality = difficulty === "easy"
    ? index % 3 !== 0
    : difficulty === "normal"
      ? index % 2 === 0
      : index % 3 === 0;
  if (equality) return "equal";
  const candidates: readonly RelationOperator[] = difficulty === "easy"
    ? ["greater", "less"]
    : ["greater", "less", "greater-or-equal", "less-or-equal"];
  return candidates[random() % candidates.length] as RelationOperator;
}

function coefficientFor(
  difficulty: CrossMathDifficulty,
  random: () => number,
  fraction: boolean,
): Rational {
  if (fraction) return rational(1 + random() % 2, 3);
  if (difficulty === "normal") return rational(1 + random() % 90, 10);
  return rational(1 + random() % (difficulty === "starter" ? 9 : 12));
}

function arithmeticFor(
  difficulty: CrossMathDifficulty,
  relation: RelationOperator,
  random: () => number,
): ArithmeticOperator {
  const candidates: readonly ArithmeticOperator[] = difficulty === "starter" || relation === "equal"
    ? ["add", "subtract"]
    : ["add", "subtract", "multiply", "divide"];
  return candidates[random() % candidates.length] as ArithmeticOperator;
}

function generateTemplates(
  difficulty: CrossMathDifficulty,
  routeCount: number,
  seed: number,
): readonly RelationTemplate[] {
  const random = xorshift(seed ^ 0x8f6a_23d1);
  let normalFractionSlots = difficulty === "normal" ? 4 : 0;
  return Array.from({length: routeCount}, (_, index) => {
    const id = `tributary-${index}`;
    const relation = relationOperatorFor(difficulty, index, random);
    const short = difficulty === "hard" && index % 4 === 1 || difficulty === "easy" && index === routeCount - 1;
    const long = difficulty !== "starter" && (relation !== "equal" && normalFractionSlots > 0 || random() % 3 === 0);
    const leftOperator = arithmeticFor(difficulty, relation, random);
    const rightOperator = arithmeticFor(difficulty, relation, random);
    const makeCoefficient = () => {
      const fraction = relation !== "equal" && normalFractionSlots > 0;
      if (fraction) normalFractionSlots -= 1;
      return {kind: "coefficient" as const, value: coefficientFor(difficulty, random, fraction)};
    };
    const leftUnknown = {kind: "unknown" as const, occurrenceId: `${id}:left`};
    const rightUnknown = {kind: "unknown" as const, occurrenceId: `${id}:right`};
    const relationToken = {kind: "symbol" as const, symbol: RELATION_SYMBOLS[relation]};
    const expressionFirst = random() % 2 === 0;
    const tokens: readonly TemplateToken[] = short
      ? [leftUnknown, relationToken, rightUnknown]
      : long
      ? [
          leftUnknown,
          {kind: "symbol", symbol: ARITHMETIC_SYMBOLS[leftOperator]},
          makeCoefficient(),
          relationToken,
          rightUnknown,
          {kind: "symbol", symbol: ARITHMETIC_SYMBOLS[rightOperator]},
          makeCoefficient(),
        ]
      : expressionFirst
        ? [
            leftUnknown,
            {kind: "symbol", symbol: ARITHMETIC_SYMBOLS[leftOperator]},
            makeCoefficient(),
            relationToken,
            rightUnknown,
          ]
        : [
            leftUnknown,
            relationToken,
            rightUnknown,
            {kind: "symbol", symbol: ARITHMETIC_SYMBOLS[rightOperator]},
            makeCoefficient(),
          ];
    return {id, tokens, hintLabel: `第 ${index + 1} 条关系`};
  });
}

function coordinateKey(row: number, column: number): string {
  return `${row}:${column}`;
}

function valueCellId(row: number, column: number): string {
  return `node-${row}-${column}`;
}

function tokenPosition(
  row: number,
  column: number,
  axis: Axis,
  index: number,
): {readonly row: number; readonly column: number} {
  return axis === "horizontal" ? {row, column: column + index} : {row: row + index, column};
}

function placeTemplates(
  templates: readonly RelationTemplate[],
  seed: number,
): PlacedConstraintMap | null {
  const occupied = new Map<string, OccupiedToken>();
  const placements = new Map<string, {readonly row: number; readonly column: number; readonly axis: Axis}>();
  const templateById = new Map(templates.map((template) => [template.id, template]));

  const canPlace = (template: RelationTemplate, row: number, column: number, axis: Axis): boolean => {
    const end = tokenPosition(row, column, axis, template.tokens.length - 1);
    if (row < 0 || column < 0 || end.row >= 14 || end.column >= 14) return false;
    const before = tokenPosition(row, column, axis, -1);
    const after = tokenPosition(row, column, axis, template.tokens.length);
    if (occupied.has(coordinateKey(before.row, before.column)) || occupied.has(coordinateKey(after.row, after.column))) return false;
    return template.tokens.every((token, index) => {
      const position = tokenPosition(row, column, axis, index);
      const existing = occupied.get(coordinateKey(position.row, position.column));
      if (existing === undefined) return true;
      return token.kind === "unknown" && existing.kind === "unknown" && !existing.axes.has(axis);
    });
  };

  const applyPlacement = (template: RelationTemplate, row: number, column: number, axis: Axis) => {
    placements.set(template.id, {row, column, axis});
    template.tokens.forEach((token, index) => {
      const position = tokenPosition(row, column, axis, index);
      const key = coordinateKey(position.row, position.column);
      const existing = occupied.get(key);
      if (existing !== undefined) {
        existing.relationIds.push(template.id);
        existing.axes.add(axis);
        return;
      }
      occupied.set(key, {
        ...position,
        kind: token.kind,
        value: token.kind === "coefficient" ? token.value : undefined,
        symbol: token.kind === "symbol" ? token.symbol : undefined,
        relationIds: [template.id],
        axes: new Set([axis]),
      });
    });
  };

  const first = templates[0];
  if (first === undefined) return null;
  const firstAxis: Axis = seed % 2 === 0 ? "horizontal" : "vertical";
  const firstRow = firstAxis === "horizontal" ? 6 : Math.floor((14 - first.tokens.length) / 2);
  const firstColumn = firstAxis === "horizontal" ? Math.floor((14 - first.tokens.length) / 2) : 6;
  applyPlacement(first, firstRow, firstColumn, firstAxis);

  let layoutVisits = 0;
  const placeRemaining = (templateIndex: number): boolean => {
    layoutVisits += 1;
    if (layoutVisits > 30_000) return false;
    const template = templates[templateIndex];
    if (template === undefined) return true;
    const junctions = [...occupied.values()].filter((token) => token.kind === "unknown");
    const unknownIndices = template.tokens
      .map((token, index) => token.kind === "unknown" ? index : -1)
      .filter((index) => index >= 0);
    const candidates = shuffle(junctions, seed ^ Math.imul(placements.size + 1, 0x9e37_79b1)).flatMap((junction) => (
      shuffle(unknownIndices, seed ^ junction.row * 31 ^ junction.column * 131).flatMap((unknownIndex) => (
        shuffle<Axis>(["horizontal", "vertical"], seed ^ unknownIndex * 977).map((axis) => ({
          row: junction.row - (axis === "vertical" ? unknownIndex : 0),
          column: junction.column - (axis === "horizontal" ? unknownIndex : 0),
          axis,
        }))
      ))
    ));
    for (const placement of candidates) {
      if (!canPlace(template, placement.row, placement.column, placement.axis)) continue;
      const occupiedSnapshot = new Map([...occupied].map(([key, token]) => [key, {
        ...token,
        relationIds: [...token.relationIds],
        axes: new Set(token.axes),
      }]));
      const placementsSnapshot = new Map(placements);
      applyPlacement(template, placement.row, placement.column, placement.axis);
      if (placeRemaining(templateIndex + 1)) return true;
      occupied.clear();
      occupiedSnapshot.forEach((token, key) => occupied.set(key, token));
      placements.clear();
      placementsSnapshot.forEach((candidate, key) => placements.set(key, candidate));
    }
    return false;
  };
  if (!placeRemaining(1)) return null;

  const activeCells: CrossMathGridCell[] = [...occupied.values()].map((token) => {
    if (token.kind === "symbol") {
      const relationId = token.relationIds[0] as string;
      const placement = placements.get(relationId);
      const template = templateById.get(relationId);
      const tokenIndex = placement === undefined || template === undefined
        ? -1
        : template.tokens.findIndex((candidate, index) => (
            candidate.kind === "symbol"
            && tokenPosition(placement.row, placement.column, placement.axis, index).row === token.row
            && tokenPosition(placement.row, placement.column, placement.axis, index).column === token.column
          ));
      return {
        id: `${relationId}-symbol-${tokenIndex}`,
        row: token.row,
        column: token.column,
        kind: "symbol" as const,
        symbol: token.symbol as CrossMathSymbol,
        relationIds: token.relationIds,
      };
    }
    return {
      id: valueCellId(token.row, token.column),
      row: token.row,
      column: token.column,
      kind: "value" as const,
      fixedValue: token.kind === "coefficient" ? token.value : undefined,
      relationIds: token.relationIds,
    };
  });
  const used = new Set(activeCells.map((cell) => coordinateKey(cell.row, cell.column)));
  const blocked: CrossMathGridCell[] = [];
  for (let row = 0; row < 14; row += 1) {
    for (let column = 0; column < 14; column += 1) {
      if (!used.has(coordinateKey(row, column))) {
        blocked.push({id: `blocked-${row}-${column}`, row, column, kind: "blocked", relationIds: []});
      }
    }
  }
  const dummyRelations: CrossMathRelation[] = templates.map((template) => ({
    id: template.id,
    left: {kind: "literal", value: rational(0)},
    operator: "equal",
    right: {kind: "literal", value: rational(0)},
    cellIds: [],
    variableNames: [],
    hintLabel: template.hintLabel,
  }));
  const coefficientValues = Object.fromEntries(activeCells.flatMap((cell) => (
    cell.kind === "value" && cell.fixedValue !== undefined
      ? [[cell.id, cell.fixedValue] as const]
      : []
  )));
  const provisional: CrossMathPuzzle = {
    id: "constraint-map",
    difficulty: "starter",
    seed,
    rows: 14,
    columns: 14,
    cells: [...blocked, ...activeCells],
    relations: dummyRelations,
    tiles: [],
    variableNames: [],
    knowledgeTags: [],
    solution: {cells: coefficientValues, variables: {}},
  };
  const reconstructed = reconstructCrossMathGrid(provisional, {cells: coefficientValues, variables: {}, symbols: {}});
  if (reconstructed.invalidRelationIds.length > 0 || reconstructed.unresolvedRelationIds.length > 0) return null;
  return {
    cells: provisional.cells,
    relations: reconstructed.relations,
    coefficientValues,
    unknownCellIds: activeCells
      .filter((cell) => cell.kind === "value" && cell.fixedValue === undefined)
      .map((cell) => cell.id),
  };
}

interface PairConstraint {
  readonly variables: readonly string[];
  readonly allowed: ReadonlySet<string>;
  readonly tuples: readonly (readonly string[])[];
}

function solveConstraintMap(
  map: PlacedConstraintMap,
  difficulty: CrossMathDifficulty,
  seed: number,
  valueSets: ValueSets,
): Readonly<Record<string, Rational>> | null {
  const maximum = difficulty === "starter" ? 20 : difficulty === "normal" ? 200 : 100;
  const denominator = difficulty === "normal" ? 10 : 1;
  const domain = shuffle(
    Array.from({length: maximum + 1}, (_, numerator) => rational(numerator, denominator)),
    seed ^ 0x73d2_a91f,
  );
  const representativeByCell = Object.fromEntries(map.unknownCellIds.map((cellId) => [cellId, valueSets.find(cellId)]));
  const representatives = [...new Set(Object.values(representativeByCell))];
  const constraints: PairConstraint[] = [];

  for (const relation of map.relations) {
    const variables = [...new Set(relation.cellIds
      .map((cellId) => representativeByCell[cellId])
      .filter((value): value is string => value !== undefined))];
    if (variables.length < 1 || variables.length > 2) return null;
    const allowed = new Set<string>();
    const visit = (index: number, assigned: Readonly<Record<string, Rational>>) => {
      if (index < variables.length) {
        const variable = variables[index] as string;
        for (const value of domain) visit(index + 1, {...assigned, [variable]: value});
        return;
      }
      const cells = {...map.coefficientValues};
      for (const cellId of map.unknownCellIds) {
        const value = assigned[representativeByCell[cellId] as string];
        if (value !== undefined) cells[cellId] = value;
      }
      if (evaluateRelation(relation, {cells, variables: {}, symbols: {}}) === true) {
        allowed.add(variables.map((variable) => rationalKey(assigned[variable] as Rational)).join("|"));
      }
    };
    visit(0, {});
    if (allowed.size === 0) return null;
    constraints.push({variables, allowed, tuples: [...allowed].map((key) => key.split("|"))});
  }

  const degree = new Map(representatives.map((representative) => [representative, 0]));
  constraints.forEach((constraint) => constraint.variables.forEach((variable) => degree.set(variable, (degree.get(variable) ?? 0) + 1)));
  const rationalByKey = new Map(domain.map((value) => [rationalKey(value), value]));
  const domains = new Map(representatives.map((representative) => [
    representative,
    new Set(domain.map(rationalKey)),
  ]));
  let changed = true;
  while (changed) {
    changed = false;
    for (const constraint of constraints) {
      for (let variableIndex = 0; variableIndex < constraint.variables.length; variableIndex += 1) {
        const variable = constraint.variables[variableIndex] as string;
        const current = domains.get(variable) as Set<string>;
        for (const value of [...current]) {
          const supported = constraint.tuples.some((tuple) => (
            tuple[variableIndex] === value
            && constraint.variables.every((other, otherIndex) => (
              domains.get(other)?.has(tuple[otherIndex] as string) === true
            ))
          ));
          if (!supported) {
            current.delete(value);
            changed = true;
          }
        }
        if (current.size === 0) return null;
      }
    }
  }
  const possible = (constraint: PairConstraint, assigned: Readonly<Record<string, string>>): boolean => {
    return constraint.tuples.some((tuple) => constraint.variables.every((variable, index) => (
      assigned[variable] === undefined || assigned[variable] === tuple[index]
    )));
  };
  let visits = 0;
  const search = (assigned: Readonly<Record<string, string>>): Readonly<Record<string, string>> | null => {
    visits += 1;
    if (visits > 80_000) return null;
    if (Object.keys(assigned).length === representatives.length) return assigned;
    const candidates = representatives
      .filter((variable) => assigned[variable] === undefined)
      .map((variable) => ({
        variable,
        values: [...(domains.get(variable) as Set<string>)].filter((value) => {
          const next = {...assigned, [variable]: value};
          return constraints.every((constraint) => !constraint.variables.includes(variable) || possible(constraint, next));
        }),
      }))
      .sort((left, right) => left.values.length - right.values.length || (degree.get(right.variable) ?? 0) - (degree.get(left.variable) ?? 0));
    const selected = candidates[0];
    if (selected === undefined || selected.values.length === 0) return null;
    for (const value of selected.values) {
      const variable = selected.variable;
      const next = {...assigned, [variable]: value};
      if (constraints.every((constraint) => possible(constraint, next))) {
        const solved = search(next);
        if (solved !== null) return solved;
      }
    }
    return null;
  };
  const solved = search({});
  if (solved === null) return null;
  return Object.fromEntries(map.unknownCellIds.map((cellId) => {
    const value = rationalByKey.get(solved[representativeByCell[cellId] as string] as string);
    if (value === undefined) throw new Error("Constraint solution referenced a value outside its domain.");
    return [cellId, value];
  }));
}

export function generateConstraintMap(
  difficulty: CrossMathDifficulty,
  seed: number,
  routeCount: number,
  challengeId: string,
): {readonly puzzle: CrossMathPuzzle; readonly variableAssignments: Readonly<Record<string, VariableName>>} {
  let layoutFailures = 0;
  let solveFailures = 0;
  const maximumAttempts = 96;
  for (let attempt = 0; attempt < maximumAttempts; attempt += 1) {
    const attemptSeed = (seed ^ Math.imul(attempt + 1, 0x9e37_79b1)) >>> 0;
    const templates = generateTemplates(difficulty, routeCount, attemptSeed);
    const placed = placeTemplates(templates, attemptSeed);
    if (placed === null) {
      layoutFailures += 1;
      continue;
    }
    const valueSets = new ValueSets();
    placed.unknownCellIds.forEach((cellId) => valueSets.find(cellId));
    const variableAssignments: Record<string, VariableName> = {};
    const unknownValues = solveConstraintMap(placed, difficulty, attemptSeed, valueSets);
    if (unknownValues === null) {
      solveFailures += 1;
      continue;
    }
    if (difficulty === "hard") {
      const groups = new Map<string, string[]>();
      for (const cellId of placed.unknownCellIds) {
        const key = rationalKey(unknownValues[cellId] as Rational);
        groups.set(key, [...(groups.get(key) ?? []), cellId]);
      }
      const pairs = shuffle(
        [...groups.values()].filter((cellIds) => cellIds.length >= 2),
        attemptSeed ^ 0xc1a4_5f87,
      ).slice(0, 3);
      if (pairs.length < 3) continue;
      (["a", "b", "c"] as const).forEach((name, index) => {
        const pair = pairs[index] as string[];
        variableAssignments[pair[0] as string] = name;
        variableAssignments[pair[1] as string] = name;
      });
    }
    const solutionCells = {...placed.coefficientValues, ...unknownValues};
    const cells = placed.cells.map((cell) => cell.kind === "value"
      ? {...cell, fixedValue: solutionCells[cell.id] as Rational}
      : cell);
    const puzzle: CrossMathPuzzle = {
      id: challengeId,
      difficulty,
      seed: seed >>> 0,
      rows: 14,
      columns: 14,
      cells,
      relations: placed.relations,
      tiles: [],
      variableNames: [],
      knowledgeTags: difficulty === "starter"
        ? ["20 以内加减", "线性关系网"]
        : difficulty === "easy"
          ? ["百以内四则", "大小关系", "线性关系网"]
          : difficulty === "normal"
            ? ["分数与小数", "线性不等式", "线性关系网"]
            : ["共享未知数", "线性方程组", "大小关系"],
      solution: {cells: solutionCells, variables: {}},
    };
    return {puzzle, variableAssignments};
  }
  throw new Error(`Ordered relation templates failed after ${maximumAttempts} attempts (${layoutFailures} layout, ${solveFailures} solve).`);
}
