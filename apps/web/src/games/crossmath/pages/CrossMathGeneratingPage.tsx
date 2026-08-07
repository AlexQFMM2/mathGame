import type {CrossMathDifficulty} from "@math-game/crossmath-core";
import {CROSSMATH_DIFFICULTY_LABELS} from "./labels";
import "./CrossMathGeneratingPage.css";

export function CrossMathGeneratingPage({difficulty}: {readonly difficulty: CrossMathDifficulty}) {
  return (
    <section className="crossmath-generating-page" aria-live="polite">
      <div className="crossmath-generating-page__puzzle" aria-hidden="true">
        <span>8</span><i>+</i><span>7</span><i>=</i><span>15</span>
        <i>+</i><b /><i>−</i><b /><i>−</i>
        <span>4</span><i>+</i><span>3</span><i>=</i><span>7</span>
      </div>
      <small>正在准备</small>
      <h1>{CROSSMATH_DIFFICULTY_LABELS[difficulty]}算术填字</h1>
      <p>挖掘支流路径并验证至少一种解法…</p>
      <div className="crossmath-generating-page__progress"><i /></div>
    </section>
  );
}
