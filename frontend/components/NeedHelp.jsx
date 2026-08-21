import { useRouter } from "next/router";

export default function NeedHelp({ style = {}, className = "" }) {
  const router = useRouter();
  
  return (
    <>
      <div 
        className={`need-help-container ${className}`}
        style={{
          marginTop: '15px',
          fontSize: '0.9rem',
          color: '#8A8A8A',
          textAlign: 'center',
          marginBottom: '-10px',
          ...style
        }}
      >
        Need help? contact{' '}
        <a
          href="/contact_developer"
          onClick={(e) => {
            e.preventDefault();
            router.push('/contact_developer');
          }}
          style={{
            color: '#C9A96A',
            textDecoration: 'none',
            fontWeight: 600,
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
          onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
        >
          developer
        </a>
      </div>
      <style jsx>{`
        .need-help-container {
          word-wrap: break-word;
          line-height: 1.5;
        }
        
        .need-help-container a {
          display: inline-block;
          min-height: 44px;
          line-height: 44px;
          padding: 0 4px;
        }
        
        @media (max-width: 768px) {
          .need-help-container {
            font-size: 0.9rem !important;
            padding: 0 10px;
          }
          
          .need-help-container a {
            min-height: 40px;
            line-height: 40px;
          }
        }
        
        @media (max-width: 480px) {
          .need-help-container {
            font-size: 0.9rem !important;
            padding: 0 8px;
            line-height: 1.6;
          }
          
          .need-help-container a {
            min-height: 36px;
            line-height: 36px;
            padding: 0 2px;
          }
        }
      `}</style>
    </>
  );
}
