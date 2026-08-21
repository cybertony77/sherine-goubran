import { useRouter } from "next/router";
import Image from 'next/image';

export default function BackToDashboard({ style = {}, className = "", text = "Back to Dashboard", href }) {
  const router = useRouter();
  return (
    <button
      className={`back-btn ${className}`}
      style={{
        background: 'linear-gradient(135deg, var(--system-secondary) 0%, var(--system-secondary-hover) 100%)',
        color: '#FFFFFF',
        border: 'none',
        borderRadius: 8,
        padding: '10px 20px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: '0 2px 8px rgba(201, 169, 106, 0.28)',
        fontSize: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        ...style
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background =
          'linear-gradient(135deg, var(--system-secondary-hover) 0%, var(--system-secondary-pressed) 100%)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background =
          'linear-gradient(135deg, var(--system-secondary) 0%, var(--system-secondary-hover) 100%)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      onClick={() => href ? router.push(href) : router.back()}
    >
      {typeof text === 'string' && (
        <Image
          src="/arrow-left.svg"
          alt="Back"
          width={25}
          height={25}
          style={{ filter: 'brightness(0)' }}
        />
      )}
      {typeof text === 'string' ? text : <span style={{ display: 'inline-flex', alignItems: 'center', color: '#FFFFFF' }}>{text}</span>}
    </button>
  );
} 