import {
  useState, useMemo, useEffect, useRef, useCallback,
} from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  Play, Pause, SkipBack, SkipForward,
  ChevronDown, ChevronUp, Maximize2, X, ZoomIn, ZoomOut, RotateCcw,
} from "lucide-react";
import type { HistoryData, HistoryNode, HistoryChannel } from "@/lib/history-parser";

// ─── constants ──────────────────────────────────────────────────────────────
const PALETTE = [
  "#2563eb", "#16a34a", "#7c3aed", "#ea580c",
  "#0891b2", "#db2777", "#ca8a04", "#059669",
  "#9333ea", "#0d9488", "#dc2626", "#1d4ed8",
];

const SPEEDS = [1, 2, 4, 8];

function playStepPerMs(timeRange: number, speed: number) {
  return (timeRange / 12000) * speed;
}

// ─── helpers ─────────────────────────────────────────────────────────────────
function formatUnit(u: string) {
  const m: Record<string, string> = {
    FEET: "ft", FT: "ft", METERS: "m", M: "m",
    CFS: "cfs", CMS: "cms", FPS: "fps", MPS: "mps",
  };
  return m[u?.toUpperCase()] ?? u ?? "";
}

function getValueAt(data: { time: number; value: number }[], t: number): number | null {
  if (!data.length) return null;
  let lo = 0, hi = data.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    if (data[mid].time <= t) lo = mid; else hi = mid - 1;
  }
  if (data[lo].time > t) return null;
  if (lo === data.length - 1 || data[lo + 1] === undefined) return data[lo].value;
  const t0 = data[lo].time, t1 = data[lo + 1].time;
  const v0 = data[lo].value, v1 = data[lo + 1].value;
  return v0 + ((t - t0) / (t1 - t0)) * (v1 - v0);
}

function downsample(
  data: { time: number; value: number }[], max: number
): { time: number; value: number }[] {
  if (data.length <= max) return data;
  const step = Math.ceil(data.length / max);
  const out: typeof data = [];
  for (let i = 0; i < data.length; i += step) out.push(data[i]);
  if (out[out.length - 1] !== data[data.length - 1]) out.push(data[data.length - 1]);
  return out;
}

// ─── sub-components ──────────────────────────────────────────────────────────
function NodeStatCard({
  node, channel, currentTime, color,
}: {
  node: HistoryNode;
  channel: HistoryChannel;
  currentTime: number;
  color: string;
}) {
  const unit = formatUnit(channel.unit);
  const current = getValueAt(channel.data, currentTime);
  const max = useMemo(() => Math.max(...channel.data.map((d) => d.value)), [channel]);
  const min = useMemo(() => Math.min(...channel.data.map((d) => d.value)), [channel]);

  return (
    <div
      className="w-[148px] shrink-0 bg-gray-50 rounded-lg px-3 py-2.5 border-l-2"
      style={{ borderLeftColor: color }}
    >
      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
        {node.label}
      </div>
      <div className="text-xs font-medium text-gray-500 mb-1 truncate">
        {channel.metric.replace(/\.$/, "")}
      </div>
      <div className="text-lg font-bold text-gray-900 leading-none">
        {current != null ? current.toFixed(2) : "—"}
        <span className="text-xs font-normal text-gray-400 ml-1">{unit}</span>
      </div>
      <div className="text-[10px] text-gray-400 mt-1">
        max {max.toFixed(1)} / min {min.toFixed(1)} {unit}
      </div>
    </div>
  );
}

// ─── raw data table ──────────────────────────────────────────────────────────
const PAGE_SIZE = 100;

function RawDataTable({
  data, metric, selectedNodeIds,
}: {
  data: HistoryData;
  metric: string;
  selectedNodeIds: Set<string>;
}) {
  const [page, setPage] = useState(0);

  const nodes = useMemo(
    () => data.nodes.filter((n) => selectedNodeIds.has(n.id)),
    [data.nodes, selectedNodeIds]
  );

  const nodeChannels = useMemo(
    () =>
      nodes.map((n) => ({
        node: n,
        ch: n.channels.find((c) => c.metric === metric) ?? null,
      })).filter((x) => x.ch !== null),
    [nodes, metric]
  );

  const allTimes = useMemo(() => {
    const set = new Set<number>();
    nodeChannels.forEach(({ ch }) => ch!.data.forEach((d) => set.add(d.time)));
    return Array.from(set).sort((a, b) => a - b);
  }, [nodeChannels]);

  const totalPages = Math.ceil(allTimes.length / PAGE_SIZE);
  const pageTimes = allTimes.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (!nodeChannels.length) {
    return <p className="text-sm text-gray-400 py-4 text-center">No data for selected nodes / metric.</p>;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 text-gray-500 font-semibold sticky left-0 bg-white">Time (s)</th>
              {nodeChannels.map(({ node, ch }) => (
                <th key={node.id} className="text-right py-2 px-3 text-gray-500 font-semibold whitespace-nowrap">
                  {node.label} ({formatUnit(ch!.unit)})
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageTimes.map((t) => (
              <tr key={t} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-1.5 px-3 text-gray-600 font-mono sticky left-0 bg-white">{t.toFixed(2)}</td>
                {nodeChannels.map(({ node, ch }) => {
                  const pt = ch!.data.find((d) => d.time === t);
                  return (
                    <td key={node.id} className="py-1.5 px-3 text-right font-mono text-gray-700">
                      {pt ? pt.value.toFixed(4) : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-3 border-t border-gray-100">
          <span className="text-xs text-gray-400">
            {allTimes.length.toLocaleString()} total rows · Page {page + 1} / {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="text-xs px-3 py-1 rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-50"
            >Previous</button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="text-xs px-3 py-1 rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-50"
            >Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── fullscreen chart ─────────────────────────────────────────────────────────
interface ZoomDomain {
  x: [number, number];
  y: [number, number];
}

function FullscreenChart({
  chartData,
  activeNodes,
  nodeColors,
  selectedMetric,
  activeUnit,
  currentTime,
  fullXDomain,
  fullYDomain,
  hasRange,
  globalMax,
  globalMin,
  summaryTitle,
  onClose,
  data,
  selectedNodeIds,
  onToggleNode,
  onToggleAll,
  allNodesSelected,
  allMetrics,
  onSetMetric,
  isPlaying,
  onPlayPause,
  speed,
  onSetSpeed,
  onSetCurrentTime,
  timeMin,
  timeMax,
  sliderPct,
}: {
  chartData: Record<string, number>[];
  activeNodes: HistoryNode[];
  nodeColors: Map<string, string>;
  selectedMetric: string;
  activeUnit: string;
  currentTime: number;
  fullXDomain: [number, number];
  fullYDomain: [number, number];
  hasRange: boolean;
  globalMax: number;
  globalMin: number;
  summaryTitle?: string;
  onClose: () => void;
  data: HistoryData;
  selectedNodeIds: Set<string>;
  onToggleNode: (id: string) => void;
  onToggleAll: () => void;
  allNodesSelected: boolean;
  allMetrics: string[];
  onSetMetric: (m: string) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  speed: number;
  onSetSpeed: (s: number) => void;
  onSetCurrentTime: (t: number) => void;
  timeMin: number;
  timeMax: number;
  sliderPct: number;
}) {
  const [zoom, setZoom] = useState<ZoomDomain>({
    x: fullXDomain,
    y: fullYDomain,
  });

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

    const minXSpan = fullXRange * 0.01;
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
    panStart.current = {
      x: e.clientX,
      y: e.clientY,
      domain: zoom,
    };
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

  // Reset zoom when metric or node selection changes (domain shifts)
  useEffect(() => {
    setZoom({ x: fullXDomain, y: fullYDomain });
  }, [fullYDomain[0], fullYDomain[1]]);

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
    return chartData.filter(
      (d) => (d.time as number) >= zoom.x[0] && (d.time as number) <= zoom.x[1]
    );
  }, [chartData, zoom.x]);

  const metricLabel = selectedMetric.replace(/\.$/, "");

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col">

      {/* ── Compact header: title · nodes · params · zoom · close — single row ── */}
      <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-200 shrink-0 flex-wrap">
        {/* Title */}
        <div className="shrink-0 mr-1">
          <span className="text-sm font-bold text-gray-900">{metricLabel} vs Time</span>
          {summaryTitle && (
            <span className="text-[10px] text-gray-400 ml-2">{summaryTitle}</span>
          )}
        </div>

        <div className="w-px h-4 bg-gray-200 shrink-0" />

        {/* Node pills */}
        <div className="flex items-center gap-1 flex-wrap flex-1 min-w-0">
          <button
            onClick={onToggleAll}
            className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border transition-all shrink-0 ${
              allNodesSelected
                ? "bg-gray-900 text-white border-gray-900"
                : "border-gray-300 text-gray-500 bg-white hover:border-gray-500"
            }`}
          >All</button>
          {data.nodes.map((node) => {
            const active = selectedNodeIds.has(node.id);
            const color = nodeColors.get(node.id)!;
            return (
              <button
                key={node.id}
                onClick={() => onToggleNode(node.id)}
                className="text-[11px] px-2 py-0.5 rounded-full font-semibold border transition-all shrink-0"
                style={
                  active
                    ? { backgroundColor: color, borderColor: color, color: "#fff" }
                    : { borderColor: "#d1d5db", color: "#6b7280", backgroundColor: "#fff" }
                }
              >
                {node.label.replace("Node ", "N-").replace("Element ", "E-")}
              </button>
            );
          })}
        </div>

        <div className="w-px h-4 bg-gray-200 shrink-0" />

        {/* Parameter pills */}
        <div className="flex items-center gap-1 shrink-0 flex-wrap">
          {allMetrics.map((m) => (
            <button
              key={m}
              onClick={() => onSetMetric(m)}
              className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border transition-all ${
                selectedMetric === m
                  ? "bg-blue-500 text-white border-blue-500"
                  : "border-gray-300 text-gray-500 bg-white hover:border-blue-300"
              }`}
            >
              {m.replace(/\.$/, "")}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-gray-200 shrink-0" />

        {/* Zoom controls */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-md p-0.5 shrink-0">
          <button onClick={zoomIn} title="Zoom in"
            className="flex items-center gap-1 px-2 py-1 rounded text-gray-600 hover:bg-white text-[11px] font-medium transition-colors">
            <ZoomIn className="w-3 h-3" /><span>In</span>
          </button>
          <button onClick={zoomOut} title="Zoom out"
            className="flex items-center gap-1 px-2 py-1 rounded text-gray-600 hover:bg-white text-[11px] font-medium transition-colors">
            <ZoomOut className="w-3 h-3" /><span>Out</span>
          </button>
          {isZoomed && (
            <button onClick={resetZoom} title="Reset zoom"
              className="flex items-center gap-1 px-2 py-1 rounded text-amber-600 hover:bg-white text-[11px] font-medium transition-colors">
              <RotateCcw className="w-3 h-3" /><span>Reset</span>
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-gray-500 hover:bg-gray-100 text-[11px] font-medium transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5" /><span>Close</span>
        </button>
      </div>

      {/* ── Playback bar ── */}
      <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-50 border-b border-gray-200 shrink-0 flex-wrap">
        <span className="text-xs font-mono font-bold text-indigo-600 shrink-0 w-24">
          t&nbsp;=&nbsp;{currentTime.toFixed(1)}&nbsp;s
        </span>

        <button onClick={onPlayPause}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-[11px] font-semibold transition-colors shrink-0">
          {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button onClick={() => onSetCurrentTime(timeMin)}
          className="flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 bg-white text-[11px] text-gray-600 hover:bg-gray-100 shrink-0">
          <SkipBack className="w-3 h-3" />Start
        </button>
        <button onClick={() => onSetCurrentTime(timeMax)}
          className="flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 bg-white text-[11px] text-gray-600 hover:bg-gray-100 shrink-0">
          End<SkipForward className="w-3 h-3" />
        </button>

        <div className="flex items-center gap-0.5 shrink-0">
          <span className="text-[10px] text-gray-400 mr-1">Speed</span>
          {SPEEDS.map((s) => (
            <button key={s} onClick={() => onSetSpeed(s)}
              className={`text-[11px] px-1.5 py-0.5 rounded font-semibold transition-colors ${
                speed === s ? "bg-indigo-600 text-white" : "bg-white border border-gray-200 text-gray-500 hover:border-gray-400"
              }`}>{s}×</button>
          ))}
        </div>

        <div className="flex-1 min-w-[80px]">
          <input type="range" min={0} max={100} step={0.01} value={sliderPct}
            onChange={(e) => {
              const pct = Number(e.target.value) / 100;
              onSetCurrentTime(timeMin + pct * (timeMax - timeMin));
            }}
            className="w-full accent-indigo-500 h-1 cursor-pointer"
          />
        </div>

        <span className="text-[10px] text-gray-400 shrink-0">0–{timeMax.toFixed(0)} s</span>

        <div className="w-px h-4 bg-gray-200 shrink-0" />

        {/* Hint + zoom range */}
        <span className="text-[10px] text-gray-400 shrink-0">Scroll=zoom · Drag=pan · Esc=close</span>
        {isZoomed && (
          <span className="text-[10px] text-amber-600 shrink-0">
            · X: {zoom.x[0].toFixed(0)}–{zoom.x[1].toFixed(0)} s · Y: {zoom.y[0].toFixed(0)}–{zoom.y[1].toFixed(0)} {activeUnit}
          </span>
        )}

        {/* Node legend */}
        <div className="flex gap-2.5 ml-auto overflow-x-auto">
          {activeNodes.map((node) => (
            <div key={node.id} className="flex items-center gap-1 shrink-0">
              <div className="w-3.5 h-0.5 rounded" style={{ backgroundColor: nodeColors.get(node.id) }} />
              <span className="text-[10px] text-gray-500 whitespace-nowrap">{node.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 px-4 py-4 select-none bg-white"
        style={{ cursor: isPanning.current ? "grabbing" : "grab" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={filteredChartData}
            margin={{ top: 16, right: 40, left: 16, bottom: 48 }}
          >
            <CartesianGrid strokeDasharray="4 4" stroke="#f3f4f6" />
            <XAxis
              dataKey="time"
              type="number"
              domain={zoom.x}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={{ stroke: "#e5e7eb" }}
              tickLine={{ stroke: "#e5e7eb" }}
              tickFormatter={(v) => String(Math.round(v))}
              interval="preserveStartEnd"
              label={{
                value: "Time (seconds)",
                position: "insideBottom",
                offset: -24,
                style: { fontSize: 13, fill: "#6b7280" },
              }}
            />
            <YAxis
              domain={zoom.y}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={{ stroke: "#e5e7eb" }}
              tickLine={{ stroke: "#e5e7eb" }}
              width={80}
              tickFormatter={(v) => v.toLocaleString(undefined, { maximumFractionDigits: 1 })}
              label={{
                value: activeUnit,
                angle: -90,
                position: "insideLeft",
                offset: 16,
                style: { fontSize: 12, fill: "#9ca3af" },
              }}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: "8px 12px",
                backgroundColor: "#ffffff",
                boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
                color: "#111827",
              }}
              labelStyle={{ color: "#6b7280" }}
              labelFormatter={(t) => `t = ${Number(t).toFixed(2)} s`}
              formatter={(v: number, name: string) => [
                `${v.toFixed(3)} ${activeUnit}`,
                name.replace("NODE ", "Node ").replace("ELEMENT ", "Element "),
              ]}
            />

            {hasRange && (
              <>
                <ReferenceLine y={globalMax} stroke="#f87171" strokeDasharray="6 3" strokeWidth={1.5} />
                <ReferenceLine y={globalMin} stroke="#93c5fd" strokeDasharray="6 3" strokeWidth={1.5} />
              </>
            )}

            <ReferenceLine
              x={currentTime}
              stroke="#818cf8"
              strokeWidth={2}
              strokeDasharray="4 4"
            />

            {activeNodes.map((node) => (
              <Line
                key={node.id}
                type="monotone"
                dataKey={node.id}
                name={node.id}
                stroke={nodeColors.get(node.id)}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, fill: nodeColors.get(node.id) }}
                isAnimationActive={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
interface HistoryGraphProps {
  data: HistoryData;
  summaryTitle?: string;
}

export default function HistoryGraph({ data, summaryTitle }: HistoryGraphProps) {
  const allMetrics = useMemo(() => {
    const s = new Set<string>();
    data.nodes.forEach((n) => n.channels.forEach((c) => s.add(c.metric)));
    return Array.from(s);
  }, [data.nodes]);

  const [selectedMetric, setSelectedMetric] = useState(allMetrics[0] ?? "");
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(
    () => new Set(data.nodes.map((n) => n.id))
  );
  const [currentTime, setCurrentTime] = useState(data.timeMin);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showRawData, setShowRawData] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);
  const speedRef = useRef(speed);
  const timeRangeRef = useRef(data.timeMax - data.timeMin);

  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { timeRangeRef.current = data.timeMax - data.timeMin; }, [data]);

  const animate = useCallback((ts: number) => {
    const dt = ts - lastTsRef.current;
    lastTsRef.current = ts;
    setCurrentTime((t) => {
      const next = t + dt * playStepPerMs(timeRangeRef.current, speedRef.current);
      if (next >= data.timeMax) {
        setIsPlaying(false);
        return data.timeMax;
      }
      return next;
    });
    rafRef.current = requestAnimationFrame(animate);
  }, [data.timeMax]);

  useEffect(() => {
    if (isPlaying) {
      if (currentTime >= data.timeMax) setCurrentTime(data.timeMin);
      lastTsRef.current = performance.now();
      rafRef.current = requestAnimationFrame(animate);
    } else {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    }
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); };
  }, [isPlaying, animate, data.timeMax, data.timeMin]);

  const handlePlayPause = () => {
    if (currentTime >= data.timeMax) {
      setCurrentTime(data.timeMin);
      setIsPlaying(true);
    } else {
      setIsPlaying((p) => !p);
    }
  };

  const toggleNode = (id: string) => {
    setSelectedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size === 1) return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const allNodesSelected = data.nodes.every((n) => selectedNodeIds.has(n.id));
  const toggleAll = () =>
    setSelectedNodeIds(
      allNodesSelected ? new Set([data.nodes[0]?.id ?? ""]) : new Set(data.nodes.map((n) => n.id))
    );

  const nodeColors = useMemo(
    () => new Map(data.nodes.map((n, i) => [n.id, PALETTE[i % PALETTE.length]])),
    [data.nodes]
  );

  const activeNodes = useMemo(
    () =>
      data.nodes.filter(
        (n) => selectedNodeIds.has(n.id) && n.channels.some((c) => c.metric === selectedMetric)
      ),
    [data.nodes, selectedNodeIds, selectedMetric]
  );

  const chartData = useMemo(() => {
    const map = new Map<number, Record<string, number>>();
    for (const node of activeNodes) {
      const ch = node.channels.find((c) => c.metric === selectedMetric);
      if (!ch) continue;
      for (const pt of downsample(ch.data, 800)) {
        if (!map.has(pt.time)) map.set(pt.time, { time: pt.time });
        map.get(pt.time)![node.id] = pt.value;
      }
    }
    return Array.from(map.values()).sort((a, b) => (a.time as number) - (b.time as number));
  }, [activeNodes, selectedMetric]);

  const yDomain = useMemo((): [number, number] => {
    const vals: number[] = [];
    for (const node of activeNodes) {
      const ch = node.channels.find((c) => c.metric === selectedMetric);
      if (ch) ch.data.forEach((d) => vals.push(d.value));
    }
    if (!vals.length) return [0, 1];
    const mn = Math.min(...vals), mx = Math.max(...vals);
    const range = mx - mn;
    const pad = range < 0.01 ? Math.abs(mx * 0.05) + 1 : range * 0.1;
    return [Math.floor((mn - pad) * 10) / 10, Math.ceil((mx + pad) * 10) / 10];
  }, [activeNodes, selectedMetric]);

  const globalMax = yDomain[1] - (yDomain[1] - yDomain[0]) * 0.1;
  const globalMin = yDomain[0] + (yDomain[1] - yDomain[0]) * 0.1;
  const hasRange = yDomain[1] - yDomain[0] > 0.5;

  const activeUnit = useMemo(() => {
    for (const node of data.nodes) {
      const ch = node.channels.find((c) => c.metric === selectedMetric);
      if (ch) return formatUnit(ch.unit);
    }
    return "";
  }, [data.nodes, selectedMetric]);

  const sliderPct = data.timeMax > data.timeMin
    ? ((currentTime - data.timeMin) / (data.timeMax - data.timeMin)) * 100
    : 0;

  const metricLabel = selectedMetric.replace(/\.$/, "");

  return (
    <div className="flex flex-col gap-0">

      {/* ── Controls bar ── */}
      <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-3">
        {/* Row 1: nodes + parameter */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Node pills */}
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
              Select Nodes
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={toggleAll}
                className={`text-xs px-2.5 py-1 rounded-full font-semibold border transition-all ${
                  allNodesSelected
                    ? "bg-gray-900 text-white border-gray-900"
                    : "border-gray-300 text-gray-500 bg-white hover:border-gray-500"
                }`}
              >All</button>
              {data.nodes.map((node) => {
                const active = selectedNodeIds.has(node.id);
                const color = nodeColors.get(node.id)!;
                return (
                  <button
                    key={node.id}
                    onClick={() => toggleNode(node.id)}
                    className="text-xs px-2.5 py-1 rounded-full font-semibold border transition-all"
                    style={
                      active
                        ? { backgroundColor: color, borderColor: color, color: "#fff" }
                        : { borderColor: "#d1d5db", color: "#6b7280", backgroundColor: "#fff" }
                    }
                  >
                    {node.label.replace("Node ", "N-").replace("Element ", "E-")}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Parameter pills */}
          <div className="shrink-0">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
              Parameter
            </span>
            <div className="flex flex-wrap gap-1.5">
              {allMetrics.map((m) => (
                <button
                  key={m}
                  onClick={() => setSelectedMetric(m)}
                  className={`text-xs px-3 py-1 rounded-full font-semibold border transition-all ${
                    selectedMetric === m
                      ? "bg-blue-500 text-white border-blue-500 shadow-sm"
                      : "border-gray-300 text-gray-500 bg-white hover:border-blue-300"
                  }`}
                >
                  {m.replace(/\.$/, "")}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: playback */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest shrink-0">
            History Playback
          </span>
          <span className="text-sm font-mono font-bold text-indigo-600 shrink-0 w-28">
            t&nbsp;=&nbsp;{currentTime.toFixed(1)}&nbsp;s
          </span>

          <button
            onClick={handlePlayPause}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold shadow-sm transition-colors shrink-0"
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            onClick={() => { setIsPlaying(false); setCurrentTime(data.timeMin); }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs text-gray-600 hover:bg-gray-50 shrink-0"
          >
            <SkipBack className="w-3 h-3" /> Start
          </button>
          <button
            onClick={() => { setIsPlaying(false); setCurrentTime(data.timeMax); }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs text-gray-600 hover:bg-gray-50 shrink-0"
          >
            End <SkipForward className="w-3 h-3" />
          </button>

          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] text-gray-400">Speed</span>
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`text-xs px-2 py-1 rounded font-semibold transition-colors ${
                  speed === s
                    ? "bg-indigo-600 text-white"
                    : "bg-white border border-gray-200 text-gray-500 hover:border-gray-400"
                }`}
              >
                {s}×
              </button>
            ))}
          </div>

          <div className="flex-1 min-w-[120px]">
            <input
              type="range"
              min={0} max={100} step={0.01}
              value={sliderPct}
              onChange={(e) => {
                setIsPlaying(false);
                const pct = Number(e.target.value) / 100;
                setCurrentTime(data.timeMin + pct * (data.timeMax - data.timeMin));
              }}
              className="w-full accent-indigo-500 h-1.5 cursor-pointer"
            />
          </div>

          <span className="text-[10px] text-gray-400 shrink-0">
            0 – {data.timeMax.toFixed(0)} s
          </span>
        </div>
      </div>

      {/* ── Chart ── */}
      <div className="bg-white border border-gray-100 rounded-xl mt-4 p-4 shadow-sm">
        {/* Chart title */}
        <div className="mb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-gray-900">
                {activeNodes.length > 0
                  ? `${metricLabel} vs Time`
                  : "No nodes selected"}
              </h4>
              {summaryTitle && (
                <p className="text-[11px] text-gray-400 mt-0.5 truncate">{summaryTitle}</p>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {hasRange && (
                <>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-0 border-t-2 border-dashed border-red-400" />
                    <span className="text-xs text-gray-400">Max env.</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-0 border-t-2 border-dashed border-blue-300" />
                    <span className="text-xs text-gray-400">Min env.</span>
                  </div>
                </>
              )}
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0 border-t-2 border-dashed border-indigo-400" />
                <span className="text-xs text-gray-400">t cursor</span>
              </div>

              {/* Fullscreen button */}
              <button
                onClick={() => setIsFullscreen(true)}
                title="Open fullscreen view"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors font-medium"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                Fullscreen
              </button>
            </div>
          </div>
          {/* Scrollable node color key */}
          {activeNodes.length > 0 && (
            <div className="flex gap-3 mt-2 overflow-x-auto pb-1 scrollbar-thin">
              {activeNodes.map((node) => (
                <div key={node.id} className="flex items-center gap-1.5 shrink-0">
                  <div className="w-4 h-0.5 rounded" style={{ backgroundColor: nodeColors.get(node.id) }} />
                  <span className="text-[11px] text-gray-500 whitespace-nowrap">{node.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <ResponsiveContainer width="100%" height={480}>
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 36 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="#f3f4f6" />
            <XAxis
              dataKey="time"
              type="number"
              domain={[data.timeMin, data.timeMax]}
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              axisLine={{ stroke: "#e5e7eb" }}
              tickLine={{ stroke: "#e5e7eb" }}
              tickFormatter={(v) => String(Math.round(v))}
              interval="preserveStartEnd"
              label={{
                value: "Time (seconds)",
                position: "insideBottom",
                offset: -20,
                style: { fontSize: 12, fill: "#6b7280" },
              }}
            />
            <YAxis
              domain={yDomain}
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              axisLine={{ stroke: "#e5e7eb" }}
              tickLine={{ stroke: "#e5e7eb" }}
              width={72}
              tickFormatter={(v) => v.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              label={{
                value: activeUnit,
                angle: -90,
                position: "insideLeft",
                offset: 15,
                style: { fontSize: 11, fill: "#9ca3af" },
              }}
            />
            <Tooltip
              contentStyle={{
                fontSize: 11,
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: "8px 12px",
                boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
              }}
              labelFormatter={(t) => `t = ${Number(t).toFixed(2)} s`}
              formatter={(v: number, name: string) => [
                `${v.toFixed(3)} ${activeUnit}`,
                name.replace("NODE ", "Node ").replace("ELEMENT ", "Element "),
              ]}
            />

            {hasRange && (
              <>
                <ReferenceLine
                  y={globalMax}
                  stroke="#f87171"
                  strokeDasharray="6 3"
                  strokeWidth={1.5}
                />
                <ReferenceLine
                  y={globalMin}
                  stroke="#93c5fd"
                  strokeDasharray="6 3"
                  strokeWidth={1.5}
                />
              </>
            )}

            <ReferenceLine
              x={currentTime}
              stroke="#6366f1"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />

            {activeNodes.map((node) => (
              <Line
                key={node.id}
                type="monotone"
                dataKey={node.id}
                name={node.id}
                stroke={nodeColors.get(node.id)}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: nodeColors.get(node.id) }}
                isAnimationActive={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Live node stats — horizontal scroll, never wraps ── */}
      {activeNodes.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <div className="flex gap-3 pb-2" style={{ minWidth: "max-content" }}>
            {activeNodes.map((node) => {
              const ch = node.channels.find((c) => c.metric === selectedMetric);
              if (!ch) return null;
              return (
                <NodeStatCard
                  key={node.id}
                  node={node}
                  channel={ch}
                  currentTime={currentTime}
                  color={nodeColors.get(node.id)!}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ── Raw time history data (collapsible) ── */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm mt-6">
        <button
          onClick={() => setShowRawData((s) => !s)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/60 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">
              Raw Time History Data
            </span>
            <span className="text-xs text-gray-400">
              · {metricLabel} · {activeNodes.length} nodes selected
            </span>
          </div>
          {showRawData ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {showRawData && (
          <div className="border-t border-gray-100">
            <RawDataTable
              data={data}
              metric={selectedMetric}
              selectedNodeIds={selectedNodeIds}
            />
          </div>
        )}
      </div>

      {/* ── Fullscreen modal ── */}
      {isFullscreen && (
        <FullscreenChart
          chartData={chartData}
          activeNodes={activeNodes}
          nodeColors={nodeColors}
          selectedMetric={selectedMetric}
          activeUnit={activeUnit}
          currentTime={currentTime}
          fullXDomain={[data.timeMin, data.timeMax]}
          fullYDomain={yDomain}
          hasRange={hasRange}
          globalMax={globalMax}
          globalMin={globalMin}
          summaryTitle={summaryTitle}
          onClose={() => setIsFullscreen(false)}
          data={data}
          selectedNodeIds={selectedNodeIds}
          onToggleNode={toggleNode}
          onToggleAll={toggleAll}
          allNodesSelected={allNodesSelected}
          allMetrics={allMetrics}
          onSetMetric={setSelectedMetric}
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          speed={speed}
          onSetSpeed={setSpeed}
          onSetCurrentTime={(t) => { setIsPlaying(false); setCurrentTime(t); }}
          timeMin={data.timeMin}
          timeMax={data.timeMax}
          sliderPct={sliderPct}
        />
      )}
    </div>
  );
}
