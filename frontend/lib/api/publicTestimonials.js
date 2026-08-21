import { useQuery } from '@tanstack/react-query';
import apiClient from '../axios';

export const publicTestimonialsKeys = {
  all: ['public_testimonials'],
  list: () => [...publicTestimonialsKeys.all, 'list'],
};

export const usePublicTestimonials = (options = {}) => {
  return useQuery({
    queryKey: publicTestimonialsKeys.list(),
    queryFn: async () => {
      const { data } = await apiClient.get('/api/testimonials?public=1');
      return Array.isArray(data?.testimonials) ? data.testimonials : [];
    },
    staleTime: 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: true,
    ...options,
  });
};

export function shuffleList(items) {
  const arr = [...(Array.isArray(items) ? items : [])];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function parseCategoryList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function selectServiceReviews(testimonials, { category, limit } = {}) {
  const list = (Array.isArray(testimonials) ? testimonials : []).filter(
    (item) => String(item?.name || '').trim() && String(item?.text || '').trim()
  );
  const wanted = parseCategoryList(category).map((item) => item.toLowerCase());
  if (!wanted.length) return [];

  const matched = list.filter((item) =>
    wanted.includes(String(item.category || '').trim().toLowerCase())
  );
  const shuffled = shuffleList(matched);
  const n = Number(limit);
  if (Number.isFinite(n) && n > 0) return shuffled.slice(0, Math.floor(n));
  return shuffled;
}
