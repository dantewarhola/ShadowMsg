import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [name, setName] = useState('');
  const navigate = useNavigate();

  const handleLogin = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    localStorage.setItem('userId', trimmed);
    navigate('/ask');
  };

  return (
    <div className="page">
      <div className="card">
        <div className="brand">
          <div className="brand-icon">🔐</div>
          <div className="brand-name">Secure<span>Chat</span></div>
        </div>

        <h1>Welcome</h1>
        <p className="subtitle">// enter your display name to start</p>

        <div className="field">
          <label>Display Name</label>
          <input
            placeholder="e.g. alice"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
            autoFocus
          />
        </div>

        <button
          className="btn-primary"
          onClick={handleLogin}
          disabled={!name.trim()}
        >
          Continue →
        </button>

        <div className="security-badge">
          <div className="dot" />
          XSalsa20-Poly1305 end-to-end encryption · Zero server-side plaintext
        </div>
      </div>
    </div>
  );
}
