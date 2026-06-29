import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Info, Zap, BarChart2, ChevronDown, ChevronRight } from 'lucide-react';
import {
  PUMP_CURVE_LIBRARY,
  generatePcharFromCurves,
  formatPcharBlock,
  type PumpNsGroup,
} from '@/lib/pump-curves';
import type { PcharType } from '@/lib/store';

interface Props {
  pType: number;
  activePc: PcharType;
  updatePcharData: (pumpType: number, data: PcharType) => void;
}

const DEFAULT_MIN = -1.5;
const DEFAULT_MAX = 1.5;
const DEFAULT_STEP = 0.25;

function NumField({
  label, value, onChange, step = 'any', testId,
}: { label: string; value: string; onChange: (v: string) => void; step?: string; testId?: string }) {
  return (
    <div>
      <Label className="text-[10px]">{label}</Label>
      <input
        data-testid={testId}
        className="w-full h-7 border rounded px-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400 mt-0.5"
        type="number"
        step={step}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

/** Simple heatmap grid rendered as a table of colored cells */
function HeatmapGrid({
  matrix, rowLabels, colLabels, title,
}: { matrix: number[][]; rowLabels: number[]; colLabels: number[]; title: string }) {
  if (!matrix.length || !matrix[0].length) return null;

  const flat = matrix.flat();
  const minVal = Math.min(...flat);
  const maxVal = Math.max(...flat);
  const range = Math.max(Math.abs(minVal), Math.abs(maxVal), 1e-6);

  const cellColor = (v: number) => {
    const t = v / range; // -1 to 1
    if (t >= 0) {
      const r = Math.round(255 * (1 - t * 0.8));
      const g = Math.round(255 * (1 - t * 0.3));
      const b = Math.round(255 * (1 - t));
      return `rgb(${r},${g},${b})`;
    } else {
      const abs = -t;
      const r = Math.round(255 * (1 - abs));
      const g = Math.round(255 * (1 - abs * 0.3));
      const b = 255;
      return `rgb(${r},${g},${b})`;
    }
  };

  const textColor = (v: number) => Math.abs(v / range) > 0.6 ? '#fff' : '#1e293b';

  return (
    <div className="space-y-1">
      <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
      <div className="overflow-x-auto">
        <table className="text-[8px] font-mono border-collapse">
          <thead>
            <tr>
              <th className="px-1 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 font-medium">S\Q</th>
              {colLabels.map(q => (
                <th key={q} className="px-1 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 font-medium min-w-[28px]">
                  {q.toFixed(2)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, ri) => (
              <tr key={ri}>
                <td className="px-1 py-0.5 bg-slate-50 text-slate-600 border border-slate-200 font-medium">
                  {rowLabels[ri].toFixed(2)}
                </td>
                {row.map((v, ci) => (
                  <td
                    key={ci}
                    className="px-0.5 py-0.5 border border-slate-200 text-center"
                    style={{ backgroundColor: cellColor(v), color: textColor(v) }}
                  >
                    {v.toFixed(2)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PumpCurvePanel({ pType, activePc, updatePcharData }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedNsUS, setSelectedNsUS] = useState<number>(PUMP_CURVE_LIBRARY[0].nsUS);

  const [sMin, setSMin] = useState(String(DEFAULT_MIN));
  const [sMax, setSMax] = useState(String(DEFAULT_MAX));
  const [sStep, setSStep] = useState(String(DEFAULT_STEP));
  const [qMin, setQMin] = useState(String(DEFAULT_MIN));
  const [qMax, setQMax] = useState(String(DEFAULT_MAX));
  const [qStep, setQStep] = useState(String(DEFAULT_STEP));

  const [generated, setGenerated] = useState<ReturnType<typeof generatePcharFromCurves> | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);

  const nsGroup: PumpNsGroup = useMemo(
    () => PUMP_CURVE_LIBRARY.find(g => g.nsUS === selectedNsUS) ?? PUMP_CURVE_LIBRARY[0],
    [selectedNsUS]
  );

  const parseNum = (s: string, fallback: number) => {
    const v = parseFloat(s);
    return isNaN(v) ? fallback : v;
  };

  const liveGenerated = useMemo(() => {
    const opts = {
      nsGroup,
      sratioMin: parseNum(sMin, DEFAULT_MIN),
      sratioMax: parseNum(sMax, DEFAULT_MAX),
      sratioStep: Math.max(0.01, parseNum(sStep, DEFAULT_STEP)),
      qratioMin: parseNum(qMin, DEFAULT_MIN),
      qratioMax: parseNum(qMax, DEFAULT_MAX),
      qratioStep: Math.max(0.01, parseNum(qStep, DEFAULT_STEP)),
    };
    try {
      return generatePcharFromCurves(opts);
    } catch {
      return null;
    }
  }, [nsGroup, sMin, sMax, sStep, qMin, qMax, qStep]);

  const previewBlock = useMemo(() => {
    if (!liveGenerated) return null;
    return formatPcharBlock(liveGenerated, pType);
  }, [liveGenerated, pType]);

  const hasExistingData =
    activePc.sratio.length > 0 || activePc.qratio.length > 0 || activePc.hratio.length > 0;

  const handleGenerate = () => {
    if (hasExistingData && !confirmOverwrite) {
      setConfirmOverwrite(true);
      return;
    }
    doGenerate();
  };

  const doGenerate = () => {
    if (!liveGenerated) return;
    setGenerated(liveGenerated);
    updatePcharData(pType, {
      sratio: liveGenerated.sratio,
      qratio: liveGenerated.qratio,
      hratio: liveGenerated.hratio,
      tratio: liveGenerated.tratio,
    });
    setConfirmOverwrite(false);
  };

  return (
    <div className="border rounded-md overflow-hidden border-orange-200">
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold bg-orange-50 hover:bg-orange-100 transition-colors text-orange-800"
        onClick={() => setOpen(v => !v)}
        type="button"
        data-testid="btn-toggle-pchar-generator"
      >
        <span className="flex items-center gap-1.5">
          <BarChart2 className="h-3.5 w-3.5" />
          Auto PCHAR Generator
        </span>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>

      {open && (
        <div className="p-3 space-y-4 bg-white">
          <p className="text-[10px] text-muted-foreground italic">
            Auto-generate PCHAR TYPE {pType} from predefined four-quadrant pump curves. PCHAR TYPE {pType} data is global — shared across all pumps of this type.
          </p>

          {/* Specific Speed */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Specific Speed (Ns)</Label>
            <Select value={String(selectedNsUS)} onValueChange={v => setSelectedNsUS(Number(v))}>
              <SelectTrigger className="h-7 text-xs" data-testid="select-pump-ns">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PUMP_CURVE_LIBRARY.map(g => (
                  <SelectItem key={g.nsUS} value={String(g.nsUS)}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Grid Resolution */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">SRATIO Grid</Label>
            <div className="grid grid-cols-3 gap-1.5">
              <NumField label="Min" value={sMin} onChange={setSMin} testId="input-sratio-min" />
              <NumField label="Max" value={sMax} onChange={setSMax} testId="input-sratio-max" />
              <NumField label="Step" value={sStep} onChange={setSStep} step="0.01" testId="input-sratio-step" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">QRATIO Grid</Label>
            <div className="grid grid-cols-3 gap-1.5">
              <NumField label="Min" value={qMin} onChange={setQMin} testId="input-qratio-min" />
              <NumField label="Max" value={qMax} onChange={setQMax} testId="input-qratio-max" />
              <NumField label="Step" value={qStep} onChange={setQStep} step="0.01" testId="input-qratio-step" />
            </div>
          </div>

          {/* Grid summary */}
          {liveGenerated && (
            <div className="flex items-start gap-1.5 bg-slate-50 border border-slate-200 rounded px-2 py-1.5">
              <Info className="h-3 w-3 text-slate-400 mt-0.5 flex-shrink-0" />
              <p className="text-[10px] text-slate-500">
                Grid: <strong>{liveGenerated.sratio.length}</strong> SRATIO × <strong>{liveGenerated.qratio.length}</strong> QRATIO
                = <strong>{liveGenerated.sratio.length * liveGenerated.qratio.length}</strong> values each for HRATIO and TRATIO.
              </p>
            </div>
          )}

          {/* Overwrite warning */}
          {confirmOverwrite && (
            <div className="flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
              <Info className="h-3 w-3 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-[10px] text-amber-800">
                PCHAR TYPE {pType} already has data. This will <strong>overwrite</strong> existing values. Click again to confirm.
              </p>
            </div>
          )}

          {/* Generate button */}
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-7 text-[10px] flex-1 bg-orange-600 hover:bg-orange-700 text-white gap-1"
              onClick={handleGenerate}
              data-testid="btn-generate-pchar"
              type="button"
              disabled={!liveGenerated}
            >
              <Zap className="h-3 w-3" />
              {confirmOverwrite ? 'Confirm Overwrite' : 'Generate PCHAR From Curves'}
            </Button>
            {confirmOverwrite && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[10px]"
                onClick={() => setConfirmOverwrite(false)}
                type="button"
              >
                Cancel
              </Button>
            )}
          </div>

          {/* Preview block */}
          {previewBlock && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">
                  Generated PCHAR Block Preview
                </Label>
                <button
                  className="text-[10px] text-orange-600 hover:underline"
                  onClick={() => setShowHeatmap(v => !v)}
                  type="button"
                  data-testid="btn-toggle-heatmap"
                >
                  {showHeatmap ? 'Hide Heatmap' : 'Show Heatmap'}
                </button>
              </div>
              <pre
                data-testid="pre-pchar-preview"
                className="text-[9px] font-mono bg-slate-900 text-orange-300 p-2 rounded overflow-x-auto max-h-56 leading-relaxed"
              >
                {previewBlock}
              </pre>

              {showHeatmap && liveGenerated && (
                <div className="space-y-3 pt-1">
                  <HeatmapGrid
                    matrix={liveGenerated.hratio}
                    rowLabels={liveGenerated.sratio}
                    colLabels={liveGenerated.qratio}
                    title="HRATIO (Head Ratio) — rows = SRATIO, cols = QRATIO"
                  />
                  <HeatmapGrid
                    matrix={liveGenerated.tratio.reduce<number[][]>((acc, v, i) => {
                      const row = Math.floor(i / liveGenerated.qratio.length);
                      if (!acc[row]) acc[row] = [];
                      acc[row].push(v);
                      return acc;
                    }, [])}
                    rowLabels={liveGenerated.sratio}
                    colLabels={liveGenerated.qratio}
                    title="TRATIO (Torque Ratio) — rows = SRATIO, cols = QRATIO"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
