import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { deriveKeyFromPassword, encryptMessage, decryptMessage } from '../lib/crypto';
import MatrixRain from '../components/MatrixRain';
import Logo from '../components/LogoMark';

interface Msg { id: string; type: 'own' | 'other' | 'sys'; sender: string; text: string; time: string; }

const ts = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function Chat() {
  const navigate   = useNavigate();
  const roomId     = sessionStorage.getItem('roomId') || '';
  const password   = sessionStorage.getItem('roomPassword') || '';
  const userId     = localStorage.getItem('userId') || 'anon';

  const [messages, setMessages]       = useState<Msg[]>([]);
  const [input, setInput]             = useState('');
  const [key, setKey]                 = useState<Uint8Array | null>(null);
  const [memberCount, setMemberCount] = useState(1);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => { if (!roomId || !password) navigate('/'); }, []);
  useEffect(() => { if (password) deriveKeyFromPassword(password).then(setKey); }, [password]);

  useEffect(() => {
    if (!key || !roomId) return;

    const sys = (text: string) =>
      setMessages(p => [...p, { id: crypto.randomUUID(), type: 'sys', sender: 'sys', text, time: ts() }]);

    sys('🔒 Encrypted session started');

    const ch = supabase.channel(`room:${roomId}`, { config: { presence: { key: userId } } });
    channelRef.current = ch;

    ch.on('broadcast', { event: 'msg' }, ({ payload }) => {
      if (payload.sender === userId) return;
      try {
        const text = decryptMessage(payload.cipher, payload.nonce, key);
        setMessages(p => [...p, { id: crypto.randomUUID(), type: 'other', sender: payload.sender, text, time: ts() }]);
      } catch {
        setMessages(p => [...p, { id: crypto.randomUUID(), type: 'other', sender: payload.sender, text: '[decryption failed]', time: ts() }]);
      }
    });

    ch.on('presence', { event: 'sync' }, () => setMemberCount(Object.keys(ch.presenceState()).length));
    ch.on('presence', { event: 'join' }, ({ key: k }) => { if (k !== userId) sys(`${k} joined`); });
    ch.on('presence', { event: 'leave' }, ({ key: k }) => sys(`${k} left`));

    ch.subscribe(async (s) => {
      if (s === 'SUBSCRIBED') {
        await ch.track({ user: userId, at: Date.now() });
        await supabase.rpc('increment_member_count', { p_room_id: roomId });
      }
    });

    return () => {
      supabase.rpc('decrement_member_count', { p_room_id: roomId });
      supabase.removeChannel(ch);
    };
  }, [key, roomId, userId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = useCallback(() => {
    if (!key || !input.trim() || !channelRef.current) return;
    const text = input.trim();
    setInput('');
    const { nonce, cipher } = encryptMessage(text, key);
    setMessages(p => [...p, { id: crypto.randomUUID(), type: 'own', sender: userId, text, time: ts() }]);
    channelRef.current.send({ type: 'broadcast', event: 'msg', payload: { sender: userId, nonce, cipher } });
  }, [key, input, userId]);

  const leave = async () => {
    await supabase.rpc('decrement_member_count', { p_room_id: roomId });
    if (channelRef.current) { await supabase.removeChannel(channelRef.current); channelRef.current = null; }
    sessionStorage.removeItem('roomId');
    sessionStorage.removeItem('roomPassword');
    navigate('/lobby');
  };

  return (
    <>
      <MatrixRain />
      <div className="chat-layout">
        <nav className="chat-nav">
          <div className="chat-nav-left">
            <div className="online-dot" />
            <Logo size={20} />
            <div>
              <div className="chat-room-name">#{roomId}</div>
              <div className="chat-room-meta">{memberCount} connected · you are {userId}</div>
            </div>
          </div>
          <div className="chat-nav-right">
            <div className="e2ee-badge">
              <div className="online-dot" style={{ width: 5, height: 5 }} />
              E2EE
            </div>
            <button className="btn-danger" onClick={leave}>Leave</button>
          </div>
        </nav>

        <div className="chat-messages">
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: 60, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)', lineHeight: 2 }}>
              No messages yet.<br />
              <span style={{ fontSize: 10, opacity: 0.5 }}>Share the room ID and password with your contact.</span>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`msg ${m.type}`}>
              {m.type !== 'sys' && <div className="msg-sender">{m.type === 'own' ? 'you' : m.sender}</div>}
              <div className="msg-bubble">{m.text}</div>
              {m.type !== 'sys' && <div className="msg-time">{m.time}</div>}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="chat-input-area">
          <input
            placeholder={key ? 'Type a message…' : 'Deriving key…'}
            value={input}
            disabled={!key}
            autoFocus
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
          <button className="btn-send" onClick={send} disabled={!key || !input.trim()}>
            Send
          </button>
        </div>
      </div>
    </>
  );
}
