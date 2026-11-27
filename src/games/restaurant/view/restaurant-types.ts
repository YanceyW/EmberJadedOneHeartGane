import { Rect } from '../../../shared/design-system/draw';
import { CraftTab, RestaurantPage } from './restaurant-view-data';

export type RestaurantHit =
  | { kind: 'back' }
  | { kind: 'page'; page: RestaurantPage }
  | { kind: 'craft-tab'; tab: CraftTab }
  | { kind: 'palette'; id: string; locked?: boolean }
  | { kind: 'palette-bin' }
  | { kind: 'supply-arrow'; direction: -1 | 1 }
  | { kind: 'counter'; index: number }
  | { kind: 'stove'; index: number; cell?: number }
  | { kind: 'stove-fire'; index: number }
  | { kind: 'prepared'; index: number }
  | { kind: 'customer'; id: number }
  | { kind: 'serve-table'; index: number }
  | { kind: 'suggestion'; index: number }
  | { kind: 'close-shift' }
  | { kind: 'exit-continue' }
  | { kind: 'exit-close' }
  | { kind: 'exit-leave' }
  | { kind: 'settle' };

export interface DragGhost {
  id: string;
  point: { x: number; y: number };
  quality?: number;
}

export interface StoveLayout {
  card: Rect;
  cells: Rect[];
  output: Rect;
  fire: Rect;
}

export interface KitchenPageLayout {
  craftTabs: Record<CraftTab, Rect>;
  counter: Rect[];
  stoves: StoveLayout[];
  suggestions: Rect[];
  palette: Array<{ id: string; rect: Rect }>;
  paletteBin: Rect;
}

export interface ShiftPageLayout {
  closeShift: Rect;
  customers: Array<{ id: number; rect: Rect }>;
  prepared: Rect[];
  stoves: StoveLayout[];
  suggestions: Rect[];
  counter: Rect[];
  palette: Array<{ id: string; rect: Rect; locked?: boolean }>;
  paletteBin: Rect;
  palettePrev: Rect;
  paletteNext: Rect;
}
