import {AppIcon} from "./AppIcon";
import "./GamePlayHeader.css";

interface GamePlayHeaderProps {
  readonly gameTitle: string;
  readonly difficultyLabel: string;
  readonly errors: number;
  readonly elapsedLabel: string;
  readonly onExit: () => void;
  readonly onPause: () => void;
}

export function GamePlayHeader({
  gameTitle,
  difficultyLabel,
  errors,
  elapsedLabel,
  onExit,
  onPause,
}: GamePlayHeaderProps) {
  return (
    <header className="game-play-header">
      <button className="game-play-header__back" type="button" onClick={onExit} aria-label="保存并返回主页"><AppIcon name="arrow-left" size={18} /></button>
      <div className="game-play-header__title">
        <small>{gameTitle}</small>
        <strong>{difficultyLabel}</strong>
      </div>
      <div className="game-play-header__status" aria-label={`错误 ${errors} 次，用时 ${elapsedLabel}`}>
        <span><small>错误</small><b>{errors}</b></span>
        <i />
        <span><small>用时</small><b>{elapsedLabel}</b></span>
      </div>
      <button className="game-play-header__pause" type="button" onClick={onPause} aria-label="暂停游戏"><AppIcon name="pause" size={18} /></button>
    </header>
  );
}
