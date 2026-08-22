import { useRouter } from "next/router";
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../lib/axios';

export default function Dashboard() {
  const router = useRouter();
  const { data: messagesSummary } = useQuery({
    queryKey: ['messages_new_count'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/messages?summary=1');
      return data;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    refetchInterval: 5000,
  });
  const newMessagesCount = messagesSummary?.newCount || 0;

  const buttons = [
    { label: "Personal info", path: "/dashboard/personal_info", icon: "/user2.svg" },
    { label: "Certificates", path: "/dashboard/certificates", icon: "/certificate2.svg" },
    { label: "Services", path: "/dashboard/services", icon: "/services.svg" },
    { label: "Events & workshops", path: "/dashboard/events_workshops", icon: "/events.svg" },
    { label: "Categories", path: "/dashboard/categories", icon: "/categories.svg" },
    { label: "Reviews", path: "/dashboard/reviews", icon: "/testimonials2.svg" },
    { label: "Blogs", path: "/dashboard/blogs", icon: "/blogs.svg" },
    { label: "Contact page", path: "/dashboard/contact", icon: "/phone.svg" },
    {
      label: "Messages",
      path: "/dashboard/messages",
      icon: "/message2.svg",
      badge: newMessagesCount > 0 ? newMessagesCount : 0,
    },
  ];

  return (
    <div style={{ 
      padding: "10px 35px 5px 35px",
      display: 'flex',
      flexDirection: 'column',
      overflow: 'auto'
    }}>
      <div className="main-container" style={{ maxWidth: 600, margin: "10px auto", textAlign: "center" }}>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          gap: "16px",
          marginBottom: "15px"
        }}>
          <Image
            src="/logo.png"
            alt="Logo"
            width={70}
            height={70}
            style={{
              borderRadius: "50%",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
              objectFit: "cover",
              background: "transparent"
            }}
          />
          <h1 style={{ margin: 0, color: 'var(--system-surface)' }}>Website Main Dashboard</h1>
        </div>
        
      <style jsx>{`
        .dashboard-btn {
          position: relative;
          overflow: visible;
          width: 100%;
          margin-bottom: 10px;
          padding: 16px 0;
          background: linear-gradient(135deg, var(--system-secondary) 0%, var(--system-secondary-hover) 100%);
          color: var(--system-primary);
          border: none;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 700;
          letter-spacing: 1px;
          box-shadow: 0 4px 16px rgba(201, 169, 106, 0.28);
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .dashboard-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, var(--system-secondary-hover) 0%, var(--system-secondary-pressed) 100%);
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(201, 169, 106, 0.4);
          color: var(--system-primary);
        }
        .dashboard-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .dash-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          min-width: 22px;
          width: auto;
          height: 22px;
          padding: 0 6px;
          border-radius: 999px;
          background: #ff3b30;
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.72rem;
          font-weight: 800;
          line-height: 1;
          box-shadow: 0 2px 6px rgba(255, 59, 48, 0.45);
          border: 2px solid #fff;
          box-sizing: border-box;
        }
        .dash-badge.single {
          width: 22px;
          padding: 0;
        }
        
        @media (max-width: 768px) {
          .dashboard-btn {
            padding: 16px 0;
            font-size: 1.1rem;
            margin-bottom: 10px;
          }
          h1 {
            font-size: 1.8rem !important;
          }
        }
        
        @media (max-width: 480px) {
          .main-container {
            max-width: 600px;
            margin: 20px auto !important;
            text-align: center;
          }
          .dashboard-btn {
            padding: 14px 0;
            font-size: 1.1rem;
            margin-bottom: 10px;
          }
          h1 {
            font-size: 1.5rem !important;
          }
        }
      `}</style>
          <div style={{ marginTop: 30 }}>
        {buttons.map((btn) => (
          <button
            key={btn.path}
            className="dashboard-btn"
            onClick={() => router.push(btn.path)}
          >
            <Image src={btn.icon} alt={btn.label} width={20} height={20} />
            {btn.label}
            {btn.badge > 0 ? (
              <span
                className={`dash-badge${btn.badge < 10 ? ' single' : ''}`}
                aria-label={`${btn.badge} new messages`}
              >
                {btn.badge > 99 ? '99+' : btn.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      </div>
    </div>
  );
}
