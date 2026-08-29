import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, clearSession, loadSession, patchSession, post, type Session } from './api';
import { EMPTY_DAY2, EMPTY_PREVIEW, isDay2State, isDay2UnlockedState, type Day2State, type SessionSnapshot } from './types';

type SessionContextValue = {
  local: Session | null;
  snapshot: SessionSnapshot | null;
  loading: boolean;
  offline: boolean;
  error: string;
  adopt: (session: Session) => void;
  refresh: () => Promise<SessionSnapshot | null>;
  updateDay2: (day2: Day2State) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function fallbackSnapshot(session: Session): SessionSnapshot {
  const enteredDay2 = isDay2State(session.state);
  return {
    player: { id: session.player_id, name: session.name, state: session.state },
    mask: { ...EMPTY_PREVIEW, state: session.state },
    day: enteredDay2 ? 2 : 1,
    day2_unlocked: isDay2UnlockedState(session.state),
    resources: {},
    day2: enteredDay2 ? EMPTY_DAY2 : null
  };
}

export function normalizeDay2(value?: Partial<Day2State> | null): Day2State {
  if (!value) return EMPTY_DAY2;
  return {
    ...EMPTY_DAY2,
    ...value,
    resources: value.resources ?? {},
    npc_points: Array.isArray(value.npc_points) ? value.npc_points.map((point, index) => ({ ...point, id: point.id || `npc-${index}`, name: point.name || point.label || point.position || `NPC ${index + 1}` })) : [],
    resource_points: Array.isArray(value.resource_points) ? value.resource_points.map((point, index) => ({ ...point, id: point.id || `resource-${index}`, name: point.name || point.resource || point.position || `资源 ${index + 1}`, resource_type: point.resource_type || point.resource })) : [],
    routes: Array.isArray(value.routes) ? value.routes : [],
    gate: { ...EMPTY_DAY2.gate, ...(value.gate ?? {}) },
    grain: { ...EMPTY_DAY2.grain, ...(value.grain ?? {}) },
    towers: { ...EMPTY_DAY2.towers, ...(value.towers ?? {}) },
    registrations: Array.isArray(value.registrations) ? value.registrations : [],
    reports: Array.isArray(value.reports) ? value.reports : [],
    convoys: Array.isArray(value.convoys) ? value.convoys : []
  };
}

function normalizeSnapshot(raw: SessionSnapshot, local: Session): SessionSnapshot {
  const player = raw.player ?? { id: local.player_id, name: local.name, state: local.state };
  const state = player.state || local.state;
  const rawMask = raw.mask as unknown as {
    svg_parts?: typeof EMPTY_PREVIEW.svg_parts;
    fragments?: typeof EMPTY_PREVIEW.fragments;
    fragments_json?: typeof EMPTY_PREVIEW.fragments;
    style?: typeof EMPTY_PREVIEW.svg_parts | null;
    name?: string | null;
    motto?: string | null;
    selected_virtue?: typeof EMPTY_PREVIEW.selected_virtue;
    wall_pattern_id?: string | null;
    inventory?: typeof EMPTY_PREVIEW.inventory;
    cards?: typeof EMPTY_PREVIEW.cards;
    resources?: Record<string, number>;
  } | null | undefined;
  const mask = rawMask ? {
    ...EMPTY_PREVIEW,
    svg_parts: rawMask.svg_parts ?? rawMask.style ?? EMPTY_PREVIEW.svg_parts,
    fragments: rawMask.fragments ?? rawMask.fragments_json ?? EMPTY_PREVIEW.fragments,
    name: rawMask.name ?? null,
    motto: rawMask.motto ?? null,
    selected_virtue: rawMask.selected_virtue ?? null,
    wall_pattern_id: rawMask.wall_pattern_id ?? null,
    inventory: rawMask.inventory ?? [],
    cards: rawMask.cards ?? [],
    resources: rawMask.resources ?? raw.resources ?? {}
  } : null;
  return {
    ...raw,
    player: { ...player, state },
    mask,
    day: raw.day === 2 ? 2 : 1,
    day2_unlocked: Boolean(raw.day2_unlocked),
    resources: raw.resources ?? {},
    day2: raw.day2 ? normalizeDay2(raw.day2) : null
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [local, setLocal] = useState<Session | null>(() => loadSession());
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(() => {
    const stored = loadSession();
    return stored ? fallbackSnapshot(stored) : null;
  });
  const [loading, setLoading] = useState(Boolean(local));
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const current = loadSession();
    setLocal(current);
    if (!current) {
      setSnapshot(null);
      setLoading(false);
      return null;
    }
    setLoading(true);
    try {
      const raw = await post<SessionSnapshot>('/api/session');
      const next = normalizeSnapshot(raw, current);
      setSnapshot(next);
      setOffline(false);
      setError('');
      patchSession({ state: next.player.state, name: next.player.name || current.name });
      return next;
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        clearSession({ preserveOpening: true });
        setLocal(null);
        setSnapshot(null);
        setOffline(false);
        setError('当前行程凭证已失效，请重新领取白面。');
        return null;
      }
      setOffline(true);
      setError(caught instanceof Error ? caught.message : String(caught));
      setSnapshot((previous) => previous ?? fallbackSnapshot(current));
      throw caught;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!local) {
      setLoading(false);
      return;
    }
    void refresh().catch(() => undefined);
  }, [local?.token, refresh]);

  const adopt = useCallback((session: Session) => {
    sessionStorage.removeItem('yelang.day2.entered');
    setLocal(session);
    setSnapshot(fallbackSnapshot(session));
    setOffline(false);
    setError('');
  }, []);

  const updateDay2 = useCallback((day2: Day2State) => {
    setSnapshot((previous) => previous ? { ...previous, day2: normalizeDay2(day2), resources: day2.resources ?? previous.resources } : previous);
  }, []);

  const value = useMemo<SessionContextValue>(() => ({
    local,
    snapshot,
    loading,
    offline,
    error,
    adopt,
    refresh,
    updateDay2
  }), [local, snapshot, loading, offline, error, adopt, refresh, updateDay2]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
