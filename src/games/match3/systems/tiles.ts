import {
  findTileSkin,
  TILE_SKINS,
  TileSkinDef,
  TileSkinId,
} from '../../../shared/content/tile-skins';

export type TileThemeId = TileSkinId;
export type TileThemeDef = TileSkinDef;

/** 方块皮肤来自王都小铺/牧场解锁；这里保留按 id 取定义的纯函数，便于测试与回退。 */
export const TILE_THEMES = Object.fromEntries(
  TILE_SKINS.map((skin) => [skin.id, skin]),
) as Record<TileThemeId, TileThemeDef>;

export function tileTheme(id: string): TileThemeDef {
  return findTileSkin(id) ?? TILE_THEMES.sweets;
}
