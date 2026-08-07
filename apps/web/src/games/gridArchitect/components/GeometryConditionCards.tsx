import type {GeometryConditionResult, GridArchitectPuzzle} from "@math-game/grid-architect-core";
import {AppIcon} from "../../../components/AppIcon";
import "./GeometryConditionCards.css";

export function GeometryConditionCards({puzzle, results, checked}: {
  readonly puzzle: GridArchitectPuzzle;
  readonly results: readonly GeometryConditionResult[];
  readonly checked: boolean;
}) {
  const resultById = new Map(results.map((result) => [result.conditionId, result]));
  return (
    <section className="geometry-condition-cards" aria-label="建筑条件">
      {puzzle.conditions.map((condition) => {
        const result = resultById.get(condition.id);
        const state = !checked || result === undefined ? "pending" : result.satisfied ? "satisfied" : "conflict";
        return (
          <article className={`geometry-condition-card geometry-condition-card--${state}`} key={condition.id}>
            <i aria-hidden="true">{state === "satisfied" ? <AppIcon name="check" size={9} /> : state === "conflict" ? "!" : "·"}</i>
            <span><strong>{condition.label}</strong>{checked && result !== undefined && <small>当前：{result.actual}</small>}</span>
          </article>
        );
      })}
    </section>
  );
}
