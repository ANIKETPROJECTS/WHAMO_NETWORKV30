export interface SimulationNode {
  nodeNumber: number;
  pipeElevation: number | null;
  maxEnergyElev: number;
  maxEnergyElevTime: number;
  minEnergyElev: number;
  minEnergyElevTime: number;
  maxDischarge: number;
  maxDischargeTime: number;
  minDischarge: number;
  minDischargeTime: number;
}

export interface SimulationSummary {
  runDate: string;
  title: string;
  nodes: SimulationNode[];
  units: "english" | "metric";
}

function parsePipeElevations(content: string): Map<number, number> {
  const map = new Map<number, number>();
  const re = /NODE\s+(\d+)\s+ELEV\s+([\d.]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    map.set(parseInt(m[1]), parseFloat(m[2]));
  }
  return map;
}

function interpolateMissingElevations(nodes: SimulationNode[]): void {
  const known = nodes.filter((n) => n.pipeElevation !== null);
  if (known.length < 2) return;

  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].pipeElevation !== null) continue;
    const prev = [...known].reverse().find((k) => k.nodeNumber < nodes[i].nodeNumber);
    const next = known.find((k) => k.nodeNumber > nodes[i].nodeNumber);
    if (prev && next) {
      const t =
        (nodes[i].nodeNumber - prev.nodeNumber) /
        (next.nodeNumber - prev.nodeNumber);
      nodes[i].pipeElevation =
        prev.pipeElevation! + t * (next.pipeElevation! - prev.pipeElevation!);
    } else if (prev) {
      nodes[i].pipeElevation = prev.pipeElevation!;
    } else if (next) {
      nodes[i].pipeElevation = next.pipeElevation!;
    }
  }
}

export function parseOutFile(content: string): SimulationSummary {
  const lines = content.split("\n");
  const pipeElevations = parsePipeElevations(content);

  let summaryStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "SIMULATION SUMMARY") {
      summaryStart = i;
      break;
    }
  }
  if (summaryStart === -1) {
    throw new Error("No SIMULATION SUMMARY section found in this file.");
  }

  let runDate = "";
  let title = "";
  const units: "english" | "metric" = content.includes("ENGLISH") ? "english" : "metric";

  for (let i = summaryStart; i < Math.min(summaryStart + 12, lines.length); i++) {
    const line = lines[i];
    if (line.includes("RUN OF")) {
      const m = line.match(/RUN OF\s+(.+?)\s+AT\s+(.+)/);
      if (m) runDate = `${m[1].trim()} at ${m[2].trim()}`;
    }
    if (line.includes("TITLED:") && !title) {
      title = line.replace("TITLED:", "").trim();
    }
    if (!title && !line.includes("TITLED:") && !line.includes("RUN OF") &&
        !line.includes("SIMULATION") && !line.includes("====") &&
        !line.includes("MAXIMUM") && !line.includes("NUMBER") &&
        !line.includes("------") && !line.includes("(FEET)") &&
        !line.includes("(CFS)") && !line.includes("(SEC)") &&
        line.trim().length > 8 && i > summaryStart + 3 && i < summaryStart + 8) {
      title = line.trim();
    }
  }

  let dataStart = -1;
  for (let i = summaryStart; i < lines.length; i++) {
    if (lines[i].includes("------") && i + 1 < lines.length) {
      const next = lines.slice(i + 1, i + 4).find((l) => /^\s+\d+\s+[\d.]+/.test(l));
      if (next) { dataStart = i + 1; break; }
    }
  }
  if (dataStart === -1) throw new Error("Could not find data rows in SIMULATION SUMMARY.");

  const nodes: SimulationNode[] = [];
  let lastNodeNumber = 0;

  for (let i = dataStart; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) {
      const more = lines.slice(i + 1, i + 5).find((l) => /^\s+\d+\s+[\d.]+/.test(l));
      if (!more) break;
      continue;
    }
    if (line.includes("***") || line.includes("POSSIBLE") || line.includes("AT TIME") ||
        line.includes("MINIMUM PRESSURE") || line.includes("SIMULATION OUTPUT") ||
        line.includes("TIME HISTORIES")) break;

    const parts = line.trim().split(/\s+/).filter(Boolean);
    if (parts.length < 8) continue;

    const firstVal = parseFloat(parts[0]);
    if (isNaN(firstVal)) continue;

    let nodeNum: number;
    let offset: number;

    if (Number.isInteger(firstVal) && parts.length >= 9 && firstVal > 0 && firstVal < 10000) {
      nodeNum = firstVal;
      offset = 1;
      lastNodeNumber = nodeNum;
    } else if (parts.length >= 8) {
      nodeNum = lastNodeNumber;
      offset = 0;
    } else continue;

    const vals = parts.slice(offset).map((v) => parseFloat(v));
    if (vals.length < 8 || vals.some((v, idx) => isNaN(v) && idx < 8)) continue;

    if (!nodes.find((n) => n.nodeNumber === nodeNum)) {
      nodes.push({
        nodeNumber: nodeNum,
        pipeElevation: pipeElevations.get(nodeNum) ?? null,
        maxEnergyElev: vals[0],
        maxEnergyElevTime: vals[1],
        minEnergyElev: vals[2],
        minEnergyElevTime: vals[3],
        maxDischarge: vals[4],
        maxDischargeTime: vals[5],
        minDischarge: vals[6],
        minDischargeTime: vals[7],
      });
    }
  }

  interpolateMissingElevations(nodes);

  return { runDate, title, nodes, units };
}
