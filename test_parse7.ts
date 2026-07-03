import { parseInpFile } from './client/src/lib/inp-parser';
import * as fs from 'fs';

const files = [
  'attached_assets/0-110-0_1783060155386.inp',
  'attached_assets/0-110-110_1783060155387.inp',
  'attached_assets/1_1783060155387.inp',
  'attached_assets/110-0-0_1783060155387.inp',
];

for (const f of files) {
  console.log('=== ' + f + ' ===');
  try {
    const content = fs.readFileSync(f, 'utf-8');
    const result = parseInpFile(content);
    const numOf = new Map(result.nodes.map(n => [n.id, (n.data as any).nodeNumber]));
    console.log('nodes:', result.nodes.length, 'edges:', result.edges.length);
    console.log('node types:', result.nodes.map(n=>({num:(n.data as any).nodeNumber, type:n.data?.type})).sort((a,b)=>a.num-b.num));
  } catch (e: any) {
    console.error('ERROR', e.message, e.stack);
  }
  console.log('');
}
