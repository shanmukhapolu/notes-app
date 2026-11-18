import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";

const dateLabel = (value) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

function SetupScreen() {
  return (
    <main className="setup-page">
      <div className="setup-card">
        <div className="brand-mark">N</div>
        <p className="eyebrow">NOTES</p>
        <h1>Your quiet space for ideas.</h1>
        <p className="muted">The app is deployed, but Auth0's public application settings are not configured yet.</p>
        <div className="setup-list">
          <p><strong>1.</strong> Create an Auth0 Single Page Application.</p>
          <p><strong>2.</strong> Set VITE_AUTH0_DOMAIN, VITE_AUTH0_CLIENT_ID, and VITE_AUTH0_AUDIENCE.</p>
          <p><strong>3.</strong> Add your site URL to Auth0's Allowed Callback, Logout, and Web Origins.</p>
        </div>
        <p className="small muted">See README.md for the complete setup instructions.</p>
      </div>
    </main>
  );
}

function LoginScreen({ onLogin, loading, error }) {
  return (
    <main className="login-page">
      <div className="login-card">
        <div className="brand-mark">N</div>
        <p className="eyebrow">A LITTLE LESS CLUTTER</p>
        <h1>Make room<br />for your thoughts.</h1>
        <p className="muted">A simple, private place to keep the things you don't want to forget.</p>
        {error && <p className="error-banner">{error}</p>}
        <button className="primary-button login-button" onClick={onLogin} disabled={loading}>
          {loading ? "Opening sign in…" : "Continue with Auth0"}
          <span aria-hidden="true">→</span>
        </button>
        <p className="small muted center">Your notes are private to your account.</p>
      </div>
      <div className="login-decoration decoration-one" />
      <div className="login-decoration decoration-two" />
    </main>
  );
}

function AppContent() {
  const {
    user,
    logout,
    getAccessTokenSilently,
  } = useAuth0();

  const [notes, setNotes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState(null);

  const selectedNote = notes.find((note) => note.id === selectedId) || null;

  const filteredNotes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return notes;
    return notes.filter((note) =>
      `${note.title} ${note.content}`.toLowerCase().includes(query)
    );
  }, [notes, search]);

  const api = useCallback(async (path, options = {}) => {
    const token = await getAccessTokenSilently();
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Something went wrong.");
    return data;
  }, [getAccessTokenSilently]);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api("/api/notes");
      setNotes(data.notes || []);
      setSelectedId((current) => {
        if (current && data.notes.some((note) => note.id === current)) return current;
        return data.notes[0]?.id || null;
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    if (selectedNote) {
      setTitle(selectedNote.title);
      setContent(selectedNote.content);
      setSavedAt(selectedNote.updated_at);
    } else {
      setTitle("");
      setContent("");
      setSavedAt(null);
    }
  }, [selectedId]); // The selected note is intentionally read when the selection changes.

  const createNote = async () => {
    setSaving(true);
    setError("");
    try {
      const { note } = await api("/api/notes", {
        method: "POST",
        body: JSON.stringify({ title: "Untitled", content: "" }),
      });
      setNotes((current) => [note, ...current]);
      setSelectedId(note.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveNote = async () => {
    if (!selectedId) return;
    setSaving(true);
    setError("");
    try {
      const { note } = await api(`/api/notes/${selectedId}`, {
        method: "PATCH",
        body: JSON.stringify({ title, content }),
      });
      setNotes((current) =>
        [note, ...current.filter((item) => item.id !== note.id)]
      );
      setSavedAt(note.updated_at);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async () => {
    if (!selectedId || !window.confirm("Delete this note? This cannot be undone.")) return;
    setSaving(true);
    setError("");
    try {
      await api(`/api/notes/${selectedId}`, { method: "DELETE" });
      const remaining = notes.filter((note) => note.id !== selectedId);
      setNotes(remaining);
      setSelectedId(remaining[0]?.id || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const selectNote = (note) => setSelectedId(note.id);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand-lockup">
            <div className="brand-mark small-mark">N</div>
            <span>notes<span className="brand-period">.</span></span>
          </div>
          <button className="icon-button new-note-button" onClick={createNote} disabled={saving} aria-label="Create note" title="New note">+</button>
        </div>

        <div className="search-wrap">
          <span className="search-icon">⌕</span>
          <input
            aria-label="Search notes"
            placeholder="Search notes"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <kbd>⌘ K</kbd>
        </div>

        <div className="list-heading">
          <span>YOUR NOTES</span>
          <span>{filteredNotes.length}</span>
        </div>

        <div className="notes-list">
          {loading ? (
            <div className="list-message">Loading your notes…</div>
          ) : filteredNotes.length ? (
            filteredNotes.map((note) => (
              <button
                key={note.id}
                className={`note-list-item ${selectedId === note.id ? "active" : ""}`}
                onClick={() => selectNote(note)}
              >
                <span className="note-item-title">{note.title || "Untitled"}</span>
                <span className="note-item-preview">{note.content?.trim() || "No additional text"}</span>
                <span className="note-item-date">{dateLabel(note.updated_at)}</span>
              </button>
            ))
          ) : (
            <div className="empty-list">
              <span className="empty-icon">✳</span>
              <p>{search ? "No matching notes" : "Nothing here yet"}</p>
              <span>{search ? "Try another search." : "Create a note to get started."}</span>
            </div>
          )}
        </div>

        <div className="sidebar-footer">
          <img className="avatar" src={user.picture} alt="" referrerPolicy="no-referrer" />
          <div className="profile-copy">
            <strong>{user.name || user.email}</strong>
            <span>{user.email}</span>
          </div>
          <button className="icon-button logout-button" onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })} title="Sign out" aria-label="Sign out">↗</button>
        </div>
      </aside>

      <main className="editor-area">
        {error && <div className="toast-error" role="alert">{error}</div>}
        {selectedNote ? (
          <div className="editor">
            <div className="editor-toolbar">
              <div className="breadcrumb"><span>My notes</span><span>/</span><strong>{selectedNote.title || "Untitled"}</strong></div>
              <div className="toolbar-actions">
                <span className="save-status">{saving ? "Saving…" : savedAt ? `Saved ${dateLabel(savedAt)}` : "Not saved"}</span>
                <button className="text-button delete-button" onClick={deleteNote} disabled={saving}>Delete</button>
                <button className="primary-button save-button" onClick={saveNote} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
              </div>
            </div>
            <div className="editor-content">
              <input
                className="title-input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Untitled"
                maxLength={160}
                aria-label="Note title"
              />
              <div className="editor-meta">LAST EDITED {savedAt ? dateLabel(savedAt).toUpperCase() : "JUST NOW"}</div>
              <textarea
                className="content-input"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Start writing…"
                aria-label="Note content"
              />
            </div>
            <div className="editor-bottom"><span>Take your time. There's no rush.</span><span>{content.length.toLocaleString()} characters</span></div>
          </div>
        ) : (
          <div className="welcome-empty">
            <div className="empty-paper">✳</div>
            <h2>{search ? "No notes found" : "A fresh page."}</h2>
            <p>{search ? "Try a different search, or clear the search field." : "Your next idea can start right here."}</p>
            {!search && <button className="primary-button" onClick={createNote}>Create your first note <span>→</span></button>}
          </div>
        )}
      </main>
    </div>
  );
}

export default function App({ authConfigured = true }) {
  if (!authConfigured) return <SetupScreen />;

  const auth = useAuth0();

  if (auth.isLoading) {
    return <div className="loading-screen"><div className="brand-mark">N</div><span>Preparing your notes…</span></div>;
  }

  if (auth.error) {
    return <LoginScreen onLogin={() => auth.loginWithRedirect()} loading={false} error={auth.error.message} />;
  }

  if (!auth.isAuthenticated) {
    return <LoginScreen onLogin={() => auth.loginWithRedirect()} loading={false} />;
  }

  return <AppContent />;
}
