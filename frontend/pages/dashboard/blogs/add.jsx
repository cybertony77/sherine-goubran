import { useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Title from '../../../components/Title';
import BlogForm, { emptyBlogForm } from '../../../components/BlogForm';
import apiClient from '../../../lib/axios';
import styles from './blogs.module.css';

export default function AddBlogPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const mutation = useMutation({
    mutationFn: async (payload) => (await apiClient.post('/api/blogs', payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blogs'] });
      setSuccess('✅ Blog saved successfully!');
      setTimeout(() => router.push('/dashboard/blogs'), 1800);
    },
    onError: (err) => {
      const msg = err?.response?.data?.error || 'Failed to create blog';
      setError(msg.startsWith('❌') ? msg : `❌ ${msg}`);
    },
  });

  return (
    <div className={styles.page}>
      <div className={styles.formWrap}>
        <Title backText="Back" href="/dashboard/blogs">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <Image src="/plus.svg" alt="" width={28} height={28} />
            Add Blog
          </span>
        </Title>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2>New Blog</h2>
              <p>Add hero image, title and descriptions</p>
            </div>
          </div>

          <BlogForm
            mode="add"
            initialValues={emptyBlogForm()}
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
        </div>
      </div>
    </div>
  );
}
