export type LengthUnit = 'mm' | 'cm' | 'm'

/** 各単位 → メートルへの換算係数 */
export const TO_METERS: Record<LengthUnit, number> = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
}

export const UNIT_LABELS: Record<LengthUnit, string> = {
  mm: 'mm',
  cm: 'cm',
  m: 'm',
}

export const LENGTH_UNITS: LengthUnit[] = ['mm', 'cm', 'm']

export function toMeters(value: number, unit: LengthUnit): number {
  return value * TO_METERS[unit]
}

export function fromMeters(meters: number, unit: LengthUnit): number {
  return meters / TO_METERS[unit]
}

/** oldUnit で表された値を newUnit に変換 */
export function convertLength(
  value: number,
  from: LengthUnit,
  to: LengthUnit,
): number {
  if (from === to) return value
  return fromMeters(toMeters(value, from), to)
}

export function areaUnitLabel(unit: LengthUnit): string {
  return `${unit}²`
}
