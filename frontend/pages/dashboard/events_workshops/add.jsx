import { useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Title from '../../../components/Title';
import EventForm, { emptyEventForm } from '../../../components/EventForm';
import apiClient from '../../../lib/axios';
import styles from '../../../styles/events_workshops.module.css';

export default function AddEventWorkshopPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const mutation = useMutation({
    mutationFn: async (payload) => (await apiClient.post('/api/events_workshops', payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events_workshops'] });
      setSuccess('✅ Saved successfully!');
      setTimeout(() => router.push('/dashboard/events_workshops'), 1800);
    },
    onError: (err) => {
      const msg = err?.response?.data?.error || 'Failed to create';
      setError(msg.startsWith('❌') ? msg : `❌ ${msg}`);
    },
  });

  return (
    <div className={styles.page}>
      <div className={styles.formWrap}>
        <Title backText="Back" href="/dashboard/events_workshops">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <Image src="/plus.svg" alt="" width={28} height={28} />
            Add Event / Workshop
          </span>
        </Title>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2>New Event or Workshop</h2>
              <p>Fill the details. Extra sections depend on Upcoming or Previous state.</p>
            </div>
          </div>

          <EventForm
            mode="add"
            initialValues={emptyEventForm()}
            submitting={mutation.isPending}
            errorMessage={error}
            successMessage={success}
            onCancel={() => router.push('/dashboard/events_workshops')}
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
