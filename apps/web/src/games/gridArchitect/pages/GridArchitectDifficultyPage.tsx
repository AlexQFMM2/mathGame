import type {GridArchitectChallengeReference, GridArchitectDifficulty} from "@math-game/grid-architect-core";
import {AppIcon, type AppIconName} from "../../../components/AppIcon";
import {GridArchitectSeedCard} from "../components/GridArchitectSeedCard";
import {GRID_ARCHITECT_DIFFICULTY_LABELS} from "./labels";
import "./GridArchitectDifficultyPage.css";

const OPTIONS: readonly {readonly id: GridArchitectDifficulty; readonly grade: string; readonly description: string; readonly scope: string; readonly icon: AppIconName}[] = [
  {id: "starter", grade: "一至二年级", description: "数格子，围出连通的小建筑。", scope: "面积", icon: "leaf"},
  {id: "easy", grade: "二至三年级", description: "观察面积、周长与左右对称。", scope: "面积 · 周长", icon: "compass"},
  {id: "normal", grade: "三至五年级", description: "绕开障碍，满足组合图形条件。", scope: "对称 · 障碍", icon: "lightbulb"},
  {id: "hard", grade: "五至六年级", description: "中心对称与最短周长挑战。", scope: "多条件优化", icon: "flame"},
];

export function GridArchitectDifficultyPage({hasSavedGame, onBack, onSelect, onStartChallenge}: {
  readonly hasSavedGame: boolean;
  readonly onBack: () => void;
  readonly onSelect: (difficulty: GridArchitectDifficulty) => void;
  readonly onStartChallenge: (reference: GridArchitectChallengeReference) => void;
}) {
  return (
    <section className="grid-architect-difficulty-page">
      <header>
        <button type="button" onClick={onBack} aria-label="返回主页"><AppIcon name="arrow-left" size={18} /></button>
        <div><small>开始空间建造</small><h1>选择难度</h1></div>
      </header>
      <p className="grid-architect-difficulty-page__intro">所有满足条件的建筑都正确，一道题可以有多种方案。</p>
      <div className="grid-architect-difficulty-list">
        {OPTIONS.map((option, index) => (
          <button className={`grid-architect-difficulty-card grid-architect-difficulty-card--${option.id}`} type="button" key={option.id} onClick={() => onSelect(option.id)}>
            <span className="grid-architect-difficulty-card__number">0{index + 1}</span>
            <span className="grid-architect-difficulty-card__icon"><AppIcon name={option.icon} size={22} /></span>
            <span className="grid-architect-difficulty-card__copy"><small>{option.grade}</small><strong>{GRID_ARCHITECT_DIFFICULTY_LABELS[option.id]}</strong><span>{option.description}</span></span>
            <b>{option.scope}</b>
          </button>
        ))}
      </div>
      <GridArchitectSeedCard hasSavedGame={hasSavedGame} onStart={onStartChallenge} />
      <p className="grid-architect-difficulty-page__note"><AppIcon name="check" size={11} /> 离线生成 · 允许多解 · 保证有解</p>
    </section>
  );
}
