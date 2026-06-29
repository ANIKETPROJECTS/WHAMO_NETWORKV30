import ExcelJS from 'exceljs';

// ─── Types ───────────────────────────────────────────────────────────────────

export type FilterKey =
  | 'all' | 'conduit' | 'dummy'
  | 'node' | 'reservoir' | 'junction' | 'surgeTank' | 'flowBoundary' | 'pump' | 'checkValve' | 'turbine';

type ColType = 'text' | 'number' | 'boolean' | 'dropdown';

interface ColDef {
  key: string;
  header: string;
  type: ColType;
  options?: string[];
  readOnly?: boolean;
  isLongList?: boolean; // lists too long for inline formula (>255 chars)
  width?: number;
  // For columns whose editability depends on another field's value in the same row
  conditionalLock?: {
    field: string;      // which data field to inspect
    lockedWhen: string; // the Excel-display value of that field that makes THIS col locked
  };
}

// hSchedule type used for T/H pairs export
interface HSchedulePoint { time: number; head: number }
interface HSchedule { number: number; points: HSchedulePoint[] }

// ─── Option lists ─────────────────────────────────────────────────────────────

const UNIT_OPTIONS    = ['SI', 'FPS'];
const PIPE_TYPE_OPTIONS = ['conduit', 'dummy'];
const BC_MODE_OPTIONS = ['Fixed Elevation', 'H Schedule'];
const SURGE_TANK_TYPE_OPTIONS = ['SIMPLE', 'DIFFERENTIAL', 'AIRTANK'];
const PUMP_STATUS_OPTIONS = ['ACTIVE', 'INACTIVE'];
const VALVE_STATUS_OPTIONS = ['OPEN', 'CLOSED'];
const TURBINE_MODE_OPTIONS = ['TURBINE', 'GENERATE', 'TURBGOV', 'EMERGENCY'];
const BOOL_OPTIONS = ['true', 'false'];

export const PIPE_MATERIAL_OPTIONS = [
  '-- None --',
  'Aluminum','Aluminum structural plate 32 in CR','Aluminum structural plate 32 in CR Historic',
  'Asbestos Cement','Asphalt ditch','Asphalt pavement (rough)','Asphalt pavement (smooth)',
  'Asphalted cast iron (new)','Bare soil','Best concrete','Brick in mortar','Brick sewer',
  'Cast iron','CMP','Concrete','Concrete (centrif. spun)','Concrete (steel forms)',
  'Concrete (wood forms)','Concrete gutter (broom finish)','Concrete gutter (troweled finish)',
  'Concrete gutter, asphalt pavement (rough)','Concrete gutter, asphalt pavement (smooth)',
  'Concrete pavement (float finish)','Copper','Curled wood mat','Ductile Iron',
  'Fiberglass roving','Flood plain, brush','Flood plain, cultivated','Galvanized iron',
  'Glass','Gravel riprap, 25 mm (1 in) D50','Gravel riprap, 50 mm (2 in) D50',
  'Grouted riprap','Jute net','Natural stream, clean','Natural stream, stony notes',
  'Natural stream, weedy','PVC','Riveted steel (new, rough)','Riveted steel (new, smooth)',
  'Rock cut','Rock riprap, 150 mm (6 in) D50','Rock riprap, 300 mm (12 in) D50',
  'Rough channel, with grass','Rough earth','Rough rocks','Soil cement','Steel',
  'Steel and Aluminum 18 In or less CR 3x1 Corrugations Historic',
  'Steel and Aluminum 5x1 and 3x1 Corrugations','Steel and Aluminum Var CR',
  'Steel and Aluminum Var CR Historic','Steel structural plate 18 In CR',
  'Steel structural plate 31 In CR','Steel structural plate 47 In CR',
  'Stone masonry','Stony bottom','Straw with net','Synthetic mat',
  'Very rough channel, with grass','Wood Stave (new, smooth)','Woven paper net',
];

// ─── Row-number sentinel ───────────────────────────────────────────────────────
// The '#' column is always first; it is read-only and never imported back.

const ROW_NUM_COL: ColDef = {
  key: '_rowNum', header: '#', type: 'number', readOnly: true, width: 5,
};

// ─── Column Definitions per Tab ───────────────────────────────────────────────

export const TAB_COLS: Record<FilterKey, ColDef[]> = {
  all: [
    ROW_NUM_COL,
    { key: '_unit',      header: 'Unit (SI/FPS)', type: 'dropdown', options: UNIT_OPTIONS, width: 14 },
    { key: 'label',      header: 'Label',         type: 'text', width: 16 },
    { key: '_type',      header: 'Type',           type: 'text', readOnly: true, width: 14 },
    { key: 'type',       header: 'Pipe Type',      type: 'dropdown', options: PIPE_TYPE_OPTIONS, width: 14 },
    { key: 'nodeNumber', header: 'Node #',         type: 'number', width: 10 },
    { key: 'diameter',   header: 'Diameter',       type: 'number', width: 14 },
    { key: 'length',     header: 'Length',         type: 'number', width: 14 },
    { key: 'celerity',   header: 'Wave Speed',     type: 'number', width: 14 },
    { key: 'friction',   header: 'Friction',       type: 'number', width: 14 },
    { key: 'elevation',  header: 'Elevation',      type: 'number', width: 14 },
    { key: 'comment',    header: 'Comment',        type: 'text', width: 24 },
  ],
  conduit: [
    ROW_NUM_COL,
    { key: '_unit',              header: 'Unit (SI/FPS)',   type: 'dropdown', options: UNIT_OPTIONS, width: 14 },
    { key: 'label',              header: 'Label',           type: 'text', width: 16 },
    { key: 'type',               header: 'Pipe Type',       type: 'dropdown', options: PIPE_TYPE_OPTIONS, width: 14 },
    { key: '_materialLabel',     header: 'Pipe Material',   type: 'dropdown', options: PIPE_MATERIAL_OPTIONS, isLongList: true, width: 32 },
    { key: 'length',             header: 'Length',          type: 'number', width: 14 },
    { key: 'diameter',           header: 'Diameter',        type: 'number', width: 14 },
    { key: 'celerity',           header: 'Wave Speed',      type: 'number', width: 14 },
    { key: 'friction',           header: 'Friction',        type: 'number', width: 14 },
    { key: 'manningsN',          header: "Manning's n",     type: 'number', width: 14 },
    { key: 'numSegments',        header: 'Segments',        type: 'number', width: 12 },
    { key: 'includeNumSegments', header: 'Incl. in INP',   type: 'dropdown', options: BOOL_OPTIONS, width: 14 },
    { key: 'hasAddedLoss',       header: 'Added Loss',      type: 'dropdown', options: BOOL_OPTIONS, width: 14 },
    { key: 'cplus',              header: 'CPLUS',           type: 'number', width: 12 },
    { key: 'cminus',             header: 'CMINUS',          type: 'number', width: 12 },
    { key: 'pipeE',              header: 'E (Modulus)',     type: 'number', width: 16 },
    { key: 'pipeWT',             header: 'WT (Wall Thick)', type: 'number', width: 16 },
    { key: 'variable',           header: 'VARIABLE',        type: 'dropdown', options: BOOL_OPTIONS, width: 14 },
    { key: 'distance',           header: 'Distance',        type: 'number', width: 14 },
    { key: 'area',               header: 'Area',            type: 'number', width: 14 },
    { key: 'd',                  header: 'D',               type: 'number', width: 12 },
    { key: 'a',                  header: 'A',               type: 'number', width: 12 },
    { key: 'comment',            header: 'Comment',         type: 'text', width: 24 },
  ],
  dummy: [
    ROW_NUM_COL,
    { key: '_unit',        header: 'Unit (SI/FPS)', type: 'dropdown', options: UNIT_OPTIONS, width: 14 },
    { key: 'label',        header: 'Label',         type: 'text', width: 16 },
    { key: 'type',         header: 'Pipe Type',     type: 'dropdown', options: PIPE_TYPE_OPTIONS, width: 14 },
    { key: 'diameter',     header: 'Diameter',      type: 'number', width: 14 },
    { key: 'hasAddedLoss', header: 'Added Loss',    type: 'dropdown', options: BOOL_OPTIONS, width: 14 },
    { key: 'cplus',        header: 'CPLUS',         type: 'number', width: 12 },
    { key: 'cminus',       header: 'CMINUS',        type: 'number', width: 12 },
    { key: 'comment',      header: 'Comment',       type: 'text', width: 24 },
  ],
  node: [
    ROW_NUM_COL,
    { key: '_unit',      header: 'Unit (SI/FPS)', type: 'dropdown', options: UNIT_OPTIONS, width: 14 },
    { key: 'label',      header: 'Label',         type: 'text', width: 16 },
    { key: '_type',      header: 'Type',           type: 'text', readOnly: true, width: 14 },
    { key: 'nodeNumber', header: 'Node #',         type: 'number', width: 10 },
    { key: 'elevation',  header: 'Elevation',      type: 'number', width: 14 },
    { key: 'comment',    header: 'Comment',        type: 'text', width: 24 },
  ],
  reservoir: [
    ROW_NUM_COL,
    { key: '_unit',              header: 'Unit (SI/FPS)',  type: 'dropdown', options: UNIT_OPTIONS, width: 14 },
    { key: 'label',              header: 'Label',          type: 'text', width: 16 },
    { key: 'nodeNumber',         header: 'Node #',         type: 'number', width: 10 },
    { key: 'elevation',          header: 'Elevation',      type: 'number', width: 14 },
    { key: 'mode',               header: 'BC Mode',        type: 'dropdown', options: BC_MODE_OPTIONS, width: 20 },
    // ── Conditional columns — access depends on BC Mode ──
    // Fixed Elevation mode: Res. Elevation editable, H Sched # locked
    // H Schedule mode:      Res. Elevation locked, H Sched # editable, T/H Pairs shows pairs
    { key: 'reservoirElevation', header: 'Res. Elevation (Fixed only)', type: 'number', width: 26, conditionalLock: { field: 'mode', lockedWhen: 'H Schedule' } },
    { key: 'hScheduleNumber',    header: 'H Sched # (Schedule only)',   type: 'number', width: 24, conditionalLock: { field: 'mode', lockedWhen: 'Fixed Elevation' } },
    { key: '_thPairs',           header: 'T/H Pairs (time:head; ...)',  type: 'text',   width: 40, conditionalLock: { field: 'mode', lockedWhen: 'Fixed Elevation' } },
    { key: 'comment',            header: 'Comment',                     type: 'text', width: 24 },
  ],
  junction: [
    ROW_NUM_COL,
    { key: '_unit',      header: 'Unit (SI/FPS)', type: 'dropdown', options: UNIT_OPTIONS, width: 14 },
    { key: 'label',      header: 'Label',         type: 'text', width: 16 },
    { key: 'nodeNumber', header: 'Node #',         type: 'number', width: 10 },
    { key: 'elevation',  header: 'Elevation',      type: 'number', width: 14 },
    { key: 'comment',    header: 'Comment',        type: 'text', width: 24 },
  ],
  surgeTank: [
    ROW_NUM_COL,
    { key: '_unit',             header: 'Unit (SI/FPS)',         type: 'dropdown', options: UNIT_OPTIONS, width: 14 },
    { key: 'label',             header: 'Label',                 type: 'text', width: 16 },
    { key: 'nodeNumber',        header: 'Node #',                type: 'number', width: 10 },
    { key: 'elevation',         header: 'Elevation',             type: 'number', width: 14 },
    { key: 'type_st',           header: 'Tank Type',             type: 'dropdown', options: SURGE_TANK_TYPE_OPTIONS, width: 18 },
    { key: 'tankTop',           header: 'Top Elevation',         type: 'number', width: 14 },
    { key: 'tankBottom',        header: 'Bot. Elevation',        type: 'number', width: 14 },
    { key: 'initialWaterLevel', header: 'HTANK',                 type: 'number', width: 12 },
    { key: 'riserDiameter',     header: 'Riser Diameter',        type: 'number', width: 16 },
    { key: 'riserTop',          header: 'Riser Top',             type: 'number', width: 14 },
    { key: 'hasShape',          header: 'Use SHAPE',             type: 'dropdown', options: BOOL_OPTIONS, width: 12 },
    { key: 'diameter',          header: 'Diameter',              type: 'number', width: 14 },
    { key: 'celerity',          header: 'Wave Speed',            type: 'number', width: 14 },
    { key: 'friction',          header: 'Friction',              type: 'number', width: 14 },
    { key: 'hasAddedLoss',      header: 'Added Loss',            type: 'dropdown', options: BOOL_OPTIONS, width: 14 },
    { key: 'cplus',             header: 'CPLUS',                 type: 'number', width: 12 },
    { key: 'cminus',            header: 'CMINUS',                type: 'number', width: 12 },
    { key: '_shapePairs',       header: 'Shape Pairs (e:a; ...)', type: 'text',   width: 44 },
    { key: 'comment',           header: 'Comment',               type: 'text', width: 24 },
  ],
  flowBoundary: [
    ROW_NUM_COL,
    { key: '_unit',          header: 'Unit (SI/FPS)',              type: 'dropdown', options: UNIT_OPTIONS, width: 14 },
    { key: 'label',          header: 'Label',                      type: 'text', width: 16 },
    { key: 'nodeNumber',     header: 'Node #',                     type: 'number', width: 10 },
    { key: 'elevation',      header: 'Elevation',                  type: 'number', width: 14 },
    { key: 'scheduleNumber', header: 'Q Sched #',                  type: 'number', width: 12 },
    { key: '_qPairs',        header: 'Q Schedule (time:flow; ...)', type: 'text',   width: 44 },
    { key: 'comment',        header: 'Comment',                    type: 'text', width: 24 },
  ],
  pump: [
    ROW_NUM_COL,
    { key: '_unit',      header: 'Unit (SI/FPS)',  type: 'dropdown', options: UNIT_OPTIONS, width: 14 },
    { key: 'label',      header: 'Label',          type: 'text', width: 16 },
    { key: 'nodeNumber', header: 'Node #',          type: 'number', width: 10 },
    { key: 'elevation',  header: 'Elevation',       type: 'number', width: 14 },
    { key: 'pumpStatus', header: 'Status',          type: 'dropdown', options: PUMP_STATUS_OPTIONS, width: 14 },
    { key: 'pumpType',   header: 'PCHAR Type #',    type: 'number', width: 14 },
    { key: 'rq',         header: 'RQ',              type: 'number', width: 12 },
    { key: 'rhead',      header: 'RHEAD',           type: 'number', width: 12 },
    { key: 'rspeed',     header: 'RSPEED (RPM)',    type: 'number', width: 14 },
    { key: 'rtorque',    header: 'RTORQUE',         type: 'number', width: 12 },
    { key: 'wr2',        header: 'WR2',             type: 'number', width: 12 },
    { key: 'comment',    header: 'Comment',         type: 'text', width: 24 },
  ],
  checkValve: [
    ROW_NUM_COL,
    { key: '_unit',       header: 'Unit (SI/FPS)',  type: 'dropdown', options: UNIT_OPTIONS, width: 14 },
    { key: 'label',       header: 'Label',          type: 'text', width: 16 },
    { key: 'nodeNumber',  header: 'Node #',          type: 'number', width: 10 },
    { key: 'elevation',   header: 'Elevation',       type: 'number', width: 14 },
    { key: 'valveStatus', header: 'Status',          type: 'dropdown', options: VALVE_STATUS_OPTIONS, width: 14 },
    { key: 'valveDiam',   header: 'Valve Diameter',  type: 'number', width: 16 },
    { key: 'comment',     header: 'Comment',         type: 'text', width: 24 },
  ],
  turbine: [
    ROW_NUM_COL,
    { key: '_unit',           header: 'Unit (SI/FPS)',     type: 'dropdown', options: UNIT_OPTIONS, width: 14 },
    { key: 'label',           header: 'Label',             type: 'text', width: 16 },
    { key: 'nodeNumber',      header: 'Node #',             type: 'number', width: 10 },
    { key: 'elevation',       header: 'Elevation',          type: 'number', width: 14 },
    { key: 'turbineType',     header: 'TCHAR Type #',       type: 'number', width: 14 },
    { key: 'syncSpeed',       header: 'Sync Speed (RPM)',   type: 'number', width: 18 },
    { key: 'turbineDiameter', header: 'Diameter',           type: 'number', width: 14 },
    { key: 'wr2',             header: 'WR2',                type: 'number', width: 12 },
    { key: 'turbFriction',    header: 'Friction',           type: 'number', width: 14 },
    { key: 'windage',         header: 'Windage',            type: 'number', width: 12 },
    { key: 'operationMode',   header: 'Mode',               type: 'dropdown', options: TURBINE_MODE_OPTIONS, width: 16 },
    { key: 'vScheduleNumber', header: 'V Sched #',          type: 'number', width: 12 },
    { key: 'comment',         header: 'Comment',            type: 'text', width: 24 },
  ],
};

// ─── Material helpers ─────────────────────────────────────────────────────────

import { PIPE_MATERIALS, PIPE_MATERIALS_BY_ID } from './pipe-materials';

function materialLabelById(id: number | string | undefined): string {
  if (!id) return '-- None --';
  const m = PIPE_MATERIALS_BY_ID[Number(id)];
  return m ? m.label : '-- None --';
}

function materialIdByLabel(label: string): number | undefined {
  if (!label || label === '-- None --') return undefined;
  const m = PIPE_MATERIALS.find(m => m.label === label);
  return m?.id;
}

// ─── BC Mode display ↔ stored value helpers ───────────────────────────────────

// Stored value → Excel display label
function modeToDisplay(storedMode: string | undefined): string {
  if (storedMode === 'schedule') return 'H Schedule';
  return 'Fixed Elevation'; // default
}

// Excel display label → stored value (used on import)
function displayToMode(displayVal: string): string {
  if (displayVal === 'H Schedule') return 'schedule';
  if (displayVal === 'Fixed Elevation') return 'fixed';
  // accept raw stored values too (backward compat)
  if (displayVal === 'fixed' || displayVal === 'schedule') return displayVal;
  return 'fixed';
}

// ─── Conditional lock helper ──────────────────────────────────────────────────

// Returns true if this cell should be grayed out / locked for the given row data
function isConditionallyLocked(col: ColDef, data: Record<string, any>): boolean {
  if (!col.conditionalLock) return false;
  const { field, lockedWhen } = col.conditionalLock;
  // The data field stores the raw value; convert to display form for comparison
  const rawVal = data[field];
  const displayVal = field === 'mode' ? modeToDisplay(rawVal) : String(rawVal ?? '');
  return displayVal === lockedWhen;
}

// ─── Cell value extractor ─────────────────────────────────────────────────────

type QSchedules = Record<number, { time: number; flow: number | string }[]>;

function getRowValue(
  col: ColDef,
  data: Record<string, any>,
  subType: string,
  globalUnit: string,
  rowIdx: number,
  hSchedules?: HSchedule[],
  qSchedules?: QSchedules,
): string | number {
  if (col.key === '_rowNum') return rowIdx + 1;
  if (col.key === '_type') {
    const LABELS: Record<string, string> = {
      reservoir: 'Reservoir', node: 'Node', junction: 'Junction',
      surgeTank: 'Surge Tank', flowBoundary: 'Flow BC',
      pump: 'Pump', checkValve: 'Check Valve', turbine: 'Turbine',
      conduit: 'Conduit', dummy: 'Dummy Pipe',
    };
    return LABELS[subType] ?? subType;
  }
  if (col.key === '_unit') return (data.unit as string) || globalUnit;
  if (col.key === '_materialLabel') return materialLabelById(data.materialId);

  // ── Element-category helpers (mirror FlexTable's isEdge / isDummy / etc.) ──
  const isEdgeSub    = subType === 'conduit' || subType === 'dummy';
  const isDummySub   = subType === 'dummy';
  const isConduitSub = subType === 'conduit';
  const isSurgeSub   = subType === 'surgeTank';
  const isFlowSub    = subType === 'flowBoundary';
  const isTurbineSub = subType === 'turbine';

  // ── NA: pipe-specific columns that don't apply to node rows ("all" tab) ────
  // Pipe Type — only meaningful for edges
  if (col.key === 'type' && !isEdgeSub) return 'NA';
  // Node # — only meaningful for nodes
  if (col.key === 'nodeNumber' && isEdgeSub) return 'NA';
  // Length — conduit only (nodes and dummy pipes have no length)
  if (col.key === 'length' && (!isEdgeSub || isDummySub)) return 'NA';
  // Elevation — not applicable for pipe elements (edges); flow boundaries now include elevation
  if (col.key === 'elevation' && isEdgeSub) return 'NA';
  // Wave Speed & Friction — applicable to pipe edges and surge tanks only
  if ((col.key === 'celerity' || col.key === 'friction') && !isEdgeSub && !isSurgeSub) return 'NA';

  // ── NA: distance and area — only applicable when VARIABLE = true ────────────
  const isVariable = data.variable === true || data.variable === 'true';
  if ((col.key === 'distance' || col.key === 'area' || col.key === 'd' || col.key === 'a') && !isVariable) return 'NA';

  // ── NA: Manning's n, pipeE, pipeWT — conduit only ─────────────────────────
  if ((col.key === 'manningsN' || col.key === 'pipeE' || col.key === 'pipeWT') && !isConduitSub) return 'NA';

  // ── NA: turbine V-schedule number — only needed for GENERATE/TURBGOV/EMERGENCY ──
  if (col.key === 'vScheduleNumber' && isTurbineSub) {
    const opMode = String(data.operationMode || 'TURBINE');
    if (opMode !== 'GENERATE' && opMode !== 'TURBGOV' && opMode !== 'EMERGENCY') return 'NA';
  }

  // BC Mode: translate stored 'fixed'/'schedule' → display label for Excel dropdown
  if (col.key === 'mode') return modeToDisplay(data.mode);

  // Reservoir H Schedule: hScheduleNumber defaults to 1 and is always numeric
  if (col.key === 'hScheduleNumber') {
    if (data.mode !== 'schedule') return 'NA';
    return Number(data.hScheduleNumber ?? 1);
  }

  // T/H Pairs (reservoir H Schedule mode) — editable format: "time:head; time:head; ..."
  if (col.key === '_thPairs') {
    if (data.mode !== 'schedule') return 'NA';
    const schedNum = Number(data.hScheduleNumber ?? 1);
    const sched = hSchedules?.find(s => Number(s.number) === schedNum);
    if (!sched || sched.points.length === 0) return '';
    return sched.points.map(p => `${p.time}:${p.head}`).join('; ');
  }

  // Q Schedule pairs (flow boundary) — editable format: "time:flow; time:flow; ..."
  if (col.key === '_qPairs') {
    const schedNum = Number(data.scheduleNumber ?? 1);
    const points: any[] = qSchedules?.[schedNum] ?? (data.schedulePoints as any[]) ?? [];
    if (!points.length) return '';
    return points.map(p => `${p.time}:${p.flow}`).join('; ');
  }

  // Shape Pairs (surge tank, only when Use SHAPE = true) — editable format: "e:a; e:a; ..."
  if (col.key === '_shapePairs') {
    const hasShape = data.hasShape === true || data.hasShape === 'true';
    if (!hasShape) return 'NA';
    const pairs: any[] = (data.shape as any[]) ?? [];
    if (!pairs.length) return '';
    return pairs.map(p => `${p.e}:${p.a}`).join('; ');
  }

  // ── NA for surge-tank fields that depend on tank type ──────────────────────
  if (subType === 'surgeTank') {
    const stType = String(data.type_st || 'SIMPLE');
    // HTANK: only applicable for AIRTANK or DIFFERENTIAL
    if (col.key === 'initialWaterLevel' && stType !== 'AIRTANK' && stType !== 'DIFFERENTIAL') return 'NA';
    // Riser Diameter, Riser Top: only applicable for DIFFERENTIAL
    if ((col.key === 'riserDiameter' || col.key === 'riserTop') && stType !== 'DIFFERENTIAL') return 'NA';
    // Diameter: NA when Use SHAPE is enabled (shape data replaces uniform diameter)
    if (col.key === 'diameter' && (data.hasShape === true || data.hasShape === 'true')) return 'NA';
  }

  // ── NA for CPLUS / CMINUS when Added Loss is disabled ──────────────────────
  if (col.key === 'cplus' || col.key === 'cminus') {
    const hasLoss = data.hasAddedLoss === true || data.hasAddedLoss === 'true';
    if (!hasLoss) return 'NA';
  }

  // Conditionally locked cells (e.g. reservoir fields locked by BC Mode)
  if (isConditionallyLocked(col, data)) return 'NA';

  const val = data[col.key];

  // For undefined/null values, apply field-specific defaults so dropdown cells
  // are never blank for fields that have a known default in the UI.
  if (val === undefined || val === null) {
    const FIELD_DEFAULTS: Record<string, string | boolean> = {
      type_st:            'SIMPLE',
      hasAddedLoss:       false,
      hasShape:           false,
      includeNumSegments: false,
      hasVariable:        false,
      inclInp:            true,
      pumpStatus:         'ACTIVE',
      valveStatus:        'OPEN',
      operationMode:      'TURBINE',
    };
    if (col.key in FIELD_DEFAULTS) {
      const def = FIELD_DEFAULTS[col.key];
      if (typeof def === 'boolean') {
        // Boolean-option dropdowns (Yes / No): use the display label, not 'true'/'false'
        if (col.type === 'dropdown' && col.options?.[0] === 'Yes') return def ? 'Yes' : 'No';
        return def ? 'true' : 'false';
      }
      return def;
    }
    return '';
  }

  // Boolean values: use 'Yes'/'No' for Yes/No dropdown columns, plain 'true'/'false' elsewhere
  if (typeof val === 'boolean' || val === 'true' || val === 'false') {
    const isTrue = val === true || val === 'true';
    if (col.type === 'dropdown' && col.options?.[0] === 'Yes') return isTrue ? 'Yes' : 'No';
    return isTrue ? 'true' : 'false';
  }
  return val as string | number;
}

// ─── Column letter helper ─────────────────────────────────────────────────────

// 0-based column index → Excel letter (A, B, … Z, AA, AB…)
function excelColLetter(idx: number): string {
  const n = idx + 1;
  if (n <= 26) return String.fromCharCode(64 + n);
  return String.fromCharCode(64 + Math.floor((n - 1) / 26)) +
         String.fromCharCode(64 + ((n - 1) % 26) + 1);
}

// ─── Styling constants ────────────────────────────────────────────────────────

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A73E8' },
};
const ROWNUM_FILL: ExcelJS.Fill = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1557B0' },
};
const READONLY_FILL_EVEN: ExcelJS.Fill = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' },
};
const READONLY_FILL_ODD: ExcelJS.Fill = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' },
};
const DROPDOWN_FILL_EVEN: ExcelJS.Fill = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF4FF' },
};
const DROPDOWN_FILL_ODD: ExcelJS.Fill = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE4EDFF' },
};
const NORMAL_FILL_EVEN: ExcelJS.Fill = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' },
};
const NORMAL_FILL_ODD: ExcelJS.Fill = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFF' },
};
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
const CELL_BORDER: Partial<ExcelJS.Borders> = {
  bottom: { style: 'hair', color: { argb: 'FFD1D5DB' } },
  right: { style: 'hair', color: { argb: 'FFD1D5DB' } },
};

// ─── Export ───────────────────────────────────────────────────────────────────

export interface ExportRow {
  id: string;
  kind: 'edge' | 'node';
  subType: string;
  data: Record<string, any>;
}

// ─── Internal: add one worksheet to an existing workbook ─────────────────────
async function _addWorksheetToWb(
  wb: ExcelJS.Workbook,
  filter: FilterKey,
  rows: ExportRow[],
  globalUnit: string,
  tabLabel: string,
  hSchedules?: HSchedule[],
  listSheetSuffix = '',
  qSchedules?: QSchedules,
): Promise<void> {
  if (!TAB_COLS[filter]) throw new Error(`Unknown filter: ${filter}`);
  // Strip read-only columns — informational only, not needed in the downloaded file
  const cols = TAB_COLS[filter].filter(c => !c.readOnly);

  // ── Hidden "Lists" sheet for long dropdowns (e.g. Pipe Material, 63 items) ──
  // Only created when the current tab actually has long-list columns.
  const longListCols = cols.filter(c => c.isLongList && c.options);
  const listRanges: Record<string, string> = {};

  if (longListCols.length > 0) {
    const listSheetName = `_Lists${listSheetSuffix}`;
    const listsWs = wb.getWorksheet(listSheetName) ?? wb.addWorksheet(listSheetName);
    listsWs.state = 'veryHidden'; // invisible in Excel UI; cannot be unhidden without VBA

    longListCols.forEach((col, i) => {
      const colLetter = String.fromCharCode(65 + i); // A, B, C…
      if (col.options) {
        col.options.forEach((opt, r) => {
          listsWs.getCell(`${colLetter}${r + 1}`).value = opt;
        });
        listRanges[col.key] = `${listSheetName}!$${colLetter}$1:$${colLetter}$${col.options.length}`;
      }
    });
  }

  // ── Main data sheet ──
  const ws = wb.addWorksheet(tabLabel, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  // Set column definitions
  ws.columns = cols.map(col => ({
    header: col.header,
    key: col.key,
    width: col.width ?? Math.max(12, col.header.length + 4),
  }));

  // Style header row
  const headerRow = ws.getRow(1);
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const colDef = cols[colNumber - 1];
    cell.fill = colDef?.key === '_rowNum' ? ROWNUM_FILL : HEADER_FILL;
    cell.font = { ...HEADER_FONT, size: colDef?.key === '_rowNum' ? 9 : 10 };
    cell.alignment = { vertical: 'middle', horizontal: colDef?.key === '_rowNum' ? 'center' : 'left' };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF1044A0' } } };
  });
  headerRow.height = 22;

  // Add a second "sub-header" hint row (light gray, italic)
  const hintRow = ws.addRow(cols.map(col => {
    if (col.key === '_rowNum') return '';
    if (col.readOnly) return '(read-only)';
    if (col.type === 'dropdown') return '▼ dropdown';
    if (col.type === 'number') return '123 numeric';
    return 'text';
  }));
  hintRow.eachCell({ includeEmpty: true }, cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5FB' } };
    cell.font = { italic: true, color: { argb: 'FF8899BB' }, size: 8 };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFCCD5E8' } } };
  });
  hintRow.height = 14;

  // ── Data rows (start at Excel row 3 because of hint row) ──
  rows.forEach((row, rowIdx) => {
    const isEven = rowIdx % 2 === 0;
    const values: (string | number)[] = cols.map(col =>
      getRowValue(col, row.data, row.subType, globalUnit, rowIdx, hSchedules, qSchedules)
    );
    const excelRow = ws.addRow(values);

    excelRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const colDef = cols[colNumber - 1];
      if (!colDef) return;

      const isReadOnly = !!colDef.readOnly;
      const isRowNum = colDef.key === '_rowNum';
      // A cell is "conditionally locked" when it's not accessible for this row's current mode
      const isCondLocked = isConditionallyLocked(colDef, row.data);
      // Effective locked = explicitly read-only OR conditionally locked by mode
      const isEffectiveLocked = isReadOnly || isCondLocked;
      const isDropdown = colDef.type === 'dropdown' && !isEffectiveLocked;
      const isNumeric = colDef.type === 'number' && !isEffectiveLocked;

      // Fill colour
      if (isRowNum) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFE8F0FE' : 'FFD2E3FC' } };
      } else if (isCondLocked) {
        // Conditionally locked: distinct amber-gray tint to mirror the "dimmed" look in the app
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFFFF8EE' : 'FFFFF3E0' } };
      } else if (isReadOnly) {
        cell.fill = isEven ? READONLY_FILL_EVEN : READONLY_FILL_ODD;
      } else if (isDropdown) {
        cell.fill = isEven ? DROPDOWN_FILL_EVEN : DROPDOWN_FILL_ODD;
      } else {
        cell.fill = isEven ? NORMAL_FILL_EVEN : NORMAL_FILL_ODD;
      }

      // Font
      cell.font = {
        size: 10,
        color: { argb: isEffectiveLocked && !isRowNum ? 'FFAAAAAA' : 'FF1A1A2E' },
        bold: isRowNum,
        italic: isCondLocked,
      };

      // Alignment
      cell.alignment = {
        vertical: 'middle',
        horizontal: isRowNum || isNumeric ? 'center' : 'left',
      };

      cell.border = isRowNum
        ? { ...CELL_BORDER, right: { style: 'medium', color: { argb: 'FF1A73E8' } } }
        : CELL_BORDER;

      // ── Data validation ──
      // Truly read-only cells (e.g. row # and computed fields): hard-lock, no validation
      if (isReadOnly) {
        if (!isRowNum) cell.protection = { locked: true };
        return;
      }

      // Conditionally locked cells (depend on BC Mode): leave accessible so that
      // changing the BC Mode dropdown in Excel immediately reveals a ready-to-use cell.
      // Visual locking is handled by Conditional Formatting (amber style) set below.
      // hScheduleNumber gets its dropdown from the range-based section; skip here.
      if (colDef.key === 'hScheduleNumber') return;

      // Dropdown: long list → reference sheet range; short list → inline formula
      if (isDropdown && colDef.options) {
        if (colDef.isLongList && listRanges[colDef.key]) {
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [listRanges[colDef.key]],
            error: 'Please select a value from the list.',
            errorTitle: 'Invalid Value',
            showErrorMessage: true,
          };
        } else {
          const formulaList = '"' + colDef.options.join(',') + '"';
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [formulaList],
            error: 'Please select a valid option.',
            errorTitle: 'Invalid Value',
            showErrorMessage: true,
          };
        }
      }

      // Number: decimal validation — rejects letters (skip conditionally locked to keep cell open)
      if (isNumeric && !isCondLocked) {
        cell.dataValidation = {
          type: 'decimal',
          operator: 'between',
          allowBlank: true,
          formulae: [-1e15, 1e15],
          error: 'This field only accepts numeric values. Please enter a number.',
          errorTitle: 'Numbers Only',
          showErrorMessage: true,
        };
      }
    });

    excelRow.height = 18;
  });

  // ── Conduit: inject friction/celerity Excel formulas ──
  // When the user edits Manning's n or E/WT/Diameter in Excel, these cells
  // auto-recompute using the same formulas the app uses.
  if (filter === 'conduit' && rows.length > 0) {
    const unitIdx     = cols.findIndex(c => c.key === '_unit');
    const diamIdx     = cols.findIndex(c => c.key === 'diameter');
    const manNIdx     = cols.findIndex(c => c.key === 'manningsN');
    const pipeEIdx    = cols.findIndex(c => c.key === 'pipeE');
    const pipeWTIdx   = cols.findIndex(c => c.key === 'pipeWT');
    const frictionIdx = cols.findIndex(c => c.key === 'friction');
    const celerityIdx = cols.findIndex(c => c.key === 'celerity');

    if (unitIdx >= 0 && diamIdx >= 0) {
      const unitCol = excelColLetter(unitIdx);
      const diamCol = excelColLetter(diamIdx);

      // Friction = K * n^2 / D^(1/3)  where K=124.58 (SI) or 185 (FPS)
      if (manNIdx >= 0 && frictionIdx >= 0) {
        const manNCol = excelColLetter(manNIdx);
        const frCol   = excelColLetter(frictionIdx);
        rows.forEach((row, rowIdx) => {
          const r = rowIdx + 3; // row 1=header, 2=hint, 3+=data
          // Pre-compute result so Excel shows the value immediately (no recalc needed)
          const rowUnit = String(row.data.unit || globalUnit);
          const K = rowUnit === 'SI' ? 124.58 : 185;
          const n = parseFloat(String(row.data.manningsN ?? 0)) || 0;
          const D = parseFloat(String(row.data.diameter ?? 0)) || 0;
          const frResult: number | string = (n > 0 && D > 0)
            ? K * n * n / Math.pow(D, 1 / 3)
            : (parseFloat(String(row.data.friction ?? '')) || '');
          ws.getCell(`${frCol}${r}`).value = {
            formula: `IF(AND(${manNCol}${r}>0,${diamCol}${r}>0),IF(${unitCol}${r}="SI",124.58,185)*${manNCol}${r}^2/${diamCol}${r}^(1/3),"")`,
            result: frResult,
          } as any;
        });
      }

      // Celerity = C0 / sqrt(1 + (Kw/E)*(D/WT))
      // C0=1440 (SI)/4720 (FPS), Kw=2.07e9 (SI)/300000 (FPS)
      if (pipeEIdx >= 0 && pipeWTIdx >= 0 && celerityIdx >= 0) {
        const pipeECol  = excelColLetter(pipeEIdx);
        const pipeWTCol = excelColLetter(pipeWTIdx);
        const celCol    = excelColLetter(celerityIdx);
        rows.forEach((row, rowIdx) => {
          const r = rowIdx + 3;
          // Pre-compute result so Excel shows the value immediately (no recalc needed)
          const rowUnit = String(row.data.unit || globalUnit);
          const C0 = rowUnit === 'SI' ? 1440 : 4720;
          const Kw = rowUnit === 'SI' ? 2.07e9 : 3e5;
          const E  = parseFloat(String(row.data.pipeE ?? 0)) || 0;
          const WT = parseFloat(String(row.data.pipeWT ?? 0)) || 0;
          const D  = parseFloat(String(row.data.diameter ?? 0)) || 0;
          const celResult: number | string = (E > 0 && WT > 0 && D > 0)
            ? C0 / Math.sqrt(1 + (Kw / E) * (D / WT))
            : (parseFloat(String(row.data.celerity ?? '')) || '');
          ws.getCell(`${celCol}${r}`).value = {
            formula: `IF(AND(${pipeECol}${r}>0,${pipeWTCol}${r}>0,${diamCol}${r}>0),IF(${unitCol}${r}="SI",1440,4720)/SQRT(1+IF(${unitCol}${r}="SI",2.07E9,300000)/${pipeECol}${r}*(${diamCol}${r}/${pipeWTCol}${r})),"")`,
            result: celResult,
          } as any;
        });
      }
    }
  }

  // ── Conditional Formatting: dynamic per-mode locking for reservoir ──
  // This makes cells visually respond LIVE when the user changes BC Mode in Excel.
  if (filter === 'reservoir' && rows.length > 0) {
    const maxDataRow = rows.length + 2; // 1 header + 1 hint + N data rows

    const modeIdx    = cols.findIndex(c => c.key === 'mode');
    const resElevIdx = cols.findIndex(c => c.key === 'reservoirElevation');
    const hSchedIdx  = cols.findIndex(c => c.key === 'hScheduleNumber');
    const thPairsIdx = cols.findIndex(c => c.key === '_thPairs');

    if (modeIdx >= 0) {
      const modeCol = excelColLetter(modeIdx);
      const cfDataRange = (colIdx: number) =>
        `${excelColLetter(colIdx)}3:${excelColLetter(colIdx)}${maxDataRow}`;

      const lockedStyle = {
        fill: { type: 'pattern' as const, pattern: 'solid' as const,
                fgColor: { argb: 'FFFFF3E0' } },
        font: { color: { argb: 'FFAAAAAA' }, italic: true, size: 10 },
      };
      const activeStyle = {
        fill: { type: 'pattern' as const, pattern: 'solid' as const,
                fgColor: { argb: 'FFFFFFFF' } },
        font: { color: { argb: 'FF1A1A2E' }, italic: false, size: 10 },
      };

      // Res. Elevation: locked when BC Mode = "H Schedule"
      if (resElevIdx >= 0) {
        ws.addConditionalFormatting({
          ref: cfDataRange(resElevIdx),
          rules: [
            { type: 'expression', priority: 1,
              formulae: [`$${modeCol}3="H Schedule"`], style: lockedStyle },
            { type: 'expression', priority: 2,
              formulae: [`$${modeCol}3="Fixed Elevation"`], style: activeStyle },
          ],
        });
      }
      // H Sched #: locked when BC Mode = "Fixed Elevation"
      if (hSchedIdx >= 0) {
        ws.addConditionalFormatting({
          ref: cfDataRange(hSchedIdx),
          rules: [
            { type: 'expression', priority: 1,
              formulae: [`$${modeCol}3="Fixed Elevation"`], style: lockedStyle },
            { type: 'expression', priority: 2,
              formulae: [`$${modeCol}3="H Schedule"`], style: activeStyle },
          ],
        });
      }
      // T/H Pairs: locked when BC Mode = "Fixed Elevation", active when "H Schedule"
      if (thPairsIdx >= 0) {
        ws.addConditionalFormatting({
          ref: cfDataRange(thPairsIdx),
          rules: [
            { type: 'expression', priority: 1,
              formulae: [`$${modeCol}3="Fixed Elevation"`], style: lockedStyle },
            { type: 'expression', priority: 2,
              formulae: [`$${modeCol}3="H Schedule"`], style: activeStyle },
          ],
        });
      }

      // H Sched # dropdown: list of available schedule numbers (from hSchedules)
      // Applied to ALL reservoir rows so the dropdown is ready when user switches BC Mode in Excel.
      if (hSchedIdx >= 0 && hSchedules && hSchedules.length > 0) {
        const schedNums = hSchedules.map(s => s.number);
        // Create _Lists lazily if it wasn't needed for long-list columns
        let listsSheet = wb.getWorksheet('_Lists');
        if (!listsSheet) {
          listsSheet = wb.addWorksheet('_Lists');
          listsSheet.state = 'veryHidden';
        }
        if (listsSheet) {
          // Find the next free column in _Lists
          const usedCols = listsSheet.columnCount || 0;
          const schedCol = String.fromCharCode(65 + usedCols);
          listsSheet.getCell(`${schedCol}1`).value = '_hSchedNums';
          schedNums.forEach((num, r) => {
            listsSheet.getCell(`${schedCol}${r + 2}`).value = num;
          });
          // Also store T/H pair strings alongside each schedule number for reference
          const pairsCol = String.fromCharCode(65 + usedCols + 1);
          listsSheet.getCell(`${pairsCol}1`).value = '_thPairsLookup';
          hSchedules.forEach((sched, r) => {
            const pairsStr = sched.points.map(p => `${p.time}:${p.head}`).join('; ');
            listsSheet.getCell(`${pairsCol}${r + 2}`).value = pairsStr;
          });

          const schedListRange = `_Lists!$${schedCol}$2:$${schedCol}$${schedNums.length + 1}`;
          const hSchedColLetter = excelColLetter(hSchedIdx);
          const thPairsColLetter = thPairsIdx >= 0 ? excelColLetter(thPairsIdx) : null;

          // Apply H Sched # dropdown to ALL data rows (not just schedule rows)
          // so the dropdown is available the moment user switches BC Mode in Excel
          for (let r = 3; r <= maxDataRow; r++) {
            ws.getCell(`${hSchedColLetter}${r}`).dataValidation = {
              type: 'list',
              allowBlank: true,
              formulae: [schedListRange],
              showDropDown: false, // show the arrow
              error: 'Please select a valid H Schedule number.',
              errorTitle: 'Invalid Schedule',
              showErrorMessage: true,
            };

            // T/H Pairs: auto-populate via IFERROR(INDEX/MATCH) formula so picking a
            // schedule number from the dropdown immediately fills the pairs for reference.
            // The cell remains editable (user can override). Import reads the text back.
            if (thPairsColLetter) {
              const nRows = schedNums.length;
              const pairsRange  = `_Lists!$${pairsCol}$2:$${pairsCol}$${nRows + 1}`;
              const schedRange  = `_Lists!$${schedCol}$2:$${schedCol}$${nRows + 1}`;
              ws.getCell(`${thPairsColLetter}${r}`).value = {
                formula: `IFERROR(INDEX(${pairsRange},MATCH(${hSchedColLetter}${r},${schedRange},0)),"")`,
                result: '',
              } as any;
            }
          }
        }
      } else if (hSchedIdx >= 0) {
        // No schedules defined yet — T/H Pairs stays blank but editable (no formula)
      }
    }
  }

}

// ─── Public: single-tab export ───────────────────────────────────────────────
export async function exportTabToExcel(
  filter: FilterKey,
  rows: ExportRow[],
  globalUnit: string,
  tabLabel: string,
  hSchedules?: HSchedule[],
  qSchedules?: QSchedules,
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'WHAMO Network Designer';
  wb.created = new Date();
  await _addWorksheetToWb(wb, filter, rows, globalUnit, tabLabel, hSchedules, '', qSchedules);
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `whamo_${filter}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Multi-sheet export ───────────────────────────────────────────────────────
const ALL_SHEET_TYPES: Array<{ filter: FilterKey; label: string }> = [
  { filter: 'reservoir',    label: 'Reservoir'   },
  { filter: 'node',         label: 'Node'        },
  { filter: 'junction',     label: 'Junction'    },
  { filter: 'conduit',      label: 'Conduit'     },
  { filter: 'dummy',        label: 'Dummy Pipe'  },
  { filter: 'pump',         label: 'Pump'        },
  { filter: 'checkValve',   label: 'Check Valve' },
  { filter: 'surgeTank',    label: 'Surge Tank'  },
  { filter: 'flowBoundary', label: 'Flow BC'     },
  { filter: 'turbine',      label: 'Turbine'     },
];

// Map sheet label → FilterKey for import
const SHEET_LABEL_TO_FILTER: Record<string, FilterKey> = Object.fromEntries(
  ALL_SHEET_TYPES.map(({ filter, label }) => [label, filter])
);

export async function exportAllSheetsToExcel(
  allRows: ExportRow[],
  globalUnit: string,
  projectName: string,
  hSchedules: HSchedule[] = [],
  qSchedules?: QSchedules,
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'WHAMO Network Designer';
  wb.created = new Date();

  for (const { filter, label } of ALL_SHEET_TYPES) {
    const rows = filter === 'node'
      ? allRows.filter(r => r.subType === 'node')
      : allRows.filter(r => r.subType === filter);
    if (rows.length === 0) continue;
    // Use per-sheet suffix so each sheet's hidden _Lists doesn't clash
    await _addWorksheetToWb(wb, filter, rows, globalUnit, label, hSchedules, `_${label.replace(/\s/g, '')}`, qSchedules);
  }

  const safeName = (projectName || 'network').replace(/[^a-zA-Z0-9_-]/g, '_');
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `whamo_all_${safeName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Import ───────────────────────────────────────────────────────────────────

export interface ImportUpdate {
  id: string;
  kind: 'edge' | 'node';
  data: Record<string, any>;
}

export interface ImportSheetSummary {
  label: string;
  matched: number;
  skipped: number;
}

export interface ImportAllResult {
  updates: ImportUpdate[];
  hScheduleUpdates: HScheduleUpdate[];
  qScheduleUpdates: QScheduleUpdate[];
  summary: ImportSheetSummary[];
  totalMatched: number;
  totalSkipped: number;
}

export interface HScheduleUpdate {
  scheduleNumber: number;
  points: { time: number; head: number }[];
}

export interface QScheduleUpdate {
  scheduleNumber: number;
  points: { time: number; flow: number }[];
}

// ─── Shared helper: parse one Excel data row into updates ────────────────────
function _parseExcelDataRow(
  cols: ColDef[],
  excelRow: ExcelJS.Row,
  headerMap: Record<string, number>,
  existingRow: ExportRow,
  globalUnit: string,
  hScheduleUpdates: HScheduleUpdate[],
  qScheduleUpdates: QScheduleUpdate[],
): Record<string, any> {
  const update: Record<string, any> = {};

  cols.forEach(col => {
    if (col.readOnly) return;
    const colNum = headerMap[col.header];
    if (!colNum) return;
    const cell = excelRow.getCell(colNum);
    const rawVal = cell.value;
    if (rawVal === null || rawVal === undefined || rawVal === '') return;
    const effectiveVal = (rawVal !== null && typeof rawVal === 'object' && 'result' in (rawVal as object))
      ? (rawVal as { formula: string; result: any }).result
      : rawVal;
    if (effectiveVal === null || effectiveVal === undefined || effectiveVal === '') return;
    const strVal = String(effectiveVal).trim();
    if (!strVal) return;

    if (strVal === 'NA' || strVal.startsWith('NA —') || strVal.startsWith('NA -')) return;

    if (col.key === '_unit') {
      if (strVal === 'SI' || strVal === 'FPS') update.unit = strVal;
      return;
    }

    if (col.key === 'mode') {
      update.mode = displayToMode(strVal);
      return;
    }

    if (col.key === '_thPairs') {
      const effectiveMode = update.mode ?? existingRow.data.mode ?? 'fixed';
      if (effectiveMode !== 'schedule') return;
      const schedNum = update.hScheduleNumber ?? existingRow.data.hScheduleNumber ?? 1;
      const points: { time: number; head: number }[] = [];
      strVal.split(';').forEach(segment => {
        const trimmed = segment.trim();
        if (!trimmed) return;
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx < 0) return;
        const t = parseFloat(trimmed.slice(0, colonIdx).trim());
        const h = parseFloat(trimmed.slice(colonIdx + 1).trim());
        if (!isNaN(t) && !isNaN(h)) points.push({ time: t, head: h });
      });
      if (points.length > 0) hScheduleUpdates.push({ scheduleNumber: Number(schedNum), points });
      return;
    }

    if (col.key === '_qPairs') {
      const schedNum = update.scheduleNumber ?? existingRow.data.scheduleNumber ?? 1;
      const points: { time: number; flow: number }[] = [];
      strVal.split(';').forEach(segment => {
        const trimmed = segment.trim();
        if (!trimmed) return;
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx < 0) return;
        const t = parseFloat(trimmed.slice(0, colonIdx).trim());
        const f = parseFloat(trimmed.slice(colonIdx + 1).trim());
        if (!isNaN(t) && !isNaN(f)) points.push({ time: t, flow: f });
      });
      if (points.length > 0) qScheduleUpdates.push({ scheduleNumber: Number(schedNum), points });
      return;
    }

    if (col.key === '_shapePairs') {
      const points: { e: number; a: number }[] = [];
      strVal.split(';').forEach(segment => {
        const trimmed = segment.trim();
        if (!trimmed) return;
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx < 0) return;
        const e = parseFloat(trimmed.slice(0, colonIdx).trim());
        const a = parseFloat(trimmed.slice(colonIdx + 1).trim());
        if (!isNaN(e) && !isNaN(a)) points.push({ e, a });
      });
      if (points.length > 0) update.shape = points;
      return;
    }

    if (col.key === '_materialLabel') {
      const matId = materialIdByLabel(strVal);
      if (matId !== undefined) {
        update.materialId = matId;
        const m = PIPE_MATERIALS_BY_ID[matId];
        if (m) {
          update.manningsN = m.manningsN;
          const unit: string = (existingRow.data.unit as string) || globalUnit;
          const eVal = unit === 'SI' ? m.youngsModulus_Pa : m.youngsModulus_psi;
          if (eVal > 0) update.pipeE = eVal;
        }
      } else {
        update.materialId = '';
      }
      return;
    }

    if (col.type === 'number') {
      const num = parseFloat(strVal);
      if (!isNaN(num)) update[col.key] = num;
      return;
    }

    if (col.type === 'dropdown' || col.type === 'text') {
      if (col.options && (col.options[0] === 'true' || col.options[1] === 'false')) {
        update[col.key] = strVal === 'true';
        return;
      }
      // Label is allowed when it comes from a label-changed import row
      update[col.key] = strVal;
      return;
    }
  });

  return update;
}

export async function importTabFromExcel(
  filter: FilterKey,
  rows: ExportRow[],
  globalUnit: string,
  file: File,
): Promise<{ updates: ImportUpdate[]; hScheduleUpdates: HScheduleUpdate[]; qScheduleUpdates: QScheduleUpdate[]; skipped: number; matched: number }> {
  const cols = TAB_COLS[filter];
  if (!cols) throw new Error(`Unknown filter: ${filter}`);

  const buffer = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  const ws = wb.worksheets.find(
    s => !s.name.startsWith('_') && !s.name.toLowerCase().includes('legend')
  );
  if (!ws) throw new Error('No data sheet found in workbook.');

  const headerRow = ws.getRow(1);
  const headerMap: Record<string, number> = {};
  headerRow.eachCell((cell, colNum) => {
    const val = String(cell.value ?? '').trim();
    if (val) headerMap[val] = colNum;
  });

  // Primary lookup: by Label; secondary: by row position (0-based data rows)
  const labelLookup = new Map<string, ExportRow>();
  for (const row of rows) {
    const lbl = String(row.data.label ?? '').trim();
    if (lbl) labelLookup.set(lbl, row);
  }

  const updates: ImportUpdate[] = [];
  const hScheduleUpdates: HScheduleUpdate[] = [];
  const qScheduleUpdates: QScheduleUpdate[] = [];
  let skipped = 0;
  let matched = 0;
  const labelColNum = headerMap['Label'];
  let dataRowIdx = 0;

  ws.eachRow((excelRow, rowNum) => {
    if (rowNum <= 2) return; // skip header and hint rows

    const labelCell = labelColNum ? excelRow.getCell(labelColNum) : null;
    const labelVal = String(labelCell?.value ?? '').trim();

    // Match by label first; fall back to row position
    let existingRow = labelVal ? labelLookup.get(labelVal) : undefined;
    if (!existingRow) existingRow = rows[dataRowIdx];
    dataRowIdx++;

    if (!existingRow) { skipped++; return; }

    matched++;
    const update = _parseExcelDataRow(cols, excelRow, headerMap, existingRow, globalUnit, hScheduleUpdates, qScheduleUpdates);

    // ── Reservoir conditional field cleanup ──
    if (existingRow.subType === 'reservoir') {
      const effectiveMode = update.mode ?? existingRow.data.mode ?? 'fixed';
      if (effectiveMode === 'schedule') {
        delete update.reservoirElevation;
      } else {
        delete update.hScheduleNumber;
      }
    }

    updates.push({ id: existingRow.id, kind: existingRow.kind, data: update });
  });

  return { updates, hScheduleUpdates, qScheduleUpdates, skipped, matched };
}

// ─── Multi-sheet import ───────────────────────────────────────────────────────
// Reads every data sheet in the workbook and maps it to the correct FilterKey.
// Returns aggregated updates and a per-sheet summary for the ImportSummaryDialog.
export async function importAllSheetsFromExcel(
  allRows: ExportRow[],
  globalUnit: string,
  file: File,
): Promise<ImportAllResult> {
  const buffer = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  const allUpdates: ImportUpdate[] = [];
  const allHScheduleUpdates: HScheduleUpdate[] = [];
  const allQScheduleUpdates: QScheduleUpdate[] = [];
  const summary: ImportSheetSummary[] = [];
  let totalMatched = 0;
  let totalSkipped = 0;

  for (const ws of wb.worksheets) {
    if (ws.name.startsWith('_')) continue;
    const filter = SHEET_LABEL_TO_FILTER[ws.name];
    if (!filter) continue;

    const cols = TAB_COLS[filter];
    if (!cols) continue;

    const filterRows: ExportRow[] = filter === 'node'
      ? allRows.filter(r => r.subType === 'node')
      : allRows.filter(r => r.subType === filter);

    if (filterRows.length === 0) continue;

    const headerRow = ws.getRow(1);
    const headerMap: Record<string, number> = {};
    headerRow.eachCell((cell, colNum) => {
      const val = String(cell.value ?? '').trim();
      if (val) headerMap[val] = colNum;
    });

    // Primary: label lookup; secondary: row position
    const labelLookup = new Map<string, ExportRow>();
    for (const row of filterRows) {
      const lbl = String(row.data.label ?? '').trim();
      if (lbl) labelLookup.set(lbl, row);
    }

    let sheetMatched = 0;
    let sheetSkipped = 0;
    const sheetUpdates: ImportUpdate[] = [];
    const sheetHScheduleUpdates: HScheduleUpdate[] = [];
    const sheetQScheduleUpdates: QScheduleUpdate[] = [];
    const labelColIndex = headerMap['Label'] ?? headerMap['label'];
    let dataRowIdx = 0;

    for (let rowNum = 3; rowNum <= ws.rowCount; rowNum++) {
      const wsRow = ws.getRow(rowNum);
      const labelVal = labelColIndex ? String(wsRow.getCell(labelColIndex)?.value ?? '').trim() : '';

      let existingRow = labelVal ? labelLookup.get(labelVal) : undefined;
      if (!existingRow) existingRow = filterRows[dataRowIdx];
      dataRowIdx++;

      if (!existingRow) { sheetSkipped++; continue; }

      sheetMatched++;
      const update = _parseExcelDataRow(cols, wsRow, headerMap, existingRow, globalUnit, sheetHScheduleUpdates, sheetQScheduleUpdates);

      if (existingRow.subType === 'reservoir') {
        const effectiveMode = update.mode ?? existingRow.data.mode ?? 'fixed';
        if (effectiveMode === 'schedule') {
          delete update.reservoirElevation;
        } else {
          delete update.hScheduleNumber;
        }
      }

      sheetUpdates.push({ id: existingRow.id, kind: existingRow.kind, data: update });
    }

    allUpdates.push(...sheetUpdates);
    allHScheduleUpdates.push(...sheetHScheduleUpdates);
    allQScheduleUpdates.push(...sheetQScheduleUpdates);
    summary.push({ label: ws.name, matched: sheetMatched, skipped: sheetSkipped });
    totalMatched += sheetMatched;
    totalSkipped += sheetSkipped;
  }

  return { updates: allUpdates, hScheduleUpdates: allHScheduleUpdates, qScheduleUpdates: allQScheduleUpdates, summary, totalMatched, totalSkipped };
}
