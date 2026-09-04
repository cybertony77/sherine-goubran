import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import Title from "../../components/Title";
import ContactDeveloper from "../../components/ContactDeveloper";
import { useAssistant, useAssistants, useDeleteAssistant } from '../../lib/api/assistants';

export default function DeleteAssistant() {
  const router = useRouter();
  const [assistantId, setAssistantId] = useState("");
  const [searchId, setSearchId] = useState(""); // Separate state for search
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); // Store current user info
  const [searchResults, setSearchResults] = useState([]); // Store multiple search results
  const [showSearchResults, setShowSearchResults] = useState(false); // Show/hide search results

  // React Query hooks
  const { data: assistant, isLoading: assistantLoading, error: assistantError } = useAssistant(searchId, { enabled: !!searchId });
  const { data: allAssistants } = useAssistants(); // Get all assistants for name search
  const deleteAssistantMutation = useDeleteAssistant();

  useEffect(() => {
    // Only allow admin
    // Authentication is now handled by _app.js with HTTP-only cookies
    // This component will only render if user is authenticated
    // Admin access is now handled by _app.js
    // Current user info is now handled by _app.js
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Handle assistant error
  useEffect(() => {
    if (assistantError) {
      setError("❌ Assistant with this ID does not exist");
    }
  }, [assistantError]);

  const checkAssistant = async () => {
    if (!assistantId.trim()) {
      setError("❌ Please enter an assistant ID");
      return;
    }
    
    const searchTerm = assistantId.trim();
    
    // Block deleting the reserved username "tony"
    if (searchTerm.toLowerCase() === "tony") {
      setError("❌ You can't Delete tony's account");
      return;
    }
    
    // Check if trying to delete themselves
    if (currentUser && searchTerm === currentUser.assistant_id) {
      setError("⚠️ You are deleting yourself (" + currentUser.assistant_id + "). This action cannot be done. Please contact the developer (Tony Joseph) if you insist to delete yourself.");
      return;
    }
    
    setError("");
    setSearchResults([]);
    setShowSearchResults(false);
    
    // Check if it's a numeric ID
    if (/^\d+$/.test(searchTerm)) {
      // It's a numeric ID, search directly
      setSearchId(searchTerm);
    } else {
      // It's a name or username, search through all assistants (case-insensitive, includes)
      if (allAssistants) {
        const matchingAssistants = allAssistants.filter(assistant => 
          (assistant.name && assistant.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (assistant.id && assistant.id.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        
        if (matchingAssistants.length === 1) {
          // Single match, use it directly
          const foundAssistant = matchingAssistants[0];
          setSearchId(foundAssistant.id.toString());
          setAssistantId(foundAssistant.id.toString());
        } else if (matchingAssistants.length > 1) {
          // Multiple matches, show selection
          setSearchResults(matchingAssistants);
          setShowSearchResults(true);
          setError(`❌ Found ${matchingAssistants.length} assistants. Please select one.`);
        } else {
          setError(`❌ No assistant found with name or username starting with "${searchTerm}"`);
          setSearchId("");
        }
      } else {
        setError("❌ Assistant data not loaded. Please try again.");
      }
    }
  };

  const deleteAssistant = async () => {
    if (!assistant) return;
    
    // Block deleting the reserved username "tony"
    if (assistant.id && assistant.id.toLowerCase() === "tony") {
      setError("❌ You can't Delete the 'tony' account");
      return;
    }
    
    // Double-check if trying to delete themselves
    if (currentUser && assistant.id === currentUser.assistant_id) {
      setError("⚠️ You are deleting yourself (" + currentUser.assistant_id + "). This action cannot be done. Please contact the developer (Tony Joseph) if you insist to delete yourself.");
      return;
    }
    
    setError("");
    
    deleteAssistantMutation.mutate(assistantId, {
      onSuccess: () => {
        setDeleted(true);
        setShowConfirm(false); // Hide the modal after success
      },
      onError: () => {
        setError("❌ Error deleting assistant. Please try again.");
      }
    });
  };

  const resetForm = () => {
    setAssistantId("");
    setSearchId(""); // Clear search ID to reset the query
    setError("");
    setDeleted(false);
    setSearchResults([]);
    setShowSearchResults(false);
  };

  // Handle assistant selection from search results
  const handleAssistantSelect = (selectedAssistant) => {
    if (selectedAssistant?.id && selectedAssistant.id.toLowerCase() === 'tony') {
      setError("❌ You can't Delete the 'tony' account");
      return;
    }
    setSearchId(selectedAssistant.id.toString());
    setAssistantId(selectedAssistant.id.toString());
    setSearchResults([]);
    setShowSearchResults(false);
    setError("");
  };

  return (
    <div style={{ padding: "20px 5px 20px 5px" }}>
      <div style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>
                 <Title 
                   backText="Back" 
                   href="/manage_assistants" 
                 >
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                     <Image src="/trash2.svg" alt="Delete Assistant" width={32} height={32} />
                     Delete Assistant
                   </div>
                 </Title>
        <style jsx>{`
          .delete-btn {
            background: linear-gradient(90deg, #C9A96A 0%, #E9DDD0 100%);
            color: #0F0F10;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s, transform 0.2s;
          }
          .delete-btn:hover {
            background: linear-gradient(90deg, #B8954F 0%, #C9A96A 100%);
            transform: translateY(-2px) scale(1.03);
          }
          .danger-btn {
            background: linear-gradient(90deg, #dc3545 0%, #ff6b6b 100%);
            color: #0F0F10;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s, transform 0.2s;
          }
          .danger-btn:hover {
            background: linear-gradient(90deg, #c82333 0%, #dc3545 100%);
            transform: translateY(-2px) scale(1.03);
          }
          .form-group {
            margin-bottom: 16px;
          }
          .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
          }
          .form-group input {
            width: 100%;
            padding: 12px;
            border: 2px solid #e1e5e9;
            border-radius: 8px;
            font-size: 1rem;
            box-sizing: border-box;
            background: #ffffff;
            color: #000000;
          }
          .form-group input:focus {
            outline: none;
            border-color: #C9A96A;
          }
          .error {
            color: #dc3545;
            margin-top: 8px;
            font-weight: 500;
          }
          .success {
            color: #28a745;
            margin-top: 8px;
            font-weight: 500;
          }
          .assistant-info {
            background: #f8f9fa;
            border: 2px solid #E9DDD0;
            border-radius: 8px;
            padding: 16px;
            margin: 16px 0;
          }
          .assistant-info h3 {
            margin: 0 0 12px 0;
            color: #2B2B2B;
          }
          .assistant-info p {
            margin: 4px 0;
            color: #8A8A8A;
          }
          .btn-full {
            width: 100%;
            padding: 14px 0;
            font-size: 1.1rem;
            margin-bottom: 12px;
          }
          .confirm-modal {
            position: fixed;
            inset: 0;
            background: rgba(10, 30, 48, 0.55);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            z-index: 1000;
            backdrop-filter: blur(4px);
          }
          .confirm-content {
            width: min(420px, 100%);
            background: var(--system-surface, #fff);
            border-radius: 18px;
            padding: 24px 20px;
            box-shadow: 0 24px 60px rgba(10, 30, 48, 0.28);
            text-align: center;
          }
          .confirm-content h3 {
            margin: 0 0 10px;
            color: var(--system-primary, #0f0f10);
          }
          .confirm-content p {
            margin: 0 0 18px;
            color: #8A8A8A;
            line-height: 1.5;
          }
          .confirm-buttons {
            display: flex;
            gap: 10px;
          }
          .confirm-reset-btn,
          .cancel-btn {
            flex: 1;
            border: none;
            border-radius: 10px;
            padding: 12px 14px;
            font-weight: 800;
            font-size: 1rem;
            cursor: pointer;
            font-family: inherit;
          }
          .confirm-reset-btn {
            background: linear-gradient(135deg, #dc3545 0%, #e74c3c 100%);
            color: #fff;
          }
          .confirm-reset-btn:disabled,
          .cancel-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }
          .cancel-btn {
            background: #E9DDD0;
            color: #2B2B2B;
          }
          .success-message {
            background: #d1fae5;
            color: #166534;
            border-radius: 10px;
            padding: 16px;
            margin-top: 16px;
            text-align: center;
            font-weight: 600;
            box-shadow: 0 4px 16px rgba(40, 167, 69, 0.08);
            border: 1.5px solid #6ee7b7;
            font-size: 1.1rem;
          }
          .error-message {
            background: #fee2e2;
            color: #991b1b;
            border-radius: 10px;
            padding: 16px;
            margin-top: 16px;
            text-align: center;
            font-weight: 600;
            box-shadow: 0 4px 16px rgba(220, 53, 69, 0.08);
            border: 1.5px solid #fca5a5;
            font-size: 1.1rem;
          }
          .form-container {
            background: #F7F4EE;
            border-radius: 16px;
            padding: 32px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            border: 1px solid rgba(255,255,255,0.2);
          }
          .fetch-form {
            display: flex;
            gap: 12px;
            align-items: center;
            margin-bottom: 24px;
          }
          .fetch-input {
            flex: 1;
            padding: 14px 16px;
            border: 2px solid #E9DDD0;
            border-radius: 10px;
            font-size: 1rem;
            transition: all 0.3s ease;
            background: #ffffff;
            color: #000000;
          }
          .fetch-input:focus {
            outline: none;
            border-color: #C9A96A;
            background: #F7F4EE;
            box-shadow: 0 0 0 3px rgba(201, 169, 106, 0.1);
          }
          .fetch-btn {
            background: linear-gradient(135deg, var(--system-secondary) 0%, #C9A96A 100%);
            color: #0F0F10;
            border: none;
            border-radius: 12px;
            padding: 16px 28px;
            font-weight: 700;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 16px rgba(201, 169, 106, 0.3);
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 140px;
            justify-content: center;
          }
          .fetch-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(201, 169, 106, 0.4);
            background: linear-gradient(135deg, #0d8bc7 0%, #5bb8e6 100%);
          }
          .fetch-btn:active {
            transform: translateY(-1px);
            box-shadow: 0 4px 16px rgba(201, 169, 106, 0.3);
          }
          @media (max-width: 768px) {
            .form-container {
              padding: 24px;
            }
            .form-group {
              margin-bottom: 20px;
            }
            .form-input, .fetch-input {
              padding: 14px 16px;
            }
            .fetch-form {
              flex-direction: column;
              gap: 12px;
            }
            .fetch-btn {
              width: 100%;
              padding: 14px 20px;
              font-size: 0.95rem;
            }
            .fetch-input {
              width: 100%;
            }
          }
          @media (max-width: 480px) {
            .form-container {
              padding: 20px;
            }
            .form-group label {
              font-size: 0.9rem;
            }
            .form-input, .fetch-input {
              padding: 12px 14px;
              font-size: 0.95rem;
            }
            .submit-btn {
              padding: 16px;
              font-size: 1rem;
            }
          }
        `}</style>
        {!deleted ? (
          <>
            <div className="form-container">
              <form onSubmit={(e) => { e.preventDefault(); checkAssistant(); }} className="fetch-form">
                <input
                  className="fetch-input"
                  type="text"
                  value={assistantId}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setAssistantId(newValue);
                    setSearchId(""); // Clear search ID to prevent auto-fetch
                    // Clear search results and error if input changes
                    if (newValue.trim() !== searchId) {
                      setError("");
                      setSearchResults([]);
                      setShowSearchResults(false);
                    }
                  }}
                  placeholder="Enter assistant Username, Name"
                  disabled={assistantLoading || deleteAssistantMutation.isPending}
                  required
                />
                <button 
                  type="submit"
                  className="fetch-btn"
                  disabled={assistantLoading || deleteAssistantMutation.isPending}
                >
                  {assistantLoading ? "Loading..." : "🔍 Search"}
                </button>
              </form>
              
              {/* Show search results if multiple matches found */}
              {showSearchResults && searchResults.length > 0 && (
                <div style={{ 
                  marginTop: "16px", 
                  padding: "16px", 
                  background: "#f8f9fa", 
                  borderRadius: "8px", 
                  border: "1px solid #dee2e6" 
                }}>
                  <div style={{ 
                    marginBottom: "12px", 
                    fontWeight: "600", 
                    color: "#2B2B2B" 
                  }}>
                    Select an assistant to delete:
                  </div>
                  {searchResults.map((assistant) => (
                    <button
                      key={assistant.id}
                      onClick={() => handleAssistantSelect(assistant)}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "12px 16px",
                        margin: "8px 0",
                        background: "white",
                        border: "1px solid #dee2e6",
                        borderRadius: "6px",
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = "#E9DDD0";
                        e.target.style.borderColor = "#dc3545";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = "white";
                        e.target.style.borderColor = "#dee2e6";
                      }}
                    >
                      <div style={{ fontWeight: "600", color: "#dc3545" }}>
                        {assistant.name} (ID: {assistant.id})
                      </div>
                      <div style={{ fontSize: "0.9rem", color: "#8A8A8A" }}>
                        {assistant.role} • {assistant.phone}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
            {error && (
              <div className="error-message">
                {error.includes("You are deleting yourself") ? (
                  <>
                    {error}
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                      <ContactDeveloper />
                    </div>
                  </>
                ) : (
                  error
                )}
              </div>
            )}
            </div>
            {assistant && (
              <div className="assistant-info">
                <h3>Assistant Found:</h3>
                <p><strong>Username:</strong> {assistant.id}</p>
                <p><strong>Name:</strong> {assistant.name}</p>
                <p><strong>Phone:</strong> {assistant.phone}</p>
                <p><strong>Email:</strong> {assistant.email}</p>
                <p><strong>Role:</strong> {assistant.role}</p>
                <div style={{ marginTop: "20px" }}>
                  {(currentUser && assistant.id === currentUser.assistant_id) ? (
                    <>
                      <p style={{ color: "#dc3545", fontWeight: "bold", marginBottom: "16px" }}>
                        ⚠️ You are deleting yourself ({currentUser.assistant_id}). This action cannot be done. Please contact the developer (Tony Joseph) if you insist to delete yourself.
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                        <ContactDeveloper />
                      </div>
                    </>
                  ) : (
                    <>
                      <p style={{ color: "#dc3545", fontWeight: "bold", marginBottom: "16px" }}>
                        ⚠️ Are you sure you want to delete this assistant? This action cannot be undone.
                      </p>
                      <button 
                        className="danger-btn btn-full"
                        onClick={() => setShowConfirm(true)}
                        disabled={deleteAssistantMutation.isPending}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      >
                        <Image src="/trash2.svg" alt="Delete" width={20} height={20} />
                        Yes, Delete Assistant
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
            {showConfirm && assistant && !(currentUser && assistant.id === currentUser.assistant_id) && (
              <div className="confirm-modal" onClick={() => setShowConfirm(false)}>
                <div className="confirm-content" onClick={(e) => e.stopPropagation()}>
                  <h3>Delete assistant?</h3>
                  <p>
                    Are you sure you want to delete <strong>{assistant?.name}</strong>?
                  </p>
                  <div className="confirm-buttons">
                    <button
                      onClick={deleteAssistant}
                      disabled={deleteAssistantMutation.isPending}
                      className="confirm-reset-btn"
                    >
                      {deleteAssistantMutation.isPending ? "Deleting…" : "Delete"}
                    </button>
                    <button
                      onClick={() => setShowConfirm(false)}
                      disabled={deleteAssistantMutation.isPending}
                      className="cancel-btn"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="success-message">
            <div style={{ fontSize: "4rem"}}><Image src="/success-mark3.svg" alt="Success" width={80} height={80} /></div>
            <h2 style={{ color: "#28a745", marginBottom: "16px" }}>Assistant Deleted Successfully!</h2>
            <p style={{ color: "#8A8A8A", marginBottom: "24px" }}>
              Assistant <strong>{assistantId}</strong> has been permanently deleted from the database.
            </p>
            <button 
              className="delete-btn btn-full"
              onClick={resetForm}
            >
              Delete Another Assistant
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 