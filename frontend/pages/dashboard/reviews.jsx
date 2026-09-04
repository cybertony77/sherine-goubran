import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { IconArrowRight, IconSearch } from '@tabler/icons-react';
import {
  ActionIcon,
  Group,
  Rating,
  Text,
  TextInput,
  useMantineTheme,
} from '@mantine/core';
import Title from '../../components/Title';
import CategorySelect from '../../components/CategorySelect';
import AccountStateSelect from '../../components/AccountStateSelect';
import FromPublicSelect from '../../components/FromPublicSelect';
import apiClient from '../../lib/axios';
import { formatEgyptDateTime } from '../../lib/egyptDateTime';
import styles from '../../styles/dashboardReviews.module.css';

const RATING_COLOR = 'rgba(242, 207, 5, 1)';

export function InputWithButton({ onButtonClick, onKeyDown, ...props }) {
  const theme = useMantineTheme();

  const handleKeyDown = (e) => {
    if (onKeyDown) onKeyDown(e);
    if (props.onKeyDown) props.onKeyDown(e);
  };

  return (
    <TextInput
      radius="xl"
      size="md"
      placeholder="Search by name, category or text"
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

const testimonialsAPI = {
  getAll: async () => {
    const { data } = await apiClient.get('/api/testimonials');
    return data;
  },
  create: async (payload) => {
    const { data } = await apiClient.post('/api/testimonials', payload);
    return data;
  },
  update: async (id, payload) => {
    const { data } = await apiClient.put(`/api/testimonials/${id}`, payload);
    return data;
  },
  remove: async (id) => {
    const { data } = await apiClient.delete(`/api/testimonials/${id}`);
    return data;
  },
};

const emptyForm = () => ({
  name: '',
  category: '',
  text: '',
  rating: 0,
  state: 'Activated',
});

const REVIEW_TEXT_MAX = 300;

export default function ReviewsPage() {
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState(null);
  const [fromPublicFilter, setFromPublicFilter] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [editItem, setEditItem] = useState(emptyForm);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [editCategoryOpen, setEditCategoryOpen] = useState(false);
  const [error, setError] = useState('');
  const [showAddSuccess, setShowAddSuccess] = useState(false);
  const [showEditSuccess, setShowEditSuccess] = useState(false);
  const [listSuccess, setListSuccess] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const { data, isLoading, error: fetchError } = useQuery({
    queryKey: ['testimonials'],
    queryFn: testimonialsAPI.getAll,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    refetchInterval: 8000,
    refetchIntervalInBackground: false,
  });

  const testimonials = data?.testimonials || [];
  const canManage = Boolean(data?.canManage);

  const createMutation = useMutation({
    mutationFn: (payload) => testimonialsAPI.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testimonials'] });
      setShowAddSuccess(true);
      setError('');
      setTimeout(() => {
        setShowAddForm(false);
        setNewItem(emptyForm());
        setShowAddSuccess(false);
        setCategoryOpen(false);
      }, 2000);
    },
    onError: (err) => {
      setError(err?.response?.data?.error || '❌ Failed to create review');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => testimonialsAPI.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testimonials'] });
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
      setError(err?.response?.data?.error || '❌ Failed to update review');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => testimonialsAPI.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testimonials'] });
      setListSuccess('✅ Review deleted successfully!');
      setError('');
      setShowConfirm(false);
      setToDelete(null);
    },
    onError: (err) => {
      setError(err?.response?.data?.error || '❌ Failed to delete review');
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
    if (searchInput.trim() === '' && searchTerm !== '') {
      setSearchTerm('');
    }
  }, [searchInput, searchTerm]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return testimonials.filter((t) => {
      if (stateFilter && t.state !== stateFilter) return false;
      if (fromPublicFilter !== null && fromPublicFilter !== undefined) {
        const isPublic = Boolean(t.from_public);
        if (isPublic !== fromPublicFilter) return false;
      }
      if (!q) return true;
      const name = String(t.name || '').toLowerCase();
      const category = String(t.category || '').toLowerCase();
      const text = String(t.text || '').toLowerCase();
      const state = String(t.state || '').toLowerCase();
      return (
        name.includes(q) ||
        category.includes(q) ||
        text.includes(q) ||
        state.includes(q)
      );
    });
  }, [testimonials, searchTerm, stateFilter, fromPublicFilter]);

  const handleSearch = () => setSearchTerm(searchInput.trim());

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const openAdd = () => {
    setShowAddForm(true);
    setEditing(null);
    setEditItem(emptyForm());
    setNewItem(emptyForm());
    setError('');
    setShowAddSuccess(false);
    setCategoryOpen(false);
  };

  const cancelAdd = () => {
    setShowAddForm(false);
    setNewItem(emptyForm());
    setError('');
    setShowAddSuccess(false);
    setCategoryOpen(false);
  };

  const startEdit = (item) => {
    setEditing(item);
    setEditItem({
      name: item.name || '',
      category: item.category || '',
      text: item.text || '',
      rating: Number(item.rating) || 0,
      state: item.state === 'Activated' || item.state === 'Deactivated' ? item.state : 'Activated',
    });
    setShowAddForm(false);
    setNewItem(emptyForm());
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
    if (!item.name.trim()) return '❌ Name is required';
    if (!item.category.trim()) return '❌ Category is required';
    if (!item.text.trim()) return '❌ Review text is required';
    if (!item.rating || item.rating <= 0) return '❌ Star rating is required';
    if (item.state !== 'Activated' && item.state !== 'Deactivated') {
      return '❌ State is required';
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
      name: newItem.name.trim(),
      category: newItem.category.trim(),
      text: newItem.text.trim(),
      rating: newItem.rating,
      state: newItem.state,
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
        name: editItem.name.trim(),
        category: editItem.category.trim(),
        text: editItem.text.trim(),
        rating: editItem.rating,
        state: editItem.state,
      },
    });
  };

  if (fetchError) {
    return (
      <div className={styles.page}>
        <div className={styles.wrap}>
          <Title href="/dashboard">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Image src="/testimonials.svg" alt="" width={32} height={32} />
              Reviews
            </div>
          </Title>
          <div className={`${styles.alert} ${styles.alertError}`}>
            ❌{' '}
            {fetchError?.response?.data?.error ||
              fetchError.message ||
              'Failed to load reviews'}
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
            Reviews
          </div>
        </Title>

        <div className={styles.searchWrap}>
          <InputWithButton
            placeholder="Search by name, category or text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyPress}
            onButtonClick={handleSearch}
          />
        </div>

        <div className={styles.filtersContainer}>
          <div className={styles.filterRow}>
            <div className={styles.filterGroup}>
              <AccountStateSelect
                value={stateFilter}
                onChange={setStateFilter}
                label="Filter by Visibility State"
                placeholder="Select Visibility State"
                includePending
                style={{ marginBottom: 0 }}
              />
            </div>
            <div className={styles.filterGroup}>
              <FromPublicSelect
                value={fromPublicFilter}
                onChange={setFromPublicFilter}
                label="Filter by From Public Page"
                placeholder="Select From Public Page"
                style={{ marginBottom: 0 }}
              />
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Reviews</h2>
              <p>Manage client reviews and star ratings</p>
            </div>
            {canManage ? (
              <button type="button" className={styles.addBtn} onClick={openAdd}>
                <Image src="/plus.svg" alt="" width={18} height={18} />
                Add Review
              </button>
            ) : null}
          </div>

          {isLoading ? (
            <div className={styles.loadingBox}>
              <div className={styles.spinner} />
              Loading reviews…
            </div>
          ) : testimonials.length === 0 ? (
            <div className={styles.empty}>
              <h3>No reviews yet</h3>
              <p>Click “Add Review” to create your first story.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>
              <h3>No reviews match</h3>
              <p>Try a different search term.</p>
            </div>
          ) : (
            <div className={styles.list}>
              {filtered.map((item) => (
                <article key={item.id} className={styles.item}>
                  <div className={styles.itemMain}>
                    <div className={styles.itemTop}>
                      <h4 className={styles.itemTitle}>
                        <span className={styles.itemName}>{item.name}</span>
                        <span className={styles.itemDot} aria-hidden="true">
                          •
                        </span>
                        <span className={styles.itemCategory}>{item.category}</span>
                        <span className={styles.itemDot} aria-hidden="true">
                          •
                        </span>
                        <span className={styles.itemDateInline}>
                          {item.createdAtEgypt ||
                            (item.createdAt ? formatEgyptDateTime(item.createdAt) : '—')}
                        </span>
                      </h4>
                      <div className={styles.itemTags}>
                        {item.state ? (
                          <span
                            className={`${styles.stateBadge} ${
                              item.state === 'Activated'
                                ? styles.stateActive
                                : item.state === 'Pending'
                                  ? styles.statePending
                                  : styles.stateInactive
                            }`}
                          >
                            {item.state === 'Activated'
                              ? '✅ Activated'
                              : item.state === 'Pending'
                                ? '⏳ Pending'
                                : '❌ Deactivated'}
                          </span>
                        ) : null}
                        <span
                          className={`${styles.stateBadge} ${
                            item.from_public ? styles.fromPublicYes : styles.fromPublicNo
                          }`}
                        >
                          {item.from_public
                            ? 'From Public Page · Yes'
                            : 'From Public Page · No'}
                        </span>
                      </div>
                    </div>
                    <p className={styles.itemText}>{item.text}</p>
                    <div className={styles.itemMetaRow}>
                      <div className={styles.itemRating}>
                        <Rating
                          value={Number(item.rating) || 0}
                          readOnly
                          fractions={2}
                          color={RATING_COLOR}
                          size="md"
                        />
                      </div>
                    </div>
                  </div>
                  {canManage ? (
                    <div className={styles.itemActions}>
                      <button
                        type="button"
                        className={styles.btnEdit}
                        onClick={() => startEdit(item)}
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

          {listSuccess ? (
            <div className={`${styles.alert} ${styles.alertSuccess}`} role="status">
              {listSuccess}
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
            if (e.target === e.currentTarget) cancelAdd();
          }}
        >
          <div className={styles.formModalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>
                <Image src="/plus.svg" alt="" width={24} height={24} />
                Add New Review
              </h3>
              <button type="button" className={styles.closeModalBtn} onClick={cancelAdd} title="Close">
                ✕
              </button>
            </div>
            <div className={styles.modalForm}>
              <div className={styles.formField}>
                <label>
                  Name <span className={styles.requiredStar}>*</span>
                </label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem((s) => ({ ...s, name: e.target.value }))}
                  placeholder="Enter client name"
                  className={styles.modalInput}
                  autoFocus
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

              <div className={styles.formField}>
                <label>
                  Review <span className={styles.requiredStar}>*</span>
                </label>
                <textarea
                  value={newItem.text}
                  onChange={(e) =>
                    setNewItem((s) => ({ ...s, text: e.target.value.slice(0, REVIEW_TEXT_MAX) }))
                  }
                  placeholder="Write the review text"
                  className={styles.modalTextarea}
                  rows={4}
                  maxLength={REVIEW_TEXT_MAX}
                />
                <p className={styles.charCount}>
                  {String(newItem.text || '').length}/{REVIEW_TEXT_MAX}
                </p>
              </div>

              <div className={styles.formField}>
                <AccountStateSelect
                  value={newItem.state}
                  onChange={(state) => setNewItem((s) => ({ ...s, state }))}
                  label="Visibility State"
                  placeholder="Select Visibility State"
                  required
                  style={{ marginBottom: 0, hideLabel: false }}
                />
              </div>

              <div className={styles.formField}>
                <label>From Public Page</label>
                <div className={`${styles.readonlyValue} ${styles.fromPublicNo}`}>
                  No
                </div>
              </div>

              <div className={styles.formField}>
                <label>
                  Star rating <span className={styles.requiredStar}>*</span>
                </label>
                <div className={styles.ratingBlock}>
                  <Rating
                    value={newItem.rating}
                    onChange={(rating) => setNewItem((s) => ({ ...s, rating }))}
                    fractions={2}
                    allowClear
                    color={RATING_COLOR}
                    size={35}
                  />
                  <Group gap="xs" justify="center">
                    <Text size="sm" c="dimmed">
                      Current rating:
                    </Text>
                    <Text size="sm" fw={600}>
                      {newItem.rating === 0 ? 'Not rated' : newItem.rating}
                    </Text>
                  </Group>
                </div>
              </div>

              <div className={styles.modalButtons}>
                <button
                  type="button"
                  className={styles.modalSaveBtn}
                  onClick={handleAdd}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Saving...' : 'Add Review'}
                </button>
                <button
                  type="button"
                  className={styles.modalCancelBtn}
                  onClick={cancelAdd}
                  disabled={createMutation.isPending}
                >
                  Cancel
                </button>
              </div>
              {error ? <div className={styles.errorPopup}>{error}</div> : null}
              {showAddSuccess ? (
                <div className={styles.successPopup}>✅ Review created successfully!</div>
              ) : null}
            </div>
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
                Edit Review
              </h3>
              <button type="button" className={styles.closeModalBtn} onClick={cancelEdit} title="Close">
                ✕
              </button>
            </div>
            <div className={styles.modalForm}>
              <div className={styles.formField}>
                <label>
                  Name <span className={styles.requiredStar}>*</span>
                </label>
                <input
                  type="text"
                  value={editItem.name}
                  onChange={(e) => setEditItem((s) => ({ ...s, name: e.target.value }))}
                  placeholder="Enter client name"
                  className={styles.modalInput}
                  autoFocus
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

              <div className={styles.formField}>
                <label>
                  Review <span className={styles.requiredStar}>*</span>
                </label>
                <textarea
                  value={editItem.text}
                  onChange={(e) =>
                    setEditItem((s) => ({ ...s, text: e.target.value.slice(0, REVIEW_TEXT_MAX) }))
                  }
                  placeholder="Write the review text"
                  className={styles.modalTextarea}
                  rows={4}
                  maxLength={REVIEW_TEXT_MAX}
                />
                <p className={styles.charCount}>
                  {String(editItem.text || '').length}/{REVIEW_TEXT_MAX}
                </p>
              </div>

              <div className={styles.formField}>
                <AccountStateSelect
                  value={editItem.state}
                  onChange={(state) => setEditItem((s) => ({ ...s, state }))}
                  label="Visibility State"
                  placeholder="Select Visibility State"
                  required
                  style={{ marginBottom: 0, hideLabel: false }}
                />
              </div>

              <div className={styles.formField}>
                <label>From Public Page</label>
                <div
                  className={`${styles.readonlyValue} ${
                    editing?.from_public ? styles.fromPublicYes : styles.fromPublicNo
                  }`}
                >
                  {editing?.from_public ? 'Yes' : 'No'}
                </div>
              </div>

              <div className={styles.formField}>
                <label>
                  Star rating <span className={styles.requiredStar}>*</span>
                </label>
                <div className={styles.ratingBlock}>
                  <Rating
                    value={editItem.rating}
                    onChange={(rating) => setEditItem((s) => ({ ...s, rating }))}
                    fractions={2}
                    allowClear
                    color={RATING_COLOR}
                    size={35}
                  />
                  <Group gap="xs" justify="center">
                    <Text size="sm" c="dimmed">
                      Current rating:
                    </Text>
                    <Text size="sm" fw={600}>
                      {editItem.rating === 0 ? 'Not rated' : editItem.rating}
                    </Text>
                  </Group>
                </div>
              </div>

              <div className={styles.modalButtons}>
                <button
                  type="button"
                  className={styles.modalSaveBtn}
                  onClick={handleUpdate}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  className={styles.modalCancelBtn}
                  onClick={cancelEdit}
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </button>
              </div>
              {error ? <div className={styles.errorPopup}>{error}</div> : null}
              {showEditSuccess && !error ? (
                <div className={styles.successPopup}>✅ Review updated successfully!</div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {showConfirm && toDelete ? (
        <div
          className={styles.confirmOverlay}
          onClick={() => {
            setShowConfirm(false);
            setToDelete(null);
          }}
        >
          <div className={styles.confirmContent} onClick={(e) => e.stopPropagation()}>
            <h3>Delete review?</h3>
            <p>
              Are you sure you want to delete the review from <strong>{toDelete.name}</strong>?
            </p>
            <div className={styles.confirmButtons}>
              <button
                type="button"
                className={styles.confirmDeleteBtn}
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(toDelete.id)}
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
