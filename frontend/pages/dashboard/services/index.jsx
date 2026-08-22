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
import styles from '../../../styles/services.module.css';

function InputWithButton(props) {
  const theme = useMantineTheme();
  return (
    <TextInput
      radius="xl"
      size="md"
      placeholder="Search by name, category or description"
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

export default function ServicesPage() {
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
    queryKey: ['services'],
    queryFn: async () => (await apiClient.get('/api/services')).data,
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

  const services = data?.services || [];
  const canManage = Boolean(data?.canManage);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return services.filter((s) => {
      if (visibilityFilter && s.visibilityState !== visibilityFilter) return false;
      if (!q) return true;
      const name = String(s.name || '').toLowerCase();
      const category = String(s.category || '').toLowerCase();
      const shortDescription = String(s.shortDescription || '').toLowerCase();
      const visibilityState = String(s.visibilityState || '').toLowerCase();
      return (
        name.includes(q) ||
        category.includes(q) ||
        shortDescription.includes(q) ||
        visibilityState.includes(q)
      );
    });
  }, [services, searchTerm, visibilityFilter]);

  const deleteMutation = useMutation({
    mutationFn: async (id) => (await apiClient.delete(`/api/services/${id}`)).data,
    onSuccess: () => {
      setSuccess('✅ Service deleted successfully!');
      setShowConfirm(false);
      setToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
    onError: (err) => {
      setError(err?.response?.data?.error || '❌ Failed to delete service');
      setShowConfirm(false);
    },
  });

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <Title>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <Image src="/services.svg" alt="" width={28} height={28} />
            Services
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
              <h2>Services</h2>
              <p>Manage service pages with hero, benefits and reviews</p>
            </div>
            {canManage ? (
              <button
                type="button"
                className={styles.addBtn}
                onClick={() => router.push('/dashboard/services/add')}
              >
                <Image src="/plus.svg" alt="" width={18} height={18} />
                Add Service
              </button>
            ) : null}
          </div>

          {isLoading ? (
            <div className={styles.loadingBox}>
              <div className={styles.spinner} />
              Loading services…
            </div>
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>
              <h3>{services.length === 0 ? 'No services yet' : 'No services match'}</h3>
              <p>
                {services.length === 0
                  ? 'Create your first service to get started.'
                  : 'Try a different search term.'}
              </p>
            </div>
          ) : (
            <div className={styles.list}>
              {filtered.map((service) => (
                <article key={service.id} className={styles.item}>
                  <div className={styles.itemThumb}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={service.image}
                      alt={service.name || 'Service'}
                      style={{
                        objectPosition: `${Number.isFinite(Number(service.imagePosX)) ? service.imagePosX : 50}% ${
                          Number.isFinite(Number(service.imagePosY)) ? service.imagePosY : 50
                        }%`,
                      }}
                    />
                  </div>
                  <div className={styles.itemMain}>
                    <div className={styles.itemTop}>
                      <h4 className={styles.itemTitle}>{service.name}</h4>
                      {service.visibilityState ? (
                        <span
                          className={`${styles.stateBadge} ${
                            service.visibilityState === 'Activated'
                              ? styles.stateActive
                              : styles.stateInactive
                          }`}
                        >
                          {service.visibilityState === 'Activated'
                            ? '✅ Activated'
                            : '❌ Deactivated'}
                        </span>
                      ) : null}
                    </div>
                    <div className={styles.itemMeta}>
                      <span>{service.category}</span>
                      <span className={styles.itemDot}>•</span>
                      <span>
                        {service.createdAtEgypt ||
                          (service.createdAt ? formatEgyptDateTime(service.createdAt) : '—')}
                      </span>
                    </div>
                    <p className={styles.itemShort}>{service.shortDescription}</p>
                    <div className={styles.itemTags}>
                      <span className={`${styles.tag} ${styles.tagCategory}`}>
                        {service.category}
                      </span>
                      <span className={`${styles.tag} ${styles.tagCount}`}>
                        {service.testimonialsNumber} reviews
                      </span>
                    </div>
                  </div>
                  {canManage ? (
                    <div className={styles.itemActions}>
                      <button
                        type="button"
                        className={styles.btnEdit}
                        onClick={() => router.push(`/dashboard/services/edit?id=${service.id}`)}
                      >
                        <Image src="/edit.svg" alt="" width={16} height={16} />
                        Edit
                      </button>
                      <button
                        type="button"
                        className={styles.btnDanger}
                        onClick={() => {
                          setToDelete(service);
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
            <h3>Delete service?</h3>
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
