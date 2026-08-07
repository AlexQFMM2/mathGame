import {GAME_CATALOG} from "@math-game/game-core";
import {GameViewport} from "./components/GameViewport";

export function App() {
  return (
    <GameViewport>
      <div className="home-screen">
        <header className="app-header">
          <p className="eyebrow">A SMALL COLLECTION OF PUZZLES</p>
          <h1>MathGame</h1>
          <p className="intro">从数独开始，慢慢收集值得反复玩的数学小游戏。</p>
        </header>

        <section className="game-list" aria-label="游戏列表">
          {GAME_CATALOG.map((game) => (
            <button className="game-card" type="button" key={game.id} disabled>
              <span className="game-card__mark" aria-hidden="true">9×9</span>
              <span className="game-card__copy">
                <strong>{game.title}</strong>
                <small>{game.subtitle}</small>
              </span>
              <span className="game-card__status">开发中</span>
            </button>
          ))}
        </section>

        <div className="principles">
          <span>离线优先</span>
          <span>没有广告</span>
          <span>尊重思考</span>
        </div>

        <footer>320 × 640 portrait foundation</footer>
      </div>
    </GameViewport>
  );
}

