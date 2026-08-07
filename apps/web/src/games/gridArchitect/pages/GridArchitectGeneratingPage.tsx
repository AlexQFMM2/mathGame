import type {GridArchitectDifficulty} from "@math-game/grid-architect-core";
import {GRID_ARCHITECT_DIFFICULTY_LABELS} from "./labels";
import "./GridArchitectGeneratingPage.css";

export function GridArchitectGeneratingPage({difficulty}: {readonly difficulty: GridArchitectDifficulty}) {
  return (
    <section className="grid-architect-generating-page" aria-live="polite">
      <div className="grid-architect-generating-page__map" aria-hidden="true">
        {Array.from({length: 25}, (_, index) => <i className={[6, 7, 8, 11, 12, 16, 17].includes(index) ? "built" : index === 13 ? "landmark" : index === 3 || index === 20 ? "obstacle" : ""} key={index} />)}
      </div>
      <small>正在勘测</small>
      <h1>{GRID_ARCHITECT_DIFFICULTY_LABELS[difficulty]}格点地图</h1>
      <p>布置地标、验证周长并寻找可行建筑…</p>
      <div className="grid-architect-generating-page__progress"><i /></div>
    </section>
  );
}
