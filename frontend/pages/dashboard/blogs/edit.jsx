import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Title from '../../../components/Title';
import BlogForm, { emptyBlogForm, blogToForm } from '../../../components/BlogForm';
import apiClient from '../../../lib/axios';
import styles from '../../../styles/blogs.module.css';

export default function EditBlogPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = Number(router.query.id);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['blog', id],
    queryFn: async () => (await apiClient.get(`/api/blogs/${id}`)).data,
    enabled: Number.isFinite(id) && id > 0,
    refetchOnMount: 'always',
  });

  const initialValues = useMemo(() => {
    if (!data?.blog) return emptyBlogForm();
    return blogToForm(data.blog);
  }, [data?.blog]);

  const mutation = useMutation({
    mutationFn: async (payload) => (await apiClient.put(`/api/blogs/${id}`, payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blogs'] });
      queryClient.invalidateQueries({ queryKey: ['blog', id] });
      setSuccess('✅ Blog saved successfully!');
      setTimeout(() => router.push('/dashboard/blogs'), 1800);
    },
    onError: (err) => {
      const msg = err?.response?.data?.error || 'Failed to update blog';
      setError(msg.startsWith('❌') ? msg : `❌ ${msg}`);
    },
  });

  return (
    <div className={styles.page}>
      <div className={styles.formWrap}>
        <Title backText="Back" href="/dashboard/blogs">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <Image src="/edit.svg" alt="" width={28} height={28} />
            Edit Blog
          </span>
        </Title>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Edit Blog</h2>
              <p>Update hero image, title and descriptions</p>
            </div>
          </div>

          {!Number.isFinite(id) || id <= 0 ? (
            <div className={styles.empty}>
              <h3>Invalid blog</h3>
              <p>Missing or invalid blog id.</p>
            </div>
          ) : isLoading ? (
            <div className={styles.loadingBox}>
              <div className={styles.spinner} />
              Loading blog…
            </div>
          ) : isError || !data?.blog ? (
            <div className={styles.empty}>
              <h3>Blog not found</h3>
              <p>This blog may have been deleted.</p>
            </div>
          ) : (
            <BlogForm
              key={data.blog.id}
              mode="edit"
              initialValues={initialValues}
              submitting={mutation.isPending}
              errorMessage={error}
              successMessage={success}
              onCancel={() => router.push('/dashboard/blogs')}
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
