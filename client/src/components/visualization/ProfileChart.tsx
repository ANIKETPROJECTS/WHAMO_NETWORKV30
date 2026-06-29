import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { SimulationNode } from "@/lib/out-parser";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  Play, Pause, RotateCcw, Info,
  Maximize2, X, ZoomIn, ZoomOut,
} from "lucide-react";

interface ProfileChartProps {
  nodes: SimulationNode[];
  units: "english" | "metric";
}

const MAX_SIM_FRAMES = 200;

function buildAnimFrame(nodes: SimulationNode[], tNorm: number): number[] {
  return nodes.map((n) => {
    const center = (n.maxEnergyElev + n.minEnergyElev) / 2;
    const amp = (n.maxEnergyElev - n.minEnergyElev) / 2;
    if (amp < 0.001) return center;
    const maxT = n.maxEnergyElevTime;
    const minT = n.minEnergyElevTime;
    const period = Math.abs(minT - maxT) * 2 || 200;
    const phaseShift = (2 * Math.PI * maxT) / period;
    const t = tNorm * period;
    return center + amp * Math.cos((2 * Math.PI * t) / period - phaseShift);
  });
}

function CustomTooltip({ active, payload, label, nodeLabels, units }: any) {
  if (!active || !payload || !payload.length) return null;
  const elevUnit = units === "metric" ? "m" : "ft";
  const nodeNum = nodeLabels?.[label] ?? label;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2.5 text-xs">
      <p className="font-semibold text-gray-700 mb-2">Node {nodeNum}</p>
      {payload.map((entry: any) => {
        if (entry.value == null) return null;
        return (
          <div key={entry.dataKey} className="flex items-center gap-2 py-0.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-500 w-28 shrink-0">{entry.name}</span>
            <span className="font-semibold text-gray-800">
              {typeof entry.value === "number"
                ? entry.value.toFixed(1)
                : entry.value}
              <span className="font-normal text-gray-400 ml-1">{elevUnit}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface ZoomDomain {
  x: [number, number];
  y: [number, number];
}

function FullscreenProfileChart({
  nodes,
  units,
  chartData,
  nodeLabels,
  xTicks,
  activeDomain,
  isStationary,
  hasPipe,
  showPipe,
  onTogglePipe,
  frame,
  playing,
  simTime,
  onPlayPause,
  onReset,
  onScrub,
  speed,
  onSetSpeed,
  onClose,
}: {
  nodes: SimulationNode[];
  units: "english" | "metric";
  chartData: any[];
  nodeLabels: Record<number, number>;
  xTicks: number[];
  activeDomain: [number, number];
  isStationary: boolean;
  hasPipe: boolean;
  showPipe: boolean;
  onTogglePipe: () => void;
  frame: number;
  playing: boolean;
  simTime: string;
  onPlayPause: () => void;
  onReset: () => void;
  onScrub: (f: number) => void;
  speed: number;
  onSetSpeed: (s: number) => void;
  onClose: () => void;
}) {
  const elevUnit = units === "metric" ? "m" : "ft";
  const fullXDomain: [number, number] = [0, nodes.length - 1];
  const fullYDomain: [number, number] = activeDomain;

  const [zoom, setZoom] = useState<ZoomDomain>({
    x: fullXDomain,
    y: fullYDomain,
  });

  useEffect(() => {
    setZoom({ x: fullXDomain, y: fullYDomain });
  }, [fullYDomain[0], fullYDomain[1], fullXDomain[1]]);

  const containerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const panStart = useRef<{ x: number; y: number; domain: ZoomDomain } | null>(null);

  const clampDomain = useCallback((domain: ZoomDomain): ZoomDomain => {
    const xRange = domain.x[1] - domain.x[0];
    const yRange = domain.y[1] - domain.y[0];
    const fullXRange = fullXDomain[1] - fullXDomain[0];
    const fullYRange = fullYDomain[1] - fullYDomain[0];

    let x0 = domain.x[0], x1 = domain.x[1];
    let y0 = domain.y[0], y1 = domain.y[1];

    if (x0 < fullXDomain[0]) { x0 = fullXDomain[0]; x1 = x0 + xRange; }
    if (x1 > fullXDomain[1]) { x1 = fullXDomain[1]; x0 = x1 - xRange; }
    if (x0 < fullXDomain[0]) x0 = fullXDomain[0];

    if (y0 < fullYDomain[0]) { y0 = fullYDomain[0]; y1 = y0 + yRange; }
    if (y1 > fullYDomain[1]) { y1 = fullYDomain[1]; y0 = y1 - yRange; }
    if (y0 < fullYDomain[0]) y0 = fullYDomain[0];

    const minXSpan = Math.max(fullXRange * 0.01, 1);
    const minYSpan = fullYRange * 0.01;
    if (x1 - x0 < minXSpan) { const mid = (x0 + x1) / 2; x0 = mid - minXSpan / 2; x1 = mid + minXSpan / 2; }
    if (y1 - y0 < minYSpan) { const mid = (y0 + y1) / 2; y0 = mid - minYSpan / 2; y1 = mid + minYSpan / 2; }

    return { x: [x0, x1], y: [y0, y1] };
  }, [fullXDomain, fullYDomain]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
    setZoom((prev) => {
      const xRange = prev.x[1] - prev.x[0];
      const yRange = prev.y[1] - prev.y[0];
      const mouseXPct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const mouseYPct = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
      const xFocal = prev.x[0] + mouseXPct * xRange;
      const yFocal = prev.y[0] + mouseYPct * yRange;
      const newXRange = xRange * factor;
      const newYRange = yRange * factor;
      return clampDomain({
        x: [xFocal - mouseXPct * newXRange, xFocal + (1 - mouseXPct) * newXRange],
        y: [yFocal - mouseYPct * newYRange, yFocal + (1 - mouseYPct) * newYRange],
      });
    });
  }, [clampDomain]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY, domain: zoom };
  }, [zoom]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current || !panStart.current) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dxPx = e.clientX - panStart.current.x;
    const dyPx = e.clientY - panStart.current.y;
    const xRange = panStart.current.domain.x[1] - panStart.current.domain.x[0];
    const yRange = panStart.current.domain.y[1] - panStart.current.domain.y[0];
    const dxData = -(dxPx / rect.width) * xRange;
    const dyData = (dyPx / rect.height) * yRange;
    setZoom(clampDomain({
      x: [panStart.current.domain.x[0] + dxData, panStart.current.domain.x[1] + dxData],
      y: [panStart.current.domain.y[0] + dyData, panStart.current.domain.y[1] + dyData],
    }));
  }, [clampDomain]);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
    panStart.current = null;
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  useEffect(() => {
    const up = () => { isPanning.current = false; panStart.current = null; };
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const resetZoom = () => setZoom({ x: fullXDomain, y: fullYDomain });

  const zoomIn = () => setZoom((prev) => {
    const xMid = (prev.x[0] + prev.x[1]) / 2;
    const yMid = (prev.y[0] + prev.y[1]) / 2;
    const newXR = (prev.x[1] - prev.x[0]) / 1.5;
    const newYR = (prev.y[1] - prev.y[0]) / 1.5;
    return clampDomain({ x: [xMid - newXR / 2, xMid + newXR / 2], y: [yMid - newYR / 2, yMid + newYR / 2] });
  });

  const zoomOut = () => setZoom((prev) => {
    const xMid = (prev.x[0] + prev.x[1]) / 2;
    const yMid = (prev.y[0] + prev.y[1]) / 2;
    const newXR = (prev.x[1] - prev.x[0]) * 1.5;
    const newYR = (prev.y[1] - prev.y[0]) * 1.5;
    return clampDomain({ x: [xMid - newXR / 2, xMid + newXR / 2], y: [yMid - newYR / 2, yMid + newYR / 2] });
  });

  const isZoomed =
    Math.abs(zoom.x[0] - fullXDomain[0]) > 0.001 ||
    Math.abs(zoom.x[1] - fullXDomain[1]) > 0.001 ||
    Math.abs(zoom.y[0] - fullYDomain[0]) > 0.001 ||
    Math.abs(zoom.y[1] - fullYDomain[1]) > 0.001;

  const filteredChartData = useMemo(() => {
    const x0 = Math.floor(zoom.x[0]);
    const x1 = Math.ceil(zoom.x[1]);
    return chartData.filter((d) => d.idx >= x0 && d.idx <= x1);
  }, [chartData, zoom.x]);

  const visibleXTicks = useMemo(() => {
    return xTicks.filter((t) => t >= Math.floor(zoom.x[0]) && t <= Math.ceil(zoom.x[1]));
  }, [xTicks, zoom.x]);

  const SPEEDS = [0.5, 1, 2, 4];

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col">
      <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-200 shrink-0 flex-wrap">
        <div className="shrink-0 mr-1">
          <span className="text-sm font-bold text-gray-900">Profile Graph — Simulation Summary</span>
        </div>
        <div className="w-px h-4 bg-gray-200 shrink-0" />
        <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
          {[
            { color: "#2563eb", label: `Max Energy Elev (${elevUnit})` },
            { color: "#dc2626", label: `Min Energy Elev (${elevUnit})` },
            ...(!isStationary ? [{ color: "#16a34a", label: "Current HGL" }] : []),
            ...(hasPipe && showPipe ? [{ color: "#9ca3af", label: "Pipe Centerline" }] : []),
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5 shrink-0">
              <div className="w-5 h-0.5 rounded" style={{ backgroundColor: item.color }} />
              <span className="text-[11px] text-gray-500">{item.label}</span>
            </div>
          ))}
          {hasPipe && (
            <button
              onClick={onTogglePipe}
              className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors shrink-0 ${
                showPipe
                  ? "border-gray-400 bg-gray-100 text-gray-700"
                  : "border-gray-200 bg-white text-gray-400 hover:text-gray-600"
              }`}
            >
              {showPipe ? "Hide" : "Show"} Pipe
            </button>
          )}
        </div>
        <div className="w-px h-4 bg-gray-200 shrink-0" />
        <div className="flex items-center gap-1 bg-gray-100 rounded-md p-0.5 shrink-0">
          <button onClick={zoomIn} className="flex items-center gap-1 px-2 py-1 rounded text-gray-600 hover:bg-white text-[11px] font-medium transition-colors">
            <ZoomIn className="w-3 h-3" /><span>In</span>
          </button>
          <button onClick={zoomOut} className="flex items-center gap-1 px-2 py-1 rounded text-gray-600 hover:bg-white text-[11px] font-medium transition-colors">
            <ZoomOut className="w-3 h-3" /><span>Out</span>
          </button>
          {isZoomed && (
            <button onClick={resetZoom} className="flex items-center gap-1 px-2 py-1 rounded text-amber-600 hover:bg-white text-[11px] font-medium transition-colors">
              <RotateCcw className="w-3 h-3" /><span>Reset</span>
            </button>
          )}
        </div>
        <button onClick={onClose} className="flex items-center gap-1 px-2 py-1 rounded-md text-gray-500 hover:bg-gray-100 text-[11px] font-medium transition-colors shrink-0">
          <X className="w-3.5 h-3.5" /><span>Close</span>
        </button>
      </div>

      <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-50 border-b border-gray-200 shrink-0 flex-wrap">
        <button
          onClick={onPlayPause}
          disabled={isStationary}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-white text-[11px] font-semibold transition-colors shrink-0 ${
            isStationary ? "bg-gray-300 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          {playing ? "Pause" : "Play"}
        </button>
        <button
          onClick={onReset}
          disabled={isStationary}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-colors shrink-0 border ${
            isStationary
              ? "bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed"
              : "bg-white border-gray-200 text-gray-600 hover:bg-gray-100"
          }`}
        >
          <RotateCcw className="w-3 h-3" />Reset
        </button>
        <span className="text-xs font-mono font-bold text-indigo-600 shrink-0">
          T&nbsp;=&nbsp;{isStationary ? "Steady State" : `${simTime} s`}
        </span>
        <div className="flex-1 min-w-[80px]">
          <input
            type="range"
            min={0} max={MAX_SIM_FRAMES} value={frame}
            disabled={isStationary}
            onChange={(e) => onScrub(Number(e.target.value))}
            className={`w-full h-1 cursor-pointer ${isStationary ? "opacity-30" : "accent-blue-500"}`}
          />
        </div>
        {!isStationary && (
          <span className="text-[10px] text-gray-400 shrink-0">
            {Math.round((frame / MAX_SIM_FRAMES) * 100)}%
          </span>
        )}
        <div className="flex items-center gap-0.5 shrink-0">
          <span className="text-[10px] text-gray-400 mr-1">Speed</span>
          {SPEEDS.map((s) => (
            <button key={s} onClick={() => onSetSpeed(s)}
              disabled={isStationary}
              className={`text-[11px] px-1.5 py-0.5 rounded font-semibold transition-colors disabled:opacity-30 ${
                speed === s ? "bg-indigo-600 text-white" : "bg-white border border-gray-200 text-gray-500 hover:border-gray-400"
              }`}>{s}×</button>
          ))}
        </div>
        <div className="w-px h-4 bg-gray-200 shrink-0" />
        <span className="text-[10px] text-gray-400 shrink-0">Scroll=zoom · Drag=pan · Esc=close</span>
        {isZoomed && (
          <span className="text-[10px] text-amber-600 shrink-0">
            · Nodes {Math.round(zoom.x[0])}–{Math.round(zoom.x[1])} · Y: {zoom.y[0].toFixed(0)}–{zoom.y[1].toFixed(0)} {elevUnit}
          </span>
        )}
      </div>

      <div
        ref={containerRef}
        className="flex-1 min-h-0 px-4 py-3 select-none bg-white"
        style={{ cursor: isPanning.current ? "grabbing" : "grab" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredChartData} margin={{ top: 16, right: 40, left: 16, bottom: 48 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="#f3f4f6" />
            <XAxis
              dataKey="idx" type="number" domain={zoom.x} ticks={visibleXTicks}
              tickFormatter={(idx) => String(nodeLabels[Math.round(idx)] ?? Math.round(idx))}
              tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={{ stroke: "#e5e7eb" }} tickLine={{ stroke: "#e5e7eb" }} interval={0}
              label={{ value: "Node (in pipeline order)", position: "insideBottom", offset: -24, style: { fontSize: 13, fill: "#6b7280" } }}
            />
            <YAxis
              domain={zoom.y} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={{ stroke: "#e5e7eb" }} tickLine={{ stroke: "#e5e7eb" }} width={76}
              tickFormatter={(v) => v.toLocaleString(undefined, { maximumFractionDigits: 1 })}
              label={{ value: `Elevation (${elevUnit})`, angle: -90, position: "insideLeft", offset: 16, style: { fontSize: 12, fill: "#6b7280" } }}
            />
            <Tooltip content={<CustomTooltip nodeLabels={nodeLabels} units={units} />} />
            {hasPipe && showPipe && (
              <Line type="stepAfter" dataKey="pipeElev" name="Pipe Centerline" stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="5 4" dot={false} activeDot={false} isAnimationActive={false} />
            )}
            <Line type="monotone" dataKey="maxElev" name="Max Energy Elevation" stroke="#2563eb" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "#2563eb" }} isAnimationActive={false} />
            <Line type="monotone" dataKey="minElev" name="Min Energy Elevation" stroke="#dc2626" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "#dc2626" }} isAnimationActive={false} />
            {!isStationary && (
              <Line type="monotone" dataKey="currentHGL" name="Current HGL" stroke="#16a34a" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#16a34a" }} isAnimationActive={false} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function ProfileChart({ nodes, units }: ProfileChartProps) {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const speedRef = useRef(1);
  const [speed, setSpeed] = useState(1);
  const elevUnit = units === "metric" ? "m" : "ft";
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isStationary = useMemo(() => {
    return nodes.every((n) => Math.abs(n.maxEnergyElev - n.minEnergyElev) < 0.01);
  }, [nodes]);

  const { chartData, nodeLabels } = useMemo(() => {
    const animFrame = buildAnimFrame(nodes, frame / MAX_SIM_FRAMES);
    const labels: Record<number, number> = {};
    const data = nodes.map((n, i) => {
      labels[i] = n.nodeNumber;
      return {
        idx: i,
        nodeNum: n.nodeNumber,
        maxElev: n.maxEnergyElev,
        minElev: n.minEnergyElev,
        pipeElev: n.pipeElevation ?? undefined,
        currentHGL: isStationary ? n.maxEnergyElev : animFrame[i],
      };
    });
    return { chartData: data, nodeLabels: labels };
  }, [nodes, frame, isStationary]);

  const animate = useCallback((timestamp: number) => {
    const elapsed = timestamp - lastTimeRef.current;
    if (elapsed > 50 / speedRef.current) {
      setFrame((f) => {
        const next = f + 1;
        if (next >= MAX_SIM_FRAMES) { setPlaying(false); return MAX_SIM_FRAMES; }
        return next;
      });
      lastTimeRef.current = timestamp;
    }
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (playing) {
      if (frame >= MAX_SIM_FRAMES) setFrame(0);
      lastTimeRef.current = performance.now();
      rafRef.current = requestAnimationFrame(animate);
    } else {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    }
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); };
  }, [playing, animate]);

  useEffect(() => { speedRef.current = speed; }, [speed]);

  const handlePlayPause = () => {
    if (isStationary) return;
    if (frame >= MAX_SIM_FRAMES) { setFrame(0); setPlaying(true); return; }
    setPlaying((p) => !p);
  };

  const handleReset = () => { setPlaying(false); setFrame(0); };

  const stats = useMemo(() => {
    if (!nodes.length) return null;
    return {
      peakMaxElev: Math.max(...nodes.map((n) => n.maxEnergyElev)),
      peakMinElev: Math.min(...nodes.map((n) => n.minEnergyElev)),
    };
  }, [nodes]);

  const simTime = useMemo(() => {
    const maxT = Math.max(...nodes.map((n) => Math.max(n.maxEnergyElevTime, n.minEnergyElevTime)));
    return ((frame / MAX_SIM_FRAMES) * (maxT || 300)).toFixed(1);
  }, [frame, nodes]);

  const hasPipe = nodes.some((n) => n.pipeElevation != null);
  const [showPipe, setShowPipe] = useState(false);

  const activeDomain = useMemo((): [number, number] => {
    const elevVals: number[] = [];
    nodes.forEach((n) => {
      elevVals.push(n.maxEnergyElev, n.minEnergyElev);
      if (showPipe && n.pipeElevation != null) elevVals.push(n.pipeElevation);
    });
    if (!elevVals.length) return [0, 100];
    const dataMin = Math.min(...elevVals);
    const dataMax = Math.max(...elevVals);
    const range = dataMax - dataMin;
    const pad = range < 1 ? 20 : Math.max(range * 0.12, 5);
    return [Math.floor((dataMin - pad) / 5) * 5, Math.ceil((dataMax + pad) / 5) * 5];
  }, [nodes, showPipe]);

  const xTicks = useMemo(() => {
    const step = nodes.length > 30 ? 2 : 1;
    return nodes.map((_, i) => i).filter((i) => i % step === 0 || i === nodes.length - 1);
  }, [nodes]);

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="text-base font-bold text-gray-900">Profile Graph — Simulation Summary</h3>
          <p className="text-xs text-gray-400 mt-0.5">Max/Min Energy Elevation envelopes + animated transient HGL</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {stats && (
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
              <div className="text-center">
                <div className="text-[10px] text-gray-400 uppercase tracking-wide">Peak Max</div>
                <div className="text-sm font-bold text-blue-600">{stats.peakMaxElev.toFixed(1)} <span className="font-normal text-gray-400 text-xs">{elevUnit}</span></div>
              </div>
              <div className="w-px h-6 bg-gray-200" />
              <div className="text-center">
                <div className="text-[10px] text-gray-400 uppercase tracking-wide">Peak Min</div>
                <div className="text-sm font-bold text-red-500">{stats.peakMinElev.toFixed(1)} <span className="font-normal text-gray-400 text-xs">{elevUnit}</span></div>
              </div>
            </div>
          )}
          <button
            onClick={() => setIsFullscreen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" /> Expand
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <button onClick={handlePlayPause} disabled={isStationary}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-white text-xs font-semibold transition-colors ${
            isStationary ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
          }`}>
          {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          {playing ? "Pause" : "Play"}
        </button>
        <button onClick={handleReset} disabled={isStationary}
          className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs transition-colors ${
            isStationary ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
          }`}>
          <RotateCcw className="w-3 h-3" />
        </button>
        <span className="text-xs font-mono font-bold text-indigo-600">
          T = {isStationary ? "Steady State" : `${simTime} s`}
        </span>
        <div className="flex-1 min-w-[80px]">
          <input type="range" min={0} max={MAX_SIM_FRAMES} value={frame} disabled={isStationary}
            onChange={(e) => { setPlaying(false); setFrame(Number(e.target.value)); }}
            className={`w-full h-1 cursor-pointer ${isStationary ? "opacity-20" : "accent-blue-500"}`}
          />
        </div>
        <div className="flex items-center gap-0.5">
          {[0.5, 1, 2, 4].map((s) => (
            <button key={s} onClick={() => setSpeed(s)} disabled={isStationary}
              className={`text-[11px] px-1.5 py-0.5 rounded font-semibold transition-colors disabled:opacity-30 ${
                speed === s ? "bg-indigo-600 text-white" : "bg-white border border-gray-200 text-gray-500"
              }`}>{s}×</button>
          ))}
        </div>
        {hasPipe && (
          <button onClick={() => setShowPipe((p) => !p)}
            className={`text-xs px-2 py-1 rounded-full border transition-colors ${
              showPipe ? "border-gray-400 bg-gray-100 text-gray-700" : "border-gray-200 text-gray-400 hover:text-gray-600"
            }`}>
            {showPipe ? "Hide Pipe" : "Show Pipe"}
          </button>
        )}
      </div>

      <div className="flex items-center gap-4 mb-4 flex-wrap">
        {[
          { color: "#2563eb", label: `Max Energy Elev (${elevUnit})` },
          { color: "#dc2626", label: `Min Energy Elev (${elevUnit})` },
          ...(!isStationary ? [{ color: "#16a34a", label: "Current HGL" }] : []),
          ...(hasPipe && showPipe ? [{ color: "#9ca3af", label: "Pipe Centerline" }] : []),
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="w-5 h-0.5 rounded" style={{ backgroundColor: item.color }} />
            <span className="text-[11px] text-gray-500">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 36 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="#f3f4f6" />
            <XAxis
              dataKey="idx" type="number" domain={[0, nodes.length - 1]} ticks={xTicks}
              tickFormatter={(idx) => String(nodeLabels[Math.round(idx)] ?? Math.round(idx))}
              tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={{ stroke: "#e5e7eb" }} tickLine={{ stroke: "#e5e7eb" }} interval={0}
              label={{ value: "Node (in pipeline order)", position: "insideBottom", offset: -20, style: { fontSize: 12, fill: "#6b7280" } }}
            />
            <YAxis
              domain={activeDomain} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={{ stroke: "#e5e7eb" }} tickLine={{ stroke: "#e5e7eb" }} width={72}
              tickFormatter={(v) => v.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              label={{ value: `Elevation (${elevUnit})`, angle: -90, position: "insideLeft", offset: 15, style: { fontSize: 11, fill: "#9ca3af" } }}
            />
            <Tooltip content={<CustomTooltip nodeLabels={nodeLabels} units={units} />} />
            {hasPipe && showPipe && (
              <Line type="stepAfter" dataKey="pipeElev" name="Pipe Centerline" stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="5 4" dot={false} activeDot={false} isAnimationActive={false} />
            )}
            <Line type="monotone" dataKey="maxElev" name="Max Energy Elevation" stroke="#2563eb" strokeWidth={2} dot={false} activeDot={{ r: 3, fill: "#2563eb" }} isAnimationActive={false} />
            <Line type="monotone" dataKey="minElev" name="Min Energy Elevation" stroke="#dc2626" strokeWidth={2} dot={false} activeDot={{ r: 3, fill: "#dc2626" }} isAnimationActive={false} />
            {!isStationary && (
              <Line type="monotone" dataKey="currentHGL" name="Current HGL" stroke="#16a34a" strokeWidth={1.5} dot={false} activeDot={{ r: 3, fill: "#16a34a" }} isAnimationActive={false} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {isFullscreen && (
        <FullscreenProfileChart
          nodes={nodes} units={units} chartData={chartData} nodeLabels={nodeLabels}
          xTicks={xTicks} activeDomain={activeDomain} isStationary={isStationary}
          hasPipe={hasPipe} showPipe={showPipe} onTogglePipe={() => setShowPipe((p) => !p)}
          frame={frame} playing={playing} simTime={simTime}
          onPlayPause={handlePlayPause} onReset={handleReset}
          onScrub={(f) => { setPlaying(false); setFrame(f); }}
          speed={speed} onSetSpeed={setSpeed}
          onClose={() => setIsFullscreen(false)}
        />
      )}
    </div>
  );
}
