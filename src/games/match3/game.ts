import { GameDefinition } from '../../core/types';
import { GameRegistry } from '../../core/game-registry';
import { Match3Game } from './match3-game';

const definition: GameDefinition = {
  id: 'match3',
  title: '王都三消',
  subtitle: '交换 · 连锁 · 三星',
  version: '0.1.0',
  packageName: 'match3',
  orientation: 'portrait',
  accent: 'mint',
  create: (ctx) => new Match3Game(ctx),
};

GameRegistry.register(definition);

export default definition;
