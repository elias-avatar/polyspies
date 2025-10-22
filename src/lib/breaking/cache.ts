export type BreakingCard = {
  title: string;
  url: string;
  image?: string;
  chance?: string;
};

type CacheShape = { data: BreakingCard[]; updatedAt: number };

let store: CacheShape = { data: [], updatedAt: 0 };

export function setBreakingCache(data: BreakingCard[], updatedAt: number = Date.now()) {
  store = { data, updatedAt };
}

export function getBreakingCache(): CacheShape {
  return store;
}


