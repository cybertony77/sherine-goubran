import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import CategorySelect from './CategorySelect';
import OptionSelect from './OptionSelect';
import AccountStateSelect from './AccountStateSelect';
import R2VideoPlayer from './R2VideoPlayer';
import apiClient from '../lib/axios';
import { uploadToR2Direct } from '../lib/r2DirectUpload';
import { uploadToCloudinaryDirect } from '../lib/cloudinaryDirectUpload';
import styles from '../styles/events_workshops.module.css';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const TYPE_OPTIONS = ['Event', 'Workshop'];
const STATE_OPTIONS = ['Upcoming', 'Previous'];

function emptyPhotoSlot() {
  return { url: '', preview: '', progress: 0, uploading: false, error: '' };
}

function emptyVideoSlot() {
  return { key: '', fileName: '', progress: 0, uploading: false, error: '' };
}

export function emptyEventForm() {
  return {
    image: '',
    preview: '',
    imagePosX: 50,
    imagePosY: 50,
    name: '',
    shortDescription: '',
    longDescription: '',
    date: '',
    location: '',
    type: '',
    state: '',
    visibilityState: 'Activated',
    benefits: [],
    benefitDraft: '',
    highlights: {
      participants: '',
      hours: '',
      activities: '',
    },
    galleryPhotos: [emptyPhotoSlot()],
    galleryVideos: [emptyVideoSlot()],
    testimonialsNumber: '',
    category: '',
  };
}

export function eventToForm(event) {
  const photos = Array.isArray(event?.galleryPhotos) ? event.galleryPhotos : [];
  const videos = Array.isArray(event?.galleryVideos) ? event.galleryVideos : [];
  return {
    image: event?.image || '',
    preview: event?.image || '',
    imagePosX: Number.isFinite(Number(event?.imagePosX)) ? Number(event.imagePosX) : 50,
    imagePosY: Number.isFinite(Number(event?.imagePosY)) ? Number(event.imagePosY) : 50,
    name: event?.name || '',
    shortDescription: event?.shortDescription || '',
    longDescription: event?.longDescription || '',
    date: event?.date || '',
    location: event?.location || '',
    type: event?.type || '',
    state: event?.state || '',
    visibilityState:
      event?.visibilityState === 'Activated' || event?.visibilityState === 'Deactivated'
        ? event.visibilityState
        : 'Activated',
    benefits: Array.isArray(event?.benefits)
      ? event.benefits.map((b) => String(b || '').trim()).filter(Boolean)
      : [],
    benefitDraft: '',
    highlights: {
      participants: event?.highlights?.participants ?? '',
      hours: event?.highlights?.hours ?? '',
      activities: event?.highlights?.activities ?? '',
    },
    galleryPhotos: photos.length
      ? photos.map((p) => ({
          url: p.url || '',
          preview: p.url || '',
          progress: 0,
          uploading: false,
          error: '',
        }))
      : [emptyPhotoSlot()],
    galleryVideos: videos.length
      ? videos.map((v) => ({
          key: v.key || '',
          fileName: v.fileName || '',
          progress: 0,
          uploading: false,
          error: '',
        }))
      : [emptyVideoSlot()],
    testimonialsNumber:
      event?.testimonialsNumber != null ? String(event.testimonialsNumber) : '',
    category: event?.category || '',
  };
}

export default function EventForm({
  mode = 'add',
  initialValues,
  onSubmit,
  onCancel,
  submitting = false,
  errorMessage = '',
  successMessage = '',
}) {
  const fileRef = useRef(null);
  const dragRef = useRef(null);
  const dragState = useRef(null);
  const photoRefs = useRef({});
  const videoRefs = useRef({});

  const [form, setForm] = useState(initialValues || emptyEventForm());
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [localError, setLocalError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [typeOpen, setTypeOpen] = useState(false);
  const [stateOpen, setStateOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [galleryTab, setGalleryTab] = useState('photos');

  useEffect(() => {
    if (initialValues) setForm(initialValues);
  }, [initialValues]);

  const anyGalleryUploading =
    (form.galleryPhotos || []).some((s) => s.uploading) ||
    (form.galleryVideos || []).some((s) => s.uploading);
  const busy = submitting || uploading || anyGalleryUploading || Boolean(successMessage);

  const uploadHero = async (file) => {
    if (!ALLOWED_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
      setLocalError('❌ Invalid file type. Only JPEG, PNG, GIF, WEBP are allowed.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setLocalError('❌ Sorry, Max image size is 10 MB, Please try another picture');
      return;
    }

    setUploading(true);
    setUploadProgress(5);
    setLocalError('');

    try {
      const result = await uploadToCloudinaryDirect(file, {
        folder: 'events',
        onProgress: (p) => setUploadProgress(Math.max(5, Math.min(99, p))),
      });

      const url = result?.secure_url;
      if (!url) throw new Error('No image URL returned');

      setForm((s) => ({
        ...s,
        image: url,
        preview: url,
        imagePosX: 50,
        imagePosY: 50,
      }));
      setFieldErrors((e) => ({ ...e, image: false }));
      setUploadProgress(100);
    } catch (err) {
      setLocalError(err?.response?.data?.error || err.message || '❌ Failed to upload image');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 400);
    }
  };

  const onPreviewPointerDown = (e) => {
    if (!dragRef.current || uploading) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: Number(form.imagePosX) || 50,
      posY: Number(form.imagePosY) || 50,
    };
  };

  const onPreviewPointerMove = (e) => {
    const drag = dragState.current;
    if (!drag || !dragRef.current) return;
    const rect = dragRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dx = ((e.clientX - drag.startX) / rect.width) * 100;
    const dy = ((e.clientY - drag.startY) / rect.height) * 100;
    setForm((s) => ({
      ...s,
      imagePosX: Math.min(100, Math.max(0, drag.posX - dx)),
      imagePosY: Math.min(100, Math.max(0, drag.posY - dy)),
    }));
  };

  const onPreviewPointerUp = () => {
    dragState.current = null;
  };

  const addBenefit = () => {
    const text = String(form.benefitDraft || '').trim();
    if (!text) {
      setLocalError('❌ Enter a benefit before adding');
      return;
    }
    const exists = (form.benefits || []).some(
      (b) => String(b).trim().toLowerCase() === text.toLowerCase()
    );
    if (exists) {
      setLocalError('❌ This benefit is already added');
      return;
    }
    setForm((s) => ({
      ...s,
      benefits: [...(Array.isArray(s.benefits) ? s.benefits : []), text],
      benefitDraft: '',
    }));
    setFieldErrors((err) => ({ ...err, benefits: false }));
    setLocalError('');
  };

  const removeBenefit = (index) => {
    setForm((s) => ({
      ...s,
      benefits: (Array.isArray(s.benefits) ? s.benefits : []).filter((_, i) => i !== index),
    }));
  };

  const uploadPhoto = async (file, index) => {
    if (!ALLOWED_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
      setForm((s) => ({
        ...s,
        galleryPhotos: s.galleryPhotos.map((slot, i) =>
          i === index ? { ...slot, error: 'Invalid image type' } : slot
        ),
      }));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setForm((s) => ({
        ...s,
        galleryPhotos: s.galleryPhotos.map((slot, i) =>
          i === index ? { ...slot, error: 'Max photo size is 10 MB' } : slot
        ),
      }));
      return;
    }

    setForm((s) => ({
      ...s,
      galleryPhotos: s.galleryPhotos.map((slot, i) =>
        i === index ? { ...slot, uploading: true, progress: 5, error: '' } : slot
      ),
    }));

    try {
      const result = await uploadToCloudinaryDirect(file, {
        folder: 'events-gallery',
        onProgress: (p) => {
          setForm((s) => ({
            ...s,
            galleryPhotos: s.galleryPhotos.map((slot, i) =>
              i === index ? { ...slot, progress: Math.max(5, Math.min(99, p)) } : slot
            ),
          }));
        },
      });

      const url = result?.secure_url;
      if (!url) throw new Error('No image URL returned');

      setForm((s) => ({
        ...s,
        galleryPhotos: s.galleryPhotos.map((slot, i) =>
          i === index
            ? { url, preview: url, progress: 100, uploading: false, error: '' }
            : slot
        ),
      }));
    } catch (err) {
      setForm((s) => ({
        ...s,
        galleryPhotos: s.galleryPhotos.map((slot, i) =>
          i === index
            ? {
                ...slot,
                uploading: false,
                progress: 0,
                error: err?.response?.data?.error || err.message || 'Upload failed',
              }
            : slot
        ),
      }));
    }
  };

  const uploadVideo = async (file, index) => {
    if (!file.type.startsWith('video/') && !/\.(mp4|webm|mov|m4v)$/i.test(file.name)) {
      setForm((s) => ({
        ...s,
        galleryVideos: s.galleryVideos.map((slot, i) =>
          i === index ? { ...slot, error: 'Invalid video type' } : slot
        ),
      }));
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setForm((s) => ({
        ...s,
        galleryVideos: s.galleryVideos.map((slot, i) =>
          i === index ? { ...slot, error: 'Max video size is 100 MB' } : slot
        ),
      }));
      return;
    }

    setForm((s) => ({
      ...s,
      galleryVideos: s.galleryVideos.map((slot, i) =>
        i === index ? { ...slot, uploading: true, progress: 5, error: '' } : slot
      ),
    }));

    try {
      const result = await uploadToR2Direct(file, {
        prefix: 'videos',
        onProgress: (percent) => {
          setForm((s) => ({
            ...s,
            galleryVideos: s.galleryVideos.map((slot, i) =>
              i === index ? { ...slot, progress: percent } : slot
            ),
          }));
        },
      });

      setForm((s) => ({
        ...s,
        galleryVideos: s.galleryVideos.map((slot, i) =>
          i === index
            ? {
                key: result.key,
                fileName: file.name,
                progress: 100,
                uploading: false,
                error: '',
              }
            : slot
        ),
      }));
    } catch (err) {
      setForm((s) => ({
        ...s,
        galleryVideos: s.galleryVideos.map((slot, i) =>
          i === index
            ? {
                ...slot,
                uploading: false,
                progress: 0,
                error: err?.message || 'Upload failed',
              }
            : slot
        ),
      }));
    }
  };

  const validate = () => {
    const errors = {};
    if (!form.image.trim()) errors.image = true;
    if (!form.name.trim()) errors.name = true;
    if (!form.shortDescription.trim()) errors.shortDescription = true;
    if (!form.longDescription.trim()) errors.longDescription = true;
    if (!form.date.trim()) errors.date = true;
    if (!form.location.trim()) errors.location = true;
    if (form.visibilityState !== 'Activated' && form.visibilityState !== 'Deactivated') {
      errors.visibilityState = true;
    }
    if (form.type !== 'Event' && form.type !== 'Workshop') errors.type = true;
    if (form.state !== 'Upcoming' && form.state !== 'Previous') errors.state = true;

    const benefits = Array.isArray(form.benefits)
      ? form.benefits.map((b) => String(b || '').trim()).filter(Boolean)
      : [];

    if (form.state === 'Upcoming') {
      if (!benefits.length) errors.benefits = true;
    }

    if (form.state === 'Previous') {
      const h = form.highlights || {};
      if (h.participants === '' || !Number.isFinite(Number(h.participants))) {
        errors.participants = true;
      }
      if (h.hours === '' || !Number.isFinite(Number(h.hours))) errors.hours = true;
      if (h.activities === '' || !Number.isFinite(Number(h.activities))) {
        errors.activities = true;
      }
      const testimonialsNumber = Number(form.testimonialsNumber);
      if (!Number.isFinite(testimonialsNumber) || testimonialsNumber < 1) {
        errors.testimonialsNumber = true;
      }
      if (!String(form.category || '').trim()) errors.category = true;
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setLocalError('❌ Please fill all required fields');
      return null;
    }

    const payload = {
      image: form.image.trim(),
      imagePosX: Number(form.imagePosX) || 50,
      imagePosY: Number(form.imagePosY) || 50,
      name: form.name.trim(),
      shortDescription: form.shortDescription.trim(),
      longDescription: form.longDescription.trim(),
      date: form.date.trim(),
      location: form.location.trim(),
      type: form.type,
      state: form.state,
      visibilityState: form.visibilityState,
    };

    if (form.state === 'Upcoming') {
      payload.benefits = benefits;
      return payload;
    }

    payload.highlights = {
      participants: Number(form.highlights.participants),
      hours: Number(form.highlights.hours),
      activities: Number(form.highlights.activities),
    };
    payload.galleryPhotos = (form.galleryPhotos || [])
      .filter((s) => s.url)
      .map((s) => ({ url: s.url }));
    payload.galleryVideos = (form.galleryVideos || [])
      .filter((s) => s.key)
      .map((s) => ({ key: s.key, fileName: s.fileName || '' }));
    payload.testimonialsNumber = Math.floor(Number(form.testimonialsNumber));
    payload.category = form.category
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
      .join(', ');
    return payload;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError('');
    const payload = validate();
    if (!payload) return;
    onSubmit?.(payload);
  };

  const hasImage = Boolean(form.preview || form.image);
  const posX = Number.isFinite(Number(form.imagePosX)) ? Number(form.imagePosX) : 50;
  const posY = Number.isFinite(Number(form.imagePosY)) ? Number(form.imagePosY) : 50;
  const displayError = localError || errorMessage;

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {/* Hero */}
      <div className={`${styles.formField} ${fieldErrors.image ? styles.fieldError : ''}`}>
        <label>
          Hero Image <span className={styles.requiredStar}>*</span>
        </label>
        <div className={styles.imageBox}>
          {hasImage ? (
            <div
              ref={dragRef}
              className={styles.imagePreviewWrap}
              onPointerDown={onPreviewPointerDown}
              onPointerMove={onPreviewPointerMove}
              onPointerUp={onPreviewPointerUp}
              onPointerCancel={onPreviewPointerUp}
              title="Drag to reposition the visible area"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.preview || form.image}
                alt="Hero preview"
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
              onClick={() => fileRef.current?.click()}
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
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) uploadHero(file);
            }}
          />
          {hasImage && !uploading ? (
            <div className={styles.imageActions}>
              <button
                type="button"
                className={styles.changeImageBtn}
                onClick={() => fileRef.current?.click()}
              >
                <Image src="/camera.svg" alt="" width={16} height={16} />
                Change image
              </button>
              <button
                type="button"
                className={styles.removeImageBtn}
                onClick={() =>
                  setForm((s) => ({
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

      <div className={`${styles.formField} ${fieldErrors.name ? styles.fieldError : ''}`}>
        <label htmlFor="event-title">
          Title <span className={styles.requiredStar}>*</span>
        </label>
        <input
          id="event-title"
          className={styles.input}
          type="text"
          value={form.name}
          onChange={(e) => {
            setForm((s) => ({ ...s, name: e.target.value }));
            setFieldErrors((err) => ({ ...err, name: false }));
          }}
          placeholder="Enter title"
          disabled={busy}
        />
      </div>

      <div
        className={`${styles.formField} ${fieldErrors.shortDescription ? styles.fieldError : ''}`}
      >
        <label htmlFor="event-short">
          Short Description <span className={styles.requiredStar}>*</span>
        </label>
        <textarea
          id="event-short"
          className={`${styles.textarea} ${styles.textareaShort}`}
          value={form.shortDescription}
          onChange={(e) => {
            setForm((s) => ({ ...s, shortDescription: e.target.value }));
            setFieldErrors((err) => ({ ...err, shortDescription: false }));
          }}
          placeholder="Brief summary"
          rows={3}
          disabled={busy}
        />
      </div>

      <div
        className={`${styles.formField} ${fieldErrors.longDescription ? styles.fieldError : ''}`}
      >
        <label htmlFor="event-long">
          Long Description <span className={styles.requiredStar}>*</span>
        </label>
        <textarea
          id="event-long"
          className={`${styles.textarea} ${styles.textareaLarge}`}
          value={form.longDescription}
          onChange={(e) => {
            setForm((s) => ({ ...s, longDescription: e.target.value }));
            setFieldErrors((err) => ({ ...err, longDescription: false }));
          }}
          placeholder="Full details"
          rows={8}
          disabled={busy}
        />
      </div>

      <div className={`${styles.formField} ${fieldErrors.date ? styles.fieldError : ''}`}>
        <label htmlFor="event-date">
          Date <span className={styles.requiredStar}>*</span>
        </label>
        <input
          id="event-date"
          className={styles.input}
          type="date"
          value={form.date}
          onChange={(e) => {
            setForm((s) => ({ ...s, date: e.target.value }));
            setFieldErrors((err) => ({ ...err, date: false }));
          }}
          disabled={busy}
        />
      </div>

      <div className={`${styles.formField} ${fieldErrors.location ? styles.fieldError : ''}`}>
        <label htmlFor="event-location">
          Location <span className={styles.requiredStar}>*</span>
        </label>
        <input
          id="event-location"
          className={styles.input}
          type="text"
          value={form.location}
          onChange={(e) => {
            setForm((s) => ({ ...s, location: e.target.value }));
            setFieldErrors((err) => ({ ...err, location: false }));
          }}
          placeholder="ex. Egypt, Cairo"
          disabled={busy}
        />
      </div>

      <div
        className={`${styles.formField} ${fieldErrors.visibilityState ? styles.fieldError : ''}`}
      >
        <AccountStateSelect
          value={form.visibilityState}
          onChange={(visibilityState) => {
            setForm((s) => ({ ...s, visibilityState }));
            setFieldErrors((err) => ({ ...err, visibilityState: false }));
          }}
          label="Visibility State"
          placeholder="Select Visibility State"
          required
          style={{ marginBottom: 0 }}
        />
      </div>

      <div className={`${styles.formField} ${fieldErrors.type ? styles.fieldError : ''}`}>
        <OptionSelect
          label="Type"
          value={form.type}
          onChange={(type) => {
            setForm((s) => ({ ...s, type }));
            setFieldErrors((err) => ({ ...err, type: false }));
          }}
          options={TYPE_OPTIONS}
          placeholder="Select Type"
          isOpen={typeOpen}
          onToggle={() => {
            setTypeOpen((o) => !o);
            setStateOpen(false);
          }}
          onClose={() => setTypeOpen(false)}
          required
        />
      </div>

      <div className={`${styles.formField} ${fieldErrors.state ? styles.fieldError : ''}`}>
        <OptionSelect
          label="State"
          value={form.state}
          onChange={(state) => {
            setForm((s) => ({ ...s, state }));
            setFieldErrors((err) => ({ ...err, state: false }));
          }}
          options={STATE_OPTIONS}
          placeholder="Select State"
          isOpen={stateOpen}
          onToggle={() => {
            setStateOpen((o) => !o);
            setTypeOpen(false);
          }}
          onClose={() => setStateOpen(false)}
          required
        />
      </div>

      {form.state === 'Upcoming' ? (
        <div className={`${styles.formField} ${fieldErrors.benefits ? styles.fieldError : ''}`}>
          <label htmlFor="event-benefit-draft">
            Benefits <span className={styles.requiredStar}>*</span>
          </label>
          <div className={styles.benefitAddRow}>
            <input
              id="event-benefit-draft"
              className={styles.input}
              type="text"
              value={form.benefitDraft || ''}
              onChange={(e) => setForm((s) => ({ ...s, benefitDraft: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (!busy && String(form.benefitDraft || '').trim()) addBenefit();
                }
              }}
              placeholder="e.g. Gain clarity and direction"
              disabled={busy}
            />
            <button
              type="button"
              className={styles.benefitAddBtn}
              onClick={addBenefit}
              disabled={busy || !String(form.benefitDraft || '').trim()}
            >
              <Image src="/plus.svg" alt="" width={16} height={16} />
              Add
            </button>
          </div>
          {Array.isArray(form.benefits) && form.benefits.length > 0 ? (
            <div className={styles.benefitsPanel}>
              <div className={styles.benefitsPanelHead}>
                <span>
                  {form.benefits.length} benefit{form.benefits.length === 1 ? '' : 's'}
                </span>
              </div>
              <ul className={styles.benefitsList}>
                {form.benefits.map((benefit, index) => (
                  <li key={`${benefit}-${index}`} className={styles.benefitCard}>
                    <span className={styles.benefitCheck} aria-hidden="true">
                      ✓
                    </span>
                    <span className={styles.benefitText}>{benefit}</span>
                    <button
                      type="button"
                      className={styles.benefitRemoveBtn}
                      onClick={() => removeBenefit(index)}
                      disabled={busy}
                      title="Remove"
                    >
                      <Image src="/trash2.svg" alt="" width={15} height={15} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className={styles.benefitsEmptyHint}>
              Add benefits one by one. At least one is required.
            </p>
          )}
        </div>
      ) : null}

      {form.state === 'Previous' ? (
        <>
          <section className={styles.conditionalSection}>
            <div className={styles.sectionHeader}>
              <h3>Highlights</h3>
              <p>Key stats from this past event or workshop</p>
            </div>
            <div className={styles.statsGrid}>
              {[
                ['participants', 'Participants'],
                ['hours', 'Hours'],
                ['activities', 'Activities'],
              ].map(([key, label]) => (
                <div
                  key={key}
                  className={`${styles.statCard} ${fieldErrors[key] ? styles.fieldError : ''}`}
                >
                  <label htmlFor={`event-${key}`}>
                    {label} <span className={styles.requiredStar}>*</span>
                  </label>
                  <input
                    id={`event-${key}`}
                    className={styles.statInput}
                    type="number"
                    min={0}
                    step={1}
                    value={form.highlights?.[key] ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setForm((s) => ({
                        ...s,
                        highlights: { ...s.highlights, [key]: value },
                      }));
                      setFieldErrors((err) => ({ ...err, [key]: false }));
                    }}
                    disabled={busy}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className={styles.conditionalSection}>
            <div className={styles.sectionHeader}>
              <h3>Gallery</h3>
              <p>Upload photos (max 10 MB) and videos (max 100 MB)</p>
            </div>
            <div className={styles.galleryTabs}>
              <button
                type="button"
                className={`${styles.galleryTab} ${
                  galleryTab === 'photos' ? styles.galleryTabActive : ''
                }`}
                onClick={() => setGalleryTab('photos')}
              >
                Photos
              </button>
              <button
                type="button"
                className={`${styles.galleryTab} ${
                  galleryTab === 'videos' ? styles.galleryTabActive : ''
                }`}
                onClick={() => setGalleryTab('videos')}
              >
                Videos
              </button>
            </div>

            {galleryTab === 'photos' ? (
              <div className={styles.galleryList}>
                {(form.galleryPhotos || []).map((slot, index) => (
                  <div key={`photo-${index}`} className={styles.gallerySlot}>
                    <div className={styles.gallerySlotHead}>
                      <span>Photo {index + 1}</span>
                    </div>
                    {slot.url || slot.preview ? (
                      <div className={styles.galleryPreview}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={slot.preview || slot.url} alt="" />
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={styles.galleryDropzone}
                        onClick={() => photoRefs.current[index]?.click()}
                        disabled={busy || slot.uploading}
                      >
                        {slot.uploading ? (
                          <div className={styles.galleryUploading}>
                            <div className={styles.uploadProgressTrack}>
                              <div
                                className={styles.uploadProgressBar}
                                style={{ width: `${slot.progress || 0}%` }}
                              />
                            </div>
                            <span>Uploading… {slot.progress || 0}%</span>
                          </div>
                        ) : (
                          <>
                            <Image src="/camera.svg" alt="" width={22} height={22} />
                            <span>Upload photo · max 10 MB</span>
                          </>
                        )}
                      </button>
                    )}
                    {slot.uploading && (slot.url || slot.preview) ? (
                      <div className={styles.galleryInlineProgress}>
                        <div className={styles.uploadProgressTrack}>
                          <div
                            className={styles.uploadProgressBar}
                            style={{ width: `${slot.progress || 0}%` }}
                          />
                        </div>
                        <span>Uploading… {slot.progress || 0}%</span>
                      </div>
                    ) : null}
                    <input
                      ref={(el) => {
                        photoRefs.current[index] = el;
                      }}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file) uploadPhoto(file, index);
                      }}
                    />
                    <div className={styles.gallerySlotActions}>
                      {index === (form.galleryPhotos || []).length - 1 ? (
                        <button
                          type="button"
                          className={styles.galleryAddBtn}
                          onClick={() =>
                            setForm((s) => ({
                              ...s,
                              galleryPhotos: [...s.galleryPhotos, emptyPhotoSlot()],
                            }))
                          }
                          disabled={busy}
                        >
                          <Image src="/plus.svg" alt="" width={14} height={14} />
                          Add
                        </button>
                      ) : null}
                      {slot.url || slot.preview ? (
                        <button
                          type="button"
                          className={styles.changeImageBtn}
                          onClick={() => photoRefs.current[index]?.click()}
                          disabled={busy}
                        >
                          Change
                        </button>
                      ) : null}
                      {(form.galleryPhotos || []).length > 1 ? (
                        <button
                          type="button"
                          className={styles.galleryRemoveBtn}
                          onClick={() =>
                            setForm((s) => ({
                              ...s,
                              galleryPhotos: s.galleryPhotos.filter((_, i) => i !== index),
                            }))
                          }
                          disabled={busy}
                        >
                          <Image src="/trash2.svg" alt="" width={14} height={14} />
                          Remove
                        </button>
                      ) : null}
                    </div>
                    {slot.error ? <p className={styles.slotError}>{slot.error}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.galleryList}>
                {(form.galleryVideos || []).map((slot, index) => (
                  <div key={`video-${index}`} className={styles.gallerySlot}>
                    <div className={styles.gallerySlotHead}>
                      <span>Video {index + 1}</span>
                    </div>
                    {slot.key ? (
                      <div className={styles.videoReady}>
                        <div className={styles.videoPlayerWrap}>
                          <R2VideoPlayer r2Key={slot.key} hideWatermark />
                        </div>
                        <span className={styles.videoName}>{slot.fileName || slot.key}</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={styles.galleryDropzone}
                        onClick={() => videoRefs.current[index]?.click()}
                        disabled={busy || slot.uploading}
                      >
                        {slot.uploading ? (
                          <div className={styles.galleryUploading}>
                            <div className={styles.uploadProgressTrack}>
                              <div
                                className={styles.uploadProgressBar}
                                style={{ width: `${slot.progress || 0}%` }}
                              />
                            </div>
                            <span>Uploading… {slot.progress || 0}%</span>
                          </div>
                        ) : (
                          <>
                            <Image src="/video.svg" alt="" width={22} height={22} />
                            <span>Upload video · max 100 MB</span>
                          </>
                        )}
                      </button>
                    )}
                    {slot.uploading && slot.key ? (
                      <div className={styles.galleryInlineProgress}>
                        <div className={styles.uploadProgressTrack}>
                          <div
                            className={styles.uploadProgressBar}
                            style={{ width: `${slot.progress || 0}%` }}
                          />
                        </div>
                        <span>Uploading… {slot.progress || 0}%</span>
                      </div>
                    ) : null}
                    <input
                      ref={(el) => {
                        videoRefs.current[index] = el;
                      }}
                      type="file"
                      accept="video/*"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file) uploadVideo(file, index);
                      }}
                    />
                    <div className={styles.gallerySlotActions}>
                      {index === (form.galleryVideos || []).length - 1 ? (
                        <button
                          type="button"
                          className={styles.galleryAddBtn}
                          onClick={() =>
                            setForm((s) => ({
                              ...s,
                              galleryVideos: [...s.galleryVideos, emptyVideoSlot()],
                            }))
                          }
                          disabled={busy}
                        >
                          <Image src="/plus.svg" alt="" width={14} height={14} />
                          Add
                        </button>
                      ) : null}
                      {slot.key ? (
                        <button
                          type="button"
                          className={styles.changeImageBtn}
                          onClick={() => videoRefs.current[index]?.click()}
                          disabled={busy}
                        >
                          Change
                        </button>
                      ) : null}
                      {(form.galleryVideos || []).length > 1 ? (
                        <button
                          type="button"
                          className={styles.galleryRemoveBtn}
                          onClick={() =>
                            setForm((s) => ({
                              ...s,
                              galleryVideos: s.galleryVideos.filter((_, i) => i !== index),
                            }))
                          }
                          disabled={busy}
                        >
                          <Image src="/trash2.svg" alt="" width={14} height={14} />
                          Remove
                        </button>
                      ) : null}
                    </div>
                    {slot.error ? <p className={styles.slotError}>{slot.error}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={styles.testimonialsSection}>
            <div className={styles.sectionHeader}>
              <h3>Reviews</h3>
              <p>Choose how many reviews to show and which categories to pull from</p>
            </div>
            <div
              className={`${styles.formField} ${
                fieldErrors.testimonialsNumber ? styles.fieldError : ''
              }`}
            >
              <label htmlFor="event-testimonials-number">
                Reviews Number <span className={styles.requiredStar}>*</span>
              </label>
              <input
                id="event-testimonials-number"
                className={styles.input}
                type="number"
                min={1}
                step={1}
                value={form.testimonialsNumber}
                onChange={(e) => {
                  setForm((s) => ({ ...s, testimonialsNumber: e.target.value }));
                  setFieldErrors((err) => ({ ...err, testimonialsNumber: false }));
                }}
                placeholder="e.g. 6"
                disabled={busy}
              />
            </div>
            <div className={`${styles.formField} ${fieldErrors.category ? styles.fieldError : ''}`}>
              <label>
                Category <span className={styles.requiredStar}>*</span>
              </label>
              <CategorySelect
                selectedCategory={form.category}
                onCategoryChange={(category) => {
                  setForm((s) => ({ ...s, category }));
                  setFieldErrors((err) => ({ ...err, category: false }));
                }}
                isOpen={categoryOpen}
                onToggle={() => setCategoryOpen((o) => !o)}
                onClose={() => setCategoryOpen(false)}
                multiple
                required
              />
            </div>
          </section>
        </>
      ) : null}

      <div className={styles.formActions}>
        <button type="submit" className={styles.saveBtn} disabled={busy}>
          {submitting ? 'Saving…' : mode === 'edit' ? 'Save Changes' : 'Save'}
        </button>
        <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>

      {displayError ? (
        <div className={styles.errorPopup} role="alert">
          {displayError}
        </div>
      ) : successMessage ? (
        <div className={styles.successPopup} role="status">
          {successMessage}
        </div>
      ) : null}
    </form>
  );
}
