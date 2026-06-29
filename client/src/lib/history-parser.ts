export interface HistoryChannel {
  metric: string;
  unit: string;
  data: Array<{ time: number; value: number }>;
}

export interface HistoryNode {
  id: string;
  label: string;
  isElement: boolean;
  channels: HistoryChannel[];
}

export interface HistoryData {
  nodes: HistoryNode[];
  timeMin: number;
  timeMax: number;
  units: "english" | "metric";
}

interface ColDef {
  id: string;
  metric: string;
  unit: string;
}

function isSimOutputLine(line: string): boolean {
  return line.trim() === "SIMULATION OUTPUT";
}

function parseValue(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === ".") return 0;
  const cleaned = trimmed.startsWith(".") ? "0" + trimmed : trimmed;
  const v = parseFloat(cleaned);
  return isNaN(v) ? NaN : v;
}

function parseHeaderBlock(
  lines: string[],
  startIdx: number
): { cols: ColDef[]; nextIdx: number } | null {
  if (startIdx >= lines.length) return null;
  const row1 = lines[startIdx];
  if (!row1.includes("TIME") || !row1.includes("NODE NO")) return null;

  const row2 = startIdx + 1 < lines.length ? lines[startIdx + 1] : "";
  const row3 = startIdx + 2 < lines.length ? lines[startIdx + 2] : "";

  const positions: Array<{ start: number; id: string }> = [];
  const np = /(?:NODE NO\s+(\d+)|ELEMENT\s+(\S+))/gi;
  let m: RegExpExecArray | null;
  while ((m = np.exec(row1)) !== null) {
    const id =
      m[1] != null ? `NODE ${parseInt(m[1], 10)}` : `ELEMENT ${m[2]}`;
    positions.push({ start: m.index, id });
  }
  if (positions.length === 0) return null;

  const cols: ColDef[] = [];
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].start;
    const end =
      i + 1 < positions.length ? positions[i + 1].start : row1.length + 30;
    const width = end - start;

    const metricRaw = row2.substring(start, start + width).trim();
    const unitRaw = row3.substring(start, start + width);
    const unitMatch = unitRaw.match(/\(([^)]+)\)/);
    const unit = unitMatch ? unitMatch[1].trim() : "";
    const metric = metricRaw.replace(/\s+/g, " ").trim() || "VALUE";

    cols.push({ id: positions[i].id, metric, unit });
  }

  let nextIdx = startIdx + 3;
  while (nextIdx < lines.length && !lines[nextIdx].includes("------"))
    nextIdx++;
  nextIdx++;

  return { cols, nextIdx };
}

function ensureChannel(nodeMap: Map<string, HistoryNode>, col: ColDef): void {
  if (!nodeMap.has(col.id)) {
    const isEl = col.id.startsWith("ELEMENT ");
    const label = isEl
      ? col.id.replace("ELEMENT ", "Element ")
      : col.id.replace("NODE ", "Node ");
    nodeMap.set(col.id, { id: col.id, label, isElement: isEl, channels: [] });
  }
  const node = nodeMap.get(col.id)!;
  const exists = node.channels.some(
    (c) => c.metric === col.metric && c.unit === col.unit
  );
  if (!exists) node.channels.push({ metric: col.metric, unit: col.unit, data: [] });
}

function getChannel(
  nodeMap: Map<string, HistoryNode>,
  id: string,
  metric: string,
  unit: string
): HistoryChannel | null {
  const node = nodeMap.get(id);
  if (!node) return null;
  return node.channels.find((c) => c.metric === metric && c.unit === unit) ?? null;
}

function parseSimulationBlock(
  lines: string[],
  blockStart: number,
  nodeMap: Map<string, HistoryNode>
): void {
  let i = blockStart;

  while (i < lines.length) {
    const rawLine = lines[i];

    if (isSimOutputLine(rawLine)) break;

    if (rawLine.includes("TIME") && rawLine.includes("NODE NO")) {
      const result = parseHeaderBlock(lines, i);
      if (!result) { i++; continue; }

      const { cols, nextIdx } = result;
      i = nextIdx;

      for (const col of cols) ensureChannel(nodeMap, col);

      while (i < lines.length) {
        const line = lines[i];

        if (isSimOutputLine(line)) break;

        const trimmed = line.trim();

        if (trimmed === "") {
          let peek = i + 1;
          while (peek < lines.length && lines[peek].trim() === "") peek++;
          if (peek < lines.length) {
            if (isSimOutputLine(lines[peek])) {
              i = peek;
              break;
            }
            if (
              lines[peek].includes("TIME") &&
              lines[peek].includes("NODE NO")
            ) {
              i = peek;
              break;
            }
          }
          i++;
          continue;
        }

        if (
          trimmed.startsWith("------") ||
          (trimmed.includes("TIME") && trimmed.includes("NODE")) ||
          trimmed.includes("ENERGY ELEV") ||
          trimmed.includes("W.S. ELEV") ||
          trimmed.includes("PRES. HEAD") ||
          trimmed.includes("DISCHARGE") ||
          trimmed.includes("VELOCITY") ||
          trimmed.includes("(SEC") ||
          trimmed.includes("(FEET") ||
          trimmed.includes("(CFS") ||
          trimmed.includes("(METER") ||
          trimmed.includes("TITLED:") ||
          trimmed.includes("TIME HISTORIES") ||
          trimmed === "=================" ||
          trimmed === "============"
        ) {
          i++;
          continue;
        }

        const parts = trimmed.split(/\s+/).filter(Boolean);
        if (parts.length < 2) { i++; continue; }

        const time = parseValue(parts[0]);
        if (isNaN(time)) { i++; continue; }

        for (let ci = 0; ci < cols.length; ci++) {
          const rawVal = parts[ci + 1];
          if (rawVal === undefined) continue;
          const val = parseValue(rawVal);
          if (isNaN(val)) continue;

          const ch = getChannel(nodeMap, cols[ci].id, cols[ci].metric, cols[ci].unit);
          if (!ch) continue;

          const lastT = ch.data.length > 0 ? ch.data[ch.data.length - 1].time : -Infinity;
          if (time > lastT) ch.data.push({ time, value: val });
        }

        i++;
      }

      continue;
    }

    i++;
  }
}

export function parseHistoryData(content: string): HistoryData {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const nodeMap = new Map<string, HistoryNode>();

  const units: "english" | "metric" =
    content.includes("FEET") || content.includes("ENGLISH") ? "english" : "metric";

  for (let i = 0; i < lines.length; i++) {
    if (!isSimOutputLine(lines[i])) continue;

    let j = i + 1;
    while (j < lines.length && !lines[j].includes("TIME HISTORIES FOR RUN OF")) {
      j++;
      if (j < lines.length && isSimOutputLine(lines[j])) break;
    }
    if (j >= lines.length || !lines[j].includes("TIME HISTORIES FOR RUN OF")) continue;

    parseSimulationBlock(lines, j + 1, nodeMap);
  }

  const nodes = Array.from(nodeMap.values());

  nodes.sort((a, b) => {
    if (a.isElement !== b.isElement) return a.isElement ? 1 : -1;
    const aNum = parseInt(a.id.replace(/\D/g, ""), 10) || 0;
    const bNum = parseInt(b.id.replace(/\D/g, ""), 10) || 0;
    return aNum - bNum;
  });

  let timeMin = Infinity;
  let timeMax = -Infinity;
  for (const node of nodes) {
    for (const ch of node.channels) {
      if (ch.data.length > 0) {
        timeMin = Math.min(timeMin, ch.data[0].time);
        timeMax = Math.max(timeMax, ch.data[ch.data.length - 1].time);
      }
    }
  }

  return {
    nodes,
    timeMin: isFinite(timeMin) ? timeMin : 0,
    timeMax: isFinite(timeMax) ? timeMax : 0,
    units,
  };
}
