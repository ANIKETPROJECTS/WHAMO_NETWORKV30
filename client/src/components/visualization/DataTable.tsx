import type { SimulationNode } from "@/lib/out-parser";

interface DataTableProps {
  nodes: SimulationNode[];
  units: "english" | "metric";
}

export default function DataTable({ nodes, units }: DataTableProps) {
  const elevUnit = units === "metric" ? "m" : "ft";
  const qUnit = units === "metric" ? "m³/s" : "CFS";

  return (
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
              <td className="px-3 py-2 text-center text-blue-700 font-medium">{n.maxEnergyElev.toFixed(1)}</td>
              <td className="px-3 py-2 text-center text-gray-400 text-xs">{n.maxEnergyElevTime.toFixed(1)}</td>
              <td className="px-3 py-2 text-center text-red-600 font-medium">{n.minEnergyElev.toFixed(1)}</td>
              <td className="px-3 py-2 text-center text-gray-400 text-xs">{n.minEnergyElevTime.toFixed(1)}</td>
              <td className="px-3 py-2 text-center text-emerald-600 font-medium">{n.maxDischarge.toFixed(1)}</td>
              <td className="px-3 py-2 text-center text-gray-400 text-xs">{n.maxDischargeTime.toFixed(1)}</td>
              <td className="px-3 py-2 text-center text-orange-600 font-medium">{n.minDischarge.toFixed(1)}</td>
              <td className="px-3 py-2 text-center text-gray-400 text-xs">{n.minDischargeTime.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
