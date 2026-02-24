import { describe, expect, test } from 'vitest';
import { SimpleKernel, makeDoc } from '../src/core/kernel';
import { applyAxisLock, inferSnap } from '../src/core/inference';
import { chooseAutoFlat, applyFlat } from '../src/core/autoflat';
import { export3MF, exportSTL, validateExportMesh } from '../src/core/exporters';
import { nextToolState, rectangleFromCorners } from '../src/core/tools';

describe('geometry + tools', () => {
  const k = new SimpleKernel();
  test('loop closure creates face', () => {
    const f = k.closeWireAndMakeFace([[0,0,0],[10,0,0],[10,10,0],[0,10,0],[0,0,0]]);
    expect(f).toBeTruthy();
  });
  test('push/pull extrude distance exact', () => {
    const f = k.closeWireAndMakeFace([[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,0]])!;
    const s = k.extrudeFace(f, 7);
    expect(Math.max(...s.vertices.map(v=>v[2]))).toBeCloseTo(7, 5);
  });
  test('move axis lock behavior', () => {
    expect(applyAxisLock([1,1,1],[2,3,4],'x')).toEqual([2,1,1]);
  });
  test('inference snap picks endpoint then midpoint', () => {
    const pts:[number,number,number][]=[[0,0,0],[10,0,0]];
    expect(inferSnap([0.1,0,0],pts,'none',0.5).type).toBe('endpoint');
    expect(inferSnap([5,0,0],pts,'none',0.2).type).toBe('midpoint');
  });
  test('tool state enter/escape', () => {
    const s = nextToolState({step:0,points:[],active:false},'click',[1,1,0]);
    expect(s.step).toBe(1);
    expect(nextToolState(s,'escape').active).toBe(false);
  });
  test('auto-flat chooses close orientation and applies z0', () => {
    const c = chooseAutoFlat([{normal:[1,0,0],area:20},{normal:[0,0,1],area:19}]);
    expect(c.normal).toEqual([0,0,1]);
    const f = k.closeWireAndMakeFace(rectangleFromCorners([0,0,-3],[1,1,-3]))!;
    const s = applyFlat(k.extrudeFace(f,1));
    expect(Math.min(...s.vertices.map(v=>v[2]))).toBeCloseTo(0, 5);
  });
  test('STL/3MF exports + validation', () => {
    const f = k.closeWireAndMakeFace(rectangleFromCorners([0,0,0],[1,1,0]))!;
    const d = makeDoc(); d.solids = [k.extrudeFace(f,1)];
    expect(validateExportMesh(d).ok).toBe(true);
    expect(exportSTL(d)).toContain('solid printup');
    expect(export3MF(d)).toContain('unit="mm"');
  });
});
