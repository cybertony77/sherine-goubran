import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Title from '../../components/Title';
import apiClient from '../../lib/axios';
import styles from '../../styles/certificates.module.css';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

function emptySlots() {
  return [{ src: '', preview: '', progress: 0, uploading: false, error: '' }];
}

function slotsFromDoc(certificates) {
  const list = Array.isArray(certificates) ? certificates : [];
  if (!list.length) return emptySlots();
  return list.map((item) => ({
    src: typeof item === 'string' ? item : item?.src || '',
    preview: '',
    progress: 0,
    uploading: false,
    error: '',
  }));
}

export default function CertificatesPage() {
  const router = useRouter();
  const fileRefs = useRef({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [slots, setSlots] = useState(emptySlots);
  const [snapshot, setSnapshot] = useState(emptySlots);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [fieldErrors, setFieldErrors] = useState([]);

  const anyUploading = slots.some((s) => s.uploading);

  const hasChanges = useMemo(() => {
    const current = slots.map((s) => String(s.src || '').trim()).filter(Boolean);
    const saved = snapshot.map((s) => String(s.src || '').trim()).filter(Boolean);
    if (current.length !== saved.length) return true;
    return current.some((src, i) => src !== saved[i]);
  }, [slots, snapshot]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const resolvePreview = useCallback(async (publicId) => {
    if (!publicId) return '';
    try {
      const { data } = await apiClient.get('/api/certificates/image-url', {
        params: { public_id: publicId },
      });
      return data?.url || '';
    } catch {
      return '';
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get('/api/certificates');
      const next = slotsFromDoc(data.certificates);
      const withPreviews = await Promise.all(
        next.map(async (slot) => ({
          ...slot,
          preview: slot.src ? await resolvePreview(slot.src) : '',
        }))
      );
      setSlots(withPreviews);
      setSnapshot(withPreviews.map((s) => ({ ...s, uploading: false, progress: 0, error: '' })));
      setCanManage(Boolean(data.canManage));
    } catch (err) {
      setError(`❌ ${err?.response?.data?.error || 'Failed to load certificates'}`);
    } finally {
      setLoading(false);
    }
  }, [resolvePreview]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateSlot = (index, patch) => {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
    setFieldErrors((prev) => prev.filter((f) => f !== `slot_${index}` && f !== 'certificates'));
  };

  const fileToBase64 = (file, onProgress) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onprogress = (e) => {
        if (!e.lengthComputable) return;
        onProgress?.(Math.max(1, Math.round((e.loaded / e.total) * 25)));
      };
      reader.onload = () => {
        onProgress?.(28);
        resolve(reader.result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const uploadImage = async (index, file) => {
    if (!canManage) return;

    if (!ALLOWED_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
      updateSlot(index, {
        error: '❌ Invalid file type. Only image formats (JPEG, PNG, GIF, WEBP) are allowed.',
      });
      return;
    }
    if (file.size > MAX_BYTES) {
      updateSlot(index, {
        error: '❌ Sorry, Max image size is 10 MB, Please try another picture',
      });
      return;
    }

    updateSlot(index, {
      uploading: true,
      progress: 0,
      error: '',
      preview: '',
    });

    try {
      const localPreview = URL.createObjectURL(file);
      updateSlot(index, { preview: localPreview, progress: 8 });

      const base64 = await fileToBase64(file, (p) => updateSlot(index, { progress: p }));
      updateSlot(index, { progress: 32 });

      const response = await apiClient.post(
        '/api/upload/certificate-image',
        {
          file: base64,
          fileName: file.name,
          fileType: file.type,
        },
        {
          onUploadProgress: (e) => {
            if (e.total && e.total > 0) {
              const networkPct = Math.round((e.loaded / e.total) * 63);
              updateSlot(index, { progress: Math.min(95, 32 + networkPct) });
            }
          },
        }
      );

      if (!response.data?.success || !response.data?.public_id) {
        throw new Error('Upload failed');
      }

      const publicId = response.data.public_id;
      const signed = await resolvePreview(publicId);
      updateSlot(index, {
        src: publicId,
        preview: signed || localPreview,
        uploading: false,
        progress: 100,
        error: '',
      });
    } catch (err) {
      const msg = err?.response?.data?.error || err.message || 'Failed to upload image';
      updateSlot(index, {
        src: '',
        preview: '',
        uploading: false,
        progress: 0,
        error: msg.startsWith('❌') ? msg : `❌ ${msg}`,
      });
    } finally {
      const input = fileRefs.current[index];
      if (input) input.value = '';
    }
  };

  const handleFilePick = (index, file) => {
    if (!file) return;
    uploadImage(index, file);
  };

  const clearSlotImage = (index) => {
    updateSlot(index, { src: '', preview: '', progress: 0, uploading: false, error: '' });
  };

  const removeSlot = (index) => {
    setSlots((prev) => {
      if (prev.length <= 1) {
        return [{ src: '', preview: '', progress: 0, uploading: false, error: '' }];
      }
      return prev.filter((_, i) => i !== index);
    });
    setFieldErrors([]);
  };

  const addSlot = () => {
    setSlots((prev) => [
      ...prev,
      { src: '', preview: '', progress: 0, uploading: false, error: '' },
    ]);
  };

  const handleCancel = () => {
    setSlots(snapshot.map((s) => ({ ...s })));
    setError('');
    setSuccess('');
    setFieldErrors([]);
    setDragOverIndex(null);
  };

  const handleSave = async () => {
    if (!canManage) {
      setError('❌ You do not have permission to save certificates');
      return;
    }
    if (anyUploading) {
      setError('❌ Please wait until all uploads finish');
      return;
    }

    const missing = [];
    slots.forEach((slot, i) => {
      if (!slot.src) missing.push(`slot_${i}`);
    });

    if (missing.length) {
      setFieldErrors(missing.length === slots.length ? ['certificates', ...missing] : missing);
      setError(
        missing.length === slots.length
          ? '❌ Please upload at least one certificate image'
          : '❌ Please fill every certificate slot or remove empty ones'
      );
      setSuccess('');
      return;
    }

    setFieldErrors([]);
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        certificates: slots.filter((s) => s.src).map((s) => ({ src: s.src })),
      };
      const { data } = await apiClient.put('/api/certificates', payload);
      const next = slotsFromDoc(data.certificates);
      const withPreviews = await Promise.all(
        next.map(async (slot) => ({
          ...slot,
          preview: slot.src ? await resolvePreview(slot.src) : '',
        }))
      );
      setSlots(withPreviews);
      setSnapshot(withPreviews.map((s) => ({ ...s })));
      setSuccess('✅ Certificates saved successfully!');
    } catch (err) {
      setError(`❌ ${err?.response?.data?.error || 'Failed to save certificates'}`);
    } finally {
      setSaving(false);
    }
  };

  const hasFieldError = useMemo(
    () => (key) => fieldErrors.includes(key),
    [fieldErrors]
  );

  if (loading) {
    return (
      <div className={styles.loader}>
        <div className={styles.loaderCard}>
          <div className={styles.loaderSpinner} aria-hidden="true" />
          <p className={styles.loaderTitle}>Loading certificates</p>
          <p className={styles.loaderText}>Please wait a moment…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <Title href="/dashboard">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Image src="/certificate2.svg" alt="Certificates" width={32} height={32} />
            Certificates
          </div>
        </Title>

        <section className={styles.card}>
          <div className={styles.sectionHead}>
            <span className={styles.sectionAccent} />
            <h2>Certificate images</h2>
          </div>
          <p className={styles.hint}>
            Upload certificate images (JPEG, PNG, GIF, WEBP). Max size: 10 MB each.
          </p>

          {slots.map((slot, index) => {
            const inputId = `certificate-image-${index}`;
            const hasImage = Boolean(slot.src || slot.preview);
            const isLast = index === slots.length - 1;
            const slotError = hasFieldError(`slot_${index}`) || Boolean(slot.error);

            return (
              <div key={index} className={styles.slot}>
                <label className={styles.slotLabel}>
                  {index === 0 ? 'Certificate Image' : `Certificate Image ${index + 1}`}{' '}
                  <span className={styles.required}>*</span>
                </label>

                {hasImage ? (
                  <div className={styles.previewWrap}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className={styles.previewImg}
                      src={slot.preview || ''}
                      alt={`Certificate ${index + 1}`}
                    />
                    {canManage && !slot.uploading ? (
                      <button
                        type="button"
                        className={styles.previewTrash}
                        title="Remove image"
                        onClick={() => clearSlotImage(index)}
                      >
                        <svg
                          width="32"
                          height="32"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>
                    ) : null}
                    {slot.uploading ? (
                      <div className={styles.uploadOverlay}>
                        <div className={styles.spinner} />
                        <span>{slot.progress}%</span>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div
                    className={`${styles.dropzone} ${
                      dragOverIndex === index ? styles.dropzoneActive : ''
                    } ${slotError ? styles.dropzoneError : ''} ${
                      !canManage || slot.uploading ? styles.dropzoneDisabled : ''
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (!canManage || slot.uploading) return;
                      setDragOverIndex(index);
                    }}
                    onDragLeave={() => setDragOverIndex(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverIndex(null);
                      if (!canManage || slot.uploading) return;
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleFilePick(index, file);
                    }}
                  >
                    <svg
                      className={styles.uploadIcon}
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--system-secondary)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <p className={styles.dropTitle}>Drag your file here</p>
                    <p className={styles.dropOr}>or</p>
                    <input
                      ref={(el) => {
                        fileRefs.current[index] = el;
                      }}
                      id={inputId}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      disabled={!canManage || slot.uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFilePick(index, file);
                      }}
                    />
                    <label
                      htmlFor={inputId}
                      className={`${styles.browseBtn} ${
                        !canManage || slot.uploading ? styles.browseBtnDisabled : ''
                      }`}
                    >
                      {slot.uploading ? 'Uploading...' : 'Browse'}
                    </label>
                  </div>
                )}

                {slot.uploading && !hasImage ? (
                  <div className={styles.progressBox}>
                    <div className={styles.progressMeta}>
                      <span>Uploading…</span>
                      <span>{slot.progress}%</span>
                    </div>
                    <div className={styles.progressTrack}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${slot.progress}%` }}
                      />
                    </div>
                  </div>
                ) : null}

                <div className={styles.slotActions}>
                  <button
                    type="button"
                    className={styles.btnRemove}
                    disabled={!canManage || slot.uploading}
                    onClick={() => removeSlot(index)}
                  >
                    <Image src="/trash2.svg" alt="" width={18} height={18} />
                    Remove
                  </button>
                  {isLast ? (
                    <button
                      type="button"
                      className={styles.btnAdd}
                      disabled={!canManage || anyUploading}
                      onClick={addSlot}
                    >
                      <Image src="/plus.svg" alt="" width={18} height={18} />
                      Add
                    </button>
                  ) : null}
                </div>

                {slot.error ? (
                  <p className={styles.fieldErrorText}>{slot.error}</p>
                ) : null}
                {hasFieldError(`slot_${index}`) && !slot.src && !slot.error ? (
                  <p className={styles.fieldErrorText}>Certificate image is required</p>
                ) : null}
              </div>
            );
          })}
        </section>

        <div className={styles.footerActions}>
          <button
            type="button"
            className={styles.btnSave}
            onClick={handleSave}
            disabled={!canManage || saving || anyUploading || !hasChanges}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            className={styles.btnCancel}
            onClick={() => {
              handleCancel();
              router.push('/dashboard');
            }}
            disabled={saving || anyUploading}
          >
            Cancel
          </button>
        </div>
        {error ? (
          <div className={`${styles.alert} ${styles.alertError} ${styles.footerAlert}`} role="alert">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className={`${styles.alert} ${styles.alertSuccess} ${styles.footerAlert}`} role="status">
            {success}
          </div>
        ) : null}
      </div>
    </div>
  );
}
