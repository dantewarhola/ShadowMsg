import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

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

    // Subscribe to room changes
    const channel = supabase
      .channel('rooms-lobby')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, fetchRooms)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="lobby-page">
      <div className="lobby-header">
        <div className="brand">
          <div className="brand-icon">🔐</div>
          <div className="brand-name">Secure<span>Chat</span></div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-ghost" onClick={fetchRooms}>↻ Refresh</button>
          <button className="btn-primary" style={{ width: 'auto', padding: '10px 18px' }} onClick={() => navigate('/create')}>
            + New Room
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <p style={{ fontFamily: 'var(--mono)' }}>Loading rooms…</p>
        </div>
      ) : rooms.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔒</div>
          <p>No rooms yet.</p>
          <p style={{ marginTop: 8 }}>
            <button className="link-btn" onClick={() => navigate('/create')}>Create the first one →</button>
          </p>
        </div>
      ) : (
        <div className="lobby-grid">
          {rooms.map((r) => (
            <div key={r.room_id} className="room-card">
              <div className="room-card-header">
                <span className="room-id">{r.room_id}</span>
                <span className="tag">{r.member_count >= r.capacity ? 'FULL' : 'OPEN'}</span>
              </div>
              <div className="room-count">{r.member_count}/{r.capacity} connected</div>
              <div className="count-bar">
                <div
                  className="count-bar-fill"
                  style={{ width: `${(r.member_count / r.capacity) * 100}%` }}
                />
              </div>
              <button
                className="btn-primary"
                style={{ padding: '9px' }}
                disabled={r.member_count >= r.capacity}
                onClick={() => navigate(`/join/${r.room_id}`)}
              >
                {r.member_count >= r.capacity ? 'Room Full' : 'Join →'}
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ maxWidth: 720, margin: '24px auto 0' }}>
        <button className="btn-ghost" onClick={() => navigate('/ask')}>← Back</button>
      </div>
    </div>
  );
}
