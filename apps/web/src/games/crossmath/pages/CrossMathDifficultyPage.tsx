import type {CrossMathChallengeReference, CrossMathDifficulty} from "@math-game/crossmath-core";
import {AppIcon, type AppIconName} from "../../../components/AppIcon";
import {CrossMathSeedCard} from "../components/CrossMathSeedCard";
import {CROSSMATH_DIFFICULTY_LABELS} from "./labels";
import "./CrossMathDifficultyPage.css";

const OPTIONS: readonly {
  readonly id: CrossMathDifficulty;
  readonly grade: string;
  readonly description: string;
  readonly scope: string;
  readonly icon: AppIconName;
}[] = [
  {id: "starter", grade: "一年级起步", description: "20 以内加减，逐步进入百以内。", scope: "只使用等号", icon: "leaf"},
  {id: "easy", grade: "一至三年级", description: "百以内四则，比较数的大小。", scope: "＝ ＞ ＜", icon: "compass"},
  {id: "normal", grade: "三至五年级", description: "分数、小数与四则混合关系。", scope: "少量 ≥ ≤", icon: "lightbulb"},
  {id: "hard", grade: "五至六年级", description: "用多条关系推导 a、b、c。", scope: "共享未知数", icon: "flame"},
];

export function CrossMathDifficultyPage({hasSavedGame, onBack, onSelect, onStartChallenge}: {
  readonly hasSavedGame: boolean;
  readonly onBack: () => void;
  readonly onSelect: (difficulty: CrossMathDifficulty) => void;
  readonly onStartChallenge: (reference: CrossMathChallengeReference) => void;
}) {
  return (
    <section className="crossmath-difficulty-page">
      <header>
        <button type="button" onClick={onBack} aria-label="返回主页"><AppIcon name="arrow-left" size={18} /></button>
        <div><small>开始算术填字</small><h1>选择难度</h1></div>
      </header>
      <p className="crossmath-difficulty-page__intro">每张地图保证至少有一种完整解法，也允许不同的正确答案。</p>
      <div className="crossmath-difficulty-list">
        {OPTIONS.map((option, index) => (
          <button className={`crossmath-difficulty-card crossmath-difficulty-card--${option.id}`} type="button" key={option.id} onClick={() => onSelect(option.id)}>
            <span className="crossmath-difficulty-card__number">0{index + 1}</span>
            <span className="crossmath-difficulty-card__icon" aria-hidden="true"><AppIcon name={option.icon} size={22} /></span>
            <span className="crossmath-difficulty-card__copy"><small>{option.grade}</small><strong>{CROSSMATH_DIFFICULTY_LABELS[option.id]}</strong><span>{option.description}</span></span>
            <b>{option.scope}</b>
          </button>
        ))}
      </div>
      <CrossMathSeedCard hasSavedGame={hasSavedGame} onStart={onStartChallenge} />
      <p className="crossmath-difficulty-page__note"><AppIcon name="check" size={11} /> 离线支流地图 · 精确运算 · 保证有解</p>
    </section>
  );
}
