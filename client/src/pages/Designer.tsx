import { useCallback, useRef, useState, useEffect } from 'react';
import { 
  PlusCircle, 
  Circle, 
  GitCommitHorizontal, 
  Cylinder, 
  ArrowRightCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  NodeChange,
  EdgeChange,
  Connection,
  Edge,
  Node,
  useReactFlow,
  ReactFlowProvider,
  ControlButton
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { cn } from '@/lib/utils';
import { useNetworkStore, WhamoNode, WhamoEdge } from '@/lib/store';
import { registerScreenToFlowPosition } from '@/lib/viewport';
import { ReservoirNode, SimpleNode, JunctionNode, SurgeTankNode, FlowBoundaryNode, PumpNode, CheckValveNode, TurbineNode } from '@/components/NetworkNode';
import { ConnectionEdge } from '@/components/ConnectionEdge';
import { PropertiesPanel } from '@/components/PropertiesPanel';
import { NodeSelectionPanel } from '@/components/NodeSelectionPanel';
import { Header } from '@/components/Header';
import { generateInpFile } from '@/lib/inp-generator';
import { generateSystemDiagram } from '@/lib/diagram-generator';
import { parseInpFile } from '@/lib/inp-parser';
import { saveAs } from 'file-saver';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { 
  Download, 
  X, 
  Maximize2, 
  Minimize2, 
  ChevronDown, 
  ChevronUp,
  Layout,
  Sun,
  Moon,
  Pencil,
  Check
} from 'lucide-react';
import networkIcon from '@assets/network_1779525899254.png';
import eyeOpenIcon from '@assets/view_(2)_1779527800443.png';
import eyeHiddenIcon from '@assets/hidden_1779529637135.png';
import html2canvas from 'html2canvas';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { ValidationModal } from '@/components/ValidationModal';
import { validateNetwork, ValidationError } from '@/lib/validator';
import { VisualizationView } from '@/components/visualization/VisualizationView';
import { ProjectsListPanel } from '@/components/ProjectsListPanel';
import { getAuthHeader } from '@/lib/queryClient';
import { getAutosaveSettings } from '@/components/SettingsDialog';
import { useAuth } from '@/context/AuthContext';

const LAST_PROJECT_KEY = "whamo_last_project_id";

const nodeTypes = {
  reservoir: ReservoirNode,
  node: SimpleNode,
  junction: JunctionNode,
  surgeTank: SurgeTankNode,
  flowBoundary: FlowBoundaryNode,
  pump: PumpNode,
  checkValve: CheckValveNode,
  turbine: TurbineNode,
};

const edgeTypes = {
  connection: ConnectionEdge,
};

function DesignerInner() {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const hasRestoredRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { zoomIn, zoomOut, fitView, screenToFlowPosition } = useReactFlow();
  useEffect(() => { registerScreenToFlowPosition(screenToFlowPosition); }, [screenToFlowPosition]);
  const [validationData, setValidationData] = useState<{ errors: ValidationError[], warnings: ValidationError[] } | null>(null);
  const [pendingGenerateMode, setPendingGenerateMode] = useState<'inp' | 'out' | null>(null);
  const [showNodeSelection, setShowNodeSelection] = useState(false);
  const [showVisualization, setShowVisualization] = useState(false);

  useEffect(() => {
    const handleToggleNodeSelection = () => {
      setShowNodeSelection(prev => !prev);
    };
    
    window.addEventListener('toggleNodeSelection', handleToggleNodeSelection);
    return () => window.removeEventListener('toggleNodeSelection', handleToggleNodeSelection);
  }, []);

  // We connect local ReactFlow state to our global Zustand store for properties panel sync
  const { 
    nodes, 
    edges, 
    projectName,
    computationalParams,
    outputRequests,
    pcharData,
    snapshotTimes,
    hSchedules,
    qSchedules,
    onNodesChange: storeOnNodesChange, 
    onEdgesChange: storeOnEdgesChange,
    onConnect: storeOnConnect, 
    selectElement, 
    loadNetwork,
    clearNetwork,
    deleteElement,
    selectedElementId,
    selectedElementType,
    isLocked,
    toggleLock,
    undo,
    redo,
    loadedFileHandle,
    setLoadedFileHandle,
    setAllNodesSelected,
    addNode,
    addEdgeElement,
    nodeSelectionSet,
  } = useNetworkStore();

  const [activeLinkTool, setActiveLinkTool] = useState<'pump' | 'checkValve' | 'turbine' | null>(null);
  const [linkSourceNodeId, setLinkSourceNodeId] = useState<string | null>(null);

  // Refs always hold the latest values — used in event listeners to avoid stale closures
  const activeLinkToolRef = useRef<'pump' | 'checkValve' | 'turbine' | null>(null);
  const linkSourceNodeIdRef = useRef<string | null>(null);
  const rfContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => { activeLinkToolRef.current = activeLinkTool; }, [activeLinkTool]);
  useEffect(() => { linkSourceNodeIdRef.current = linkSourceNodeId; }, [linkSourceNodeId]);

  // Fields that live in a pipe profile (shared across same-label edges)
  const PIPE_PROFILE_FIELDS = [
    'type', 'length', 'diameter', 'celerity', 'friction', 'numSegments',
    'variable', 'distance', 'area', 'd', 'a', 'pipeE', 'pipeWT', 'manningsN',
    'cplus', 'cminus', 'hasAddedLoss', 'includeNumSegments', 'comment', '_unitCache',
  ];

  const buildPipeProfiles = (edgeList: WhamoEdge[]) => {
    const profiles: Record<string, any> = {};
    edgeList.forEach(e => {
      const lbl = (e.data?.label as string) || '';
      const etype = e.data?.type as string;
      if (!lbl || (etype !== 'conduit' && etype !== 'dummy') || profiles[lbl]) return;
      const profileData: Record<string, any> = {};
      PIPE_PROFILE_FIELDS.forEach(f => {
        const v = (e.data as any)?.[f];
        if (v !== undefined) profileData[f] = v;
      });
      profiles[lbl] = profileData;
    });
    return profiles;
  };

  const compactEdges = (edgeList: WhamoEdge[], profiles: Record<string, any>) =>
    edgeList.map(e => {
      const lbl = (e.data?.label as string) || '';
      if (!lbl || !profiles[lbl]) return e;
      // Keep only connectivity + label; profile data is stored once in pipeProfiles
      const slimData: Record<string, any> = { label: lbl };
      Object.entries(e.data || {}).forEach(([k, v]) => {
        if (!PIPE_PROFILE_FIELDS.includes(k)) slimData[k] = v;
      });
      return { ...e, data: slimData };
    });

  const expandEdges = (edgeList: any[], profiles?: Record<string, any>): WhamoEdge[] => {
    if (!profiles) return edgeList as WhamoEdge[];
    return edgeList.map(e => {
      const lbl = e.data?.label as string;
      if (!lbl || !profiles[lbl]) return e;
      return { ...e, data: { ...profiles[lbl], ...e.data } };
    }) as WhamoEdge[];
  };

  const buildProjectData = () => {
    const state = useNetworkStore.getState();
    const liveEdges = state.edges as WhamoEdge[];
    const profiles = buildPipeProfiles(liveEdges);
    return {
      projectName: state.projectName,
      nodes: state.nodes,
      edges: compactEdges(liveEdges, profiles),
      pipeProfiles: profiles,
      computationalParams: state.computationalParams,
      outputRequests: state.outputRequests,
      pcharData: state.pcharData,
      tcharData: state.tcharData,
      vSchedules: state.vSchedules,
      snapshotTimes: state.snapshotTimes,
      hSchedules: state.hSchedules,
      qSchedules: state.qSchedules,
      nodeSelectionSet: Array.from(state.nodeSelectionSet),
    };
  };

  const handleSave = async (silent = false) => {
    // Read live values from the store — autosave uses a stale closure so we can't trust captured vars
    const { projectName: liveProjectName } = useNetworkStore.getState();
    const data = buildProjectData();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    };
    // Always read from the ref so the autosave interval (stale closure) gets the current ID
    const currentProjectId = serverProjectIdRef.current;
    try {
      let saved: any;
      if (currentProjectId) {
        const res = await fetch(`/api/projects/${currentProjectId}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ name: projectName, content: data }),
        });
        if (!res.ok) throw new Error("Update failed");
        saved = await res.json();
      } else {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers,
          body: JSON.stringify({ name: projectName, content: data }),
        });
        if (!res.ok) throw new Error("Create failed");
        saved = await res.json();
        setServerProjectId(saved.id);
        serverProjectIdRef.current = saved.id;
      }
      if (!silent) {
        toast({ variant: "success", title: "Project Saved", description: `"${projectName}" saved to your account.` });
      }
    } catch (err) {
      console.error("Server save failed:", err);
      if (!silent) {
        toast({ variant: "destructive", title: "Save Failed", description: "Could not save project. Please try again." });
      }
    }
  };

  // ── Autosave ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const startInterval = () => {
      if (interval) clearInterval(interval);
      const settings = getAutosaveSettings();
      if (!settings.enabled) return;
      interval = setInterval(() => {
        const { projectName: pn } = useNetworkStore.getState();
        const currentId = serverProjectIdRef.current;
        if (!currentId || !pn || pn === "Untitled Network") return;
        handleSave(true);
      }, settings.intervalSec * 1000);
    };

    startInterval();

    const handleSettingsChanged = () => startInterval();
    window.addEventListener("autosave-settings-changed", handleSettingsChanged);

    return () => {
      if (interval) clearInterval(interval);
      window.removeEventListener("autosave-settings-changed", handleSettingsChanged);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveAs = async () => {
    const state2 = useNetworkStore.getState();
    const liveEdges2 = state2.edges as WhamoEdge[];
    const profiles = buildPipeProfiles(liveEdges2);
    const data = { 
      projectName: state2.projectName,
      nodes: state2.nodes,
      edges: compactEdges(liveEdges2, profiles),
      pipeProfiles: profiles,
      computationalParams: state2.computationalParams,
      outputRequests: state2.outputRequests,
      pcharData: state2.pcharData,
      tcharData: state2.tcharData,
      vSchedules: state2.vSchedules,
      snapshotTimes: state2.snapshotTimes,
      hSchedules: state2.hSchedules,
      qSchedules: state2.qSchedules,
      nodeSelectionSet: Array.from(state2.nodeSelectionSet),
    };

    const suggestedName = `${projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'network'}.json`;

    try {
      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName,
          types: [
            {
              description: 'WHAMO Project',
              accept: { 'application/json': ['.json'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();
        setLoadedFileHandle(handle);
        toast({ variant: "success", title: "Project Saved As", description: `Saved a new copy as ${handle.name}.` });
        return;
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.warn("Save As picker failed, falling back to download:", err);
    }

    // Fallback to traditional download
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    saveAs(blob, suggestedName);
    toast({ variant: "success", title: "Project Downloaded", description: "Saved a new copy as JSON file." });
  };

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (isLocked) return;
      storeOnNodesChange(changes);
    },
    [storeOnNodesChange, isLocked]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (isLocked) return;
      storeOnEdgesChange(changes);
    },
    [storeOnEdgesChange, isLocked]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (isLocked) return;
      if (params.source === params.target) {
        toast({
          variant: "destructive",
          title: "Invalid Connection",
          description: "An element cannot be connected to itself.",
        });
        return;
      }

      const MAX_CONNECTIONS = 6;
      const currentEdges = edges as WhamoEdge[];
      const sourceDegree = currentEdges.filter(
        e => e.source === params.source || e.target === params.source
      ).length;
      const targetDegree = currentEdges.filter(
        e => e.source === params.target || e.target === params.target
      ).length;

      if (sourceDegree >= MAX_CONNECTIONS) {
        const sourceNode = nodes.find(n => n.id === params.source);
        const label = (sourceNode?.data?.label as string) || `Node ${sourceNode?.data?.nodeNumber ?? params.source}`;
        toast({
          variant: "destructive",
          title: "Connection Limit Reached",
          description: `"${label}" already has ${MAX_CONNECTIONS} connections. WHAMO allows a maximum of ${MAX_CONNECTIONS} pipes at a junction.`,
        });
        return;
      }

      if (targetDegree >= MAX_CONNECTIONS) {
        const targetNode = nodes.find(n => n.id === params.target);
        const label = (targetNode?.data?.label as string) || `Node ${targetNode?.data?.nodeNumber ?? params.target}`;
        toast({
          variant: "destructive",
          title: "Connection Limit Reached",
          description: `"${label}" already has ${MAX_CONNECTIONS} connections. WHAMO allows a maximum of ${MAX_CONNECTIONS} pipes at a junction.`,
        });
        return;
      }

      storeOnConnect(params);

      // After connecting, check for node order violations
      const srcNode = nodes.find(n => n.id === params.source);
      const tgtNode = nodes.find(n => n.id === params.target);
      if (srcNode && tgtNode) {
        const srcNum = srcNode.data?.nodeNumber !== undefined ? Number(srcNode.data.nodeNumber) : NaN;
        const tgtNum = tgtNode.data?.nodeNumber !== undefined ? Number(tgtNode.data.nodeNumber) : NaN;
        if (!isNaN(srcNum) && !isNaN(tgtNum) && srcNum > tgtNum) {
          toast({
            variant: "warning",
            title: "Node Order Warning",
            description: `Node ${tgtNum} (${tgtNode.data?.label || tgtNode.id}) comes after Node ${srcNum} (${srcNode.data?.label || srcNode.id}). Node numbers must be in ascending sequence.`,
          });
        }
      }
    },
    [storeOnConnect, toast, isLocked, edges, nodes]
  );

  const MAX_CONNECTIONS = 6;

  const isValidConnection = useCallback(
    (connection: Connection) => {
      const currentEdges = useNetworkStore.getState().edges as WhamoEdge[];
      const sourceDegree = currentEdges.filter(
        e => e.source === connection.source || e.target === connection.source
      ).length;
      const targetDegree = currentEdges.filter(
        e => e.source === connection.target || e.target === connection.target
      ).length;
      return sourceDegree < MAX_CONNECTIONS && targetDegree < MAX_CONNECTIONS;
    },
    []
  );

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, connectionState: any) => {
      if (isLocked) return;
      // Only fire when dropped on empty canvas (no target node)
      if (connectionState?.fromNode && !connectionState?.toNode) {
        // Check if source already has max connections before creating new node
        const currentEdges = useNetworkStore.getState().edges as WhamoEdge[];
        const sourceId = connectionState.fromNode.id;
        const sourceDegree = currentEdges.filter(
          e => e.source === sourceId || e.target === sourceId
        ).length;
        if (sourceDegree >= MAX_CONNECTIONS) {
          const sourceNode = useNetworkStore.getState().nodes.find(n => n.id === sourceId);
          const label = (sourceNode?.data?.label as string) || `Node ${sourceNode?.data?.nodeNumber ?? sourceId}`;
          toast({
            variant: "destructive",
            title: "Connection Limit Reached",
            description: `"${label}" already has ${MAX_CONNECTIONS} connections. WHAMO allows a maximum of ${MAX_CONNECTIONS} pipes at a junction.`,
          });
          return;
        }

        const { clientX, clientY } =
          'changedTouches' in event ? event.changedTouches[0] : (event as MouseEvent);
        const dropPos = screenToFlowPosition({ x: clientX, y: clientY });

        // Determine which handle on the new node to connect to based on drag direction.
        // `connectionState.from` is the flow-coordinate position of the source handle.
        const from: { x: number; y: number } = connectionState.from ?? { x: 0, y: 0 };
        const dx = dropPos.x - from.x;
        const dy = dropPos.y - from.y;
        const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI); // -180..180

        // Map angle to the face of the new node the conduit should enter from.
        // The new node's OPPOSITE face should receive the connection.
        let targetHandle: string;
        if (angleDeg >= -45 && angleDeg < 45) {
          // Dragging right → enter new node from the LEFT
          targetHandle = 't-left';
        } else if (angleDeg >= 45 && angleDeg < 135) {
          // Dragging down → enter new node from the TOP
          targetHandle = 't-top';
        } else if (angleDeg >= 135 || angleDeg < -135) {
          // Dragging left → enter new node from the RIGHT
          targetHandle = 't-right';
        } else {
          // Dragging up → enter new node from the BOTTOM
          targetHandle = 't-bottom';
        }

        // Center the new node on the drop point (nodes are ~60×60 px)
        const centeredPos = { x: dropPos.x - 30, y: dropPos.y - 30 };
        addNode('node', centeredPos);

        // The new node is always appended last — grab it from the store
        const newNode = useNetworkStore.getState().nodes.at(-1);
        if (!newNode) return;

        storeOnConnect({
          source: connectionState.fromNode.id,
          sourceHandle: connectionState.fromHandle?.id ?? null,
          target: newNode.id,
          targetHandle,
        });
      }
    },
    [isLocked, screenToFlowPosition, addNode, storeOnConnect, toast]
  );

  // DOM-level capture listener: intercepts mousedown on any part of a node (body OR handle dots)
  // Uses refs so it always reads the latest tool/source values without stale closures.
  useEffect(() => {
    const container = rfContainerRef.current;
    if (!container) return;
    const handler = (event: MouseEvent) => {
      if (!activeLinkToolRef.current) return;
      const nodeEl = (event.target as Element).closest('.react-flow__node');
      if (!nodeEl) return;
      const nodeId = nodeEl.getAttribute('data-id');
      if (!nodeId) return;

      if (!linkSourceNodeIdRef.current) {
        linkSourceNodeIdRef.current = nodeId;
        setLinkSourceNodeId(nodeId);
      } else if (linkSourceNodeIdRef.current === nodeId) {
        toast({ variant: 'destructive', title: 'Invalid Connection', description: 'Cannot connect an element to itself.' });
      } else {
        const tool = activeLinkToolRef.current;
        const srcId = linkSourceNodeIdRef.current;
        addEdgeElement(tool, srcId, nodeId);
        linkSourceNodeIdRef.current = null;
        activeLinkToolRef.current = null;
        setLinkSourceNodeId(null);
        setActiveLinkTool(null);
      }
    };
    container.addEventListener('mousedown', handler, true);
    return () => container.removeEventListener('mousedown', handler, true);
  }, [addEdgeElement, toast]);

  // Normal node click: only runs when NOT in link mode (ref guard keeps it fast)
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (activeLinkToolRef.current) return;
    selectElement(node.id, 'node');
  }, [selectElement]);

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    selectElement(edge.id, 'edge');
  }, [selectElement]);

  // Selection change: only handles deselection and edge selection.
  // Node selection is handled exclusively by onNodeClick so that dragging
  // a node does NOT pop the Properties panel open.
  const onSelectionChange = useCallback(({ nodes, edges }: { nodes: WhamoNode[], edges: WhamoEdge[] }) => {
    if (activeLinkToolRef.current) return;
    if (nodes.length === 0 && edges.length === 0) {
      selectElement(null, null);
    } else if (nodes.length === 0 && edges.length > 0) {
      selectElement(edges[0].id, 'edge');
    }
    // node selection → handled by onNodeClick (avoids panel open during drag)
  }, [selectElement]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && activeLinkTool) {
        setActiveLinkTool(null);
        setLinkSourceNodeId(null);
        return;
      }
      // Check if user is typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Keyboard shortcuts for zoom and view
      if (event.key === '+' || event.key === '=') {
        zoomIn();
      } else if (event.key === '-' || event.key === '_') {
        zoomOut();
      } else if (event.key.toLowerCase() === 'f') {
        fitView();
      } else if (event.key === 'F11') {
        event.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(console.error);
        } else {
          document.exitFullscreen().catch(console.error);
        }
      } else if (event.key.toLowerCase() === 'z' && (event.metaKey || event.ctrlKey)) {
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        event.preventDefault();
      } else if (event.key.toLowerCase() === 'y' && (event.metaKey || event.ctrlKey)) {
        redo();
        event.preventDefault();
      } else if (event.key.toLowerCase() === 's' && (event.metaKey || event.ctrlKey)) {
        handleSave();
        event.preventDefault();
      } else if ((event.key === 'Delete' || event.key === 'Backspace') && 
          selectedElementId && 
          selectedElementType) {
        deleteElement(selectedElementId, selectedElementType);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteElement, selectedElementId, selectedElementType, zoomIn, zoomOut, fitView, toggleLock, undo, redo, handleSave]);

  const handleLoadClick = () => {
    setShowProjectsList(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const fileName = file.name.toLowerCase();

      try {
        if (fileName.endsWith('.json')) {
          const json = JSON.parse(content);
          if (json.nodes && json.edges) {
            // Use project name from file or fallback to filename
            const loadedProjectName = json.projectName || file.name.replace(/\.json$/i, '');
            const expandedEdges = expandEdges(json.edges, json.pipeProfiles);
            loadNetwork(json.nodes, expandedEdges, { ...json.computationalParams, qSchedules: json.qSchedules, hSchedules: json.hSchedules }, json.outputRequests, loadedProjectName, undefined, json.pcharData, json.snapshotTimes, json.nodeSelectionSet, json.tcharData, json.vSchedules);
            setProjectState("active");
            setServerProjectId(null);
            toast({ title: "Project Loaded", description: `Network topology "${loadedProjectName}" restored from JSON.` });
          } else {
            throw new Error("Invalid JSON format");
          }
        } else if (fileName.endsWith('.inp')) {
          const { nodes, edges, projectName: parsedName, computationalParams: parsedParams, hSchedules: parsedHSchedules, qSchedules: parsedQSchedules, pcharData, tcharData, vSchedules, outputRequests: parsedRequests, nodeSelectionSet: parsedNodeSel } = parseInpFile(content);
          if (nodes.length > 0) {
            const loadedProjectName = parsedName || file.name.replace(/\.inp$/i, '');
            loadNetwork(nodes, edges, { ...parsedParams, hSchedules: parsedHSchedules, qSchedules: parsedQSchedules }, parsedRequests, loadedProjectName, undefined, pcharData, undefined, parsedNodeSel, tcharData, vSchedules);
            setProjectState("active");
            setServerProjectId(null);
            toast({ title: "Project Loaded", description: `Network topology "${loadedProjectName}" restored from .inp file.` });
          } else {
            throw new Error("No valid network elements found in .inp file");
          }
        } else {
          throw new Error("Unsupported file type");
        }
      } catch (err) {
        toast({ variant: "destructive", title: "Load Failed", description: err instanceof Error ? err.message : "Invalid file." });
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const handleGenerateInp = async (force: boolean | any = false) => {
    if (force !== true) {
      const results = validateNetwork(nodes as WhamoNode[], edges as WhamoEdge[]);
      if (results.errors.length > 0 || results.warnings.length > 0) {
        setValidationData(results);
        return;
      }
      // Validation passed → open Output Requests dialog before generating
      setPendingGenerateMode('inp');
      return;
    }
    // force === true → user confirmed via Output Requests dialog, actually generate
    try {
      const inpContent = generateInpFile(nodes as WhamoNode[], edges as WhamoEdge[], false);
      const downloadName = (projectName && projectName !== "Untitled Network") ? projectName : "network";

      // Show preview modal instead of direct download
      setFilePreview({ content: inpContent, fileName: `${downloadName}.inp`, type: 'inp' });

      const { nodeOrderErrorIds } = useNetworkStore.getState();
      if (nodeOrderErrorIds.length > 0) {
        toast({ variant: "destructive", title: "Generated with Errors", description: `${nodeOrderErrorIds.length} node(s) have ascending-order violations. Correct node numbers before running WHAMO.` });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Generation Failed", description: err instanceof Error ? err.message : "Could not generate files. Check connections." });
    }
  };

  // Validates network then opens Output Requests dialog with .OUT context
  const handleGenerateOutInit = () => {
    const results = validateNetwork(nodes as WhamoNode[], edges as WhamoEdge[]);
    if (results.errors.length > 0 || results.warnings.length > 0) {
      setValidationData(results);
      return;
    }
    setPendingGenerateMode('out');
  };

  const [projectState, setProjectState] = useState<"empty" | "active">("empty");
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isGeneratingOut, setIsGeneratingOut] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [diagramSvg, setDiagramSvg] = useState<string | null>(null);
  const [svgNaturalSize, setSvgNaturalSize] = useState({ w: 0, h: 0 });
  const [diagramView, setDiagramView] = useState({ scale: 1, panX: 0, panY: 0 });
  const [diagramTooltip, setDiagramTooltip] = useState<{ x: number; y: number; srcId: string; srcType: string } | null>(null);
  const diagramContainerRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const diagramViewRef = useRef({ scale: 1, panX: 0, panY: 0 });
  const [showShortcutConsole, setShowShortcutConsole] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [visualizationOutContent, setVisualizationOutContent] = useState<string | null>(null);
  const [visualizationFileName, setVisualizationFileName] = useState<string>("");
  const [isRunningSimulation, setIsRunningSimulation] = useState(false);
  const [filePreview, setFilePreview] = useState<{ content: string; fileName: string; type: 'inp' | 'out' } | null>(null);
  const [previewLightMode, setPreviewLightMode] = useState(false);
  const [previewEditing, setPreviewEditing] = useState(false);
  const [previewEditedContent, setPreviewEditedContent] = useState('');
  const [serverProjectId, setServerProjectId] = useState<string | null>(null);
  const serverProjectIdRef = useRef<string | null>(null);
  useEffect(() => { serverProjectIdRef.current = serverProjectId; }, [serverProjectId]);
  const [showProjectsList, setShowProjectsList] = useState(false);

  useEffect(() => {
    const handleToggleGrid = () => setShowGrid((prev) => !prev);
    window.addEventListener('toggle-grid', handleToggleGrid);
    return () => window.removeEventListener('toggle-grid', handleToggleGrid);
  }, []);

  useEffect(() => {
    const handleFirstInteraction = () => setHasInteracted(true);
    document.addEventListener('mousedown', handleFirstInteraction, { once: true });
    return () => document.removeEventListener('mousedown', handleFirstInteraction);
  }, []);

  const handleNewProject = () => {
    clearNetwork();
    setServerProjectId(null);
    setProjectState("active");
    localStorage.removeItem(LAST_PROJECT_KEY);
  };

  const handleLoadFromServer = (project: any) => {
    const json = project.content;
    const loadedProjectName = json.projectName || project.name;
    const profiles = json.pipeProfiles || {};
    const expandedEdges = expandEdges(json.edges || [], profiles);
    loadNetwork(
      json.nodes || [],
      expandedEdges,
      { ...json.computationalParams, qSchedules: json.qSchedules, hSchedules: json.hSchedules },
      json.outputRequests,
      loadedProjectName,
      undefined,
      json.pcharData,
      json.snapshotTimes,
      json.nodeSelectionSet,
      json.tcharData,
      json.vSchedules,
    );
    setProjectState("active");
    setServerProjectId(project.id);
    setShowProjectsList(false);
    toast({ title: "Project Loaded", description: `"${loadedProjectName}" opened from your account.` });
  };

  // Persist last opened project so it survives hard refresh
  useEffect(() => {
    if (serverProjectId && user) {
      localStorage.setItem(LAST_PROJECT_KEY, JSON.stringify({ projectId: serverProjectId, userId: user.id }));
    } else if (!serverProjectId) {
      localStorage.removeItem(LAST_PROJECT_KEY);
    }
  }, [serverProjectId, user]);

  // Restore last opened project after auth resolves
  useEffect(() => {
    if (authLoading || !user || hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    const stored = localStorage.getItem(LAST_PROJECT_KEY);
    if (!stored) return;

    try {
      const { projectId, userId } = JSON.parse(stored);
      if (userId !== user.id) {
        localStorage.removeItem(LAST_PROJECT_KEY);
        return;
      }
      fetch(`/api/projects/${projectId}`, { headers: getAuthHeader() })
        .then((res) => (res.ok ? res.json() : null))
        .then((project) => { if (project) handleLoadFromServer(project); })
        .catch(() => {});
    } catch {
      localStorage.removeItem(LAST_PROJECT_KEY);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const handleLoadFromFileSystem = async () => {
    if ('showOpenFilePicker' in window) {
      try {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [{ description: 'WHAMO Projects', accept: { 'application/json': ['.json'], 'text/plain': ['.inp'] } }]
        });
        const file = await handle.getFile();
        const content = await file.text();
        const fileName = file.name.toLowerCase();
        if (fileName.endsWith('.json')) {
          const json = JSON.parse(content);
          if (json.nodes && json.edges) {
            const name = json.projectName || file.name.replace(/\.json$/i, '');
            const expandedEdges = expandEdges(json.edges, json.pipeProfiles);
            loadNetwork(json.nodes, expandedEdges, { ...json.computationalParams, qSchedules: json.qSchedules, hSchedules: json.hSchedules }, json.outputRequests, name, handle, json.pcharData, json.snapshotTimes, json.nodeSelectionSet, json.tcharData, json.vSchedules);
            setProjectState("active");
            setServerProjectId(null);
            setShowProjectsList(false);
            toast({ title: "Project Loaded", description: `"${name}" imported from file.` });
          }
        } else if (fileName.endsWith('.inp')) {
          const { nodes: n, edges: e, projectName: pn, computationalParams: cp, hSchedules: hs, qSchedules: qs, pcharData: pd, tcharData: td, vSchedules: vs, outputRequests: reqs, nodeSelectionSet: nodeSel } = parseInpFile(content);
          if (n.length > 0) {
            const name = pn || file.name.replace(/\.inp$/i, '');
            loadNetwork(n, e, { ...cp, hSchedules: hs, qSchedules: qs }, reqs, name, handle, pd, undefined, nodeSel, td, vs);
            setProjectState("active");
            setServerProjectId(null);
            setShowProjectsList(false);
            toast({ title: "Project Loaded", description: `"${name}" imported from .inp file.` });
          }
        }
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error("File picker failed, falling back to input", err);
      }
    }
    fileInputRef.current?.click();
    setShowProjectsList(false);
  };

  const handleOpenProject = () => {
    setShowProjectsList(true);
  };

  const handleVisualizationClick = async () => {
    if (nodes.length === 0) {
      setVisualizationOutContent(null);
      setVisualizationFileName("");
      setShowVisualization(true);
      return;
    }

    setIsRunningSimulation(true);
    try {
      const inpContent = generateInpFile(nodes as WhamoNode[], edges as WhamoEdge[], false);
      const response = await fetch("/api/generate-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inpContent }),
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.files?.out) {
        throw new Error(data.error || "Simulation failed. Make sure the WHAMO engine is available on the server.");
      }

      const binary = atob(data.files.out);
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      const outContent = new TextDecoder("utf-8").decode(bytes);

      const name = (projectName && projectName !== "Untitled Network") ? projectName : "simulation";
      setVisualizationOutContent(outContent);
      setVisualizationFileName(`${name}.OUT`);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Simulation Failed",
        description: err.message,
      });
      setVisualizationOutContent(null);
      setVisualizationFileName("");
    } finally {
      setIsRunningSimulation(false);
      setShowVisualization(true);
    }
  };

  const [showDiagram, setShowDiagram] = useState(false);

  useEffect(() => {
    if (showDiagram) {
      const svg = generateSystemDiagram(nodes, edges, { showLabels });
      setDiagramSvg(svg);
    }
  }, [nodes, edges, showDiagram, showLabels]);

  // Parse natural SVG dimensions whenever the SVG string changes
  useEffect(() => {
    if (!diagramSvg) return;
    const m = diagramSvg.match(/width="(\d+(?:\.\d+)?)"[^>]*height="(\d+(?:\.\d+)?)"/);
    if (m) setSvgNaturalSize({ w: parseFloat(m[1]), h: parseFloat(m[2]) });
  }, [diagramSvg]);

  // Pan + zoom for diagram canvas
  useEffect(() => {
    const el = diagramContainerRef.current;
    if (!el || !showDiagram) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { scale, panX, panY } = diagramViewRef.current;
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.max(0.1, Math.min(8, scale * factor));
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const ratio = newScale / scale;
      const newPanX = mx - ratio * (mx - panX);
      const newPanY = my - ratio * (my - panY);
      const next = { scale: newScale, panX: newPanX, panY: newPanY };
      diagramViewRef.current = next;
      setDiagramView({ ...next });
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      isPanningRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      el.style.cursor = 'grabbing';
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isPanningRef.current) return;
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      const prev = diagramViewRef.current;
      const next = { ...prev, panX: prev.panX + dx, panY: prev.panY + dy };
      diagramViewRef.current = next;
      setDiagramView({ ...next });
    };

    const onMouseUp = () => {
      isPanningRef.current = false;
      el.style.cursor = 'grab';
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [showDiagram]);

  // Apply zoom/pan via SVG viewBox instead of CSS transform so the vector
  // content is always re-rendered at full device resolution (no blur).
  useEffect(() => {
    if (!svgNaturalSize.w) return;
    const container = diagramContainerRef.current;
    if (!container) return;
    const svgEl = container.querySelector('svg') as SVGSVGElement | null;
    if (!svgEl) return;
    const { scale, panX, panY } = diagramView;
    const cW = container.clientWidth  || svgNaturalSize.w;
    const cH = container.clientHeight || svgNaturalSize.h;
    svgEl.setAttribute('width',  String(cW));
    svgEl.setAttribute('height', String(cH));
    svgEl.setAttribute('preserveAspectRatio', 'none');
    svgEl.setAttribute('viewBox',
      `${-panX / scale} ${-panY / scale} ${cW / scale} ${cH / scale}`);
  }, [diagramView, svgNaturalSize]);

  const handleDiagramMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanningRef.current) { setDiagramTooltip(null); return; }
    const target = e.target as Element;
    const el = target.closest('[data-srcid]') as Element | null;
    if (!el) { setDiagramTooltip(null); return; }
    const srcId = el.getAttribute('data-srcid') || '';
    const srcType = el.getAttribute('data-srctype') || '';
    const rect = e.currentTarget.getBoundingClientRect();
    setDiagramTooltip({ x: e.clientX - rect.left + 14, y: e.clientY - rect.top + 14, srcId, srcType });
  }, []);

  const downloadImage = async () => {
    const element = document.getElementById('system-diagram-container');
    if (!element) return;
    
    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `system_diagram_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      toast({ variant: "destructive", title: "Download Failed", description: "Could not generate image." });
    }
  };

  const handleGenerateOut = async () => {
    // Create file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.inp';
    
    // Handle file selection
    fileInput.onchange = async (e: any) => {
      const file = e.target.files[0];
      
      if (!file) return;
      
      // Validate file extension
      if (!file.name.endsWith('.inp')) {
        toast({
          variant: "destructive",
          title: "Invalid file",
          description: "Please select a valid .inp file"
        });
        return;
      }
      
      // Show loading state
      setIsGeneratingOut(true);
      
      try {
        // Create form data
        const formData = new FormData();
        formData.append('inpFile', file);
        
        // Call API
        const response = await fetch('/api/generate-out', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error('Failed to generate OUT file');
        }
        
        // Get the blob
        const blob = await response.blob();
        
        // Trigger download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const downloadName = (projectName && projectName !== "Untitled Network") ? projectName : "network";
        a.download = `${downloadName}_output.out`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        // Show success message
        toast({
          title: "Success",
          description: "OUT file generated successfully!"
        });
        
      } catch (error: any) {
        console.error('Error:', error);
        toast({
          variant: "destructive",
          title: "Generation Failed",
          description: error.message || "Failed to generate OUT file. Please try again."
        });
      } finally {
        setIsGeneratingOut(false);
      }
    };
    
    // Trigger file picker
    fileInput.click();
  };

  useEffect(() => {
    const handleToggleConsole = () => setShowShortcutConsole((prev: boolean) => !prev);
    window.addEventListener('toggle-shortcut-console', handleToggleConsole);
    return () => window.removeEventListener('toggle-shortcut-console', handleToggleConsole);
  }, []);

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background text-foreground relative">
      <ValidationModal 
        isOpen={!!validationData}
        onClose={() => setValidationData(null)}
        onGenerate={() => {
          handleGenerateInp(true);
          setValidationData(null);
        }}
        errors={validationData?.errors || []}
        warnings={validationData?.warnings || []}
      />
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".json,.inp" 
        className="hidden" 
      />

      {/* Top Bar (Header) */}
      <Header 
        onExport={handleGenerateInp} 
        onGenerateOut={handleGenerateOutInit}
        isGeneratingOut={isGeneratingOut}
        pendingGenerateMode={pendingGenerateMode}
        onClearPendingMode={() => setPendingGenerateMode(null)}
        onSave={() => handleSave()} 
        onSaveAs={handleSaveAs}
        onLoad={handleLoadClick} 
        onShowDiagram={() => {
          const svg = generateSystemDiagram(nodes, edges, { showLabels });
          setDiagramSvg(svg);
          setShowDiagram(true);
          setIsMaximized(true);
          const resetView = { scale: 1, panX: 0, panY: 0 };
          diagramViewRef.current = resetView;
          setDiagramView(resetView);
        }}
        onVisualization={handleVisualizationClick}
        activeLinkTool={activeLinkTool}
        onSetLinkTool={setActiveLinkTool}
        onShowFilePreview={(content, fileName, type) => setFilePreview({ content, fileName, type })}
        onLoadProject={handleLoadFromServer}
        currentProjectId={serverProjectId}
        isProjectOpen={projectState !== "empty"}
        onActivate={() => setProjectState("active")}
      />

      {/* Projects List Panel */}
      {showProjectsList && (
        <ProjectsListPanel
          onClose={() => setShowProjectsList(false)}
          onLoadProject={handleLoadFromServer}
          onLoadFromFile={handleLoadFromFileSystem}
          currentProjectId={serverProjectId}
        />
      )}

      {/* Simulation running overlay */}
      {isRunningSimulation && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl px-10 py-8 flex flex-col items-center gap-4 min-w-[280px]">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
            <div className="text-center">
              <p className="text-base font-semibold text-gray-800">Running Simulation</p>
              <p className="text-sm text-gray-400 mt-1">WHAMO is processing your network...</p>
            </div>
          </div>
        </div>
      )}

      {/* Visualization View overlay */}
      {showVisualization && (
        <VisualizationView
          onClose={() => {
            setShowVisualization(false);
            setVisualizationOutContent(null);
            setVisualizationFileName("");
          }}
          initialOutContent={visualizationOutContent ?? undefined}
          initialFileName={visualizationFileName || undefined}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {projectState === "empty" && nodes.length === 0 && edges.length === 0 && (
          <div className="absolute inset-0 z-[1] flex items-center justify-center pointer-events-none">
            <div className="flex gap-12 pointer-events-auto">
              {/* New Project Card */}
              <div 
                className="w-[320px] bg-white rounded-xl shadow-lg border border-slate-200 p-8 flex flex-col items-center text-center cursor-pointer hover:shadow-xl transition-all duration-200 group"
                onClick={handleNewProject}
              >
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                  <PlusCircle className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">New Project</h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Start a new hydraulic network analysis project from scratch
                </p>
              </div>

              {/* Open Project Card */}
              <div 
                className="w-[320px] bg-white rounded-xl shadow-lg border border-slate-200 p-8 flex flex-col items-center text-center cursor-pointer hover:shadow-xl transition-all duration-200 group"
                onClick={handleOpenProject}
              >
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                  <Download className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">Open Project</h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Continue working on an existing project or import files
                </p>
              </div>
            </div>
          </div>
        )}
        <ResizablePanelGroup direction="vertical">
          <ResizablePanel defaultSize={75} minSize={isMaximized ? 0 : 30} className={cn(isMaximized && "hidden")}>
            <div className="flex h-full w-full overflow-hidden relative">
              {/* Canvas Area */}
              <div ref={rfContainerRef} className={cn("flex-1 relative h-full bg-white transition-all duration-300", activeLinkTool && "link-mode-active")}>
                {activeLinkTool && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-white text-sm font-medium"
                      style={{
                        background: activeLinkTool === 'pump' ? '#f97316'
                          : activeLinkTool === 'checkValve' ? '#8b5cf6'
                          : '#16a34a'
                      }}
                    >
                      <span>
                        {activeLinkTool === 'pump' ? '🔄 Pump' : activeLinkTool === 'checkValve' ? '🛡 Check Valve' : '⚙ Turbine'}
                      </span>
                      <span className="opacity-80">—</span>
                      <span>
                        {linkSourceNodeId ? 'Now click the downstream node' : 'Click the upstream node'}
                      </span>
                      <span className="opacity-60 text-xs ml-1">(Esc to cancel)</span>
                    </div>
                  </div>
                )}
                {filePreview ? (
                  /* ── Inline File Preview (replaces canvas) ── */
                  (() => {
                    // Sync edited content when filePreview changes
                    const currentContent = previewEditedContent || filePreview.content;
                    const isLight = previewLightMode;
                    const theme = {
                      bg: isLight ? '#f8f9fb' : '#1e1e2e',
                      text: isLight ? '#1e293b' : '#cdd6f4',
                      headerBg: isLight ? '#ffffff' : '#181825',
                      headerBorder: isLight ? '#e2e8f0' : '#313244',
                      lineNumBg: isLight ? '#f1f5f9' : '#181825',
                      lineNumText: isLight ? '#94a3b8' : '#6c7086',
                      lineNumBorder: isLight ? '#e2e8f0' : '#313244',
                      countText: isLight ? '#94a3b8' : '#6c7086',
                      btnBg: isLight ? '#f1f5f9' : '#313244',
                      btnText: isLight ? '#475569' : '#cdd6f4',
                      btnHoverBg: isLight ? '#e2e8f0' : '#45475a',
                      hoverRowBg: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)',
                      badgeBg: filePreview.type === 'inp'
                        ? (isLight ? '#dbeafe' : 'rgba(59,130,246,0.2)')
                        : (isLight ? '#d1fae5' : 'rgba(16,185,129,0.2)'),
                      badgeText: filePreview.type === 'inp'
                        ? (isLight ? '#1d4ed8' : '#60a5fa')
                        : (isLight ? '#065f46' : '#34d399'),
                      badgeBorder: filePreview.type === 'inp'
                        ? (isLight ? '#bfdbfe' : 'rgba(59,130,246,0.3)')
                        : (isLight ? '#a7f3d0' : 'rgba(16,185,129,0.3)'),
                    };
                    const monoFont = '"JetBrains Mono","Fira Code","Cascadia Code",monospace';
                    const poppins = 'Poppins, sans-serif';
                    const displayContent = previewEditing ? previewEditedContent : filePreview.content;

                    return (
                      <div className="flex flex-col w-full h-full" style={{ background: theme.bg }}>
                        {/* Header bar */}
                        <div
                          className="flex items-center justify-between px-5 py-3 flex-shrink-0"
                          style={{ background: theme.headerBg, borderBottom: `1px solid ${theme.headerBorder}` }}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border"
                              style={{ fontFamily: poppins, background: theme.badgeBg, color: theme.badgeText, borderColor: theme.badgeBorder }}
                            >
                              {filePreview.type === 'inp' ? 'INP' : 'OUT'}
                            </span>
                            <span
                              className="text-sm font-semibold truncate max-w-[350px]"
                              style={{ fontFamily: poppins, color: theme.text }}
                            >
                              {filePreview.fileName}
                            </span>
                            <span className="text-xs" style={{ fontFamily: poppins, color: theme.countText }}>
                              {displayContent.split('\n').length.toLocaleString()} lines
                            </span>
                            {previewEditing && (
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse"
                                style={{ background: '#fef3c7', color: '#92400e', fontFamily: poppins }}
                              >
                                EDITING
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Light/Dark toggle */}
                            <button
                              onClick={() => setPreviewLightMode(m => !m)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                              style={{ background: theme.btnBg, color: theme.btnText, fontFamily: poppins }}
                              title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
                              data-testid="btn-preview-theme-toggle"
                            >
                              {isLight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                              {isLight ? 'Dark' : 'Light'}
                            </button>
                            {/* Edit / Done — INP only */}
                            {filePreview.type === 'inp' && (
                              <button
                                onClick={() => {
                                  if (!previewEditing) {
                                    setPreviewEditedContent(filePreview.content);
                                    setPreviewEditing(true);
                                  } else {
                                    setPreviewEditing(false);
                                  }
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                                style={{
                                  background: previewEditing ? 'rgba(59,130,246,0.15)' : theme.btnBg,
                                  color: previewEditing ? '#60a5fa' : theme.btnText,
                                  border: previewEditing ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
                                  fontFamily: poppins,
                                }}
                                data-testid="btn-preview-edit"
                              >
                                {previewEditing
                                  ? <><Check className="w-3.5 h-3.5" /> Done</>
                                  : <><Pencil className="w-3.5 h-3.5" /> Edit</>
                                }
                              </button>
                            )}
                            {/* Download */}
                            <button
                              onClick={() => {
                                const content = previewEditing ? previewEditedContent : filePreview.content;
                                const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                                saveAs(blob, filePreview.fileName);
                              }}
                              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors"
                              style={{ fontFamily: poppins }}
                              data-testid="btn-preview-download"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download {filePreview.type === 'inp' ? 'INP' : 'OUT'}
                            </button>
                            {/* Close */}
                            <button
                              onClick={() => { setFilePreview(null); setPreviewEditing(false); setPreviewEditedContent(''); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                              style={{ background: theme.btnBg, color: theme.btnText, fontFamily: poppins }}
                              data-testid="btn-preview-close"
                            >
                              <X className="w-3.5 h-3.5" />
                              Close
                            </button>
                          </div>
                        </div>

                        {/* Code content */}
                        <div className="flex-1 overflow-hidden flex">
                          {/* Line numbers column */}
                          <div
                            className="flex-shrink-0 overflow-hidden select-none"
                            style={{ background: theme.lineNumBg, borderRight: `1px solid ${theme.lineNumBorder}`, width: 52 }}
                          >
                            <div
                              style={{
                                fontFamily: monoFont,
                                fontSize: 13,
                                lineHeight: '1.75',
                                color: theme.lineNumText,
                                padding: '20px 12px 20px 8px',
                                textAlign: 'right',
                                whiteSpace: 'pre',
                              }}
                            >
                              {displayContent.split('\n').map((_, i) => `${i + 1}\n`).join('')}
                            </div>
                          </div>

                          {/* Editor or viewer */}
                          {previewEditing ? (
                            <textarea
                              autoFocus
                              value={previewEditedContent}
                              onChange={(e) => setPreviewEditedContent(e.target.value)}
                              className="flex-1 resize-none outline-none border-none p-5"
                              style={{
                                fontFamily: monoFont,
                                fontSize: 13,
                                lineHeight: '1.75',
                                background: theme.bg,
                                color: theme.text,
                                caretColor: '#60a5fa',
                              }}
                              spellCheck={false}
                              data-testid="textarea-inp-editor"
                            />
                          ) : (
                            <div className="flex-1 overflow-auto">
                              <pre
                                className="text-[13px] leading-[1.75] p-5 whitespace-pre min-h-full"
                                style={{ fontFamily: monoFont, color: theme.text, background: theme.bg }}
                              >
                                {filePreview.content}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <>
                    <ReactFlow
                      nodes={nodes as any}
                      edges={edges as any}
                      onNodesChange={onNodesChange}
                      onEdgesChange={onEdgesChange}
                      onConnect={activeLinkTool ? undefined : onConnect}
                      onConnectEnd={activeLinkTool ? undefined : onConnectEnd}
                      isValidConnection={isValidConnection}
                      nodeTypes={nodeTypes}
                      edgeTypes={edgeTypes}
                      onNodeClick={onNodeClick}
                      onEdgeClick={onEdgeClick}
                      onSelectionChange={onSelectionChange as any}
                      onPaneClick={() => { setShowNodeSelection(false); if (activeLinkTool) { setActiveLinkTool(null); setLinkSourceNodeId(null); } }}
                      fitView
                      minZoom={0.05}
                      maxZoom={4}
                      className={cn("bg-white", activeLinkTool && "cursor-crosshair")}
                      proOptions={{ hideAttribution: true }}
                      nodesDraggable={!isLocked && !activeLinkTool}
                      nodesConnectable={!isLocked}
                      elementsSelectable={!activeLinkTool}
                    >
                      <Background color="#94a3b8" gap={20} size={1} className={cn(!showGrid && "opacity-0")} />
                      <Controls className="!bg-white !shadow-xl !border-border">
                      </Controls>
                    </ReactFlow>

                    {isLocked && (
                      <div className="absolute top-4 right-4 bg-orange-100 text-orange-800 px-3 py-1 rounded-md text-sm font-medium border border-orange-200 shadow-sm z-50 flex items-center gap-2">
                        <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                        Network Locked
                      </div>
                    )}
                  </>
                )}
              </div>

            </div>
          </ResizablePanel>
          
          {showDiagram && (
            <>
              <ResizableHandle withHandle className={cn(isMaximized && "hidden")} />
              <ResizablePanel defaultSize={25} minSize={isMaximized ? 100 : 10} className={cn(isMaximized && "flex-1")}>
                <div className="h-full w-full bg-background overflow-hidden flex flex-col relative">
                  <div className="flex items-center justify-between p-3 border-b bg-card">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <img src={networkIcon} alt="diagram" className="w-5 h-5 object-contain" />
                        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider whitespace-nowrap">System Diagram Console</h3>
                      </div>
                      
                      {/* Integrated Legend */}
                      <div className="flex items-center gap-3 border-l pl-5 flex-wrap">
                        {[
                          { label: 'Reservoir',   shape: <svg width="22" height="16" viewBox="-2 -2 26 20"><rect x="0" y="0" width="22" height="16" rx="4" fill="#2196F3" stroke="#1565C0" strokeWidth="2"/></svg> },
                          { label: 'Surge Tank',  shape: <svg width="14" height="20" viewBox="-2 -2 18 24"><rect x="0" y="0" width="14" height="20" rx="3" fill="#FF6D00" stroke="#BF360C" strokeWidth="2"/><line x1="2" y1="6" x2="12" y2="6" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/></svg> },
                          { label: 'Flow BC',     shape: <svg width="22" height="16" viewBox="-2 -2 26 20"><rect x="0" y="0" width="22" height="16" rx="4" fill="#9C27B0" stroke="#6A1B9A" strokeWidth="2"/></svg> },
                          { label: 'Node',        shape: <svg width="16" height="16" viewBox="-2 -2 20 20"><circle cx="8" cy="8" r="8" fill="#90A4AE" stroke="#546E7A" strokeWidth="2"/></svg> },
                          { label: 'Junction',    shape: <svg width="16" height="16" viewBox="-2 -2 20 20"><circle cx="8" cy="8" r="8" fill="#F44336" stroke="#B71C1C" strokeWidth="2"/></svg> },
                          { label: 'Pump',        shape: <svg width="16" height="16" viewBox="-2 -2 20 20"><circle cx="8" cy="8" r="8" fill="#00BCD4" stroke="#006064" strokeWidth="2"/></svg> },
                          { label: 'Check Valve', shape: <svg width="16" height="16" viewBox="-2 -2 20 20"><circle cx="8" cy="8" r="8" fill="#37474F" stroke="#102027" strokeWidth="2"/></svg> },
                          { label: 'Turbine',     shape: <svg width="16" height="16" viewBox="-2 -2 20 20"><polygon points="8,0 16,8 8,16 0,8" fill="#16a34a" stroke="#166534" strokeWidth="2"/></svg> },
                          { label: 'Conduit',     shape: <svg width="28" height="12" viewBox="0 0 28 12"><line x1="1" y1="6" x2="22" y2="6" stroke="#555" strokeWidth="1.5"/><polygon points="18,3 28,6 18,9" fill="#555"/></svg> },
                        ].map(({ label, shape }) => (
                          <div key={label} className="flex items-center gap-1.5">
                            {shape}
                            <span className="text-[9px] font-semibold text-foreground uppercase tracking-tight whitespace-nowrap">{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn("h-8 gap-2", !showLabels && "bg-muted")}
                        onClick={() => setShowLabels(!showLabels)}
                      >
                        <img src={showLabels ? eyeOpenIcon : eyeHiddenIcon} alt="" className="w-4 h-4 object-contain" />
                        <span className="text-xs uppercase tracking-wide font-semibold">{showLabels ? "Hide Labels" : "Show Labels"}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-2"
                        onClick={downloadImage}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="text-xs uppercase tracking-wide font-semibold">Export PNG</span>
                      </Button>
                      <div className="w-px h-4 bg-border mx-1" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => {
                          setShowDiagram(false);
                          setIsMaximized(false);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div
                    ref={diagramContainerRef}
                    className="flex-1 overflow-hidden bg-white relative"
                    style={{ cursor: 'grab', userSelect: 'none' }}
                    onMouseMove={handleDiagramMouseMove}
                    onMouseLeave={() => setDiagramTooltip(null)}
                  >
                    <div
                      id="system-diagram-container"
                      style={{ width: '100%', height: '100%' }}
                      dangerouslySetInnerHTML={{ __html: diagramSvg || '' }}
                    />
                    {/* React tooltip overlay — always renders on top of SVG */}
                    {diagramTooltip && (() => {
                      const node = nodes.find(n => n.id === diagramTooltip.srcId);
                      const edge = edges.find(e => e.id === diagramTooltip.srcId);
                      if (!node && !edge) return null;

                      const unit = (node?.data.unit || edge?.data.unit || 'SI') as string;
                      const lenU = unit === 'FPS' ? 'ft' : 'm';
                      const elevU = unit === 'FPS' ? 'ft' : 'm';

                      const rows: { label: string; value: string }[] = [];

                      if (node) {
                        const d = node.data;
                        const typeName = d.type === 'checkValve' ? 'Check Valve'
                          : d.type === 'flowBoundary' ? 'Flow BC'
                          : d.type === 'surgeTank' ? 'Surge Tank'
                          : d.type ? d.type.charAt(0).toUpperCase() + d.type.slice(1) : 'Node';
                        rows.push({ label: 'Type', value: typeName });
                        rows.push({ label: 'Label', value: String(d.label || '') });
                        if (d.nodeNumber !== undefined) rows.push({ label: 'Node #', value: String(d.nodeNumber) });
                        if (d.elevation !== undefined && d.elevation !== '') rows.push({ label: `Elevation (${elevU})`, value: String(d.elevation) });
                        if (d.reservoirElevation !== undefined && d.reservoirElevation !== '') rows.push({ label: `Reservoir Elev (${elevU})`, value: String(d.reservoirElevation) });
                        if (d.tankTop !== undefined && d.tankTop !== '') rows.push({ label: `Tank Top (${elevU})`, value: String(d.tankTop) });
                        if (d.tankBottom !== undefined && d.tankBottom !== '') rows.push({ label: `Tank Bottom (${elevU})`, value: String(d.tankBottom) });
                        if (d.topElevation !== undefined && d.topElevation !== '') rows.push({ label: `Top Elev (${elevU})`, value: String(d.topElevation) });
                        if (d.bottomElevation !== undefined && d.bottomElevation !== '') rows.push({ label: `Bottom Elev (${elevU})`, value: String(d.bottomElevation) });
                        if (d.diameter !== undefined && d.diameter !== '') rows.push({ label: `Diameter`, value: String(d.diameter) });
                        if (d.comment) rows.push({ label: 'Comment', value: String(d.comment) });
                      } else if (edge) {
                        const d = edge.data!;
                        const typeName = d.type === 'checkValve' ? 'Check Valve'
                          : d.type === 'dummy' ? 'Dummy Pipe'
                          : d.type === 'conduit' ? 'Conduit'
                          : d.type ? d.type.charAt(0).toUpperCase() + d.type.slice(1) : 'Edge';
                        rows.push({ label: 'Type', value: typeName });
                        rows.push({ label: 'Label', value: String(d.label || '') });
                        if (d.length !== undefined && d.length !== '') rows.push({ label: `Length (${lenU})`, value: String(d.length) });
                        if (d.diameter !== undefined && d.diameter !== '') rows.push({ label: `Diameter`, value: String(d.diameter) });
                        if (d.celerity !== undefined && d.celerity !== '') rows.push({ label: `Wave Speed`, value: String(d.celerity) });
                        if (d.friction !== undefined && d.friction !== '') rows.push({ label: 'Friction', value: String(d.friction) });
                        if (d.numSegments !== undefined) rows.push({ label: 'Segments', value: String(d.numSegments) });
                        if (d.pumpStatus) rows.push({ label: 'Pump Status', value: String(d.pumpStatus) });
                        if (d.rq !== undefined && d.rq !== '') rows.push({ label: 'Rated Flow', value: String(d.rq) });
                        if (d.rhead !== undefined && d.rhead !== '') rows.push({ label: 'Rated Head', value: String(d.rhead) });
                        if (d.valveStatus) rows.push({ label: 'Valve Status', value: String(d.valveStatus) });
                        if (d.valveDiam !== undefined && d.valveDiam !== '') rows.push({ label: 'Valve Diam', value: String(d.valveDiam) });
                        if (d.turbineType !== undefined) rows.push({ label: 'Turbine Type', value: String(d.turbineType) });
                        if (d.syncSpeed !== undefined && d.syncSpeed !== '') rows.push({ label: 'Sync Speed', value: String(d.syncSpeed) });
                        if (d.comment) rows.push({ label: 'Comment', value: String(d.comment) });
                      }

                      // Keep tooltip within bounds
                      const containerW = diagramContainerRef.current?.clientWidth || 800;
                      const containerH = diagramContainerRef.current?.clientHeight || 600;
                      const tipW = 220;
                      const tipH = rows.length * 20 + 36;
                      const tx = diagramTooltip.x + tipW > containerW ? diagramTooltip.x - tipW - 28 : diagramTooltip.x;
                      const ty = diagramTooltip.y + tipH > containerH ? containerH - tipH - 8 : diagramTooltip.y;

                      return (
                        <div
                          key={diagramTooltip.srcId}
                          style={{ left: tx, top: ty, width: tipW, pointerEvents: 'none', zIndex: 999 }}
                          className="absolute bg-white border border-slate-200 rounded-lg shadow-xl py-2 px-3 text-xs"
                        >
                          <div className="font-bold text-slate-800 text-[11px] mb-1.5 uppercase tracking-wider border-b pb-1">
                            {rows[0]?.value} Properties
                          </div>
                          <table className="w-full border-collapse">
                            <tbody>
                              {rows.map(({ label, value }) => (
                                <tr key={label} className="border-b border-slate-50 last:border-0">
                                  <td className="py-0.5 pr-2 text-slate-500 font-medium whitespace-nowrap">{label}</td>
                                  <td className="py-0.5 text-slate-800 font-semibold text-right">{value}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* Full Screen Shortcut Console Overlay */}
      {showShortcutConsole && (
        <div className="absolute inset-x-0 bottom-0 z-[100] bg-slate-900/95 text-white p-4 animate-in slide-in-from-bottom duration-300 backdrop-blur-md border-t border-slate-700">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-slate-700 rounded text-xs font-mono">F11</span>
                <span className="text-sm text-slate-300">Toggle Fullscreen</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-slate-700 rounded text-xs font-mono">Ctrl + S</span>
                <span className="text-sm text-slate-300">Save Project</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-slate-700 rounded text-xs font-mono">Ctrl + Z</span>
                <span className="text-sm text-slate-300">Undo</span>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-slate-400 hover:text-white"
              onClick={() => setShowShortcutConsole(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Node Selection Panel — fixed full-height overlay */}
      {showNodeSelection && (
        <div className="fixed right-0 top-0 h-screen w-[480px] z-50 bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-300">
          <NodeSelectionPanel onSave={handleSave} />
        </div>
      )}

      {/* Properties Panel — fixed full-height overlay */}
      {selectedElementId && !showNodeSelection && (
        <div className="fixed right-0 top-0 h-screen w-[480px] z-50 bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-300">
          <PropertiesPanel />
        </div>
      )}
    </div>
  );
}

export default function Designer() {
  return (
    <ReactFlowProvider>
      <DesignerInner />
    </ReactFlowProvider>
  );
}
