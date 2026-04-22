import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import LogoMark from '../components/LogoMark';

interface RoomInfo {
  room_id: string;
  capacity: number;
  member_count: number;
}

export default function Lobby() {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchRooms = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('rooms')
      .select('room_id, capacity, member_count')
      .order('created_at', { ascending: false });
    if (!error && data) setRooms(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms();
    const channel = supabase
      .channel('rooms-lobby')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, fetchRooms)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="lobby">
      <nav className="lobby-nav">
        <div className="logo" style={{ marginBottom: 0 }}>
          <LogoMark size={28} />
          <div className="logo-name">Cipher<em>Chat</em></div>
        </div>
        <div className="lobby-nav-r">
          <button className="btn-ghost-sm" onClick={fetchRooms}>Refresh</button>
          <button className="btn-new" onClick={() => navigate('/create')}>+ New room</button>
        </div>
      </nav>

      <div className="lobby-body">
        <div className="section-label">Active rooms</div>

        {loading ? (
          <div className="empty">
            <p style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>Loading…</p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="empty">
            <svg className="empty-icon" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 40, height: 40, margin: '0 auto 14px', display: 'block' }}>
              <rect x="8" y="16" width="32" height="24" rx="3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M16 16V12C16 9.79 17.79 8 20 8H28C30.21 8 32 9.79 32 12V16" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="24" cy="27" r="3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M24 30V34" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <p>No rooms yet.</p>
            <p style={{ marginTop: 8 }}>
              <button className="link-btn" onClick={() => navigate('/create')}>Create the first one</button>
            </p>
          </div>
        ) : (
          <div className="rooms-grid">
            {rooms.map((r) => (
              <div key={r.room_id} className="room-card">
                <div className="room-card-top">
                  <span className="room-name">{r.room_id}</span>
                  <span className={`pill ${r.member_count >= r.capacity ? 'pill-full' : 'pill-open'}`}>
                    {r.member_count >= r.capacity ? 'Full' : 'Open'}
                  </span>
                </div>
                <div className="room-meta">{r.member_count}/{r.capacity} connected</div>
                <div className="fill-bar">
                  <div className="fill-bar-inner" style={{ width: `${(r.member_count / r.capacity) * 100}%` }} />
                </div>
                <button
                  className="btn-join"
                  disabled={r.member_count >= r.capacity}
                  onClick={() => navigate(`/join/${r.room_id}`)}
                >
                  {r.member_count >= r.capacity ? 'Room full' : 'Join →'}
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <button className="btn-ghost-sm" onClick={() => navigate('/ask')}>← Back</button>
        </div>
      </div>
    </div>
  );
}
