type ScreenToFlowFn = (pos: { x: number; y: number }) => { x: number; y: number };

let _fn: ScreenToFlowFn | null = null;

export function registerScreenToFlowPosition(fn: ScreenToFlowFn) {
  _fn = fn;
}

export function getViewportCenter(): { x: number; y: number } {
  if (!_fn) return { x: 200, y: 200 };
  const canvas = document.querySelector('.react-flow__renderer') as HTMLElement | null;
  const rect = canvas?.getBoundingClientRect();
  const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
  const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
  return _fn({ x: cx, y: cy });
}
