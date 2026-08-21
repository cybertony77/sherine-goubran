import { useQuery } from '@tanstack/react-query';
import apiClient from '../axios';

export const systemKeys = {
  all: ['system'],
  config: () => [...systemKeys.all, 'config', 'live-name-v1'],
};

const systemApi = {
  getConfig: async () => {
    const response = await apiClient.get('/api/system/config');
    return response.data;
  },
};

export const useSystemConfig = (options = {}) => {
  return useQuery({
    queryKey: systemKeys.config(),
    queryFn: () => systemApi.getConfig(),
    // Always re-read SYSTEM_NAME / env.config — never use a stale cached name in headers.
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 1,
    ...options,
  });
};
