import {useState} from "react";
import {COMPONENT_PREVIEWS} from "./previewRegistry";
import "./ComponentPreviewPage.css";

export function ComponentPreviewPage() {
  const [selectedId, setSelectedId] = useState(COMPONENT_PREVIEWS[0]?.id ?? "");
  const selected = COMPONENT_PREVIEWS.find((preview) => preview.id === selectedId)
    ?? COMPONENT_PREVIEWS[0];

  return (
    <section className={`component-preview${selected?.fullscreen ? " component-preview--fullscreen" : ""}`}>
      <header>
        <small>DEV ONLY</small>
        <h1>组件预览</h1>
        <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
          {COMPONENT_PREVIEWS.map((preview) => (
            <option value={preview.id} key={preview.id}>{preview.title}</option>
          ))}
        </select>
        <p>{selected?.description}</p>
      </header>
      <main>{selected?.render()}</main>
    </section>
  );
}
