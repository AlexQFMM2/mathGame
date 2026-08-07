import "./PauseOverlay.css";
import {AppIcon} from "../../../components/AppIcon";

export function PauseOverlay({onResume}: {readonly onResume: () => void}) {
  return (
    <div className="pause-overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      <span aria-hidden="true"><AppIcon name="pause" size={24} /></span>
      <small>游戏已暂停</small>
      <h2 id="pause-title">让思路歇一会</h2>
      <p>计时和棋盘都已暂停，准备好后继续。</p>
      <button type="button" autoFocus onClick={onResume}>继续游戏</button>
    </div>
  );
}
