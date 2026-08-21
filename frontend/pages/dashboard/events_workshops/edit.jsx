import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Title from '../../../components/Title';
import EventForm, { emptyEventForm, eventToForm } from '../../../components/EventForm';
import apiClient from '../../../lib/axios';
import styles from './events_workshops.module.css';

export default function EditEventWorkshopPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = Number(router.query.id);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['event_workshop', id],
    queryFn: async () => (await apiClient.get(`/api/events_workshops/${id}`)).data,
    enabled: Number.isFinite(id) && id > 0,
    refetchOnMount: 'always',
  });

  const initialValues = useMemo(() => {
    if (!data?.event) return emptyEventForm();
    return eventToForm(data.event);
  }, [data?.event]);

  const mutation = useMutation({
    mutationFn: async (payload) =>
      (await apiClient.put(`/api/events_workshops/${id}`, payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events_workshops'] });
      queryClient.invalidateQueries({ queryKey: ['event_workshop', id] });
      setSuccess('✅ Saved successfully!');
      setTimeout(() => router.push('/dashboard/events_workshops'), 1800);
    },
    onError: (err) => {
      const msg = err?.response?.data?.error || 'Failed to update';
      setError(msg.startsWith('❌') ? msg : `❌ ${msg}`);
    },
  });

  return (
    <div className={styles.page}>
      <div className={styles.formWrap}>
        <Title backText="Back" href="/dashboard/events_workshops">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <Image src="/edit.svg" alt="" width={28} height={28} />
            Edit Event / Workshop
          </span>
        </Title>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Edit Event or Workshop</h2>
              <p>Update details and state-based sections</p>
            </div>
          </div>

          {!Number.isFinite(id) || id <= 0 ? (
            <div className={styles.empty}>
              <h3>Invalid item</h3>
              <p>Missing or invalid id.</p>
            </div>
          ) : isLoading ? (
            <div className={styles.loadingBox}>
              <div className={styles.spinner} />
              Loading…
            </div>
          ) : isError || !data?.event ? (
            <div className={styles.empty}>
              <h3>Not found</h3>
              <p>This item may have been deleted.</p>
            </div>
          ) : (
            <EventForm
              key={data.event.id}
              mode="edit"
              initialValues={initialValues}
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
          )}
        </div>
      </div>
    </div>
  );
}
