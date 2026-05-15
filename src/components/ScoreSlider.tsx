import { Slider } from "@/components/ui/slider";

interface ScoreSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  max?: number;
}

export default function ScoreSlider({ label, value, onChange, max = 100 }: ScoreSliderProps) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const color = pct >= 70 ? 'text-success' : pct >= 40 ? 'text-warning' : 'text-destructive';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`text-sm font-bold ${color}`}>{value} / {max}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        max={max}
        min={0}
        step={1}
        className="w-full"
      />
    </div>
  );
}
