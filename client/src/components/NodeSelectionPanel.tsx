import { useNetworkStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, X } from 'lucide-react';
import { PropSection } from '@/components/ui/prop-section';

interface NodeSelectionPanelProps {
  onSave?: () => void;
  onClose?: () => void;
}

export function NodeSelectionPanel({ onSave, onClose }: NodeSelectionPanelProps) {
  const { nodes, nodeSelectionSet, toggleNodeSelection, setAllNodesSelected } = useNetworkStore();

  const nodesList = nodes
    .filter(n =>
      n.type === 'node' ||
      n.type === 'junction' ||
      n.type === 'reservoir' ||
      n.type === 'surgeTank' ||
      n.type === 'flowBoundary'
    )
    .map(n => ({
      id: n.data.nodeNumber?.toString() || n.id,
      label: n.data.label,
      elevation: n.data.elevation || n.data.reservoirElevation || 0,
    }))
    .sort((a, b) => {
      const numA = parseInt(a.id);
      const numB = parseInt(b.id);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.id.localeCompare(b.id);
    });

  const allSelected = nodeSelectionSet.size === 0 || nodesList.every(n => nodeSelectionSet.has(n.id));
  const anySelected = nodeSelectionSet.size > 0;
  const selectedCount = nodeSelectionSet.size === 0 ? nodesList.length : nodeSelectionSet.size;

  return (
    <div className="flex flex-col h-full bg-white">

      {/* ── Sidebar header ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b bg-slate-50 shrink-0">
        <div className="flex items-center gap-2">
          <h2
            className="text-[13px] font-bold text-slate-800 uppercase tracking-wider"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Node Selection
          </h2>
          <span
            className="text-[11px] text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            {nodeSelectionSet.size === 0 ? 'All' : selectedCount}/{nodesList.length}
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-200 transition-colors"
            data-testid="button-close-node-selection"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        )}
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">

        {/* Controls section */}
        <PropSection title="Selection Controls">
          <div className="px-3 py-3 space-y-2">
            {/* Hint text */}
            <p
              className="text-[11px] text-slate-500 leading-snug"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              When empty, no nodes are exported. Select nodes to include them in the .INP output.
            </p>
            {/* Select All / Clear All */}
            <div className="flex gap-2 pt-1">
              <Button
                variant={allSelected ? 'default' : 'outline'}
                size="sm"
                className="flex-1 h-7 text-[13px] gap-1.5 rounded-full"
                style={{ fontFamily: 'Poppins, sans-serif' }}
                onClick={() => setAllNodesSelected(true)}
                data-testid="button-select-all-nodes"
              >
                Select All
              </Button>
              <Button
                variant={anySelected ? 'destructive' : 'outline'}
                size="sm"
                className="flex-1 h-7 text-[13px] gap-1.5 rounded-full"
                style={{ fontFamily: 'Poppins, sans-serif' }}
                onClick={() => setAllNodesSelected(false)}
                data-testid="button-clear-all-nodes"
              >
                Clear All
              </Button>
            </div>
          </div>
        </PropSection>

        {/* Node list section */}
        <PropSection title={`Network Nodes (${nodesList.length})`}>
          <div className="divide-y divide-slate-100">
            {nodesList.map(node => {
              const isSelected = nodeSelectionSet.has(node.id);
              return (
                <div
                  key={node.id}
                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors select-none ${
                    isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                  }`}
                  onClick={() => toggleNodeSelection(node.id)}
                  data-testid={`node-item-${node.id}`}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleNodeSelection(node.id)}
                    className="h-4 w-4 shrink-0"
                    onClick={e => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[12px] font-semibold text-black leading-tight"
                      style={{ fontFamily: 'Poppins, sans-serif' }}
                    >
                      Node {node.id}
                    </p>
                    <p
                      className="text-[11px] text-slate-500 truncate mt-0.5"
                      style={{ fontFamily: 'Poppins, sans-serif' }}
                    >
                      {node.label} — Elev: {node.elevation}
                    </p>
                  </div>
                </div>
              );
            })}
            {nodesList.length === 0 && (
              <div className="px-3 py-6 text-center">
                <p
                  className="text-[11px] text-slate-400 italic"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  No nodes in network. Add nodes to the canvas first.
                </p>
              </div>
            )}
          </div>
        </PropSection>

      </div>

      {/* ── Save button ── */}
      {onSave && (
        <div className="px-4 py-3 border-t bg-slate-50 shrink-0">
          <Button
            onClick={onSave}
            className="w-full gap-2 h-9 text-[14px] rounded-full"
            style={{ fontFamily: 'Poppins, sans-serif' }}
            data-testid="button-save-node-selection"
          >
            <Save className="w-5 h-5 text-white" />
            Save
          </Button>
        </div>
      )}
    </div>
  );
}
