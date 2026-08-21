import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { getPublicPageName, isPublicPortfolioPath, normalizeClientPath } from '../lib/pageNames';
import PagePreloader from './PagePreloader';

const MIN_VISIBLE_MS = 550;
const EXIT_MS = 820;
const REDUCED_EXIT_MS = 180;
const FAILSAFE_MS = 6000;

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function PageTransitionProvider() {
  const router = useRouter();
  const initialPath = normalizeClientPath(router.asPath);
  const startsPublic = isPublicPortfolioPath(initialPath);

  const [active, setActive] = useState(startsPublic);
  const [exiting, setExiting] = useState(false);
  const [name, setName] = useState(() => (startsPublic ? getPublicPageName(initialPath) : ''));
  const [navKey, setNavKey] = useState(() => (startsPublic ? 1 : 0));

  const generationRef = useRef(startsPublic ? 1 : 0);
  const inFlightRef = useRef(startsPublic);
  const finishingRef = useRef(0);
  const startedAtRef = useRef(0);
  const destPathRef = useRef(startsPublic ? initialPath : '');
  const asPathRef = useRef(router.asPath);
  const timersRef = useRef([]);

  asPathRef.current = router.asPath;

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const schedule = useCallback((fn, delay) => {
    const id = window.setTimeout(fn, delay);
    timersRef.current.push(id);
    return id;
  }, []);

  const hideImmediately = useCallback(() => {
    clearTimers();
    inFlightRef.current = false;
    finishingRef.current = generationRef.current;
    destPathRef.current = '';
    setExiting(false);
    setActive(false);
  }, [clearTimers]);

  const beginTransition = useCallback((url) => {
    if (!isPublicPortfolioPath(url)) {
      hideImmediately();
      return;
    }

    const nextPath = normalizeClientPath(url);
    generationRef.current += 1;
    finishingRef.current = 0;
    inFlightRef.current = true;
    destPathRef.current = nextPath;
    startedAtRef.current = Date.now();
    clearTimers();
    setName(getPublicPageName(nextPath));
    setNavKey(generationRef.current);
    setExiting(false);
    setActive(true);
  }, [clearTimers, hideImmediately]);

  const finishTransition = useCallback(() => {
    if (!inFlightRef.current) return;

    const generation = generationRef.current;
    if (finishingRef.current === generation) return;
    finishingRef.current = generation;

    const reduced = prefersReducedMotion();
    const minVisible = reduced ? 180 : MIN_VISIBLE_MS;
    const exitMs = reduced ? REDUCED_EXIT_MS : EXIT_MS;
    const wait = Math.max(0, minVisible - (Date.now() - startedAtRef.current));

    clearTimers();
    schedule(() => {
      if (generationRef.current !== generation) return;
      setExiting(true);
      schedule(() => {
        if (generationRef.current !== generation) return;
        inFlightRef.current = false;
        destPathRef.current = '';
        setActive(false);
        setExiting(false);
      }, exitMs);
    }, wait);
  }, [clearTimers, schedule]);

  useLayoutEffect(() => {
    if (!startsPublic) return;
    startedAtRef.current = Date.now();
    destPathRef.current = normalizeClientPath(asPathRef.current);
    inFlightRef.current = true;
    // First public entry only — later visits are handled by router events.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    const handleStart = (url, { shallow } = {}) => {
      if (shallow) return;

      if (!isPublicPortfolioPath(url)) {
        hideImmediately();
        return;
      }

      const nextPath = normalizeClientPath(url);
      const currentPath = normalizeClientPath(asPathRef.current);

      if (nextPath === currentPath && inFlightRef.current) {
        destPathRef.current = nextPath;
        return;
      }

      if (nextPath === currentPath) return;

      beginTransition(url);
    };

    const handleComplete = (url) => {
      if (!isPublicPortfolioPath(url)) {
        hideImmediately();
        return;
      }
      destPathRef.current = normalizeClientPath(url);
      finishTransition();
    };

    const handleError = (err) => {
      if (err?.cancelled) return;
      hideImmediately();
    };

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleError);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleError);
    };
  }, [router.events, beginTransition, finishTransition, hideImmediately]);

  useEffect(() => {
    if (!active || exiting) return undefined;
    if (!router.isReady) return undefined;

    const current = normalizeClientPath(router.asPath);
    if (!destPathRef.current || current !== destPathRef.current) return undefined;

    let cancelled = false;
    const startFinish = () => {
      if (!cancelled) finishTransition();
    };

    if (document.readyState === 'complete') {
      const raf = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(startFinish);
      });
      return () => {
        cancelled = true;
        window.cancelAnimationFrame(raf);
      };
    }

    window.addEventListener('load', startFinish, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener('load', startFinish);
    };
  }, [active, exiting, router.asPath, router.isReady, finishTransition]);

  useEffect(() => {
    if (!active) return undefined;
    const generation = generationRef.current;
    const timer = window.setTimeout(() => {
      if (generationRef.current !== generation) return;
      hideImmediately();
    }, FAILSAFE_MS);
    return () => window.clearTimeout(timer);
  }, [active, navKey, hideImmediately]);

  const handleExitComplete = () => {
    if (!exiting) return;
    inFlightRef.current = false;
    destPathRef.current = '';
    setActive(false);
    setExiting(false);
  };

  return (
    <PagePreloader
      active={active}
      exiting={exiting}
      name={name}
      navKey={navKey}
      onExitComplete={handleExitComplete}
    />
  );
}
