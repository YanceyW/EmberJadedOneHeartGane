import { GameDefinition } from './types';

const registry = new Map<string, GameDefinition>();

export const GameRegistry = {
  register(definition: GameDefinition): void {
    registry.set(definition.id, definition);
  },

  get(id: string): GameDefinition | undefined {
    return registry.get(id);
  },

  has(id: string): boolean {
    return registry.has(id);
  },
};
