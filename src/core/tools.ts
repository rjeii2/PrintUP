import { V3 } from './model';

export type ToolName = 'Line' | 'Arc' | 'Freehand' | 'Circle' | 'Polygon' | 'Rectangle' | '3D Text' | 'Push/Pull' | 'Move' | 'Orbit' | 'Pan' | 'Zoom';
export type ToolState = { step: number; points: V3[]; active: boolean };

export const nextToolState = (state: ToolState, event: 'click' | 'move' | 'enter' | 'escape', point?: V3): ToolState => {
  if (event === 'escape') return { step: 0, points: [], active: false };
  if (event === 'enter') return { ...state, active: false };
  if (event === 'click' && point) return { step: state.step + 1, points: [...state.points, point], active: true };
  if (event === 'move' && point && state.active) return { ...state, points: [...state.points.slice(0, -1), point] };
  return state;
};

export const rectangleFromCorners = (a: V3, b: V3): V3[] => [[a[0], a[1], a[2]], [b[0], a[1], a[2]], [b[0], b[1], a[2]], [a[0], b[1], a[2]], [a[0], a[1], a[2]]];
