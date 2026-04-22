import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LogoMark from '../components/LogoMark';

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
        <div className="logo">
          <LogoMark size={32} />
          <div className="logo-name">Cipher<em>Chat</em></div>
        </div>

        <h1>Welcome back</h1>
        <p className="sub">// set your display name to continue</p>

        <div className="field">
          <label>Display name</label>
          <input
            placeholder="e.g. alice"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
            autoFocus
          />
        </div>

        <button
          className="btn btn-primary"
          onClick={handleLogin}
          disabled={!name.trim()}
          style={{ marginTop: 4 }}
        >
          Continue
        </button>

        <div className="enc-bar">
          <div className="status-dot" />
          XSalsa20-Poly1305 · SHA-256 key derivation · zero server-side plaintext
        </div>
      </div>
    </div>
  );
}
