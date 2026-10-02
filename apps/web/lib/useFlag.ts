'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from './api';

const CACHE_KEY = 'nexus_feature_flags';
const CACHE_TTL = 60_000;

let memoryCache: { data: Record<string, boolean>; ts: number } | null = null;

async function loadFlags(): Promise<Record<string, boolean>> {
  if (memoryCache && Date.now() - memoryCache.ts < CACHE_TTL) {
    return memoryCache.data;
  }
  try {
    const res = await apiFetch('/api/feature-flags/my');
    if (!res.ok) return {};
    const data = await res.json();
    memoryCache = { data, ts: Date.now() };
    return data;
  } catch {
    return {};
  }
}

export function useFlag(key: string): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    loadFlags().then((flags) => setEnabled(!!flags[key]));
  }, [key]);
  return enabled;
}

export function useFlags(): Record<string, boolean> {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  useEffect(() => { loadFlags().then(setFlags); }, []);
  return flags;
}
