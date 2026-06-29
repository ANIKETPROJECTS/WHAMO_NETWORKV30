import { memo, type ReactNode } from 'react';
import {
  EdgeProps,
  getBezierPath,
  BaseEdge,
  EdgeLabelRenderer,
  MarkerType,
} from '@xyflow/react';
import { TooltipWrapper, DataList } from './TooltipWrapper';
import { useNetworkStore } from '@/lib/store';
import waterPumpIcon from '@assets/water-pump_1779523451215.png';
import pipeIcon from '@assets/pipe_1779523475650.png';
import turbineImgIcon from '@assets/turbine_1779523517554.png';

const EDGE_COLOR = '#000000';
const CIRCLE_SIZE = 72;
const BLACK_MARKER = { type: MarkerType.ArrowClosed, color: EDGE_COLOR };

function ElementCircle({ icon, alt, label }: { icon: string; alt: string; label: string }) {
  return (
    <div style={{
      width: CIRCLE_SIZE,
      height: CIRCLE_SIZE,
      borderRadius: '50%',
      border: `3px solid ${EDGE_COLOR}`,
      background: 'white',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
    }}>
      <img src={icon} style={{ width: 34, height: 34, objectFit: 'contain', pointerEvents: 'none' }} alt={alt} />
      <span style={{ fontSize: 11, fontWeight: 700, color: '#000', lineHeight: 1, whiteSpace: 'nowrap', userSelect: 'none' }}>
        {label}
      </span>
    </div>
  );
}

function TurbineDiamond({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        width: 52, height: 52,
        background: '#16a34a',
        border: '3px solid #166534',
        borderRadius: 4,
        transform: 'rotate(45deg)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
      }}>
        <div style={{
          width: '100%', height: '100%',
          transform: 'rotate(-45deg)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 2,
        }}>
          <img src={icon} style={{ width: 24, height: 24, objectFit: 'contain', pointerEvents: 'none', filter: 'brightness(0) invert(1)' }} alt="Turbine" />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', lineHeight: 1, whiteSpace: 'nowrap', userSelect: 'none' }}>
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}

export const ConnectionEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  const edge = useNetworkStore(state => state.edges.find(e => e.id === id));
  const displayData = edge ? edge.data : data;

  const edgeType = displayData?.type as string;
  const isPump = edgeType === 'pump';
  const isCheckValve = edgeType === 'checkValve';
  const isTurbine = edgeType === 'turbine';
  const isElementEdge = isPump || isCheckValve || isTurbine;
  const isDummy = edgeType === 'dummy';

  const tooltipTitle = isPump ? 'Pump Properties'
    : isCheckValve ? 'Check Valve Properties'
    : isTurbine ? 'Turbine Properties'
    : isDummy ? 'Dummy Pipe Properties'
    : 'Conduit Properties';

  const edgeLabel = (displayData?.label as string) || id;

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: 2,
          stroke: EDGE_COLOR,
          strokeDasharray: isDummy ? '8 8' : undefined,
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <TooltipWrapper content={<DataList data={displayData} title={tooltipTitle} />}>
            {isElementEdge ? (
              <div style={{ cursor: 'default' }}>
                {isPump && <ElementCircle icon={waterPumpIcon} alt="Pump" label={edgeLabel} />}
                {isCheckValve && <ElementCircle icon={pipeIcon} alt="Check Valve" label={edgeLabel} />}
                {isTurbine && <ElementCircle icon={turbineImgIcon} alt="Turbine" label={edgeLabel} />}
              </div>
            ) : (
              <div className="bg-white px-2 py-0.5 rounded-full border border-black text-[11px] font-semibold text-black cursor-default hover:bg-slate-50 transition-colors">
                {(displayData?.label as ReactNode) || id}
              </div>
            )}
          </TooltipWrapper>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});
