/** Visibility and rectangular table geometry from PDF.js's drawing operations. */
export type PdfBox = { x0: number; y0: number; x1: number; y1: number };
type Operators = { fnArray: number[]; argsArray: unknown[] };
type Matrix = number[];
type Ops = Record<string, number>;
const identity = () => [1, 0, 0, 1, 0, 0];
function multiply(a: Matrix, b: Matrix): Matrix {
  return [
    (a[0] ?? 1) * (b[0] ?? 1) + (a[2] ?? 0) * (b[1] ?? 0),
    (a[1] ?? 0) * (b[0] ?? 1) + (a[3] ?? 1) * (b[1] ?? 0),
    (a[0] ?? 1) * (b[2] ?? 0) + (a[2] ?? 0) * (b[3] ?? 1),
    (a[1] ?? 0) * (b[2] ?? 0) + (a[3] ?? 1) * (b[3] ?? 1),
    (a[0] ?? 1) * (b[4] ?? 0) + (a[2] ?? 0) * (b[5] ?? 0) + (a[4] ?? 0),
    (a[1] ?? 0) * (b[4] ?? 0) + (a[3] ?? 1) * (b[5] ?? 0) + (a[5] ?? 0),
  ];
}
function box(values: ArrayLike<number>, m: Matrix): PdfBox {
  const points = [[values[0], values[1]], [values[2], values[1]], [values[0], values[3]], [values[2], values[3]]]
    .map(([x = 0, y = 0]) => [(m[0] ?? 1) * x + (m[2] ?? 0) * y + (m[4] ?? 0), (m[1] ?? 0) * x + (m[3] ?? 1) * y + (m[5] ?? 0)]);
  return { x0: Math.min(...points.map(p => p[0] ?? 0)), y0: Math.min(...points.map(p => p[1] ?? 0)), x1: Math.max(...points.map(p => p[0] ?? 0)), y1: Math.max(...points.map(p => p[1] ?? 0)) };
}

/** Outer clipping bounds for marked text groups; filled rectangles for native tables. */
export function pdfGeometry(list: Operators, ops: Ops) {
  const groups: (PdfBox | null)[] = [];
  const cells: PdfBox[] = [];
  const marked: number[] = [];
  let matrix = identity();
  const stack: Matrix[] = [];
  let pendingClip = false;
  list.fnArray.forEach((fn, index) => {
    const args = list.argsArray[index] as unknown[] | null;
    if (fn === ops.save) stack.push([...matrix]);
    else if (fn === ops.restore) { matrix = stack.pop() ?? identity(); pendingClip = false; }
    else if (fn === ops.transform && args) matrix = multiply(matrix, args as number[]);
    else if (fn === ops.beginMarkedContent || fn === ops.beginMarkedContentProps) { marked.push(groups.length); groups.push(null); }
    else if (fn === ops.endMarkedContent) marked.pop();
    else if (fn === ops.clip || fn === ops.eoClip) pendingClip = true;
    else if (fn === ops.constructPath && args) {
      const bounds = args[2] as ArrayLike<number> | undefined;
      const group = marked[marked.length - 1];
      if (pendingClip && bounds && group !== undefined && !groups[group]) groups[group] = box(bounds, matrix);
      // PDF.js v6 packs paths as move/line/close operations. Only accept axis-aligned rectangles.
      if (!pendingClip && (args[0] === ops.fill || args[0] === ops.eoFill)) {
        const paths = args[1] as ArrayLike<ArrayLike<number>> | undefined;
        const path = paths?.[0];
        if (path) {
          for (let at = 0; at + 12 < path.length; at += 13) {
            if (path[at] !== 0 || path[at + 3] !== 1 || path[at + 6] !== 1 || path[at + 9] !== 1 || path[at + 12] !== 4) break;
            const x0 = path[at + 1] ?? 0, y0 = path[at + 2] ?? 0;
            const x1 = path[at + 4] ?? 0, y1 = path[at + 8] ?? 0;
            if (path[at + 5] !== y0 || path[at + 7] !== x1 || path[at + 10] !== x0 || path[at + 11] !== y1) break;
            const cell = box([Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1)], matrix);
            if (cell.x1 - cell.x0 > 25 && cell.y1 - cell.y0 > 15) cells.push(cell);
          }
        }
      }
      pendingClip = false;
    }
  });
  return { groups, cells };
}

export function insidePdfBox(item: { x: number; y: number; h: number; w?: number }, bounds: PdfBox): boolean {
  const center = item.x + (item.w ?? 0) / 2;
  return center >= bounds.x0 - 1 && center <= bounds.x1 + 1 && item.y >= bounds.y0 - 1 && item.y <= bounds.y1 + 1;
}