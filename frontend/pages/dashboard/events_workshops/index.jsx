import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TextInput, ActionIcon, useMantineTheme } from '@mantine/core';
import { IconSearch, IconArrowRight } from '@tabler/icons-react';
import Title from '../../../components/Title';
import AccountStateSelect from '../../../components/AccountStateSelect';
import apiClient from '../../../lib/axios';
import { formatEgyptDateTime } from '../../../lib/egyptDateTime';
import styles from '../../../styles/events_workshops.module.css';

function InputWithButton(props) {
  const theme = useMantineTheme();
  return (
    <TextInput
      radius="xl"
      size="md"
      placeholder="Search by title, location or type"
      rightSectionWidth={42}
      leftSection={<IconSearch size={18} stroke={1.5} />}
      rightSection={
        <ActionIcon
          size={32}
          radius="xl"
          color={theme.primaryColor}
          variant="filled"
          onClick={props.onButtonClick}
        >
          <IconArrowRight size={18} stroke={1.5} />
        </ActionIcon>
      }
      {...props}
    />
  );
}

export default function EventsWorkshopsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const successTimer = useRef(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['events_workshops'],
    queryFn: async () => (await apiClient.get('/api/events_workshops')).data,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  });

  useEffect(() => {
    const onFocus = () => refetch();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refetch]);

  useEffect(() => {
    const handleRoute = () => refetch();
    router.events.on('routeChangeComplete', handleRoute);
    return () => router.events.off('routeChangeComplete', handleRoute);
  }, [router.events, refetch]);

  useEffect(() => {
    if (!searchInput.trim() && searchTerm) setSearchTerm('');
  }, [searchInput, searchTerm]);

  useEffect(() => {
    if (!success) return undefined;
    if (successTimer.current) clearTimeout(successTimer.current);
    successTimer.current = setTimeout(() => setSuccess(''), 5000);
    return () => clearTimeout(successTimer.current);
  }, [success]);

  useEffect(() => {
    if (!error) return undefined;
    const t = setTimeout(() => setError(''), 5000);
    return () => clearTimeout(t);
  }, [error]);

  const events = data?.events || [];
  const canManage = Boolean(data?.canManage);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return events.filter((item) => {
      if (visibilityFilter && item.visibilityState !== visibilityFilter) return false;
      if (!q) return true;
      const name = String(item.name || '').toLowerCase();
      const location = String(item.location || '').toLowerCase();
      const type = String(item.type || '').toLowerCase();
      const state = String(item.state || '').toLowerCase();
      const visibilityState = String(item.visibilityState || '').toLowerCase();
      return (
        name.includes(q) ||
        location.includes(q) ||
        type.includes(q) ||
        state.includes(q) ||
        visibilityState.includes(q)
      );
    });
  }, [events, searchTerm, visibilityFilter]);

  const deleteMutation = useMutation({
    mutationFn: async (id) => (await apiClient.delete(`/api/events_workshops/${id}`)).data,
    onSuccess: () => {
      setSuccess('✅ Deleted successfully!');
      setShowConfirm(false);
      setToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['events_workshops'] });
    },
    onError: (err) => {
      setError(err?.response?.data?.error || '❌ Failed to delete');
      setShowConfirm(false);
    },
  });

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <Title>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <Image src="/events.svg" alt="" width={28} height={28} />
            Events & Workshops
          </span>
        </Title>

        <div className={styles.searchWrap}>
          <InputWithButton
            value={searchInput}
            onChange={(e) => setSearchInput(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setSearchTerm(searchInput.trim());
            }}
            onButtonClick={() => setSearchTerm(searchInput.trim())}
          />
        </div>

        <div className={styles.filtersContainer}>
          <div className={styles.filterRow}>
            <div className={styles.filterGroup}>
              <AccountStateSelect
                value={visibilityFilter}
                onChange={setVisibilityFilter}
                label="Filter by Visibility State"
                placeholder="Select Visibility State"
                style={{ marginBottom: 0 }}
              />
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Events & Workshops</h2>
              <p>Manage upcoming and previous events or workshops</p>
            </div>
            {canManage ? (
              <button
                type="button"
                className={styles.addBtn}
                onClick={() => router.push('/dashboard/events_workshops/add')}
              >
                <Image src="/plus.svg" alt="" width={18} height={18} />
                Add
              </button>
            ) : null}
          </div>

          {isLoading ? (
            <div className={styles.loadingBox}>
              <div className={styles.spinner} />
              Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>
              <h3>{events.length === 0 ? 'No items yet' : 'No items match'}</h3>
              <p>
                {events.length === 0
                  ? 'Create your first event or workshop to get started.'
                  : 'Try a different search term.'}
              </p>
            </div>
          ) : (
            <div className={styles.list}>
              {filtered.map((item) => (
                <article key={item.id} className={styles.item}>
                  <div className={styles.itemThumb}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image}
                      alt={item.name || 'Event'}
                      style={{
                        objectPosition: `${Number.isFinite(Number(item.imagePosX)) ? item.imagePosX : 50}% ${
                          Number.isFinite(Number(item.imagePosY)) ? item.imagePosY : 50
                        }%`,
                      }}
                    />
                  </div>
                  <div className={styles.itemMain}>
                    <div className={styles.itemTop}>
                      <h4 className={styles.itemTitle}>{item.name}</h4>
                      {item.visibilityState ? (
                        <span
                          className={`${styles.stateBadge} ${
                            item.visibilityState === 'Activated'
                              ? styles.stateActive
                              : styles.stateInactive
                          }`}
                        >
                          {item.visibilityState === 'Activated'
                            ? '✅ Activated'
                            : '❌ Deactivated'}
                        </span>
                      ) : null}
                    </div>
                    <div className={styles.itemMeta}>
                      <span>{item.date || '—'}</span>
                      <span className={styles.itemDot}>•</span>
                      <span>{item.location || '—'}</span>
                    </div>
                    <p className={styles.itemShort}>{item.shortDescription}</p>
                    <div className={styles.itemTags}>
                      <span className={`${styles.tag} ${styles.tagCategory}`}>{item.type}</span>
                      <span className={`${styles.tag} ${styles.tagCount}`}>{item.state}</span>
                    </div>
                    <div className={styles.itemMeta} style={{ marginTop: 6 }}>
                      <span>
                        {item.createdAtEgypt ||
                          (item.createdAt ? formatEgyptDateTime(item.createdAt) : '—')}
                      </span>
                    </div>
                  </div>
                  {canManage ? (
                    <div className={styles.itemActions}>
                      <button
                        type="button"
                        className={styles.btnEdit}
                        onClick={() =>
                          router.push(`/dashboard/events_workshops/edit?id=${item.id}`)
                        }
                      >
                        <Image src="/edit.svg" alt="" width={16} height={16} />
                        Edit
                      </button>
                      <button
                        type="button"
                        className={styles.btnDanger}
                        onClick={() => {
                          setToDelete(item);
                          setShowConfirm(true);
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Image src="/trash2.svg" alt="" width={16} height={16} />
                        Delete
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}

          {success ? (
            <div className={`${styles.alert} ${styles.alertSuccess}`} role="status">
              {success}
            </div>
          ) : null}
          {error ? (
            <div className={`${styles.alert} ${styles.alertError}`} role="alert">
              {error}
            </div>
          ) : null}
        </div>
      </div>

      {showConfirm && toDelete ? (
        <div className={styles.confirmOverlay} onClick={() => setShowConfirm(false)}>
          <div className={styles.confirmContent} onClick={(e) => e.stopPropagation()}>
            <h3>Delete item?</h3>
            <p>
              Are you sure you want to delete <strong>{toDelete.name}</strong>?
            </p>
            <div className={styles.confirmButtons}>
              <button
                type="button"
                className={styles.confirmDeleteBtn}
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(Number(toDelete.id))}
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
              <button
                type="button"
                className={styles.confirmCancelBtn}
                disabled={deleteMutation.isPending}
                onClick={() => {
                  setShowConfirm(false);
                  setToDelete(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
