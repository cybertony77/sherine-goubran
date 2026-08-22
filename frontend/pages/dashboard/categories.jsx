import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { IconArrowRight, IconSearch } from '@tabler/icons-react';
import { ActionIcon, TextInput, useMantineTheme } from '@mantine/core';
import Title from '../../components/Title';
import apiClient from '../../lib/axios';
import styles from '../../styles/categories.module.css';

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
      placeholder="Search by category name"
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

const categoriesAPI = {
  getAll: async () => {
    const { data } = await apiClient.get('/api/categories');
    return data;
  },
  create: async (payload) => {
    const { data } = await apiClient.post('/api/categories', payload);
    return data;
  },
  update: async (id, payload) => {
    const { data } = await apiClient.put(`/api/categories/${id}`, payload);
    return data;
  },
  remove: async (id) => {
    const { data } = await apiClient.delete(`/api/categories/${id}`);
    return data;
  },
};

export default function CategoriesPage() {
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');
  const [showAddSuccess, setShowAddSuccess] = useState(false);
  const [showEditSuccess, setShowEditSuccess] = useState(false);
  const [listSuccess, setListSuccess] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const { data, isLoading, error: fetchError } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesAPI.getAll,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const categories = data?.categories || [];
  const canManage = Boolean(data?.canManage);

  const createMutation = useMutation({
    mutationFn: (payload) => categoriesAPI.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setShowAddSuccess(true);
      setError('');
      setTimeout(() => {
        setShowAddForm(false);
        setNewName('');
        setShowAddSuccess(false);
      }, 2000);
    },
    onError: (err) => {
      setError(err?.response?.data?.error || '❌ Failed to create category');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => categoriesAPI.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setShowEditSuccess(true);
      setError('');
      setTimeout(() => {
        setEditing(null);
        setEditName('');
        setShowEditSuccess(false);
      }, 2000);
    },
    onError: (err) => {
      setError(err?.response?.data?.error || '❌ Failed to update category');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => categoriesAPI.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setListSuccess('✅ Category deleted successfully!');
      setError('');
      setShowConfirm(false);
      setToDelete(null);
    },
    onError: (err) => {
      setError(err?.response?.data?.error || '❌ Failed to delete category');
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
    if (!q) return categories;
    return categories.filter((c) => String(c.name || '').toLowerCase().includes(q));
  }, [categories, searchTerm]);

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
    setEditName('');
    setNewName('');
    setError('');
    setShowAddSuccess(false);
  };

  const cancelAdd = () => {
    setShowAddForm(false);
    setNewName('');
    setError('');
    setShowAddSuccess(false);
  };

  const startEdit = (category) => {
    setEditing(category);
    setEditName(category.name || '');
    setShowAddForm(false);
    setNewName('');
    setError('');
    setShowEditSuccess(false);
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditName('');
    setError('');
    setShowEditSuccess(false);
  };

  const handleAdd = () => {
    if (!newName.trim()) {
      setError('❌ Category name is required');
      return;
    }
    createMutation.mutate({ name: newName.trim() });
  };

  const handleUpdate = () => {
    if (!editName.trim()) {
      setError('❌ Category name is required');
      return;
    }
    updateMutation.mutate({
      id: editing.id,
      payload: { name: editName.trim() },
    });
  };

  if (fetchError) {
    return (
      <div className={styles.page}>
        <div className={styles.wrap}>
          <Title href="/dashboard">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Image src="/categories.svg" alt="" width={32} height={32} />
              Categories
            </div>
          </Title>
          <div className={`${styles.alert} ${styles.alertError}`}>
            ❌ {fetchError?.response?.data?.error || fetchError.message || 'Failed to load categories'}
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
            <Image src="/categories.svg" alt="" width={32} height={32} />
            Categories
          </div>
        </Title>

        <div className={styles.searchWrap}>
          <InputWithButton
            placeholder="Search by category name"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyPress}
            onButtonClick={handleSearch}
          />
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Categories</h2>
              <p>Manage website categories</p>
            </div>
            {canManage ? (
              <button type="button" className={styles.addBtn} onClick={openAdd}>
                <Image src="/plus.svg" alt="" width={18} height={18} />
                Add Category
              </button>
            ) : null}
          </div>

          {isLoading ? (
            <div className={styles.loadingBox}>
              <div className={styles.spinner} />
              Loading categories…
            </div>
          ) : categories.length === 0 ? (
            <div className={styles.empty}>
              <h3>No categories yet</h3>
              <p>Click “Add Category” to create your first category.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>
              <h3>No categories match</h3>
              <p>Try a different search term.</p>
            </div>
          ) : (
            <div className={styles.list}>
              {filtered.map((category) => (
                <div key={category.id} className={styles.item}>
                  <div className={styles.itemInfo}>
                    <h4 className={styles.itemName}>{category.name}</h4>
                    <p className={styles.itemMeta}>
                      Created:{' '}
                      {category.createdAt
                        ? new Date(category.createdAt).toLocaleDateString()
                        : '—'}
                    </p>
                  </div>
                  {canManage ? (
                    <div className={styles.itemActions}>
                      <button
                        type="button"
                        className={styles.btnEdit}
                        onClick={() => startEdit(category)}
                      >
                        <Image src="/edit.svg" alt="" width={16} height={16} />
                        Edit
                      </button>
                      <button
                        type="button"
                        className={styles.btnDanger}
                        onClick={() => {
                          setToDelete(category);
                          setShowConfirm(true);
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Image src="/trash2.svg" alt="" width={16} height={16} />
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
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

      {/* Add Category Popup */}
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
                Add New Category
              </h3>
              <button type="button" className={styles.closeModalBtn} onClick={cancelAdd} title="Close">
                ✕
              </button>
            </div>
            <div className={styles.modalForm}>
              <div className={styles.formField}>
                <label>
                  Category Name <span className={styles.requiredStar}>*</span>
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Enter category name"
                  className={styles.modalInput}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  autoFocus
                />
              </div>
              <div className={styles.modalButtons}>
                <button
                  type="button"
                  className={styles.modalSaveBtn}
                  onClick={handleAdd}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Saving...' : 'Add Category'}
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
                <div className={styles.successPopup}>✅ Category created successfully!</div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Edit Category Popup */}
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
                Edit Category
              </h3>
              <button type="button" className={styles.closeModalBtn} onClick={cancelEdit} title="Close">
                ✕
              </button>
            </div>
            <div className={styles.modalForm}>
              <div className={styles.formField}>
                <label>
                  Category Name <span className={styles.requiredStar}>*</span>
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter category name"
                  className={styles.modalInput}
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                  autoFocus
                />
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
                <div className={styles.successPopup}>✅ Category updated successfully!</div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Delete Confirm */}
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
              Are you sure you want to delete category <strong>{toDelete?.name}</strong>?
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
                {deleteMutation.isPending ? 'Deleting...' : 'Yes, Delete Category'}
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
