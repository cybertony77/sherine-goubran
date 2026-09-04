import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActionIcon, TextInput, useMantineTheme } from '@mantine/core';
import { IconArrowRight, IconSearch } from '@tabler/icons-react';
import Title from '../../components/Title';
import apiClient from '../../lib/axios';
import { formatEgyptDateTime } from '../../lib/egyptDateTime';
import { formatPhoneForDB } from '../../lib/phoneUtils';
import styles from '../../styles/messages.module.css';

const STATUS_OPTIONS = [
  { value: '', label: 'All messages', color: '#6c7a89' },
  { value: 'New', label: 'New', color: '#c9a96a' },
  { value: 'Read', label: 'Read', color: '#5b6773' },
];

const GENERAL_SERVICE = { slug: 'general-inquiry', name: 'General inquiry' };

function InputWithButton({ onButtonClick, onKeyDown, ...props }) {
  const theme = useMantineTheme();

  return (
    <TextInput
      radius="xl"
      size="md"
      placeholder="Search by sender name"
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
      onKeyDown={onKeyDown}
      {...props}
    />
  );
}

function previewText(value) {
  const raw = String(value || '').replace(/\r\n/g, '\n').trim();
  if (!raw) return 'No message text';
  const firstLine = raw.split('\n')[0].replace(/\s+/g, ' ').trim();
  if (!firstLine) return 'No message text';
  return `${firstLine}...`;
}

function displayPhone(value) {
  const digits = formatPhoneForDB(value);
  if (!digits) return value || '—';
  if (digits.startsWith('20') && digits.length > 2) return `+20 ${digits.slice(2)}`;
  return `+${digits}`;
}

function messageServiceKey(item) {
  const slug = String(item?.serviceSlug || '').trim();
  if (slug) return slug;
  const name = String(item?.subject || item?.serviceName || '').trim().toLowerCase();
  if (!name || name === GENERAL_SERVICE.name.toLowerCase()) return GENERAL_SERVICE.slug;
  return `name:${name}`;
}

function FilterSelect({ label, value, options, onChange, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const selected = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={styles.filterSelect} ref={dropdownRef}>
      <span className={styles.filterLabel}>{label}</span>
      <button
        type="button"
        className={`${styles.statusTrigger} ${isOpen ? styles.statusTriggerOpen : ''} ${
          value ? styles.statusTriggerFilled : ''
        }`}
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span style={{ color: selected?.color || 'var(--system-secondary)' }}>
          {selected?.label || placeholder}
        </span>
      </button>
      {isOpen ? (
        <div className={styles.statusMenu} role="listbox">
          {options.map((option) => (
            <button
              key={option.value || 'all'}
              type="button"
              role="option"
              aria-selected={value === option.value}
              className={`${styles.statusOption} ${
                value === option.value ? styles.statusOptionActive : ''
              }`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              <span style={{ color: option.color || 'var(--system-secondary)' }}>{option.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function DashboardMessagesPage() {
  const queryClient = useQueryClient();
  const [stateFilter, setStateFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data, isLoading, error: fetchError } = useQuery({
    queryKey: ['messages', stateFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (stateFilter) params.set('state', stateFilter);
      const qs = params.toString();
      const { data: res } = await apiClient.get(`/api/messages${qs ? `?${qs}` : ''}`);
      return res;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    refetchInterval: 5000,
  });

  const { data: servicesData } = useQuery({
    queryKey: ['services'],
    queryFn: async () => (await apiClient.get('/api/services')).data,
    staleTime: 60_000,
  });

  const allMessages = Array.isArray(data?.messages) ? data.messages : [];
  const newCount = data?.newCount || 0;

  const serviceOptions = useMemo(() => {
    const fromApi = Array.isArray(servicesData?.services)
      ? servicesData.services
      : Array.isArray(servicesData)
        ? servicesData
        : [];

    const map = new Map();
    map.set(GENERAL_SERVICE.slug, {
      value: GENERAL_SERVICE.slug,
      label: GENERAL_SERVICE.name,
      color: 'var(--system-secondary)',
    });

    fromApi.forEach((svc) => {
      const slug = String(svc?.slug || '').trim();
      const name = String(svc?.name || '').trim();
      if (!slug || !name) return;
      map.set(slug, { value: slug, label: name, color: 'var(--system-secondary)' });
    });

    allMessages.forEach((msg) => {
      const key = messageServiceKey(msg);
      if (map.has(key)) return;
      const label = String(msg.subject || msg.serviceName || '').trim() || GENERAL_SERVICE.name;
      map.set(key, { value: key, label, color: 'var(--system-secondary)' });
    });

    return [
      { value: '', label: 'All services', color: '#6c7a89' },
      ...Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label)),
    ];
  }, [servicesData, allMessages]);

  useEffect(() => {
    if (!searchInput.trim() && searchTerm) setSearchTerm('');
  }, [searchInput, searchTerm]);

  const messages = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return allMessages.filter((item) => {
      if (serviceFilter && messageServiceKey(item) !== serviceFilter) return false;
      if (q && !String(item.name || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allMessages, serviceFilter, searchTerm]);

  const markReadMutation = useMutation({
    mutationFn: async (id) => {
      const { data: res } = await apiClient.patch(`/api/messages/${id}`, { state: 'Read' });
      return res;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['messages_new_count'] });
      if (res?.message) setSelected(res.message);
    },
    onError: (err) => {
      setError(err?.response?.data?.error || '❌ Failed to mark message as read');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { data: res } = await apiClient.delete(`/api/messages/${id}`);
      return res;
    },
    onSuccess: (_res, id) => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['messages_new_count'] });
      setDeleteId(null);
      if (selected?.id === id) setSelected(null);
      setSuccess('✅ Message deleted');
    },
    onError: (err) => {
      setError(err?.response?.data?.error || '❌ Failed to delete message');
    },
  });

  useEffect(() => {
    if (!error) return undefined;
    const t = setTimeout(() => setError(''), 5000);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    if (!success) return undefined;
    const t = setTimeout(() => setSuccess(''), 3500);
    return () => clearTimeout(t);
  }, [success]);

  useEffect(() => {
    if (!selected && deleteId === null) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [selected, deleteId]);

  const selectedPhone = useMemo(() => formatPhoneForDB(selected?.phone || ''), [selected]);
  const deleteTarget = useMemo(
    () => allMessages.find((item) => item.id === deleteId) || null,
    [allMessages, deleteId]
  );

  const openMessage = (item) => {
    setSelected(item);
    if (item.state === 'New') {
      markReadMutation.mutate(item.id);
    }
  };

  const runSearch = () => setSearchTerm(searchInput.trim());

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <Title href="/dashboard">
          <div className={styles.titleRow}>
            <Image src="/message2.svg" alt="" width={32} height={32} />
            Messages
          </div>
        </Title>

        <div className={styles.searchWrap}>
          <InputWithButton
            value={searchInput}
            onChange={(e) => setSearchInput(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') runSearch();
            }}
            onButtonClick={runSearch}
          />
        </div>

        <div className={styles.filtersContainer}>
          <div className={styles.filterRow}>
            <div className={styles.filterGroup}>
              <FilterSelect
                label="Status"
                value={stateFilter}
                options={STATUS_OPTIONS}
                onChange={setStateFilter}
                placeholder="All messages"
              />
            </div>
            <div className={styles.filterGroup}>
              <FilterSelect
                label="Services"
                value={serviceFilter}
                options={serviceOptions}
                onChange={setServiceFilter}
                placeholder="All services"
              />
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Inbox</h2>
              <p>
                {newCount > 0
                  ? `${newCount} new message${newCount === 1 ? '' : 's'}`
                  : 'All caught up'}
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className={styles.loadingBox}>
              <div className={styles.spinner} />
              Loading messages…
            </div>
          ) : messages.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>
                <Image src="/message2.svg" alt="" width={28} height={28} />
              </div>
              <h3>No messages</h3>
              <p>
                {searchTerm || serviceFilter || stateFilter
                  ? 'No messages match the current search or filters.'
                  : 'New contact form submissions will appear here.'}
              </p>
            </div>
          ) : (
            <div className={styles.list}>
              {messages.map((item, index) => {
                const isNew = item.state === 'New';
                const service = item.subject || item.serviceName || 'General inquiry';
                const dateLabel =
                  item.createdAtEgypt ||
                  (item.createdAt ? formatEgyptDateTime(item.createdAt) : '—');
                return (
                  <article
                    key={item.id}
                    className={`${styles.item} ${isNew ? styles.itemNew : ''}`}
                    style={{ animationDelay: `${Math.min(index, 8) * 0.05}s` }}
                  >
                    <span className={`${styles.badge} ${isNew ? styles.stateNew : styles.stateRead}`}>
                      {item.state || 'Read'}
                    </span>
                    <div className={styles.itemBody}>
                      <div className={styles.itemTop}>
                        <h4 className={styles.itemName}>{item.name || 'Unknown sender'}</h4>
                        <time className={styles.itemDate}>{dateLabel}</time>
                      </div>
                      <p className={styles.itemService}>{service}</p>
                      <div className={styles.previewWrap}>
                        <p className={styles.itemPreview}>{previewText(item.message)}</p>
                      </div>
                    </div>
                    <div className={styles.itemActions}>
                      <button
                        type="button"
                        className={styles.openBtn}
                        onClick={() => openMessage(item)}
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() => setDeleteId(item.id)}
                      >
                        <Image src="/trash2.svg" alt="" width={15} height={15} />
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {fetchError ? (
            <div className={`${styles.alert} ${styles.alertError}`}>
              ❌ {fetchError?.response?.data?.error || fetchError.message || 'Failed to load messages'}
            </div>
          ) : null}
          {error ? <div className={`${styles.alert} ${styles.alertError}`}>{error}</div> : null}
          {success ? <div className={`${styles.alert} ${styles.alertSuccess}`}>{success}</div> : null}
        </div>
      </div>

      {selected ? (
        <div
          className={styles.modal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="message-dialog-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.modalEyebrow}>Message</p>
                <h3 id="message-dialog-title">{selected.name || 'Unknown sender'}</h3>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setSelected(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className={styles.modalMeta}>
              <div className={styles.metaCard}>
                <span className={styles.detailLabel}>Phone</span>
                <p>{displayPhone(selected.phone)}</p>
              </div>
              <div className={styles.metaCard}>
                <span className={styles.detailLabel}>Service</span>
                <p>{selected.subject || selected.serviceName || 'General inquiry'}</p>
              </div>
              <div className={styles.metaCard}>
                <span className={styles.detailLabel}>Date</span>
                <p>
                  {selected.createdAtEgypt ||
                    (selected.createdAt ? formatEgyptDateTime(selected.createdAt) : '—')}
                </p>
              </div>
            </div>

            <div className={styles.detailMessage}>
              <span className={styles.detailLabel}>Message</span>
              <div className={styles.messageBubble}>
                <p>{selected.message || '—'}</p>
              </div>
            </div>

            <div className={styles.contactActions}>
              {selectedPhone ? (
                <>
                  <a className={styles.callBtn} href={`tel:+${selectedPhone}`}>
                    <Image src="/phone.svg" alt="" width={18} height={18} />
                    Call
                  </a>
                  <a
                    className={styles.waBtn}
                    href={`https://wa.me/${selectedPhone}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Image src="/whatsapp2.svg" alt="" width={18} height={18} />
                    WhatsApp
                  </a>
                </>
              ) : (
                <p className={styles.noPhone}>No phone number available for this message.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {deleteId !== null ? (
        <div
          className={styles.confirmOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-message-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteId(null);
          }}
        >
          <div className={styles.confirmContent} onClick={(e) => e.stopPropagation()}>
            <h3 id="delete-message-title">Delete message?</h3>
            <p>
              Are you sure you want to delete the message from{' '}
              <strong>{deleteTarget?.name || 'this sender'}</strong>?
            </p>
            <div className={styles.confirmButtons}>
              <button
                type="button"
                className={styles.confirmDeleteBtn}
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteId)}
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
              <button
                type="button"
                className={styles.confirmCancelBtn}
                disabled={deleteMutation.isPending}
                onClick={() => setDeleteId(null)}
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
