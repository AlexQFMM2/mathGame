import {AppIcon} from "./AppIcon";
import "./GenerationErrorPage.css";

export function GenerationErrorPage({message, onBack}: {readonly message: string; readonly onBack: () => void}) {
  return (
    <section className="generation-error-page" role="alert">
      <span aria-hidden="true">!</span>
      <small>生成遇到问题</small>
      <h1>换一个种子再试</h1>
      <p>{message}</p>
      <button type="button" onClick={onBack}><AppIcon name="arrow-left" size={16} />返回难度选择</button>
    </section>
  );
}
