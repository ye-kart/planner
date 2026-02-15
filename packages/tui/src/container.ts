import { createAiContainer, type AiContainer } from '@planner/ai';

export type TuiContainer = AiContainer;

export function createTuiContainer(): TuiContainer {
  return createAiContainer();
}
