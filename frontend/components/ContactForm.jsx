import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import apiClient from '../lib/axios';
import { usePublicServices } from '../lib/api/publicServices';
import { slugifyServiceName } from '../lib/serviceSlug';
import { formatPhoneForDB, handleEgyptPhoneKeyDown, isPhoneFilled, validateEgyptPhone } from '../lib/phoneUtils';
import styles from '../styles/ContactForm.module.css';

const MESSAGE_MAX = 300;
const ALL_FIELDS_ERROR = 'Please fill in all required fields';
const GENERAL_SERVICE = { slug: 'general-inquiry', name: 'General inquiry' };

function matchServiceQuery(options, query) {
  const want = String(query || '').trim();
  if (!want || !Array.isArray(options) || !options.length) return null;
  const lower = want.toLowerCase();
  return (
    options.find((item) => item.slug === want) ||
    options.find((item) => String(item.slug || '').toLowerCase() === lower) ||
    options.find((item) => slugifyServiceName(item.name) === lower) ||
    null
  );
}

function emptyForm() {
  return { name: '', phone: '', serviceSlug: '', message: '', website: '' };
}

function emptyFieldErrors() {
  return { name: '', phone: '', service: '', message: '' };
}

function cleanError(message) {
  return String(message || '').replace(/^❌\s*/, '').trim();
}

function validateForm(form) {
  const next = emptyFieldErrors();
  if (!String(form.name || '').trim()) next.name = 'Name is required';
  if (!isPhoneFilled(form.phone)) next.phone = 'Phone number is required';
  if (!String(form.serviceSlug || '').trim()) next.service = 'Service is required';
  const message = String(form.message || '').trim();
  if (!message) next.message = 'Message is required';
  else if (form.message.length > MESSAGE_MAX) {
    next.message = `Message must be ${MESSAGE_MAX} characters or less`;
  }
  return next;
}

function firstInvalidField(errors) {
  return ['name', 'phone', 'service', 'message'].find((key) => errors[key]);
}

function allRequiredMissing(form) {
  return (
    !String(form.name || '').trim() &&
    !isPhoneFilled(form.phone) &&
    !String(form.serviceSlug || '').trim() &&
    !String(form.message || '').trim()
  );
}

function ContactSuccess({ firstName, whatsAppHref }) {
  const who = firstName;
  return (
    <div className={styles.successState} role="status">
      <div className={styles.thanksCheck}>
        <Image src="/success-mark3.svg" alt="" width={40} height={40} />
      </div>
      <h3 className={styles.thanksTitle}>Message Sent!</h3>
      <p className={styles.thanksCopy}>
        Thank you for reaching out.
        <br />
        {who
          ? `${who} will contact you as soon as possible.`
          : 'You will be contacted as soon as possible.'}
      </p>
      <div className={styles.successActions}>
        <Link href="/services" className={styles.successCta}>
          <Image src="/services.svg" alt="" width={18} height={18} />
          Explore more services
        </Link>
        {whatsAppHref ? (
          <a
            className={styles.successWa}
            href={whatsAppHref}
            target="_blank"
            rel="noreferrer"
            aria-label={who ? `Chat with ${who} on WhatsApp` : 'Chat on WhatsApp'}
          >
            <Image src="/whatsapp2.svg" alt="" width={18} height={18} />
            Chat on WhatsApp
          </a>
        ) : null}
      </div>
    </div>
  );
}

function ServiceSelect({
  id,
  value,
  options,
  onChange,
  disabled,
  loading,
  error,
  describedBy,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const selected = options.find((item) => item.slug === value) || null;

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const label = loading
    ? 'Loading services...'
    : selected?.name || 'Select a service';

  return (
    <div className={`${styles.selectWrap} ${open ? styles.selectWrapOpen : ''}`} ref={wrapRef}>
      <button
        id={id}
        type="button"
        className={`${styles.selectTrigger} ${error ? styles.inputError : ''} ${
          selected ? styles.selectHasValue : styles.selectPlaceholder
        } ${open ? styles.selectOpen : ''}`}
        onClick={() => {
          if (!disabled) setOpen((s) => !s);
        }}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
      >
        <span>{label}</span>
        <span className={styles.selectChevron} aria-hidden="true" />
      </button>
      {open ? (
        <div className={styles.selectMenu} role="listbox" aria-labelledby={id}>
          <button
            type="button"
            className={styles.selectClear}
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
          >
            ✕ Clear selection
          </button>
          {options.length === 0 ? (
            <div className={styles.selectEmpty}>
              {loading ? 'Loading services...' : 'No services available'}
            </div>
          ) : (
            options.map((item) => {
              const isSelected = item.slug === value;
              return (
                <button
                  key={item.slug}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`${styles.selectOption} ${isSelected ? styles.selectOptionActive : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(item.slug);
                    setOpen(false);
                  }}
                >
                  {item.name}
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function ContactForm({
  variant = 'full',
  firstName = '',
  whatsAppHref = '',
  onSubmittedChange,
}) {
  const router = useRouter();
  const { data: services = [], isLoading: servicesLoading } = usePublicServices();
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState(emptyFieldErrors);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const appliedQueryRef = useRef(false);

  const serviceOptions = useMemo(() => {
    const rows = (Array.isArray(services) ? services : [])
      .map((item) => ({
        slug: String(item?.slug || '').trim(),
        name: String(item?.name || '').trim(),
      }))
      .filter((item) => item.slug && item.name);
    if (rows.length) return rows;
    if (servicesLoading) return [];
    return [GENERAL_SERVICE];
  }, [services, servicesLoading]);

  const selectedService = serviceOptions.find((item) => item.slug === form.serviceSlug) || null;

  useEffect(() => {
    if (appliedQueryRef.current || servicesLoading || !router.isReady) return;
    const raw = router.query?.service;
    const query = Array.isArray(raw) ? raw[0] : raw;
    const match = matchServiceQuery(serviceOptions, query);
    if (match) {
      setForm((s) => (s.serviceSlug ? s : { ...s, serviceSlug: match.slug }));
    }
    appliedQueryRef.current = true;
  }, [router.isReady, router.query?.service, serviceOptions, servicesLoading]);

  useEffect(() => {
    if (servicesLoading) return;
    if (!form.serviceSlug) return;
    if (serviceOptions.some((item) => item.slug === form.serviceSlug)) return;
    setForm((s) => ({ ...s, serviceSlug: '' }));
  }, [form.serviceSlug, serviceOptions, servicesLoading]);

  useEffect(() => {
    onSubmittedChange?.(submitted);
  }, [submitted, onSubmittedChange]);

  useEffect(() => {
    if (!formError || formError === ALL_FIELDS_ERROR) return undefined;
    const t = setTimeout(() => setFormError(''), 5000);
    return () => clearTimeout(t);
  }, [formError]);

  const setField = (key, value) => {
    const nextForm = { ...form, [key]: value };
    setForm(nextForm);
    const errorKey = key === 'serviceSlug' ? 'service' : key;
    if (fieldErrors[errorKey] && !validateForm(nextForm)[errorKey]) {
      setFieldErrors((s) => ({ ...s, [errorKey]: '' }));
    }
    if (formError === ALL_FIELDS_ERROR && !allRequiredMissing(nextForm)) {
      setFormError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || submitted) return;

    const nextErrors = validateForm(form);
    setFieldErrors(nextErrors);

    if (allRequiredMissing(form)) {
      setFormError(ALL_FIELDS_ERROR);
      const el = document.getElementById('contact-name');
      if (el?.focus) el.focus();
      return;
    }

    setFormError('');

    const invalid = firstInvalidField(nextErrors);
    if (invalid) {
      const el = document.getElementById(`contact-${invalid}`);
      if (el?.focus) el.focus();
      return;
    }

    const name = form.name.trim();
    const message = form.message.trim();
    const serviceName = selectedService?.name || '';
    const serviceSlug = selectedService?.slug || form.serviceSlug;

    setSubmitting(true);
    try {
      await apiClient.post('/api/contact', {
        name,
        phone: formatPhoneForDB(form.phone),
        message,
        website: form.website,
        serviceSlug,
        serviceName,
        subject: serviceName,
      });
      setSubmitted(true);
      setFieldErrors(emptyFieldErrors());
    } catch (err) {
      setFormError(cleanError(err?.response?.data?.error) || 'Failed to send message');
    } finally {
      setSubmitting(false);
    }
  };

  const who = firstName;
  const count = form.message.length;

  if (submitted) {
    return (
      <div className={`${styles.form} ${variant === 'full' ? styles.formFull : ''} ${styles.formFill}`}>
        <ContactSuccess firstName={firstName} whatsAppHref={whatsAppHref} />
      </div>
    );
  }

  return (
    <form className={`${styles.form} ${variant === 'full' ? styles.formFull : ''} ${styles.formFill}`} onSubmit={handleSubmit} noValidate>
      <h2 className={styles.formTitle}>Send a Message</h2>
      <p className={styles.formLead}>
        {who
          ? `Have a question or prefer to send a message? Fill out the form and ${who} will get back to you as soon as possible.`
          : 'Have a question or prefer to send a message? Fill out the form and you will be contacted as soon as possible.'}
      </p>

      <label className={styles.honeypot} htmlFor="contact-website" aria-hidden="true">
        Website
        <input
          id="contact-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(e) => setField('website', e.target.value)}
        />
      </label>

      <div className={styles.field}>
        <label htmlFor="contact-name">
          Name <span className={styles.required}>*</span>
        </label>
        <input
          id="contact-name"
          type="text"
          className={fieldErrors.name ? styles.inputError : ''}
          value={form.name}
          onChange={(e) => setField('name', e.target.value.slice(0, 80))}
          placeholder="Your name"
          autoComplete="name"
          disabled={submitting}
          aria-invalid={Boolean(fieldErrors.name)}
          aria-describedby={fieldErrors.name ? 'contact-name-error' : undefined}
        />
        {fieldErrors.name ? (
          <p id="contact-name-error" className={styles.fieldErrorText} role="alert">
            {fieldErrors.name}
          </p>
        ) : null}
      </div>

      <div className={`${styles.field} ${styles.phoneWrap}`}>
        <label htmlFor="contact-phone">
          Phone Number <span className={styles.required}>*</span>
        </label>
        <PhoneInput
          country="eg"
          enableSearch
          value={form.phone}
          disabled={submitting}
          onChange={(value) => {
            const validationPhone = validateEgyptPhone(value);
            setField('phone', validationPhone.value);
          }}
          onKeyDown={(e) => handleEgyptPhoneKeyDown(e, form.phone)}
          containerClass={`phone-container${fieldErrors.phone ? ' phone-error' : ''}`}
          inputClass="phone-input"
          buttonClass="phone-flag-btn"
          dropdownClass="phone-dropdown"
          inputProps={{
            id: 'contact-phone',
            name: 'phone',
            autoComplete: 'tel',
            'aria-invalid': Boolean(fieldErrors.phone),
            'aria-describedby': fieldErrors.phone ? 'contact-phone-error' : undefined,
          }}
          placeholder="Enter phone number"
        />
        {fieldErrors.phone ? (
          <p id="contact-phone-error" className={styles.fieldErrorText} role="alert">
            {fieldErrors.phone}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor="contact-service">
          Service <span className={styles.required}>*</span>
        </label>
        <ServiceSelect
          id="contact-service"
          value={form.serviceSlug}
          options={serviceOptions}
          onChange={(slug) => setField('serviceSlug', slug)}
          disabled={submitting || servicesLoading}
          loading={servicesLoading}
          error={Boolean(fieldErrors.service)}
          describedBy={fieldErrors.service ? 'contact-service-error' : undefined}
        />
        {fieldErrors.service ? (
          <p id="contact-service-error" className={styles.fieldErrorText} role="alert">
            {fieldErrors.service}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor="contact-message">
          Message <span className={styles.required}>*</span>
        </label>
        <textarea
          id="contact-message"
          className={fieldErrors.message ? styles.inputError : ''}
          value={form.message}
          onChange={(e) => setField('message', e.target.value.slice(0, MESSAGE_MAX))}
          placeholder="How can we help?"
          rows={variant === 'full' ? 6 : 4}
          maxLength={MESSAGE_MAX}
          disabled={submitting}
          aria-invalid={Boolean(fieldErrors.message)}
          aria-describedby={fieldErrors.message ? 'contact-message-error' : undefined}
        />
        <div className={styles.counterRow}>
          <span className={count >= MESSAGE_MAX ? styles.counterMax : styles.counter}>
            {count} / {MESSAGE_MAX}
          </span>
        </div>
        {fieldErrors.message ? (
          <p id="contact-message-error" className={styles.fieldErrorText} role="alert">
            {fieldErrors.message}
          </p>
        ) : null}
      </div>

      {formError ? (
        <div className={styles.error} role="alert">
          {formError}
        </div>
      ) : null}

      <button type="submit" className={styles.submit} disabled={submitting}>
        {submitting ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  );
}
