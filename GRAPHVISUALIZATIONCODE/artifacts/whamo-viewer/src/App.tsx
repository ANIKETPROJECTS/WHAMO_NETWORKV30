import { useState, useCallback, useRef } from "react";
import ProfileChart from "@/components/ProfileChart";
import DataTable from "@/components/DataTable";
import HistoryGraph from "@/components/HistoryGraph";
import { parseOutFile, type SimulationSummary } from "@/lib/parser";
import { parseHistoryData, type HistoryData } from "@/lib/historyParser";
import {
  Table, ChevronDown, ChevronUp,
  AlertTriangle, X, Upload, FileText, Calendar, Info,
} from "lucide-react";

export default function App() {
  const [summary, setSummary] = useState<SimulationSummary | null>(null);
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeGraph, setActiveGraph] = useState<"profile" | "history">("profile");
  const [showTable, setShowTable] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setIsLoading(true);
    setError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = parseOutFile(content);
        if (parsed.nodes.length === 0)
          throw new Error("No valid data rows found in the Simulation Summary section.");
        setSummary(parsed);
        setFileName(file.name);
        const history = parseHistoryData(content);
        setHistoryData(history.nodes.length > 0 ? history : null);
        setActiveGraph("profile");
      } catch (err: any) {
        setError(err.message || "Failed to parse file.");
        setSummary(null);
        setHistoryData(null);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleClear = useCallback(() => {
    setSummary(null);
    setHistoryData(null);
    setFileName("");
    setError("");
    setShowTable(false);
    setActiveGraph("profile");
  }, []);

  const chartTitle = summary
    ? `${summary.title || "Simulation"} (${summary.nodes.length} nodes · ${summary.runDate || fileName})`
    : "";

  return (
    <div className="min-h-screen bg-gray-50/60">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4 flex-wrap">

          {/* App name */}
          <span className="text-base font-bold text-gray-900 shrink-0">WHAMO Viewer</span>

          {/* File info — shown when a file is loaded */}
          {summary && (
            <>
              <div className="w-px h-5 bg-gray-200 shrink-0" />
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">File</span>
                  <span className="text-xs font-semibold text-gray-800 ml-0.5">{fileName}</span>
                </div>
                <div className="w-px h-4 bg-gray-200 shrink-0" />
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Run Date</span>
                  <span className="text-xs font-semibold text-gray-800 ml-0.5">{summary.runDate || "N/A"}</span>
                </div>
                <div className="w-px h-4 bg-gray-200 shrink-0" />
                <div className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Title</span>
                  <span className="text-xs font-semibold text-gray-800 ml-0.5">{summary.title || "N/A"}</span>
                </div>
              </div>
            </>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Tabs — shown when a file is loaded */}
          {summary && (
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5 shrink-0">
              <button
                onClick={() => setActiveGraph("profile")}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeGraph === "profile"
                    ? "bg-blue-500 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Profile Graph
              </button>
              {historyData && (
                <button
                  onClick={() => setActiveGraph("history")}
                  className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    activeGraph === "history"
                      ? "bg-blue-500 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  History Graph
                </button>
              )}
            </div>
          )}

          {/* Add / New file button */}
          {!summary ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold transition-colors shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              Add .OUT File
            </button>
          ) : (
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              New file
            </button>
          )}
        </div>
      </header>

      {/* Hidden file input — always mounted */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".out,.OUT"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* ── Error banner when no file loaded ── */}
        {!summary && error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-4 py-3 max-w-md mx-auto mt-6">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* ── File loaded ── */}
        {summary && (
          <div className="space-y-5">

            {/* ─── PROFILE TAB ─── */}
            {activeGraph === "profile" && (
              <>
                <ProfileChart nodes={summary.nodes} units={summary.units} />

                {/* Raw Simulation Summary Data */}
                <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                  <button
                    onClick={() => setShowTable(!showTable)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Table className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-700">
                        Raw Simulation Summary Data
                      </span>
                      <span className="text-xs text-gray-400">({summary.nodes.length} nodes)</span>
                    </div>
                    {showTable
                      ? <ChevronUp className="w-4 h-4 text-gray-400" />
                      : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </button>
                  {showTable && (
                    <div className="border-t border-gray-100">
                      <DataTable nodes={summary.nodes} units={summary.units} />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ─── HISTORY TAB ─── */}
            {activeGraph === "history" && historyData && (
              <HistoryGraph data={historyData} summaryTitle={chartTitle} />
            )}

            <div className="text-center pt-2">
              <button
                onClick={handleClear}
                className="text-sm text-blue-500 hover:text-blue-700 transition-colors"
              >
                Upload a different file
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
