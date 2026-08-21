import { useQuery } from '@tanstack/react-query';
import apiClient from '../axios';

export const publicEventsKeys = {
  all: ['public_events'],
  list: () => [...publicEventsKeys.all, 'list'],
  detail: (slug) => [...publicEventsKeys.all, 'detail', slug],
};

export const usePublicEvents = (options = {}) => {
  return useQuery({
    queryKey: publicEventsKeys.list(),
    queryFn: async () => {
      const { data } = await apiClient.get('/api/events_workshops?public=1');
      return Array.isArray(data?.events) ? data.events : [];
    },
    staleTime: 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: true,
    ...options,
  });
};

export const usePublicEvent = (slug, options = {}) => {
  const cleanSlug = String(slug || '').trim();
  return useQuery({
    queryKey: publicEventsKeys.detail(cleanSlug),
    queryFn: async () => {
      const params = new URLSearchParams({ public: '1', slug: cleanSlug });
      const { data } = await apiClient.get(`/api/events_workshops?${params.toString()}`);
      return data?.event || null;
    },
    enabled: Boolean(cleanSlug),
    staleTime: 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: true,
    ...options,
  });
};
