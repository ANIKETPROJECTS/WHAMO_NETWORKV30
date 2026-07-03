import { parseInpFile } from './client/src/lib/inp-parser';
import * as fs from 'fs';

const content = fs.readFileSync('attached_assets/0-110-0_1783060155386.inp', 'utf-8');
const result = parseInpFile(content);
const numOf = new Map(result.nodes.map(n => [n.id, (n.data as any).nodeNumber]));
console.log('node1:', JSON.stringify(result.nodes.find(n=>(n.data as any).nodeNumber===1)?.data));
console.log('node53:', JSON.stringify(result.nodes.find(n=>(n.data as any).nodeNumber===53)?.data));
console.log('DUM1 edge:', JSON.stringify(result.edges.find(e=>e.data?.label==='DUM1')?.data));
console.log('conduit C1:', JSON.stringify(result.edges.find(e=>e.data?.label==='C1')?.data));
console.log('conduit C2:', JSON.stringify(result.edges.find(e=>e.data?.label==='C2')?.data));
console.log('conduit C3 all:', result.edges.filter(e=>e.data?.label==='C3').map(e=>JSON.stringify(e.data)));
console.log('qSchedules:', JSON.stringify(result.qSchedules));
console.log('outputRequests:', JSON.stringify(result.outputRequests));
