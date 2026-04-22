import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { hashValue } from '../lib/crypto';
import MatrixRain from '../components/MatrixRain';
import Logo from '../components/LogoMark';

export default function Create() {
  const [roomId, setRoomId]     = useState('');
  const [password, setPassword] = useState('');
  const [capacity, setCapacity] = useState(2);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const navigate = useNavigate();

  const handle = async () => {
    const room = roomId.trim(), pass = password.trim();
    if (!room || !pass) return;
    setLoading(true); setError('');
    try {
      const { data: ex } = await supabase.from('rooms').select('id').eq('room_id', room).single();
      if (ex) { setError('Room ID already taken.'); setLoading(false); return; }

      const hashed = await hashValue(pass);
      const { error: err } = await supabase.from('rooms').insert([{ room_id: room, password: hashed, capacity }]);
      if (err) { setError(err.message); setLoading(false); return; }

      sessionStorage.setItem('roomId', room);
      sessionStorage.setItem('roomPassword', pass);
      navigate('/chat');
    } catch { setError('Something went wrong.'); setLoading(false); }
  };

  return (
    <>
      <MatrixRain />
      <nav className="nav">
        <div className="nav-brand"><Logo size={22} />CipherChat</div>
        <div className="nav-right">
          <button className="btn-ghost" onClick={() => navigate('/ask')}>← Back</button>
        </div>
      </nav>

      <div className="auth-page">
        <div className="auth-box">
          <div className="auth-header">
            <div className="auth-title">Create a <span className="g">Room</span></div>
            <div className="auth-desc">share the room ID and password with your contact</div>
          </div>

          <div className="field">
            <label className="field-label">Room ID</label>
            <input placeholder="e.g. alpha-7" value={roomId} onChange={(e) => setRoomId(e.target.value)} autoFocus />
          </div>

          <div className="field">
            <label className="field-label">Password</label>
            <input type="password" placeholder="Shared with anyone joining" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <div className="field">
            <label className="field-label">Max Users</label>
            <div className="select-wrap">
              <select value={capacity} onChange={(e) => setCapacity(Number(e.target.value))}>
                {[2,3,4,5,6,8,10].map(n => <option key={n} value={n}>{n} users</option>)}
              </select>
            </div>
          </div>

          {error && <div className="error-msg">{error}</div>}

          <button className="btn-primary" onClick={handle} disabled={!roomId.trim() || !password.trim() || loading}>
            {loading ? 'Creating…' : 'Create & Join Room →'}
          </button>

          <div className="enc-footer">
            <div className="dot" />
            Password is SHA-256 hashed before storage. Only used locally to derive your encryption key.
          </div>
        </div>
      </div>
    </>
  );
}
