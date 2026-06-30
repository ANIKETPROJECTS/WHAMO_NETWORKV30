import { WhamoNode, WhamoEdge, PcharType, TcharType } from './store';

interface ParsedTopology {
  elemLinks: Map<string, { from: string; to: string; type: 'link' }>;
  elemAt: Map<string, string>;
  junctions: Set<string>;
  nodeElevations: Map<string, number>;
}

interface ParsedElements {
  reservoirs: Map<string, { elevation: number; mode: string; hScheduleNumber?: number }>;
  conduits: Map<string, {
    length: number; diameter: number; celerity: number; friction: number;
    numseg?: number; hasAddedLoss?: boolean; cplus?: number; cminus?: number;
    variable?: boolean; distance?: number; area?: number; d?: number; a?: number;
  }>;
  pumps: Map<string, { pumpType: number; rq: number; rhead: number; rspeed: number; rtorque: number; wr2: number }>;
  turbines: Map<string, { turbineType: number; syncSpeed: number; wr2: number; turbFriction: number; windage: number; turbineDiameter?: number }>;
  oneway: Map<string, { diam: number }>;
  surgeTanks: Map<string, {
    stType: string; tankTop: number; tankBottom: number; diameter: number;
    celerity: number; friction: number;
    initialWaterLevel?: number; riserDiameter?: number; riserTop?: number;
    hasShape?: boolean; shape?: { e: number; a: number }[];
    hasAddedLoss?: boolean; cplus?: number; cminus?: number;
  }>;
  flowBCs: Map<string, { scheduleNumber: number }>;
  oppumps: Set<string>;
  opturbs: Map<string, { mode: string; vScheduleNumber?: number }>;
  pchar: Map<number, PcharType>;
  tchar: Map<number, TcharType>;
  vSchedules: Map<number, { t: number; g: number }[]>;
}

function joinContinuationLines(lines: string[]): string[] {
  const joined: string[] = [];
  let buf = '';
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('C ') || trimmed.startsWith('c ') || trimmed === 'C' || trimmed === 'c') {
      if (buf) { joined.push(buf); buf = ''; }
      continue;
    }
    if (buf) {
      buf += ' ' + trimmed;
    } else {
      buf = trimmed;
    }
    if (/\bFINISH\b/i.test(trimmed)) {
      joined.push(buf);
      buf = '';
    }
  }
  if (buf) joined.push(buf);
  return joined;
}

function parseSystemSection(lines: string[]): ParsedTopology {
  const elemLinks = new Map<string, { from: string; to: string; type: 'link' }>();
  const elemAt = new Map<string, string>();
  const junctions = new Set<string>();
  const nodeElevations = new Map<string, number>();

  for (const raw of lines) {
    const line = raw.trim();          // ← trim first so ^ anchors work on indented lines
    if (!line) continue;
    const upper = line.toUpperCase();

    // Skip comment lines (C or C followed by space)
    if (upper === 'C' || upper.startsWith('C ')) continue;

    const elemLinkMatch = line.match(/^ELEM\s+(\S+)\s+LINK\s+(\S+)\s+(\S+)/i);
    if (elemLinkMatch) {
      const [, id, from, to] = elemLinkMatch;
      if (!elemLinks.has(id)) {
        elemLinks.set(id, { from, to, type: 'link' });
      }
      continue;
    }

    const elemAtMatch = line.match(/^ELEM\s+(\S+)\s+AT\s+(\S+)/i);
    if (elemAtMatch) {
      const [, id, nodeId] = elemAtMatch;
      elemAt.set(id, nodeId);
      continue;
    }

    const junctionMatch = line.match(/^JUNCTION\s+AT\s+(\S+)/i);
    if (junctionMatch) {
      junctions.add(junctionMatch[1]);
      continue;
    }

    const nodeMatch = line.match(/^NODE\s+(\S+)\s+ELEV\s+([\-\d.]+)/i);
    if (nodeMatch) {
      nodeElevations.set(nodeMatch[1], parseFloat(nodeMatch[2]));
      continue;
    }
  }

  return { elemLinks, elemAt, junctions, nodeElevations };
}

function parseFloat2(s: string | undefined): number {
  if (!s) return 0;
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseElementProperties(lines: string[]): ParsedElements {
  const reservoirs = new Map<string, { elevation: number; mode: string; hScheduleNumber?: number }>();
  const conduits = new Map<string, any>();
  const pumps = new Map<string, any>();
  const turbines = new Map<string, any>();
  const oneway = new Map<string, { diam: number }>();
  const surgeTanks = new Map<string, any>();
  const flowBCs = new Map<string, { scheduleNumber: number }>();
  const oppumps = new Set<string>();
  const opturbs = new Map<string, { mode: string; vScheduleNumber?: number }>();
  const pchar = new Map<number, PcharType>();
  const tchar = new Map<number, TcharType>();
  const vSchedules = new Map<number, { t: number; g: number }[]>();

  const joined = joinContinuationLines(lines);

  let inPchar = false;
  let pcharType = 0;
  let pcharSection: 'none' | 'sratio' | 'qratio' | 'hratio' | 'tratio' = 'none';
  let pcharBuf: { sratio: number[]; qratio: number[]; hratio: number[][]; tratio: number[] } = {
    sratio: [], qratio: [], hratio: [], tratio: []
  };
  let hratioRow: number[] = [];

  let inTchar = false;
  let tcharType = 0;
  let tcharSection: 'none' | 'gate' | 'head' | 'qmatrix' | 'efficiency' = 'none';
  let tcharBuf: { gate: number[]; head: number[]; qMatrix: number[][]; effMatrix: number[][] } = {
    gate: [], head: [], qMatrix: [], effMatrix: []
  };

  const flushTchar = () => {
    if (tcharType > 0 && tcharBuf.gate.length > 0) {
      tchar.set(tcharType, {
        gate: [...tcharBuf.gate],
        head: [...tcharBuf.head],
        qMatrix: tcharBuf.qMatrix.map(r => [...r]),
        effMatrix: tcharBuf.effMatrix.map(r => [...r]),
      });
    }
    tcharBuf = { gate: [], head: [], qMatrix: [], effMatrix: [] };
    tcharSection = 'none';
    inTchar = false;
    tcharType = 0;
  };

  const flushPchar = () => {
    if (hratioRow.length > 0) {
      pcharBuf.hratio.push([...hratioRow]);
      hratioRow = [];
    }
    if (pcharType > 0 && pcharBuf.sratio.length > 0) {
      pchar.set(pcharType, {
        sratio: [...pcharBuf.sratio],
        qratio: [...pcharBuf.qratio],
        hratio: pcharBuf.hratio.map(r => [...r]),
        tratio: [...pcharBuf.tratio]
      });
    }
    pcharBuf = { sratio: [], qratio: [], hratio: [], tratio: [] };
    hratioRow = [];
    pcharSection = 'none';
    inPchar = false;
    pcharType = 0;
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const upper = trimmed.toUpperCase();

    if (inTchar) {
      if (/^FINISH\b/i.test(upper)) {
        flushTchar();
        continue;
      }
      if (/^TCHAR\s+TYPE\s+(\d+)/i.test(upper)) {
        flushTchar();
        inTchar = true;
        const m2 = trimmed.match(/^TCHAR\s+TYPE\s+(\d+)/i);
        tcharType = parseInt(m2![1]);
        tcharSection = 'none';
        continue;
      }
      if (/^GATE\b/i.test(upper)) { tcharSection = 'gate'; continue; }
      if (/^HEAD\b/i.test(upper)) { tcharSection = 'head'; continue; }
      if (/^QMATRIX\b/i.test(upper) || /^Q\b/i.test(upper)) { tcharSection = 'qmatrix'; continue; }
      if (/^EFFICIENCY\b/i.test(upper)) { tcharSection = 'efficiency'; continue; }
      const numsT = trimmed.split(/\s+/).map(parseFloat).filter(n => !isNaN(n));
      if (numsT.length > 0) {
        if (tcharSection === 'gate') tcharBuf.gate.push(...numsT);
        else if (tcharSection === 'head') tcharBuf.head.push(...numsT);
        else if (tcharSection === 'qmatrix') tcharBuf.qMatrix.push(numsT);
        else if (tcharSection === 'efficiency') tcharBuf.effMatrix.push(numsT);
      }
      continue;
    }

    if (inPchar) {
      if (/^FINISH\b/i.test(upper)) {
        flushPchar();
        continue;
      }

      if (/^PCHAR\s+TYPE\s+(\d+)/i.test(upper)) {
        flushPchar();
        inPchar = true;
        const m2 = trimmed.match(/^PCHAR\s+TYPE\s+(\d+)/i);
        pcharType = parseInt(m2![1]);
        pcharSection = 'none';
        continue;
      }

      if (/^SRATIO\b/i.test(upper)) { pcharSection = 'sratio'; continue; }
      if (/^QRATIO\b/i.test(upper)) { pcharSection = 'qratio'; continue; }
      if (/^HRATIO\b/i.test(upper)) {
        pcharSection = 'hratio';
        if (hratioRow.length > 0) {
          pcharBuf.hratio.push([...hratioRow]);
          hratioRow = [];
        }
        continue;
      }
      if (/^TRATIO\b/i.test(upper)) {
        if (hratioRow.length > 0) {
          pcharBuf.hratio.push([...hratioRow]);
          hratioRow = [];
        }
        pcharSection = 'tratio';
        continue;
      }

      const nums = trimmed.split(/\s+/).map(parseFloat).filter(n => !isNaN(n));
      if (nums.length > 0) {
        if (pcharSection === 'sratio') pcharBuf.sratio.push(...nums);
        else if (pcharSection === 'qratio') pcharBuf.qratio.push(...nums);
        else if (pcharSection === 'hratio') {
          if (nums.length >= 10) {
            if (hratioRow.length > 0) pcharBuf.hratio.push([...hratioRow]);
            hratioRow = [...nums];
          } else {
            hratioRow.push(...nums);
          }
        }
        else if (pcharSection === 'tratio') pcharBuf.tratio.push(...nums);
      }
      continue;
    }

    if (/^PCHAR\s+TYPE\s+(\d+)/i.test(trimmed)) {
      const m = trimmed.match(/^PCHAR\s+TYPE\s+(\d+)/i);
      pcharType = parseInt(m![1]);
      inPchar = true;
      pcharSection = 'none';
      pcharBuf = { sratio: [], qratio: [], hratio: [], tratio: [] };
      continue;
    }

    if (/^TCHAR\s+TYPE\s+(\d+)/i.test(trimmed)) {
      const m = trimmed.match(/^TCHAR\s+TYPE\s+(\d+)/i);
      tcharType = parseInt(m![1]);
      inTchar = true;
      tcharSection = 'none';
      tcharBuf = { gate: [], head: [], qMatrix: [], effMatrix: [] };
      continue;
    }

    if (/^TURBINE\b/i.test(upper)) {
      const fullLine = [trimmed];
      for (let j = i + 1; j < lines.length; j++) {
        const ln = lines[j].trim();
        if (!ln) continue;
        if (/^FINISH\b/i.test(ln)) { fullLine.push(ln); i = j; break; }
        if (/^RESERVOIR\b|^CONDUIT\b|^PUMP\b|^TURBINE\b|^ONEWAY\b|^PCHAR\b|^TCHAR\b|^OPPUMP\b|^OPTURB\b/i.test(ln)) { i = j - 1; break; }
        fullLine.push(ln);
      }
      const combined = fullLine.join(' ');
      const idM = combined.match(/\bID\s+(\S+)/i);
      const typeM = combined.match(/\bTYPE\s+(\d+)/i);
      const rspeedM = combined.match(/\b(?:RSPEED|SYNCSPD)\s+([\-\d.]+)/i);
      const wr2M = combined.match(/\bWR2\s+([\-\d.]+)/i);
      const fricM = combined.match(/\bFRICTION\s+([\-\d.]+)/i);
      const windM = combined.match(/\bWINDAGE\s+([\-\d.]+)/i);
      const turbDiamM = combined.match(/\bDIAMETER\s+([\-\d.]+)/i);
      if (idM) {
        turbines.set(idM[1], {
          turbineType: typeM ? parseInt(typeM[1]) : 1,
          syncSpeed: rspeedM ? parseFloat(rspeedM[1]) : 0,
          wr2: wr2M ? parseFloat(wr2M[1]) : 0,
          turbFriction: fricM ? parseFloat(fricM[1]) : 0,
          windage: windM ? parseFloat(windM[1]) : 0,
          turbineDiameter: turbDiamM ? parseFloat(turbDiamM[1]) : undefined,
        });
      }
      continue;
    }

    if (/^OPTURB\b/i.test(upper)) {
      // Collect all lines up to FINISH into one combined string
      const block = [trimmed];
      for (let j = i + 1; j < lines.length; j++) {
        const ln = lines[j].trim();
        if (!ln) continue;
        if (/^FINISH\b/i.test(ln)) { i = j; break; }
        if (/^OPTURB\b|^OPPUMP\b|^SCHEDULE\b|^HISTORY\b|^CONTROL\b|^DISPLAY\b/i.test(ln)) { i = j - 1; break; }
        block.push(ln);
      }
      const combined = block.join(' ');
      const idM = combined.match(/\bID\s+(\S+)/i);
      if (idM) {
        const modeM = combined.match(/\b(GENERATE|TURBGOV|EMERGENCY|TURBINE)\b/i);
        const mode = modeM ? modeM[1].toUpperCase() : 'TURBINE';
        const vSchedM = combined.match(/\bVSCHEDULE\s+(\d+)/i);
        const vSchedNum = vSchedM ? parseInt(vSchedM[1]) : undefined;
        opturbs.set(idM[1], { mode, vScheduleNumber: vSchedNum });
      }
      continue;
    }

    if (/^SCHEDULE\b.*\bVSCHEDULE\b/i.test(upper)) {
      const numM = trimmed.match(/\bVSCHEDULE\s+(\d+)/i);
      if (numM) {
        const schedNum = parseInt(numM[1]);
        const pts: { t: number; g: number }[] = [];
        const tgMatches = trimmed.matchAll(/\bT\s+([\d.]+)\s+G\s+([\d.]+)/gi);
        for (const m of tgMatches) {
          pts.push({ t: parseFloat(m[1]), g: parseFloat(m[2]) });
        }
        if (pts.length === 0) {
          for (let j = i + 1; j < lines.length; j++) {
            const ln = lines[j].trim();
            if (!ln || /^FINISH\b/i.test(ln)) { i = j; break; }
            const tgInline = ln.matchAll(/\bT\s+([\d.]+)\s+G\s+([\d.]+)/gi);
            for (const m of tgInline) pts.push({ t: parseFloat(m[1]), g: parseFloat(m[2]) });
          }
        }
        vSchedules.set(schedNum, pts);
      }
      continue;
    }

    if (/^RESERVOIR\b/i.test(upper)) {
      let id = '';
      let elevation = 0;
      let mode: 'fixed' | 'schedule' = 'fixed';
      let hScheduleNumber: number | undefined;

      for (let j = i + 1; j < lines.length; j++) {
        const ln = lines[j].trim();
        if (!ln) continue;
        if (/^FINISH\b/i.test(ln)) { i = j; break; }
        if (/^RESERVOIR\b|^CONDUIT\b|^PUMP\b|^ONEWAY\b|^PCHAR\b|^OPPUMP\b/i.test(ln)) { i = j - 1; break; }
        const idM = ln.match(/\bID\s+(\S+)/i);
        if (idM) id = idM[1];
        const elevM = ln.match(/\bELEV\s+([\-\d.]+)/i);
        if (elevM) elevation = parseFloat(elevM[1]);
        const hschedM = ln.match(/\bHSCHEDULE\s+(\d+)/i);
        if (hschedM) { hScheduleNumber = parseInt(hschedM[1]); mode = 'schedule'; }
      }
      if (id) {
        reservoirs.set(id, { elevation, mode, hScheduleNumber });
      }
      continue;
    }

    if (/^CONDUIT\b/i.test(upper)) {
      let id = '';
      let length = 0, diameter = 0, celerity = 0, friction = 0, numseg: number | undefined;
      let hasAddedLoss = false, cplus = 0, cminus = 0;
      let variable = false;
      let distance: number | undefined, area: number | undefined, d: number | undefined, a: number | undefined;

      const fullLine = [trimmed];
      for (let j = i + 1; j < lines.length; j++) {
        const ln = lines[j].trim();
        if (!ln) continue;
        if (/^FINISH\b/i.test(ln)) {
          fullLine.push(ln);
          i = j;
          break;
        }
        if (/^RESERVOIR\b|^CONDUIT\b|^PUMP\b|^ONEWAY\b|^PCHAR\b|^OPPUMP\b/i.test(ln)) {
          i = j - 1;
          break;
        }
        fullLine.push(ln);
      }
      const combined = fullLine.join(' ');

      const idM = combined.match(/\bID\s+(\S+)/i);
      if (idM) id = idM[1];
      if (/\bDUMMY\b/i.test(combined)) {
        const diamM = combined.match(/\bDIAM(?:ETER)?\s+([\-\d.]+)/i);
        const cplM = combined.match(/\bCPLUS\s+([\-\d.]+)/i);
        const cmM = combined.match(/\bCMINUS\s+([\-\d.]+)/i);
        conduits.set(id, {
          dummy: true,
          diameter: diamM ? parseFloat(diamM[1]) : 0,
          cplus: cplM ? parseFloat(cplM[1]) : 0,
          cminus: cmM ? parseFloat(cmM[1]) : 0,
        });
        continue;
      }
      const lenM = combined.match(/\bLEN(?:GTH)?\s+([\-\d.]+)/i);
      if (lenM) length = parseFloat(lenM[1]);
      const diamM = combined.match(/\bDIAM(?:ETER)?\s+([\-\d.]+)/i);
      if (diamM) diameter = parseFloat(diamM[1]);
      const celM = combined.match(/\bCEL(?:ERITY)?\s+([\-\d.]+)/i);
      if (celM) celerity = parseFloat(celM[1]);
      const fricM = combined.match(/\bFRIC(?:TION)?\s+([\-\d.]+)/i);
      if (fricM) friction = parseFloat(fricM[1]);
      const segM = combined.match(/\bNUMSEG\s+(\d+)/i);
      if (segM) numseg = parseInt(segM[1]);
      if (/\bADDEDLOSS\b/i.test(combined)) {
        hasAddedLoss = true;
        const cplM2 = combined.match(/\bCPLUS\s+([\-\d.e+]+)/i);
        const cmM2 = combined.match(/\bCMINUS\s+([\-\d.e+]+)/i);
        if (cplM2) cplus = parseFloat(cplM2[1]);
        if (cmM2) cminus = parseFloat(cmM2[1]);
      }
      if (/\bVARIABLE\b/i.test(combined)) {
        variable = true;
        const dM = combined.match(/\bDISTANCE\s+([\-\d.]+)/i);
        if (dM) distance = parseFloat(dM[1]);
        const aM = combined.match(/\bAREA\s+([\-\d.]+)/i);
        if (aM) area = parseFloat(aM[1]);
        const dfield = combined.match(/\b D\s+([\-\d.]+)/i);
        if (dfield) d = parseFloat(dfield[1]);
        const afield = combined.match(/\b A\s+([\-\d.]+)/i);
        if (afield) a = parseFloat(afield[1]);
      }
      if (id) {
        conduits.set(id, {
          length, diameter, celerity, friction,
          numseg, hasAddedLoss, cplus, cminus,
          variable, distance, area, d, a
        });
      }
      continue;
    }

    if (/^PUMP\b/i.test(upper) && !/^PCHAR\b/i.test(upper)) {
      const fullLine = [trimmed];
      for (let j = i + 1; j < lines.length; j++) {
        const ln = lines[j].trim();
        if (!ln) continue;
        if (/^FINISH\b/i.test(ln)) {
          fullLine.push(ln);
          i = j;
          break;
        }
        if (/^RESERVOIR\b|^CONDUIT\b|^PUMP\b|^ONEWAY\b|^PCHAR\b|^OPPUMP\b/i.test(ln)) {
          i = j - 1;
          break;
        }
        fullLine.push(ln);
      }
      const combined = fullLine.join(' ');
      const idM = combined.match(/\bID\s+(\S+)/i);
      const typeM = combined.match(/\bTYPE\s+(\d+)/i);
      const rqM = combined.match(/\bRQ\s+([\-\d.]+)/i);
      const rheadM = combined.match(/\bRHEAD\s+([\-\d.]+)/i);
      const rspeedM = combined.match(/\bRSPEED\s+([\-\d.]+)/i);
      const rtorqueM = combined.match(/\bRTOROUE\s+([\-\d.]+)/i) || combined.match(/\bRTORQUE\s+([\-\d.]+)/i);
      const wr2M = combined.match(/\bWR2\s+([\-\d.]+)/i);
      if (idM) {
        pumps.set(idM[1], {
          pumpType: typeM ? parseInt(typeM[1]) : 1,
          rq: rqM ? parseFloat(rqM[1]) : 0,
          rhead: rheadM ? parseFloat(rheadM[1]) : 0,
          rspeed: rspeedM ? parseFloat(rspeedM[1]) : 0,
          rtorque: rtorqueM ? parseFloat(rtorqueM[1]) : 0,
          wr2: wr2M ? parseFloat(wr2M[1]) : 0,
        });
      }
      continue;
    }

    if (/^ONEWAY\b/i.test(upper)) {
      const block = [trimmed];
      for (let j = i + 1; j < lines.length; j++) {
        const ln = lines[j].trim();
        if (!ln) continue;
        if (/^FINISH\b/i.test(ln)) { i = j; break; }
        if (/^RESERVOIR\b|^CONDUIT\b|^PUMP\b|^ONEWAY\b|^TURBINE\b|^SURGETANK\b|^FLOWBC\b/i.test(ln)) { i = j - 1; break; }
        block.push(ln);
      }
      const combined = block.join(' ');
      const idM = combined.match(/\bID\s+(\S+)/i);
      const diamM = combined.match(/\bDIAM(?:ETER)?\s+([\-\d.]+)/i);
      if (idM) {
        oneway.set(idM[1], { diam: diamM ? parseFloat(diamM[1]) : 0 });
      }
      continue;
    }

    if (/^SURGETANK\b/i.test(upper)) {
      const block = [trimmed];
      const rawBlock: string[] = [trimmed];
      for (let j = i + 1; j < lines.length; j++) {
        const ln = lines[j].trim();
        if (!ln) continue;
        if (/^FINISH\b/i.test(ln)) { i = j; break; }
        if (/^RESERVOIR\b|^CONDUIT\b|^PUMP\b|^TURBINE\b|^SURGETANK\b|^FLOWBC\b|^OPPUMP\b|^OPTURB\b/i.test(ln)) { i = j - 1; break; }
        block.push(ln);
        rawBlock.push(ln);
      }
      const combined = block.join(' ');
      const idM = combined.match(/\bID\s+(\S+)/i);
      if (idM) {
        const stTypeM = combined.match(/\b(DIFFERENTIAL|AIRTANK|SIMPLE)\b/i);
        const topM = combined.match(/\bELTOP\s+([\-\d.]+)/i);
        const botM = combined.match(/\bELBOTTOM\s+([\-\d.]+)/i);
        const diamM = combined.match(/\bDIAM(?:ETER)?\s+([\-\d.]+)/i);
        const celM = combined.match(/\bCEL(?:ERITY)?\s+([\-\d.]+)/i);
        const fricM = combined.match(/\bFRIC(?:TION)?\s+([\-\d.]+)/i);
        const htankM = combined.match(/\bHTANK\s+([\-\d.]+)/i);
        const riserDiamM = combined.match(/\bRISERDIAM\s+([\-\d.]+)/i);
        const riserTopM = combined.match(/\bRISERTOP\s+([\-\d.]+)/i);
        const hasAddedLoss = /\bADDEDLOSS\b/i.test(combined);
        const cplusM = combined.match(/\bCPLUS\s+([\-\d.e+]+)/i);
        const cminusM = combined.match(/\bCMINUS\s+([\-\d.e+]+)/i);
        // Parse SHAPE E/A pairs
        let hasShape = false;
        const shape: { e: number; a: number }[] = [];
        if (/\bSHAPE\b/i.test(combined)) {
          hasShape = true;
          const eVals = [...combined.matchAll(/\bE\s+([\-\d.]+)/gi)].map(m => parseFloat(m[1]));
          const aVals = [...combined.matchAll(/\bA\s+([\-\d.]+)/gi)].map(m => parseFloat(m[1]));
          const pairCount = Math.min(eVals.length, aVals.length);
          for (let p = 0; p < pairCount; p++) shape.push({ e: eVals[p], a: aVals[p] });
        }
        surgeTanks.set(idM[1], {
          stType: stTypeM ? stTypeM[1].toUpperCase() : 'SIMPLE',
          tankTop: topM ? parseFloat(topM[1]) : 0,
          tankBottom: botM ? parseFloat(botM[1]) : 0,
          diameter: diamM ? parseFloat(diamM[1]) : 0,
          celerity: celM ? parseFloat(celM[1]) : 0,
          friction: fricM ? parseFloat(fricM[1]) : 0,
          initialWaterLevel: htankM ? parseFloat(htankM[1]) : undefined,
          riserDiameter: riserDiamM ? parseFloat(riserDiamM[1]) : undefined,
          riserTop: riserTopM ? parseFloat(riserTopM[1]) : undefined,
          hasShape, shape: hasShape ? shape : undefined,
          hasAddedLoss, cplus: cplusM ? parseFloat(cplusM[1]) : 0,
          cminus: cminusM ? parseFloat(cminusM[1]) : 0,
        });
      }
      continue;
    }

    if (/^FLOWBC\b|^FLOWBOUNDARY\b/i.test(upper)) {
      const block = [trimmed];
      for (let j = i + 1; j < lines.length; j++) {
        const ln = lines[j].trim();
        if (!ln) continue;
        if (/^FINISH\b/i.test(ln)) { i = j; break; }
        if (/^RESERVOIR\b|^CONDUIT\b|^PUMP\b|^TURBINE\b|^SURGETANK\b|^FLOWBC\b|^OPPUMP\b|^OPTURB\b/i.test(ln)) { i = j - 1; break; }
        block.push(ln);
      }
      const combined = block.join(' ');
      const idM = combined.match(/\bID\s+(\S+)/i);
      const qschedM = combined.match(/\bQSCHEDULE\s+(\d+)/i);
      if (idM) {
        flowBCs.set(idM[1], { scheduleNumber: qschedM ? parseInt(qschedM[1]) : 1 });
      }
      continue;
    }

    if (/^OPPUMP\b/i.test(upper)) {
      const idM = trimmed.match(/\bID\s+(\S+)/i);
      if (idM) oppumps.add(idM[1]);
      continue;
    }
  }

  if (inPchar) {
    flushPchar();
  }
  if (inTchar) {
    flushTchar();
  }

  return { reservoirs, conduits, pumps, turbines, oneway, surgeTanks, flowBCs, oppumps, opturbs, pchar, tchar, vSchedules };
}

/**
 * Scan raw .inp lines and build two comment maps:
 *   nodeComments    — nodeId   → comment text immediately preceding that NODE line
 *   elementComments — elemId   → comment text immediately preceding that element block
 * A "pending" comment is cleared when any non-comment, non-blank line consumes it
 * or when an unrelated line intervenes.
 */
function extractComments(rawLines: string[]): {
  nodeComments: Map<string, string>;
  elementComments: Map<string, string>;
} {
  const nodeComments = new Map<string, string>();
  const elementComments = new Map<string, string>();
  let pendingComment = '';

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();

    // Blank line — preserve pending comment (comments may have a blank separator)
    if (!line) continue;

    // Comment line — capture text after the leading "c"/"C"
    if (/^[cC](\s|$)/.test(line)) {
      const text = line.replace(/^[cC]\s*/, '').trim();
      if (text) pendingComment = text;
      continue;
    }

    // NODE X ELEV Y in the SYSTEM section
    const nodeM = line.match(/^NODE\s+(\S+)\s+ELEV/i);
    if (nodeM) {
      if (pendingComment) { nodeComments.set(nodeM[1], pendingComment); }
      pendingComment = '';
      continue;
    }

    // Element block keyword (RESERVOIR / CONDUIT / PUMP / TURBINE / ONEWAY / SURGETNK / FLOWBC)
    if (/^(?:RESERVOIR|CONDUIT|PUMP|TURBINE|ONEWAY|SURGETNK|FLOWBC)\b/i.test(line)) {
      if (pendingComment) {
        // Check for inline ID first
        const inlineId = line.match(/\bID\s+(\S+)/i);
        if (inlineId) {
          elementComments.set(inlineId[1], pendingComment);
        } else {
          // Look ahead for "ID <name>" line
          for (let j = i + 1; j < rawLines.length; j++) {
            const next = rawLines[j].trim();
            if (!next) continue;
            if (/^FINISH\b/i.test(next) || /^[cC](\s|$)/.test(next)) break;
            const idM = next.match(/^ID\s+(\S+)/i);
            if (idM) { elementComments.set(idM[1], pendingComment); break; }
            break; // any other non-blank line stops the search
          }
        }
      }
      pendingComment = '';
      continue;
    }

    // Any other substantive line — clear pending comment
    pendingComment = '';
  }

  return { nodeComments, elementComments };
}

function buildReactFlowGraph(
  topo: ParsedTopology,
  elems: ParsedElements,
  projectName: string,
  nodeComments: Map<string, string> = new Map(),
  elementComments: Map<string, string> = new Map()
): { nodes: WhamoNode[]; edges: WhamoEdge[]; pcharData: Record<number, PcharType>; tcharData: Record<number, TcharType>; vSchedules: Record<number, { t: number; g: number }[]> } {
  const { elemLinks, elemAt, junctions, nodeElevations } = topo;
  const { reservoirs, conduits, pumps, turbines, oneway, oppumps, opturbs, surgeTanks, flowBCs } = elems;

  let rfIdCounter = 1;
  const nextId = () => String(rfIdCounter++);

  const nodeIdMap = new Map<string, string>();
  const nodeObjects: WhamoNode[] = [];
  const edgeObjects: WhamoEdge[] = [];

  const posMap = new Map<string, { x: number; y: number }>();

  const allWhamoNodeIds = new Set<string>();
  elemLinks.forEach(({ from, to }) => { allWhamoNodeIds.add(from); allWhamoNodeIds.add(to); });
  elemAt.forEach((nodeId) => allWhamoNodeIds.add(nodeId));
  nodeElevations.forEach((_, nodeId) => allWhamoNodeIds.add(nodeId));

  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  allWhamoNodeIds.forEach(id => { adjacency.set(id, []); inDegree.set(id, 0); });

  elemLinks.forEach(({ from, to }) => {
    adjacency.get(from)?.push(to);
    inDegree.set(to, (inDegree.get(to) ?? 0) + 1);
  });

  const sources = [...allWhamoNodeIds].filter(id => (inDegree.get(id) ?? 0) === 0);
  if (sources.length === 0 && allWhamoNodeIds.size > 0) sources.push([...allWhamoNodeIds][0]);

  const posX = new Map<string, number>();
  const posY = new Map<string, number>();
  const visited = new Set<string>();
  let maxCol = 0;
  const colCount = new Map<number, number>();

  const bfs = (start: string, startX: number, startY: number) => {
    const queue: Array<{ id: string; x: number; y: number }> = [{ id: start, x: startX, y: startY }];
    while (queue.length > 0) {
      const { id, x, y } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      posX.set(id, x);
      posY.set(id, y);
      maxCol = Math.max(maxCol, x);
      const neighbors = adjacency.get(id) || [];
      let ny = y;
      for (const nb of neighbors) {
        if (!visited.has(nb)) {
          const col = x + 1;
          const cnt = colCount.get(col) ?? 0;
          colCount.set(col, cnt + 1);
          queue.push({ id: nb, x: col, y: ny });
          ny += 1;
        }
      }
    }
  };

  let startY = 0;
  for (const src of sources) {
    if (!visited.has(src)) {
      bfs(src, 0, startY);
      startY += 3;
    }
  }

  for (const id of allWhamoNodeIds) {
    if (!visited.has(id)) {
      posX.set(id, maxCol + 1);
      posY.set(id, startY++);
    }
  }

  const SPACING_X = 220;
  const SPACING_Y = 160;

  const getPos = (whamoId: string) => ({
    x: (posX.get(whamoId) ?? 0) * SPACING_X + 80,
    y: (posY.get(whamoId) ?? 0) * SPACING_Y + 80,
  });

  const getOrCreateWhamoNode = (whamoId: string): string => {
    if (nodeIdMap.has(whamoId)) return nodeIdMap.get(whamoId)!;
    // Node was not pre-created — figure out what type it is
    const rfId = nextId();
    nodeIdMap.set(whamoId, rfId);
    const elev = nodeElevations.get(whamoId) ?? 0;
    const pos = getPos(whamoId);
    const nodeNum = parseInt(whamoId) || nodeObjects.length + 1;
    const isJunction = junctions.has(whamoId);

    // Find if any element is declared AT this node
    const atElemId = [...elemAt.entries()].find(([, nid]) => nid === whamoId)?.[0];

    if (atElemId && reservoirs.has(atElemId)) {
      const r = reservoirs.get(atElemId)!;
      nodeObjects.push({
        id: rfId, type: 'reservoir', position: pos,
        data: { label: atElemId, type: 'reservoir', nodeNumber: nodeNum, elevation: elev,
          reservoirElevation: r.elevation || elev, mode: r.mode as any, hScheduleNumber: r.hScheduleNumber,
          comment: elementComments.get(atElemId) }
      });
    } else if (atElemId && surgeTanks.has(atElemId)) {
      const st = surgeTanks.get(atElemId)!;
      nodeObjects.push({
        id: rfId, type: 'surgeTank', position: pos,
        data: { label: atElemId, type: 'surgeTank', nodeNumber: nodeNum, elevation: elev,
          tankTop: st.tankTop, tankBottom: st.tankBottom, diameter: st.diameter,
          celerity: st.celerity, friction: st.friction, type_st: st.stType,
          initialWaterLevel: st.initialWaterLevel, riserDiameter: st.riserDiameter, riserTop: st.riserTop,
          hasShape: st.hasShape, shape: st.shape,
          hasAddedLoss: st.hasAddedLoss, cplus: st.cplus, cminus: st.cminus,
          comment: elementComments.get(atElemId) }
      });
    } else if (atElemId && flowBCs.has(atElemId)) {
      const fb = flowBCs.get(atElemId)!;
      nodeObjects.push({
        id: rfId, type: 'flowBoundary', position: pos,
        data: { label: atElemId, type: 'flowBoundary', nodeNumber: nodeNum, elevation: elev,
          scheduleNumber: fb.scheduleNumber,
          comment: elementComments.get(atElemId) }
      });
    } else if (atElemId && turbines.has(atElemId)) {
      const t = turbines.get(atElemId)!;
      const opInfo = opturbs.get(atElemId);
      nodeObjects.push({
        id: rfId, type: 'turbine', position: pos,
        data: { label: atElemId, type: 'turbine', nodeNumber: nodeNum, elevation: elev,
          turbineType: t.turbineType, syncSpeed: t.syncSpeed, wr2: t.wr2,
          turbFriction: t.turbFriction, windage: t.windage, turbineDiameter: t.turbineDiameter,
          operationMode: opInfo?.mode || 'TURBINE', vScheduleNumber: opInfo?.vScheduleNumber ?? 1,
          comment: elementComments.get(atElemId) }
      });
    } else if (atElemId && pumps.has(atElemId)) {
      const p = pumps.get(atElemId)!;
      const status = oppumps.has(atElemId) ? 'ACTIVE' : 'INACTIVE';
      nodeObjects.push({
        id: rfId, type: 'pump', position: pos,
        data: { label: atElemId, type: 'pump', nodeNumber: nodeNum, elevation: elev,
          pumpStatus: status, pumpType: p.pumpType, rq: p.rq, rhead: p.rhead,
          rspeed: p.rspeed, rtorque: p.rtorque, wr2: p.wr2,
          comment: elementComments.get(atElemId) }
      });
    } else if (atElemId && oneway.has(atElemId)) {
      const vc = oneway.get(atElemId)!;
      nodeObjects.push({
        id: rfId, type: 'checkValve', position: pos,
        data: { label: atElemId, type: 'checkValve', nodeNumber: nodeNum, elevation: elev,
          valveStatus: 'OPEN', valveDiam: vc.diam,
          comment: elementComments.get(atElemId) }
      });
    } else {
      nodeObjects.push({
        id: rfId,
        type: isJunction ? 'junction' : 'node',
        position: pos,
        data: {
          label: `Node ${whamoId}`,
          type: isJunction ? 'junction' : 'node',
          nodeNumber: nodeNum,
          elevation: elev,
          comment: nodeComments.get(whamoId),
        }
      });
    }
    return rfId;
  };

  // ── Pre-pass: create ALL node-attached elements BEFORE processing links ──
  // Order matters: create each element type so that when ELEM C1 LINK N1 N2
  // calls getOrCreateWhamoNode('N1'), the node is already typed correctly.

  // Reservoirs AT nodes
  elemAt.forEach((nodeId, elemId) => {
    if (!reservoirs.has(elemId)) return;
    if (nodeIdMap.has(nodeId)) return;
    const r = reservoirs.get(elemId)!;
    const rfId = nextId();
    nodeIdMap.set(nodeId, rfId);
    const elev = nodeElevations.get(nodeId) ?? 0;
    const pos = getPos(nodeId);
    const nodeNum = parseInt(nodeId) || nodeObjects.length + 1;
    nodeObjects.push({
      id: rfId,
      type: 'reservoir',
      position: pos,
      data: {
        label: elemId,
        type: 'reservoir',
        nodeNumber: nodeNum,
        elevation: elev,
        reservoirElevation: r.elevation || elev,
        mode: r.mode as any,
        hScheduleNumber: r.hScheduleNumber,
        comment: elementComments.get(elemId),
      }
    });
  });

  // Surge Tanks AT nodes
  elemAt.forEach((nodeId, elemId) => {
    if (!surgeTanks.has(elemId)) return;
    if (nodeIdMap.has(nodeId)) return;
    const st = surgeTanks.get(elemId)!;
    const rfId = nextId();
    nodeIdMap.set(nodeId, rfId);
    const elev = nodeElevations.get(nodeId) ?? 0;
    const pos = getPos(nodeId);
    const nodeNum = parseInt(nodeId) || nodeObjects.length + 1;
    nodeObjects.push({
      id: rfId,
      type: 'surgeTank',
      position: pos,
      data: {
        label: elemId,
        type: 'surgeTank',
        nodeNumber: nodeNum,
        elevation: elev,
        tankTop: st.tankTop,
        tankBottom: st.tankBottom,
        diameter: st.diameter,
        celerity: st.celerity,
        friction: st.friction,
        type_st: st.stType,
        initialWaterLevel: st.initialWaterLevel,
        riserDiameter: st.riserDiameter,
        riserTop: st.riserTop,
        hasShape: st.hasShape,
        shape: st.shape,
        hasAddedLoss: st.hasAddedLoss,
        cplus: st.cplus,
        cminus: st.cminus,
        comment: elementComments.get(elemId),
      }
    });
  });

  // Flow Boundaries AT nodes
  elemAt.forEach((nodeId, elemId) => {
    if (!flowBCs.has(elemId)) return;
    if (nodeIdMap.has(nodeId)) return;
    const fb = flowBCs.get(elemId)!;
    const rfId = nextId();
    nodeIdMap.set(nodeId, rfId);
    const elev = nodeElevations.get(nodeId) ?? 0;
    const pos = getPos(nodeId);
    const nodeNum = parseInt(nodeId) || nodeObjects.length + 1;
    nodeObjects.push({
      id: rfId,
      type: 'flowBoundary',
      position: pos,
      data: {
        label: elemId,
        type: 'flowBoundary',
        nodeNumber: nodeNum,
        elevation: elev,
        scheduleNumber: fb.scheduleNumber,
        comment: elementComments.get(elemId),
      }
    });
  });

  // Turbines AT nodes
  elemAt.forEach((nodeId, elemId) => {
    if (!turbines.has(elemId)) return;
    if (nodeIdMap.has(nodeId)) return;
    const t = turbines.get(elemId)!;
    const rfId = nextId();
    nodeIdMap.set(nodeId, rfId);
    const elev = nodeElevations.get(nodeId) ?? 0;
    const pos = getPos(nodeId);
    const nodeNum = parseInt(nodeId) || nodeObjects.length + 1;
    const opInfo = opturbs.get(elemId);
    nodeObjects.push({
      id: rfId,
      type: 'turbine',
      position: pos,
      data: {
        label: elemId,
        type: 'turbine',
        nodeNumber: nodeNum,
        elevation: elev,
        turbineType: t.turbineType,
        syncSpeed: t.syncSpeed,
        wr2: t.wr2,
        turbFriction: t.turbFriction,
        windage: t.windage,
        turbineDiameter: t.turbineDiameter,
        operationMode: opInfo?.mode || 'TURBINE',
        vScheduleNumber: opInfo?.vScheduleNumber ?? 1,
        comment: elementComments.get(elemId),
      }
    });
  });

  // Pumps AT nodes
  elemAt.forEach((nodeId, elemId) => {
    if (!pumps.has(elemId)) return;
    if (nodeIdMap.has(nodeId)) return;
    const p = pumps.get(elemId)!;
    const rfId = nextId();
    nodeIdMap.set(nodeId, rfId);
    const elev = nodeElevations.get(nodeId) ?? 0;
    const pos = getPos(nodeId);
    const nodeNum = parseInt(nodeId) || nodeObjects.length + 1;
    const status = oppumps.has(elemId) ? 'ACTIVE' : 'INACTIVE';
    nodeObjects.push({
      id: rfId,
      type: 'pump',
      position: pos,
      data: {
        label: elemId,
        type: 'pump',
        nodeNumber: nodeNum,
        elevation: elev,
        pumpStatus: status,
        pumpType: p.pumpType,
        rq: p.rq,
        rhead: p.rhead,
        rspeed: p.rspeed,
        rtorque: p.rtorque,
        wr2: p.wr2,
        comment: elementComments.get(elemId),
      }
    });
  });

  // Check Valves (ONEWAY) AT nodes
  elemAt.forEach((nodeId, elemId) => {
    if (!oneway.has(elemId)) return;
    if (nodeIdMap.has(nodeId)) return;
    const vc = oneway.get(elemId)!;
    const rfId = nextId();
    nodeIdMap.set(nodeId, rfId);
    const elev = nodeElevations.get(nodeId) ?? 0;
    const pos = getPos(nodeId);
    const nodeNum = parseInt(nodeId) || nodeObjects.length + 1;
    nodeObjects.push({
      id: rfId,
      type: 'checkValve',
      position: pos,
      data: {
        label: elemId,
        type: 'checkValve',
        nodeNumber: nodeNum,
        elevation: elev,
        valveStatus: 'OPEN',
        valveDiam: vc.diam,
        comment: elementComments.get(elemId),
      }
    });
  });

  elemLinks.forEach((link, elemId) => {
    const { from, to } = link;

    // Pumps, turbines, and check valves that use LINK are EDGE elements —
    // they render as a circular icon on the connection line (like a labelled
    // conduit) rather than as an intermediate node.
    if (pumps.has(elemId)) {
      const p = pumps.get(elemId)!;
      const fromRfId = getOrCreateWhamoNode(from);
      const toRfId = getOrCreateWhamoNode(to);
      const status = oppumps.has(elemId) ? 'ACTIVE' : 'INACTIVE';
      edgeObjects.push({
        id: nextId(),
        source: fromRfId,
        target: toRfId,
        type: 'connection',
        data: {
          label: elemId,
          type: 'pump',
          pumpStatus: status,
          pumpType: p.pumpType,
          rq: p.rq,
          rhead: p.rhead,
          rspeed: p.rspeed,
          rtorque: p.rtorque,
          wr2: p.wr2,
          comment: elementComments.get(elemId),
        }
      });
      return;
    }

    if (turbines.has(elemId)) {
      const t = turbines.get(elemId)!;
      const fromRfId = getOrCreateWhamoNode(from);
      const toRfId = getOrCreateWhamoNode(to);
      const opInfo = opturbs.get(elemId);
      edgeObjects.push({
        id: nextId(),
        source: fromRfId,
        target: toRfId,
        type: 'connection',
        data: {
          label: elemId,
          type: 'turbine',
          turbineType: t.turbineType,
          syncSpeed: t.syncSpeed,
          wr2: t.wr2,
          turbFriction: t.turbFriction,
          windage: t.windage,
          turbineDiameter: t.turbineDiameter,
          operationMode: opInfo?.mode || 'TURBINE',
          vScheduleNumber: opInfo?.vScheduleNumber ?? 1,
          comment: elementComments.get(elemId),
        }
      });
      return;
    }

    if (oneway.has(elemId)) {
      const vc = oneway.get(elemId)!;
      const fromRfId = getOrCreateWhamoNode(from);
      const toRfId = getOrCreateWhamoNode(to);
      edgeObjects.push({
        id: nextId(),
        source: fromRfId,
        target: toRfId,
        type: 'connection',
        data: {
          label: elemId,
          type: 'checkValve',
          valveStatus: 'OPEN',
          valveDiam: vc.diam,
          comment: elementComments.get(elemId),
        }
      });
      return;
    }

    if (conduits.has(elemId)) {
      const c = conduits.get(elemId)!;
      const fromRfId = getOrCreateWhamoNode(from);
      const toRfId = getOrCreateWhamoNode(to);
      const edgeId = nextId();
      if (c.dummy) {
        edgeObjects.push({
          id: edgeId,
          source: fromRfId,
          target: toRfId,
          type: 'connection',
          data: {
            label: elemId,
            type: 'dummy',
            diameter: c.diameter,
            hasAddedLoss: c.hasAddedLoss,
            cplus: c.cplus,
            cminus: c.cminus,
            comment: elementComments.get(elemId),
          }
        });
      } else {
        edgeObjects.push({
          id: edgeId,
          source: fromRfId,
          target: toRfId,
          type: 'connection',
          data: {
            label: elemId,
            type: 'conduit',
            length: c.length,
            diameter: c.diameter,
            celerity: c.celerity,
            friction: c.friction,
            numSegments: c.numseg,
            hasAddedLoss: c.hasAddedLoss,
            cplus: c.cplus,
            cminus: c.cminus,
            variable: c.variable,
            distance: c.distance,
            area: c.area,
            d: c.d,
            a: c.a,
            comment: elementComments.get(elemId),
          }
        });
      }
      return;
    }

    const fromRfId = getOrCreateWhamoNode(from);
    const toRfId = getOrCreateWhamoNode(to);
    edgeObjects.push({
      id: nextId(),
      source: fromRfId,
      target: toRfId,
      type: 'connection',
      data: { label: elemId, type: 'conduit', length: 0, diameter: 0, celerity: 0, friction: 0 }
    });
  });

  // Ensure any remaining AT-nodes not yet visited via link processing get created.
  // All typed elements were pre-created above, so this only creates plain nodes.
  elemAt.forEach((nodeId, _elemId) => {
    getOrCreateWhamoNode(nodeId);
  });

  const pcharData: Record<number, PcharType> = {};
  elems.pchar.forEach((pc, pType) => { pcharData[pType] = pc; });

  const tcharData: Record<number, TcharType> = {};
  elems.tchar.forEach((tc, tType) => { tcharData[tType] = tc; });

  const vSchedulesObj: Record<number, { t: number; g: number }[]> = {};
  elems.vSchedules.forEach((pts, num) => { vSchedulesObj[num] = pts; });

  return { nodes: nodeObjects, edges: edgeObjects, pcharData, tcharData, vSchedules: vSchedulesObj };
}

export function parseInpFile(content: string): {
  nodes: WhamoNode[];
  edges: WhamoEdge[];
  projectName: string;
  computationalParams?: any;
  hSchedules: { number: number; points: { time: number; head: number }[] }[];
  qSchedules: Record<number, { time: number; flow: number }[]>;
  pcharData: Record<number, PcharType>;
  tcharData: Record<number, TcharType>;
  vSchedules: Record<number, { t: number; g: number }[]>;
  outputRequests: { id: string; elementId: string; elementType: 'node' | 'edge'; isElement?: boolean; requestType: 'HISTORY' | 'PLOT' | 'SPREADSHEET'; variables: string[] }[];
  nodeSelectionSet: string[];
} {
  // ── Strip all comment lines first (lines whose first non-space token is "C") ──
  // This lets all downstream section-detection logic focus on core structure only.
  const rawLines = content.split('\n');
  const lines = rawLines.map(l => {
    const t = l.trim();
    // A comment line starts with "c" alone or "c " (case-insensitive)
    if (t === 'c' || t === 'C' || /^[cC]\s/.test(t)) return '';
    return l;
  });

  let projectName = 'Imported Network';
  // Use the first non-empty, non-keyword raw line as the project name if it exists
  for (const rl of rawLines) {
    const t = rl.trim();
    if (!t) continue;
    if (/^[cC](\s|$)/.test(t)) continue;  // skip comment lines
    if (/^SYSTEM\b|^RESERVOIR\b|^CONDUIT\b|^PUMP\b|^TURBINE\b|^CONTROL\b|^GO\b|^GOODBYE\b/i.test(t)) break;
    projectName = t;
    break;
  }

  let systemStart = -1, systemEnd = -1;
  let elemPropsStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const upper = lines[i].trim().toUpperCase();
    if (/^SYSTEM\b/.test(upper) && systemStart === -1) { systemStart = i + 1; continue; }
    if (systemStart !== -1 && systemEnd === -1 && /^FINISH\b/.test(upper)) { systemEnd = i; continue; }
    if (/^C.*ELEMENT\s+PROP/i.test(lines[i].trim()) || (systemEnd !== -1 && /^RESERVOIR\b|^CONDUIT\b|^PUMP\b|^ONEWAY\b/.test(upper))) {
      if (elemPropsStart === -1) elemPropsStart = i;
    }
  }

  const systemLines = systemStart !== -1 ? lines.slice(systemStart, systemEnd !== -1 ? systemEnd : lines.length) : lines;
  const propLines = elemPropsStart !== -1 ? lines.slice(elemPropsStart) : lines;

  const topo = parseSystemSection(systemLines);
  const elems = parseElementProperties(propLines);
  const { nodeComments, elementComments } = extractComments(rawLines);

  // Parse CONTROL block — supports multiple stages and ACCUTEST
  const parsedStages: { dtcomp: number; dtout: number; tmax: number }[] = [];
  let parsedAccutest: string = 'NONE';
  {
    let inControl = false;
    let pendingDtcomp: number | null = null;
    let pendingDtout: number | null = null;
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      if (/^CONTROL\b/i.test(t)) { inControl = true; continue; }
      if (!inControl) continue;
      if (/^FINISH\b/i.test(t)) break;
      // All-on-one-line: DTCOMP x DTOUT y TMAX z
      const oneLine = t.match(/DTCOMP\s+([\d.]+)\s+DTOUT\s+([\d.]+)\s+TMAX\s+([\d.]+)/i);
      if (oneLine) {
        parsedStages.push({ dtcomp: parseFloat(oneLine[1]), dtout: parseFloat(oneLine[2]), tmax: parseFloat(oneLine[3]) });
        continue;
      }
      // Separate lines: accumulate then emit on TMAX
      const dtM = t.match(/^DTCOMP\s+([\d.]+)/i); if (dtM) pendingDtcomp = parseFloat(dtM[1]);
      const doM = t.match(/^DTOUT\s+([\d.]+)/i);  if (doM) pendingDtout  = parseFloat(doM[1]);
      const tmM = t.match(/^TMAX\s+([\d.]+)/i);
      if (tmM) {
        parsedStages.push({ dtcomp: pendingDtcomp ?? 0.01, dtout: pendingDtout ?? 0.1, tmax: parseFloat(tmM[1]) });
        pendingDtcomp = null; pendingDtout = null;
      }
      const acM = t.match(/^ACCUTEST\s+(\S+)/i); if (acM) parsedAccutest = acM[1].toUpperCase();
    }
  }
  if (parsedStages.length === 0) parsedStages.push({ dtcomp: 0.01, dtout: 0.1, tmax: 500 });
  const computationalParams = {
    stages: parsedStages,
    accutest: parsedAccutest as any,
    includeAccutest: parsedAccutest !== 'NONE',
  };

  // ── Parse SCHEDULE blocks (HSCHEDULE and QSCHEDULE) ───────────────────────
  const hSchedules: { number: number; points: { time: number; head: number }[] }[] = [];
  const qSchedules: Record<number, { time: number; flow: number }[]> = {};
  {
    let inSchedule = false;
    let currentHSchedNum: number | null = null;
    let currentHPoints: { time: number; head: number }[] = [];

    for (const rl of rawLines) {
      const t = rl.trim();
      if (!t) continue;
      if (/^SCHEDULE\b/i.test(t)) {
        inSchedule = true;
        // Also check for inline QSCHEDULE on the same line: "SCHEDULE QSCHEDULE 1 T 0 Q ..."
        const inlineQ = t.match(/\bQSCHEDULE\s+(\d+)\s+(.*)/i);
        if (inlineQ) {
          const num = parseInt(inlineQ[1]);
          const pts: { time: number; flow: number }[] = [];
          const tqPairs = [...inlineQ[2].matchAll(/\bT\s+([\-\d.]+)\s+Q\s+([\-\d.]+)/gi)];
          tqPairs.forEach(m => pts.push({ time: parseFloat(m[1]), flow: parseFloat(m[2]) }));
          if (pts.length > 0) qSchedules[num] = pts;
        }
        currentHSchedNum = null; currentHPoints = [];
        continue;
      }
      if (!inSchedule) continue;
      if (/^FINISH\b/i.test(t)) {
        if (currentHSchedNum !== null && currentHPoints.length > 0) {
          hSchedules.push({ number: currentHSchedNum, points: [...currentHPoints] });
        }
        inSchedule = false; currentHSchedNum = null; currentHPoints = [];
        continue;
      }
      // QSCHEDULE line (inline format): QSCHEDULE <num> T <t> Q <q> T <t> Q <q> ...
      const qschedM = t.match(/^QSCHEDULE\s+(\d+)\s+(.*)/i);
      if (qschedM) {
        const num = parseInt(qschedM[1]);
        const pts: { time: number; flow: number }[] = [];
        const tqPairs = [...qschedM[2].matchAll(/\bT\s+([\-\d.]+)\s+Q\s+([\-\d.]+)/gi)];
        tqPairs.forEach(m => pts.push({ time: parseFloat(m[1]), flow: parseFloat(m[2]) }));
        if (pts.length > 0) qSchedules[num] = pts;
        continue;
      }
      // HSCHEDULE header line
      const hschedM = t.match(/\bHSCHEDULE\s+(\d+)/i);
      if (hschedM) { currentHSchedNum = parseInt(hschedM[1]); currentHPoints = []; continue; }
      // T/H pair line within an HSCHEDULE block
      if (currentHSchedNum !== null) {
        const thM = t.match(/\bT\s+([\-\d.]+)\s+H\s+([\-\d.]+)/i);
        if (thM) currentHPoints.push({ time: parseFloat(thM[1]), head: parseFloat(thM[2]) });
      }
    }
  }

  const { nodes, edges, pcharData, tcharData, vSchedules } = buildReactFlowGraph(topo, elems, projectName, nodeComments, elementComments);

  // ── Back-calculate Manning's n from friction + diameter ────────────────────
  // Formula: f = 185·n²/D^(1/3)  →  n = sqrt(f·D^(1/3) / 185)
  for (const edge of edges) {
    if (edge.data?.type === 'conduit') {
      const f = parseFloat(String((edge.data as any).friction ?? 0));
      const D = parseFloat(String((edge.data as any).diameter ?? 0));
      if (f > 0 && D > 0) {
        const n = Math.sqrt((f * Math.pow(D, 1 / 3)) / 185);
        if (isFinite(n) && n > 0) (edge.data as any).manningsN = parseFloat(n.toFixed(6));
      }
    }
  }

  // ── Parse OUTPUT REQUEST blocks (HISTORY / PLOT / SPREADSHEET) ────────────
  // Each block starts with its keyword, contains NODE/ELEM lines, ends with FINISH.
  const rawRequests: {
    reqType: 'HISTORY' | 'PLOT' | 'SPREADSHEET';
    isElem: boolean;
    whamoId: string;
    vars: string[];
  }[] = [];

  let currentReqType: 'HISTORY' | 'PLOT' | 'SPREADSHEET' | null = null;
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    const upper = t.toUpperCase();
    if (/^HISTORY\b/.test(upper))     { currentReqType = 'HISTORY';     continue; }
    if (/^PLOT\b/.test(upper))        { currentReqType = 'PLOT';        continue; }
    if (/^SPREADSHEET\b/.test(upper)) { currentReqType = 'SPREADSHEET'; continue; }
    if (currentReqType && /^FINISH\b/i.test(upper)) { currentReqType = null; continue; }
    if (!currentReqType) continue;

    const nodeM = t.match(/^NODE\s+(\S+)\s+(.*)/i);
    const elemM = t.match(/^ELEM\s+(\S+)\s+(.*)/i);
    const entry = nodeM || elemM;
    if (!entry) continue;
    const isElem = !!elemM;
    const whamoId = entry[1];
    const vars = entry[2].trim().split(/\s+/).map(v => {
      const u = v.toUpperCase();
      if (u === 'PRESSURE') return 'PRESS';
      return u;
    }).filter(v => v.length > 0);
    rawRequests.push({ reqType: currentReqType!, isElem, whamoId, vars });
  }

  // Map WHAMO IDs → React Flow IDs
  let reqCounter = 1;
  const outputRequests: { id: string; elementId: string; elementType: 'node' | 'edge'; isElement?: boolean; requestType: 'HISTORY' | 'PLOT' | 'SPREADSHEET'; variables: string[] }[] = [];
  for (const raw of rawRequests) {
    let elementId: string | null = null;
    let elementType: 'node' | 'edge' = 'node';
    if (raw.isElem) {
      // ELEM <label> — find node whose data.label matches, or edge
      const rfNode = nodes.find(n => String(n.data?.label) === raw.whamoId);
      if (rfNode) {
        elementId = rfNode.id;
        elementType = 'node';
      } else {
        const rfEdge = edges.find(e => String(e.data?.label) === raw.whamoId);
        if (rfEdge) { elementId = rfEdge.id; elementType = 'edge'; }
      }
    } else {
      // NODE <number> — find node whose data.nodeNumber matches
      const nodeNum = parseInt(raw.whamoId);
      const rfNode = nodes.find(n => Number(n.data?.nodeNumber) === nodeNum);
      if (rfNode) { elementId = rfNode.id; elementType = 'node'; }
    }
    if (!elementId) continue;
    outputRequests.push({
      id: `req-inp-${reqCounter++}`,
      elementId,
      elementType,
      isElement: raw.isElem,
      requestType: raw.reqType,
      variables: raw.vars,
    });
  }

  // nodeSelectionSet: all node numbers as strings (select every node by default on import).
  // Must use nodeNumber.toString() — the same key format used by NodeSelectionPanel and
  // setAllNodesSelected — because RF IDs are non-contiguous (edges share the ID counter).
  const nodeSelectionSet = nodes.map(n => n.data?.nodeNumber?.toString() ?? n.id);

  return { nodes, edges, projectName, computationalParams, hSchedules, qSchedules, pcharData, tcharData, vSchedules, outputRequests, nodeSelectionSet };
}
