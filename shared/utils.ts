/**
 * Unit conversion utilities for running metrics
 */

export type UnitSystem = 'km' | 'miles';

/**
 * Convert meters to feet
 */
export function metersToFeet(meters: number): number {
  return meters * 3.28084;
}

/**
 * Convert feet to meters
 */
export function feetToMeters(feet: number): number {
  return feet / 3.28084;
}

/**
 * Convert centimeters to inches
 */
export function cmToInches(cm: number): number {
  return cm * 0.393701;
}

/**
 * Convert inches to centimeters
 */
export function inchesToCm(inches: number): number {
  return inches / 0.393701;
}

/**
 * Format stride length with appropriate units
 */
export function formatStrideLength(meters: number, unitSystem: UnitSystem): string {
  if (unitSystem === 'miles') {
    const feet = metersToFeet(meters);
    return `${feet.toFixed(2)} ft`;
  }
  return `${meters.toFixed(2)} m`;
}

/**
 * Format vertical oscillation with appropriate units
 */
export function formatVerticalOscillation(cm: number, unitSystem: UnitSystem): string {
  if (unitSystem === 'miles') {
    const inches = cmToInches(cm);
    return `${inches.toFixed(2)} in`;
  }
  return `${cm.toFixed(1)} cm`;
}

/**
 * Get stride length unit label
 */
export function getStrideLengthUnit(unitSystem: UnitSystem): string {
  return unitSystem === 'miles' ? 'ft' : 'm';
}

/**
 * Get vertical oscillation unit label
 */
export function getVerticalOscillationUnit(unitSystem: UnitSystem): string {
  return unitSystem === 'miles' ? 'in' : 'cm';
}
