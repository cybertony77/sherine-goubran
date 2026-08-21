import { useEffect, useMemo, useState } from 'react';

function buildVideoApiPath(r2Key) {
  if (!r2Key) return null;
  const segments = String(r2Key).split('/').filter(Boolean);
  return segments.map((segment) => encodeURIComponent(segment)).join('/');
}

export default function R2VideoPoster({ r2Key, className = '' }) {
  const [posterUrl, setPosterUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  const videoApiKey = useMemo(() => {
    const path = buildVideoApiPath(r2Key);
    return path ? decodeURIComponent(path) : null;
  }, [r2Key]);

  useEffect(() => {
    if (!videoApiKey) {
      setPosterUrl(null);
      setFailed(false);
      return undefined;
    }

    let cancelled = false;
    setFailed(false);
    setPosterUrl(null);

    (async () => {
      try {
        const response = await fetch(`/api/upload/r2-video-url?key=${encodeURIComponent(videoApiKey)}`);
        const payload = await response.json();
        if (!response.ok || !payload?.signedUrl) {
          throw new Error(payload?.error || 'Failed to load video preview');
        }
        if (!cancelled) setPosterUrl(payload.signedUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [videoApiKey]);

  if (!videoApiKey || failed) {
    return null;
  }

  if (!posterUrl) {
    return null;
  }

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video
      className={className}
      src={`${posterUrl}#t=0.1`}
      preload="metadata"
      muted
      playsInline
      aria-hidden="true"
    />
  );
}
