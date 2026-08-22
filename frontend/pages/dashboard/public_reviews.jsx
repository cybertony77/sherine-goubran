import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { IconArrowRight, IconSearch } from '@tabler/icons-react';
import { ActionIcon, TextInput, useMantineTheme } from '@mantine/core';
import Title from '../../components/Title';
import CategorySelect from '../../components/CategorySelect';
import AccountStateSelect from '../../components/AccountStateSelect';
import apiClient from '../../lib/axios';
import styles from '../../styles/public_reviews.module.css';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function InputWithButton({ onButtonClick, onKeyDown, ...props }) {
  const theme = useMantineTheme();
  const handleKeyDown = (e) => {
    if (onKeyDown) onKeyDown(e);
    if (props.onKeyDown) props.onKeyDown(e);
  };
  return (
    <TextInput
      radius="xl"
      size="md"
      placeholder="Search by category or text"
      rightSectionWidth={42}
      leftSection={<IconSearch size={18} stroke={1.5} />}
      rightSection={
        <ActionIcon
          size={32}
          radius="xl"
          color={theme.primaryColor}
          variant="filled"
          onClick={onButtonClick}
          style={{ cursor: 'pointer' }}
          aria-label="Search"
        >
          <IconArrowRight size={18} stroke={1.5} />
        </ActionIcon>
      }
      onKeyDown={handleKeyDown}
      {...props}
    />
  );
}

function buildPublicUrl(slug) {
  if (typeof window === 'undefined') return `/leave-a-review/${slug}`;
  return `${window.location.origin}/leave-a-review/${slug}`;
}

const emptyForm = () => ({
  category: '',
  text: '',
  image: '',
  preview: '',
  imagePosX: 50,
  imagePosY: 50,
  visibilityState: 'Activated',
});

const api = {
  getAll: async () => {
    const { data } = await apiClient.get('/api/public_testimonials');
    return data;
  },
  create: async (payload) => {
    const { data } = await apiClient.post('/api/public_testimonials', payload);
    return data;
  },
  update: async (id, payload) => {
    const { data } = await apiClient.put(`/api/public_testimonials/${id}`, payload);
    return data;
  },
  remove: async (id) => {
    const { data } = await apiClient.delete(`/api/public_testimonials/${id}`);
    return data;
  },
};

export default function PublicReviewsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const addFileRef = useRef(null);
  const editFileRef = useRef(null);

  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [editItem, setEditItem] = useState(emptyForm);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [editCategoryOpen, setEditCategoryOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [showAddSuccess, setShowAddSuccess] = useState(false);
  const [showEditSuccess, setShowEditSuccess] = useState(false);
  const [listSuccess, setListSuccess] = useState('');
  const [createdPage, setCreatedPage] = useState(null);
  const [copySuccess, setCopySuccess] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const { data, isLoading, error: fetchError } = useQuery({
    queryKey: ['public_testimonials'],
    queryFn: api.getAll,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });

  const pages = data?.pages || [];
  const canManage = Boolean(data?.canManage);
  const pendingCount = data?.pendingCount || 0;

  const createMutation = useMutation({
    mutationFn: (payload) => api.create(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['public_testimonials'] });
      setShowAddSuccess(true);
      setError('');
      setCreatedPage(res.page);
      setTimeout(() => setShowAddSuccess(false), 2500);
    },
    onError: (err) => {
      setError(err?.response?.data?.error || '❌ Failed to create public review page');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public_testimonials'] });
      setShowEditSuccess(true);
      setError('');
      setTimeout(() => {
        setEditing(null);
        setEditItem(emptyForm());
        setShowEditSuccess(false);
        setEditCategoryOpen(false);
      }, 2000);
    },
    onError: (err) => {
      setError(err?.response?.data?.error || '❌ Failed to update page');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public_testimonials'] });
      setListSuccess('✅ Public review page deleted successfully!');
      setError('');
      setShowConfirm(false);
      setToDelete(null);
    },
    onError: (err) => {
      setError(err?.response?.data?.error || '❌ Failed to delete page');
      setShowConfirm(false);
      setToDelete(null);
    },
  });

  useEffect(() => {
    if (!error) return undefined;
    const t = setTimeout(() => setError(''), 5000);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    if (!listSuccess) return undefined;
    const t = setTimeout(() => setListSuccess(''), 4000);
    return () => clearTimeout(t);
  }, [listSuccess]);

  useEffect(() => {
    if (!copySuccess) return undefined;
    const t = setTimeout(() => setCopySuccess(''), 2500);
    return () => clearTimeout(t);
  }, [copySuccess]);

  useEffect(() => {
    if (searchInput.trim() === '' && searchTerm !== '') setSearchTerm('');
  }, [searchInput, searchTerm]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return pages.filter((p) => {
      if (visibilityFilter && p.visibilityState !== visibilityFilter) return false;
      if (!q) return true;
      const category = String(p.category || '').toLowerCase();
      const text = String(p.text || '').toLowerCase();
      const slug = String(p.slug || '').toLowerCase();
      const visibilityState = String(p.visibilityState || '').toLowerCase();
      return (
        category.includes(q) ||
        text.includes(q) ||
        slug.includes(q) ||
        visibilityState.includes(q)
      );
    });
  }, [pages, searchTerm, visibilityFilter]);

  const uploadImage = async (file, applyTo) => {
    if (!ALLOWED_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
      setError('❌ Invalid file type. Only JPEG, PNG, GIF, WEBP are allowed.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError('❌ Sorry, Max image size is 10 MB, Please try another picture');
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    setError('');

    try {
      const reader = new FileReader();
      const dataUrl = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setUploadProgress(40);
      const { data } = await apiClient.post(
        '/api/upload/public-testimonial-image',
        { file: dataUrl, fileType: file.type },
        {
          onUploadProgress: (evt) => {
            if (!evt.total) return;
            setUploadProgress(40 + Math.round((evt.loaded / evt.total) * 50));
          },
        }
      );

      const url = data?.url;
      if (!url) throw new Error('No image URL returned');

      applyTo({ image: url, preview: url });
      setUploadProgress(100);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || '❌ Failed to upload image');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 400);
    }
  };

  const openAdd = () => {
    setShowAddForm(true);
    setEditing(null);
    setEditItem(emptyForm());
    setNewItem(emptyForm());
    setCreatedPage(null);
    setError('');
    setShowAddSuccess(false);
    setCategoryOpen(false);
    setCopySuccess('');
  };

  const cancelAdd = () => {
    setShowAddForm(false);
    setNewItem(emptyForm());
    setCreatedPage(null);
    setError('');
    setShowAddSuccess(false);
    setCategoryOpen(false);
  };

  const startEdit = (page) => {
    setEditing(page);
    setEditItem({
      category: page.category || '',
      text: page.text || '',
      image: page.image || '',
      preview: page.image || '',
      imagePosX: Number.isFinite(Number(page.imagePosX)) ? Number(page.imagePosX) : 50,
      imagePosY: Number.isFinite(Number(page.imagePosY)) ? Number(page.imagePosY) : 50,
      visibilityState:
        page.visibilityState === 'Activated' || page.visibilityState === 'Deactivated'
          ? page.visibilityState
          : 'Activated',
    });
    setShowAddForm(false);
    setNewItem(emptyForm());
    setCreatedPage(null);
    setError('');
    setShowEditSuccess(false);
    setEditCategoryOpen(false);
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditItem(emptyForm());
    setError('');
    setShowEditSuccess(false);
    setEditCategoryOpen(false);
  };

  const validate = (item) => {
    if (!item.category.trim()) return '❌ Category is required';
    if (!item.text.trim()) return '❌ Text is required';
    if (!item.image.trim()) return '❌ Image is required';
    if (item.visibilityState !== 'Activated' && item.visibilityState !== 'Deactivated') {
      return '❌ Visibility state is required';
    }
    return '';
  };

  const handleAdd = () => {
    const msg = validate(newItem);
    if (msg) {
      setError(msg);
      return;
    }
    createMutation.mutate({
      category: newItem.category.trim(),
      text: newItem.text.trim(),
      image: newItem.image.trim(),
      imagePosX: newItem.imagePosX,
      imagePosY: newItem.imagePosY,
      visibilityState: newItem.visibilityState,
    });
  };

  const handleUpdate = () => {
    const msg = validate(editItem);
    if (msg) {
      setError(msg);
      return;
    }
    updateMutation.mutate({
      id: editing.id,
      payload: {
        category: editItem.category.trim(),
        text: editItem.text.trim(),
        image: editItem.image.trim(),
        imagePosX: editItem.imagePosX,
        imagePosY: editItem.imagePosY,
        visibilityState: editItem.visibilityState,
      },
    });
  };

  const copyLink = async (slug) => {
    const url = buildPublicUrl(slug);
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess('✅ Link copied to clipboard!');
    } catch {
      setError('❌ Failed to copy link');
    }
  };

  const shareLink = async (slug) => {
    const url = buildPublicUrl(slug);
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Leave a Review',
          text: 'Share your review with us',
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setCopySuccess('✅ Link copied (share not supported on this device)');
      }
    } catch (err) {
      if (err?.name !== 'AbortError') setError('❌ Failed to share link');
    }
  };

  const dragRef = useRef(null);
  const dragStateRef = useRef(null);

  const clampPos = (n) => Math.min(100, Math.max(0, n));

  const onPreviewPointerDown = (e, item, setItem) => {
    if (uploading) return;
    const el = e.currentTarget;
    el.setPointerCapture?.(e.pointerId);
    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: Number(item.imagePosX) || 50,
      posY: Number(item.imagePosY) || 50,
      width: el.clientWidth || 1,
      height: el.clientHeight || 1,
      setItem,
    };
  };

  const onPreviewPointerMove = (e) => {
    const drag = dragStateRef.current;
    if (!drag) return;
    const dx = ((e.clientX - drag.startX) / drag.width) * 100;
    const dy = ((e.clientY - drag.startY) / drag.height) * 100;
    // Dragging the image content: move opposite to pointer for natural pan
    const nextX = clampPos(drag.posX - dx);
    const nextY = clampPos(drag.posY - dy);
    drag.setItem((s) => ({ ...s, imagePosX: nextX, imagePosY: nextY }));
  };

  const onPreviewPointerUp = (e) => {
    if (dragStateRef.current) {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
      dragStateRef.current = null;
    }
  };

  const renderImageField = (item, setItem, inputRef) => {
    const hasImage = Boolean(item.preview || item.image);
    const posX = Number.isFinite(Number(item.imagePosX)) ? Number(item.imagePosX) : 50;
    const posY = Number.isFinite(Number(item.imagePosY)) ? Number(item.imagePosY) : 50;

    return (
      <div className={styles.formField}>
        <label>
          Hero Image <span className={styles.requiredStar}>*</span>
        </label>
        <div className={styles.imageBox}>
          {hasImage ? (
            <div
              ref={dragRef}
              className={styles.imagePreviewWrap}
              onPointerDown={(e) => onPreviewPointerDown(e, item, setItem)}
              onPointerMove={onPreviewPointerMove}
              onPointerUp={onPreviewPointerUp}
              onPointerCancel={onPreviewPointerUp}
              title="Drag to reposition the visible area"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.preview || item.image}
                alt="Preview"
                className={styles.imagePreview}
                style={{ objectPosition: `${posX}% ${posY}%` }}
                draggable={false}
              />
              <div className={styles.dragHint}>Drag to reposition</div>
              {uploading ? (
                <div className={styles.uploadOverlay}>
                  <div className={styles.uploadProgressTrack}>
                    <div
                      className={styles.uploadProgressBar}
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <span className={styles.uploadProgressLabel}>Uploading… {uploadProgress}%</span>
                </div>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              className={styles.dropzone}
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <div className={styles.dropzoneUploading}>
                  <div className={styles.uploadProgressTrack}>
                    <div
                      className={styles.uploadProgressBar}
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <span>Uploading… {uploadProgress}%</span>
                </div>
              ) : (
                <>
                  <Image src="/camera.svg" alt="" width={28} height={28} />
                  <span className={styles.dropzoneTitle}>Drop image here or click to upload</span>
                  <span className={styles.dropzoneHint}>JPEG, PNG, GIF, WEBP · max 10 MB</span>
                </>
              )}
            </button>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) {
                uploadImage(file, (patch) =>
                  setItem((s) => ({
                    ...s,
                    ...patch,
                    imagePosX: 50,
                    imagePosY: 50,
                  }))
                );
              }
            }}
          />

          {hasImage && !uploading ? (
            <div className={styles.imageActions}>
              <button
                type="button"
                className={styles.changeImageBtn}
                onClick={() => inputRef.current?.click()}
              >
                <Image src="/camera.svg" alt="" width={16} height={16} />
                Change image
              </button>
              <button
                type="button"
                className={styles.removeImageBtn}
                onClick={() =>
                  setItem((s) => ({
                    ...s,
                    image: '',
                    preview: '',
                    imagePosX: 50,
                    imagePosY: 50,
                  }))
                }
              >
                <Image src="/trash2.svg" alt="" width={16} height={16} />
                Remove
              </button>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  if (fetchError) {
    return (
      <div className={styles.page}>
        <div className={styles.wrap}>
          <Title href="/dashboard">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Image src="/testimonials2.svg" alt="" width={32} height={32} />
              Public Reviews
            </div>
          </Title>
          <div className={`${styles.alert} ${styles.alertError}`}>
            ❌{' '}
            {fetchError?.response?.data?.error ||
              fetchError.message ||
              'Failed to load public reviews'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <Title href="/dashboard" style={{ justifyContent: 'space-between', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Image src="/testimonials2.svg" alt="" width={32} height={32} />
            Public Reviews
          </div>
        </Title>

        <div className={styles.searchWrap}>
          <InputWithButton
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setSearchTerm(searchInput.trim());
              }
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
              <h2>Public Review Pages</h2>
              <p>Create shareable links for clients to leave a review</p>
            </div>
            <div className={styles.headerActions}>
              {canManage ? (
                <>
                  <button type="button" className={styles.addBtn} onClick={openAdd}>
                    <Image src="/plus.svg" alt="" width={18} height={18} />
                    Add Page
                  </button>
                  <button
                    type="button"
                    className={styles.pendingBtn}
                    onClick={() => router.push('/dashboard/pending_reviews')}
                  >
                    <Image
                      src="/history.svg"
                      alt=""
                      width={18}
                      height={18}
                      style={{ filter: 'brightness(0) invert(1)' }}
                    />
                    Pending Reviews
                    <span className={styles.pendingCount} aria-label={`${pendingCount} pending`}>
                      {pendingCount}
                    </span>
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {isLoading ? (
            <div className={styles.loadingBox}>
              <div className={styles.spinner} />
              Loading pages…
            </div>
          ) : pages.length === 0 ? (
            <div className={styles.empty}>
              <h3>No public review pages yet</h3>
              <p>Click “Add Page” to create your first shareable review link.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>
              <h3>No pages match</h3>
              <p>Try a different search term.</p>
            </div>
          ) : (
            <div className={styles.list}>
              {filtered.map((page, index) => {
                const url = buildPublicUrl(page.slug);
                return (
                  <article
                    key={page.id}
                    className={styles.item}
                    style={{ animationDelay: `${Math.min(index, 8) * 0.05}s` }}
                  >
                    <div className={styles.itemMedia}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={page.image}
                        alt=""
                        className={styles.itemImage}
                        style={{
                          objectPosition: `${Number.isFinite(Number(page.imagePosX)) ? page.imagePosX : 50}% ${Number.isFinite(Number(page.imagePosY)) ? page.imagePosY : 50}%`,
                        }}
                      />
                    </div>
                    <div className={styles.itemMain}>
                      <div className={styles.itemTop}>
                        <h4 className={styles.itemTitle}>{page.category}</h4>
                        {page.visibilityState ? (
                          <span
                            className={`${styles.stateBadge} ${
                              page.visibilityState === 'Activated'
                                ? styles.stateActive
                                : styles.stateInactive
                            }`}
                          >
                            {page.visibilityState === 'Activated'
                              ? '✅ Activated'
                              : '❌ Deactivated'}
                          </span>
                        ) : null}
                      </div>
                      <p className={styles.itemText}>{page.text}</p>
                      <div className={styles.slugRow}>
                        <span className={styles.slugBadge}>/{page.slug}</span>
                      </div>
                      <div className={styles.linkBox}>
                        <code className={styles.linkCode}>{url}</code>
                        <div className={styles.linkActions}>
                          <button
                            type="button"
                            className={styles.copyBtn}
                            onClick={() => copyLink(page.slug)}
                          >
                            <Image src="/copy2.svg" alt="" width={16} height={16} />
                            Copy Link
                          </button>
                          <button
                            type="button"
                            className={styles.shareBtn}
                            onClick={() => shareLink(page.slug)}
                          >
                            <Image
                              src="/share.svg"
                              alt=""
                              width={16}
                              height={16}
                              style={{ filter: 'brightness(0) invert(1)' }}
                            />
                            Share Link
                          </button>
                        </div>
                      </div>
                    </div>
                    {canManage ? (
                      <div className={styles.itemActions}>
                        <button
                          type="button"
                          className={styles.btnEdit}
                          onClick={() => startEdit(page)}
                        >
                          <Image src="/edit.svg" alt="" width={16} height={16} />
                          Edit
                        </button>
                        <button
                          type="button"
                          className={styles.btnDanger}
                          onClick={() => {
                            setToDelete(page);
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
                );
              })}
            </div>
          )}

          {listSuccess ? (
            <div className={`${styles.alert} ${styles.alertSuccess}`} role="status">
              {listSuccess}
            </div>
          ) : null}
          {copySuccess ? (
            <div className={`${styles.alert} ${styles.alertSuccess}`} role="status">
              {copySuccess}
            </div>
          ) : null}
          {error && !showAddForm && !editing ? (
            <div className={`${styles.alert} ${styles.alertError}`} role="alert">
              {error}
            </div>
          ) : null}
        </div>
      </div>

      {/* Add Modal */}
      {showAddForm ? (
        <div
          className={styles.formModal}
          onClick={(e) => {
            if (e.target === e.currentTarget && !createdPage) cancelAdd();
          }}
        >
          <div className={styles.formModalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>
                <Image src="/plus.svg" alt="" width={24} height={24} />
                {createdPage ? 'Page Created' : 'Add Public Review Page'}
              </h3>
              <button type="button" className={styles.closeModalBtn} onClick={cancelAdd}>
                ✕
              </button>
            </div>

            {!createdPage ? (
              <div className={styles.modalForm}>
                {renderImageField(newItem, setNewItem, addFileRef)}
                <div className={styles.formField}>
                  <label>
                    Text <span className={styles.requiredStar}>*</span>
                  </label>
                  <textarea
                    value={newItem.text}
                    onChange={(e) => setNewItem((s) => ({ ...s, text: e.target.value }))}
                    placeholder="Text shown under the hero image"
                    className={styles.modalTextarea}
                    rows={4}
                  />
                </div>
                <div className={styles.formField}>
                  <AccountStateSelect
                    value={newItem.visibilityState}
                    onChange={(visibilityState) =>
                      setNewItem((s) => ({ ...s, visibilityState }))
                    }
                    label="Visibility State"
                    placeholder="Select Visibility State"
                    required
                    style={{ marginBottom: 0 }}
                  />
                </div>
                <div className={styles.formField}>
                  <label>
                    Category <span className={styles.requiredStar}>*</span>
                  </label>
                  <CategorySelect
                    selectedCategory={newItem.category}
                    onCategoryChange={(category) =>
                      setNewItem((s) => ({ ...s, category }))
                    }
                    isOpen={categoryOpen}
                    onToggle={() => setCategoryOpen((o) => !o)}
                    onClose={() => setCategoryOpen(false)}
                    required
                  />
                </div>
                <div className={styles.modalButtons}>
                  <button
                    type="button"
                    className={styles.modalSaveBtn}
                    onClick={handleAdd}
                    disabled={createMutation.isPending || uploading}
                  >
                    {createMutation.isPending ? 'Saving...' : 'Add Page'}
                  </button>
                  <button
                    type="button"
                    className={styles.modalCancelBtn}
                    onClick={cancelAdd}
                    disabled={createMutation.isPending || uploading}
                  >
                    Cancel
                  </button>
                </div>
                {error ? <div className={styles.errorPopup}>{error}</div> : null}
                {showAddSuccess ? (
                  <div className={styles.successPopup}>✅ Page created successfully!</div>
                ) : null}
              </div>
            ) : (
              <div className={styles.modalForm}>
                <div className={styles.successPopup}>✅ Page created successfully!</div>
                <div className={styles.linkBox}>
                  <code className={styles.linkCode}>{buildPublicUrl(createdPage.slug)}</code>
                  <div className={styles.linkActions}>
                    <button
                      type="button"
                      className={styles.copyBtn}
                      onClick={() => copyLink(createdPage.slug)}
                    >
                      <Image src="/copy2.svg" alt="" width={18} height={18} />
                      Copy Link
                    </button>
                    <button
                      type="button"
                      className={styles.shareBtn}
                      onClick={() => shareLink(createdPage.slug)}
                    >
                      <Image
                        src="/share.svg"
                        alt=""
                        width={18}
                        height={18}
                        style={{ filter: 'brightness(0) invert(1)' }}
                      />
                      Share Link
                    </button>
                  </div>
                </div>
                {copySuccess ? <div className={styles.successPopup}>{copySuccess}</div> : null}
                <div className={styles.modalButtons}>
                  <button type="button" className={styles.modalSaveBtn} onClick={cancelAdd}>
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Edit Modal */}
      {editing ? (
        <div
          className={styles.formModal}
          onClick={(e) => {
            if (e.target === e.currentTarget) cancelEdit();
          }}
        >
          <div className={styles.formModalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>
                <Image src="/edit.svg" alt="" width={24} height={24} />
                Edit Public Review Page
              </h3>
              <button type="button" className={styles.closeModalBtn} onClick={cancelEdit}>
                ✕
              </button>
            </div>
            <div className={styles.modalForm}>
              {renderImageField(editItem, setEditItem, editFileRef)}
              <div className={styles.formField}>
                <label>
                  Text <span className={styles.requiredStar}>*</span>
                </label>
                <textarea
                  value={editItem.text}
                  onChange={(e) => setEditItem((s) => ({ ...s, text: e.target.value }))}
                  placeholder="Text shown under the hero image"
                  className={styles.modalTextarea}
                  rows={4}
                />
              </div>
              <div className={styles.formField}>
                <AccountStateSelect
                  value={editItem.visibilityState}
                  onChange={(visibilityState) =>
                    setEditItem((s) => ({ ...s, visibilityState }))
                  }
                  label="Visibility State"
                  placeholder="Select Visibility State"
                  required
                  style={{ marginBottom: 0 }}
                />
              </div>
              <div className={styles.formField}>
                <label>
                  Category <span className={styles.requiredStar}>*</span>
                </label>
                <CategorySelect
                  selectedCategory={editItem.category}
                  onCategoryChange={(category) =>
                    setEditItem((s) => ({ ...s, category }))
                  }
                  isOpen={editCategoryOpen}
                  onToggle={() => setEditCategoryOpen((o) => !o)}
                  onClose={() => setEditCategoryOpen(false)}
                  required
                />
              </div>
              <div className={styles.slugRow}>
                <span className={styles.slugBadge}>Current slug: /{editing.slug}</span>
              </div>
              <div className={styles.modalButtons}>
                <button
                  type="button"
                  className={styles.modalSaveBtn}
                  onClick={handleUpdate}
                  disabled={updateMutation.isPending || uploading}
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  className={styles.modalCancelBtn}
                  onClick={cancelEdit}
                  disabled={updateMutation.isPending || uploading}
                >
                  Cancel
                </button>
              </div>
              {error ? <div className={styles.errorPopup}>{error}</div> : null}
              {showEditSuccess && !error ? (
                <div className={styles.successPopup}>✅ Page updated successfully!</div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Delete confirm */}
      {showConfirm ? (
        <div
          className={styles.formModal}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowConfirm(false);
              setToDelete(null);
            }
          }}
        >
          <div className={styles.confirmContent} onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Delete</h3>
            <p>
              Delete public review page for <strong>{toDelete?.category}</strong>?
            </p>
            <p>
              <strong>This action cannot be undone!</strong>
            </p>
            <div className={styles.confirmButtons}>
              <button
                type="button"
                className={styles.confirmDeleteBtn}
                onClick={() => deleteMutation.mutate(toDelete.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Yes, Delete Page'}
              </button>
              <button
                type="button"
                className={styles.confirmCancelBtn}
                onClick={() => {
                  setShowConfirm(false);
                  setToDelete(null);
                }}
                disabled={deleteMutation.isPending}
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
