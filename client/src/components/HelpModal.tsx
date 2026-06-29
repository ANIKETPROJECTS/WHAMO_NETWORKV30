import { useState } from 'react';
import { X, BookOpen, Layers, Link2, Table2, FileSpreadsheet, Play, FileText, Keyboard, HelpCircle, ChevronRight, FileDown, ChevronDown, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

interface Section {
  id: string;
  icon: React.ReactNode;
  label: string;
}

const SECTIONS: Section[] = [
  { id: 'getting-started',   icon: <BookOpen className="w-4 h-4" />,       label: 'Getting Started'     },
  { id: 'elements',          icon: <Layers className="w-4 h-4" />,          label: 'Network Elements'    },
  { id: 'all-properties',    icon: <Settings className="w-4 h-4" />,        label: 'All Properties'      },
  { id: 'connections',       icon: <Link2 className="w-4 h-4" />,           label: 'Connections'         },
  { id: 'flex-table',        icon: <Table2 className="w-4 h-4" />,          label: 'Flex Table'          },
  { id: 'excel',             icon: <FileSpreadsheet className="w-4 h-4" />, label: 'Excel Import/Export' },
  { id: 'simulation',        icon: <Play className="w-4 h-4" />,            label: 'Running Simulations' },
  { id: 'files',             icon: <FileText className="w-4 h-4" />,        label: 'INP & OUT Files'     },
  { id: 'shortcuts',         icon: <Keyboard className="w-4 h-4" />,        label: 'Keyboard Shortcuts'  },
  { id: 'troubleshooting',   icon: <HelpCircle className="w-4 h-4" />,      label: 'Troubleshooting'     },
];

// ─── PDF generation ───────────────────────────────────────────────────────────
function downloadPDF() {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const PW = 210;
  const PH = 297;
  const ML = 20;
  const MR = 20;
  const TW = PW - ML - MR;

  let pageNum = 1;

  function newPage() {
    doc.addPage();
    pageNum++;
    addPageNumber();
  }

  function addPageNumber() {
    if (pageNum < 3) return;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(`${pageNum - 2}`, PW / 2, PH - 10, { align: 'center' });
    doc.text('WHAMO Network Designer — User Manual', ML, PH - 10);
    doc.setTextColor(0, 0, 0);
  }

  function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
    doc.setFontSize(fontSize);
    return doc.splitTextToSize(text, maxWidth);
  }

  function writeLines(lines: string[], x: number, startY: number, fontSize: number, color: [number, number, number] = [60, 60, 60]): number {
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    const lineH = fontSize * 0.45;
    let y = startY;
    for (const line of lines) {
      if (y > PH - 25) { newPage(); y = 30; }
      doc.text(line, x, y);
      y += lineH;
    }
    return y;
  }

  function sectionHeading(title: string, y: number): number {
    if (y > PH - 40) { newPage(); y = 30; }
    doc.setFillColor(26, 115, 232);
    doc.rect(ML, y - 5, TW, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text(title, ML + 3, y + 1.5);
    doc.setTextColor(0, 0, 0);
    return y + 12;
  }

  function subHeading(title: string, y: number): number {
    if (y > PH - 35) { newPage(); y = 30; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(title, ML, y);
    doc.setDrawColor(26, 115, 232);
    doc.line(ML, y + 1.5, ML + doc.getTextWidth(title), y + 1.5);
    doc.setTextColor(60, 60, 60);
    return y + 7;
  }

  function miniHeading(title: string, y: number): number {
    if (y > PH - 25) { newPage(); y = 30; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(50, 80, 130);
    doc.text(title, ML, y);
    doc.setTextColor(60, 60, 60);
    return y + 5.5;
  }

  function para(text: string, y: number, bold = false): number {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    const lines = wrapText(text, TW, 10);
    return writeLines(lines, ML, y, 10) + 3;
  }

  function noteBox(text: string, y: number, warn = false): number {
    if (y > PH - 30) { newPage(); y = 30; }
    const lines = wrapText(text, TW - 8, 9.5);
    const boxH = lines.length * 4.3 + 5;
    doc.setFillColor(warn ? 255 : 235, warn ? 251 : 245, warn ? 205 : 254);
    doc.setDrawColor(warn ? 217 : 26, warn ? 119 : 115, warn ? 6 : 232);
    doc.roundedRect(ML, y, TW, boxH, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(warn ? 120 : 26, warn ? 60 : 70, warn ? 6 : 150);
    doc.text(warn ? '⚠  Warning' : 'ℹ  Info', ML + 3, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    let ly = y + 8;
    for (const l of lines) { doc.text(l, ML + 3, ly); ly += 4.3; }
    return y + boxH + 4;
  }

  function stepList(steps: string[], y: number): number {
    for (let i = 0; i < steps.length; i++) {
      if (y > PH - 25) { newPage(); y = 30; }
      doc.setFillColor(26, 115, 232);
      doc.circle(ML + 2.5, y - 1.5, 2.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(String(i + 1), ML + 2.5, y - 0.5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      const lines = doc.splitTextToSize(steps[i], TW - 8);
      doc.text(lines, ML + 7, y);
      y += lines.length * 4.5 + 1.5;
    }
    return y + 2;
  }

  function bulletList(items: string[], y: number): number {
    for (const item of items) {
      if (y > PH - 20) { newPage(); y = 30; }
      doc.setFillColor(26, 115, 232);
      doc.circle(ML + 1.5, y - 1, 1.2, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      const lines = doc.splitTextToSize(item, TW - 6);
      doc.text(lines, ML + 5, y);
      y += lines.length * 4.5 + 1;
    }
    return y + 2;
  }

  function elementCard(name: string, desc: string, fields: string[], y: number): number {
    if (y > PH - 40) { newPage(); y = 30; }
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(200, 210, 220);
    const descLines = doc.splitTextToSize(desc, TW - 6);
    const fieldText = fields.join('  ·  ');
    const fieldLines = doc.splitTextToSize(fieldText, TW - 6);
    const boxH = 7 + descLines.length * 4.5 + (fields.length ? fieldLines.length * 4 + 4 : 0);
    doc.roundedRect(ML, y, TW, boxH, 2, 2, 'FD');
    doc.setFillColor(26, 115, 232);
    doc.roundedRect(ML + 2, y + 2, doc.getStringUnitWidth(name) * 10 * 0.352 + 4, 5, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(name, ML + 4, y + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(60, 60, 60);
    let ly = y + 10;
    for (const l of descLines) { doc.text(l, ML + 3, ly); ly += 4.5; }
    if (fields.length) {
      doc.setFontSize(8.5);
      doc.setTextColor(100, 120, 140);
      for (const l of fieldLines) { doc.text(l, ML + 3, ly); ly += 4; }
    }
    return y + boxH + 3;
  }

  function propTable(rows: Array<[string, string]>, y: number): number {
    if (y > PH - 40) { newPage(); y = 30; }
    for (const [k, v] of rows) {
      if (y > PH - 18) { newPage(); y = 30; }
      const vLines = doc.splitTextToSize(v, TW - 55);
      const rowH = vLines.length * 4.2 + 4;
      doc.setFillColor(245, 248, 252);
      doc.setDrawColor(220, 228, 238);
      doc.roundedRect(ML, y, 50, rowH, 1, 1, 'FD');
      doc.roundedRect(ML + 52, y, TW - 52, rowH, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(26, 60, 130);
      doc.text(k, ML + 2, y + rowH / 2 + 1);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      let vy = y + 3.5;
      for (const l of vLines) { doc.text(l, ML + 54, vy); vy += 4.2; }
      y += rowH + 1.5;
    }
    return y + 2;
  }

  function kbTable(rows: Array<[string[], string]>, y: number): number {
    const colW = [70, TW - 70];
    if (y > PH - 40) { newPage(); y = 30; }
    doc.setFillColor(241, 245, 249);
    doc.rect(ML, y - 4, TW, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(80, 100, 120);
    doc.text('Shortcut', ML + 2, y);
    doc.text('Action', ML + colW[0] + 2, y);
    y += 4;
    for (const [keys, action] of rows) {
      if (y > PH - 20) { newPage(); y = 30; }
      doc.setDrawColor(230, 235, 240);
      doc.line(ML, y, ML + TW, y);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(50, 70, 100);
      doc.text(keys.join(' + '), ML + 2, y + 4);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.text(action, ML + colW[0] + 2, y + 4);
      y += 7;
    }
    return y + 4;
  }

  // ── COVER PAGE ─────────────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, PW, PH, 'F');

  doc.setFillColor(26, 115, 232);
  doc.rect(0, PH * 0.42, PW, 55, 'F');

  doc.setFillColor(26, 115, 232);
  doc.rect(0, 0, PW, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(36);
  doc.setTextColor(255, 255, 255);
  doc.text('WHAMO', PW / 2, 70, { align: 'center' });

  doc.setFontSize(22);
  doc.setTextColor(147, 197, 253);
  doc.text('Network Designer', PW / 2, 84, { align: 'center' });

  doc.setFontSize(13);
  doc.setTextColor(200, 220, 255);
  doc.text('User Manual', PW / 2, 95, { align: 'center' });

  doc.setDrawColor(26, 115, 232);
  doc.setLineWidth(0.5);
  doc.line(ML, 103, PW - ML, 103);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(148, 163, 184);
  doc.text('Hydraulic Transient Analysis Tool', PW / 2, 112, { align: 'center' });
  doc.text('Water Hammer & Mass Oscillation', PW / 2, 120, { align: 'center' });

  doc.setFillColor(30, 41, 59);
  doc.roundedRect(PW / 2 - 40, 135, 80, 24, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(26, 115, 232);
  doc.text('VERSION 1.0', PW / 2, 145, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }), PW / 2, 153, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('Complete Reference Guide', PW / 2, PH * 0.42 + 14, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(200, 220, 255);
  const coverTopics = [
    'Network Elements  ·  All Properties  ·  Connections  ·  Simulations',
    'Excel Import/Export  ·  INP/OUT Files  ·  Keyboard Shortcuts',
  ];
  let cy = PH * 0.42 + 23;
  for (const t of coverTopics) { doc.text(t, PW / 2, cy, { align: 'center' }); cy += 7; }

  doc.setFontSize(8);
  doc.setTextColor(100, 120, 150);
  doc.text('WHAMO Network Designer  ·  All rights reserved', PW / 2, PH - 12, { align: 'center' });

  // ── TABLE OF CONTENTS ──────────────────────────────────────────────────────
  newPage();
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, PW, PH, 'F');

  doc.setFillColor(26, 115, 232);
  doc.rect(0, 0, PW, 14, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('TABLE OF CONTENTS', ML, 9.5);

  const tocItems = [
    ['01', 'Getting Started',      'Creating a project, opening, saving, undo/redo'],
    ['02', 'Network Elements',     'Reservoir, Node, Junction, Surge Tank, Flow BC, Pump, Check Valve, Turbine, Conduit, Dummy Pipe'],
    ['03', 'All Properties',       'Full property reference for every element — name, unit, description, meaning, how to use'],
    ['04', 'Connections',          'Drawing conduits, pump/valve/turbine links, connection rules, valid/invalid combinations'],
    ['05', 'Flex Table',           'Spreadsheet editor, filters, units, T/H schedules, material'],
    ['06', 'Excel Import/Export',  'Single-tab and multi-sheet workbook workflows'],
    ['07', 'Running Simulations',  'Parameters, output requests, generating .OUT files'],
    ['08', 'INP & OUT Files',      'Generating .INP, viewing .OUT, visualization tool'],
    ['09', 'Keyboard Shortcuts',   'Canvas, Flex Table, and ReactFlow control shortcuts'],
    ['10', 'Troubleshooting',      'Common issues and solutions'],
  ];

  let ty = 28;
  for (const [num, title, desc] of tocItems) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(220, 228, 238);
    doc.roundedRect(ML, ty, TW, 16, 2, 2, 'FD');
    doc.setFillColor(26, 115, 232);
    doc.roundedRect(ML + 2, ty + 2, 10, 12, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(num, ML + 7, ty + 9.5, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(20, 30, 50);
    doc.text(title, ML + 16, ty + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 115, 135);
    const descL = doc.splitTextToSize(desc, TW - 20);
    doc.text(descL[0], ML + 16, ty + 11.5);
    ty += 20;
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(150, 160, 175);
  doc.text('This document was generated automatically from the WHAMO Network Designer help system.', ML, PH - 14);

  // ── SECTION 1: GETTING STARTED ─────────────────────────────────────────────
  newPage();
  let y = sectionHeading('1.  Getting Started', 22);
  y = para('WHAMO Network Designer lets you visually build water distribution networks and export them for hydraulic simulation using the WHAMO engine.', y);
  y += 2;
  y = subHeading('Creating a New Project', y);
  y = stepList([
    'Click New in the title bar to create a blank project.',
    'Enter a project name in the centre field of the title bar.',
    'Add elements using the INSERT ribbon (Reservoir, Node, Junction, etc.).',
    'Connect elements by hovering a node until the green handle appears, then dragging to another node.',
    'Click Save As to persist the project to the server.',
  ], y);
  y = subHeading('Opening an Existing Project', y);
  y = stepList([
    'Click Open in the title bar.',
    'Select a project from the Projects list panel.',
    'The canvas, properties, and all settings are restored automatically.',
  ], y);
  y = subHeading('Saving', y);
  y = para('Use Save to overwrite the current project, or Save As to create a new revision. Projects are stored on the server and remain available after logging out.', y);
  y = noteBox('All element property changes are tracked with Undo/Redo (up to 50 steps). Use Ctrl+Z and Ctrl+Y to navigate the history.', y);

  // ── SECTION 2: NETWORK ELEMENTS (DETAILED) ─────────────────────────────────
  newPage();
  y = sectionHeading('2.  Network Elements', 22);
  y = para('Each element in WHAMO represents a physical hydraulic component. Click any INSERT ribbon button to place an element on the canvas. Below is comprehensive documentation for every supported element type.', y);
  y += 2;

  // RESERVOIR
  y = subHeading('Reservoir', y);
  y = para('A Reservoir is a fixed or schedule-driven hydraulic boundary condition that provides a constant or time-varying hydraulic head (water surface elevation) to the network. It acts as the primary driving force in most WHAMO simulations.', y);
  y = miniHeading('Purpose & When to Use', y);
  y = bulletList([
    'Use at the upstream or downstream end of a pipeline system where the head is known or prescribed.',
    'Represents large storage tanks, impoundments, lakes, or any boundary where head is controlled.',
    'Required: every valid WHAMO network must have at least one Reservoir.',
  ], y);
  y = miniHeading('How to Add', y);
  y = stepList([
    'Click the Reservoir button in the INSERT ribbon.',
    'A Reservoir node is placed on the canvas.',
    'Click the node to select it, then edit properties in the Properties Panel on the right.',
    'Connect it to Nodes or Junctions using conduits.',
  ], y);
  y = miniHeading('Properties', y);
  y = propTable([
    ['Label', 'Unique identifier for this element (required, case-sensitive).'],
    ['Elevation (m/ft)', 'Head of the reservoir boundary. In Fixed mode this is the constant head; in Schedule mode it is the initial head.'],
    ['Mode', 'Fixed: constant head throughout simulation. Schedule: head varies per the H-Schedule pairs.'],
    ['H-Schedule #', 'References a time/head schedule (T-H pairs). Only active when Mode = Schedule.'],
    ['Loss Coefficient', 'Minor loss coefficient at the reservoir connection (typically 0.5 for a sharp-edged inlet).'],
  ], y);
  y = noteBox('Validation rule: A Reservoir must be connected to at least one conduit. An isolated Reservoir will cause a validation error.', y, true);

  // NODE
  y = subHeading('Node', y);
  y = para('A Node is the basic junction point in a WHAMO network. It represents a location in the piping system where pipes meet, but where no special boundary condition or demand exists. Nodes are the simplest connection element.', y);
  y = miniHeading('Purpose & When to Use', y);
  y = bulletList([
    'Use wherever two or more conduits join without a demand flow or special behaviour.',
    'Ideal for pipe tee junctions that are purely topological (no off-take demand).',
    'Can also be used as intermediate points along a long pipeline to divide it into computational segments.',
  ], y);
  y = miniHeading('Properties', y);
  y = propTable([
    ['Label', 'Unique identifier for this element (required).'],
    ['Elevation (m/ft)', 'Elevation of the node. Used for pressure and HGL calculations.'],
    ['Node Number', 'Auto-assigned internal WHAMO node number. Editable if required to match a specific WHAMO input convention.'],
  ], y);
  y = noteBox('Nodes must have at least one conduit connection to be valid. Isolated nodes are flagged during validation.', y, true);

  // JUNCTION
  y = subHeading('Junction', y);
  y = para('A Junction is a demand junction that allows lateral off-take (consumption) flows. It behaves like a Node but also supports a specified demand flow rate that is extracted from the network at that location.', y);
  y = miniHeading('Purpose & When to Use', y);
  y = bulletList([
    'Use wherever a customer demand, off-take, or consumer draw is modelled.',
    'Use for tee junctions where a side branch carries a known demand flow.',
    'The demand may be zero, making Junction functionally identical to Node.',
  ], y);
  y = miniHeading('Properties', y);
  y = propTable([
    ['Label', 'Unique identifier (required).'],
    ['Elevation', 'Node elevation for HGL and pressure calculations.'],
    ['Demand (m³/s or ft³/s)', 'Steady-state demand flow extracted at this junction. Positive value = extraction from network.'],
  ], y);
  y = noteBox('Demand is applied as a constant off-take. For time-varying demands, use a Flow BC element instead.', y);

  // SURGE TANK
  y = subHeading('Surge Tank', y);
  y = para('A Surge Tank is an open or closed pressure vessel connected to the pipeline to suppress water hammer (hydraulic transients). It absorbs and releases flow to moderate pressure fluctuations and protect the system from extreme pressure events.', y);
  y = miniHeading('Purpose & When to Use', y);
  y = bulletList([
    'Install on the upstream side of a pump station or downstream of a valve to suppress transient pressures.',
    'Use an open tank when the water surface vents to atmosphere.',
    'Use a closed (air vessel) tank to provide a pressurised cushion — configure using E/A (elevation/area) pairs.',
    'Recommended wherever significant water hammer risk exists (fast valve closure, pump trip, etc.).',
  ], y);
  y = miniHeading('Properties', y);
  y = propTable([
    ['Label', 'Unique identifier (required).'],
    ['Tank Top', 'Maximum water level elevation the tank can reach before overflowing.'],
    ['Tank Bottom', 'Minimum water level (empty tank). Simulation warns if level drops below this.'],
    ['Initial Water Level', 'Water surface elevation at the start of the simulation (t = 0).'],
    ['Riser Diameter', 'Diameter of the connection pipe between the tank and the main pipeline.'],
    ['Area / Shape (E/A pairs)', 'For closed (non-prismatic) tanks: elevation-area pairs defining the tank cross-section shape.'],
  ], y);
  y = noteBox('Surge tanks are modelled as infinite-celerity elements internally. Do not set celerity on surge tank conduit connections — this is handled automatically.', y);
  y = noteBox('Validation: Tank Bottom must be less than Tank Top. Initial Water Level must be between Tank Bottom and Tank Top.', y, true);

  // FLOW BC
  y = subHeading('Flow Boundary (Flow BC)', y);
  y = para('A Flow Boundary Condition (Flow BC) injects or extracts a prescribed flow rate at a specific point in the network. It acts as a source or sink of flow, either at a constant rate or following a time-varying schedule.', y);
  y = miniHeading('Purpose & When to Use', y);
  y = bulletList([
    'Use to model pumped inflow from an external source not represented by a pump element.',
    'Use to model controlled extraction (e.g., irrigation offtake) that varies with time.',
    'Ideal for simulating demand fluctuations, operational scenarios, or emergency shut-offs.',
    'Can represent any controlled flow injection or withdrawal point.',
  ], y);
  y = miniHeading('Properties', y);
  y = propTable([
    ['Label', 'Unique identifier (required).'],
    ['Flow Rate (Q)', 'The prescribed flow rate (m³/s or ft³/s). Positive = injection into system; negative = extraction.'],
    ['Mode', 'Fixed: constant flow rate. Schedule: flow varies according to Q-Schedule pairs.'],
    ['Q-Schedule #', 'References a time/flow schedule. Active only when Mode = Schedule.'],
  ], y);
  y = noteBox('Unlike a Reservoir (which prescribes head), a Flow BC prescribes flow. Do not confuse the two — using the wrong boundary type will give incorrect simulation results.', y, true);

  // PUMP
  y = subHeading('Pump', y);
  y = para('A Pump is a link element placed on a conduit between two nodes to represent a mechanical pump. The pump adds energy to the flow and is characterised by a pump curve (P-Char) that defines the relationship between flow rate (Q) and head rise (H).', y);
  y = miniHeading('Purpose & When to Use', y);
  y = bulletList([
    'Use to model any centrifugal or axial-flow pump in the system.',
    'Pumps are link elements — they must be placed ON a conduit, not at a standalone node.',
    'Critical for simulating pump start-up, shut-down, and trip transients.',
    'Multiple pumps can be modelled in series or parallel by placing them on separate conduits.',
  ], y);
  y = miniHeading('How to Add', y);
  y = stepList([
    'Click the Pump button in the INSERT ribbon to activate pump link-drawing mode (button turns blue).',
    'Click and drag from a source node to a target node to create the pump conduit.',
    'Click the pump conduit to open its properties and enter the P-Char curve data.',
    'Click the Pump button again to exit link-drawing mode.',
  ], y);
  y = miniHeading('Properties', y);
  y = propTable([
    ['Label', 'Unique identifier for the pump (required).'],
    ['Speed Ratio', 'Ratio of operating speed to rated speed (1.0 = full speed). Useful for variable-speed pumps.'],
    ['Status (ON/OFF)', 'Initial operating status of the pump at t = 0.'],
    ['P-Char Data', 'Pump characteristic curve: Q-H pairs defining the pump curve from shut-off head to maximum flow.'],
  ], y);
  y = noteBox('The pump curve (P-Char) must cover the expected operating range of Q. Extrapolation beyond the curve ends may cause simulation instability.', y, true);

  // CHECK VALVE
  y = subHeading('Check Valve', y);
  y = para('A Check Valve is a link element that permits flow in only one direction (forward). When flow attempts to reverse, the check valve closes instantly, preventing backflow. It is used to protect system components from reverse flow conditions.', y);
  y = miniHeading('Purpose & When to Use', y);
  y = bulletList([
    'Install on pump discharge lines to prevent backflow during pump trip or shutdown.',
    'Use to prevent siphoning in elevated pipeline sections.',
    'Protects upstream equipment from reverse-flow damage.',
    'WHAMO models check valve closure as instantaneous — this can itself induce a pressure transient.',
  ], y);
  y = miniHeading('Properties', y);
  y = propTable([
    ['Label', 'Unique identifier (required).'],
    ['Loss Coefficient', 'Minor loss coefficient (K) for the valve when open. Accounts for the pressure drop through the valve body.'],
  ], y);
  y = noteBox('Check valves close instantaneously in WHAMO. For systems sensitive to this, consider adding a surge tank near the valve to absorb the resulting pressure wave.', y, true);
  y = noteBox('Connection rule: Check Valve must be placed on a conduit between two nodes (Node, Junction, or Reservoir). It cannot connect two Reservoirs directly.', y);

  // TURBINE
  y = subHeading('Turbine', y);
  y = para('A Turbine is a link element that represents a hydraulic turbine (e.g., Francis, Pelton, Kaplan). Flow passes through the turbine and energy is extracted. WHAMO supports turbine governor (TURBGOV) and emergency closure modes for transient analysis.', y);
  y = miniHeading('Purpose & When to Use', y);
  y = bulletList([
    'Use to model hydroelectric turbines and their load-rejection or emergency shutdown transients.',
    'TURBGOV mode: the turbine governor controls gate position to maintain speed/load.',
    'EMERGENCY mode: simulates emergency closure (e.g., full gate closure on load rejection).',
    'Use with surge tanks and pressure relief valves in hydroelectric system transient studies.',
  ], y);
  y = miniHeading('Properties', y);
  y = propTable([
    ['Label', 'Unique identifier (required).'],
    ['Mode', 'TURBGOV (governor-controlled) or EMERGENCY (scheduled gate closure).'],
    ['Gate Schedule (V-Schedule)', 'Time/gate-position pairs defining how the turbine gate closes or opens over time.'],
    ['Speed', 'Rated rotational speed of the turbine (rpm).'],
    ['Inertia', 'Combined moment of inertia of turbine and generator (kg·m²). Affects speed transient response.'],
  ], y);
  y = noteBox('Turbines require a complete gate schedule for EMERGENCY mode. Incomplete or missing schedule data will cause the simulation to abort.', y, true);

  // CONDUIT & DUMMY PIPE
  y = subHeading('Conduit (Pipe)', y);
  y = para('A Conduit is the fundamental flow-carrying element in WHAMO. Every pair of connected nodes is linked by a conduit, which represents a pipe section with defined hydraulic properties. The conduit carries both steady-state and transient flow between elements.', y);
  y = miniHeading('Purpose & When to Use', y);
  y = bulletList([
    'Every connection between two network elements in WHAMO is a conduit.',
    'Set pipe length, diameter, wave speed (celerity), and friction factor accurately for correct transient modelling.',
    'The Courant condition (DTCOMP × a / L ≤ 1) must be satisfied for numerical stability.',
  ], y);
  y = miniHeading('Properties', y);
  y = propTable([
    ['Length (L)', 'Physical pipe length in metres (SI) or feet (FPS). Must be > 0.'],
    ['Diameter (D)', 'Internal pipe diameter in m or ft. Must be > 0.'],
    ['Celerity (a)', 'Pressure-wave speed in m/s or ft/s. Typically 800–1400 m/s for steel pipes.'],
    ['Friction (f)', "Darcy-Weisbach friction factor, or Manning's n if Manning's formula is selected."],
    ['Pipe Material', "Selecting a material auto-fills Manning's n, Young's Modulus (E), and computes wave speed."],
    ['Has Added Loss', 'Enables a minor-loss coefficient (K) for fittings, bends, or special features on this conduit.'],
  ], y);
  y = noteBox('Courant condition: DTCOMP × celerity / Length must be ≤ 1.0. If violated, WHAMO will produce incorrect results or fail to converge.', y, true);

  y = subHeading('Dummy Pipe', y);
  y = para('A Dummy Pipe is a special conduit with zero (or negligible) resistance used to connect elements that are physically very close together, or to model instantaneous connections such as the junction of two tanks.', y);
  y = miniHeading('Purpose & When to Use', y);
  y = bulletList([
    'Use to connect a Surge Tank to the main pipeline when the riser length is negligible.',
    'Use to split a conduit into segments without adding physical pipe resistance.',
    'Dummy Pipes should not carry meaningful head loss — they are topological connectors only.',
  ], y);
  y = propTable([
    ['Length (L)', 'Typically set to a very small value (e.g., 0.001 m). WHAMO treats it as zero resistance.'],
    ['Diameter (D)', 'Should match the connecting pipe diameter for continuity.'],
    ['Celerity (a)', 'Set to a high value (e.g., 9999 m/s) to represent rigid-column behaviour.'],
  ], y);

  // ── SECTION 3: ALL PROPERTIES ──────────────────────────────────────────────
  newPage();
  y = sectionHeading('3.  All Properties', 22);
  y = para('Complete property reference for every element type. Each property lists its name, unit, description, meaning in the context of WHAMO simulation, and guidance on how to set the correct value.', y);
  y += 2;

  for (const ep of ALL_ELEMENT_PROPS) {
    y = subHeading(ep.element, y);
    const epRows: Array<[string, string]> = ep.properties.map(p => [
      p.unit ? `${p.name}\n(${p.unit})` : p.name,
      `${p.description} — ${p.meaning} ${p.howToUse}`,
    ]);
    y = propTable(epRows, y);
    y += 2;
  }

  // ── SECTION 4: CONNECTIONS (DETAILED) ──────────────────────────────────────
  newPage();
  y = sectionHeading('4.  Connections', 22);
  y = para('Every pair of connected elements in WHAMO is linked by a conduit. Connections define the network topology and control how flow and pressure waves propagate through the system. This section covers all supported connection types, their rules, and best practices.', y);
  y += 2;

  y = subHeading('Standard Conduit Connection', y);
  y = para('A standard conduit is a regular pipe linking two network nodes. It is the most common connection type and carries both steady-state and transient flow.', y);
  y = miniHeading('How to Draw', y);
  y = stepList([
    'Hover over a source element until the green connection handle appears on its edge.',
    'Click and drag from the handle to the target element.',
    'Release the mouse over the target — a conduit is created automatically.',
    'Select the conduit in the Flex Table (Conduit tab) to set its hydraulic properties.',
  ], y);
  y = miniHeading('Valid Connections', y);
  y = bulletList([
    'Reservoir → Node, Junction, Surge Tank, Flow BC',
    'Node → Node, Junction, Reservoir, Surge Tank, Flow BC',
    'Junction → Node, Junction, Reservoir, Surge Tank',
    'Surge Tank → Node, Junction (via riser conduit or dummy pipe)',
  ], y);
  y = miniHeading('Invalid Connections', y);
  y = bulletList([
    'Reservoir → Reservoir directly (two boundary conditions cannot be directly connected — add a Node in between).',
    'Self-loop: connecting an element to itself.',
    'Connecting two elements with a conduit that has zero length or diameter in production networks.',
  ], y);
  y = noteBox('Every conduit must have non-zero Length, Diameter, and Celerity before running a simulation. Missing values will cause a validation error.', y, true);

  y = subHeading('Pump Link', y);
  y = para('A Pump Link is a conduit with a Pump element embedded in it. The pump adds energy to the flow according to its characteristic curve (P-Char). Pump links are used to model all types of centrifugal and axial-flow pumps.', y);
  y = miniHeading('How to Draw', y);
  y = stepList([
    'Click the Pump button in the INSERT ribbon to activate pump link-drawing mode.',
    'Drag from a source node (e.g., reservoir, sump) to a target node (e.g., downstream pipe junction).',
    'The connection is created as a conduit with the Pump type set.',
    'Click the Pump button again to deactivate link-drawing mode.',
  ], y);
  y = miniHeading('Connection Rules', y);
  y = bulletList([
    'Pump must connect two nodes (Node, Junction, or Reservoir). It cannot connect to a Surge Tank directly.',
    'Flow direction is from source to target (draw in the direction of pump flow).',
    'Multiple pumps in series: connect them through intermediate nodes.',
    'Multiple pumps in parallel: draw separate pump conduits between the same two nodes.',
  ], y);
  y = miniHeading('Required Properties', y);
  y = propTable([
    ['P-Char Curve', 'Q-H data pairs defining the pump characteristic. Required — simulation fails without it.'],
    ['Speed Ratio', 'Ratio of operating to rated speed. Default = 1.0 (full speed).'],
    ['Initial Status', 'ON or OFF at t = 0.'],
    ['Conduit Properties', 'Length, diameter, celerity still required for the conduit carrying the pump.'],
  ], y);
  y = noteBox('The pump curve must cover the full range of expected operating Q. If Q goes outside the curve range during a transient, results may be inaccurate.', y, true);

  y = subHeading('Check Valve Link', y);
  y = para('A Check Valve Link is a conduit that only allows forward flow. When flow velocity drops to zero or would reverse, the check valve closes instantaneously. This protects pumps and other equipment from backflow.', y);
  y = miniHeading('How to Draw', y);
  y = stepList([
    'Click the Check Valve button in the INSERT ribbon to activate check valve link mode.',
    'Drag from the source node (upstream) to the target node (downstream).',
    'The connection is created with the Check Valve type set — forward direction is source to target.',
    'Click the Check Valve button again to deactivate link mode.',
  ], y);
  y = miniHeading('Connection Rules', y);
  y = bulletList([
    'Check Valve connects two nodes (Node, Junction). Reservoir-to-Reservoir is not allowed.',
    'Direction is fixed at draw time: source → target is the allowed flow direction.',
    'Cannot be placed between a Reservoir and another Reservoir.',
    'Can be placed immediately downstream of a pump to prevent reverse flow on pump trip.',
  ], y);
  y = noteBox('Check valve closure is instantaneous in WHAMO. This can generate a severe pressure wave. Place surge protection (surge tank or air vessel) nearby if needed.', y, true);
  y = noteBox('Common mistake: drawing the check valve in the wrong direction. Verify source and target carefully — reversing the direction will block all forward flow.', y, true);

  y = subHeading('Turbine Link', y);
  y = para('A Turbine Link is a conduit with a Turbine element that extracts energy from the flow. Used in hydroelectric systems to model generator units and their transient behaviour during load rejection or emergency shutdown.', y);
  y = miniHeading('How to Draw', y);
  y = stepList([
    'Click the Turbine button in the INSERT ribbon to activate turbine link mode.',
    'Drag from the upstream node (high-head end) to the downstream node (tailrace).',
    'The connection is created with the Turbine type set.',
    'Set Mode, Gate Schedule, Speed, and Inertia in the Flex Table.',
  ], y);
  y = miniHeading('Connection Rules', y);
  y = bulletList([
    'Turbine must connect two nodes. Upstream node typically connects to a penstock conduit from a Reservoir.',
    'Downstream node connects to the tailrace (often another Reservoir or Node at low elevation).',
    'Gate schedule (V-Schedule) must be defined for EMERGENCY mode simulations.',
  ], y);
  y = noteBox('For hydroelectric systems, always include a surge tank on the penstock near the turbine. Without it, load rejection transients can produce extreme over-pressures.', y, true);

  y = subHeading('Reservoir Connections', y);
  y = para('A Reservoir connects to the network via one or more standard conduits. It provides the head boundary condition at its connection point.', y);
  y = bulletList([
    'A Reservoir can connect to: Node, Junction, Surge Tank (via conduit), Flow BC.',
    'Two Reservoirs cannot be directly connected — place a Node between them.',
    'Multiple conduits can connect to a single Reservoir (e.g., a storage tank serving multiple branches).',
    'The Reservoir\'s loss coefficient applies to all conduits connecting to it.',
  ], y);
  y = noteBox('At least one Reservoir must exist in the network. WHAMO requires a head boundary to solve the steady-state system before running the transient.', y, true);

  y = subHeading('Surge Tank Connections', y);
  y = para('A Surge Tank connects to the main pipeline via a conduit (usually a short riser pipe or dummy pipe). It acts as an open or closed side-branch vessel.', y);
  y = bulletList([
    'Surge Tank connects to: Node or Junction. It cannot connect to a Reservoir directly.',
    'The riser conduit (from main pipe to tank base) must have a diameter set — this is the riser diameter.',
    'For very short risers, use a Dummy Pipe connection to minimise computational issues.',
    'Only one conduit should connect to a Surge Tank (it is a side-branch, not a through-flow element).',
  ], y);
  y = noteBox('Attempting to connect a Surge Tank to two pipeline nodes (as a through-element) is an invalid configuration and will fail validation.', y, true);

  y = subHeading('Flow BC Connections', y);
  y = para('A Flow BC connects to the network via a single conduit and injects or extracts flow at that point.', y);
  y = bulletList([
    'Flow BC connects to: Node or Junction. Typically only one connection per Flow BC.',
    'Positive Q injects flow into the network; negative Q extracts flow.',
    'Flow BC can be used as an alternative to a Reservoir where the flow (not head) is the known boundary.',
  ], y);

  // ── SECTION 5: FLEX TABLE ──────────────────────────────────────────────────
  newPage();
  y = sectionHeading('5.  Flex Table', 22);
  y = para('The Flex Table gives you a spreadsheet-like view of every element in the network. Open it from Tools → Flex Table in the ribbon.', y);
  y += 2;
  y = subHeading('Tab Filters', y);
  y = para('Use the filter chips at the top to switch between: All, Conduit, Dummy Pipe, Reservoir, Node, Junction, Surge Tank, Flow BC, Pump, Check Valve, and Turbine.', y);
  y = subHeading('Editing Cells', y);
  y = para('Click any white cell to edit it inline. Grey background cells are read-only for that element type. Press Tab or Enter to commit; Escape cancels.', y);
  y = subHeading('Unit System', y);
  y = para('The SI / FPS toggle controls the global display unit. Individual rows can override this via the Unit column — an amber border indicates a per-element override.', y);
  y = subHeading('T/H and Q Schedule Pairs', y);
  y = para('For reservoirs with H-Schedule mode, or flow boundaries with Q-Schedule mode, click the Edit Pairs button in that row to open the pairs editor. Enter time/value pairs to define the schedule.', y);
  y = subHeading('Pipe Material (Conduit Tab)', y);
  y = para("Selecting a material in the Material column auto-fills Manning's n, Pipe Elastic Modulus (E), and recalculates wave speed for all conduits or just the selected row, depending on the Apply Material to All Conduits checkbox.", y);
  y = noteBox('Clicking a row in the Flex Table selects the corresponding element on the canvas (and vice versa), keeping both views in sync.', y);

  // ── SECTION 6: EXCEL IMPORT/EXPORT ─────────────────────────────────────────
  newPage();
  y = sectionHeading('6.  Excel Import / Export', 22);
  y = para('The Flex Table supports lossless round-trip Excel synchronization. Export a workbook, edit values in Excel, and import back — all element data is preserved.', y);
  y += 2;
  y = subHeading('Exporting a Single Element Type', y);
  y = stepList([
    'Open the Flex Table (Tools → Flex Table).',
    'Select the desired element type tab (e.g. Conduit).',
    'Click the Export Excel button in the top-right of the tab bar.',
    'An .xlsx file named whamo_conduit_YYYY-MM-DD.xlsx is downloaded.',
  ], y);
  y = subHeading('Exporting All Element Types (Multi-Sheet)', y);
  y = stepList([
    'Open the Flex Table and stay on the All tab.',
    'Click Export Excel — a multi-sheet workbook is created.',
    'Each element type with data gets its own clearly labelled sheet.',
    'The workbook is named whamo_all_<ProjectName>_YYYY-MM-DD.xlsx.',
  ], y);
  y = subHeading('Importing from Excel', y);
  y = stepList([
    'Make sure your network already contains the elements you want to update.',
    'Select the matching tab in the Flex Table (or All for a multi-sheet file).',
    'Click Import Excel and select the .xlsx file.',
    'Each row is matched by its Label. Rows whose labels do not match an existing element are skipped.',
    'After a multi-sheet import, a summary dialog shows updated/skipped counts per sheet.',
  ], y);
  y = noteBox('Import only updates existing elements — it does not create new ones. Make sure all elements exist on the canvas before importing.', y, true);
  y = noteBox('The exported workbook includes Excel data-validation dropdowns for Pipe Material, Mode, and boolean toggles. These dropdowns are preserved on re-import.', y);

  // ── SECTION 7: RUNNING SIMULATIONS ─────────────────────────────────────────
  newPage();
  y = sectionHeading('7.  Running Simulations', 22);
  y = para('WHAMO Network Designer can run the WHAMO hydraulic transient engine directly. Configure parameters, specify output requests, then generate your results.', y);
  y += 2;
  y = subHeading('Computational Parameters', y);
  y = para('Click Analysis → Parameters to open the sidebar. Configure Time Stages by setting DTCOMP (computation step), DTOUT (output interval), and TMAX (maximum simulation time) for each stage.', y);
  y = subHeading('Output Requests', y);
  y = stepList([
    'Click Analysis → Configure to open the Output Requests panel.',
    'Select a node or element, or choose a group type (Nodes, Conduits, Elements).',
    'Tick the variables you want: Q, HEAD, ELEV, VEL, PRESS, PIEZHEAD (or Q, HEAD, SPEED, POWER for turbines).',
    'Click Add Request (or Add All for Group). History, Plot, and Spreadsheet request types are added simultaneously.',
    'Review the Current Requests list at the bottom.',
  ], y);
  y = subHeading('Generating the .OUT File', y);
  y = stepList([
    'Click Generate → .OUT in the ribbon.',
    'The network is validated. Fix any errors and try again.',
    'After validation, the WHAMO engine runs on the server and the .OUT file is generated.',
    'The result is displayed in the file preview panel — you can also send it to Visualization.',
  ], y);
  y = noteBox('The WHAMO engine requires Wine on Linux. It runs in an isolated temporary directory and cleans up after each run.', y);

  // ── SECTION 8: INP & OUT FILES ─────────────────────────────────────────────
  newPage();
  y = sectionHeading('8.  INP & OUT Files', 22);
  y = para('WHAMO uses two text-based file formats: the .INP input file and the .OUT output file. Both can be previewed, downloaded, and analysed within the Designer.', y);
  y += 2;
  y = subHeading('.INP File', y);
  y = para("The .INP file is the WHAMO input definition. It describes the network topology, element properties, computational parameters, and output requests in WHAMO's native format.", y);
  y = stepList([
    'Click Generate → .INP in the ribbon.',
    'The network is validated first. Resolve any errors shown.',
    "After validation, confirm the output requests in the Configure panel, then click Generate .INP.",
    'The file is downloaded to your computer.',
  ], y);
  y = subHeading('.OUT File', y);
  y = para('The .OUT file is produced by the WHAMO engine after a simulation run. It contains time-series results for all requested output variables.', y);
  y = subHeading('Viewing Results in Visualization', y);
  y = stepList([
    'Click Tools → Visualization in the ribbon.',
    'Load a .OUT file using the file picker inside the Visualization view.',
    'Switch between Profile Graph (animated HGL) and History Graph (time-series plots).',
  ], y);
  y = noteBox('The .OUT file parser runs entirely client-side — no server upload is needed to view results.', y);

  // ── SECTION 9: KEYBOARD SHORTCUTS ──────────────────────────────────────────
  newPage();
  y = sectionHeading('9.  Keyboard Shortcuts', 22);
  y = para('Use these shortcuts to speed up common actions while working in the canvas or Flex Table.', y);
  y += 2;
  y = subHeading('Canvas Shortcuts', y);
  y = kbTable([
    [['Ctrl', 'Z'], 'Undo last change'],
    [['Ctrl', 'Y'], 'Redo'],
    [['Ctrl', 'S'], 'Save project'],
    [['Delete'], 'Delete selected element(s)'],
    [['Escape'], 'Deselect / cancel link-drawing mode'],
    [['Ctrl', 'A'], 'Select all elements on canvas'],
    [['Ctrl', '+'], 'Zoom in'],
    [['Ctrl', '-'], 'Zoom out'],
    [['Ctrl', 'Shift', 'F'], 'Fit view to network'],
    [['Space'], 'Pan canvas (hold while dragging)'],
  ], y);
  y = subHeading('Flex Table Shortcuts', y);
  y = kbTable([
    [['Tab'], 'Move to next editable cell'],
    [['Shift', 'Tab'], 'Move to previous editable cell'],
    [['Enter'], 'Commit edit and move to next row'],
    [['Escape'], 'Cancel edit without saving'],
  ], y);
  y = subHeading('Canvas Controls (Mouse)', y);
  y = kbTable([
    [['Scroll Wheel'], 'Zoom in / out on canvas'],
    [['Click + Drag (background)'], 'Pan canvas'],
    [['Click + Drag (node)'], 'Move element'],
    [['Click (node)'], 'Select element, show Properties Panel'],
  ], y);

  // ── SECTION 10: TROUBLESHOOTING ────────────────────────────────────────────
  newPage();
  y = sectionHeading('10.  Troubleshooting', 22);
  y = para('Common issues and how to resolve them.', y);
  y += 2;
  const issues: Array<[string, string]> = [
    [
      'Validation fails with "No path from Reservoir to Node"',
      'Every node must be reachable from at least one Reservoir via conduits. Check the canvas for disconnected elements or broken conduit connections.',
    ],
    [
      'WHAMO engine returns an error or empty .OUT file',
      'Ensure all conduit lengths, diameters, and celerities are non-zero. Check that DTCOMP × celerity / length ≤ 1 (Courant condition). Review the error message in the preview panel for WHAMO-specific diagnostics.',
    ],
    [
      'Import Excel: all rows skipped',
      'The import matches rows by Label. Ensure the Label column in your Excel file matches exactly the element labels on the canvas (case-sensitive). Use Export Excel first to get the correct format.',
    ],
    [
      'Multi-sheet export shows empty workbook',
      'The All tab export only includes element types that have at least one element. Make sure your network has elements before exporting.',
    ],
    [
      'Canvas elements overlap after Auto-Arrange',
      'Auto-Arrange uses a tree layout and works best on networks with a clear flow direction. For complex looped networks, manually position elements after arranging.',
    ],
    [
      'Surge Tank celerity is very high or infinite',
      'Surge tanks are modelled as infinite-celerity elements in WHAMO. This is expected — do not adjust the celerity for surge tank connections.',
    ],
    [
      'Undo/Redo is not available',
      'Undo/Redo is only available when a project is open. Make sure you have opened or saved a project first.',
    ],
    [
      'Check Valve causes extreme pressure spike',
      'Check valve closure is instantaneous in WHAMO. Add a surge tank or air vessel near the check valve to absorb the resulting pressure wave.',
    ],
    [
      'Pump simulation fails on trip transient',
      'Ensure the P-Char curve spans from Q=0 (shut-off head) to the maximum expected flow. Also verify that a check valve is placed on the pump discharge to prevent reverse flow.',
    ],
    [
      'Reservoir connection gives unrealistic results',
      'Check that the Reservoir elevation is set correctly and that the Loss Coefficient is appropriate (0.5 for sharp-edged inlet, 0.0 for fully flush connection).',
    ],
    [
      'Turbine simulation aborts immediately',
      'In EMERGENCY mode, a Gate Schedule (V-Schedule) must be defined. Open the turbine properties in the Flex Table and add at least two time/gate-position pairs.',
    ],
  ];
  for (const [q, a] of issues) {
    if (y > PH - 40) { newPage(); y = 30; }
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(210, 220, 230);
    const qLines = doc.splitTextToSize(q, TW - 8);
    const aLines = doc.splitTextToSize(a, TW - 8);
    const boxH = qLines.length * 5 + aLines.length * 4.5 + 10;
    doc.roundedRect(ML, y, TW, boxH, 2, 2, 'FD');
    doc.setFillColor(26, 115, 232);
    doc.roundedRect(ML, y, TW, qLines.length * 5 + 4, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    let qy = y + 5;
    for (const l of qLines) { doc.text(l, ML + 3, qy); qy += 5; }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(50, 70, 90);
    let ay = y + qLines.length * 5 + 7;
    for (const l of aLines) { doc.text(l, ML + 3, ay); ay += 4.5; }
    y += boxH + 3;
  }

  // ── Add page numbers to all pages after TOC ────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 3; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(160, 170, 185);
    doc.text(`${p - 2}`, PW / 2, PH - 10, { align: 'center' });
    doc.text('WHAMO Network Designer — User Manual', ML, PH - 10);
    doc.text(`v1.0`, PW - MR, PH - 10, { align: 'right' });
    doc.setDrawColor(220, 230, 240);
    doc.setLineWidth(0.3);
    doc.line(ML, PH - 13, PW - MR, PH - 13);
  }

  doc.save('WHAMO_User_Manual.pdf');
}

// ─── UI helper components ─────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[18px] font-bold text-slate-900 mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
      {children}
    </h2>
  );
}

function SectionLead({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[13px] text-slate-500 mb-5 leading-relaxed" style={{ fontFamily: 'Poppins, sans-serif' }}>
      {children}
    </p>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[13px] font-bold text-slate-800 mt-5 mb-1.5" style={{ fontFamily: 'Poppins, sans-serif' }}>
      {children}
    </h3>
  );
}

function MiniHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[11px] font-bold text-blue-700 mt-3 mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
      {children}
    </h4>
  );
}

function Para({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[13px] text-slate-600 leading-relaxed mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
      {children}
    </p>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-3">
      <span className="text-blue-500 flex-shrink-0 mt-0.5">ℹ</span>
      <p className="text-[12px] text-blue-800 leading-relaxed" style={{ fontFamily: 'Poppins, sans-serif' }}>
        {children}
      </p>
    </div>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
      <span className="text-amber-500 flex-shrink-0 mt-0.5">⚠</span>
      <p className="text-[12px] text-amber-900 leading-relaxed" style={{ fontFamily: 'Poppins, sans-serif' }}>
        {children}
      </p>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-none space-y-1 mb-3">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500 mt-2" />
          <p className="text-[12px] text-slate-600 leading-relaxed" style={{ fontFamily: 'Poppins, sans-serif' }}>{item}</p>
        </li>
      ))}
    </ul>
  );
}

function PropTable({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden mb-3">
      {rows.map(([k, v], i) => (
        <div key={i} className={cn('grid grid-cols-[160px_1fr] text-[11px]', i % 2 === 0 ? 'bg-slate-50' : 'bg-white')}>
          <div className="px-2.5 py-2 font-bold text-blue-700 border-r border-slate-200" style={{ fontFamily: 'Poppins, sans-serif' }}>{k}</div>
          <div className="px-2.5 py-2 text-slate-600" style={{ fontFamily: 'Poppins, sans-serif' }}>{v}</div>
        </div>
      ))}
    </div>
  );
}

function ElementCard({ name, badge, desc, fields }: { name: string; badge: string; desc: string; fields?: string[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white mb-3 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200">
        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', badge)}>{name}</span>
        <p className="text-[12px] text-slate-600" style={{ fontFamily: 'Poppins, sans-serif' }}>{desc}</p>
      </div>
      {fields && fields.length > 0 && (
        <div className="px-3 py-2 flex flex-wrap gap-1.5">
          {fields.map(f => (
            <span key={f} className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">{f}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function KbRow({ keys, action }: { keys: string[]; action: string }) {
  return (
    <tr className="border-b border-slate-100">
      <td className="py-2 pr-4">
        <div className="flex items-center gap-1">
          {keys.map((k, i) => (
            <span key={i}>
              <kbd className="inline-block px-1.5 py-0.5 text-[11px] font-mono bg-slate-100 border border-slate-300 rounded shadow-sm">{k}</kbd>
              {i < keys.length - 1 && <span className="text-slate-400 text-[11px] mx-0.5">+</span>}
            </span>
          ))}
        </div>
      </td>
      <td className="py-2 text-[12px] text-slate-600" style={{ fontFamily: 'Poppins, sans-serif' }}>{action}</td>
    </tr>
  );
}

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="list-none space-y-1.5 mb-3">
      {steps.map((s, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#1a73e8] text-white text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
          <p className="text-[13px] text-slate-600 leading-relaxed" style={{ fontFamily: 'Poppins, sans-serif' }}>{s}</p>
        </li>
      ))}
    </ol>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide" style={{ fontFamily: 'Poppins, sans-serif' }}>{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="appearance-none pl-2.5 pr-7 py-1.5 text-[12px] font-medium bg-white border border-slate-200 rounded-lg text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30 shadow-sm"
          style={{ fontFamily: 'Poppins, sans-serif' }}
          data-testid="help-element-filter"
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}

// Detailed element doc block
function ElementDoc({
  name, badge, description, purpose, howToAdd, properties, bestPractices, commonMistakes, warnings, validationRules,
}: {
  name: string;
  badge: string;
  description: string;
  purpose: string[];
  howToAdd: string[];
  properties: Array<[string, string]>;
  bestPractices: string[];
  commonMistakes: string[];
  warnings: string[];
  validationRules: string[];
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border border-slate-200 bg-white mb-4 overflow-hidden shadow-sm">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200 hover:bg-slate-100 transition-colors text-left"
        onClick={() => setOpen(o => !o)}
        data-testid={`element-doc-${name.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0', badge)}>{name}</span>
        <p className="text-[12px] text-slate-600 flex-1" style={{ fontFamily: 'Poppins, sans-serif' }}>{description}</p>
        <ChevronDown className={cn('w-4 h-4 text-slate-400 flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="px-4 pt-3 pb-4">
          <MiniHeading>Purpose & When to Use</MiniHeading>
          <BulletList items={purpose} />
          <MiniHeading>How to Add</MiniHeading>
          <StepList steps={howToAdd} />
          <MiniHeading>Properties</MiniHeading>
          <PropTable rows={properties} />
          {bestPractices.length > 0 && (
            <>
              <MiniHeading>Best Practices</MiniHeading>
              <BulletList items={bestPractices} />
            </>
          )}
          {warnings.length > 0 && warnings.map((w, i) => <Warn key={i}>{w}</Warn>)}
          {validationRules.length > 0 && (
            <>
              <MiniHeading>Validation Rules & Errors</MiniHeading>
              <BulletList items={validationRules} />
            </>
          )}
          {commonMistakes.length > 0 && (
            <>
              <MiniHeading>Common Mistakes</MiniHeading>
              <BulletList items={commonMistakes} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Detailed connection doc block
function ConnectionDoc({
  name, description, howToDraw, validConnections, invalidConnections, properties, warnings, troubleshooting,
}: {
  name: string;
  description: string;
  howToDraw: string[];
  validConnections: string[];
  invalidConnections: string[];
  properties: Array<[string, string]>;
  warnings: string[];
  troubleshooting: string[];
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border border-slate-200 bg-white mb-4 overflow-hidden shadow-sm">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200 hover:bg-slate-100 transition-colors text-left"
        onClick={() => setOpen(o => !o)}
        data-testid={`connection-doc-${name.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 flex-shrink-0">{name}</span>
        <p className="text-[12px] text-slate-600 flex-1" style={{ fontFamily: 'Poppins, sans-serif' }}>{description}</p>
        <ChevronDown className={cn('w-4 h-4 text-slate-400 flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="px-4 pt-3 pb-4">
          <MiniHeading>How to Draw</MiniHeading>
          <StepList steps={howToDraw} />
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <MiniHeading>Valid Connections</MiniHeading>
              <BulletList items={validConnections} />
            </div>
            <div>
              <MiniHeading>Invalid Connections</MiniHeading>
              <BulletList items={invalidConnections} />
            </div>
          </div>
          {properties.length > 0 && (
            <>
              <MiniHeading>Required Properties</MiniHeading>
              <PropTable rows={properties} />
            </>
          )}
          {warnings.map((w, i) => <Warn key={i}>{w}</Warn>)}
          {troubleshooting.length > 0 && (
            <>
              <MiniHeading>Troubleshooting</MiniHeading>
              <BulletList items={troubleshooting} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Section content ──────────────────────────────────────────────────────────

function GettingStarted() {
  return (
    <>
      <SectionTitle>Getting Started</SectionTitle>
      <SectionLead>WHAMO Network Designer lets you visually build water distribution networks and export them for hydraulic simulation using the WHAMO engine.</SectionLead>

      <SubHeading>Creating a New Project</SubHeading>
      <StepList steps={[
        'Click New in the title bar to create a blank project.',
        'Enter a project name in the centre field of the title bar.',
        'Add elements using the INSERT ribbon (Reservoir, Node, Junction, etc.).',
        'Connect elements by hovering a node until the green handle appears, then dragging to another node.',
        'Click Save As to persist the project to the server.',
      ]} />

      <SubHeading>Opening an Existing Project</SubHeading>
      <StepList steps={[
        'Click Open in the title bar.',
        'Select a project from the Projects list panel.',
        'The canvas, properties, and all settings are restored automatically.',
      ]} />

      <SubHeading>Saving</SubHeading>
      <Para>Use <strong>Save</strong> to overwrite the current project, or <strong>Save As</strong> to create a new revision. Projects are stored on the server and remain available after logging out.</Para>

      <Note>All element property changes are tracked with Undo/Redo (up to 50 steps). Use <strong>Ctrl+Z</strong> and <strong>Ctrl+Y</strong> to navigate the history.</Note>
    </>
  );
}

const ELEMENT_OPTIONS = [
  { value: 'all', label: 'All Elements' },
  { value: 'reservoir', label: 'Reservoir' },
  { value: 'node', label: 'Node' },
  { value: 'junction', label: 'Junction' },
  { value: 'surge-tank', label: 'Surge Tank' },
  { value: 'flow-bc', label: 'Flow BC' },
  { value: 'pump', label: 'Pump' },
  { value: 'check-valve', label: 'Check Valve' },
  { value: 'turbine', label: 'Turbine' },
  { value: 'conduit', label: 'Conduit' },
  { value: 'dummy-pipe', label: 'Dummy Pipe' },
];

const ELEMENT_DATA = [
  {
    id: 'reservoir',
    name: 'Reservoir',
    badge: 'bg-blue-600 text-white',
    description: 'Fixed or schedule-driven hydraulic boundary. Provides a constant or time-varying head.',
    purpose: [
      'Use at the upstream or downstream end of a pipeline where the head is known or prescribed.',
      'Represents large storage tanks, impoundments, lakes, or any boundary where head is controlled.',
      'Every valid WHAMO network must contain at least one Reservoir as the head boundary condition.',
    ],
    howToAdd: [
      'Click the Reservoir button in the INSERT ribbon.',
      'A Reservoir node appears on the canvas.',
      'Click the node and edit its properties in the right-hand Properties Panel.',
      'Draw conduits from the Reservoir to connect it to the rest of the network.',
    ],
    properties: [
      ['Label', 'Unique identifier for this element (required, case-sensitive).'],
      ['Elevation (m/ft)', 'Hydraulic head at this boundary. In Fixed mode = constant head; in Schedule mode = initial head.'],
      ['Mode', 'Fixed: constant head throughout simulation. Schedule: head varies with time per H-Schedule.'],
      ['H-Schedule #', 'Reference number for a T-H (time/head) schedule. Active only when Mode = Schedule.'],
      ['Loss Coefficient', 'Minor loss coefficient at the reservoir connection (typically 0.5 for sharp-edged inlet).'],
    ] as Array<[string, string]>,
    bestPractices: [
      'Set the elevation to the steady-state water surface elevation at the start of simulation.',
      'For time-varying reservoirs (tidal boundaries, dam drawdown), use Schedule mode with a well-defined H-Schedule.',
      'Keep loss coefficient between 0 (perfectly rounded inlet) and 1 (sudden contraction).',
    ],
    commonMistakes: [
      'Leaving the Reservoir isolated (no connected conduits) — this fails validation.',
      'Directly connecting two Reservoirs without an intermediate Node or conduit.',
      'Setting a very high loss coefficient (> 1) for normal inlet conditions.',
    ],
    warnings: [
      'A Reservoir directly connected to another Reservoir is invalid — place a Node between them.',
    ],
    validationRules: [
      'Must have at least one conduit connection.',
      'Elevation must be a valid number (not empty).',
      'H-Schedule # must reference a defined schedule when Mode = Schedule.',
    ],
  },
  {
    id: 'node',
    name: 'Node',
    badge: 'bg-slate-600 text-white',
    description: 'Basic junction point in the network. Used wherever pipes meet without special behaviour.',
    purpose: [
      'Use wherever two or more conduits join with no demand flow or boundary condition.',
      'Ideal for pipe tee junctions that are topological only.',
      'Can serve as intermediate points along a long pipeline to create computational segments.',
    ],
    howToAdd: [
      'Click the Node button in the INSERT ribbon.',
      'A Node appears on the canvas.',
      'Connect conduits to the Node from other elements.',
      'Set Elevation in the Properties Panel.',
    ],
    properties: [
      ['Label', 'Unique identifier (required).'],
      ['Elevation (m/ft)', 'Elevation of the node used for pressure and HGL calculations.'],
      ['Node Number', 'Auto-assigned internal WHAMO number. Editable if required.'],
    ] as Array<[string, string]>,
    bestPractices: [
      'Use Nodes rather than Junctions where no demand exists to keep the model simple.',
      'Place Nodes at significant elevation changes along a pipeline for accurate pressure profiling.',
    ],
    commonMistakes: [
      'Leaving a Node with no connections — isolated nodes fail validation.',
      'Using Junction when no demand is needed (functional, but adds unnecessary complexity).',
    ],
    warnings: [],
    validationRules: [
      'Must have at least one conduit connection to be valid.',
      'Elevation must be a valid numeric value.',
    ],
  },
  {
    id: 'junction',
    name: 'Junction',
    badge: 'bg-emerald-600 text-white',
    description: 'Demand or tee junction with optional demand flow. Use for lateral off-takes.',
    purpose: [
      'Use wherever a customer demand, off-take, or consumer draw is modelled.',
      'Use for tee junctions where a side branch carries a known demand flow.',
      'Demand may be zero, making Junction functionally equivalent to Node.',
    ],
    howToAdd: [
      'Click the Junction button in the INSERT ribbon.',
      'Place the Junction on the canvas and connect conduits to it.',
      'Set Elevation and Demand in the Properties Panel.',
    ],
    properties: [
      ['Label', 'Unique identifier (required).'],
      ['Elevation', 'Node elevation for HGL and pressure calculations.'],
      ['Demand (m³/s or ft³/s)', 'Steady-state demand flow extracted at this junction. Positive = extraction from network.'],
    ] as Array<[string, string]>,
    bestPractices: [
      'Set demand to the average steady-state withdrawal rate for the consumer served by this junction.',
      'For time-varying demands, use a Flow BC element instead of a Junction demand.',
    ],
    commonMistakes: [
      'Setting a negative demand (supply into network) — use Flow BC for that purpose instead.',
      'Forgetting to set demand when modelling off-takes, leaving it at zero.',
    ],
    warnings: [],
    validationRules: [
      'Must have at least one conduit connection.',
      'Demand must be a non-negative number (zero is valid).',
    ],
  },
  {
    id: 'surge-tank',
    name: 'Surge Tank',
    badge: 'bg-purple-600 text-white',
    description: 'Open or closed surge vessel. Models water-hammer suppression chambers.',
    purpose: [
      'Install on pump stations or upstream of valves to suppress water hammer pressure fluctuations.',
      'Open tank: water surface vents to atmosphere — models simple standpipes.',
      'Closed tank (air vessel): uses E/A pairs to define a pressurised cushion.',
      'Use wherever significant water hammer risk exists (pump trips, fast valve closures).',
    ],
    howToAdd: [
      'Click the Surge Tank button in the INSERT ribbon.',
      'Place the Surge Tank near the element it protects (e.g., near a pump or valve).',
      'Connect it to the main pipeline via a short conduit or Dummy Pipe.',
      'Set Tank Top, Tank Bottom, Initial Water Level, and Riser Diameter in Properties Panel.',
    ],
    properties: [
      ['Label', 'Unique identifier (required).'],
      ['Tank Top', 'Maximum water level elevation (overflow level).'],
      ['Tank Bottom', 'Minimum water level (empty tank elevation).'],
      ['Initial Water Level', 'Water surface elevation at t = 0. Must be between Tank Bottom and Tank Top.'],
      ['Riser Diameter', 'Diameter of the connection pipe between tank and main pipeline.'],
      ['Area/Shape (E/A pairs)', 'Elevation-area pairs for non-prismatic closed tanks.'],
    ] as Array<[string, string]>,
    bestPractices: [
      'Size the tank to handle the full transient volume exchange without emptying or overflowing.',
      'Place the surge tank as close as possible (physically) to the protected equipment.',
      'Use a Dummy Pipe for the connection when the riser length is negligible.',
    ],
    commonMistakes: [
      'Setting Initial Water Level outside the Tank Bottom–Top range causes immediate simulation failure.',
      'Connecting Surge Tank to two pipeline nodes (it is a side-branch, not a through element).',
      'Not setting Riser Diameter — defaults to zero which prevents flow exchange.',
    ],
    warnings: [
      'Surge tanks are modelled as infinite-celerity elements in WHAMO. Do not manually adjust celerity on surge tank conduit connections.',
      'Tank Bottom must be less than Tank Top. Initial Water Level must be between these limits.',
    ],
    validationRules: [
      'Tank Bottom < Initial Water Level < Tank Top.',
      'Riser Diameter must be > 0.',
      'Surge Tank must have exactly one conduit connection (side-branch only).',
    ],
  },
  {
    id: 'flow-bc',
    name: 'Flow BC',
    badge: 'bg-orange-600 text-white',
    description: 'Flow boundary condition. Injects or extracts a prescribed flow rate, optionally time-varying.',
    purpose: [
      'Model pumped inflow from an external source not represented by a pump element.',
      'Model controlled extraction (irrigation, industrial withdrawal) that varies with time.',
      'Simulate demand fluctuations, operational scenarios, or emergency shut-offs.',
    ],
    howToAdd: [
      'Click the Flow BC button in the INSERT ribbon.',
      'Place the element and connect it to the target Node or Junction.',
      'Set Flow Rate, Mode, and Q-Schedule if time-varying in the Properties Panel.',
    ],
    properties: [
      ['Label', 'Unique identifier (required).'],
      ['Flow Rate (Q)', 'Prescribed flow rate (m³/s or ft³/s). Positive = injection; negative = extraction.'],
      ['Mode', 'Fixed: constant flow. Schedule: flow varies with time per Q-Schedule.'],
      ['Q-Schedule #', 'Reference to a T-Q (time/flow) schedule. Active when Mode = Schedule.'],
    ] as Array<[string, string]>,
    bestPractices: [
      'Use positive Q for injection (inflow) and negative Q for extraction (withdrawal).',
      'For systems with a known variable inflow (river pump station), use Schedule mode with measured data.',
    ],
    commonMistakes: [
      'Confusing Flow BC (prescribes Q) with Reservoir (prescribes head) — using the wrong type gives incorrect boundary conditions.',
      'Setting Q-Schedule # without switching Mode to Schedule.',
    ],
    warnings: [
      'Do not use Flow BC and Reservoir at the same network endpoint — only one boundary condition type per location.',
    ],
    validationRules: [
      'Flow Rate must be a valid number (positive or negative).',
      'Q-Schedule # must reference a defined schedule when Mode = Schedule.',
      'Must have at least one conduit connection.',
    ],
  },
  {
    id: 'pump',
    name: 'Pump',
    badge: 'bg-pink-600 text-white',
    description: 'Link element placed on a conduit to represent a pump with a characteristic curve (P-Char).',
    purpose: [
      'Model any centrifugal or axial-flow pump in the system.',
      'Simulate pump start-up, shut-down, and trip (loss-of-power) transient events.',
      'Multiple pumps in series or parallel via separate conduit links.',
    ],
    howToAdd: [
      'Click the Pump button in the INSERT ribbon to activate pump link-drawing mode (button turns blue).',
      'Drag from the source node (suction) to the target node (discharge).',
      'Select the pump conduit and enter P-Char curve data in the Flex Table or Properties Panel.',
      'Click the Pump button again to exit link-drawing mode.',
    ],
    properties: [
      ['Label', 'Unique identifier (required).'],
      ['Speed Ratio', 'Operating to rated speed ratio (1.0 = full speed). For variable-speed pumps.'],
      ['Status (ON/OFF)', 'Initial pump status at t = 0.'],
      ['P-Char Data', 'Pump characteristic curve: Q-H pairs from shut-off head to maximum flow.'],
    ] as Array<[string, string]>,
    bestPractices: [
      'Define the P-Char curve from Q=0 (shut-off head) to beyond the expected maximum operating flow.',
      'Always place a Check Valve on the pump discharge to prevent reverse flow during trip transients.',
      'For pump-trip simulations, ensure a surge tank or air vessel is located near the pump station.',
    ],
    commonMistakes: [
      'Omitting the P-Char curve — simulation will abort without a valid pump curve.',
      'Drawing the pump in the wrong direction (discharge to suction) — pump adds energy in draw direction.',
      'Not placing a check valve on the discharge side.',
    ],
    warnings: [
      'The P-Char curve must cover the full range of Q encountered during the simulation. Extrapolation beyond curve endpoints may cause instability.',
    ],
    validationRules: [
      'P-Char data must contain at least two Q-H pairs.',
      'Must connect two nodes (not Reservoir-to-Reservoir).',
      'Conduit carrying the pump must have valid Length, Diameter, and Celerity.',
    ],
  },
  {
    id: 'check-valve',
    name: 'Check Valve',
    badge: 'bg-red-700 text-white',
    description: 'Link element that only allows forward flow. Closes instantly when flow reverses.',
    purpose: [
      'Protect pump discharge lines from backflow during trip or shutdown events.',
      'Prevent siphoning in elevated pipeline sections.',
      'Protect upstream equipment from reverse-flow damage.',
    ],
    howToAdd: [
      'Click the Check Valve button in the INSERT ribbon to activate check valve link mode.',
      'Drag from the source (upstream) node to the target (downstream) node.',
      'The connection is created with forward flow direction = source to target.',
      'Click the Check Valve button again to deactivate link mode.',
    ],
    properties: [
      ['Label', 'Unique identifier (required).'],
      ['Loss Coefficient', 'Minor loss coefficient (K) when valve is open. Accounts for pressure drop through valve body.'],
    ] as Array<[string, string]>,
    bestPractices: [
      'Always draw the check valve in the intended direction of flow (source → target = forward direction).',
      'Use a surge tank or air vessel near the check valve to absorb the pressure wave generated by instantaneous closure.',
    ],
    commonMistakes: [
      'Drawing the check valve in reverse (will block all flow from the start).',
      'Not providing surge protection — instantaneous closure can generate extreme pressure spikes.',
    ],
    warnings: [
      'Check valve closure is instantaneous in WHAMO. This will generate a pressure wave. Install surge protection (surge tank, air vessel, or pressure relief valve) nearby.',
      'Cannot directly connect two Reservoirs via a check valve — place a Node between them.',
    ],
    validationRules: [
      'Must connect two nodes (Node, Junction, or Reservoir on at most one end).',
      'Loss coefficient must be ≥ 0.',
      'Conduit must have valid Length, Diameter, and Celerity.',
    ],
  },
  {
    id: 'turbine',
    name: 'Turbine',
    badge: 'bg-cyan-700 text-white',
    description: 'Link element representing a hydraulic turbine. Supports TURBGOV and EMERGENCY closure modes.',
    purpose: [
      'Model hydroelectric turbines and load-rejection or emergency shutdown transients.',
      'TURBGOV mode: governor-controlled gate position maintains speed/load.',
      'EMERGENCY mode: simulates emergency gate closure on load rejection.',
    ],
    howToAdd: [
      'Click the Turbine button in the INSERT ribbon to activate turbine link mode.',
      'Drag from the upstream (high-head) node to the downstream (tailrace) node.',
      'Set Mode, Gate Schedule, Speed, and Inertia in the Flex Table.',
      'Click the Turbine button again to deactivate link mode.',
    ],
    properties: [
      ['Label', 'Unique identifier (required).'],
      ['Mode', 'TURBGOV (governor-controlled) or EMERGENCY (scheduled gate closure).'],
      ['Gate Schedule (V-Schedule)', 'Time/gate-position pairs defining gate closure/opening.'],
      ['Speed', 'Rated rotational speed of the turbine (rpm).'],
      ['Inertia', 'Combined moment of inertia of turbine + generator (kg·m²).'],
    ] as Array<[string, string]>,
    bestPractices: [
      'Always include a surge tank on the penstock near the turbine to absorb load-rejection transients.',
      'Define a realistic gate closure schedule based on the actual governor response time.',
      'Validate inertia values against the turbine manufacturer data sheet.',
    ],
    commonMistakes: [
      'Not providing a Gate Schedule in EMERGENCY mode — simulation aborts.',
      'Setting very fast gate closure (< 1 s) without surge protection — generates extreme over-pressures.',
    ],
    warnings: [
      'For hydroelectric systems: always include a surge tank on the penstock near the turbine inlet. Without it, load-rejection transients can produce dangerously high pressures.',
      'Turbine simulation in EMERGENCY mode requires a complete V-Schedule. Missing or incomplete schedule data will cause the simulation to abort.',
    ],
    validationRules: [
      'Gate Schedule must contain at least two pairs for EMERGENCY mode.',
      'Speed and Inertia must be positive values.',
      'Must connect two nodes; upstream at high head, downstream at low head.',
    ],
  },
  {
    id: 'conduit',
    name: 'Conduit (Pipe)',
    badge: 'bg-slate-500 text-white',
    description: 'Fundamental flow-carrying element linking any two connected nodes.',
    purpose: [
      'Every connection between two network elements is a conduit.',
      'Carries both steady-state and transient flow between nodes.',
      'The Courant condition (DTCOMP × celerity / length ≤ 1) must be satisfied.',
    ],
    howToAdd: [
      'Hover over a source element until the green connection handle appears.',
      'Click and drag from the handle to the target element.',
      'Release the mouse over the target — a conduit is created automatically.',
      'Select the conduit in the Flex Table (Conduit tab) to set hydraulic properties.',
    ],
    properties: [
      ['Length (L)', 'Physical pipe length in m or ft. Must be > 0.'],
      ['Diameter (D)', 'Internal pipe diameter in m or ft. Must be > 0.'],
      ['Celerity (a)', 'Pressure-wave speed in m/s or ft/s. Typically 800–1400 m/s for steel.'],
      ['Friction (f)', "Darcy-Weisbach friction factor or Manning's n."],
      ['Pipe Material', "Auto-fills Manning's n, Young's Modulus (E), and computes wave speed."],
      ['Has Added Loss', 'Enables a minor-loss coefficient (K) for fittings, bends, etc.'],
    ] as Array<[string, string]>,
    bestPractices: [
      'Verify that DTCOMP × celerity / length ≤ 1 for all conduits before running simulations.',
      'Use the Pipe Material selector to auto-calculate celerity rather than entering it manually.',
      'Avoid very short conduits (< 1 m) in production networks — they require very small DTCOMP values.',
    ],
    commonMistakes: [
      'Leaving Length, Diameter, or Celerity at zero — simulation fails validation.',
      'Violating the Courant condition (DTCOMP × a / L > 1) — produces incorrect results.',
    ],
    warnings: [
      'Courant condition: DTCOMP × celerity / Length must be ≤ 1.0. Violating this causes numerical instability and incorrect simulation results.',
    ],
    validationRules: [
      'Length > 0, Diameter > 0, Celerity > 0.',
      'Must connect exactly two nodes.',
      'Courant number ≤ 1 must be satisfied.',
    ],
  },
  {
    id: 'dummy-pipe',
    name: 'Dummy Pipe',
    badge: 'bg-slate-400 text-white',
    description: 'Zero-resistance conduit for very short connections or topological splits.',
    purpose: [
      'Connect a Surge Tank to the main pipeline when riser length is negligible.',
      'Split a conduit into computational segments without adding physical resistance.',
      'Represent instantaneous connections (e.g., two tanks sharing a common wall).',
    ],
    howToAdd: [
      'Click the Dummy Pipe button in the INSERT ribbon to activate dummy pipe mode.',
      'Drag from the source to the target node.',
      'Set a very small Length (e.g., 0.001 m) and high Celerity (e.g., 9999 m/s).',
    ],
    properties: [
      ['Length (L)', 'Typically 0.001 m or similar negligible value.'],
      ['Diameter (D)', 'Should match the connecting pipe diameter for continuity.'],
      ['Celerity (a)', 'Set to high value (e.g., 9999 m/s) to represent rigid-column behaviour.'],
    ] as Array<[string, string]>,
    bestPractices: [
      'Use Dummy Pipes only for genuinely negligible connections — not for convenience.',
      'Keep Dummy Pipe length realistic (not exactly zero, which causes division errors).',
    ],
    commonMistakes: [
      'Setting Length to exactly 0 — causes division by zero in wave speed calculations.',
      'Using Dummy Pipes for long connections where pipe hydraulics matter.',
    ],
    warnings: [],
    validationRules: [
      'Length must be a small positive value (> 0, not exactly zero).',
      'Celerity must be > 0.',
    ],
  },
];

function NetworkElements() {
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? ELEMENT_DATA : ELEMENT_DATA.filter(e => e.id === filter);

  return (
    <>
      <SectionTitle>Network Elements</SectionTitle>
      <SectionLead>Each element in WHAMO represents a physical hydraulic component. Click any INSERT ribbon button to add an element to the canvas.</SectionLead>

      <FilterSelect
        label="Filter:"
        value={filter}
        options={ELEMENT_OPTIONS}
        onChange={setFilter}
      />

      {filtered.map(el => (
        <ElementDoc key={el.id} {...el} />
      ))}
    </>
  );
}

const CONNECTION_OPTIONS = [
  { value: 'all', label: 'All Connections' },
  { value: 'conduit', label: 'Standard Conduit' },
  { value: 'dummy-pipe', label: 'Dummy Pipe' },
  { value: 'pump-link', label: 'Pump Link' },
  { value: 'check-valve-link', label: 'Check Valve Link' },
  { value: 'turbine-link', label: 'Turbine Link' },
  { value: 'reservoir-conn', label: 'Reservoir Connections' },
  { value: 'surge-tank-conn', label: 'Surge Tank Connections' },
  { value: 'flow-bc-conn', label: 'Flow BC Connections' },
];

const CONNECTION_DATA = [
  {
    id: 'conduit',
    name: 'Standard Conduit',
    description: 'Regular pipe linking any two network nodes. Carries steady-state and transient flow.',
    howToDraw: [
      'Hover over a source element until the green connection handle appears on its edge.',
      'Click and drag from the handle to the target element.',
      'Release over the target — a conduit is created automatically.',
      'Open the Flex Table (Conduit tab) and set Length, Diameter, and Celerity.',
    ],
    validConnections: [
      'Reservoir → Node',
      'Reservoir → Junction',
      'Node → Node',
      'Node → Junction',
      'Junction → Junction',
      'Node → Surge Tank',
      'Junction → Surge Tank',
      'Node → Flow BC',
    ],
    invalidConnections: [
      'Reservoir → Reservoir directly',
      'Self-loop (element to itself)',
      'Surge Tank → Surge Tank',
    ],
    properties: [
      ['Length (L)', 'Physical pipe length in m or ft. Must be > 0.'],
      ['Diameter (D)', 'Internal pipe diameter in m or ft. Must be > 0.'],
      ['Celerity (a)', 'Pressure-wave speed (m/s or ft/s).'],
      ['Friction (f)', "Darcy-Weisbach or Manning's friction factor."],
      ['Material', 'Auto-fills friction, E, and celerity when selected.'],
    ] as Array<[string, string]>,
    warnings: [
      'Every conduit must have non-zero Length, Diameter, and Celerity before running a simulation. Missing values cause validation failure.',
      'Courant condition: DTCOMP × celerity / length ≤ 1 must be met for numerical stability.',
    ],
    troubleshooting: [
      'Conduit appears disconnected: check that both endpoints snapped to element handles (green dots).',
      'Simulation fails with "zero-length pipe": set Length to a positive non-zero value in the Flex Table.',
      'Very high celerity values: verify Pipe Material selection — some materials produce unrealistically high wave speeds for thin-walled pipes.',
    ],
  },
  {
    id: 'dummy-pipe',
    name: 'Dummy Pipe',
    description: 'Zero-resistance topological connector for very short or negligible connections.',
    howToDraw: [
      'Click the Dummy Pipe button in the INSERT ribbon to activate dummy pipe mode.',
      'Drag from source element to target element.',
      'Set Length to a very small positive value (e.g., 0.001 m) and Celerity to 9999 m/s.',
      'Click Dummy Pipe button again to deactivate mode.',
    ],
    validConnections: [
      'Node → Surge Tank (short riser)',
      'Junction → Surge Tank (short riser)',
      'Node → Node (topological split)',
    ],
    invalidConnections: [
      'Long pipe sections (use standard conduit instead)',
      'Reservoir → Surge Tank (should go through a node)',
    ],
    properties: [
      ['Length (L)', 'Very small positive value (e.g., 0.001 m). Must not be exactly zero.'],
      ['Diameter (D)', 'Match to connecting pipe diameter for flow continuity.'],
      ['Celerity (a)', 'High value (e.g., 9999 m/s) for rigid-column behaviour.'],
    ] as Array<[string, string]>,
    warnings: [
      'Never set Dummy Pipe Length to exactly 0.0 — this causes a division-by-zero in wave speed calculations.',
    ],
    troubleshooting: [
      'Simulation crash at Dummy Pipe: check that Length is a small positive number, not zero.',
      'Unexpected pressure drop through dummy pipe: ensure friction factor is set to 0 or very small.',
    ],
  },
  {
    id: 'pump-link',
    name: 'Pump Link',
    description: 'Conduit with an embedded Pump element. Adds energy to flow per the pump characteristic curve.',
    howToDraw: [
      'Click the Pump button in the INSERT ribbon (turns blue to indicate active mode).',
      'Drag from the suction-side node to the discharge-side node.',
      'The pump conduit is created. Select it and enter P-Char data in the Properties Panel.',
      'Click Pump button again to deactivate link-drawing mode.',
    ],
    validConnections: [
      'Node → Node (most common)',
      'Junction → Node',
      'Reservoir → Node (pump draws from reservoir sump)',
      'Node → Junction',
    ],
    invalidConnections: [
      'Reservoir → Reservoir via pump',
      'Surge Tank → any element as source',
      'Self-loop pump',
    ],
    properties: [
      ['P-Char Curve', 'Q-H pairs from shut-off head to maximum flow. Required.'],
      ['Speed Ratio', 'Operating / rated speed ratio. Default = 1.0.'],
      ['Initial Status', 'ON or OFF at simulation start.'],
      ['Length / Diameter / Celerity', 'Required conduit properties for the pump conduit itself.'],
    ] as Array<[string, string]>,
    warnings: [
      'The P-Char curve must cover the full Q range expected during the simulation. Extrapolation beyond the curve causes inaccurate or unstable results.',
      'Always place a Check Valve on the pump discharge to prevent reverse flow during pump trip transients.',
    ],
    troubleshooting: [
      'Simulation fails with "pump curve undefined": open the pump conduit in the Flex Table and enter at least 2 Q-H pairs.',
      'Pump produces negative head rise: verify that flow direction is drawn suction-to-discharge (not reversed).',
      'Reverse flow through pump after trip: add a Check Valve on the discharge side.',
    ],
  },
  {
    id: 'check-valve-link',
    name: 'Check Valve Link',
    description: 'Conduit that permits forward flow only. Closes instantaneously when flow attempts to reverse.',
    howToDraw: [
      'Click the Check Valve button in the INSERT ribbon (turns blue).',
      'Drag from the upstream node to the downstream node (direction = forward flow direction).',
      'The check valve conduit is created.',
      'Click Check Valve button again to deactivate mode.',
    ],
    validConnections: [
      'Node → Node',
      'Node → Junction',
      'Junction → Node',
      'Reservoir → Node (single-direction flow from reservoir)',
    ],
    invalidConnections: [
      'Reservoir → Reservoir (two boundaries cannot be connected directly)',
      'Any connection where direction is ambiguous',
    ],
    properties: [
      ['Loss Coefficient', 'Minor loss (K) when valve is fully open. Typically 0.1–2.0.'],
      ['Length / Diameter / Celerity', 'Required conduit properties for the check valve conduit.'],
    ] as Array<[string, string]>,
    warnings: [
      'Check valve closure is instantaneous in WHAMO. This always generates a pressure wave. Install surge protection (surge tank, air vessel) near the valve.',
      'Drawing the check valve in the wrong direction will block all flow from t=0. Verify source and target carefully.',
    ],
    troubleshooting: [
      'No flow in system: check valve drawn backwards — delete and redraw with correct direction.',
      'Extreme pressure spike after pump trip: add surge tank near check valve location.',
      'Check valve never opens: verify that pump is generating sufficient head to overcome downstream pressure.',
    ],
  },
  {
    id: 'turbine-link',
    name: 'Turbine Link',
    description: 'Conduit with a Turbine element. Extracts energy from flow for hydroelectric power generation.',
    howToDraw: [
      'Click the Turbine button in the INSERT ribbon (turns blue).',
      'Drag from the upstream (penstock) node to the downstream (tailrace) node.',
      'Set Mode (TURBGOV or EMERGENCY), Gate Schedule, Speed, and Inertia in the Flex Table.',
      'Click Turbine button again to deactivate mode.',
    ],
    validConnections: [
      'Node → Node (penstock junction to tailrace node)',
      'Reservoir → Node (direct penstock from reservoir to turbine)',
      'Node → Reservoir (turbine discharging to tailrace reservoir)',
    ],
    invalidConnections: [
      'Surge Tank as turbine source or target',
      'Flow BC as turbine source',
      'Reverse direction (tailrace to penstock)',
    ],
    properties: [
      ['Mode', 'TURBGOV (governor controlled) or EMERGENCY (gate schedule).'],
      ['Gate Schedule (V-Schedule)', 'Time/gate-position pairs. Required for EMERGENCY mode.'],
      ['Speed (rpm)', 'Rated turbine speed.'],
      ['Inertia (kg·m²)', 'Combined inertia of turbine and generator shaft.'],
    ] as Array<[string, string]>,
    warnings: [
      'Always include a surge tank on the penstock near the turbine. Without it, load-rejection transients generate dangerous over-pressures.',
      'EMERGENCY mode requires a complete V-Schedule. Missing schedule data causes immediate simulation abort.',
    ],
    troubleshooting: [
      'Simulation aborts: check that a Gate Schedule is defined in the Flex Table for EMERGENCY mode.',
      'Unrealistically high pressures on load rejection: add a surge tank on the penstock side.',
      'Speed goes to zero immediately: verify Inertia value — too-small inertia causes instantaneous deceleration.',
    ],
  },
  {
    id: 'reservoir-conn',
    name: 'Reservoir Connections',
    description: 'How Reservoirs connect to the rest of the network via conduits.',
    howToDraw: [
      'Draw a standard conduit from the Reservoir handle to any target node (Node, Junction).',
      'Set Length, Diameter, and Celerity on the resulting conduit.',
      'Set the Loss Coefficient on the Reservoir to model inlet/outlet losses.',
    ],
    validConnections: [
      'Reservoir → Node',
      'Reservoir → Junction',
      'Reservoir → Flow BC (unusual but valid)',
      'Multiple conduits from a single Reservoir (branching)',
    ],
    invalidConnections: [
      'Reservoir → Reservoir directly (place a Node between them)',
      'Reservoir → Surge Tank directly (use an intermediate Node)',
      'Reservoir self-loop',
    ],
    properties: [
      ['Loss Coefficient', 'Applied at the Reservoir boundary to all connecting conduits.'],
    ] as Array<[string, string]>,
    warnings: [
      'Every WHAMO network must have at least one Reservoir. Without a head boundary, the steady-state system cannot be solved.',
      'Directly connecting two Reservoirs produces an over-specified system — always place an intermediate Node.',
    ],
    troubleshooting: [
      'Validation error "no head boundary": make sure at least one Reservoir exists and is connected.',
      'Head at reservoir junction looks wrong: check Loss Coefficient setting on the Reservoir.',
    ],
  },
  {
    id: 'surge-tank-conn',
    name: 'Surge Tank Connections',
    description: 'How Surge Tanks connect as side-branch vessels to the main pipeline.',
    howToDraw: [
      'Draw a conduit (or Dummy Pipe) from the main pipeline Node to the Surge Tank.',
      'Set a small Riser Diameter on the Surge Tank for restricted inlet.',
      'Verify that Tank Bottom < Initial Level < Tank Top.',
    ],
    validConnections: [
      'Node → Surge Tank',
      'Junction → Surge Tank',
    ],
    invalidConnections: [
      'Reservoir → Surge Tank directly',
      'Surge Tank → Surge Tank',
      'Surge Tank with two pipeline connections (side-branch only)',
    ],
    properties: [
      ['Riser Diameter', 'Controls flow exchange rate between tank and main pipe. Must be > 0.'],
    ] as Array<[string, string]>,
    warnings: [
      'A Surge Tank must have exactly ONE conduit connection. Connecting it between two pipeline nodes as a through-element is invalid.',
      'Surge tanks have infinite celerity in WHAMO — do not try to manually set celerity on the connecting conduit.',
    ],
    troubleshooting: [
      'Surge tank has no effect on transient: check that Riser Diameter is set correctly and tank is near the protected element.',
      'Validation error on tank: ensure Tank Bottom < Initial Level < Tank Top.',
    ],
  },
  {
    id: 'flow-bc-conn',
    name: 'Flow BC Connections',
    description: 'How Flow Boundary Conditions inject or extract flow at a specific network point.',
    howToDraw: [
      'Draw a conduit from the target Node or Junction to the Flow BC element.',
      'Set the Flow Rate and Mode in the Properties Panel.',
      'If using Schedule mode, define Q-Schedule pairs.',
    ],
    validConnections: [
      'Node → Flow BC',
      'Junction → Flow BC',
    ],
    invalidConnections: [
      'Reservoir → Flow BC at same location (conflicting boundary types)',
      'Flow BC with multiple conduit connections (typically only one)',
    ],
    properties: [
      ['Flow Rate (Q)', 'Positive = injection into network; negative = extraction.'],
      ['Mode', 'Fixed or Schedule.'],
    ] as Array<[string, string]>,
    warnings: [
      'Do not place a Flow BC and a Reservoir at the same network node — conflicting boundary conditions will produce incorrect results.',
    ],
    troubleshooting: [
      'Unexpected flow imbalance: verify that Flow BC Q sign is correct (positive for inflow, negative for extraction).',
      'Schedule flow not varying: ensure Mode is set to Schedule and Q-Schedule pairs are defined.',
    ],
  },
];

function Connections() {
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? CONNECTION_DATA : CONNECTION_DATA.filter(c => c.id === filter);

  return (
    <>
      <SectionTitle>Connections</SectionTitle>
      <SectionLead>Every pair of connected elements is linked by a conduit. Drawing and editing conduits is the primary way to build your network topology.</SectionLead>

      <FilterSelect
        label="Filter:"
        value={filter}
        options={CONNECTION_OPTIONS}
        onChange={setFilter}
      />

      {filtered.map(conn => (
        <ConnectionDoc key={conn.id} {...conn} />
      ))}
    </>
  );
}

function FlexTableSection() {
  return (
    <>
      <SectionTitle>Flex Table</SectionTitle>
      <SectionLead>The Flex Table gives you a spreadsheet-like view of every element in the network. Open it from Tools → Flex Table in the ribbon.</SectionLead>

      <SubHeading>Tab Filters</SubHeading>
      <Para>Use the filter chips at the top to switch between element types: All, Conduit, Dummy Pipe, Reservoir, Node, Junction, Surge Tank, Flow BC, Pump, Check Valve, and Turbine.</Para>

      <SubHeading>Editing Cells</SubHeading>
      <Para>Click any white cell to edit it inline. Cells with a grey background are read-only for that element type. Press <kbd className="px-1 py-0.5 text-[11px] font-mono bg-slate-100 border border-slate-300 rounded shadow-sm">Tab</kbd> or <kbd className="px-1 py-0.5 text-[11px] font-mono bg-slate-100 border border-slate-300 rounded shadow-sm">Enter</kbd> to commit a change.</Para>

      <SubHeading>Unit System</SubHeading>
      <Para>The SI / FPS toggle controls the global display unit. Individual rows can override this via the <strong>Unit</strong> column — an amber border indicates a per-element override.</Para>

      <SubHeading>T/H and Q Schedule Pairs</SubHeading>
      <Para>For reservoirs with H-Schedule mode, or flow boundaries with Q-Schedule mode, click the <strong>Edit Pairs</strong> button in that row to open the pairs editor.</Para>

      <SubHeading>Pipe Material (Conduit Tab)</SubHeading>
      <Para>Selecting a material auto-fills Manning's n, Young's Modulus (E), and recalculates wave speed — for all conduits or just the selected row depending on the <strong>Apply Material to All Conduits</strong> checkbox.</Para>

      <Note>Clicking a row in the Flex Table selects the corresponding element on the canvas (and vice versa), keeping both views in sync.</Note>
    </>
  );
}

function ExcelSection() {
  return (
    <>
      <SectionTitle>Excel Import / Export</SectionTitle>
      <SectionLead>The Flex Table supports lossless round-trip Excel synchronization. Export a workbook, edit values in Excel, and import back — all element data is preserved.</SectionLead>

      <SubHeading>Exporting a Single Element Type</SubHeading>
      <StepList steps={[
        'Open the Flex Table (Tools → Flex Table).',
        'Select the desired element type tab (e.g. Conduit).',
        'Click the Export Excel button in the top-right of the tab bar.',
        'An .xlsx file named whamo_conduit_YYYY-MM-DD.xlsx is downloaded.',
      ]} />

      <SubHeading>Exporting All Element Types (Multi-Sheet)</SubHeading>
      <StepList steps={[
        'Open the Flex Table and stay on the All tab.',
        'Click Export Excel — a multi-sheet workbook is created.',
        'Each element type with data gets its own clearly labelled sheet.',
        'The workbook is named whamo_all_<ProjectName>_YYYY-MM-DD.xlsx.',
      ]} />

      <SubHeading>Importing from Excel</SubHeading>
      <StepList steps={[
        'Make sure your network already contains the elements you want to update.',
        'Select the matching tab in the Flex Table (or All for a multi-sheet file).',
        'Click Import Excel and select the .xlsx file.',
        'Each row is matched by its Label. Rows whose labels do not match an existing element are skipped.',
        'After a multi-sheet import, a summary dialog shows updated/skipped counts per sheet.',
      ]} />

      <Warn>Import only updates existing elements — it does not create new ones. Make sure all elements exist on the canvas before importing.</Warn>
      <Note>The exported workbook includes Excel data-validation dropdowns for fields like Pipe Material, Mode, and boolean toggles. These dropdowns are preserved on re-import.</Note>
    </>
  );
}

function SimulationSection() {
  return (
    <>
      <SectionTitle>Running Simulations</SectionTitle>
      <SectionLead>WHAMO Network Designer can run the WHAMO hydraulic transient engine directly. Configure parameters, specify output requests, then generate your results.</SectionLead>

      <SubHeading>Computational Parameters</SubHeading>
      <Para>Click <strong>Analysis → Parameters</strong> in the ribbon to open the Computational Parameters sidebar. Set DTCOMP (computation step), DTOUT (output interval), and TMAX (maximum time) for each simulation stage.</Para>

      <SubHeading>Output Requests</SubHeading>
      <StepList steps={[
        'Click Analysis → Configure to open the Output Requests panel.',
        'Select a node or element, or choose a group type (Nodes, Conduits, Elements).',
        'Tick the variables: Q, HEAD, ELEV, VEL, PRESS, PIEZHEAD (or Q, HEAD, SPEED, POWER for turbines).',
        'Click Add Request (or Add All for Group). History, Plot, and Spreadsheet types are added simultaneously.',
        'Review the Current Requests list at the bottom.',
      ]} />

      <SubHeading>Generating the .OUT File</SubHeading>
      <StepList steps={[
        'Click Generate → .OUT in the ribbon.',
        'The network is validated. Fix any errors and try again.',
        'After validation, the WHAMO engine runs on the server and the .OUT file is generated.',
        'The result is displayed in the file preview panel.',
      ]} />

      <Note>The WHAMO engine requires Wine on Linux. It runs in an isolated temporary directory and cleans up after each run.</Note>
    </>
  );
}

function FilesSection() {
  return (
    <>
      <SectionTitle>INP & OUT Files</SectionTitle>
      <SectionLead>WHAMO uses two text-based file formats: the .INP input file and the .OUT output file. Both can be previewed, downloaded, and analysed within the Designer.</SectionLead>

      <SubHeading>.INP File</SubHeading>
      <Para>The .INP file is the WHAMO input definition. It describes the network topology, element properties, computational parameters, and output requests in WHAMO's native format.</Para>
      <StepList steps={[
        'Click Generate → .INP in the ribbon.',
        'The network is validated first. Resolve any errors shown.',
        'After validation, confirm the output requests, then click Generate .INP.',
        'The file is downloaded to your computer.',
      ]} />

      <SubHeading>.OUT File</SubHeading>
      <Para>The .OUT file is produced by the WHAMO engine after a simulation run. It contains time-series results for all requested output variables.</Para>
      <StepList steps={[
        'Click Tools → Visualization in the ribbon.',
        'Load a .OUT file using the file picker inside the Visualization view.',
        'Switch between Profile Graph (animated HGL) and History Graph (time-series plots).',
      ]} />

      <Note>The .OUT file parser runs entirely client-side — no server upload is needed to view results.</Note>
    </>
  );
}

function ShortcutsSection() {
  return (
    <>
      <SectionTitle>Keyboard Shortcuts</SectionTitle>
      <SectionLead>Use these shortcuts to speed up common actions while working in the canvas or Flex Table.</SectionLead>

      <SubHeading>Canvas</SubHeading>
      <table className="w-full mb-4 text-[12px]" style={{ fontFamily: 'Poppins, sans-serif' }}>
        <thead>
          <tr className="bg-slate-50">
            <th className="text-left pb-2 pt-1 text-slate-500 font-semibold text-[10px] uppercase tracking-wide pr-4">Shortcut</th>
            <th className="text-left pb-2 pt-1 text-slate-500 font-semibold text-[10px] uppercase tracking-wide">Action</th>
          </tr>
        </thead>
        <tbody>
          <KbRow keys={['Ctrl', 'Z']} action="Undo last change" />
          <KbRow keys={['Ctrl', 'Y']} action="Redo" />
          <KbRow keys={['Ctrl', 'S']} action="Save project" />
          <KbRow keys={['Delete']} action="Delete selected element(s)" />
          <KbRow keys={['Escape']} action="Deselect / cancel link-drawing mode" />
          <KbRow keys={['Ctrl', 'A']} action="Select all elements on canvas" />
          <KbRow keys={['Ctrl', '+']} action="Zoom in" />
          <KbRow keys={['Ctrl', '-']} action="Zoom out" />
          <KbRow keys={['Ctrl', 'Shift', 'F']} action="Fit view to network" />
          <KbRow keys={['Space']} action="Pan canvas (hold while dragging)" />
        </tbody>
      </table>

      <SubHeading>Flex Table</SubHeading>
      <table className="w-full mb-4 text-[12px]" style={{ fontFamily: 'Poppins, sans-serif' }}>
        <thead>
          <tr className="bg-slate-50">
            <th className="text-left pb-2 pt-1 text-slate-500 font-semibold text-[10px] uppercase tracking-wide pr-4">Shortcut</th>
            <th className="text-left pb-2 pt-1 text-slate-500 font-semibold text-[10px] uppercase tracking-wide">Action</th>
          </tr>
        </thead>
        <tbody>
          <KbRow keys={['Tab']} action="Move to next editable cell" />
          <KbRow keys={['Shift', 'Tab']} action="Move to previous editable cell" />
          <KbRow keys={['Enter']} action="Commit edit and move to next row" />
          <KbRow keys={['Escape']} action="Cancel edit without saving" />
        </tbody>
      </table>
    </>
  );
}

function TroubleshootingSection() {
  return (
    <>
      <SectionTitle>Troubleshooting</SectionTitle>
      <SectionLead>Common issues and how to resolve them.</SectionLead>

      {[
        { q: 'Validation fails with "No path from Reservoir to Node"', a: 'Every node must be reachable from at least one Reservoir via conduits. Check the canvas for disconnected elements or broken conduit connections.' },
        { q: 'WHAMO engine returns an error or empty .OUT file', a: 'Ensure all conduit lengths, diameters, and celerities are non-zero. Check that DTCOMP × celerity / length ≤ 1 (Courant condition). Review the error message in the preview panel.' },
        { q: 'Import Excel: all rows skipped', a: 'The import matches rows by Label. Ensure the Label column in your Excel file matches exactly the element labels on the canvas (case-sensitive). Use Export Excel first to get the correct format.' },
        { q: 'Multi-sheet export shows empty workbook', a: 'The All tab export only includes element types that have at least one element. Make sure your network has elements before exporting.' },
        { q: 'Canvas elements overlap after Auto-Arrange', a: 'Auto-Arrange uses a tree layout and works best on networks with a clear flow direction. For complex looped networks, manually position elements after arranging.' },
        { q: 'Surge Tank celerity is very high or infinite', a: 'Surge tanks are modelled as infinite-celerity elements in WHAMO. This is expected — do not adjust the celerity for surge tank connections.' },
        { q: 'Undo/Redo is not available', a: 'Undo/Redo is only available when a project is open. Make sure you have opened or saved a project first.' },
        { q: 'Check Valve causes extreme pressure spike', a: 'Check valve closure is instantaneous in WHAMO. Add a surge tank or air vessel near the check valve to absorb the resulting pressure wave.' },
        { q: 'Pump simulation fails on trip transient', a: 'Ensure the P-Char curve spans from Q=0 (shut-off head) to the maximum expected flow. Also verify that a check valve is placed on the pump discharge to prevent reverse flow.' },
        { q: 'Reservoir connection gives unrealistic results', a: 'Check that the Reservoir elevation is set correctly and that the Loss Coefficient is appropriate (0.5 for sharp-edged inlet, 0.0 for fully flush connection).' },
        { q: 'Turbine simulation aborts immediately', a: 'In EMERGENCY mode, a Gate Schedule (V-Schedule) must be defined. Open the turbine properties in the Flex Table and add at least two time/gate-position pairs.' },
        { q: 'Flow BC not affecting simulation', a: 'Check that Mode is set correctly (Fixed or Schedule) and that Q-Schedule # references a valid defined schedule. Verify Q sign: positive for inflow, negative for extraction.' },
        { q: 'Junction demand not appearing in results', a: 'Demand at a Junction is a steady-state extraction. Verify the demand value in the Flex Table and ensure the output request includes the junction node.' },
      ].map(({ q, a }) => (
        <div key={q} className="mb-4 rounded-lg border border-slate-200 overflow-hidden">
          <div className="flex items-start gap-2 px-3 py-2.5 bg-slate-50 border-b border-slate-200">
            <ChevronRight className="w-3.5 h-3.5 text-[#1a73e8] flex-shrink-0 mt-0.5" />
            <p className="text-[12px] font-semibold text-slate-800" style={{ fontFamily: 'Poppins, sans-serif' }}>{q}</p>
          </div>
          <p className="text-[12px] text-slate-600 px-3 py-2.5 leading-relaxed" style={{ fontFamily: 'Poppins, sans-serif' }}>{a}</p>
        </div>
      ))}
    </>
  );
}

// ─── All Properties Section ───────────────────────────────────────────────────
interface PropRow {
  name: string;
  unit?: string;
  description: string;
  meaning: string;
  howToUse: string;
}

interface ElementProps {
  id: string;
  element: string;
  badge: string;
  badgeColor: string;
  properties: PropRow[];
}

const ALL_ELEMENT_PROPS: ElementProps[] = [
  {
    id: 'reservoir',
    element: 'Reservoir',
    badge: 'Reservoir',
    badgeColor: 'bg-blue-600',
    properties: [
      { name: 'Label / ID', description: 'Unique alphanumeric identifier for this element.', meaning: 'Used as the node label on the canvas and in the INP file. Must be unique across all elements.', howToUse: 'Type a short memorable tag such as "R1" or "UPSTRM". Avoid spaces.' },
      { name: 'Comment', description: 'Free-text internal comment (c/C style).', meaning: 'Not used in simulation. Acts as a note for the engineer — visible only in the properties panel and INP file header.', howToUse: 'Describe the reservoir purpose, e.g. "Upper forebay — elevation taken from survey 2024".' },
      { name: 'Node Number', description: 'Auto-assigned integer identifier.', meaning: 'The WHAMO engine references all nodes by number. This is set automatically and cannot normally be edited.', howToUse: 'Leave as assigned. It appears in the INP file as the node index.' },
      { name: 'Elevation', unit: 'ft / m', description: 'Datum elevation of the node above mean sea level or project datum.', meaning: 'Used to compute pressure head at the node. All heads in WHAMO are absolute, so consistent datum across the network is critical.', howToUse: 'Enter the ground/pipe centreline elevation at this reservoir location. Match units (SI vs FPS) with the global unit toggle.' },
      { name: 'Mode', description: 'Boundary condition type: Fixed HW or H Schedule.', meaning: '"Fixed HW" holds the head constant throughout the simulation. "H Schedule" lets the head vary over time according to a defined schedule.', howToUse: 'Use Fixed HW for steady reservoirs (tanks, constant-head sources). Use H Schedule when the upstream head fluctuates (tidal, operational level change).' },
      { name: 'Reservoir Elev HW', unit: 'ft / m', description: 'Head water elevation — the water surface elevation in the reservoir.', meaning: 'This is the total head supplied at this boundary node. It drives the initial conditions and the steady-state solution.', howToUse: 'Enter the normal operating water surface elevation. Must be higher than the pipe centreline to drive flow.' },
      { name: 'Loss Coefficient', description: 'Entry/exit head-loss coefficient at the reservoir face.', meaning: 'Accounts for local hydraulic losses as flow enters or leaves the reservoir. K=0 means no loss; K=1 is a typical abrupt entry.', howToUse: 'Use 0.5 for a sharp-edged entry, 0 for a well-rounded bell-mouth, or 1.0 for a projecting pipe. Leave blank to default to 0.' },
      { name: 'H-Schedule #', description: 'Index of the head-time schedule used when Mode = H Schedule.', meaning: 'References a schedule table defined in the Flex Table that provides head values at each time step.', howToUse: 'First create the schedule in the Flex Table (Schedule tab), then enter its number here.' },
    ],
  },
  {
    id: 'node',
    element: 'Node',
    badge: 'Node',
    badgeColor: 'bg-slate-500',
    properties: [
      { name: 'Label / ID', description: 'Unique alphanumeric identifier for this element.', meaning: 'Used as the node label on the canvas and in the INP file.', howToUse: 'Type a short tag such as "N1". Avoid spaces and duplicate labels.' },
      { name: 'Comment', description: 'Free-text internal comment.', meaning: 'Not used in simulation. Serves as engineer notes.', howToUse: 'Describe the node location or purpose.' },
      { name: 'Node Number', description: 'Auto-assigned integer identifier.', meaning: 'The WHAMO engine references this node by number in the INP file.', howToUse: 'Leave as assigned automatically.' },
      { name: 'Elevation', unit: 'ft / m', description: 'Pipe centreline elevation at this node.', meaning: 'Used to convert pressure head to pressure and to compute HGL profiles along the pipe.', howToUse: 'Enter the elevation at the pipe centreline. Use the same datum as all other nodes in the network.' },
    ],
  },
  {
    id: 'junction',
    element: 'Junction',
    badge: 'Junction',
    badgeColor: 'bg-green-600',
    properties: [
      { name: 'Label / ID', description: 'Unique alphanumeric identifier.', meaning: 'Identifies the junction in the INP file and on the canvas.', howToUse: 'Use a short label such as "J1" or "JCT_3WAY".' },
      { name: 'Comment', description: 'Free-text internal comment.', meaning: 'Not used in simulation. Acts as engineer note.', howToUse: 'Describe the junction role, e.g. "3-way tee at pump station".' },
      { name: 'Node Number', description: 'Auto-assigned integer.', meaning: 'WHAMO engine node index used in the INP file.', howToUse: 'Leave as assigned.' },
      { name: 'Elevation', unit: 'ft / m', description: 'Pipe centreline elevation at this junction.', meaning: 'Sets the datum for head calculations through the junction.', howToUse: 'Enter the elevation at the pipe centreline for all pipes meeting at this junction.' },
      { name: 'Demand', unit: 'm³/s or ft³/s', description: 'Steady-state lateral demand (withdrawal or injection) at this node.', meaning: 'Represents a consumer load or lateral inflow at the junction. Positive = withdrawal from network; negative = injection into network.', howToUse: 'Enter the design demand flow rate. Use 0 for a simple pass-through junction. Verify units match the global unit toggle.' },
    ],
  },
  {
    id: 'surge-tank',
    element: 'Surge Tank',
    badge: 'Surge Tank',
    badgeColor: 'bg-purple-600',
    properties: [
      { name: 'Label / ID', description: 'Unique alphanumeric identifier.', meaning: 'Identifies the surge tank in the INP file and on the canvas.', howToUse: 'Use a short label such as "ST1".' },
      { name: 'Comment', description: 'Free-text internal comment (c/C style).', meaning: 'Not used in simulation.', howToUse: 'Describe the surge tank design basis.' },
      { name: 'Node Number', description: 'Auto-assigned integer.', meaning: 'WHAMO engine node index.', howToUse: 'Leave as assigned.' },
      { name: 'Node Elevation', unit: 'ft / m', description: 'Elevation of the node at the base of the surge tank riser.', meaning: 'The reference elevation where the surge tank connects to the pipe.', howToUse: 'Set to the pipe centreline elevation at the surge tank location.' },
      { name: 'Tank Type', description: 'Configuration type: SIMPLE, ORIFICE, CLOSED, AIR, or D/S.', meaning: 'SIMPLE = open standpipe; ORIFICE = restricted entry/exit; CLOSED = pressurised air vessel; AIR = air cushion; D/S = differential surge tank.', howToUse: 'Select the type that matches the physical installation. SIMPLE is the most common.' },
      { name: 'Top Elevation', unit: 'ft / m', description: 'Elevation of the top of the surge tank.', meaning: 'Defines the overflow level. The simulation tracks whether the water level exceeds this limit.', howToUse: 'Set to the actual tank top/overflow elevation.' },
      { name: 'Bottom Elevation', unit: 'ft / m', description: 'Elevation of the bottom of the surge tank.', meaning: 'Defines the drain/empty level. Water level cannot fall below this in the model.', howToUse: 'Set to the tank base or minimum operating level.' },
      { name: 'Riser Diameter', unit: 'ft / m', description: 'Internal diameter of the riser pipe connecting the tank to the main conduit.', meaning: 'Controls the flow exchange rate between the main pipe and the tank. Smaller riser = more damping.', howToUse: 'Enter the actual riser pipe internal diameter.' },
      { name: 'Initial Water Level', unit: 'ft / m', description: 'Water surface elevation in the tank at t = 0.', meaning: 'Sets the initial condition for the surge tank. Must be between Bottom and Top Elevation.', howToUse: 'Use the steady-state water level from a hydraulic analysis or from operating records.' },
      { name: 'Area / Shape (S/A pairs)', description: 'Cross-sectional area vs elevation pairs for non-uniform tanks.', meaning: 'For tanks with varying cross-section, multiple (elevation, area) pairs define the tank geometry. Used to accurately track volume.', howToUse: 'Enter pairs in the Flex Table schedule grid. Leave empty for a constant-area (cylindrical) tank.' },
    ],
  },
  {
    id: 'flow-bc',
    element: 'Flow BC',
    badge: 'Flow BC',
    badgeColor: 'bg-orange-500',
    properties: [
      { name: 'Label / ID', description: 'Unique alphanumeric identifier.', meaning: 'Identifies the flow boundary in the INP file and on the canvas.', howToUse: 'Use a short label such as "FBC1".' },
      { name: 'Comment', description: 'Free-text internal comment.', meaning: 'Not used in simulation.', howToUse: 'Describe the flow boundary source or purpose.' },
      { name: 'Node Number', description: 'Auto-assigned integer.', meaning: 'WHAMO engine node index.', howToUse: 'Leave as assigned.' },
      { name: 'Flow Rate (Q)', unit: 'm³/s or ft³/s', description: 'Prescribed constant flow rate injected or extracted at this node.', meaning: 'Positive Q injects flow into the network; negative Q extracts flow. Used for steady-state and fixed-flow transient scenarios.', howToUse: 'Enter the design flow rate in the active unit system. Use positive for supply, negative for demand.' },
      { name: 'Mode', description: 'Boundary condition type: Fixed Q or Q Schedule.', meaning: '"Fixed Q" holds the flow constant. "Q Schedule" varies the flow over time using a schedule table.', howToUse: 'Use Fixed Q for constant injection/extraction; use Q Schedule for pump start/stop or valve operation scenarios.' },
      { name: 'Q-Schedule #', description: 'Index of the flow-time schedule when Mode = Q Schedule.', meaning: 'References a schedule table in the Flex Table that specifies flow at each time step.', howToUse: 'Create the schedule in the Flex Table (Schedule tab) first, then enter its number here.' },
    ],
  },
  {
    id: 'pump',
    element: 'Pump',
    badge: 'Pump',
    badgeColor: 'bg-cyan-600',
    properties: [
      { name: 'Label / ID', description: 'Unique alphanumeric identifier for the pump link.', meaning: 'Identifies the pump conduit in the INP file.', howToUse: 'Use a short label such as "PMP1".' },
      { name: 'Comment', description: 'Free-text internal comment.', meaning: 'Not used in simulation.', howToUse: 'Describe the pump type, model, or duty point.' },
      { name: 'Length', unit: 'ft / m', description: 'Equivalent pipe length of the pump element.', meaning: 'Defines the hydraulic reach assigned to the pump conduit. Usually set to a small value representing the physical pump casing length.', howToUse: 'Set to the actual pump body length or a representative value (e.g. 1–5 m).' },
      { name: 'Diameter', unit: 'ft / m', description: 'Internal diameter of the pump discharge pipe.', meaning: 'Used for velocity and head-loss calculations within the pump conduit reach.', howToUse: 'Match to the discharge pipe inside diameter.' },
      { name: 'P-Char Curve (Q-H pairs)', description: 'Pump characteristic curve: at least 2 flow (Q) vs head (H) data points.', meaning: 'Defines the pump operating envelope. WHAMO interpolates between points to find the operating head at any flow rate.', howToUse: 'Enter pairs in the Flex Table (Pump tab) from shut-off head (Q=0) to maximum flow. At least 2 points required; 4–6 points recommended for accuracy.' },
      { name: 'Rated Speed', unit: 'RPM', description: 'Synchronous speed of the pump motor.', meaning: 'Used in pump trip and speed transient calculations. Required for affinity-law scaling during rundown.', howToUse: 'Enter the nameplate synchronous speed, e.g. 1450 or 1750 RPM.' },
      { name: 'Moment of Inertia (WR²)', unit: 'lb·ft² or kg·m²', description: 'Combined rotational inertia of pump and motor.', meaning: 'Governs the rate of speed rundown after a pump trip. Higher WR² = slower deceleration = smaller pressure transients.', howToUse: 'Obtain from the manufacturer datasheet. For preliminary analysis, estimate using the pump power as a guide.' },
      { name: 'Rated Flow (Q rated)', unit: 'm³/s or ft³/s', description: 'Design flow at the best-efficiency point.', meaning: 'Reference point for affinity-law scaling.', howToUse: 'Enter the BEP flow from the pump curve.' },
      { name: 'Rated Head (H rated)', unit: 'ft / m', description: 'Design head at the best-efficiency point.', meaning: 'Reference point for affinity-law scaling.', howToUse: 'Enter the BEP head from the pump curve.' },
    ],
  },
  {
    id: 'check-valve',
    element: 'Check Valve',
    badge: 'Check Valve',
    badgeColor: 'bg-red-500',
    properties: [
      { name: 'Label / ID', description: 'Unique alphanumeric identifier for the check valve link.', meaning: 'Identifies the element in the INP file.', howToUse: 'Use a short label such as "CV1".' },
      { name: 'Comment', description: 'Free-text internal comment.', meaning: 'Not used in simulation.', howToUse: 'Describe the valve type, size, or location.' },
      { name: 'Length', unit: 'ft / m', description: 'Equivalent pipe length of the check valve element.', meaning: 'The hydraulic reach assigned to this conduit. Typically small.', howToUse: 'Set to the physical valve body length.' },
      { name: 'Diameter', unit: 'ft / m', description: 'Internal diameter of the valve bore.', meaning: 'Determines velocity and head loss through the valve reach.', howToUse: 'Match to the valve nominal bore internal diameter.' },
      { name: 'Cracking Pressure', unit: 'ft / m (head)', description: 'Minimum differential head required to open the valve.', meaning: 'The valve stays closed if the differential head across it is below this threshold.', howToUse: 'Use 0 for an ideal check valve. Set a small positive value (e.g. 0.1 m) for a spring-loaded check valve.' },
      { name: 'Loss Coefficient (K)', description: 'Head-loss coefficient for flow through the open valve.', meaning: 'hL = K × V²/2g. Models the local resistance of the valve body when open.', howToUse: 'Obtain from the manufacturer (K typically 1–5 for swing check, 2–10 for lift check). Use 0 if loss is negligible.' },
    ],
  },
  {
    id: 'turbine',
    element: 'Turbine',
    badge: 'Turbine',
    badgeColor: 'bg-yellow-600',
    properties: [
      { name: 'Label / ID', description: 'Unique alphanumeric identifier for the turbine link.', meaning: 'Identifies the turbine conduit in the INP file.', howToUse: 'Use a short label such as "T1".' },
      { name: 'Comment', description: 'Free-text internal comment (c/C style).', meaning: 'Not used in simulation.', howToUse: 'Note the turbine model, rated output, or design conditions.' },
      { name: 'TCHAR Type', description: 'Turbine characteristic curve type (TYPE 1, TYPE 2, etc.).', meaning: 'Selects the set of dimensionless characteristic curves used to model turbine behaviour. TYPE 1 is the generic Francis turbine.', howToUse: 'Select the type matching your turbine. Consult the WHAMO manual for available types.' },
      { name: 'Sync Speed (SYNCSPD)', unit: 'RPM', description: 'Synchronous speed of the turbine-generator set.', meaning: 'The rated operating speed. Used in runaway and load-rejection transient calculations.', howToUse: 'Enter the nameplate synchronous speed from the generator datasheet.' },
      { name: 'WR² — Moment of Inertia', unit: 'lb·ft² or kg·m²', description: 'Combined rotational inertia of turbine, shaft, and generator.', meaning: 'Controls the rate of speed rise during load rejection. Higher WR² = slower overspeed = smaller pressure transients.', howToUse: 'Obtain from the manufacturer. For Francis turbines, a typical range is 500–5000 lb·ft².' },
      { name: 'Diameter', unit: 'ft / m', description: 'Runner diameter of the turbine.', meaning: 'Used in dimensionless specific speed calculations for the turbine characteristic curves.', howToUse: 'Enter the runner diameter from the turbine datasheet.' },
      { name: 'Mode', description: 'Operational mode: TURBGOV (governor control) or EMERGENCY (gate schedule).', meaning: 'TURBGOV simulates normal governor action during a transient. EMERGENCY uses a prescribed gate-closure schedule for shutdown scenarios.', howToUse: 'Use TURBGOV for normal load rejection with governor response. Use EMERGENCY for rapid emergency shutdown sequences.' },
      { name: 'Gate Schedule (V-Schedule)', description: 'Time vs gate-opening fraction pairs for EMERGENCY mode.', meaning: 'Prescribes the exact gate position at each time step during an emergency closure.', howToUse: 'Define in the Flex Table (Schedule tab) as (time, gate fraction) pairs starting from 1.0 (fully open) to 0.0 (fully closed). At least 2 pairs required.' },
    ],
  },
  {
    id: 'conduit',
    element: 'Conduit',
    badge: 'Conduit',
    badgeColor: 'bg-slate-600',
    properties: [
      { name: 'Label / ID', description: 'Unique alphanumeric identifier for this conduit/pipe.', meaning: 'Identifies the pipe in the INP file and the Flex Table.', howToUse: 'Auto-generated but editable, e.g. "P1", "MAIN-1".' },
      { name: 'Length (L)', unit: 'ft / m', description: 'Physical pipe length between upstream and downstream nodes.', meaning: 'The most sensitive parameter in water hammer analysis. Longer pipes = longer wave travel times = different resonance frequencies.', howToUse: 'Measure the actual pipe centreline length. Do not use horizontal plan distance for steep pipelines — use the 3D length.' },
      { name: 'Diameter (D)', unit: 'ft / m', description: 'Internal (bore) diameter of the pipe.', meaning: 'Determines flow velocity and head loss. Also used in wave speed calculation when E and WT are provided.', howToUse: 'Use the inside diameter (not nominal or outside diameter). Convert nominal sizes using standard pipe tables.' },
      { name: 'Celerity (a)', unit: 'm/s or ft/s', description: 'Pressure wave speed (acoustic velocity) in the pipe.', meaning: 'The fundamental parameter of water hammer. Governs the Joukowsky pressure rise (ΔH = aΔV/g) and wave travel time. Typical range: 200–1400 m/s.', howToUse: 'Calculate from pipe material using a=4720/√(1+(3·10⁵/E)·(D/WT)) or enter directly if known. For steel: ~1200 m/s; HDPE: ~300 m/s; concrete: ~1000 m/s.' },
      { name: 'Friction (f)', description: 'Darcy-Weisbach friction factor or Manning\'s n, depending on method selected.', meaning: 'Controls steady-state head loss and the attenuation of transient waves. Darcy-Weisbach f = dimensionless (typical 0.01–0.04); Manning n = s/m^(1/3) (typical 0.010–0.015).', howToUse: 'For new steel: f=0.015. For old cast iron: f=0.025–0.04. For HDPE: f=0.009. Alternatively enter Manning n and let WHAMO compute f = 185·n²/D^(1/3).' },
      { name: 'E (Young\'s Modulus)', unit: 'psi or Pa', description: 'Modulus of elasticity of the pipe wall material.', meaning: 'Used with WT to automatically compute wave speed. Steel ≈ 30,000,000 psi; HDPE ≈ 130,000 psi.', howToUse: 'Enter along with WT instead of specifying Celerity directly. The formula c=4720/√(1+(3·10⁵/E)·(D/WT)) is shown in the panel.' },
      { name: 'WT (Wall Thickness)', unit: 'ft / m', description: 'Pipe wall thickness.', meaning: 'Used with E to compute wave speed. Thicker walls → higher wave speed (stiffer pipe).', howToUse: 'Enter the nominal wall thickness from pipe specifications. Convert to the active unit system.' },
      { name: 'Manning\'s n', description: 'Manning\'s roughness coefficient for computing friction factor.', meaning: 'An alternative to specifying the Darcy-Weisbach f directly. WHAMO converts n to f using f=185·n²/D^(1/3).', howToUse: 'Typical values: smooth plastic 0.009, concrete 0.011–0.013, cast iron 0.012–0.015, corroded steel 0.015–0.025.' },
    ],
  },
  {
    id: 'dummy-pipe',
    element: 'Dummy Pipe',
    badge: 'Dummy Pipe',
    badgeColor: 'bg-gray-400',
    properties: [
      { name: 'Label / ID', description: 'Unique alphanumeric identifier.', meaning: 'Identifies the dummy pipe element in the INP file.', howToUse: 'Use a label such as "DP1".' },
      { name: 'Comment', description: 'Free-text internal comment.', meaning: 'Not used in simulation.', howToUse: 'Note why the dummy pipe exists, e.g. "Topology connector only — zero length".' },
      { name: 'Length', unit: 'ft / m', description: 'Nominal pipe length (typically near-zero or 1).', meaning: 'A dummy pipe is a zero-resistance connection used to satisfy topology or to connect special elements. Set length small but non-zero to avoid division-by-zero.', howToUse: 'Use the minimum value (e.g. 0.001 m or 1 ft) to keep it computationally stable.' },
      { name: 'Diameter', unit: 'ft / m', description: 'Pipe bore diameter.', meaning: 'Used for velocity calculations. Match to the adjacent pipe to minimise any numerical artefacts.', howToUse: 'Set to match the adjacent conduit diameter.' },
      { name: 'Celerity', unit: 'm/s or ft/s', description: 'Wave speed in the dummy pipe.', meaning: 'Should match the connected conduit\'s celerity. Using a very high celerity makes the dummy pipe act as a rigid link.', howToUse: 'Set equal to the adjacent conduit\'s celerity, or use 1200 m/s (steel equivalent) for a rigid connection.' },
    ],
  },
];

const PROP_FILTER_OPTIONS = [
  { value: 'all',         label: 'All Elements' },
  { value: 'reservoir',   label: 'Reservoir' },
  { value: 'node',        label: 'Node' },
  { value: 'junction',    label: 'Junction' },
  { value: 'surge-tank',  label: 'Surge Tank' },
  { value: 'flow-bc',     label: 'Flow BC' },
  { value: 'pump',        label: 'Pump' },
  { value: 'check-valve', label: 'Check Valve' },
  { value: 'turbine',     label: 'Turbine' },
  { value: 'conduit',     label: 'Conduit' },
  { value: 'dummy-pipe',  label: 'Dummy Pipe' },
];

function ElementPropCard({ id, element, badge, badgeColor, properties }: ElementProps) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-4 rounded-lg border border-slate-200 overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <span className={`inline-block text-white text-[10px] font-bold px-2 py-0.5 rounded ${badgeColor}`}>
          {badge}
        </span>
        <span className="font-semibold text-slate-700 text-sm flex-1">{element} Properties</span>
        <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="text-left px-4 py-2 font-semibold text-slate-600 border-b border-slate-200 w-[16%]">Property</th>
                <th className="text-left px-4 py-2 font-semibold text-slate-600 border-b border-slate-200 w-[9%]">Unit</th>
                <th className="text-left px-4 py-2 font-semibold text-slate-600 border-b border-slate-200 w-[25%]">Description</th>
                <th className="text-left px-4 py-2 font-semibold text-slate-600 border-b border-slate-200 w-[28%]">Meaning</th>
                <th className="text-left px-4 py-2 font-semibold text-slate-600 border-b border-slate-200 w-[22%]">How to Use</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((p, i) => (
                <tr key={p.name} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-4 py-2 font-medium text-slate-800 border-b border-slate-100 align-top">{p.name}</td>
                  <td className="px-4 py-2 text-slate-500 border-b border-slate-100 align-top whitespace-nowrap">{p.unit ?? '—'}</td>
                  <td className="px-4 py-2 text-slate-700 border-b border-slate-100 align-top">{p.description}</td>
                  <td className="px-4 py-2 text-slate-600 border-b border-slate-100 align-top">{p.meaning}</td>
                  <td className="px-4 py-2 text-slate-600 border-b border-slate-100 align-top">{p.howToUse}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AllPropertiesSection() {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? ALL_ELEMENT_PROPS : ALL_ELEMENT_PROPS.filter(e => e.id === filter);

  return (
    <>
      <SectionTitle>All Properties</SectionTitle>
      <SectionLead>
        Every configurable property for every element type — what it means, why it matters, and how to set it correctly. Use the filter to focus on a single element.
      </SectionLead>

      <FilterSelect
        label="Filter:"
        value={filter}
        options={PROP_FILTER_OPTIONS}
        onChange={setFilter}
      />

      {filtered.map(ep => (
        <ElementPropCard key={ep.id} {...ep} />
      ))}
    </>
  );
}

// ─── SECTION_CONTENT ──────────────────────────────────────────────────────────
const SECTION_CONTENT: Record<string, React.ReactNode> = {
  'getting-started':  <GettingStarted />,
  'elements':         <NetworkElements />,
  'all-properties':   <AllPropertiesSection />,
  'connections':      <Connections />,
  'flex-table':       <FlexTableSection />,
  'excel':            <ExcelSection />,
  'simulation':       <SimulationSection />,
  'files':            <FilesSection />,
  'shortcuts':        <ShortcutsSection />,
  'troubleshooting':  <TroubleshootingSection />,
};

// ─── HelpModal ────────────────────────────────────────────────────────────────
export function HelpModal({ open, onClose }: HelpModalProps) {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!open) return null;

  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    setTimeout(() => {
      try {
        downloadPDF();
      } finally {
        setIsGeneratingPdf(false);
      }
    }, 50);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex"
      data-testid="help-modal"
      style={{ fontFamily: 'Poppins, sans-serif' }}
    >
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative flex w-full h-full bg-white shadow-2xl overflow-hidden">

        {/* ── Left sidebar ── */}
        <aside className="w-[220px] flex-shrink-0 flex flex-col bg-slate-900 text-white">
          <div className="px-4 py-4 border-b border-slate-700 flex-shrink-0">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              <span className="text-[13px] font-bold" style={{ fontFamily: 'Poppins, sans-serif' }}>User Guide</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">WHAMO Network Designer</p>
          </div>
          <nav className="flex-1 overflow-y-auto py-2">
            {SECTIONS.map(sec => (
              <button
                key={sec.id}
                data-testid={`help-nav-${sec.id}`}
                onClick={() => setActiveSection(sec.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors text-[12px]',
                  activeSection === sec.id
                    ? 'bg-[#1a73e8] text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white font-medium',
                )}
              >
                <span className="flex-shrink-0 opacity-75">{sec.icon}</span>
                {sec.label}
              </button>
            ))}
          </nav>
          <div className="px-4 py-3 border-t border-slate-700 flex-shrink-0">
            <p className="text-[10px] text-slate-500">v1.0 — WHAMO ND</p>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Header bar */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">{SECTIONS.find(s => s.id === activeSection)?.icon}</span>
              <span className="text-[13px] font-semibold text-slate-700">
                {SECTIONS.find(s => s.id === activeSection)?.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                data-testid="help-download-pdf"
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-semibold transition-colors',
                  isGeneratingPdf
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-[#1a73e8] text-white hover:bg-[#1557b0] active:bg-[#0f3f8c]',
                )}
                title="Download User Manual PDF"
              >
                <FileDown className="w-3.5 h-3.5" />
                {isGeneratingPdf ? 'Generating…' : 'Download PDF'}
              </button>
              <button
                onClick={onClose}
                data-testid="help-modal-close"
                className="p-1.5 rounded hover:bg-slate-100 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-8 py-6 bg-[#fafbfc]">
            <div className="max-w-3xl">
              {SECTION_CONTENT[activeSection]}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
