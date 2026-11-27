import { COLORS, TOWN_COLORS, TOWN_PHASES, TownPhaseColors } from '../../shared/design-system/tokens';
import { stylePalette } from '../themes';

export type TownPhase = 'dawn' | 'day' | 'dusk' | 'night';

export interface TownPalette extends TownPhaseColors {
  phase: TownPhase;
  night: boolean;
  groundTop: string;
  groundBottom: string;
  cloudShade: string;
  outline: string;
  ink: string;
  inkSoft: string;
  stone: string;
  stoneDeep: string;
  glass: string;
  glassDeep: string;
  wood: string;
  woodDeep: string;
  skin: string;
}

export function townPhaseAt(hour: number): TownPhase {
  if (hour < 5 || hour >= 20) return 'night';
  if (hour < 9) return 'dawn';
  if (hour < 17) return 'day';
  return 'dusk';
}

export function townPalette(phase: TownPhase, style = 'classic'): TownPalette {
  const colors = stylePalette(TOWN_PHASES[phase], phase, style);
  return {
    ...colors,
    phase,
    night: phase === 'night',
    groundTop: colors.grassLight,
    groundBottom: colors.grass,
    cloudShade: TOWN_COLORS.cloudShade,
    outline: COLORS.ink,
    ink: COLORS.ink,
    inkSoft: COLORS.inkSoft,
    stone: TOWN_COLORS.stone,
    stoneDeep: TOWN_COLORS.stoneDeep,
    glass: TOWN_COLORS.glass,
    glassDeep: TOWN_COLORS.glassDeep,
    wood: TOWN_COLORS.wood,
    woodDeep: TOWN_COLORS.woodDeep,
    skin: COLORS.skin,
  };
}
