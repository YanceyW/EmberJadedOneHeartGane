import { GameDefinition } from './types';

const REGISTRY_KEY = '__xiuxianWangduGameRegistry__';

interface RegistryHost {
  [REGISTRY_KEY]?: Map<string, GameDefinition>;
}

function host(): RegistryHost {
  // 分包与主包共享同一 JS 环境，但模块实例可能来自不同加载器；
  // 注册表挂到全局，保证主包能看到分包注册的结果。
  const target =
    typeof GameGlobal !== 'undefined'
      ? (GameGlobal as RegistryHost)
      : (globalThis as unknown as RegistryHost);
  if (!target[REGISTRY_KEY]) target[REGISTRY_KEY] = new Map<string, GameDefinition>();
  return target;
}

export const GameRegistry = {
  register(definition: GameDefinition): void {
    host()[REGISTRY_KEY]!.set(definition.id, definition);
  },

  get(id: string): GameDefinition | undefined {
    return host()[REGISTRY_KEY]!.get(id);
  },

  has(id: string): boolean {
    return host()[REGISTRY_KEY]!.has(id);
  },
};
