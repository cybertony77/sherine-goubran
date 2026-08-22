import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import Title from '../../components/Title';
import LinkFormModal from '../../components/LinkFormModal';
import apiClient from '../../lib/axios';
import { formatPhoneForDB } from '../../lib/phoneUtils';
import { isWhatsAppLinkName } from '../../lib/marketingPageClientUtils';
import {
  buildStoredLinkRow,
  buildStoredLinksPayload,
  parseStoredLinkForEdit,
  socialIconSrc,
} from '../../lib/linksClientUtils';
import { personalInfoKeys } from '../../lib/api/personalInfo';
import { resetHeroMediaCache } from '../../lib/heroMediaCache';
import styles from '../../styles/personal_info.module.css';
import linkStyles from '../../styles/links.module.css';

const MAX_HERO_BYTES = 4 * 1024 * 1024 * 1024; // 4 GB
const MAX_ABOUT_IMAGE_BYTES = 20 * 1024 * 1024;
const SHORT_DESC_MAX = 200;
const ABOUT_TEXT_MAX = 600;
const ITEM_TITLE_MAX = 80;
const ITEM_DESC_MAX = 200;
const QUOTE_MAX = 300;

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
];

function emptyForm() {
  return {
    name: '',
    hero_section_media: '',
    hero_mobile_position: { x: 50, y: 50 },
    typing_text_raw: '',
    short_desc: '',
    years_of_experience: '',
    people_trained: '',
    professional_certificates: '',
    events_and_workshops: '',
    about_image: '',
    about_image_position: { x: 50, y: 50 },
    about_text: '',
    journey: [{ title: '', short_desc: '' }],
    what_drives_me: { title: '', short_desc: '', quote: '' },
    professional_roles: [{ title: '', short_desc: '' }],
    links: [],
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

function coverExtra(imgW, imgH, boxW, boxH) {
  if (!imgW || !imgH || !boxW || !boxH) {
    return { extraX: Math.max(boxW || 1, 1), extraY: Math.max(boxH || 1, 1) };
  }
  const scale = Math.max(boxW / imgW, boxH / imgH);
  return {
    extraX: Math.max(imgW * scale - boxW, 0.0001),
    extraY: Math.max(imgH * scale - boxH, 0.0001),
  };
}

function isVideoKey(key = '') {
  return /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(key);
}

function heroMediaKind(key = '') {
  return isVideoKey(key) ? 'video' : 'image';
}

function mediaSrcFromKey(key) {
  if (!key) return '';
  if (/^https?:\/\//i.test(key) || key.startsWith('/')) return key;
  const parts = String(key)
    .split('/')
    .map((p) => encodeURIComponent(p))
    .join('/');
  return isVideoKey(key) ? `/api/videos/${parts}` : `/api/files/${parts}`;
}

function isValidHttpUrl(value) {
  try {
    const u = new URL(String(value || '').trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function isFilledNumber(value) {
  if (value === null || value === undefined || value === '') return false;
  return Number.isFinite(Number(value));
}

function isPhoneFilled(phone) {
  const digits = formatPhoneForDB(phone || '');
  return Boolean(digits && digits.length > 2);
}

function validateTitleDescRows(rows, prefix) {
  const fields = [];
  (Array.isArray(rows) ? rows : []).forEach((row, i) => {
    const title = String(row?.title || row?.name || '').trim();
    const desc = String(row?.short_desc || '').trim();
    const anyFilled = Boolean(title || desc);
    if (!anyFilled) return;
    if (!title) fields.push(`${prefix}_title_${i}`);
    if (!desc) fields.push(`${prefix}_desc_${i}`);
    if (desc.length > ITEM_DESC_MAX) fields.push(`${prefix}_desc_${i}`);
  });
  return fields;
}

/** @returns {{ ok: boolean, message: string, fields: string[] }} */
function validatePersonalInfoForm(form) {
  const fields = [];

  if (!form.hero_section_media) fields.push('hero_section_media');
  if (!String(form.name || '').trim()) fields.push('name');
  if (!String(form.typing_text_raw || '').trim()) fields.push('typing_text_raw');
  if (!String(form.short_desc || '').trim()) fields.push('short_desc');
  if (String(form.short_desc || '').length > SHORT_DESC_MAX) fields.push('short_desc');
  if (!isFilledNumber(form.years_of_experience)) fields.push('years_of_experience');
  if (!isFilledNumber(form.people_trained)) fields.push('people_trained');
  if (!isFilledNumber(form.professional_certificates)) fields.push('professional_certificates');
  if (!isFilledNumber(form.events_and_workshops)) fields.push('events_and_workshops');
  if (!form.about_image) fields.push('about_image');
  if (!String(form.about_text || '').trim()) fields.push('about_text');
  if (String(form.about_text || '').length > ABOUT_TEXT_MAX) fields.push('about_text');

  fields.push(...validateTitleDescRows(form.journey, 'journey'));
  fields.push(...validateTitleDescRows(form.professional_roles, 'experience'));

  const drives = form.what_drives_me || {};
  const drivesTitle = String(drives.title || '').trim();
  const drivesDesc = String(drives.short_desc || '').trim();
  const drivesQuote = String(drives.quote || '').trim();
  const drivesAny = Boolean(drivesTitle || drivesDesc || drivesQuote);
  if (drivesAny) {
    if (!drivesTitle) fields.push('drives_title');
    if (!drivesDesc) fields.push('drives_desc');
    if (drivesDesc.length > ITEM_DESC_MAX) fields.push('drives_desc');
    if (drivesQuote.length > QUOTE_MAX) fields.push('drives_quote');
  }

  const links = Array.isArray(form.links) ? form.links : [];
  let hasIncompleteLink = false;
  let hasInvalidUrl = false;

  links.forEach((row, i) => {
    const name = (row.name || '').trim();
    const link = (row.link || '').trim();
    const phone = row.phone || '';
    const isWa = isWhatsAppLinkName(name);
    const anyFilled = Boolean(name || link || phone);

    if (!anyFilled) return;

    if (!name) {
      fields.push(`link_name_${i}`);
      hasIncompleteLink = true;
      return;
    }

    if (isWa) {
      if (!isPhoneFilled(phone)) {
        fields.push(`link_phone_${i}`);
        hasIncompleteLink = true;
      }
      return;
    }

    if (!link) {
      fields.push(`link_url_${i}`);
      hasIncompleteLink = true;
      return;
    }
    if (!isValidHttpUrl(link)) {
      fields.push(`link_url_${i}`);
      hasInvalidUrl = true;
    }
  });

  if (hasInvalidUrl) {
    return {
      ok: false,
      message: '❌ All URLs must start with http:// or https://',
      fields: [...new Set(fields)],
    };
  }

  if (hasIncompleteLink) {
    fields.push('links');
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

function HeroDevicePreviews({ src, x, y, disabled, onChange }) {
  const mobileRef = useRef(null);
  const imgNat = useRef({ w: 0, h: 0 });
  const pos = useMemo(() => normalizeHeroMobilePosition({ x, y }), [x, y]);
  const posRef = useRef(pos);
  posRef.current = pos;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const startDrag = (event) => {
    if (disabled || (event.button != null && event.button !== 0)) return;
    event.preventDefault();
    const frame = mobileRef.current;
    if (!frame) return;
    const start = {
      px: event.clientX,
      py: event.clientY,
      x: posRef.current.x,
      y: posRef.current.y,
    };

    const onMove = (ev) => {
      const rect = frame.getBoundingClientRect();
      const extra = coverExtra(imgNat.current.w, imgNat.current.h, rect.width, rect.height);
      const nextX = clampPct(start.x - ((ev.clientX - start.px) / extra.extraX) * 100);
      const nextY = clampPct(start.y - ((ev.clientY - start.py) / extra.extraY) * 100);
      onChangeRef.current(nextX, nextY);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const objectPos = `${pos.x}% ${pos.y}%`;

  return (
    <div className={styles.deviceBlock}>
      <div className={styles.previewRow}>
        <div className={styles.desktopCol}>
          <p className={styles.deviceLabel}>Desktop</p>
          <div className={styles.desktopFrame}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="Desktop hero preview" draggable={false} />
          </div>
        </div>

        <div className={styles.mobileCol}>
          <p className={styles.deviceLabel}>Mobile</p>
          <div
            ref={mobileRef}
            className={`${styles.mobileFrame} ${disabled ? styles.mobileFrameDisabled : ''}`}
            onPointerDown={startDrag}
            role="presentation"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt="Mobile hero preview"
              draggable={false}
              style={{ objectPosition: objectPos }}
              onLoad={(e) => {
                imgNat.current = {
                  w: e.currentTarget.naturalWidth,
                  h: e.currentTarget.naturalHeight,
                };
              }}
            />
            <span
              className={styles.focalDot}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            />
          </div>
        </div>
      </div>

      <div className={styles.controlsRow}>
        <p className={styles.deviceNote}>Drag the mobile preview to set the crop on phones.</p>
        <div className={styles.posRow}>
          <div className={styles.field}>
            <label htmlFor="hero-pos-x">X</label>
            <input
              id="hero-pos-x"
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
            <label htmlFor="hero-pos-y">Y</label>
            <input
              id="hero-pos-y"
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

function mapTitleDescRows(rows) {
  return Array.isArray(rows) && rows.length
    ? rows.map((row) => ({
        title: String(row?.title || row?.name || '').slice(0, ITEM_TITLE_MAX),
        short_desc: String(row?.short_desc || '').slice(0, ITEM_DESC_MAX),
      }))
    : [{ title: '', short_desc: '' }];
}

function docToForm(doc) {
  const links = Array.isArray(doc?.links) && doc.links.length
    ? doc.links.map(parseStoredLinkForEdit)
    : [];

  return {
    name: doc?.name || '',
    hero_section_media: doc?.hero_section_media || '',
    hero_mobile_position: normalizeHeroMobilePosition(doc?.hero_mobile_position),
    typing_text_raw: Array.isArray(doc?.typing_text) ? doc.typing_text.join(', ') : '',
    short_desc: doc?.short_desc || '',
    years_of_experience:
      doc?.years_of_experience === null || doc?.years_of_experience === undefined
        ? ''
        : String(doc.years_of_experience),
    people_trained:
      doc?.people_trained === null || doc?.people_trained === undefined
        ? ''
        : String(doc.people_trained),
    professional_certificates:
      doc?.professional_certificates === null || doc?.professional_certificates === undefined
        ? ''
        : String(doc.professional_certificates),
    events_and_workshops:
      doc?.events_and_workshops === null || doc?.events_and_workshops === undefined
        ? ''
        : String(doc.events_and_workshops),
    about_image: doc?.about_image || '',
    about_image_position: normalizeHeroMobilePosition(doc?.about_image_position),
    about_text: doc?.about_text || '',
    journey: mapTitleDescRows(doc?.journey),
    what_drives_me: {
      title: String(doc?.what_drives_me?.title || '').slice(0, ITEM_TITLE_MAX),
      short_desc: String(doc?.what_drives_me?.short_desc || '').slice(0, ITEM_DESC_MAX),
      quote: String(doc?.what_drives_me?.quote || '').slice(0, QUOTE_MAX),
    },
    professional_roles: mapTitleDescRows(doc?.professional_roles),
    links,
  };
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

function Subsection({ title, note, children }) {
  return (
    <div className={styles.subsection}>
      <div className={styles.subsectionHead}>
        <h3 className={styles.subsectionTitle}>{title}</h3>
        {note ? <p className={styles.note}>{note}</p> : null}
      </div>
      {children}
    </div>
  );
}

function formatStepNumber(index) {
  return String(index + 1).padStart(2, '0');
}

function TitleDescListEditor({
  rows,
  fieldKey,
  prefix,
  canManage,
  hasFieldError,
  updateField,
  titlePlaceholder,
  descPlaceholder,
  addLabel,
  deleteLabel,
  showSteps = false,
}) {
  return (
    <>
      {rows.map((row, i) => (
        <div
          key={i}
          className={`${styles.linkCard} ${showSteps ? styles.stepCard : ''} ${hasFieldError(`${prefix}_title_${i}`) || hasFieldError(`${prefix}_desc_${i}`) ? styles.linkCardError : ''}`}
        >
          {showSteps ? (
            <p className={styles.stepBadge} aria-hidden="true">
              {formatStepNumber(i)}
            </p>
          ) : null}
          <div className={styles.roleRow}>
            <div className={styles.field}>
              <label>Title</label>
              <input
                className={`${styles.input} ${hasFieldError(`${prefix}_title_${i}`) ? styles.inputError : ''}`}
                placeholder={titlePlaceholder}
                value={row.title}
                maxLength={ITEM_TITLE_MAX}
                disabled={!canManage}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...next[i], title: e.target.value.slice(0, ITEM_TITLE_MAX) };
                  updateField(fieldKey, next);
                }}
              />
            </div>
            <div className={styles.field}>
              <label>Short description</label>
              <input
                className={`${styles.input} ${hasFieldError(`${prefix}_desc_${i}`) ? styles.inputError : ''}`}
                placeholder={descPlaceholder}
                value={row.short_desc}
                maxLength={ITEM_DESC_MAX}
                disabled={!canManage}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...next[i], short_desc: e.target.value.slice(0, ITEM_DESC_MAX) };
                  updateField(fieldKey, next);
                }}
              />
              <p className={styles.charCount}>
                {String(row.short_desc || '').length}/{ITEM_DESC_MAX}
              </p>
            </div>
          </div>
          <div className={styles.linkDeleteRow}>
            <button
              type="button"
              className={styles.btnDanger}
              disabled={!canManage || rows.length <= 1}
              onClick={() => updateField(fieldKey, rows.filter((_, j) => j !== i))}
            >
              {deleteLabel}
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        className={styles.btnPrimary}
        disabled={!canManage}
        onClick={() => updateField(fieldKey, [...rows, { title: '', short_desc: '' }])}
      >
        {addLabel}
      </button>
    </>
  );
}

export default function PersonalInfoPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const heroInputRef = useRef(null);
  const aboutInputRef = useRef(null);
  const aboutDragRef = useRef(null);
  const aboutDragState = useRef(null);
  const xhrRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [snapshot, setSnapshot] = useState(emptyForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [linksError, setLinksError] = useState('');
  const [fieldErrors, setFieldErrors] = useState([]);
  const [linkFormOpen, setLinkFormOpen] = useState(false);
  const [linkEditIndex, setLinkEditIndex] = useState(null);
  const [linkDeleteIndex, setLinkDeleteIndex] = useState(null);

  const hasFieldError = useCallback(
    (key) => fieldErrors.includes(key),
    [fieldErrors]
  );

  const [heroUpload, setHeroUpload] = useState({
    status: 'idle',
    progress: 0,
    phase: 'idle',
    fileName: '',
    error: '',
  });
  const [aboutUpload, setAboutUpload] = useState({
    status: 'idle',
    progress: 0,
    phase: 'idle',
    fileName: '',
    error: '',
  });
  const [heroTab, setHeroTab] = useState('image');

  const heroPreview = useMemo(
    () => mediaSrcFromKey(form.hero_section_media),
    [form.hero_section_media]
  );
  const aboutPreview = useMemo(
    () => mediaSrcFromKey(form.about_image),
    [form.about_image]
  );

  const canSave = useMemo(() => {
    if (!canManage || saving) return false;
    if (heroUpload.status === 'uploading' || aboutUpload.status === 'uploading') return false;
    if (!validatePersonalInfoForm(form).ok) return false;
    return JSON.stringify(form) !== JSON.stringify(snapshot);
  }, [
    canManage,
    saving,
    heroUpload.status,
    aboutUpload.status,
    form,
    snapshot,
  ]);

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

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await apiClient.get('/api/personal_info');
      const next = docToForm(data);
      setForm(next);
      setSnapshot(next);
      setCanManage(Boolean(data.canManage));
      if (data.hero_section_media) {
        setHeroTab(heroMediaKind(data.hero_section_media));
        setHeroUpload({
          status: 'done',
          progress: 100,
          phase: 'done',
          fileName: String(data.hero_section_media).split('/').pop() || 'media',
          error: '',
        });
      } else {
        setHeroTab('image');
      }
      if (data.about_image) {
        setAboutUpload({
          status: 'done',
          progress: 100,
          phase: 'done',
          fileName: String(data.about_image).split('/').pop() || 'image',
          error: '',
        });
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load personal info');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateField = (key, value) => {
    let next = value;
    if (key === 'short_desc') next = String(value ?? '').slice(0, SHORT_DESC_MAX);
    if (key === 'about_text') next = String(value ?? '').slice(0, ABOUT_TEXT_MAX);
    setForm((prev) => ({ ...prev, [key]: next }));
    setFieldErrors((prev) => prev.filter((f) => f !== key && !String(f).startsWith('link_')));
    if (key === 'links') setLinksError('');
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

  const switchHeroTab = (tab) => {
    if (heroUpload.status === 'uploading' || tab === heroTab) return;
    setHeroTab(tab);
    if (heroInputRef.current) heroInputRef.current.value = '';
  };

  const handleHeroSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = heroTab === 'video' ? VIDEO_TYPES : IMAGE_TYPES;
    const isAllowed =
      allowed.includes(file.type) ||
      (heroTab === 'image' && file.type.startsWith('image/')) ||
      (heroTab === 'video' && file.type.startsWith('video/'));

    if (!isAllowed) {
      setHeroUpload((s) => ({
        ...s,
        status: 'error',
        error:
          heroTab === 'video'
            ? 'Invalid file type. Upload a video (MP4, WebM, OGG, MOV, AVI, MKV).'
            : 'Invalid file type. Upload an image (JPEG, PNG, GIF, WEBP).',
      }));
      return;
    }
    if (file.size > MAX_HERO_BYTES) {
      setHeroUpload((s) => ({
        ...s,
        status: 'error',
        error: 'File size exceeds 4 GB limit.',
      }));
      return;
    }

    setHeroUpload({
      status: 'uploading',
      progress: 0,
      phase: 'sending',
      fileName: file.name,
      error: '',
    });

    try {
      const key = await uploadToR2(file, {
        onProgress: (p) => setHeroUpload((s) => ({ ...s, progress: p })),
        onPhase: (phase) => setHeroUpload((s) => ({ ...s, phase })),
      });
      updateField('hero_section_media', key);
      updateField('hero_mobile_position', { x: 50, y: 50 });
      setHeroUpload({
        status: 'done',
        progress: 100,
        phase: 'done',
        fileName: file.name,
        error: '',
      });
    } catch (err) {
      if (err.message === 'Upload cancelled') {
        setHeroUpload({ status: 'idle', progress: 0, phase: 'idle', fileName: '', error: '' });
      } else {
        setHeroUpload((s) => ({
          ...s,
          status: 'error',
          error: err.message || 'Upload failed',
        }));
      }
    } finally {
      if (heroInputRef.current) heroInputRef.current.value = '';
    }
  };

  const handleAboutSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!IMAGE_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
      setAboutUpload((s) => ({
        ...s,
        status: 'error',
        error: 'Please upload an image file (JPEG, PNG, GIF, WEBP).',
      }));
      return;
    }
    if (file.size > MAX_ABOUT_IMAGE_BYTES) {
      setAboutUpload((s) => ({
        ...s,
        status: 'error',
        error: 'Image size exceeds 20 MB limit.',
      }));
      return;
    }

    setAboutUpload({
      status: 'uploading',
      progress: 0,
      phase: 'sending',
      fileName: file.name,
      error: '',
    });

    try {
      const key = await uploadToR2(file, {
        onProgress: (p) => setAboutUpload((s) => ({ ...s, progress: p })),
        onPhase: (phase) => setAboutUpload((s) => ({ ...s, phase })),
      });
      updateField('about_image', key);
      updateField('about_image_position', { x: 50, y: 50 });
      setAboutUpload({
        status: 'done',
        progress: 100,
        phase: 'done',
        fileName: file.name,
        error: '',
      });
    } catch (err) {
      if (err.message === 'Upload cancelled') {
        setAboutUpload({ status: 'idle', progress: 0, phase: 'idle', fileName: '', error: '' });
      } else {
        setAboutUpload((s) => ({
          ...s,
          status: 'error',
          error: err.message || 'Upload failed',
        }));
      }
    } finally {
      if (aboutInputRef.current) aboutInputRef.current.value = '';
    }
  };

  const cancelUpload = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
  };

  const clearHero = () => {
    updateField('hero_section_media', '');
    updateField('hero_mobile_position', { x: 50, y: 50 });
    setHeroUpload({ status: 'idle', progress: 0, phase: 'idle', fileName: '', error: '' });
  };

  const clearAbout = () => {
    updateField('about_image', '');
    updateField('about_image_position', { x: 50, y: 50 });
    setAboutUpload({ status: 'idle', progress: 0, phase: 'idle', fileName: '', error: '' });
  };

  const aboutPos = normalizeHeroMobilePosition(form.about_image_position);

  const onAboutPointerDown = (e) => {
    if (!aboutDragRef.current || !canManage || aboutUpload.status === 'uploading') return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    aboutDragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: aboutPos.x,
      posY: aboutPos.y,
    };
  };

  const onAboutPointerMove = (e) => {
    const drag = aboutDragState.current;
    if (!drag || !aboutDragRef.current) return;
    const rect = aboutDragRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dx = ((e.clientX - drag.startX) / rect.width) * 100;
    const dy = ((e.clientY - drag.startY) / rect.height) * 100;
    const nextX = Math.min(100, Math.max(0, drag.posX - dx));
    const nextY = Math.min(100, Math.max(0, drag.posY - dy));
    updateField('about_image_position', { x: nextX, y: nextY });
  };

  const onAboutPointerUp = () => {
    aboutDragState.current = null;
  };

  const handleCancel = () => {
    setForm(snapshot);
    setLinksError('');
    setError('');
    setSuccess('');
    setFieldErrors([]);
    setLinkFormOpen(false);
    setLinkEditIndex(null);
    setLinkDeleteIndex(null);
    if (snapshot.hero_section_media) {
      setHeroTab(heroMediaKind(snapshot.hero_section_media));
      setHeroUpload({
        status: 'done',
        progress: 100,
        phase: 'done',
        fileName: String(snapshot.hero_section_media).split('/').pop() || 'media',
        error: '',
      });
    } else {
      setHeroTab('image');
      setHeroUpload({ status: 'idle', progress: 0, phase: 'idle', fileName: '', error: '' });
    }
    if (snapshot.about_image) {
      setAboutUpload({
        status: 'done',
        progress: 100,
        phase: 'done',
        fileName: String(snapshot.about_image).split('/').pop() || 'image',
        error: '',
      });
    } else {
      setAboutUpload({ status: 'idle', progress: 0, phase: 'idle', fileName: '', error: '' });
    }
  };

  const linkFormInitial = useMemo(() => {
    if (linkEditIndex === null) return { name: '', link: '', phone: '' };
    if (linkEditIndex < 0 || linkEditIndex >= form.links.length) {
      return { name: '', link: '', phone: '' };
    }
    return form.links[linkEditIndex];
  }, [linkEditIndex, form.links]);

  const openAddLink = () => {
    setLinkEditIndex(null);
    setLinkFormOpen(true);
  };

  const openEditLink = (index) => {
    setLinkEditIndex(index);
    setLinkFormOpen(true);
  };

  const handleLinkFormSave = async (row) => {
    const stored = buildStoredLinkRow(row);
    if (!stored) return;
    const next = [...form.links];
    if (linkEditIndex === null) {
      next.push({
        name: row.name || '',
        link: row.link || '',
        phone: row.phone || '',
      });
    } else {
      next[linkEditIndex] = {
        name: row.name || '',
        link: row.link || '',
        phone: row.phone || '',
      };
    }
    updateField('links', next);
    setLinksError('');
  };

  const confirmDeleteLink = () => {
    if (linkDeleteIndex === null) return;
    updateField(
      'links',
      form.links.filter((_, j) => j !== linkDeleteIndex)
    );
    setLinkDeleteIndex(null);
    setLinksError('');
  };

  const handleSave = async () => {
    if (!canManage) {
      setError('❌ You do not have permission to save personal info');
      return;
    }

    const result = validatePersonalInfoForm(form);
    if (!result.ok) {
      setFieldErrors(result.fields);
      setError(result.message);
      setSuccess('');
      if (result.fields.includes('links') || result.message.includes('URL')) {
        setLinksError(result.message);
      }
      return;
    }

    setLinksError('');
    setFieldErrors([]);
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        name: form.name,
        hero_section_media: form.hero_section_media,
        hero_mobile_position: normalizeHeroMobilePosition(form.hero_mobile_position),
        typing_text: form.typing_text_raw,
        short_desc: form.short_desc,
        years_of_experience: form.years_of_experience,
        people_trained: form.people_trained,
        professional_certificates: form.professional_certificates,
        events_and_workshops: form.events_and_workshops,
        about_image: form.about_image,
        about_image_position: normalizeHeroMobilePosition(form.about_image_position),
        about_text: form.about_text,
        journey: form.journey,
        what_drives_me: form.what_drives_me,
        professional_roles: form.professional_roles,
        links: form.links,
      };

      buildStoredLinksPayload(form.links);

      const { data } = await apiClient.put('/api/personal_info', payload);
      const next = docToForm(data);
      const mediaChanged = snapshot.hero_section_media !== next.hero_section_media;
      setForm(next);
      setSnapshot(next);
      queryClient.invalidateQueries({ queryKey: personalInfoKeys.all });
      if (mediaChanged) {
        await resetHeroMediaCache();
      }
      setSuccess('✅ Personal info saved successfully!');
    } catch (err) {
      setError(`❌ ${err?.response?.data?.error || 'Failed to save personal info'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loader}>
        <div className={styles.loaderCard}>
          <div className={styles.loaderSpinner} aria-hidden="true" />
          <p className={styles.loaderTitle}>Loading personal info</p>
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
            <Image src="/user2.svg" alt="Personal Info" width={32} height={32} />
            Personal Info
          </div>
        </Title>

        <Section title="Hero media">
          <div className={styles.field}>
            <label>
              Hero media <RequiredMark />
            </label>
            <p className={styles.note}>Use an image or a video — not both.</p>
            <div className={styles.heroTabs} role="tablist" aria-label="Hero media type">
              <button
                type="button"
                role="tab"
                className={`${styles.heroTab} ${heroTab === 'image' ? styles.heroTabActive : ''}`}
                aria-selected={heroTab === 'image'}
                disabled={!canManage || heroUpload.status === 'uploading'}
                onClick={() => switchHeroTab('image')}
              >
                Images
              </button>
              <button
                type="button"
                role="tab"
                className={`${styles.heroTab} ${heroTab === 'video' ? styles.heroTabActive : ''}`}
                aria-selected={heroTab === 'video'}
                disabled={!canManage || heroUpload.status === 'uploading'}
                onClick={() => switchHeroTab('video')}
              >
                Videos
              </button>
            </div>
            <input
              ref={heroInputRef}
              type="file"
              accept={
                heroTab === 'video'
                  ? 'video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo,video/x-matroska'
                  : 'image/jpeg,image/png,image/gif,image/webp'
              }
              style={{ display: 'none' }}
              onChange={handleHeroSelect}
              disabled={!canManage || heroUpload.status === 'uploading'}
            />

            {form.hero_section_media &&
            heroMediaKind(form.hero_section_media) !== heroTab &&
            heroUpload.status !== 'uploading' ? (
              <p className={styles.note}>
                {heroTab === 'video'
                  ? 'An image is currently used as hero media. Upload a video here to replace it.'
                  : 'A video is currently used as hero media. Upload an image here to replace it.'}
              </p>
            ) : null}

            {(heroUpload.status === 'idle' || heroUpload.status === 'error') &&
              (!form.hero_section_media ||
                heroMediaKind(form.hero_section_media) !== heroTab) && (
              <div
                className={`${styles.uploadZone} ${hasFieldError('hero_section_media') ? styles.uploadZoneError : ''}`}
                onClick={() => canManage && heroInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') heroInputRef.current?.click();
                }}
              >
                <div style={{ fontSize: '2rem', color: '#9aabb8' }}>+</div>
                <div className={styles.uploadZoneTitle}>
                  {heroTab === 'video' ? 'Click to select a video' : 'Click to select an image'}
                </div>
                <div className={styles.uploadZoneHint}>
                  {heroTab === 'video'
                    ? 'MP4, WebM, OGG, MOV, AVI, MKV · Up to 4 GB'
                    : 'JPEG, PNG, GIF, WEBP · Max 20 MB'}
                </div>
              </div>
            )}

            {heroUpload.status === 'uploading' && (
              <div className={styles.uploadProgress}>
                <div className={styles.progressMeta}>
                  <span>
                    {heroUpload.phase === 'finishing' ? 'Finishing' : 'Uploading'}:{' '}
                    {heroUpload.fileName}
                  </span>
                  <button type="button" className={styles.btnDanger} onClick={cancelUpload}>
                    <BtnIcon src="/cross-mark2.svg" />
                    Cancel
                  </button>
                </div>
                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: `${heroUpload.progress}%` }} />
                </div>
                <div style={{ textAlign: 'right', marginTop: 6, color: '#666', fontSize: '0.85rem' }}>
                  {heroUpload.progress}%
                </div>
              </div>
            )}

            {(heroUpload.status === 'done' || form.hero_section_media) &&
              heroUpload.status !== 'uploading' &&
              form.hero_section_media &&
              heroMediaKind(form.hero_section_media) === heroTab && (
              <div className={styles.uploadDone}>
                {heroTab === 'video' ? (
                  <video
                    className={styles.previewMedia}
                    controls
                    playsInline
                    key={heroPreview}
                  >
                    {/* Always include a video/mp4 source so .mov files play in Chrome/Firefox */}
                    <source src={heroPreview} type="video/mp4" />
                    <source src={heroPreview} />
                  </video>
                ) : (
                  <HeroDevicePreviews
                    src={heroPreview}
                    x={form.hero_mobile_position?.x}
                    y={form.hero_mobile_position?.y}
                    disabled={!canManage}
                    onChange={(nx, ny) =>
                      updateField('hero_mobile_position', { x: nx, y: ny })
                    }
                  />
                )}
                <div className={styles.actionsRow}>
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    disabled={!canManage}
                    onClick={() => heroInputRef.current?.click()}
                  >
                    <BtnIcon src="/refresh.svg" />
                    Replace
                  </button>
                  <button
                    type="button"
                    className={styles.btnDanger}
                    disabled={!canManage}
                    onClick={clearHero}
                  >
                    <BtnIcon src="/trash2.svg" />
                    Remove
                  </button>
                </div>
              </div>
            )}

            {heroUpload.status === 'error' && heroUpload.error ? (
              <p className={styles.fieldErrorText}>{heroUpload.error}</p>
            ) : null}
            {hasFieldError('hero_section_media') && !form.hero_section_media ? (
              <p className={styles.fieldErrorText}>
                {heroTab === 'video' ? 'Hero video is required' : 'Hero image is required'}
              </p>
            ) : null}
          </div>
        </Section>

        <Section title="Profile basics">
          <div className={styles.field}>
            <label>
              Name <RequiredMark />
            </label>
            <input
              className={`${styles.input} ${hasFieldError('name') ? styles.inputError : ''}`}
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Enter full name"
              disabled={!canManage}
            />
          </div>

          <div className={styles.field}>
            <label>
              Typing text <RequiredMark />
            </label>
            <input
              className={`${styles.input} ${hasFieldError('typing_text_raw') ? styles.inputError : ''}`}
              value={form.typing_text_raw}
              onChange={(e) => updateField('typing_text_raw', e.target.value)}
              placeholder="Educator, Mentor, Speaker"
              disabled={!canManage}
            />
            <p className={styles.note}>Separate each sentence with a comma</p>
          </div>

          <div className={styles.field}>
            <label>
              Short description <RequiredMark />
            </label>
            <textarea
              className={`${styles.textarea} ${hasFieldError('short_desc') ? styles.inputError : ''}`}
              value={form.short_desc}
              onChange={(e) => updateField('short_desc', e.target.value)}
              placeholder="Write a short introduction…"
              maxLength={SHORT_DESC_MAX}
              disabled={!canManage}
            />
            <p className={styles.charCount}>
              {String(form.short_desc || '').length}/{SHORT_DESC_MAX}
            </p>
          </div>
        </Section>

        <Section title="Highlights">
          <div className={styles.statsGrid}>
            {[
              ['years_of_experience', 'Years of experience'],
              ['people_trained', 'People Inspired'],
              ['professional_certificates', 'Professional certificates'],
              ['events_and_workshops', 'Events & workshops'],
            ].map(([key, label]) => (
              <div key={key} className={styles.statCard}>
                <label>
                  {label} <RequiredMark />
                </label>
                <input
                  className={`${styles.statInput} ${hasFieldError(key) ? styles.inputError : ''}`}
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={form[key]}
                  onChange={(e) => updateField(key, e.target.value)}
                  disabled={!canManage}
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </Section>

        <Section title="About section">
          <div className={styles.aboutSection}>
            <div className={styles.field}>
              <label>
                About image <RequiredMark />
              </label>
              <input
                ref={aboutInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAboutSelect}
                disabled={!canManage || aboutUpload.status === 'uploading'}
              />

              {(aboutUpload.status === 'idle' || aboutUpload.status === 'error') &&
                !form.about_image && (
                <div
                  className={`${styles.uploadZone} ${styles.aboutUploadZone} ${hasFieldError('about_image') ? styles.uploadZoneError : ''}`}
                  onClick={() => canManage && aboutInputRef.current?.click()}
                >
                  <div className={styles.aboutUploadPlus}>+</div>
                  <div className={styles.uploadZoneTitle}>Click to upload about image</div>
                  <div className={styles.uploadZoneHint}>JPEG, PNG, GIF, WEBP · Max 20 MB</div>
                </div>
              )}

              {aboutUpload.status === 'uploading' && (
                <div className={styles.uploadProgress}>
                  <div className={styles.progressMeta}>
                    <span>
                      {aboutUpload.phase === 'finishing' ? 'Finishing' : 'Uploading'}:{' '}
                      {aboutUpload.fileName}
                    </span>
                    <button type="button" className={styles.btnDanger} onClick={cancelUpload}>
                      <BtnIcon src="/cross-mark2.svg" />
                      Cancel
                    </button>
                  </div>
                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${aboutUpload.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {(aboutUpload.status === 'done' || form.about_image) &&
                aboutUpload.status !== 'uploading' &&
                form.about_image && (
                  <div className={`${styles.uploadDone} ${styles.aboutUploadDone}`}>
                    <div
                      ref={aboutDragRef}
                      className={styles.aboutPreviewFrame}
                      onPointerDown={onAboutPointerDown}
                      onPointerMove={onAboutPointerMove}
                      onPointerUp={onAboutPointerUp}
                      onPointerCancel={onAboutPointerUp}
                      title="Drag to reposition the visible area"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        className={`${styles.previewImage} ${styles.aboutPreviewImage}`}
                        src={aboutPreview}
                        alt="About"
                        style={{ objectPosition: `${aboutPos.x}% ${aboutPos.y}%` }}
                        draggable={false}
                      />
                      <div className={styles.aboutDragHint}>Drag to reposition</div>
                    </div>
                    <div className={`${styles.actionsRow} ${styles.aboutActionsRow}`}>
                      <button
                        type="button"
                        className={styles.btnSecondary}
                        disabled={!canManage}
                        onClick={() => aboutInputRef.current?.click()}
                      >
                        <BtnIcon src="/refresh.svg" />
                        Replace
                      </button>
                      <button
                        type="button"
                        className={styles.btnDanger}
                        disabled={!canManage}
                        onClick={clearAbout}
                      >
                        <BtnIcon src="/trash2.svg" />
                        Remove
                      </button>
                    </div>
                  </div>
                )}

              {aboutUpload.error ? (
                <p className={styles.fieldErrorText}>{aboutUpload.error}</p>
              ) : null}
              {hasFieldError('about_image') && !form.about_image ? (
                <p className={styles.fieldErrorText}>About image is required</p>
              ) : null}
            </div>

            <div className={styles.field}>
              <label>
                About text <RequiredMark />
              </label>
              <textarea
                className={`${styles.textarea} ${styles.textareaLarge} ${styles.aboutTextarea} ${hasFieldError('about_text') ? styles.inputError : ''}`}
                value={form.about_text}
                onChange={(e) => updateField('about_text', e.target.value)}
                placeholder="Tell your full story…"
                maxLength={ABOUT_TEXT_MAX}
                disabled={!canManage}
              />
              <p className={styles.charCount}>
                {String(form.about_text || '').length}/{ABOUT_TEXT_MAX}
              </p>
            </div>
          </div>

          <Subsection
            title="JOURNEY"
            note="Add each chapter of your journey with a title and short description."
          >
            <TitleDescListEditor
              rows={form.journey}
              fieldKey="journey"
              prefix="journey"
              canManage={canManage}
              hasFieldError={hasFieldError}
              updateField={updateField}
              titlePlaceholder="e.g. Early beginnings"
              descPlaceholder="A milestone or chapter in your journey"
              addLabel="+ Add journey step"
              deleteLabel="Delete step"
              showSteps
            />
          </Subsection>

          <Subsection
            title="WHAT DRIVES ME"
            note="Share what motivates you — a title, short description, and personal quote."
          >
            <div
              className={`${styles.linkCard} ${hasFieldError('drives_title') || hasFieldError('drives_desc') || hasFieldError('drives_quote') ? styles.linkCardError : ''}`}
            >
              <div className={styles.field}>
                <label>Title</label>
                <input
                  className={`${styles.input} ${hasFieldError('drives_title') ? styles.inputError : ''}`}
                  placeholder="e.g. What drives me"
                  value={form.what_drives_me.title}
                  maxLength={ITEM_TITLE_MAX}
                  disabled={!canManage}
                  onChange={(e) =>
                    updateField('what_drives_me', {
                      ...form.what_drives_me,
                      title: e.target.value.slice(0, ITEM_TITLE_MAX),
                    })
                  }
                />
              </div>
              <div className={styles.field}>
                <label>Short description</label>
                <input
                  className={`${styles.input} ${hasFieldError('drives_desc') ? styles.inputError : ''}`}
                  placeholder="A brief introduction to your motivation"
                  value={form.what_drives_me.short_desc}
                  maxLength={ITEM_DESC_MAX}
                  disabled={!canManage}
                  onChange={(e) =>
                    updateField('what_drives_me', {
                      ...form.what_drives_me,
                      short_desc: e.target.value.slice(0, ITEM_DESC_MAX),
                    })
                  }
                />
                <p className={styles.charCount}>
                  {String(form.what_drives_me.short_desc || '').length}/{ITEM_DESC_MAX}
                </p>
              </div>
              <div className={styles.field}>
                <label>Quote</label>
                <textarea
                  className={`${styles.textarea} ${hasFieldError('drives_quote') ? styles.inputError : ''}`}
                  placeholder="Your personal quote or mantra"
                  value={form.what_drives_me.quote}
                  maxLength={QUOTE_MAX}
                  disabled={!canManage}
                  onChange={(e) =>
                    updateField('what_drives_me', {
                      ...form.what_drives_me,
                      quote: e.target.value.slice(0, QUOTE_MAX),
                    })
                  }
                />
                <p className={styles.charCount}>
                  {String(form.what_drives_me.quote || '').length}/{QUOTE_MAX}
                </p>
              </div>
            </div>
          </Subsection>

          <Subsection
            title="PROFESSIONAL EXPERIENCE"
            note="Add each professional experience with a title and short description."
          >
            <TitleDescListEditor
              rows={form.professional_roles}
              fieldKey="professional_roles"
              prefix="experience"
              canManage={canManage}
              hasFieldError={hasFieldError}
              updateField={updateField}
              titlePlaceholder="e.g. Leadership Coach"
              descPlaceholder="A brief description of this experience"
              addLabel="+ Add experience"
              deleteLabel="Delete entry"
            />
          </Subsection>
        </Section>

        <Section title="Social media links">
          {linksError ? (
            <div className={`${styles.alert} ${styles.alertError}`} role="alert">
              {linksError}
            </div>
          ) : null}
          {hasFieldError('links') && !linksError ? (
            <div className={`${styles.alert} ${styles.alertError}`} role="alert">
              ❌ Please finish incomplete social media links before saving
            </div>
          ) : null}

          <div className={linkStyles.linksManagePanel}>
            <div className={linkStyles.sectionHeader}>
              <div className={linkStyles.sectionHeaderText}>
                <h3 className={linkStyles.sectionTitle}>Manage links</h3>
                <p className={linkStyles.sectionSubtitle}>
                  Add social media links such as Facebook, Instagram, TikTok, and YouTube. They appear in the
                  public website footer.
                </p>
                <span className={linkStyles.linkCountBadge}>
                  {form.links.length} {form.links.length === 1 ? 'link' : 'links'}
                </span>
              </div>
              <button
                type="button"
                className={`${linkStyles.btnAdd} ${linkStyles.btnAddTop}`}
                onClick={openAddLink}
                disabled={!canManage || saving}
              >
                <Image src="/plus.svg" alt="" width={18} height={18} />
                Add link
              </button>
            </div>

            {form.links.length === 0 ? (
              <div className={linkStyles.emptyStateManage}>
                <div className={linkStyles.emptyStateIcon}>
                  <Image src="/link.svg" alt="" width={28} height={28} />
                </div>
                <p className={linkStyles.emptyStateTitle}>No links yet</p>
                <p className={linkStyles.emptyStateDesc}>
                  Create your first social link so visitors can follow you from the website footer.
                </p>
              </div>
            ) : (
              <div className={linkStyles.builderList}>
                {form.links.map((row, i) => {
                  const stored = buildStoredLinkRow(row);
                  const displayUrl = stored?.link || row.link || (row.phone ? `Phone: ${row.phone}` : '');
                  return (
                    <div
                      key={`${row.name || 'link'}-${i}`}
                      className={`${linkStyles.builderCard} ${linkStyles.builderCardLight} ${
                        hasFieldError(`link_name_${i}`) ||
                        hasFieldError(`link_url_${i}`) ||
                        hasFieldError(`link_phone_${i}`)
                          ? styles.linkCardError
                          : ''
                      }`}
                    >
                      <div className={linkStyles.builderCardRow}>
                        <div className={linkStyles.builderCardIcon}>
                          <Image src={socialIconSrc(row.name)} alt="" width={24} height={24} />
                        </div>
                        <div className={linkStyles.builderCardInfo}>
                          <div className={`${linkStyles.builderCardName} ${linkStyles.builderCardNameLight}`}>
                            {row.name || 'Untitled link'}
                          </div>
                          <div className={linkStyles.builderCardUrl}>{displayUrl || '—'}</div>
                        </div>
                      </div>
                      <div className={linkStyles.builderCardActions}>
                        <button
                          type="button"
                          className={linkStyles.btnEdit}
                          onClick={() => openEditLink(i)}
                          disabled={!canManage || saving}
                        >
                          <Image src="/edit.svg" alt="" width={16} height={16} />
                          Edit
                        </button>
                        <button
                          type="button"
                          className={linkStyles.btnDelete}
                          onClick={() => setLinkDeleteIndex(i)}
                          disabled={!canManage || saving}
                        >
                          <Image src="/trash2.svg" alt="" width={16} height={16} />
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <LinkFormModal
            isOpen={linkFormOpen}
            onClose={() => setLinkFormOpen(false)}
            onSave={handleLinkFormSave}
            initialRow={linkFormInitial}
            formKey={linkEditIndex === null ? 'new' : `edit-${linkEditIndex}`}
            title={linkEditIndex === null ? 'Add link' : 'Edit link'}
            light
          />

          {linkDeleteIndex !== null ? (
            <div
              className={linkStyles.confirmOverlay}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-personal-link-confirm-title"
              onClick={(e) => {
                if (e.target === e.currentTarget) setLinkDeleteIndex(null);
              }}
            >
              <div className={linkStyles.confirmDialog} onClick={(e) => e.stopPropagation()}>
                <h3 id="delete-personal-link-confirm-title" className={linkStyles.confirmTitle}>
                  Delete link?
                </h3>
                <p className={linkStyles.confirmMessage}>
                  Are you sure you want to delete{' '}
                  <strong>{form.links[linkDeleteIndex]?.name || 'this link'}</strong>? This action cannot
                  be undone until you save.
                </p>
                <div className={linkStyles.confirmActions}>
                  <button
                    type="button"
                    className={linkStyles.confirmDeleteBtn}
                    onClick={confirmDeleteLink}
                    disabled={saving}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    className={linkStyles.confirmCancelBtn}
                    onClick={() => setLinkDeleteIndex(null)}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : null}
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
            disabled={saving || heroUpload.status === 'uploading' || aboutUpload.status === 'uploading'}
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
