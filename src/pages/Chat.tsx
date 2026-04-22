import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { deriveKeyFromPassword, encryptMessage, decryptMessage } from '../lib/crypto';
import LogoMark from '../components/LogoMark';

interface ChatMessage {
  id: string;
  type: 'own' | 'other' | 'sys';
  sender: string;
  text: string;
  time: string;
}

function ts() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Chat() {
  const navigate = useNavigate();
  const roomId   = sessionStorage.getItem('roomId') || '';
  const password = sessionStorage.getItem('roomPassword') || '';
  const userId   = localStorage.getItem('userId') || 'anonymous';

  const [messages, setMessages]     = useState<ChatMessage[]>([]);
  const [input, setInput]           = useState('');
  const [key, setKey]               = useState<Uint8Array | null>(null);
  const [memberCount, setMemberCount] = useState(1);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!roomId || !password) navigate('/');
  }, [roomId, password, navigate]);

  useEffect(() => {
    if (!password) return;
    deriveKeyFromPassword(password).then(setKey);
  }, [password]);

  useEffect(() => {
    if (!key || !roomId) return;

    const addSys = (text: string) =>
      setMessages(prev => [...prev, { id: crypto.randomUUID(), type: 'sys', sender: 'sys', text, time: ts() }]);

    addSys('🔒 End-to-end encrypted session started');

    const channel = supabase.channel(`room:${roomId}`, {
      config: { presence: { key: userId } }
    });
    channelRef.current = channel;

    channel.on('broadcast', { event: 'msg' }, ({ payload }) => {
      if (payload.sender === userId) return;
      try {
        const text = decryptMessage(payload.cipher, payload.nonce, key);
        setMessages(prev => [...prev, { id: crypto.randomUUID(), type: 'other', sender: payload.sender, text, time: ts() }]);
      } catch {
        setMessages(prev => [...prev, { id: crypto.randomUUID(), type: 'other', sender: payload.sender, text: '[decryption failed]', time: ts() }]);
      }
    });

    channel.on('presence', { event: 'sync' }, () => {
      setMemberCount(Object.keys(channel.presenceState()).length);
    });

    channel.on('presence', { event: 'join' }, ({ key: k }) => {
      if (k !== userId) addSys(`${k} joined`);
    });

    channel.on('presence', { event: 'leave' }, ({ key: k }) => {
      addSys(`${k} left`);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user: userId, online_at: new Date().toISOString() });
        await supabase.rpc('increment_member_count', { p_room_id: roomId });
      }
    });

    return () => {
      supabase.rpc('decrement_member_count', { p_room_id: roomId });
      supabase.removeChannel(channel);
    };
  }, [key, roomId, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(() => {
    if (!key || !input.trim() || !channelRef.current) return;
    const text = input.trim();
    setInput('');
    const { nonce, cipher } = encryptMessage(text, key);
    setMessages(prev => [...prev, { id: crypto.randomUUID(), type: 'own', sender: userId, text, time: ts() }]);
    channelRef.current.send({ type: 'broadcast', event: 'msg', payload: { sender: userId, nonce, cipher } });
  }, [key, input, userId]);

  const handleLeave = async () => {
    await supabase.rpc('decrement_member_count', { p_room_id: roomId });
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    sessionStorage.removeItem('roomId');
    sessionStorage.removeItem('roomPassword');
    navigate('/lobby');
  };

  return (
    <div className="chat">
      <nav className="chat-nav">
        <div className="chat-nav-l">
          <div className="online-dot" />
          <LogoMark size={24} />
          <div>
            <div className="chat-room">#{roomId}</div>
            <div className="chat-meta">{memberCount} connected · you: {userId}</div>
          </div>
        </div>
        <div className="chat-nav-r">
          <span className="badge"><span className="status-dot" />E2EE</span>
          <button className="btn-danger-sm" onClick={handleLeave}>Leave</button>
        </div>
      </nav>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div style={{ color: 'var(--text2)', fontFamily: 'var(--mono)', fontSize: 12, textAlign: 'center', marginTop: 48 }}>
            Waiting for messages · share the room ID and password with your contact
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`msg ${m.type}`}>
            {m.type !== 'sys' && (
              <div className="msg-label">{m.type === 'own' ? 'you' : m.sender}</div>
            )}
            <div className="msg-bubble">{m.text}</div>
            {m.type !== 'sys' && <div className="msg-time">{m.time}</div>}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-bar">
        <input
          placeholder={key ? 'Type a message…' : 'Deriving key…'}
          value={input}
          disabled={!key}
          autoFocus
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
        />
        <button
          className="btn-send"
          onClick={handleSend}
          disabled={!key || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
