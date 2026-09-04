import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import Title from '../../components/Title';
import apiClient from '../../lib/axios';
import { formatPhoneForDB, validateEgyptPhone, handleEgyptPhoneKeyDown } from '../../lib/phoneUtils';
import { personalInfoKeys } from '../../lib/api/personalInfo';
import { mediaSrcFromKey } from '../../lib/personalInfoMedia';
import styles from '../../styles/personal_info.module.css';

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

function emptyForm() {
  return {
    contact_phone: '',
    contact_email: '',
    contact_text: '',
    contact_response_text: '',
    contact_location_name: '',
    contact_location_link: '',
    contact_hero_image: '',
    contact_hero_position: { x: 50, y: 50 },
  };
}

function clampPct(value, fallback = 50) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n * 10) / 10));
}

function normalizeHeroMobilePosition(value) {
  if (!value || typeof value !== 'object') return { x: 50, y: 50 };
  return { x: clampPct(value.x, 50), y: clampPct(value.y, 50) };
}

function isValidHttpUrl(value) {
  try {
    const u = new URL(String(value || '').trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function isPhoneFilled(phone) {
  const digits = formatPhoneForDB(phone || '');
  return Boolean(digits && digits.length > 2);
}

function docToForm(doc) {
  return {
    contact_phone: doc?.contact_phone || '',
    contact_email: doc?.contact_email || '',
    contact_text: doc?.contact_text || '',
    contact_response_text: doc?.contact_response_text || '',
    contact_location_name: doc?.contact_location_name || '',
    contact_location_link: doc?.contact_location_link || '',
    contact_hero_image: doc?.contact_hero_image || '',
    contact_hero_position: normalizeHeroMobilePosition(doc?.contact_hero_position),
  };
}

function validateContactForm(form) {
  const fields = [];

  if (!isPhoneFilled(form.contact_phone)) fields.push('contact_phone');
  if (!String(form.contact_email || '').trim()) fields.push('contact_email');
  if (!String(form.contact_text || '').trim()) fields.push('contact_text');
  if (!String(form.contact_response_text || '').trim()) fields.push('contact_response_text');

  const email = String(form.contact_email || '').trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      ok: false,
      message: '❌ Please enter a valid email address',
      fields: [...new Set([...fields, 'contact_email'])],
    };
  }

  const locationName = String(form.contact_location_name || '').trim();
  const locationLink = String(form.contact_location_link || '').trim();
  if (locationName && locationLink && !isValidHttpUrl(locationLink)) {
    return {
      ok: false,
      message: '❌ Location link must start with http:// or https://',
      fields: [...new Set([...fields, 'contact_location_link'])],
    };
  }

  if (fields.length) {
    return {
      ok: false,
      message: '❌ Please fill in all required fields before saving',
      fields: [...new Set(fields)],
    };
  }

  return { ok: true, message: '', fields: [] };
}

function RequiredMark() {
  return <span className={styles.required}>*</span>;
}

function BtnIcon({ src }) {
  return <Image src={src} alt="" width={16} height={16} className={styles.btnIcon} />;
}

function ContactHeroPreview({ src, x, y, disabled, onChange }) {
  const wrapRef = useRef(null);
  const dragRef = useRef(null);
  const pos = useMemo(() => normalizeHeroMobilePosition({ x, y }), [x, y]);

  const onPointerDown = (e) => {
    if (disabled || (e.button != null && e.button !== 0)) return;
    const el = wrapRef.current;
    if (!el) return;
    e.preventDefault();
    el.setPointerCapture?.(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: pos.x,
      posY: pos.y,
      width: el.clientWidth || 1,
      height: el.clientHeight || 1,
    };
  };

  const onPointerMove = (e) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = ((e.clientX - drag.startX) / drag.width) * 100;
    const dy = ((e.clientY - drag.startY) / drag.height) * 100;
    onChange(clampPct(drag.posX - dx), clampPct(drag.posY - dy));
  };

  const onPointerUp = (e) => {
    if (!dragRef.current) return;
    wrapRef.current?.releasePointerCapture?.(e.pointerId);
    dragRef.current = null;
  };

  return (
    <div className={styles.contactHeroEditor}>
      <div
        ref={wrapRef}
        className={`${styles.contactHeroPreviewWrap} ${disabled ? styles.contactHeroPreviewDisabled : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        title="Drag to reposition the visible area"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Contact hero"
          className={styles.contactHeroPreview}
          style={{ objectPosition: `${pos.x}% ${pos.y}%` }}
          draggable={false}
        />
        <div className={styles.contactHeroDragHint}>Drag to reposition</div>
      </div>
      <div className={styles.controlsRow}>
        <p className={styles.deviceNote}>Drag the image to set the visible crop on the Contact page.</p>
        <div className={styles.posRow}>
          <div className={styles.field}>
            <label htmlFor="contact-hero-pos-x">X</label>
            <input
              id="contact-hero-pos-x"
              className={styles.input}
              type="number"
              min="0"
              max="100"
              step="1"
              value={Math.round(pos.x)}
              disabled={disabled}
              onChange={(e) => onChange(clampPct(e.target.value, pos.x), pos.y)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="contact-hero-pos-y">Y</label>
            <input
              id="contact-hero-pos-y"
              className={styles.input}
              type="number"
              min="0"
              max="100"
              step="1"
              value={Math.round(pos.y)}
              disabled={disabled}
              onChange={(e) => onChange(pos.x, clampPct(e.target.value, pos.y))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className={styles.card}>
      <div className={styles.sectionHead}>
        <span className={styles.sectionAccent} />
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function DashboardContactPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const contactHeroInputRef = useRef(null);
  const xhrRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [snapshot, setSnapshot] = useState(emptyForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState([]);
  const [contactHeroUpload, setContactHeroUpload] = useState({
    status: 'idle',
    progress: 0,
    phase: 'idle',
    fileName: '',
    error: '',
  });

  const hasFieldError = useCallback((key) => fieldErrors.includes(key), [fieldErrors]);
  const contactHeroPreview = useMemo(
    () => mediaSrcFromKey(form.contact_hero_image),
    [form.contact_hero_image]
  );
  const locationName = String(form.contact_location_name || '').trim();
  const canSave = useMemo(() => {
    if (!canManage || saving) return false;
    if (contactHeroUpload.status === 'uploading') return false;
    if (!isPhoneFilled(form.contact_phone)) return false;
    if (!String(form.contact_email || '').trim()) return false;
    if (!String(form.contact_text || '').trim()) return false;
    if (!String(form.contact_response_text || '').trim()) return false;
    return JSON.stringify(form) !== JSON.stringify(snapshot);
  }, [canManage, saving, contactHeroUpload.status, form, snapshot]);

  useEffect(() => {
    if (!error) return undefined;
    const t = setTimeout(() => setError(''), 5000);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    if (!success) return undefined;
    const t = setTimeout(() => setSuccess(''), 4000);
    return () => clearTimeout(t);
  }, [success]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get('/api/personal_info');
      const next = docToForm(data);
      setForm(next);
      setSnapshot(next);
      setCanManage(Boolean(data.canManage));
      if (data.contact_hero_image) {
        setContactHeroUpload({
          status: 'done',
          progress: 100,
          phase: 'done',
          fileName: String(data.contact_hero_image).split('/').pop() || 'image',
          error: '',
        });
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load contact page');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateField = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'contact_location_name' && !String(value || '').trim()) {
        next.contact_location_link = '';
      }
      return next;
    });
    setFieldErrors((prev) => prev.filter((f) => f !== key));
  };

  const uploadToR2 = async (file, { onProgress, onPhase }) => {
    try {
      await axios.post('/api/upload/r2-setup-cors');
    } catch {
      /* continue */
    }

    const { data } = await axios.post('/api/upload/r2-signed-url', {
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      prefix: 'personal-info',
    });

    const { signedUrl, key, contentType: signedContentType } = data;
    const putContentType = signedContentType || file.type || 'application/octet-stream';

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      xhr.timeout = 0;

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && event.total > 0) {
          const raw = (event.loaded / event.total) * 100;
          onProgress?.(Math.min(99, Math.round(raw)));
          onPhase?.(event.loaded >= event.total ? 'finishing' : 'sending');
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress?.(100);
          onPhase?.('done');
          resolve(key);
        } else {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      });
      xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
      xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

      xhr.open('PUT', signedUrl);
      xhr.setRequestHeader('Content-Type', putContentType);
      xhr.send(file);
    });

    return key;
  };

  const handleContactHeroSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!IMAGE_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
      setContactHeroUpload((s) => ({
        ...s,
        status: 'error',
        error: 'Please upload an image file (JPEG, PNG, GIF, WEBP).',
      }));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setContactHeroUpload((s) => ({
        ...s,
        status: 'error',
        error: 'Image size exceeds 20 MB limit.',
      }));
      return;
    }

    setContactHeroUpload({
      status: 'uploading',
      progress: 0,
      phase: 'sending',
      fileName: file.name,
      error: '',
    });

    try {
      const key = await uploadToR2(file, {
        onProgress: (p) => setContactHeroUpload((s) => ({ ...s, progress: p })),
        onPhase: (phase) => setContactHeroUpload((s) => ({ ...s, phase })),
      });
      updateField('contact_hero_image', key);
      updateField('contact_hero_position', { x: 50, y: 50 });
      setContactHeroUpload({
        status: 'done',
        progress: 100,
        phase: 'done',
        fileName: file.name,
        error: '',
      });
    } catch (err) {
      if (err.message === 'Upload cancelled') {
        setContactHeroUpload({ status: 'idle', progress: 0, phase: 'idle', fileName: '', error: '' });
      } else {
        setContactHeroUpload((s) => ({
          ...s,
          status: 'error',
          error: err.message || 'Upload failed',
        }));
      }
    } finally {
      if (contactHeroInputRef.current) contactHeroInputRef.current.value = '';
    }
  };

  const cancelUpload = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
  };

  const clearContactHero = () => {
    updateField('contact_hero_image', '');
    updateField('contact_hero_position', { x: 50, y: 50 });
    setContactHeroUpload({ status: 'idle', progress: 0, phase: 'idle', fileName: '', error: '' });
  };

  const handleCancel = () => {
    setForm(snapshot);
    setError('');
    setSuccess('');
    setFieldErrors([]);
    if (snapshot.contact_hero_image) {
      setContactHeroUpload({
        status: 'done',
        progress: 100,
        phase: 'done',
        fileName: String(snapshot.contact_hero_image).split('/').pop() || 'image',
        error: '',
      });
    } else {
      setContactHeroUpload({ status: 'idle', progress: 0, phase: 'idle', fileName: '', error: '' });
    }
  };

  const handleSave = async () => {
    if (!canManage) {
      setError('❌ You do not have permission to save the contact page');
      return;
    }

    const result = validateContactForm(form);
    if (!result.ok) {
      setFieldErrors(result.fields);
      setError(result.message);
      setSuccess('');
      return;
    }

    setFieldErrors([]);
    setSaving(true);
    setError('');
    setSuccess('');

    const locationNameValue = String(form.contact_location_name || '').trim();

    try {
      const payload = {
        contact_phone: formatPhoneForDB(form.contact_phone),
        contact_email: form.contact_email.trim(),
        contact_text: form.contact_text,
        contact_response_text: String(form.contact_response_text || '').trim(),
        contact_location_name: locationNameValue,
        contact_location_link: locationNameValue ? String(form.contact_location_link || '').trim() : '',
        contact_hero_image: form.contact_hero_image,
        contact_hero_position: normalizeHeroMobilePosition(form.contact_hero_position),
      };

      const { data } = await apiClient.put('/api/personal_info', payload);
      const next = docToForm(data);
      setForm(next);
      setSnapshot(next);
      queryClient.invalidateQueries({ queryKey: personalInfoKeys.all });
      setSuccess('✅ Contact page saved successfully!');
    } catch (err) {
      setError(`❌ ${err?.response?.data?.error || 'Failed to save contact page'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loader}>
        <div className={styles.loaderCard}>
          <div className={styles.loaderSpinner} aria-hidden="true" />
          <p className={styles.loaderTitle}>Loading contact page</p>
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
            <Image src="/phone.svg" alt="Contact page" width={32} height={32} />
            Contact Page
          </div>
        </Title>

        <Section title="Contact section">
          <div className={styles.field}>
            <label>Contact hero image</label>
            <input
              ref={contactHeroInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleContactHeroSelect}
              disabled={!canManage || contactHeroUpload.status === 'uploading'}
            />

            {(contactHeroUpload.status === 'idle' || contactHeroUpload.status === 'error') &&
              !form.contact_hero_image && (
              <div
                className={styles.uploadZone}
                onClick={() => canManage && contactHeroInputRef.current?.click()}
              >
                <div style={{ fontSize: '2rem', color: '#9aabb8' }}>+</div>
                <div className={styles.uploadZoneTitle}>Click to upload contact hero image</div>
                <div className={styles.uploadZoneHint}>Optional · JPEG, PNG, GIF, WEBP · Max 20 MB</div>
              </div>
            )}

            {contactHeroUpload.status === 'uploading' && (
              <div className={styles.uploadProgress}>
                <div className={styles.progressMeta}>
                  <span>
                    {contactHeroUpload.phase === 'finishing' ? 'Finishing' : 'Uploading'}:{' '}
                    {contactHeroUpload.fileName}
                  </span>
                  <button type="button" className={styles.btnDanger} onClick={cancelUpload}>
                    <BtnIcon src="/cross-mark2.svg" />
                    Cancel
                  </button>
                </div>
                <div className={styles.progressTrack}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${contactHeroUpload.progress}%` }}
                  />
                </div>
              </div>
            )}

            {(contactHeroUpload.status === 'done' || form.contact_hero_image) &&
              contactHeroUpload.status !== 'uploading' &&
              form.contact_hero_image && (
                <div className={styles.uploadDone}>
                  <ContactHeroPreview
                    src={contactHeroPreview}
                    x={form.contact_hero_position?.x}
                    y={form.contact_hero_position?.y}
                    disabled={!canManage}
                    onChange={(x, y) => updateField('contact_hero_position', { x, y })}
                  />
                  <div className={styles.actionsRow}>
                    <button
                      type="button"
                      className={styles.btnSecondary}
                      disabled={!canManage}
                      onClick={() => contactHeroInputRef.current?.click()}
                    >
                      <BtnIcon src="/refresh.svg" />
                      Replace
                    </button>
                    <button
                      type="button"
                      className={styles.btnDanger}
                      disabled={!canManage}
                      onClick={clearContactHero}
                    >
                      <BtnIcon src="/trash2.svg" />
                      Remove
                    </button>
                  </div>
                </div>
              )}

            {contactHeroUpload.error ? (
              <p className={styles.fieldErrorText}>{contactHeroUpload.error}</p>
            ) : null}
          </div>

          <div className={`${styles.field} ${styles.phoneWrap}`}>
            <label>
              Phone number <RequiredMark />
            </label>
            <PhoneInput
              country="eg"
              enableSearch
              value={form.contact_phone || ''}
              disabled={!canManage}
              onChange={(value) => {
                const validationPhone = validateEgyptPhone(value);
                updateField('contact_phone', validationPhone.value);
              }}
              onKeyDown={(e) => handleEgyptPhoneKeyDown(e, form.contact_phone)}
              containerClass={`phone-container ${hasFieldError('contact_phone') ? 'phone-error' : ''}`}
              inputClass="phone-input"
              buttonClass="phone-flag-btn"
              dropdownClass="phone-dropdown"
              placeholder="Enter phone number"
            />
          </div>

          <div className={styles.field}>
            <label>Location name</label>
            <input
              className={styles.input}
              type="text"
              value={form.contact_location_name}
              onChange={(e) => updateField('contact_location_name', e.target.value)}
              placeholder="e.g. Cairo clinic, or studio name"
              disabled={!canManage}
            />
          </div>

          {locationName ? (
            <div className={styles.field}>
              <label>Location link</label>
              <input
                className={`${styles.input} ${hasFieldError('contact_location_link') ? styles.inputError : ''}`}
                type="url"
                value={form.contact_location_link}
                onChange={(e) => updateField('contact_location_link', e.target.value)}
                placeholder="https://maps.google.com/…"
                disabled={!canManage}
              />
            </div>
          ) : null}

          <div className={styles.field}>
            <label>
              Email <RequiredMark />
            </label>
            <input
              className={`${styles.input} ${hasFieldError('contact_email') ? styles.inputError : ''}`}
              type="email"
              value={form.contact_email}
              onChange={(e) => updateField('contact_email', e.target.value)}
              placeholder="name@example.com"
              disabled={!canManage}
            />
          </div>

          <div className={styles.field}>
            <label>
              Contact text <RequiredMark />
            </label>
            <textarea
              className={`${styles.textarea} ${hasFieldError('contact_text') ? styles.inputError : ''}`}
              value={form.contact_text}
              onChange={(e) => updateField('contact_text', e.target.value)}
              placeholder="Contact message or availability note…"
              disabled={!canManage}
            />
          </div>

          <div className={styles.field}>
            <label>
              Response time text <RequiredMark />
            </label>
            <textarea
              className={`${styles.textarea} ${hasFieldError('contact_response_text') ? styles.inputError : ''}`}
              value={form.contact_response_text}
              onChange={(e) => updateField('contact_response_text', e.target.value)}
              placeholder="e.g. I will contact you as soon as possible."
              disabled={!canManage}
            />
          </div>
        </Section>

        <div className={styles.footerActions}>
          <button
            type="button"
            className={styles.btnSave}
            onClick={handleSave}
            disabled={!canSave}
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
            disabled={saving || contactHeroUpload.status === 'uploading'}
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
