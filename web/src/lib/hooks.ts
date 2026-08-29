import { useCallback, useEffect, useState } from 'react';
import { post } from './api';
import { normalizeDay2, useSession } from './session';
import { EMPTY_DAY2, EMPTY_PREVIEW, type Day2State, type Preview } from './types';

export function usePreview() {
  const { local, snapshot } = useSession();
  const [preview, setPreview] = useState<Preview>(() => snapshot?.mask ?? EMPTY_PREVIEW);
  const [loading, setLoading] = useState(Boolean(local));
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!local) return EMPTY_PREVIEW;
    setLoading(true);
    try {
      const result = await post<Preview>('/api/mask-preview', { player_id: local.player_id });
      setPreview(result);
      setError('');
      return result;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      throw caught;
    } finally {
      setLoading(false);
    }
  }, [local?.player_id]);

  useEffect(() => {
    if (snapshot?.mask) setPreview(snapshot.mask);
  }, [snapshot?.mask]);

  useEffect(() => {
    if (!local) return;
    void refresh().catch(() => undefined);
  }, [local?.token, refresh]);

  return { preview, loading, error, refresh };
}

export function useDay2Snapshot() {
  const { snapshot, updateDay2 } = useSession();
  const [state, setState] = useState<Day2State>(() => normalizeDay2(snapshot?.day2 ?? EMPTY_DAY2));
  const [fallback, setFallback] = useState(!snapshot?.day2);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const response = await post<{ day2: Day2State }>('/api/day2/snapshot');
      const next = normalizeDay2(response.day2);
      setState(next);
      updateDay2(next);
      setFallback(false);
      setError('');
      return next;
    } catch (caught) {
      setFallback((current) => current);
      setError(caught instanceof Error ? caught.message : String(caught));
      throw caught;
    }
  }, [updateDay2]);

  useEffect(() => {
    if (snapshot?.day2) {
      setState(normalizeDay2(snapshot.day2));
      setFallback(false);
    }
  }, [snapshot?.day2]);

  useEffect(() => {
    void refresh().catch(() => undefined);
    const timer = window.setInterval(() => void refresh().catch(() => undefined), 5000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refresh().catch(() => undefined);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refresh]);

  return { state, fallback, error, refresh, setState: (next: Day2State) => {
    const normalized = normalizeDay2(next);
    setState(normalized);
    setFallback(false);
    updateDay2(normalized);
  } };
}
