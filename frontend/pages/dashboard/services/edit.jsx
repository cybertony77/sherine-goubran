import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Title from '../../../components/Title';
import ServiceForm, { emptyServiceForm, serviceToForm } from '../../../components/ServiceForm';
import apiClient from '../../../lib/axios';
import styles from './services.module.css';

export default function EditServicePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = Number(router.query.id);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['service', id],
    queryFn: async () => (await apiClient.get(`/api/services/${id}`)).data,
    enabled: Number.isFinite(id) && id > 0,
    refetchOnMount: 'always',
  });

  const initialValues = useMemo(() => {
    if (!data?.service) return emptyServiceForm();
    return serviceToForm(data.service);
  }, [data?.service]);

  const mutation = useMutation({
    mutationFn: async (payload) => (await apiClient.put(`/api/services/${id}`, payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['service', id] });
      setSuccess('✅ Service saved successfully!');
      setTimeout(() => router.push('/dashboard/services'), 1800);
    },
    onError: (err) => {
      const msg = err?.response?.data?.error || 'Failed to update service';
      setError(msg.startsWith('❌') ? msg : `❌ ${msg}`);
    },
  });

  return (
    <div className={styles.page}>
      <div className={styles.formWrap}>
        <Title backText="Back" href="/dashboard/services">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <Image src="/edit.svg" alt="" width={28} height={28} />
            Edit Service
          </span>
        </Title>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Edit Service</h2>
              <p>Update hero image, details, benefits and reviews settings</p>
            </div>
          </div>

          {!Number.isFinite(id) || id <= 0 ? (
            <div className={styles.empty}>
              <h3>Invalid service</h3>
              <p>Missing or invalid service id.</p>
            </div>
          ) : isLoading ? (
            <div className={styles.loadingBox}>
              <div className={styles.spinner} />
              Loading service…
            </div>
          ) : isError || !data?.service ? (
            <div className={styles.empty}>
              <h3>Service not found</h3>
              <p>This service may have been deleted.</p>
            </div>
          ) : (
            <ServiceForm
              key={data.service.id}
              mode="edit"
              initialValues={initialValues}
              submitting={mutation.isPending}
              errorMessage={error}
              successMessage={success}
              onCancel={() => router.push('/dashboard/services')}
              onSubmit={(payload) => {
                setError('');
                setSuccess('');
                mutation.mutate(payload);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
