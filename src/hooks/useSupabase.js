import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Generic hook for Supabase data fetching with mock data fallback.
 *
 * Behavior:
 * - If Supabase returns data → show Supabase data MERGED with mock data
 *   (Supabase records first, then mock records that don't have conflicting IDs)
 * - If Supabase is empty → show mock data only
 * - If Supabase fails → show mock data only
 */
export function useSupabase(fetchFn, mockFallback = []) {
  const fetchRef = useRef(fetchFn);
  const mockRef = useRef(mockFallback);
  fetchRef.current = fetchFn;
  mockRef.current = mockFallback;

  const [data, setData] = useState(mockFallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usingMock, setUsingMock] = useState(false);

  const doFetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRef.current();
      if (result && result.length > 0) {
        // Merge: Supabase records + mock records (exclude mock IDs that exist in Supabase)
        const liveIds = new Set(result.map(r => r.id));
        const mockExtras = mockRef.current.filter(m => !liveIds.has(m.id));
        setData([...result, ...mockExtras]);
        setUsingMock(false);
      } else {
        // Empty table — just show mock
        setData(mockRef.current);
        setUsingMock(true);
      }
    } catch (err) {
      console.warn('Supabase fetch failed, using mock data:', err.message);
      setData(mockRef.current);
      setUsingMock(true);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { doFetch(); }, [doFetch]);

  return { data, loading, error, refetch: doFetch, usingMock, setData };
}

/**
 * Hook for a single record by ID with mock fallback.
 */
export function useSupabaseById(fetchFn, id, mockFinder) {
  const fetchRef = useRef(fetchFn);
  const mockFinderRef = useRef(mockFinder);
  fetchRef.current = fetchFn;
  mockFinderRef.current = mockFinder;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const result = await fetchRef.current(id);
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) {
          console.warn('Supabase fetch by ID failed, using mock:', err.message);
          const mock = mockFinderRef.current ? mockFinderRef.current(id) : null;
          setData(mock);
          setError(err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (id) load();
    return () => { cancelled = true; };
  }, [id]);

  return { data, loading, error, setData };
}
