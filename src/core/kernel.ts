import { Doc, Face, Solid, V3, area2D, cross, dot, id, norm, sub } from './model';

export interface KernelAdapter {
  closeWireAndMakeFace(points: V3[]): Face | undefined;
  extrudeFace(face: Face, distance: number): Solid;
  transform(s: Solid, m: number[]): Solid;
  triangulate(s: Solid): V3[];
  validateManifold(tris: V3[]): { ok: boolean; warning?: string };
}

export class SimpleKernel implements KernelAdapter {
  closeWireAndMakeFace(points: V3[]) {
    if (points.length < 3) return;
    const first = points[0], last = points[points.length - 1];
    const closed = Math.hypot(first[0]-last[0], first[1]-last[1], first[2]-last[2]) < 1e-4;
    const loop = closed ? points.slice(0, -1) : points;
    const n = norm(cross(sub(loop[1], loop[0]), sub(loop[2], loop[0])));
    if (loop.some((p) => Math.abs(dot(sub(p, loop[0]), n)) > 1e-4) || area2D(loop) < 1e-6) return;
    return { id: id(), loop, normal: n };
  }
  extrudeFace(face: Face, distance: number): Solid {
    const top = face.loop.map((p):V3 => [p[0]+face.normal[0]*distance,p[1]+face.normal[1]*distance,p[2]+face.normal[2]*distance]);
    const triangles: V3[] = [];
    for (let i=1;i<face.loop.length-1;i++) triangles.push(face.loop[0], face.loop[i], face.loop[i+1]);
    for (let i=1;i<top.length-1;i++) triangles.push(top[0], top[i+1], top[i]);
    for (let i=0;i<face.loop.length;i++) {
      const a=face.loop[i], b=face.loop[(i+1)%face.loop.length], c=top[(i+1)%top.length], d=top[i];
      triangles.push(a,b,c, a,c,d);
    }
    return { id: id(), faces: [face], vertices: [...face.loop, ...top], triangles, transform: [1,0,0,0,1,0,0,0,1,0,0,0] };
  }
  transform(s: Solid, m: number[]) {
    const x=(p:V3):V3=>[p[0]+m[9],p[1]+m[10],p[2]+m[11]];
    return { ...s, vertices:s.vertices.map(x), triangles:s.triangles.map(x), transform:m };
  }
  triangulate(s: Solid) { return s.triangles; }
  validateManifold(tris: V3[]) { return { ok: tris.length>0, warning: tris.length?undefined:'empty mesh' }; }
}

export const makeDoc = (): Doc => ({ solids: [], unit: 'mm' });
