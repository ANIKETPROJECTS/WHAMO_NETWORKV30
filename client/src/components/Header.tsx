import {
  AlertCircle,
  Maximize2,
  Layout,
  PlusCircle,
  Settings2,
  Download,
  FilePlus,
  FolderOpen,
  Save,
  Trash2,
  Undo2,
  Redo2,
  MousePointer2,
  Cylinder,
  Circle,
  GitCommitHorizontal,
  ArrowRightCircle,
  ListVideo,
  Info,
  Table2,
  PlayCircle,
  ShieldCheck,
  Eye,
  EyeOff,
  BarChart2,
  X,
  ChevronDown,
  Settings,
  LogOut,
  HelpCircle,
  Upload,
  FileCode2,
  CheckCircle2,
  TriangleAlert,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SettingsDialog } from "@/components/SettingsDialog";
import { PropSection, PropRow } from "@/components/ui/prop-section";
import { FlexTable } from "@/components/FlexTable";
import { HelpModal } from "@/components/HelpModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNetworkStore } from "@/lib/store";
import { getViewportCenter } from "@/lib/viewport";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { generateSystemDiagramSVG } from "@/lib/diagram-generator";
import folderIcon from "@assets/open-folder_1770356038145.png";
import addFileIcon from "@assets/add-file_1779522127531.png";
import openFolderIcon from "@assets/open-folder_(1)_1779522148864.png";
import floppyDiskIcon from "@assets/floppy-disk_1779522257214.png";
import disketteIcon from "@assets/diskette_1779522365366.png";
import damIcon from "@assets/dam_1779522984604.png";
import nodeCircleIcon from "@assets/button_1779523171362.png";
import yIntersectionIcon from "@assets/y-intersection_(1)_1779523210044.png";
import waterTankIcon from "@assets/water-tank_(2)_1779523360829.png";
import windIcon from "@assets/wind_1779523398812.png";
import waterPumpIcon from "@assets/water-pump_1779523451215.png";
import pipeIcon from "@assets/pipe_1779523475650.png";
import turbineImgIcon from "@assets/turbine_1779523517554.png";
import networkIcon from "@assets/network_1779525899254.png";
import clickIcon from "@assets/click_1779525969230.png";
import tabletIcon from "@assets/tablet_1779526000997.png";
import chartIcon from "@assets/chart_1779526062244.png";
import equalizerIcon from "@assets/equalizer_(1)_1779526283421.png";
import settingsWrenchIcon from "@assets/settings_1779526312036.png";
import inputIcon from "@assets/input_1779526391855.png";
import outputIcon from "@assets/output_1779526416694.png";
import gridIcon from "@assets/grid_1779526458342.png";
import fullscreenIcon from "@assets/fullscreen_1779526488758.png";
import eyeOpenIcon from "@assets/view_(2)_1779527800443.png";
import eyeHiddenIcon from "@assets/hidden_1779529637135.png";
import arrangeIcon from "@assets/arrange_icon_1779686978241.png";

// ─── Title bar compact button ─────────────────────────────────────────────────
function TitleBarBtn({
  imgSrc, icon, label, onClick, disabled,
}: {
  imgSrc?: string;
  icon?: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-row items-center gap-1.5 px-2.5 py-1.5 rounded transition-colors select-none",
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:bg-slate-100 active:bg-slate-200",
      )}
    >
      {imgSrc
        ? <img src={imgSrc} className="w-[22px] h-[22px] object-contain flex-shrink-0" alt={label} />
        : <span className="flex-shrink-0 flex items-center">{icon}</span>
      }
      <span className="text-[12px] font-medium text-black whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{label}</span>
    </button>
  );
}

// ─── Inline ribbon button (icon above, text below — fixed height, aligned) ────
function InlineRibbonBtn({
  imgSrc, icon, label, onClick, disabled, active,
  ...rest
}: {
  imgSrc?: string;
  icon?: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  [key: string]: any;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      {...rest}
      className={cn(
        "flex flex-col items-center h-[62px] px-2 py-1 rounded transition-colors select-none flex-1",
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:bg-blue-50 active:bg-blue-100",
        active ? "bg-blue-100 ring-1 ring-blue-300" : "",
      )}
    >
      {/* Icon zone — always same height, icon centered inside */}
      <div className="flex flex-1 items-center justify-center">
        {imgSrc
          ? <img src={imgSrc} className="w-7 h-7 object-contain" alt={label} />
          : <span className="flex items-center justify-center w-7 h-7">{icon}</span>
        }
      </div>
      {/* Text zone — fixed height, always at bottom */}
      <div className="h-[22px] flex items-end justify-center w-full">
        <span className="text-[10px] font-semibold text-black text-center leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>{label}</span>
      </div>
    </button>
  );
}

// ─── Ribbon helper components ────────────────────────────────────────────────
function RibbonBtn({
  icon, label, onClick, disabled, active, highlight,
  ...rest
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  highlight?: boolean;
  [key: string]: any;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      {...rest}
      className={cn(
        "flex flex-col items-center justify-center gap-1 px-3 py-1.5 rounded min-w-[56px] transition-colors select-none",
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:bg-blue-50 active:bg-blue-100",
        active ? "bg-blue-100 ring-1 ring-blue-300" : "",
        highlight && !disabled ? "hover:bg-blue-100" : "",
      )}
    >
      <span className="flex items-center justify-center">{icon}</span>
      <span className="text-[10px] font-medium text-black leading-tight text-center max-w-[64px]" style={{ fontFamily: 'Poppins, sans-serif' }}>{label}</span>
    </button>
  );
}

function SmallRibbonBtn({
  icon, label, onClick, disabled, active, highlight,
  ...rest
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  highlight?: boolean;
  [key: string]: any;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      {...rest}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded min-w-[48px] transition-colors select-none",
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:bg-blue-50 active:bg-blue-100",
        active ? "bg-blue-100 ring-1 ring-blue-300" : "",
        highlight && !disabled ? "hover:bg-blue-100" : "",
      )}
    >
      <span className="flex items-center justify-center">{icon}</span>
      <span className="text-[9px] font-medium text-black leading-tight text-center max-w-[56px]" style={{ fontFamily: 'Poppins, sans-serif' }}>{label}</span>
    </button>
  );
}

function RibbonGroup({ label, children, flex = 1, disabled = false }: { label: string; children: React.ReactNode; flex?: number; disabled?: boolean }) {
  return (
    <div className={cn("flex items-stretch", disabled && "opacity-40 pointer-events-none select-none")} style={{ flex }}>
      <div className="flex flex-col w-full">
        <div className="text-center pt-1 pb-0.5">
          <span className="text-[11px] text-black font-medium tracking-wide uppercase" style={{ fontFamily: 'Poppins, sans-serif' }}>{label}</span>
        </div>
        <div className="flex items-stretch justify-evenly px-1 pb-1 pt-0 flex-1">
          {children}
        </div>
      </div>
      <div className="w-px bg-black my-1 self-stretch flex-shrink-0" />
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

interface HeaderProps {
  onExport: (fileName?: string) => void;
  onGenerateOut: () => void;
  isGeneratingOut: boolean;
  pendingGenerateMode: 'inp' | 'out' | null;
  onClearPendingMode: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onLoad: () => void;
  onShowDiagram?: () => void;
  onVisualization?: () => void;
  activeLinkTool?: 'pump' | 'checkValve' | 'turbine' | null;
  onSetLinkTool?: (tool: 'pump' | 'checkValve' | 'turbine' | null) => void;
  onShowFilePreview?: (content: string, fileName: string, type: 'inp' | 'out') => void;
  onLoadProject?: (project: any) => void;
  currentProjectId?: string | null;
  isProjectOpen?: boolean;
  onActivate?: () => void;
  onRegisterForceGenerateOut?: (fn: () => void) => void;
}

export function Header({
  onExport,
  onGenerateOut,
  isGeneratingOut,
  pendingGenerateMode,
  onClearPendingMode,
  onSave,
  onSaveAs,
  onLoad,
  onShowDiagram,
  onVisualization,
  activeLinkTool,
  onSetLinkTool,
  onShowFilePreview,
  onLoadProject,
  currentProjectId,
  isProjectOpen = false,
  onActivate,
  onRegisterForceGenerateOut,
}: HeaderProps) {
  const { user, logout, isMasterAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const [showSettings, setShowSettings] = useState(false);
  const { toast } = useToast();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showFlexTable, setShowFlexTable] = useState(false);
  const [showOutputDialog, setShowOutputDialog] = useState(false);
  const [showCompParams, setShowCompParams] = useState(false);
  const [generateDialogMode, setGenerateDialogMode] = useState<'inp' | 'out' | null>(null);

  // When Designer signals validation passed, open the Output Requests dialog
  useEffect(() => {
    if (pendingGenerateMode) {
      setGenerateDialogMode(pendingGenerateMode);
      setShowOutputDialog(true);
    }
  }, [pendingGenerateMode]);

  // Keep Designer's ValidationModal able to trigger a direct .OUT generation
  // (bypassing the Output Requests dialog) for Force Generate / Generate Anyway.
  useEffect(() => {
    onRegisterForceGenerateOut?.(() => handleGenerateOutDirectly(projectName));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRegisterForceGenerateOut, projectName, nodes, edges]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);
  const {
    addNode,
    clearNetwork,
    nodes,
    edges,
    computationalParams,
    updateComputationalParams,
    outputRequests,
    addOutputRequest,
    removeOutputRequest,
    snapshotTimes,
    addSnapshotTime,
    removeSnapshotTime,
    projectName,
    setProjectName,
    projectNameError,
    setProjectNameError,
    undo,
    redo,
    history,
    loadedFileHandle,
    globalUnit,
    setGlobalUnit,
    showHoverData,
    setShowHoverData,
    autoArrange,
    loadNetwork,
  } = useNetworkStore();

  // ── Generate Network Using .INP ───────────────────────────────────────────
  const [showImportInp, setShowImportInp] = useState(false);
  const [inpFile, setInpFile] = useState<File | null>(null);
  const [inpPreview, setInpPreview] = useState<{
    projectName: string;
    nodeCount: number;
    edgeCount: number;
    nodeTypes: Record<string, number>;
    edgeTypes: Record<string, number>;
    stageCount: number;
    tmax: number | null;
    pcharCount: number;
    tcharCount: number;
    parsed: any;
  } | null>(null);
  const [inpParseError, setInpParseError] = useState<string | null>(null);
  const [inpParsing, setInpParsing] = useState(false);
  const inpFileInputRef = useRef<HTMLInputElement>(null);

  const handleInpFileSelect = useCallback(async (file: File) => {
    setInpFile(file);
    setInpPreview(null);
    setInpParseError(null);
    setInpParsing(true);
    try {
      const content = await file.text();
      const { parseInpFile } = await import('@/lib/inp-parser');
      const result = parseInpFile(content);

      const nodeTypeCounts: Record<string, number> = {};
      result.nodes.forEach((n: any) => {
        const t = n.type || 'node';
        nodeTypeCounts[t] = (nodeTypeCounts[t] || 0) + 1;
      });

      const edgeTypeCounts: Record<string, number> = {};
      result.edges.forEach((e: any) => {
        const t = e.data?.type || 'conduit';
        edgeTypeCounts[t] = (edgeTypeCounts[t] || 0) + 1;
      });

      const stages = result.computationalParams?.stages ?? [];
      const tmax = stages.length > 0 ? stages[stages.length - 1].tmax : null;

      setInpPreview({
        projectName: result.projectName,
        nodeCount: result.nodes.length,
        edgeCount: result.edges.length,
        nodeTypes: nodeTypeCounts,
        edgeTypes: edgeTypeCounts,
        stageCount: stages.length,
        tmax,
        pcharCount: Object.keys(result.pcharData || {}).length,
        tcharCount: Object.keys(result.tcharData || {}).length,
        parsed: result,
      });
    } catch (err: any) {
      setInpParseError(err.message || 'Failed to parse .INP file.');
    } finally {
      setInpParsing(false);
    }
  }, []);

  const handleGenerateFromInp = useCallback(() => {
    if (!inpPreview) return;
    const { parsed } = inpPreview;
    loadNetwork(
      parsed.nodes,
      parsed.edges,
      { ...parsed.computationalParams, hSchedules: parsed.hSchedules, qSchedules: parsed.qSchedules },
      parsed.outputRequests,
      parsed.projectName,
      undefined,
      parsed.pcharData,
      undefined,
      parsed.nodeSelectionSet,
      parsed.tcharData,
      parsed.vSchedules,
      parsed.unit,
    );
    // Auto-arrange immediately after loading — store is synchronous so positions
    // are available in the same tick.
    autoArrange();
    window.dispatchEvent(new CustomEvent('fit-view-request'));
    onActivate?.();
    setShowImportInp(false);
    setInpFile(null);
    setInpPreview(null);
    setInpParseError(null);
    toast({
      title: 'Network Generated',
      description: `"${parsed.projectName}" loaded — ${parsed.nodes.length} nodes, ${parsed.edges.length} connections.`,
    });
  }, [inpPreview, loadNetwork, autoArrange, onActivate, toast]);

  const [localParams, setLocalParams] = useState(computationalParams);
  const [selectedElementId, setSelectedElementId] = useState<string>("");
  const [selectedGroupType, setSelectedGroupType] = useState<"" | "nodes" | "elements" | "conduits" | "dummy">("");
  const [selectedVars, setSelectedVars] = useState<string[]>([]);
  const [requestType, setRequestType] = useState<
    "HISTORY" | "PLOT" | "SPREADSHEET" | "SNAPSHOT"
  >("HISTORY");
  const [snapshotTimeInput, setSnapshotTimeInput] = useState<string>("0");

  useEffect(() => {
    setLocalParams(computationalParams);
  }, [computationalParams]);

  const handleAddRequest = () => {
    if (!selectedElementId || selectedVars.length === 0) return;

    const [mode, id] = selectedElementId.includes(':') 
      ? selectedElementId.split(':') 
      : [null, selectedElementId];
    
    const actualId = id || selectedElementId;
    const node = nodes.find((n) => n.id === actualId);
    const type = node ? "node" : "edge";

    const allTypes: ("HISTORY" | "PLOT" | "SPREADSHEET")[] = ["HISTORY", "PLOT", "SPREADSHEET"];
    allTypes.forEach(reqType => {
      const alreadyExists = outputRequests.some(
        req => req.elementId === actualId && req.requestType === reqType && req.isElement === (mode === 'element')
      );
      if (!alreadyExists) {
        addOutputRequest({
          elementId: actualId,
          elementType: type,
          isElement: mode === 'element',
          requestType: reqType,
          variables: selectedVars,
        });
      }
    });
    toast({
      title: "Request Added",
      description: "Output request added to History, Plot, and Spreadsheet.",
    });
  };

  const handleAddAllForType = () => {
    if (!selectedGroupType || selectedVars.length === 0) return;
    const allTypes: ("HISTORY" | "PLOT" | "SPREADSHEET")[] = ["HISTORY", "PLOT", "SPREADSHEET"];
    let added = 0;

    if (selectedGroupType === "nodes") {
      nodes.forEach(node => {
        allTypes.forEach(reqType => {
          const exists = outputRequests.some(r => r.elementId === node.id && r.requestType === reqType && r.isElement === false);
          if (!exists) {
            addOutputRequest({ elementId: node.id, elementType: "node", requestType: reqType, isElement: false, variables: selectedVars });
            added++;
          }
        });
      });
    } else if (selectedGroupType === "elements") {
      const specialNodes = nodes.filter(n => ["surgeTank","pump","checkValve","turbine"].includes(n.data?.type || n.type || ""));
      specialNodes.forEach(node => {
        allTypes.forEach(reqType => {
          const exists = outputRequests.some(r => r.elementId === node.id && r.requestType === reqType && r.isElement === true);
          if (!exists) {
            addOutputRequest({ elementId: node.id, elementType: "node", requestType: reqType, isElement: true, variables: selectedVars });
            added++;
          }
        });
      });
      const turbineEdges = Array.from(new Map(edges.filter(e => e.data?.type === "turbine").map(e => [e.data?.label || e.id, e])).values());
      turbineEdges.forEach(edge => {
        allTypes.forEach(reqType => {
          const exists = outputRequests.some(r => r.elementId === edge.id && r.requestType === reqType);
          if (!exists) {
            addOutputRequest({ elementId: edge.id, elementType: "edge", requestType: reqType, isElement: true, variables: selectedVars });
            added++;
          }
        });
      });
    } else if (selectedGroupType === "conduits") {
      const conduitEdges = Array.from(new Map(edges.filter(e => e.data?.type === "conduit").map(e => [e.data?.label || e.id, e])).values());
      conduitEdges.forEach(edge => {
        allTypes.forEach(reqType => {
          const exists = outputRequests.some(r => r.elementId === edge.id && r.requestType === reqType);
          if (!exists) {
            addOutputRequest({ elementId: edge.id, elementType: "edge", requestType: reqType, isElement: true, variables: selectedVars });
            added++;
          }
        });
      });
    } else if (selectedGroupType === "dummy") {
      const dummyEdges = Array.from(new Map(edges.filter(e => e.data?.type === "dummy").map(e => [e.data?.label || e.id, e])).values());
      dummyEdges.forEach(edge => {
        allTypes.forEach(reqType => {
          const exists = outputRequests.some(r => r.elementId === edge.id && r.requestType === reqType);
          if (!exists) {
            addOutputRequest({ elementId: edge.id, elementType: "edge", requestType: reqType, isElement: true, variables: selectedVars });
            added++;
          }
        });
      });
    }

    const typeLabels = { nodes: "Nodes", elements: "Elements", conduits: "Conduits", dummy: "Dummy Pipes" };
    toast({
      title: "Requests Added",
      description: added > 0
        ? `Added requests for all ${typeLabels[selectedGroupType]} (History, Plot & Spreadsheet).`
        : `All ${typeLabels[selectedGroupType]} already have requests configured.`,
    });
  };

  const selectedActualId = selectedElementId.includes(':') ? selectedElementId.split(':')[1] : selectedElementId;
  const selectedNode = nodes.find(n => n.id === selectedActualId);
  const selectedEdge = edges.find(e => e.id === selectedActualId);
  const isTurbineSelected =
    (selectedNode && (selectedNode.type === 'turbine' || selectedNode.data?.type === 'turbine')) ||
    (selectedEdge && selectedEdge.data?.type === 'turbine');
  const availableVars = isTurbineSelected
    ? ["Q", "HEAD", "SPEED", "POWER"]
    : ["Q", "HEAD", "ELEV", "VEL", "PRESS", "PIEZHEAD"];

  const handleGenerateOutDirectly = async (fileName?: string) => {
    try {
      const { generateInpFile } = await import("@/lib/inp-generator");
      const inpContent = generateInpFile(nodes, edges, false);

      const response = await fetch("/api/run-whamo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inpContent }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "WHAMO simulation failed.");
      }

      const data = await response.json();
      const files = data.files || {};

      if (Object.keys(files).length === 0) {
        throw new Error("No output files received from server");
      }

      const downloadName = (projectName && projectName !== "Untitled Network") ? projectName : "network";

      // Show OUT file in preview modal instead of auto-downloading
      if (files.out) {
        const binary = atob(files.out);
        const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
        const outText = new TextDecoder("utf-8").decode(bytes);
        onShowFilePreview?.(outText, `${downloadName}.OUT`, 'out');
      } else {
        throw new Error("No .OUT file received from server");
      }
    } catch (error: any) {
      console.error("WHAMO Error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    if (!projectName.trim() || projectName === "Untitled Network") {
      setProjectNameError("Please enter a file name");
      toast({
        title: "Validation Error",
        description: "Please enter a specific project name before downloading.",
        variant: "destructive",
      });
      return;
    }
    // Runs validation in Designer → if passes, sets pendingGenerateMode → triggers useEffect above
    onExport(projectName);
  };

  const handleOutGenerate = () => {
    if (!projectName.trim() || projectName === "Untitled Network") {
      setProjectNameError("Please enter a file name");
      toast({
        title: "Validation Error",
        description: "Please enter a specific project name before generating .OUT.",
        variant: "destructive",
      });
      return;
    }
    // Runs validation in Designer → if passes, sets pendingGenerateMode → triggers useEffect above
    onGenerateOut();
  };

  const handleConfirmGenerate = () => {
    setShowOutputDialog(false);
    setGenerateDialogMode(null);
    onClearPendingMode();
    if (generateDialogMode === 'inp') {
      // force=true skips re-validation, proceeds directly to file generation
      onExport(true as any);
    } else if (generateDialogMode === 'out') {
      handleGenerateOutDirectly(projectName);
    }
  };

  const handleCloseOutputDialog = (open: boolean) => {
    setShowOutputDialog(open);
    if (!open) {
      setGenerateDialogMode(null);
      onClearPendingMode();
    }
  };

  return (
    <div className="flex flex-col border-b bg-white shadow-sm">

      {/* ── TITLE BAR ── */}
      <div className="flex items-center px-3 py-1.5 border-b border-slate-100 bg-white">
        {/* LEFT: File ops + Undo/Redo + Arrange — takes natural width, min-w to reserve space */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <TitleBarBtn imgSrc={addFileIcon} label="New" onClick={() => { clearNetwork(); }} />
          <TitleBarBtn imgSrc={openFolderIcon} label="Open" onClick={onLoad} />
          <TitleBarBtn imgSrc={floppyDiskIcon} label="Save" onClick={onSave} disabled={!isProjectOpen} />
          <TitleBarBtn imgSrc={floppyDiskIcon} label="Save As" onClick={onSaveAs} disabled={!isProjectOpen} />
          <div className="w-px bg-slate-200 mx-1 h-6 flex-shrink-0" />
          <TitleBarBtn icon={<Undo2 className="w-[22px] h-[22px]" />} label="Undo" onClick={undo} disabled={!isProjectOpen || history.past.length === 0} />
          <TitleBarBtn icon={<Redo2 className="w-[22px] h-[22px]" />} label="Redo" onClick={redo} disabled={!isProjectOpen || history.future.length === 0} />
          <div className="w-px bg-slate-200 mx-1 h-6 flex-shrink-0" />
          <TitleBarBtn imgSrc={arrangeIcon} label="Arrange" onClick={autoArrange} disabled={!isProjectOpen || nodes.length === 0} data-testid="btn-auto-arrange" />
          <div className="w-px bg-slate-200 mx-1 h-6 flex-shrink-0" />
          <TitleBarBtn icon={<Upload className="w-[22px] h-[22px] text-teal-600" />} label="From .INP" onClick={() => { setShowImportInp(true); setInpFile(null); setInpPreview(null); setInpParseError(null); }} data-testid="btn-from-inp" />
          <div className="w-px bg-slate-200 mx-1 h-6 flex-shrink-0" />
          <TitleBarBtn icon={<HelpCircle className="w-[22px] h-[22px]" />} label="Help" onClick={() => setShowHelp(true)} data-testid="btn-help" />
        </div>

        {/* CENTER: flex-1 grows to fill space and centers the project name */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <img src={folderIcon} alt="Folder" className="w-6 h-6 object-contain flex-shrink-0" />
            <input
              className={`text-sm font-medium text-black bg-transparent border focus:outline-none px-1.5 py-0.5 rounded w-[220px] text-center transition-opacity ${projectNameError ? 'border-red-400' : 'border-transparent'} ${!isProjectOpen ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'hover:bg-slate-50'}`}
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name..."
              disabled={!isProjectOpen}
            />
            {projectNameError && (
              <div className="flex items-center gap-1 text-[10px] text-yellow-600 font-medium bg-yellow-50 px-2 py-0.5 rounded border border-yellow-200">
                <AlertCircle className="w-3 h-3 text-red-500" />
                {projectNameError}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Units pill + User/Logout */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-[12px] text-black font-semibold">Units:</span>
          <div className="flex items-center rounded-full border-2 border-slate-300 bg-white overflow-hidden shadow-sm">
            <button
              onClick={() => setGlobalUnit('SI')}
              className={`text-[13px] font-bold px-4 py-1 transition-colors ${globalUnit === 'SI' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >SI</button>
            <button
              onClick={() => setGlobalUnit('FPS')}
              className={`text-[13px] font-bold px-4 py-1 transition-colors ${globalUnit === 'FPS' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >FPS</button>
          </div>
          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors group focus:outline-none"
                    data-testid="btn-user-menu"
                  >
                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-white uppercase">
                        {user.fullName.charAt(0)}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-700 font-semibold max-w-[110px] truncate" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      {user.fullName}
                    </span>
                    <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors flex-shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 shadow-lg">
                  {isMasterAdmin() && (
                    <>
                      <DropdownMenuItem
                        onClick={() => setLocation("/admin")}
                        className="flex items-center gap-2 cursor-pointer text-[13px]"
                        style={{ fontFamily: 'Poppins, sans-serif' }}
                        data-testid="menu-item-admin"
                      >
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                        <span className="text-blue-700 font-semibold">User Management</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem
                    onClick={() => setShowSettings(true)}
                    className="flex items-center gap-2 cursor-pointer text-[13px]"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                    data-testid="menu-item-settings"
                  >
                    <Settings className="w-4 h-4 text-slate-500" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    className="flex items-center gap-2 cursor-pointer text-[13px] text-red-600 focus:text-red-600 focus:bg-red-50"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                    data-testid="menu-item-signout"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          <SettingsDialog
            open={showSettings}
            onClose={() => setShowSettings(false)}
            onLoadProject={onLoadProject}
            currentProjectId={currentProjectId}
          />
        </div>
      </div>

      {/* ── RIBBON ── */}
      <div className="flex items-stretch bg-[#f3f5f9] border-b border-slate-200 w-full">

        <RibbonGroup label="Insert" flex={8}>
          <InlineRibbonBtn imgSrc={damIcon} label="Reservoir" onClick={() => { if (!isProjectOpen) onActivate?.(); addNode("reservoir", getViewportCenter()); }} />
          <InlineRibbonBtn imgSrc={nodeCircleIcon} label="Node" onClick={() => { if (!isProjectOpen) onActivate?.(); addNode("node", getViewportCenter()); }} />
          <InlineRibbonBtn imgSrc={yIntersectionIcon} label="Junction" onClick={() => { if (!isProjectOpen) onActivate?.(); addNode("junction", getViewportCenter()); }} />
          <InlineRibbonBtn imgSrc={waterTankIcon} label="Surge Tank" onClick={() => { if (!isProjectOpen) onActivate?.(); addNode("surgeTank", getViewportCenter()); }} />
          <InlineRibbonBtn imgSrc={windIcon} label="Flow BC" onClick={() => { if (!isProjectOpen) onActivate?.(); addNode("flowBoundary", getViewportCenter()); }} />
          <InlineRibbonBtn
            imgSrc={waterPumpIcon}
            label="Pump"
            onClick={() => { if (!isProjectOpen) onActivate?.(); onSetLinkTool?.(activeLinkTool === 'pump' ? null : 'pump'); }}
            active={activeLinkTool === 'pump'}
            data-testid="ribbon-btn-pump"
          />
          <InlineRibbonBtn
            imgSrc={pipeIcon}
            label="Check Valve"
            onClick={() => { if (!isProjectOpen) onActivate?.(); onSetLinkTool?.(activeLinkTool === 'checkValve' ? null : 'checkValve'); }}
            active={activeLinkTool === 'checkValve'}
            data-testid="ribbon-btn-checkvalve"
          />
          <InlineRibbonBtn
            imgSrc={turbineImgIcon}
            label="Turbine"
            onClick={() => { if (!isProjectOpen) onActivate?.(); onSetLinkTool?.(activeLinkTool === 'turbine' ? null : 'turbine'); }}
            active={activeLinkTool === 'turbine'}
            data-testid="ribbon-btn-turbine"
          />
        </RibbonGroup>

        <RibbonGroup label="Tools" flex={4} disabled={!isProjectOpen}>
          <InlineRibbonBtn imgSrc={networkIcon} label="Diagram" onClick={onShowDiagram} />
          <InlineRibbonBtn
            imgSrc={clickIcon}
            label="Node Sel."
            onClick={() => window.dispatchEvent(new CustomEvent('toggleNodeSelection'))}
          />
          <InlineRibbonBtn
            imgSrc={tabletIcon}
            label="Flex Table"
            onClick={() => setShowFlexTable(true)}
            data-testid="ribbon-btn-flextable"
          />
          <InlineRibbonBtn
            imgSrc={chartIcon}
            label="Visualization"
            onClick={onVisualization}
            data-testid="ribbon-btn-visualization"
          />
        </RibbonGroup>

        <RibbonGroup label="Analysis" flex={2} disabled={!isProjectOpen}>
          <InlineRibbonBtn
            imgSrc={settingsWrenchIcon}
            label="Parameters"
            onClick={() => setShowCompParams(true)}
          />
          <InlineRibbonBtn
            imgSrc={equalizerIcon}
            label="Configure"
            onClick={() => { setGenerateDialogMode(null); setShowOutputDialog(true); }}
          />
        </RibbonGroup>

        <RibbonGroup label="Generate" flex={2} disabled={!isProjectOpen}>
          <InlineRibbonBtn
            imgSrc={inputIcon}
            label=".INP"
            onClick={handleExport}
            data-testid="ribbon-btn-generate-inp"
          />
          <InlineRibbonBtn
            imgSrc={outputIcon}
            label={isGeneratingOut ? "Processing..." : ".OUT"}
            onClick={handleOutGenerate}
            disabled={isGeneratingOut}
            data-testid="ribbon-btn-generate-out"
          />
        </RibbonGroup>

        <RibbonGroup label="View" flex={2}>
          <InlineRibbonBtn
            imgSrc={showHoverData ? eyeOpenIcon : eyeHiddenIcon}
            label={showHoverData ? "Hide Labels" : "Show Labels"}
            onClick={() => setShowHoverData(!showHoverData)}
            data-testid="ribbon-btn-toggle-labels"
          />
          <InlineRibbonBtn
            imgSrc={fullscreenIcon}
            label={isFullscreen ? "Exit FS" : "Full Screen"}
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
              } else {
                document.exitFullscreen();
              }
            }}
          />
        </RibbonGroup>

      </div>

      {/* ── COMPUTATION PARAMETERS SIDEBAR ── */}
      {showCompParams && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div className="absolute inset-0 bg-black/30 pointer-events-auto" onClick={() => setShowCompParams(false)} />
          <div className="absolute right-0 top-0 h-full w-[420px] bg-white shadow-2xl border-l border-slate-200 flex flex-col pointer-events-auto animate-in slide-in-from-right duration-300">

            {/* Header bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b bg-slate-50 shrink-0">
              <h2
                className="text-[13px] font-bold text-slate-800 uppercase tracking-wider"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Computational Parameters
              </h2>
              <button onClick={() => setShowCompParams(false)} className="p-1 rounded hover:bg-slate-200 transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">

              {/* ── Time Stages ── */}
              <PropSection
                title="Time Stages"
                headerExtra={
                  <Button
                    size="sm"
                    className="h-6 text-[11px] px-3 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white border-0"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                    onClick={() => {
                      const newStages = [...computationalParams.stages, { dtcomp: 0.01, dtout: 0.1, tmax: 100 }];
                      updateComputationalParams({ stages: newStages });
                    }}
                  >
                    Add Stage
                  </Button>
                }
              >
                <div className="px-3 py-2 space-y-2">
                  {/* Column headers */}
                  <div className="grid grid-cols-12 gap-2 px-0.5">
                    <div className="col-span-3">
                      <span
                        className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide"
                        style={{ fontFamily: 'Poppins, sans-serif' }}
                      >
                        DTCOMP
                      </span>
                      <p
                        className="text-[9px] text-slate-400 leading-tight"
                        style={{ fontFamily: 'Poppins, sans-serif' }}
                      >
                        Computation step
                      </p>
                    </div>
                    <div className="col-span-3">
                      <span
                        className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide"
                        style={{ fontFamily: 'Poppins, sans-serif' }}
                      >
                        DTOUT
                      </span>
                      <p
                        className="text-[9px] text-slate-400 leading-tight"
                        style={{ fontFamily: 'Poppins, sans-serif' }}
                      >
                        Output interval
                      </p>
                    </div>
                    <div className="col-span-4">
                      <span
                        className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide"
                        style={{ fontFamily: 'Poppins, sans-serif' }}
                      >
                        TMAX
                      </span>
                      <p
                        className="text-[9px] text-slate-400 leading-tight"
                        style={{ fontFamily: 'Poppins, sans-serif' }}
                      >
                        Simulation end time
                      </p>
                    </div>
                  </div>

                  {/* Stage rows */}
                  {computationalParams.stages.map((stage, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-12 gap-2 items-center p-2 border border-slate-200 rounded-md bg-white"
                    >
                      <div className="col-span-3">
                        <Input
                          type="text"
                          inputMode="decimal"
                          className="h-7 text-[12px] font-medium text-black border-slate-300"
                          style={{ fontFamily: 'Poppins, sans-serif' }}
                          value={stage.dtcomp}
                          onChange={e => {
                            const newStages = [...computationalParams.stages];
                            newStages[index] = { ...stage, dtcomp: parseFloat(e.target.value) || 0 };
                            updateComputationalParams({ stages: newStages });
                          }}
                          data-testid={`input-dtcomp-${index}`}
                        />
                      </div>
                      <div className="col-span-3">
                        <Input
                          type="text"
                          inputMode="decimal"
                          className="h-7 text-[12px] font-medium text-black border-slate-300"
                          style={{ fontFamily: 'Poppins, sans-serif' }}
                          value={stage.dtout}
                          onChange={e => {
                            const newStages = [...computationalParams.stages];
                            newStages[index] = { ...stage, dtout: parseFloat(e.target.value) || 0 };
                            updateComputationalParams({ stages: newStages });
                          }}
                          data-testid={`input-dtout-${index}`}
                        />
                      </div>
                      <div className="col-span-4">
                        <Input
                          type="text"
                          inputMode="decimal"
                          className="h-7 text-[12px] font-medium text-black border-slate-300"
                          style={{ fontFamily: 'Poppins, sans-serif' }}
                          value={stage.tmax}
                          onChange={e => {
                            const newStages = [...computationalParams.stages];
                            newStages[index] = { ...stage, tmax: parseFloat(e.target.value) || 0 };
                            updateComputationalParams({ stages: newStages });
                          }}
                          data-testid={`input-tmax-${index}`}
                        />
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                          disabled={computationalParams.stages.length === 1}
                          onClick={() => {
                            const newStages = computationalParams.stages.filter((_, i) => i !== index);
                            updateComputationalParams({ stages: newStages });
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {computationalParams.stages.length === 0 && (
                    <p
                      className="text-[11px] text-slate-400 italic text-center py-3"
                      style={{ fontFamily: 'Poppins, sans-serif' }}
                    >
                      No stages. Click &quot;Add Stage&quot; to begin.
                    </p>
                  )}
                </div>
              </PropSection>

              {/* ── Accuracy Check (ACCUTEST) ── */}
              <PropSection title="Accuracy Check (ACCUTEST)">
                {/* Include ACCUTEST checkbox row */}
                <div className="flex items-center gap-3 px-3 py-3 border-b border-slate-100">
                  <Checkbox
                    id="includeAccutest-ribbon"
                    checked={computationalParams.includeAccutest !== false}
                    onCheckedChange={(checked) => updateComputationalParams({ includeAccutest: !!checked })}
                    data-testid="checkbox-include-accutest"
                  />
                  <div>
                    <Label
                      htmlFor="includeAccutest-ribbon"
                      className="text-[13px] font-semibold text-black leading-tight cursor-pointer"
                      style={{ fontFamily: 'Poppins, sans-serif' }}
                    >
                      Include ACCUTEST in .INP
                    </Label>
                    <p
                      className="text-[10px] text-slate-400 mt-0.5"
                      style={{ fontFamily: 'Poppins, sans-serif' }}
                    >
                      Adds accuracy-checking block to exported file
                    </p>
                  </div>
                </div>

                {/* ACCUTEST Mode select row */}
                <PropRow label="ACCUTEST Mode" noBorder>
                  <Select
                    disabled={computationalParams.includeAccutest === false}
                    value={computationalParams.accutest || 'NONE'}
                    onValueChange={(v: any) => updateComputationalParams({ accutest: v })}
                  >
                    <SelectTrigger
                      id="accutest-ribbon"
                      className={`h-7 text-[12px] font-medium text-black border-slate-300 ${computationalParams.includeAccutest === false ? 'opacity-40' : ''}`}
                      style={{ fontFamily: 'Poppins, sans-serif' }}
                    >
                      <SelectValue placeholder="Select accuracy mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FULL">FULL — High Accuracy</SelectItem>
                      <SelectItem value="PARTIAL">PARTIAL — Moderate</SelectItem>
                      <SelectItem value="NONE">NONE — No Checking</SelectItem>
                    </SelectContent>
                  </Select>
                </PropRow>
              </PropSection>

            </div>
          </div>
        </div>
      )}

      {/* ── OUTPUT REQUESTS SIDEBAR ── */}
      {showOutputDialog && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div className="absolute inset-0 bg-black/30 pointer-events-auto" onClick={() => handleCloseOutputDialog(false)} />
          <div className="absolute right-0 top-0 h-full w-[460px] bg-white shadow-2xl border-l border-slate-200 flex flex-col pointer-events-auto animate-in slide-in-from-right duration-300">

            {/* Header bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b bg-slate-50 shrink-0">
              <h2
                className="text-[13px] font-bold text-slate-800 uppercase tracking-wider"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Configure Output Requests
              </h2>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  className="h-7 text-[13px] px-4 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white border-0"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                  onClick={() => {
                    const types: ("HISTORY" | "PLOT" | "SPREADSHEET")[] = ["HISTORY", "PLOT", "SPREADSHEET"];
                    const variables = ["Q", "HEAD", "ELEV", "VEL", "PRESS", "PIEZHEAD"];
                    nodes.forEach(node => {
                      const isSurgeTank = node.data.type === 'surgeTank';
                      types.forEach(type => {
                        const existsNode = outputRequests.some(req =>
                          req.elementId === node.id && req.requestType === type && req.isElement === false
                        );
                        if (!existsNode) {
                          addOutputRequest({ elementId: node.id, elementType: "node", requestType: type, isElement: false, variables: [...variables] });
                        }
                        if (isSurgeTank) {
                          const existsElem = outputRequests.some(req =>
                            req.elementId === node.id && req.requestType === type && req.isElement === true
                          );
                          if (!existsElem) {
                            addOutputRequest({ elementId: node.id, elementType: "node", requestType: type, isElement: true, variables: [...variables] });
                          }
                        }
                      });
                    });
                    const uniqueEdges = Array.from(new Map(edges.map(e => [e.data?.label || e.id, e])).values());
                    uniqueEdges.forEach(edge => {
                      types.forEach(type => {
                        const exists = outputRequests.some(req => req.elementId === edge.id && req.requestType === type);
                        if (!exists) {
                          addOutputRequest({ elementId: edge.id, elementType: "edge", requestType: type, isElement: true, variables: [...variables] });
                        }
                      });
                    });
                  }}
                  data-testid="button-select-all-requests"
                >
                  Select All
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-[13px] px-4 rounded-full bg-red-500 hover:bg-red-600 text-white border-0"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                  onClick={() => { [...outputRequests].forEach(req => removeOutputRequest(req.id)); }}
                  data-testid="button-clear-all-requests"
                >
                  Clear All
                </Button>
                <button
                  onClick={() => handleCloseOutputDialog(false)}
                  className="p-1 rounded hover:bg-slate-200 transition-colors ml-1"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">

              {/* ── Request Configuration ── */}
              <PropSection title="Request Configuration">

                {/* Select Type (group selection, hidden for SNAPSHOT) */}
                {requestType !== "SNAPSHOT" && (
                  <PropRow label="Select Type">
                    <Select
                      value={selectedGroupType}
                      onValueChange={(v: any) => {
                        setSelectedGroupType(v);
                        setSelectedElementId("");
                      }}
                    >
                      <SelectTrigger
                        className="h-7 text-[12px] font-medium text-black border-slate-300"
                        style={{ fontFamily: 'Poppins, sans-serif' }}
                      >
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nodes">All Nodes</SelectItem>
                        <SelectItem value="elements">All Elements</SelectItem>
                        <SelectItem value="conduits">All Conduits</SelectItem>
                        <SelectItem value="dummy">All Dummy Pipes</SelectItem>
                      </SelectContent>
                    </Select>
                  </PropRow>
                )}

                {/* Select Element (hidden for SNAPSHOT) */}
                {requestType !== "SNAPSHOT" && (
                  <PropRow label="Select Element">
                    <Select value={selectedElementId} onValueChange={(v) => { setSelectedElementId(v); setSelectedGroupType(""); }}>
                      <SelectTrigger
                        className="h-7 text-[12px] font-medium text-black border-slate-300"
                        style={{ fontFamily: 'Poppins, sans-serif' }}
                      >
                        <SelectValue placeholder="Select element..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_" disabled>— Elements —</SelectItem>
                        {nodes
                          .filter((n) => n.data.type === "surgeTank" || n.data.type === "pump" || n.data.type === "checkValve" || n.data.type === "turbine" || n.type === "surgeTank" || n.type === "pump" || n.type === "checkValve" || n.type === "turbine")
                          .filter((n) => !outputRequests.some((req) => req.elementId === n.id && req.requestType === requestType && req.isElement))
                          .map((n) => (
                            <SelectItem key={`element-${n.id}`} value={`element:${n.id}`}>{n.data.label}</SelectItem>
                          ))}
                        {Array.from(new Map(
                          edges.filter((e) => e.data?.type === "turbine")
                            .filter((e) => !outputRequests.some((req) => req.elementId === e.id && req.requestType === requestType))
                            .map(e => [e.data?.label || `Edge ${e.id}`, e])
                        ).entries()).map(([label, e]) => (
                          <SelectItem key={`turbine-edge-${e.id}`} value={e.id}>{label}</SelectItem>
                        ))}
                        <SelectItem value="__" disabled>— Nodes —</SelectItem>
                        {nodes
                          .filter((n) => !outputRequests.some((req) => req.elementId === n.id && req.requestType === requestType && !req.isElement))
                          .map((n) => (
                            <SelectItem key={`node-${n.id}`} value={`node:${n.id}`}>{String(n.data.nodeNumber)}</SelectItem>
                          ))}
                        <SelectItem value="___" disabled>— Conduits —</SelectItem>
                        {Array.from(new Map(
                          edges.filter((e) => e.data?.type === "conduit")
                            .filter((e) => !outputRequests.some((req) => req.elementId === e.id && req.requestType === requestType))
                            .map(e => [e.data?.label || `Edge ${e.id}`, e])
                        ).entries()).map(([label, e]) => (
                          <SelectItem key={e.id} value={e.id}>{label}</SelectItem>
                        ))}
                        <SelectItem value="____" disabled>— Dummy Pipes —</SelectItem>
                        {Array.from(new Map(
                          edges.filter((e) => e.data?.type === "dummy")
                            .filter((e) => !outputRequests.some((req) => req.elementId === e.id && req.requestType === requestType))
                            .map(e => [e.data?.label || `Edge ${e.id}`, e])
                        ).entries()).map(([label, e]) => (
                          <SelectItem key={e.id} value={e.id}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </PropRow>
                )}

                {/* Request Type */}
                <PropRow label="Request Type" noBorder={requestType === "SNAPSHOT"}>
                  <Select value={requestType} onValueChange={(v: any) => setRequestType(v)}>
                    <SelectTrigger
                      className="h-7 text-[12px] font-medium text-black border-slate-300"
                      style={{ fontFamily: 'Poppins, sans-serif' }}
                    >
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HISTORY">HISTORY</SelectItem>
                      <SelectItem value="PLOT">PLOT</SelectItem>
                      <SelectItem value="SPREADSHEET">SPREADSHEET</SelectItem>
                      <SelectItem value="SNAPSHOT">SNAPSHOT</SelectItem>
                    </SelectContent>
                  </Select>
                </PropRow>

                {/* SNAPSHOT inputs */}
                {requestType === "SNAPSHOT" && (
                  <PropRow label="Snapshot Time" noBorder>
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        inputMode="decimal"
                        className="flex h-7 flex-1 rounded-md border border-slate-300 bg-transparent px-2 py-0.5 text-[12px] font-medium text-black shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        style={{ fontFamily: 'Poppins, sans-serif' }}
                        value={snapshotTimeInput}
                        onChange={(e) => setSnapshotTimeInput(e.target.value)}
                        placeholder="e.g. 0"
                        data-testid="input-snapshot-time"
                      />
                      <Button
                        size="sm"
                        className="h-7 px-2 text-[11px] shrink-0"
                        style={{ fontFamily: 'Poppins, sans-serif' }}
                        onClick={() => {
                          const t = parseFloat(snapshotTimeInput);
                          if (!isNaN(t)) {
                            addSnapshotTime(t);
                            setSnapshotTimeInput("0");
                            toast({ title: "Snapshot Added", description: `SNAPSHOT TIME ${t} added.` });
                          }
                        }}
                        data-testid="button-add-snapshot"
                      >
                        Add
                      </Button>
                    </div>
                  </PropRow>
                )}
              </PropSection>

              {/* ── Variables (hidden for SNAPSHOT) ── */}
              {requestType !== "SNAPSHOT" && (
                <PropSection title="Variables">
                  <div className="px-3 py-3">
                    <p
                      className="text-[10px] text-slate-400 mb-2 leading-snug"
                      style={{ fontFamily: 'Poppins, sans-serif' }}
                    >
                      {isTurbineSelected
                        ? 'Turbine element: Q, HEAD, SPEED, POWER available'
                        : 'Select which output variables to record for this element'}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                      {availableVars.map((v) => (
                        <div key={v} className="flex items-center gap-1.5">
                          <Checkbox
                            id={`header-var-${v}`}
                            checked={selectedVars.includes(v)}
                            onCheckedChange={(checked) => {
                              if (checked) setSelectedVars([...selectedVars, v]);
                              else setSelectedVars(selectedVars.filter((sv) => sv !== v));
                            }}
                            data-testid={`checkbox-var-${v}`}
                          />
                          <Label
                            htmlFor={`header-var-${v}`}
                            className="text-[12px] font-semibold text-black cursor-pointer"
                            style={{ fontFamily: 'Poppins, sans-serif' }}
                          >
                            {v}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-col gap-2">
                      {selectedGroupType && (
                        <Button
                          onClick={handleAddAllForType}
                          disabled={selectedVars.length === 0}
                          className="w-full h-8 text-[13px] rounded-full bg-green-600 hover:bg-green-700 text-white"
                          style={{ fontFamily: 'Poppins, sans-serif' }}
                          data-testid="button-add-all-for-type"
                        >
                          Add All for {selectedGroupType === "nodes" ? "Nodes" : selectedGroupType === "elements" ? "Elements" : selectedGroupType === "conduits" ? "Conduits" : "Dummy Pipes"}
                        </Button>
                      )}
                      {selectedElementId && (
                        <Button
                          onClick={handleAddRequest}
                          disabled={selectedVars.length === 0}
                          className="w-full h-8 text-[13px] rounded-full"
                          style={{ fontFamily: 'Poppins, sans-serif' }}
                          data-testid="button-add-request"
                        >
                          Add Request
                        </Button>
                      )}
                      {!selectedGroupType && !selectedElementId && (
                        <Button
                          disabled
                          className="w-full h-8 text-[13px] rounded-full opacity-50"
                          style={{ fontFamily: 'Poppins, sans-serif' }}
                        >
                          Select a type or element above
                        </Button>
                      )}
                    </div>
                  </div>
                </PropSection>
              )}

              {/* ── Current Requests ── */}
              <PropSection title={`Current Requests — ${requestType}`}>
                <div className="divide-y divide-slate-100">
                  {requestType === "SNAPSHOT" ? (
                    snapshotTimes.length === 0 ? (
                      <p
                        className="text-[11px] text-slate-400 italic text-center py-4"
                        style={{ fontFamily: 'Poppins, sans-serif' }}
                      >
                        No snapshots added yet.
                      </p>
                    ) : (
                      snapshotTimes.map((t, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2">
                          <span
                            className="text-[12px] font-medium text-black"
                            style={{ fontFamily: 'Poppins, sans-serif' }}
                          >
                            SNAPSHOT TIME {t}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={() => removeSnapshotTime(i)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))
                    )
                  ) : (
                    (() => {
                      const filtered = [...outputRequests]
                        .filter((req) => req.requestType === requestType)
                        .sort((a, b) => {
                          const elA = nodes.find((n) => n.id === a.elementId) || edges.find((e) => e.id === a.elementId);
                          const elB = nodes.find((n) => n.id === b.elementId) || edges.find((e) => e.id === b.elementId);
                          const getSortKey = (el) => {
                            if (!el) return "zzzz";
                            if (el.data?.nodeNumber !== undefined) return `node-${String(el.data.nodeNumber).padStart(10, '0')}`;
                            return `edge-${el.data?.label || el.id}`;
                          };
                          return getSortKey(elA).localeCompare(getSortKey(elB), undefined, { numeric: true });
                        });
                      if (filtered.length === 0) {
                        return (
                          <p
                            className="text-[11px] text-slate-400 italic text-center py-4"
                            style={{ fontFamily: 'Poppins, sans-serif' }}
                          >
                            No {requestType} requests configured.
                          </p>
                        );
                      }
                      return filtered.map((req) => {
                        const el = nodes.find((n) => n.id === req.elementId) || edges.find((e) => e.id === req.elementId);
                        const isEdgeElem = req.elementType === 'edge';
                        const isSurgeTankElem = req.elementType === 'node' && el?.data?.type === 'surgeTank' && req.isElement;
                        const useElem = isEdgeElem || isSurgeTankElem;
                        const displayLabel = useElem
                          ? (el?.data?.label || req.elementId)
                          : (el?.data?.nodeNumber?.toString() || el?.data?.label || req.elementId);
                        const prefix = useElem ? 'ELEM' : 'NODE';
                        return (
                          <div
                            key={`${req.id}-${req.requestType}`}
                            className="flex items-center justify-between px-3 py-2"
                          >
                            <div>
                              <span
                                className="text-[12px] font-semibold text-black"
                                style={{ fontFamily: 'Poppins, sans-serif' }}
                              >
                                {prefix} {displayLabel}
                              </span>
                              <span
                                className="text-[11px] text-slate-500 ml-1"
                                style={{ fontFamily: 'Poppins, sans-serif' }}
                              >
                                ({req.requestType}): {req.variables.join(", ")}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => removeOutputRequest(req.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        );
                      });
                    })()
                  )}
                </div>
              </PropSection>

            </div>

            {/* ── Generate footer (only when triggered from INP/OUT flow) ── */}
            {generateDialogMode && (
              <div className="px-5 py-4 border-t bg-slate-50 flex items-center gap-3 shrink-0">
                <p
                  className="text-[11px] text-slate-500 flex-1 leading-snug"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  Review output requests above, then continue to generate the file.
                </p>
                <Button
                  onClick={handleConfirmGenerate}
                  className="bg-[#1a73e8] hover:bg-[#1557b0] text-white flex-shrink-0 h-8 text-[12px]"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                  data-testid="button-confirm-generate"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Generate .{generateDialogMode === 'inp' ? 'INP' : 'OUT'}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <FlexTable open={showFlexTable} onClose={() => setShowFlexTable(false)} />
      <HelpModal open={showHelp} onClose={() => setShowHelp(false)} />

      {/* ── Generate Network Using .INP Modal ─────────────────────────────── */}
      <input
        ref={inpFileInputRef}
        type="file"
        accept=".inp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleInpFileSelect(f);
          e.target.value = '';
        }}
      />
      {showImportInp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden flex flex-col" style={{ fontFamily: 'Poppins, sans-serif' }}>

            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b bg-gradient-to-r from-teal-600 to-teal-700">
              <FileCode2 className="w-6 h-6 text-white flex-shrink-0" />
              <div>
                <h2 className="text-[15px] font-semibold text-white">Generate Network Using .INP</h2>
                <p className="text-[11px] text-teal-100">Import an existing WHAMO input file to auto-build the diagram</p>
              </div>
              <button
                onClick={() => setShowImportInp(false)}
                className="ml-auto p-1 rounded-full hover:bg-teal-500 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 flex flex-col gap-4">

              {/* Drop zone */}
              <div
                className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center gap-3 cursor-pointer transition-colors ${inpFile ? 'border-teal-400 bg-teal-50' : 'border-slate-300 hover:border-teal-400 hover:bg-teal-50/40'}`}
                onClick={() => inpFileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleInpFileSelect(f);
                }}
                data-testid="dropzone-inp"
              >
                <Upload className={`w-8 h-8 ${inpFile ? 'text-teal-500' : 'text-slate-400'}`} />
                {inpFile ? (
                  <div className="text-center">
                    <p className="text-[13px] font-semibold text-teal-700">{inpFile.name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Click to change file</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-[13px] font-medium text-slate-600">Click to browse or drag & drop</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Accepts .INP files (WHAMO format)</p>
                  </div>
                )}
              </div>

              {/* Parsing indicator */}
              {inpParsing && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  <span className="text-[12px] text-blue-700">Parsing .INP file…</span>
                </div>
              )}

              {/* Parse error */}
              {inpParseError && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                  <TriangleAlert className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-[12px] text-red-700">{inpParseError}</span>
                </div>
              )}

              {/* Preview card */}
              {inpPreview && !inpParsing && (() => {
                const NODE_LABELS: Record<string, string> = {
                  reservoir: 'Reservoir',
                  node: 'Node',
                  junction: 'Junction',
                  surgeTank: 'Surge Tank',
                  flowBoundary: 'Flow Boundary',
                };
                const EDGE_LABELS: Record<string, string> = {
                  conduit: 'Conduit',
                  dummy: 'Dummy Pipe',
                  pump: 'Pump',
                  turbine: 'Turbine',
                  checkValve: 'Check Valve',
                };
                const nodeRows = Object.entries(inpPreview.nodeTypes).sort((a, b) => b[1] - a[1]);
                const edgeRows = Object.entries(inpPreview.edgeTypes).sort((a, b) => b[1] - a[1]);

                return (
                  <div className="border border-teal-200 rounded-lg bg-teal-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-teal-100 border-b border-teal-200">
                      <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
                      <span className="text-[12px] font-semibold text-teal-800">Ready to generate</span>
                      <span className="ml-auto text-[11px] text-teal-600 font-medium truncate max-w-[180px]">{inpPreview.projectName}</span>
                    </div>

                    <div className="px-4 py-3 flex flex-col gap-3">

                      {/* Nodes section */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Nodes</span>
                          <span className="text-[10px] font-bold text-teal-700">{inpPreview.nodeCount} total</span>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-md divide-y divide-slate-100">
                          {nodeRows.length === 0 ? (
                            <div className="px-3 py-1.5 text-[11px] text-slate-400 italic">None</div>
                          ) : nodeRows.map(([type, count]) => (
                            <div key={type} className="flex items-center justify-between px-3 py-1.5">
                              <span className="text-[11px] text-slate-600">{NODE_LABELS[type] ?? type}</span>
                              <span className="text-[11px] font-semibold text-slate-800">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Connections section */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Connections</span>
                          <span className="text-[10px] font-bold text-teal-700">{inpPreview.edgeCount} total</span>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-md divide-y divide-slate-100">
                          {edgeRows.length === 0 ? (
                            <div className="px-3 py-1.5 text-[11px] text-slate-400 italic">None</div>
                          ) : edgeRows.map(([type, count]) => (
                            <div key={type} className="flex items-center justify-between px-3 py-1.5">
                              <span className="text-[11px] text-slate-600">{EDGE_LABELS[type] ?? type}</span>
                              <span className="text-[11px] font-semibold text-slate-800">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Hydraulic data & simulation */}
                      {(inpPreview.pcharCount > 0 || inpPreview.tcharCount > 0 || inpPreview.stageCount > 0) && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Hydraulic Data</span>
                          </div>
                          <div className="bg-white border border-slate-200 rounded-md divide-y divide-slate-100">
                            {inpPreview.pcharCount > 0 && (
                              <div className="flex items-center justify-between px-3 py-1.5">
                                <span className="text-[11px] text-slate-600">Pump curve types</span>
                                <span className="text-[11px] font-semibold text-slate-800">{inpPreview.pcharCount}</span>
                              </div>
                            )}
                            {inpPreview.tcharCount > 0 && (
                              <div className="flex items-center justify-between px-3 py-1.5">
                                <span className="text-[11px] text-slate-600">Turbine curve types</span>
                                <span className="text-[11px] font-semibold text-slate-800">{inpPreview.tcharCount}</span>
                              </div>
                            )}
                            {inpPreview.stageCount > 0 && (
                              <div className="flex items-center justify-between px-3 py-1.5">
                                <span className="text-[11px] text-slate-600">Simulation stages</span>
                                <span className="text-[11px] font-semibold text-slate-800">{inpPreview.stageCount}</span>
                              </div>
                            )}
                            {inpPreview.tmax !== null && (
                              <div className="flex items-center justify-between px-3 py-1.5">
                                <span className="text-[11px] text-slate-600">Max simulation time</span>
                                <span className="text-[11px] font-semibold text-slate-800">{inpPreview.tmax} s</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowImportInp(false)}
                className="px-4 py-2 text-[12px] font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateFromInp}
                disabled={!inpPreview || inpParsing}
                className="px-5 py-2 text-[12px] font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
                data-testid="button-generate-from-inp"
              >
                <FileCode2 className="w-4 h-4" />
                Generate Network
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
