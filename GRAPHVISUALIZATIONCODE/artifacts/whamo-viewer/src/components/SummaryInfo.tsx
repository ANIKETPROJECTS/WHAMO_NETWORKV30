import type { SimulationSummary } from "@/lib/parser";
import { Calendar, FileText, Info } from "lucide-react";

interface SummaryInfoProps {
  summary: SimulationSummary;
  fileName: string;
}

export default function SummaryInfo({ summary, fileName }: SummaryInfoProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-white border border-gray-100 rounded-lg px-5 py-4 flex items-start gap-3">
        <FileText className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">File</p>
          <p className="text-sm font-semibold text-gray-800 truncate">{fileName}</p>
        </div>
      </div>
      <div className="bg-white border border-gray-100 rounded-lg px-5 py-4 flex items-start gap-3">
        <Calendar className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Run Date</p>
          <p className="text-sm font-semibold text-gray-800 truncate">{summary.runDate || "N/A"}</p>
        </div>
      </div>
      <div className="bg-white border border-gray-100 rounded-lg px-5 py-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-purple-500 mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Title</p>
          <p className="text-sm font-semibold text-gray-800 truncate">{summary.title || "N/A"}</p>
        </div>
      </div>
    </div>
  );
}
