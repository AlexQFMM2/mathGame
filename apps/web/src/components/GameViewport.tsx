import {GAME_VIEWPORT} from "@math-game/game-core";
import {useEffect, useState, type PropsWithChildren} from "react";
import "./GameViewport.css";

function availableViewport() {
  return {
    width: window.visualViewport?.width ?? window.innerWidth,
    height: window.visualViewport?.height ?? window.innerHeight,
  };
}

export function GameViewport({children}: PropsWithChildren) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      const viewport = availableViewport();
      setScale(
        Math.min(
          viewport.width / GAME_VIEWPORT.width,
          viewport.height / GAME_VIEWPORT.height,
        ),
      );
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    window.visualViewport?.addEventListener("resize", updateScale);

    return () => {
      window.removeEventListener("resize", updateScale);
      window.visualViewport?.removeEventListener("resize", updateScale);
    };
  }, []);

  return (
    <main
      className="game-stage"
      style={{
        width: GAME_VIEWPORT.width * scale,
        height: GAME_VIEWPORT.height * scale,
      }}
    >
      <div
        className="game-viewport"
        style={{transform: `scale(${scale})`}}
      >
        {children}
      </div>
    </main>
  );
}
