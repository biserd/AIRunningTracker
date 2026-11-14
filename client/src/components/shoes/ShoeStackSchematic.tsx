import React, { useId } from "react";

export const hasStack = (value: number | null | undefined): value is number =>
  value != null && Number.isFinite(value) && value > 0;

const palettes = {
  orange: { fill: "#431c12", stroke: "#fb923c", label: "#fdba74" },
  sky: { fill: "#0c3046", stroke: "#38bdf8", label: "#7dd3fc" },
};

/** The profile is schematic; only the two labelled heights are to scale. */
export function ShoeStackSchematic({ heel, forefoot, scaleMax, tone = "orange", compact = false }: {
  heel: number; forefoot: number; scaleMax: number; tone?: keyof typeof palettes; compact?: boolean;
}) {
  const gridId = useId();
  const color = palettes[tone];
  const top = (v: number) => 169 - (v / scaleMax) * 103;
  const h = top(heel), f = top(forefoot);
  return <svg viewBox={compact ? "0 0 420 174" : "0 0 420 203"} className="mx-auto block w-full max-w-md"
    aria-hidden="true" data-stack-scale={scaleMax}>
    <defs><pattern id={gridId} width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#334155" strokeWidth="1" />
    </pattern></defs>
    <rect x="5" y="12" width="410" height="157" rx="12" fill={`url(#${gridId})`} />
    <path d={`M35 ${h-3} C37 ${h-58} 54 ${h-59} 78 ${h-47} L104 ${h-38} L137 ${h-56} Q155 ${h-61} 177 ${h-45} L237 ${f-17} Q270 ${f-9} 334 ${f-7} Q364 ${f-5} 383 ${f+3}`} fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="5 4" />
    <path d={`M35 ${h} L102 ${h} Q156 ${h} 203 ${(h+f)/2} T277 ${f} L364 ${f} Q390 ${f} 392 148 Q387 165 362 169 H59 Q35 169 35 146Z`} fill={color.fill} stroke={color.stroke} strokeWidth="2" />
    <path d="M24 169H399" stroke="#94a3b8" strokeWidth="1" />
    {([[80,heel,"Heel"],[304,forefoot,"Forefoot"]] as const).map(([x,v,label]) => <g key={label} stroke={color.label} fill={color.label}>
      <path d={`M${x-5} ${top(v)}h10 M${x} ${top(v)}V169 m-5 0h10`} fill="none" strokeWidth={compact ? "3" : "1.5"} />
      {!compact && <>
        <text x={x+9} y={(top(v)+169)/2+5} stroke="none" fontSize="15" fontWeight="700">{v} mm</text>
        <text x={x} y="190" stroke="none" fill="#cbd5e1" textAnchor="middle" fontSize="13">{label}</text>
      </>}
    </g>)}
  </svg>;
}
