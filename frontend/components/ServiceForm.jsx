import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import CategorySelect from './CategorySelect';
import AccountStateSelect from './AccountStateSelect';
import apiClient from '../lib/axios';
import styles from '../pages/dashboard/services/services.module.css';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const SHORT_DESC_MAX = 250;
const LONG_DESC_MAX = 550;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

export function emptyServiceForm() {
  return {
    image: '',
    preview: '',
    imagePosX: 50,
    imagePosY: 50,
    name: '',
    shortDescription: '',
    longDescription: '',
    benefits: [],
    benefitDraft: '',
    testimonialsNumber: '',
    category: '',
    visibilityState: 'Activated',
  };
}

function normalizeBenefitsList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/\r?\n|•/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export function serviceToForm(service) {
  return {
    image: service?.image || '',
    preview: service?.image || '',
    imagePosX: Number.isFinite(Number(service?.imagePosX)) ? Number(service.imagePosX) : 50,
    imagePosY: Number.isFinite(Number(service?.imagePosY)) ? Number(service.imagePosY) : 50,
    name: service?.name || '',
    shortDescription: service?.shortDescription || '',
    longDescription: service?.longDescription || '',
    benefits: normalizeBenefitsList(service?.benefits),
    benefitDraft: '',
    testimonialsNumber:
      service?.testimonialsNumber != null ? String(service.testimonialsNumber) : '',
    category: service?.category || '',
    visibilityState:
      service?.visibilityState === 'Activated' || service?.visibilityState === 'Deactivated'
        ? service.visibilityState
        : 'Activated',
  };
}

export default function ServiceForm({
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

  const [form, setForm] = useState(initialValues || emptyServiceForm());
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [localError, setLocalError] = useState('');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (initialValues) setForm(initialValues);
  }, [initialValues]);

  const uploadImage = async (file) => {
    if (!ALLOWED_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
      setLocalError('❌ Invalid file type. Only JPEG, PNG, GIF, WEBP are allowed.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setLocalError('❌ Sorry, Max image size is 10 MB, Please try another picture');
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    setLocalError('');

    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setUploadProgress(40);
      const { data } = await apiClient.post(
        '/api/upload/service-image',
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
    const nextX = Math.min(100, Math.max(0, drag.posX - dx));
    const nextY = Math.min(100, Math.max(0, drag.posY - dy));
    setForm((s) => ({ ...s, imagePosX: nextX, imagePosY: nextY }));
  };

  const onPreviewPointerUp = () => {
    dragState.current = null;
  };

  const validate = () => {
    const errors = {};
    if (!form.image.trim()) errors.image = true;
    if (!form.name.trim()) errors.name = true;
    if (!form.shortDescription.trim()) errors.shortDescription = true;
    if (!form.longDescription.trim()) errors.longDescription = true;
    const benefits = Array.isArray(form.benefits)
      ? form.benefits.map((b) => String(b || '').trim()).filter(Boolean)
      : [];
    if (!benefits.length) errors.benefits = true;
    const testimonialsNumber = Number(form.testimonialsNumber);
    if (!Number.isFinite(testimonialsNumber) || testimonialsNumber < 1) {
      errors.testimonialsNumber = true;
    }
    if (!form.category.trim()) errors.category = true;
    if (form.visibilityState !== 'Activated' && form.visibilityState !== 'Deactivated') {
      errors.visibilityState = true;
    }
    setFieldErrors(errors);

    if (Object.keys(errors).length) {
      setLocalError(
        errors.benefits && Object.keys(errors).length === 1
          ? '❌ Add at least one benefit'
          : '❌ All fields are required'
      );
      return null;
    }

    const category = form.category
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
      .join(', ');

    return {
      image: form.image.trim(),
      imagePosX: Number(form.imagePosX) || 50,
      imagePosY: Number(form.imagePosY) || 50,
      name: form.name.trim(),
      shortDescription: form.shortDescription.trim(),
      longDescription: form.longDescription.trim(),
      benefits,
      testimonialsNumber: Math.floor(testimonialsNumber),
      category,
      visibilityState: form.visibilityState,
    };
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
  const busy = submitting || uploading || Boolean(successMessage);

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
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
              if (file) uploadImage(file);
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
        <label htmlFor="service-name">
          Service Name <span className={styles.requiredStar}>*</span>
        </label>
        <input
          id="service-name"
          className={styles.input}
          type="text"
          value={form.name}
          onChange={(e) => {
            setForm((s) => ({ ...s, name: e.target.value }));
            setFieldErrors((err) => ({ ...err, name: false }));
          }}
          placeholder="Enter service name"
          disabled={busy}
        />
      </div>

      <div
        className={`${styles.formField} ${fieldErrors.shortDescription ? styles.fieldError : ''}`}
      >
        <label htmlFor="service-short">
          Short Description <span className={styles.requiredStar}>*</span>
        </label>
        <textarea
          id="service-short"
          className={`${styles.textarea} ${styles.textareaShort}`}
          value={form.shortDescription}
          onChange={(e) => {
            setForm((s) => ({ ...s, shortDescription: e.target.value.slice(0, SHORT_DESC_MAX) }));
            setFieldErrors((err) => ({ ...err, shortDescription: false }));
          }}
          placeholder="Brief summary of this service"
          rows={3}
          maxLength={SHORT_DESC_MAX}
          disabled={busy}
        />
        <p className={styles.charCount}>
          {String(form.shortDescription || '').length}/{SHORT_DESC_MAX}
        </p>
      </div>

      <div
        className={`${styles.formField} ${fieldErrors.longDescription ? styles.fieldError : ''}`}
      >
        <label htmlFor="service-long">
          Long Description <span className={styles.requiredStar}>*</span>
        </label>
        <textarea
          id="service-long"
          className={`${styles.textarea} ${styles.textareaLarge}`}
          value={form.longDescription}
          onChange={(e) => {
            setForm((s) => ({ ...s, longDescription: e.target.value.slice(0, LONG_DESC_MAX) }));
            setFieldErrors((err) => ({ ...err, longDescription: false }));
          }}
          placeholder="Full detailed description of this service"
          rows={8}
          maxLength={LONG_DESC_MAX}
          disabled={busy}
        />
        <p className={styles.charCount}>
          {String(form.longDescription || '').length}/{LONG_DESC_MAX}
        </p>
      </div>

      <div className={`${styles.formField} ${fieldErrors.benefits ? styles.fieldError : ''}`}>
        <label htmlFor="service-benefit-draft">
          Benefits <span className={styles.requiredStar}>*</span>
        </label>
        <div className={styles.benefitAddRow}>
          <input
            id="service-benefit-draft"
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
              <span>{form.benefits.length} benefit{form.benefits.length === 1 ? '' : 's'}</span>
            </div>
            <ul className={styles.benefitsList}>
              {form.benefits.map((benefit, index) => (
                <li
                  key={`${benefit}-${index}`}
                  className={styles.benefitCard}
                  style={{ animationDelay: `${Math.min(index, 8) * 0.04}s` }}
                >
                  <span className={styles.benefitCheck} aria-hidden="true">
                    ✓
                  </span>
                  <span className={styles.benefitText}>{benefit}</span>
                  <button
                    type="button"
                    className={styles.benefitRemoveBtn}
                    onClick={() => removeBenefit(index)}
                    disabled={busy}
                    aria-label={`Remove benefit: ${benefit}`}
                    title="Remove"
                  >
                    <Image src="/trash2.svg" alt="" width={15} height={15} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className={styles.benefitsEmptyHint}>Add benefits one by one. At least one is required.</p>
        )}
      </div>

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
          <label htmlFor="service-testimonials-number">
            Reviews Number <span className={styles.requiredStar}>*</span>
          </label>
          <input
            id="service-testimonials-number"
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

      <div className={styles.formActions}>
        <button type="submit" className={styles.saveBtn} disabled={busy}>
          {submitting ? 'Saving…' : mode === 'edit' ? 'Save Changes' : 'Save Service'}
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
