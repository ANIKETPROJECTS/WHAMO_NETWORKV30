import { X, Download, Pencil, Check, Sun, Moon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { saveAs } from "file-saver";

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  fileName: string;
  type: "inp" | "out";
}

export function FilePreviewModal({ isOpen, onClose, content, fileName, type }: FilePreviewModalProps) {
  const preRef = useRef<HTMLPreElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [lightMode, setLightMode] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);

  useEffect(() => {
    setEditedContent(content);
    setEditing(false);
  }, [content]);

  useEffect(() => {
    if (isOpen && preRef.current) {
      preRef.current.scrollTop = 0;
    }
  }, [isOpen, content]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editing) {
          setEditing(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose, editing]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editing]);

  if (!isOpen) return null;

  const handleDownload = () => {
    const blob = new Blob([editedContent], { type: "text/plain;charset=utf-8" });
    saveAs(blob, fileName);
  };

  const handleEditToggle = () => {
    if (editing) {
      setEditing(false);
    } else {
      setEditedContent(editedContent);
      setEditing(true);
    }
  };

  const label = type === "inp" ? "INP" : "OUT";
  const lineCount = editedContent.split("\n").length;

  const dark = {
    bg: "#1e1e2e",
    text: "#cdd6f4",
    headerBg: "#181825",
    headerBorder: "#313244",
    badgeBg: type === "inp" ? "rgba(59,130,246,0.2)" : "rgba(16,185,129,0.2)",
    badgeText: type === "inp" ? "#60a5fa" : "#34d399",
    badgeBorder: type === "inp" ? "rgba(59,130,246,0.3)" : "rgba(16,185,129,0.3)",
    lineNumBg: "#181825",
    lineNumText: "#45475a",
    textareaBg: "#1e1e2e",
    textareaText: "#cdd6f4",
    textareaBorder: "#313244",
    countText: "#6c7086",
    btnEditBg: "#313244",
    btnEditText: "#cdd6f4",
    btnEditHover: "#45475a",
  };

  const light = {
    bg: "#f8f9fb",
    text: "#1e293b",
    headerBg: "#ffffff",
    headerBorder: "#e2e8f0",
    badgeBg: type === "inp" ? "#dbeafe" : "#d1fae5",
    badgeText: type === "inp" ? "#1d4ed8" : "#065f46",
    badgeBorder: type === "inp" ? "#bfdbfe" : "#a7f3d0",
    lineNumBg: "#f1f5f9",
    lineNumText: "#94a3b8",
    textareaBg: "#f8f9fb",
    textareaText: "#1e293b",
    textareaBorder: "#e2e8f0",
    countText: "#94a3b8",
    btnEditBg: "#f1f5f9",
    btnEditText: "#475569",
    btnEditHover: "#e2e8f0",
  };

  const theme = lightMode ? light : dark;
  const monoFont = '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace';
  const poppins = "Poppins, sans-serif";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="flex flex-col animate-in zoom-in-95 duration-200 rounded-2xl shadow-2xl overflow-hidden"
        style={{ width: "90vw", height: "90vh", background: theme.bg }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{
            background: theme.headerBg,
            borderBottom: `1px solid ${theme.headerBorder}`,
          }}
        >
          {/* Left: badge + filename + line count */}
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="text-[10px] font-bold px-2.5 py-1 rounded-full border flex-shrink-0"
              style={{
                fontFamily: poppins,
                background: theme.badgeBg,
                color: theme.badgeText,
                borderColor: theme.badgeBorder,
              }}
            >
              {label}
            </span>
            <span
              className="text-sm font-semibold truncate max-w-[300px]"
              style={{ fontFamily: poppins, color: theme.text }}
            >
              {fileName}
            </span>
            <span
              className="text-xs flex-shrink-0"
              style={{ fontFamily: poppins, color: theme.countText }}
            >
              {lineCount.toLocaleString()} lines
            </span>
            {editing && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 animate-pulse"
                style={{ background: "#fef3c7", color: "#92400e", fontFamily: poppins }}
              >
                EDITING
              </span>
            )}
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Light/dark toggle */}
            <button
              onClick={() => setLightMode(!lightMode)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: theme.btnEditBg,
                color: theme.btnEditText,
                fontFamily: poppins,
              }}
              title={lightMode ? "Switch to dark mode" : "Switch to light mode"}
              data-testid="btn-preview-theme-toggle"
            >
              {lightMode
                ? <Moon className="w-3.5 h-3.5" />
                : <Sun className="w-3.5 h-3.5" />
              }
              {lightMode ? "Dark" : "Light"}
            </button>

            {/* Edit / Done button — only for INP */}
            {type === "inp" && (
              <button
                onClick={handleEditToggle}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: editing ? "rgba(59,130,246,0.15)" : theme.btnEditBg,
                  color: editing ? "#60a5fa" : theme.btnEditText,
                  fontFamily: poppins,
                  border: editing ? "1px solid rgba(59,130,246,0.3)" : "1px solid transparent",
                }}
                data-testid="btn-preview-edit"
              >
                {editing ? (
                  <><Check className="w-3.5 h-3.5" /> Done</>
                ) : (
                  <><Pencil className="w-3.5 h-3.5" /> Edit</>
                )}
              </button>
            )}

            {/* Download */}
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors"
              style={{ fontFamily: poppins }}
              data-testid="btn-preview-download"
            >
              <Download className="w-3.5 h-3.5" />
              Download {label}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors"
              style={{
                color: theme.countText,
              }}
              data-testid="btn-preview-close"
              aria-label="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Content area ── */}
        <div className="flex-1 overflow-hidden flex">
          {/* Line numbers */}
          <div
            className="overflow-hidden flex-shrink-0 select-none pt-5 pb-5 text-right"
            style={{
              width: 52,
              background: theme.lineNumBg,
              borderRight: `1px solid ${theme.headerBorder}`,
              overflowY: "hidden",
            }}
          >
            <div
              style={{
                fontFamily: monoFont,
                fontSize: 13,
                lineHeight: "1.75",
                color: theme.lineNumText,
                paddingRight: 12,
                paddingLeft: 8,
                whiteSpace: "pre",
              }}
            >
              {editedContent.split("\n").map((_, i) => `${i + 1}\n`).join("")}
            </div>
          </div>

          {/* Editor / viewer */}
          {editing ? (
            <textarea
              ref={textareaRef}
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="flex-1 resize-none outline-none border-none p-5"
              style={{
                fontFamily: monoFont,
                fontSize: 13,
                lineHeight: "1.75",
                background: theme.textareaBg,
                color: theme.textareaText,
                caretColor: "#60a5fa",
              }}
              spellCheck={false}
              data-testid="textarea-inp-editor"
            />
          ) : (
            <div className="flex-1 overflow-auto">
              <pre
                ref={preRef}
                className="text-[13px] leading-relaxed p-5 whitespace-pre min-h-full selection:bg-blue-500/30"
                style={{
                  fontFamily: monoFont,
                  color: theme.text,
                  background: theme.bg,
                }}
              >
                {editedContent}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
