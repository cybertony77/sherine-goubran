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
import styles from './blogs.module.css';

function InputWithButton(props) {
  const theme = useMantineTheme();
  return (
    <TextInput
      radius="xl"
      size="md"
      placeholder="Search by name or description"
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

export default function BlogsPage() {
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
    queryKey: ['blogs'],
    queryFn: async () => (await apiClient.get('/api/blogs')).data,
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

  const blogs = data?.blogs || [];
  const canManage = Boolean(data?.canManage);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return blogs.filter((b) => {
      if (visibilityFilter && b.visibilityState !== visibilityFilter) return false;
      if (!q) return true;
      const name = String(b.name || '').toLowerCase();
      const shortDescription = String(b.shortDescription || '').toLowerCase();
      const longDescription = String(b.longDescription || '').toLowerCase();
      const visibilityState = String(b.visibilityState || '').toLowerCase();
      return (
        name.includes(q) ||
        shortDescription.includes(q) ||
        longDescription.includes(q) ||
        visibilityState.includes(q)
      );
    });
  }, [blogs, searchTerm, visibilityFilter]);

  const deleteMutation = useMutation({
    mutationFn: async (id) => (await apiClient.delete(`/api/blogs/${id}`)).data,
    onSuccess: () => {
      setSuccess('✅ Blog deleted successfully!');
      setShowConfirm(false);
      setToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['blogs'] });
    },
    onError: (err) => {
      setError(err?.response?.data?.error || '❌ Failed to delete blog');
      setShowConfirm(false);
    },
  });

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <Title>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <Image src="/blogs.svg" alt="" width={28} height={28} />
            Blogs
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
              <h2>Blogs</h2>
              <p>Manage blog posts with hero image and descriptions</p>
            </div>
            {canManage ? (
              <button
                type="button"
                className={styles.addBtn}
                onClick={() => router.push('/dashboard/blogs/add')}
              >
                <Image src="/plus.svg" alt="" width={18} height={18} />
                Add Blog
              </button>
            ) : null}
          </div>

          {isLoading ? (
            <div className={styles.loadingBox}>
              <div className={styles.spinner} />
              Loading blogs…
            </div>
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>
              <h3>{blogs.length === 0 ? 'No blogs yet' : 'No blogs match'}</h3>
              <p>
                {blogs.length === 0
                  ? 'Create your first blog to get started.'
                  : 'Try a different search term.'}
              </p>
            </div>
          ) : (
            <div className={styles.list}>
              {filtered.map((blog) => (
                <article key={blog.id} className={styles.item}>
                  <div className={styles.itemThumb}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={blog.image}
                      alt={blog.name || 'Blog'}
                      style={{
                        objectPosition: `${Number.isFinite(Number(blog.imagePosX)) ? blog.imagePosX : 50}% ${
                          Number.isFinite(Number(blog.imagePosY)) ? blog.imagePosY : 50
                        }%`,
                      }}
                    />
                  </div>
                  <div className={styles.itemMain}>
                    <div className={styles.itemTop}>
                      <h4 className={styles.itemTitle}>{blog.name}</h4>
                      {blog.visibilityState ? (
                        <span
                          className={`${styles.stateBadge} ${
                            blog.visibilityState === 'Activated'
                              ? styles.stateActive
                              : styles.stateInactive
                          }`}
                        >
                          {blog.visibilityState === 'Activated'
                            ? '✅ Activated'
                            : '❌ Deactivated'}
                        </span>
                      ) : null}
                    </div>
                    <div className={styles.itemMeta}>
                      <span>
                        {blog.createdAtEgypt ||
                          (blog.createdAt ? formatEgyptDateTime(blog.createdAt) : '—')}
                      </span>
                    </div>
                    <p className={styles.itemShort}>{blog.shortDescription}</p>
                  </div>
                  {canManage ? (
                    <div className={styles.itemActions}>
                      <button
                        type="button"
                        className={styles.btnEdit}
                        onClick={() => router.push(`/dashboard/blogs/edit?id=${blog.id}`)}
                      >
                        <Image src="/edit.svg" alt="" width={16} height={16} />
                        Edit
                      </button>
                      <button
                        type="button"
                        className={styles.btnDanger}
                        onClick={() => {
                          setToDelete(blog);
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
            <h3>Delete blog?</h3>
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
