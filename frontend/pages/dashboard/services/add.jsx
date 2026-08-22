import { useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Title from '../../../components/Title';
import ServiceForm, { emptyServiceForm } from '../../../components/ServiceForm';
import apiClient from '../../../lib/axios';
import styles from '../../../styles/services.module.css';

export default function AddServicePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const mutation = useMutation({
    mutationFn: async (payload) => (await apiClient.post('/api/services', payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setSuccess('✅ Service saved successfully!');
      setTimeout(() => router.push('/dashboard/services'), 1800);
    },
    onError: (err) => {
      const msg = err?.response?.data?.error || 'Failed to create service';
      setError(msg.startsWith('❌') ? msg : `❌ ${msg}`);
    },
  });

  return (
    <div className={styles.page}>
      <div className={styles.formWrap}>
        <Title backText="Back" href="/dashboard/services">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <Image src="/plus.svg" alt="" width={28} height={28} />
            Add Service
          </span>
        </Title>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2>New Service</h2>
              <p>Add hero image, details, benefits and reviews settings</p>
            </div>
          </div>

          <ServiceForm
            mode="add"
            initialValues={emptyServiceForm()}
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
        </div>
      </div>
    </div>
  );
}
