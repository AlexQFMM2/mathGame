import {formatElapsedTime} from "../state/session";
import {DIFFICULTY_LABELS} from "../pages/labels";
import type {SudokuDifficulty} from "@math-game/sudoku-core";
import {AppIcon} from "../../../components/AppIcon";
import "./GameHeader.css";

interface GameHeaderProps {
  readonly difficulty: SudokuDifficulty;
  readonly errors: number;
  readonly elapsedSeconds: number;
  readonly onExit: () => void;
  readonly onPause: () => void;
}

export function GameHeader({difficulty, errors, elapsedSeconds, onExit, onPause}: GameHeaderProps) {
  return (
    <header className="game-header">
      <button className="game-header__back" type="button" onClick={onExit} aria-label="保存并返回主页"><AppIcon name="arrow-left" size={18} /></button>
      <div className="game-header__title">
        <small>数独</small>
        <strong>{DIFFICULTY_LABELS[difficulty]}</strong>
      </div>
      <div className="game-header__status" aria-label={`错误 ${errors} 次，用时 ${formatElapsedTime(elapsedSeconds)}`}>
        <span><small>错误</small><b>{errors}</b></span>
        <i />
        <span><small>用时</small><b>{formatElapsedTime(elapsedSeconds)}</b></span>
      </div>
      <button className="game-header__pause" type="button" onClick={onPause} aria-label="暂停游戏"><AppIcon name="pause" size={18} /></button>
    </header>
  );
}
