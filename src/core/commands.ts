import { Doc, Face, Solid } from './model';
import { KernelAdapter } from './kernel';

export interface Cmd { do(doc: Doc, k: KernelAdapter): Doc; undo(doc: Doc): Doc; }
export class History {
  done: Cmd[]=[]; undone: Cmd[]=[];
  exec(doc:Doc, cmd:Cmd, k:KernelAdapter){ const d=cmd.do(doc,k); this.done.push(cmd); this.undone=[]; return d; }
  undo(doc:Doc){ const c=this.done.pop(); if(!c) return doc; this.undone.push(c); return c.undo(doc); }
  redo(doc:Doc,k:KernelAdapter){ const c=this.undone.pop(); if(!c) return doc; this.done.push(c); return c.do(doc,k); }
}
export class CreateFaceCmd implements Cmd {
  created?:Face; constructor(private pts:number[][]){}
  do(doc:Doc,k:KernelAdapter){ const f=k.closeWireAndMakeFace(this.pts as any); this.created=f; return { ...doc, selection:f?.id }; }
  undo(doc:Doc){ return { ...doc, selection:undefined }; }
}
export class ExtrudeCmd implements Cmd {
  solid?:Solid; constructor(private face: Face, private d:number){}
  do(doc:Doc,k:KernelAdapter){ this.solid=k.extrudeFace(this.face,this.d); return { ...doc, solids:[...doc.solids,this.solid], selection:this.solid.id }; }
  undo(doc:Doc){ return { ...doc, solids:doc.solids.filter(s=>s.id!==this.solid?.id), selection:undefined }; }
}
export class MoveCmd implements Cmd {
  prev?:Solid; constructor(private id:string, private delta:[number,number,number]){}
  do(doc:Doc,k:KernelAdapter){ return { ...doc, solids: doc.solids.map(s=>{if(s.id!==this.id) return s; this.prev=s; return k.transform(s,[1,0,0,0,1,0,0,0,1,...this.delta]); })}; }
  undo(doc:Doc){ return { ...doc, solids: doc.solids.map(s=>s.id===this.id&&this.prev?this.prev:s)}; }
}
