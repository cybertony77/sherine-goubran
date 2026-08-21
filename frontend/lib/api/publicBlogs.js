import { useQuery } from '@tanstack/react-query';
import apiClient from '../axios';

export const publicBlogsKeys = {
  all: ['public_blogs'],
  list: (limit) => [...publicBlogsKeys.all, 'list', limit || 'all'],
  detail: (slug) => [...publicBlogsKeys.all, 'detail', slug],
};

export const usePublicBlogs = (options = {}) => {
  const { limit, ...rest } = options;
  return useQuery({
    queryKey: publicBlogsKeys.list(limit),
    queryFn: async () => {
      const params = new URLSearchParams({ public: '1' });
      if (limit) params.set('limit', String(limit));
      const { data } = await apiClient.get(`/api/blogs?${params.toString()}`);
      return Array.isArray(data?.blogs) ? data.blogs : [];
    },
    staleTime: 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: true,
    ...rest,
  });
};

export const usePublicBlog = (slug, options = {}) => {
  const cleanSlug = String(slug || '').trim();
  return useQuery({
    queryKey: publicBlogsKeys.detail(cleanSlug),
    queryFn: async () => {
      const params = new URLSearchParams({ public: '1', slug: cleanSlug });
      const { data } = await apiClient.get(`/api/blogs?${params.toString()}`);
      return data?.blog || null;
    },
    enabled: Boolean(cleanSlug),
    staleTime: 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: true,
    ...options,
  });
};
