import { useState } from "react";
import type { SimulationNode } from "@/lib/out-parser";

interface DataTableProps {
  nodes: SimulationNode[];
  units: "english" | "metric";
}

// Conversion helpers — always operate on native values
const FT_TO_M = 0.3048;
const CFS_TO_CMS = 0.028317;

function convertElev(val: number, from: "english" | "metric", displaySI: boolean): number {
  if (from === "english" && displaySI) return val * FT_TO_M;
  if (from === "metric" && !displaySI) return val / FT_TO_M;
  return val;
}

function convertQ(val: number, from: "english" | "metric", displaySI: boolean): number {
  if (from === "english" && displaySI) return val * CFS_TO_CMS;
  if (from === "metric" && !displaySI) return val / CFS_TO_CMS;
  return val;
}

function fmtElev(val: number, displaySI: boolean): string {
  return displaySI ? val.toFixed(3) : val.toFixed(1);
}

function fmtQ(val: number, displaySI: boolean): string {
  return displaySI ? val.toFixed(4) : val.toFixed(1);
}

export default function DataTable({ nodes, units }: DataTableProps) {
  const [displaySI, setDisplaySI] = useState(units === "metric");

  const elevUnit = displaySI ? "m" : "ft";
  const qUnit = displaySI ? "m³/s" : "CFS";

  return (
    <div>
      {/* Unit toggle bar */}
      <div className="flex justify-end items-center px-4 py-2 border-b border-gray-100 bg-gray-50/40">
        <span className="text-xs text-gray-400 mr-2">Display units:</span>
        <div className="flex rounded-md overflow-hidden border border-gray-200 text-xs font-bold">
          <button
            onClick={() => setDisplaySI(false)}
            className={`px-3 py-1 transition-colors ${!displaySI ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            FPS
          </button>
          <button
            onClick={() => setDisplaySI(true)}
            className={`px-3 py-1 transition-colors ${displaySI ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            SI
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th rowSpan={2} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Node</th>
              <th colSpan={2} className="px-3 py-2 text-center text-xs font-semibold text-blue-600 uppercase tracking-wider border-b border-blue-100">Max Energy Elev.</th>
              <th colSpan={2} className="px-3 py-2 text-center text-xs font-semibold text-red-500 uppercase tracking-wider border-b border-red-100">Min Energy Elev.</th>
              <th colSpan={2} className="px-3 py-2 text-center text-xs font-semibold text-emerald-600 uppercase tracking-wider border-b border-emerald-100">Max Discharge</th>
              <th colSpan={2} className="px-3 py-2 text-center text-xs font-semibold text-orange-500 uppercase tracking-wider border-b border-orange-100">Min Discharge</th>
            </tr>
            <tr className="border-b border-gray-200">
              <th className="px-3 py-1.5 text-center text-xs text-gray-400">{elevUnit}</th>
              <th className="px-3 py-1.5 text-center text-xs text-gray-400">sec</th>
              <th className="px-3 py-1.5 text-center text-xs text-gray-400">{elevUnit}</th>
              <th className="px-3 py-1.5 text-center text-xs text-gray-400">sec</th>
              <th className="px-3 py-1.5 text-center text-xs text-gray-400">{qUnit}</th>
              <th className="px-3 py-1.5 text-center text-xs text-gray-400">sec</th>
              <th className="px-3 py-1.5 text-center text-xs text-gray-400">{qUnit}</th>
              <th className="px-3 py-1.5 text-center text-xs text-gray-400">sec</th>
            </tr>
          </thead>
          <tbody>
            {nodes.map((n, i) => (
              <tr key={n.nodeNumber} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}>
                <td className="px-3 py-2 font-medium text-gray-800">{n.nodeNumber}</td>
                <td className="px-3 py-2 text-center text-blue-700 font-medium">{fmtElev(convertElev(n.maxEnergyElev, units, displaySI), displaySI)}</td>
                <td className="px-3 py-2 text-center text-gray-400 text-xs">{n.maxEnergyElevTime.toFixed(1)}</td>
                <td className="px-3 py-2 text-center text-red-600 font-medium">{fmtElev(convertElev(n.minEnergyElev, units, displaySI), displaySI)}</td>
                <td className="px-3 py-2 text-center text-gray-400 text-xs">{n.minEnergyElevTime.toFixed(1)}</td>
                <td className="px-3 py-2 text-center text-emerald-600 font-medium">{fmtQ(convertQ(n.maxDischarge, units, displaySI), displaySI)}</td>
                <td className="px-3 py-2 text-center text-gray-400 text-xs">{n.maxDischargeTime.toFixed(1)}</td>
                <td className="px-3 py-2 text-center text-orange-600 font-medium">{fmtQ(convertQ(n.minDischarge, units, displaySI), displaySI)}</td>
                <td className="px-3 py-2 text-center text-gray-400 text-xs">{n.minDischargeTime.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
