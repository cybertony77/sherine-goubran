import { useRouter } from "next/router";

export default function ContactDeveloper({ style = {}, className = "" }) {
  const router = useRouter();
  return (
    <button
      className={`contact-dev-btn ${className}`}
      style={{
        background: "linear-gradient(90deg, var(--system-secondary) 0%, #FEB954 100%)",
        color: "#fff",
        border: "none",
        borderRadius: 12,
        padding: "12px 28px",
        fontWeight: 700,
        fontSize: "1.1rem",
        cursor: "pointer",
        boxShadow: "0 4px 16px rgba(201, 169, 106, 0.15)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        transition: "all 0.2s",
        ...style
      }}
      onClick={() => router.push("/contact_developer")}
    >
      <span style={{ fontSize: "1.3em", marginRight: 8 }}>💬</span>
      Contact Tony Joseph (developer)
    </button>
  );
} 