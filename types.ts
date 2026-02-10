export enum UserType {
  HUMAN = 'HUMAN',
  AI = 'AI'
}

export enum GamePhase {
  SETUP = 'SETUP',
  VOTING = 'VOTING',
  REVEALED = 'REVEALED'
}

export interface Player {
  id: string;
  name: string;
  type: UserType;
  avatarUrl: string;
  persona?: string; // For AI, e.g., "Senior Backend Dev"
  isVoting?: boolean;
}

export interface Vote {
  playerId: string;
  value: number | string; // number or "?"
  reasoning?: string; // AI explanation
}

export interface Story {
  title: string;
  description: string;
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  votes: Record<string, Vote>; // Map playerId -> Vote
  story: Story;
}

export const FIBONACCI_DECK = [1, 2, 3, 5, 8, 13, 21, '?'];

export interface AiPersona {
  id: string;
  name: string;
  role: string;
  avatarSeed: string;
  description: string;
}
