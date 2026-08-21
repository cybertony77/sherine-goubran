import { useQuery } from '@tanstack/react-query';
import apiClient from '../axios';

export const publicCertificatesKeys = {
  all: ['public_certificates'],
  list: () => [...publicCertificatesKeys.all, 'list'],
};

export const usePublicCertificates = (options = {}) => {
  return useQuery({
    queryKey: publicCertificatesKeys.list(),
    queryFn: async () => {
      const { data } = await apiClient.get('/api/certificates?public=1');
      return Array.isArray(data?.certificates) ? data.certificates : [];
    },
    staleTime: 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: true,
    ...options,
  });
};
