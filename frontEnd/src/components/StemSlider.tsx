// // components/StemSlider.tsx
// import { Slider } from "@/components/ui/slider";  // shadcn re-export
// import { cn } from "@/lib/utils";                 // tailwind class helper

// interface Props {
//   stem: string;
//   pct: number;
//   onChange: (pct: number) => void;
// }

// export const StemSlider = ({ stem, pct, onChange }: Props) => (
//   <div className="flex items-center gap-3 py-2">
//     <span className="w-24 font-semibold">{stem.toUpperCase()}</span>
//     <Slider
//       value={[pct]}                // ← single-thumb
//       min={0}
//       max={100}
//       step={1}
//       className="w-full"
//       onValueChange={vals => onChange(vals[0])}
//     />
//     <span className="w-10 text-right tabular-nums">{pct}%</span>
//   </div>
// );
