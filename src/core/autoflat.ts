import { Solid, V3, dot, norm } from './model';
export type Candidate={normal:V3; area:number};
export const chooseAutoFlat = (cands:Candidate[], currentUp:V3=[0,0,1]) =>
  cands.sort((a,b)=>(b.area*0.4 + dot(norm(b.normal),currentUp)*0.6)-(a.area*0.4 + dot(norm(a.normal),currentUp)*0.6))[0];
export const applyFlat = (s:Solid):Solid => {
  const minZ=Math.min(...s.vertices.map(v=>v[2]));
  const t:[number,number,number]=[0,0,-minZ];
  return { ...s, vertices:s.vertices.map(v=>[v[0],v[1],v[2]+t[2]] as V3), triangles:s.triangles.map(v=>[v[0],v[1],v[2]+t[2]] as V3) };
};
