export type DecouplingClassification =
  | "Improved"
  | "Stable"
  | "Mild Fade"
  | "Moderate Fade"
  | "Significant Fade";

export interface AerobicDecouplingResult {
  decouplingPercent: number;
  firstHalfEfficiency: number;
  secondHalfEfficiency: number;
  classification: DecouplingClassification;
}
/**
 * Aerobic decoupling uses speed / heart-rate efficiency. Positive values mean
 * efficiency fell in the second half (fade); negative values mean it improved.
 */
export function calculateAerobicDecoupling(
  firstHalfSpeed: number,
  firstHalfHeartRate: number,
  secondHalfSpeed: number,
  secondHalfHeartRate: number,
): AerobicDecouplingResult {
  const values = [firstHalfSpeed, firstHalfHeartRate, secondHalfSpeed, secondHalfHeartRate];
  if (values.some((value) => !Number.isFinite(value) || value <= 0)) {
    throw new Error("Speed and heart-rate inputs must be positive, finite numbers");
  }

  const firstHalfEfficiency = firstHalfSpeed / firstHalfHeartRate;
  const secondHalfEfficiency = secondHalfSpeed / secondHalfHeartRate;
  const decouplingPercent = (1 - secondHalfEfficiency / firstHalfEfficiency) * 100;

  if (!Number.isFinite(decouplingPercent)) {
    throw new Error("Unable to calculate aerobic decoupling from these inputs");
  }

  return {
    decouplingPercent,
    firstHalfEfficiency,
    secondHalfEfficiency,
    classification: classifyAerobicDecoupling(decouplingPercent),
  };
}

export function classifyAerobicDecoupling(value: number): DecouplingClassification {
  if (!Number.isFinite(value)) throw new Error("Decoupling must be finite");
  if (value < -3) return "Improved";
  if (value <= 3) return "Stable";
  if (value <= 5) return "Mild Fade";
  if (value <= 8) return "Moderate Fade";
  return "Significant Fade";
}
