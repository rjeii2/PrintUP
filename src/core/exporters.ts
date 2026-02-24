import { Doc, V3 } from './model';

const n = (a: number[]) => { const l = Math.hypot(...a) || 1; return a.map((v) => v / l); };
const triNormal = (a: V3, b: V3, c: V3) => n([(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]), (b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]), (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])]);

export const validateExportMesh = (doc: Doc) => {
  const triCount = doc.solids.reduce((s, m) => s + Math.floor(m.triangles.length / 3), 0);
  if (!triCount) return { ok: false, warning: 'No mesh data to export' };
  const bad = doc.solids.some((s) => s.triangles.length % 3 !== 0);
  return { ok: !bad, warning: bad ? 'Triangle winding or count is inconsistent' : undefined };
};

export const exportSTL = (doc: Doc) => {
  const body = doc.solids.flatMap((s) => {
    const t = s.triangles; const out: string[] = [];
    for (let i = 0; i < t.length; i += 3) {
      const a = t[i], b = t[i + 1], c = t[i + 2];
      const nn = triNormal(a, b, c);
      out.push(`facet normal ${nn.join(' ')}\n outer loop\n vertex ${a.join(' ')}\n vertex ${b.join(' ')}\n vertex ${c.join(' ')}\n endloop\nendfacet\n`);
    }
    return out;
  }).join('');
  return `solid printup\n${body}endsolid printup\n`;
};

export const export3MF = (doc: Doc) => {
  const vertices = doc.solids.flatMap((s) => s.vertices);
  const triangles = doc.solids.flatMap((s) => s.triangles);
  const tris = Array.from({ length: Math.floor(triangles.length / 3) }, (_, i) => `<triangle v1="${i*3}" v2="${i*3+1}" v3="${i*3+2}"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><model unit="${doc.unit}" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><resources><object id="1" type="model"><mesh><vertices>${vertices.map((v)=>`<vertex x="${v[0]}" y="${v[1]}" z="${v[2]}"/>`).join('')}</vertices><triangles>${tris}</triangles></mesh></object></resources><build><item objectid="1"/></build></model>`;
};
