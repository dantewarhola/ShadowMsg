import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { hashValue } from '../lib/crypto';
import LogoMark from '../components/LogoMark';

export default function Create() {
  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [capacity, setCapacity] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleCreate = async () => {
    const trimmedRoom = roomId.trim();
    const trimmedPass = password.trim();
    if (!trimmedRoom || !trimmedPass) return;

    setLoading(true);
    setError('');

    try {
      const { data: existing } = await supabase
        .from('rooms')
        .select('id')
        .eq('room_id', trimmedRoom)
        .single();

      if (existing) {
        setError('Room ID already taken. Choose a different name.');
        setLoading(false);
        return;
      }

      // Hash the password before storing — Supabase never sees the plaintext
      const hashedPassword = await hashValue(trimmedPass);

      const { error: insertError } = await supabase
        .from('rooms')
        .insert([{ room_id: trimmedRoom, password: hashedPassword, capacity }]);

      if (insertError) {
        setError('Failed to create room: ' + insertError.message);
        setLoading(false);
        return;
      }

      // Store the ORIGINAL password in sessionStorage for encryption key derivation
      sessionStorage.setItem('roomId', trimmedRoom);
      sessionStorage.setItem('roomPassword', trimmedPass);
      navigate('/chat');
    } catch {
      setError('Something went wrong. Check your Supabase configuration.');
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="card">
        <div className="logo">
          <LogoMark size={32} />
          <div className="logo-name">Cipher<em>Chat</em></div>
        </div>

        <h1>Create a room</h1>
        <p className="sub">// share the room ID + password with your contact</p>

        <div className="field">
          <label>Room ID</label>
          <input
            placeholder="e.g. myroom42"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            autoFocus
          />
        </div>

        <div className="field">
          <label>Room password</label>
          <input
            type="password"
            placeholder="Shared secret — used to derive encryption key"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Max users</label>
          <div className="select-wrap">
            <select value={capacity} onChange={(e) => setCapacity(Number(e.target.value))}>
              {[2,3,4,5,6,8,10].map(n => (
                <option key={n} value={n}>{n} users</option>
              ))}
            </select>
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        <button
          className="btn btn-primary"
          onClick={handleCreate}
          disabled={!roomId.trim() || !password.trim() || loading}
          style={{ marginTop: 6 }}
        >
          {loading ? 'Creating…' : 'Create & enter'}
        </button>

        <button className="btn btn-secondary" onClick={() => navigate('/ask')}>
          Back
        </button>

        <div className="enc-bar">
          <div className="status-dot" />
          Password hashed before leaving your browser · never stored in plaintext
        </div>
      </div>
    </div>
  );
}
