import { useQuery } from '@tanstack/react-query';
import apiClient from '../axios';

export const publicServicesKeys = {
  all: ['public_services'],
  list: (limit) => [...publicServicesKeys.all, 'list', limit || 'all'],
  detail: (slug) => [...publicServicesKeys.all, 'detail', slug],
};

export const usePublicServices = (options = {}) => {
  const { limit, ...rest } = options;
  return useQuery({
    queryKey: publicServicesKeys.list(limit),
    queryFn: async () => {
      const params = new URLSearchParams({ public: '1' });
      if (limit) params.set('limit', String(limit));
      const { data } = await apiClient.get(`/api/services?${params.toString()}`);
      return Array.isArray(data?.services) ? data.services : [];
    },
    staleTime: 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: true,
    ...rest,
  });
};

export const usePublicService = (slug, options = {}) => {
  const cleanSlug = String(slug || '').trim();
  return useQuery({
    queryKey: publicServicesKeys.detail(cleanSlug),
    queryFn: async () => {
      const params = new URLSearchParams({ public: '1', slug: cleanSlug });
      const { data } = await apiClient.get(`/api/services?${params.toString()}`);
      return data?.service || null;
    },
    enabled: Boolean(cleanSlug),
    staleTime: 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: true,
    ...options,
  });
};
