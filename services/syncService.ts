type SyncListener = (state: { syncing: boolean; pendingCount: number }) => void;

let state = { syncing: false, pendingCount: 0 };
const listeners = new Set<SyncListener>();

export function subscribeSync(listener: SyncListener): () => void {
  listeners.add(listener);
  // Emit current state immediately
  try { listener(state); } catch {}
  return () => listeners.delete(listener);
}

function emit() {
  for (const l of listeners) {
    try { l(state); } catch (e) { /* ignore listener errors */ }
  }
}

export function setSyncing(value: boolean): void {
  if (state.syncing === value) return;
  state = { ...state, syncing: value };
  emit();
}

export function setPendingCount(count: number): void {
  if (state.pendingCount === count) return;
  state = { ...state, pendingCount: count };
  emit();
}

export function getSyncState() {
  return { ...state };
}

export default {
  subscribeSync,
  setSyncing,
  setPendingCount,
  getSyncState,
};
