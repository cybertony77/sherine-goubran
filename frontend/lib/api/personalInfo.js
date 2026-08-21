import { useQuery } from '@tanstack/react-query';
import apiClient from '../axios';

export const personalInfoKeys = {
  all: ['personal_info'],
  public: () => [...personalInfoKeys.all, 'public'],
};

export const usePersonalInfo = (options = {}) => {
  return useQuery({
    queryKey: personalInfoKeys.public(),
    queryFn: async () => {
      const { data } = await apiClient.get('/api/personal_info');
      return data;
    },
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: true,
    refetchOnReconnect: false,
    refetchOnMount: 'always',
    ...options,
  });
};
