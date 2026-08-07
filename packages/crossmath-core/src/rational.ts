import type {Rational} from "./types.ts";

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}

export function rational(numerator: number, denominator = 1): Rational {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator === 0) {
    throw new RangeError("Rational values require safe integer parts and a non-zero denominator.");
  }
  const sign = denominator < 0 ? -1 : 1;
  const divisor = gcd(numerator, denominator);
  return {
    numerator: sign * numerator / divisor,
    denominator: Math.abs(denominator) / divisor,
  };
}

export function rationalFromDecimal(value: string): Rational {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (match === null) throw new RangeError("Invalid finite decimal.");
  const fraction = match[3] ?? "";
  const denominator = 10 ** fraction.length;
  const numerator = Number(`${match[2]}${fraction}`) * (match[1] === "-" ? -1 : 1);
  return rational(numerator, denominator);
}

export function addRational(left: Rational, right: Rational): Rational {
  return rational(
    left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator,
  );
}

export function subtractRational(left: Rational, right: Rational): Rational {
  return rational(
    left.numerator * right.denominator - right.numerator * left.denominator,
    left.denominator * right.denominator,
  );
}

export function multiplyRational(left: Rational, right: Rational): Rational {
  return rational(left.numerator * right.numerator, left.denominator * right.denominator);
}

export function divideRational(left: Rational, right: Rational): Rational | null {
  return right.numerator === 0
    ? null
    : rational(left.numerator * right.denominator, left.denominator * right.numerator);
}

export function compareRational(left: Rational, right: Rational): -1 | 0 | 1 {
  const difference = left.numerator * right.denominator - right.numerator * left.denominator;
  return difference < 0 ? -1 : difference > 0 ? 1 : 0;
}

export function equalRational(left: Rational, right: Rational): boolean {
  return compareRational(left, right) === 0;
}

export function rationalKey(value: Rational): string {
  return `${value.numerator}/${value.denominator}`;
}

export function formatRational(value: Rational): string {
  if (value.denominator === 1) return String(value.numerator);
  const decimalScale = [2, 4, 5, 8, 10, 20, 25, 40, 50, 100].includes(value.denominator);
  if (decimalScale) {
    const decimal = value.numerator / value.denominator;
    return String(Number(decimal.toFixed(4)));
  }
  return `${value.numerator}/${value.denominator}`;
}

export function isRational(value: unknown): value is Rational {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Rational>;
  if (
    !Number.isSafeInteger(candidate.numerator)
    || !Number.isSafeInteger(candidate.denominator)
    || Number(candidate.denominator) <= 0
  ) {
    return false;
  }
  const normalized = rational(Number(candidate.numerator), Number(candidate.denominator));
  return normalized.numerator === candidate.numerator && normalized.denominator === candidate.denominator;
}
