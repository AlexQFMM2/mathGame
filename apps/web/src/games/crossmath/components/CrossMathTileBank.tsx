import {formatRational, type CrossMathTile} from "@math-game/crossmath-core";
import {CrossMathValueText} from "./CrossMathValueText";
import "./CrossMathTileBank.css";

interface CrossMathTileBankProps {
  readonly tiles: readonly CrossMathTile[];
  readonly placements: Readonly<Record<string, string>>;
  readonly selectedTileId: string | null;
  readonly onSelect: (tileId: string) => void;
}

export function CrossMathTileBank({tiles, placements, selectedTileId, onSelect}: CrossMathTileBankProps) {
  const used = new Set(Object.values(placements));
  return (
    <section className={`crossmath-tile-bank${tiles.length > 15 ? " crossmath-tile-bank--dense" : ""}`} aria-label="数字与符号牌">
      <header><strong>卡牌</strong><small>{tiles.length - used.size} 张待放</small></header>
      <div>
        {tiles.map((tile) => {
          const placed = used.has(tile.id);
          const selected = selectedTileId === tile.id;
          const label = tile.kind === "number" ? formatRational(tile.value) : tile.symbol;
          return (
            <button
              className={`${tile.kind === "symbol" ? "crossmath-tile--symbol" : ""}${placed ? " crossmath-tile--placed" : ""}${selected ? " crossmath-tile--selected" : ""}`.trim()}
              type="button"
              data-tile-id={tile.id}
              aria-pressed={selected}
              aria-label={`${label}，${placed ? "已放置" : "未使用"}`}
              key={tile.id}
              onClick={() => onSelect(tile.id)}
            >
              <b>{tile.kind === "number" ? <CrossMathValueText value={tile.value} /> : label}</b><small>{placed ? "✓ 已放" : ""}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}
