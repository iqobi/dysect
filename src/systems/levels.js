import { INSECT_TYPES } from '../entities/insect.js';

// Level definitions
// Each level increases difficulty: more insects, faster egg laying, more diverse types
export const LEVELS = [
  {
    name: 'The First Signs',
    subtitle: 'Something moved in the kitchen...',
    insects: [
      { type: 'COCKROACH', count: 3 },
      { type: 'SILVERFISH', count: 2 },
    ],
    timeLimit: 0, // 0 = no time limit, but eggs still tick
    eggSpeedMultiplier: 1.0,
  },
  {
    name: 'Unwelcome Guests',
    subtitle: 'They are everywhere...',
    insects: [
      { type: 'COCKROACH', count: 4 },
      { type: 'SPIDER', count: 2 },
      { type: 'SILVERFISH', count: 3 },
    ],
    eggSpeedMultiplier: 1.0,
  },
  {
    name: 'Night Visitors',
    subtitle: 'The moths found the light...',
    insects: [
      { type: 'COCKROACH', count: 3 },
      { type: 'MOTH', count: 4 },
      { type: 'SPIDER', count: 2 },
      { type: 'CRICKET', count: 2 },
    ],
    eggSpeedMultiplier: 1.1,
  },
  {
    name: 'The Swarm Builds',
    subtitle: 'Check the drawers...',
    insects: [
      { type: 'COCKROACH', count: 5 },
      { type: 'FLY', count: 4 },
      { type: 'SPIDER', count: 3 },
      { type: 'CENTIPEDE', count: 2 },
    ],
    eggSpeedMultiplier: 1.2,
  },
  {
    name: 'Infestation',
    subtitle: 'They breed faster now...',
    insects: [
      { type: 'COCKROACH', count: 6 },
      { type: 'FLY', count: 5 },
      { type: 'SPIDER', count: 4 },
      { type: 'CENTIPEDE', count: 3 },
      { type: 'MOTH', count: 3 },
      { type: 'SILVERFISH', count: 3 },
    ],
    eggSpeedMultiplier: 1.5,
  },
  {
    name: 'The Nest',
    subtitle: "You shouldn't have opened that door...",
    insects: [
      { type: 'COCKROACH', count: 8 },
      { type: 'FLY', count: 6 },
      { type: 'SPIDER', count: 5 },
      { type: 'CENTIPEDE', count: 4 },
      { type: 'MOTH', count: 4 },
      { type: 'CRICKET', count: 3 },
      { type: 'SILVERFISH', count: 4 },
    ],
    eggSpeedMultiplier: 2.0,
  },
  {
    name: 'Extermination',
    subtitle: 'End this. Now.',
    insects: [
      { type: 'COCKROACH', count: 12 },
      { type: 'FLY', count: 8 },
      { type: 'SPIDER', count: 6 },
      { type: 'CENTIPEDE', count: 5 },
      { type: 'MOTH', count: 5 },
      { type: 'CRICKET', count: 4 },
      { type: 'SILVERFISH', count: 5 },
    ],
    eggSpeedMultiplier: 2.5,
  },
];

export function getLevelInsectCount(levelIndex) {
  const level = LEVELS[Math.min(levelIndex, LEVELS.length - 1)];
  return level.insects.reduce((sum, entry) => sum + entry.count, 0);
}

export function getLevelConfig(levelIndex) {
  return LEVELS[Math.min(levelIndex, LEVELS.length - 1)];
}

export function getTotalLevels() {
  return LEVELS.length;
}
