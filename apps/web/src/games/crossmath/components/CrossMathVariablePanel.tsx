import {formatRational, type CrossMathValueState, type VariableName} from "@math-game/crossmath-core";
import "./CrossMathVariablePanel.css";

interface CrossMathVariablePanelProps {
  readonly variableNames: readonly VariableName[];
  readonly values: CrossMathValueState;
  readonly hintDestinationId: string | null;
  readonly onPlace: (destinationId: string) => void;
}

export function CrossMathVariablePanel({variableNames, values, hintDestinationId, onPlace}: CrossMathVariablePanelProps) {
  if (variableNames.length === 0) return null;
  return (
    <section className="crossmath-variable-panel" aria-label="变量答案">
      <small>变量值</small>
      <div>
        {variableNames.map((name) => {
          const destinationId = `var:${name}`;
          const value = values.variables[name];
          return (
            <button className={hintDestinationId === destinationId ? "crossmath-variable-panel__hint" : ""} type="button" data-destination-id={destinationId} key={name} onClick={() => onPlace(destinationId)}>
              <i>{name}</i><span>=</span><b>{value === undefined ? "?" : formatRational(value)}</b>
            </button>
          );
        })}
      </div>
    </section>
  );
}
