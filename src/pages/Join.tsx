import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { hashValue } from '../lib/crypto';
import LogoMark from '../components/LogoMark';

export default function Join() {
  const { roomId: paramRoomId } = useParams<{ roomId?: string }>();
  const savedRoomId = sessionStorage.getItem('selectedRoomId') || '';
  const [roomId, setRoomId] = useState(paramRoomId || savedRoomId);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem('userId')) navigate('/');
  }, [navigate]);

  const handleJoin = async () => {
    const trimmedRoom = roomId.trim();
    const trimmedPass = password.trim();
    if (!trimmedRoom || !trimmedPass) return;

    setLoading(true);
    setError('');

    try {
      const { data: room, error: fetchError } = await supabase
        .from('rooms')
        .select('room_id, password, capacity, member_count')
        .eq('room_id', trimmedRoom)
        .single();

      if (fetchError || !room) {
        setError('Room not found. Check the room ID and try again.');
        setLoading(false);
        return;
      }

      // Hash what the user typed so we can compare it against the stored hash
      const hashedPassword = await hashValue(trimmedPass);

      // Compare hashes — plaintext password never hits Supabase
      if (room.password !== hashedPassword) {
        setError('Incorrect password.');
        setLoading(false);
        return;
      }

      if (room.member_count >= room.capacity) {
        setError('Room is full.');
        setLoading(false);
        return;
      }

      // Store the ORIGINAL password for encryption key derivation — not the hash
      sessionStorage.setItem('roomId', trimmedRoom);
      sessionStorage.setItem('roomPassword', trimmedPass);
      navigate('/chat');
    } catch {
      setError('Something went wrong. Please try again.');
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

        <h1>Join a room</h1>
        <p className="sub">// enter the room ID and shared password</p>

        <div className="field">
          <label>Room ID</label>
          <input
            placeholder="e.g. myroom42"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            autoFocus={!roomId}
          />
        </div>

        <div className="field">
          <label>Room password</label>
          <input
            type="password"
            placeholder="Shared secret from room creator"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleJoin(); }}
            autoFocus={!!roomId}
          />
        </div>

        {error && <div className="error">{error}</div>}

        <button
          className="btn btn-primary"
          onClick={handleJoin}
          disabled={!roomId.trim() || !password.trim() || loading}
          style={{ marginTop: 6 }}
        >
          {loading ? 'Checking…' : 'Join room'}
        </button>

        <button className="btn btn-secondary" onClick={() => navigate('/ask')}>
          Back
        </button>

        <div className="enc-bar">
          <div className="status-dot" />
          Password derives encryption key locally · never transmitted in plaintext
        </div>
      </div>
    </div>
  );
}
