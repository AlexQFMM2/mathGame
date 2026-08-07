import {formatRational, type Rational} from "@math-game/crossmath-core";
import "./CrossMathValueText.css";

interface CrossMathValueTextProps {
  readonly value: Rational;
}

export function CrossMathValueText({value}: CrossMathValueTextProps) {
  const label = formatRational(value);
  if (!label.includes("/")) {
    const sizeClass = label.length >= 5
      ? " crossmath-value-text--tiny"
      : label.length >= 3
        ? " crossmath-value-text--compact"
        : "";
    return <span className={`crossmath-value-text${sizeClass}`} aria-hidden="true">{label}</span>;
  }
  return (
    <span className="crossmath-value-text crossmath-value-text--fraction" aria-hidden="true">
      <span>{value.numerator}</span>
      <span>{value.denominator}</span>
    </span>
  );
}
