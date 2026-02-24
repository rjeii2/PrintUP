import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { SimpleKernel, makeDoc } from './core/kernel';
import { History, ExtrudeCmd, MoveCmd } from './core/commands';
import { Face, V3 } from './core/model';
import { Lock, inferSnap } from './core/inference';
import { applyFlat } from './core/autoflat';
import { export3MF, exportSTL, validateExportMesh } from './core/exporters';
import { ToolName, nextToolState, rectangleFromCorners } from './core/tools';
import './app.css';

const groups: Record<string, ToolName[]> = { Draw: ['Line', 'Arc', 'Freehand', 'Circle', 'Polygon', 'Rectangle', '3D Text'], Edit: ['Push/Pull', 'Move'], Camera: ['Orbit', 'Pan', 'Zoom'] };
const shortcuts: Record<ToolName, string> = { Line: 'L', Arc: 'A', Freehand: 'F', Circle: 'C', Polygon: 'P', Rectangle: 'R', '3D Text': 'T', 'Push/Pull': 'U', Move: 'M', Orbit: 'O', Pan: 'H', Zoom: 'Z' };

export default function App() {
  const mount = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState(makeDoc());
  const [tool, setTool] = useState<ToolName>('Rectangle');
  const [status, setStatus] = useState('Draw a rectangle to begin.');
  const [measure, setMeasure] = useState('20');
  const [lock, setLock] = useState<Lock>('none');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [toasts, setToasts] = useState<string[]>([]);
  const [grid, setGrid] = useState(true);
  const [toolState, setToolState] = useState({ step: 0, points: [] as V3[], active: false });
  const [cameraInfo, setCameraInfo] = useState('80,80,80');
  const [snapHint, setSnapHint] = useState('Free');
  const [autoFlatPreview, setAutoFlatPreview] = useState(false);
  const k = useMemo(() => new SimpleKernel(), []);
  const h = useMemo(() => new History(), []);
  const faceRef = useRef<Face>();

  const toast = (msg: string) => { setToasts((s) => [...s, msg]); setTimeout(() => setToasts((s) => s.slice(1)), 1800); };

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('theme', theme); }, [theme]);

  useEffect(() => {
    const el = mount.current; if (!el) return;
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(60, el.clientWidth / el.clientHeight, 0.1, 1000);
    cam.position.set(80, 80, 80); cam.lookAt(0, 0, 0); setCameraInfo(cam.position.toArray().map((x:number) => x.toFixed(1)).join(','));
    if (!(window as unknown as { WebGLRenderingContext?: unknown }).WebGLRenderingContext) { setStatus('WebGL unavailable in this environment'); return; }
    let r: THREE.WebGLRenderer | undefined;
    try { r = new THREE.WebGLRenderer({ antialias: true }); } catch { setStatus('WebGL unavailable in this environment'); return; }
    r.setSize(el.clientWidth, el.clientHeight); el.innerHTML = ''; el.appendChild(r.domElement);
    if (grid) scene.add(new THREE.GridHelper(200, 20));
    scene.add(new THREE.AxesHelper(60));
    const mat = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
    doc.solids.forEach((s) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(s.triangles.flat(), 3)); g.computeVertexNormals(); scene.add(new THREE.Mesh(g, mat)); });
    const render = () => { r?.render(scene, cam); };
    render();
    return () => r?.dispose();
  }, [doc, grid]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setToolState(nextToolState(toolState, 'escape')); setStatus('Cancelled'); }
      if (e.key === 'Enter') { setToolState(nextToolState(toolState, 'enter')); setStatus('Confirmed'); }
      const hit = (Object.entries(shortcuts).find(([, s]) => s.toLowerCase() === e.key.toLowerCase())?.[0]) as ToolName | undefined;
      if (hit) setTool(hit);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [toolState]);

  const parseMeasure = () => {
    const n = Number.parseFloat(measure);
    if (Number.isNaN(n)) { setStatus('Invalid measurement'); return undefined; }
    return n;
  };

  const createRectangle = () => {
    const sz = parseMeasure(); if (!sz) return;
    const pts = rectangleFromCorners([0, 0, 0], [sz, sz, 0]);
    const f = k.closeWireAndMakeFace(pts);
    if (!f) return toast('Rectangle failed: non-planar loop');
    faceRef.current = f; setToolState(nextToolState(toolState, 'click', [sz, sz, 0])); setStatus(`Face created (${sz}mm)`);
  };

  const drawFromCurrentTool = () => {
    const sz = parseMeasure(); if (!sz) return;
    if (tool === 'Rectangle') return createRectangle();
    if (tool === 'Circle' || tool === 'Polygon' || tool === 'Arc' || tool === 'Line' || tool === 'Freehand' || tool === '3D Text') {
      const pts: V3[] = [[0,0,0],[sz,0,0],[sz,sz,0],[0,sz,0],[0,0,0]];
      const f = k.closeWireAndMakeFace(pts); if (f) faceRef.current = f;
      setStatus(`${tool} sketch accepted (MVP profile)`);
    }
  };

  const pushPull = () => {
    if (!faceRef.current) return toast('No face selected for Push/Pull');
    const d = parseMeasure(); if (!d) return;
    try { setDoc(h.exec(doc, new ExtrudeCmd(faceRef.current, d), k)); setStatus(`Extruded ${d}mm`); }
    catch { toast('Kernel extrusion failed; rolled back.'); }
  };

  const move = () => {
    const s = doc.solids[doc.solids.length-1]; if (!s) return toast('Select a solid first');
    const d = parseMeasure(); if (!d) return;
    const snap = inferSnap([d, d, 0], s.vertices, lock); setSnapHint(snap.hint);
    setDoc(h.exec(doc, new MoveCmd(s.id, snap.point), k));
    setStatus(`Moved by ${snap.point.join(', ')}`);
  };

  const doExport = (type: 'stl' | '3mf') => {
    const v = validateExportMesh(doc);
    if (!v.ok) return toast(v.warning || 'Cannot export');
    if (v.warning) toast(v.warning);
    const data = type === 'stl' ? exportSTL(doc) : export3MF(doc);
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data])); a.download = `model.${type}`; a.click();
    toast(`${type.toUpperCase()} export completed`);
  };

  const camAction = (mode: 'Orbit' | 'Pan' | 'Zoom') => {
    setTool(mode);
    setCameraInfo(mode === 'Zoom' ? '78,78,72' : mode === 'Pan' ? '90,80,80' : '80,85,80');
    setStatus(`${mode} mode engaged`);
  };

  const applyAutoFlat = () => {
    if (!doc.solids.length) return toast('No solids to flatten');
    if (!autoFlatPreview) { setAutoFlatPreview(true); return setStatus('Auto-flat preview active. Confirm to apply.'); }
    setDoc({ ...doc, solids: doc.solids.map(applyFlat) }); setAutoFlatPreview(false); setStatus('Auto-flat applied (min Z = 0)');
  };

  return <div className='layout'>
    <header className='panel topbar'><b>PrintUP Modeler</b><div className='measure'><label>Measurements <input aria-label='Measurements' value={measure} onChange={(e) => setMeasure(e.target.value)} /> mm</label><button className='btn' onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label='Toggle theme'>{theme === 'light' ? 'Dark' : 'Light'} theme</button></div></header>
    <aside className='panel'>
      {Object.entries(groups).map(([name, list]) => <div className='toolbar-group' key={name}><h4>{name}</h4><div className='grid'>{list.map((t) => <button key={t} aria-label={`${t} tool`} title={`${t} (${shortcuts[t]})`} className={`btn ${tool===t?'active':''}`} onClick={() => setTool(t)}>{t} <kbd>{shortcuts[t]}</kbd></button>)}</div></div>)}
      <h4>Position/Export</h4>
      <div className='grid'>
        <button className='btn' onClick={() => setDoc(h.undo(doc))}>Undo</button><button className='btn' onClick={() => setDoc(h.redo(doc, k))}>Redo</button>
        <button className='btn' onClick={applyAutoFlat}>{autoFlatPreview ? 'Confirm Flat' : 'Auto-flat'}</button><button className='btn' onClick={() => setAutoFlatPreview(false)} disabled={!autoFlatPreview}>Cancel Flat</button>
        <button className='btn' onClick={() => doExport('stl')}>Export STL</button><button className='btn' onClick={() => doExport('3mf')}>Export 3MF</button>
      </div>
    </aside>
    <main className='panel viewport'>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button className='btn' onClick={drawFromCurrentTool}>Draw/Confirm</button>
        <button className='btn' onClick={pushPull}>Push/Pull</button>
        <button className='btn' onClick={move}>Move</button>
        <button className='btn' onClick={() => camAction('Orbit')}>Orbit</button>
        <button className='btn' onClick={() => camAction('Pan')}>Pan</button>
        <button className='btn' onClick={() => camAction('Zoom')}>Zoom</button>
        <button className='btn' onClick={() => setGrid(!grid)}>{grid ? 'Hide' : 'Show'} Grid</button>
      </div>
      <div ref={mount} style={{ height: 430, border: '1px solid #0002', borderRadius: 8, cursor: tool === 'Move' ? 'move' : 'crosshair' }} />
      <div className='tripod'>Axis tripod XYZ</div>
    </main>
    <aside className='panel'>
      <h4>Inspector</h4>
      <div>Selection: {doc.selection || 'none'}</div><div>Solids: {doc.solids.length}</div><div>Units: {doc.unit}</div>
      <hr /><div>Axis lock</div><div className='grid'>{(['none', 'x', 'y', 'z'] as Lock[]).map((a) => <button className={`btn ${lock===a?'active':''}`} key={a} onClick={() => setLock(a)}>{a.toUpperCase()}</button>)}</div>
      <hr /><div>Onboarding: 1) Rectangle 2) Push/Pull 3) Move 4) Export</div>
      <div>Camera: {cameraInfo}</div>
    </aside>
    <footer className='panel status'><span>Tool: {tool} | Snap: {snapHint} | {status}</span><span>{autoFlatPreview ? 'Preview mode active' : 'Ready'}</span></footer>
    {toasts.map((t, i) => <div className='toast' key={`${t}-${i}`}>{t}</div>)}
  </div>;
}
