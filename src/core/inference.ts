import { V3 } from './model';

export type Lock = 'x' | 'y' | 'z' | 'none';
export type SnapType = 'axis' | 'endpoint' | 'midpoint' | 'none';
export type SnapResult = { point: V3; type: SnapType; hint: string };

export const applyAxisLock = (from: V3, to: V3, lock: Lock): V3 => {
  if (lock === 'x') return [to[0], from[1], from[2]];
  if (lock === 'y') return [from[0], to[1], from[2]];
  if (lock === 'z') return [from[0], from[1], to[2]];
  return to;
};

const dist = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export const inferSnap = (cursor: V3, points: V3[], axisLock: Lock, tol = 1): SnapResult => {
  const locked = applyAxisLock([0, 0, 0], cursor, axisLock);
  if (axisLock !== 'none') return { point: locked, type: 'axis', hint: `${axisLock.toUpperCase()} axis lock` };
  const endpoint = points.find((p) => dist(p, cursor) <= tol);
  if (endpoint) return { point: endpoint, type: 'endpoint', hint: 'Endpoint' };
  const midpoint = points.map((p, i) => [p, points[i + 1]] as const).find(([a, b]) => b && dist([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], cursor) <= tol);
  if (midpoint) {
    const [a, b] = midpoint;
    return { point: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], type: 'midpoint', hint: 'Midpoint' };
  }
  return { point: cursor, type: 'none', hint: 'Free' };
};
