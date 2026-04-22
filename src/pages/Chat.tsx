import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { deriveKeyFromPassword, encryptMessage, decryptMessage } from '../lib/crypto';
import MatrixRain from '../components/MatrixRain';
import Logo from '../components/LogoMark';

interface Msg { id: string; type: 'own' | 'other' | 'sys'; sender: string; text: string; time: string; }

const ts = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const HEARTBEAT_MS = 10000; // send a ping every 10s
const DEAD_MS      = 32000; // if no ping for 32s, consider gone

export default function Chat() {
  const navigate = useNavigate();
  const roomId   = sessionStorage.getItem('roomId') || '';
  const password = sessionStorage.getItem('roomPassword') || '';
  const userId   = localStorage.getItem('userId') || 'anon';

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput]       = useState('');
  const [key, setKey]           = useState<Uint8Array | null>(null);
  const [members, setMembers]   = useState<string[]>([]);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const channelRef  = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const hbSendRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const hbCheckRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSeenRef = useRef<Record<string, number>>({});
  // Keep roomId/userId accessible inside event listeners without stale closure
  const roomIdRef  = useRef(roomId);
  const userIdRef  = useRef(userId);

  useEffect(() => { if (!roomId || !password) navigate('/'); }, []);
  useEffect(() => { if (password) deriveKeyFromPassword(password).then(setKey); }, [password]);

  // ── sendBeacon helper — the ONLY reliable exit on iOS Safari ──
  const beaconLeave = useCallback(() => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/leave_room`;
    const body = JSON.stringify({ p_room_id: roomIdRef.current, p_user_id: userIdRef.current });
    // sendBeacon survives page kill / swipe-away on mobile
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
    }
  }, []);

  useEffect(() => {
    if (!key || !roomId) return;

    const sys = (text: string) =>
      setMessages(p => [...p, { id: crypto.randomUUID(), type: 'sys', sender: 'sys', text, time: ts() }]);

    sys('🔒 Encrypted session started');

    const ch = supabase.channel(`room:${roomId}`, { config: { presence: { key: userId } } });
    channelRef.current = ch;

    // ── MESSAGES ──
    ch.on('broadcast', { event: 'msg' }, ({ payload }) => {
      if (payload.sender === userId) return;
      try {
        const text = decryptMessage(payload.cipher, payload.nonce, key);
        setMessages(p => [...p, { id: crypto.randomUUID(), type: 'other', sender: payload.sender, text, time: ts() }]);
      } catch {
        setMessages(p => [...p, { id: crypto.randomUUID(), type: 'other', sender: payload.sender, text: '[decryption failed]', time: ts() }]);
      }
    });

    // ── HEARTBEAT receive — record when we last heard from each user ──
    ch.on('broadcast', { event: 'hb' }, ({ payload }) => {
      if (payload.u) lastSeenRef.current[payload.u] = Date.now();
    });

    // ── PRESENCE — drives the member name display ──
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState<{ user: string }>();
      const names = Object.values(state).flat().map((p) => p.user);
      setMembers(names);
      supabase.from('rooms')
        .update({ members: names, member_count: names.length })
        .eq('room_id', roomId);
    });

    ch.on('presence', { event: 'join' }, ({ key: k }) => { if (k !== userId) sys(`${k} joined`); });
    ch.on('presence', { event: 'leave' }, ({ key: k }) => { sys(`${k} left`); });

    ch.subscribe(async (status) => {
      if (status !== 'SUBSCRIBED') return;

      await ch.track({ user: userId, at: Date.now() });
      await supabase.rpc('join_room', { p_room_id: roomId, p_user_id: userId });

      // Seed our own last-seen
      lastSeenRef.current[userId] = Date.now();

      // ── HEARTBEAT send — broadcast our ping every 10s ──
      hbSendRef.current = setInterval(() => {
        lastSeenRef.current[userId] = Date.now();
        ch.send({ type: 'broadcast', event: 'hb', payload: { u: userId } });
      }, HEARTBEAT_MS);

      // ── HEARTBEAT check — every 15s, evict users we haven't heard from ──
      hbCheckRef.current = setInterval(async () => {
        const now = Date.now();
        for (const [uid, last] of Object.entries(lastSeenRef.current)) {
          if (uid === userId) continue;
          if (now - last > DEAD_MS) {
            delete lastSeenRef.current[uid];
            sys(`${uid} disconnected`);
            // Force-remove from DB in case their beacon didn't fire
            await supabase.rpc('leave_room', { p_room_id: roomId, p_user_id: uid });
          }
        }
      }, 15000);
    });

    // ── visibilitychange — fires when iOS Safari is swiped away ──
    // Use sendBeacon because async fetch won't complete after the page is killed
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') beaconLeave();
    };

    // ── pagehide — fires on iOS when Safari kills the page entirely ──
    const onPageHide = () => beaconLeave();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);

    const cleanupAll = async () => {
      if (hbSendRef.current)  clearInterval(hbSendRef.current);
      if (hbCheckRef.current) clearInterval(hbCheckRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      await supabase.rpc('leave_room', { p_room_id: roomId, p_user_id: userId });
      supabase.removeChannel(ch);
    };

    return () => { cleanupAll(); };
  }, [key, roomId, userId, beaconLeave]);

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
    if (hbSendRef.current)  clearInterval(hbSendRef.current);
    if (hbCheckRef.current) clearInterval(hbCheckRef.current);
    await supabase.rpc('leave_room', { p_room_id: roomId, p_user_id: userId });
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
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
              <div className="chat-room-meta">
                {members.length > 0
                  ? members.map((m, i) => (
                      <span key={m}>
                        <span style={{ color: m === userId ? 'var(--green)' : 'var(--text2)' }}>
                          {m === userId ? `${m} (you)` : m}
                        </span>
                        {i < members.length - 1 && <span style={{ color: 'var(--text3)' }}>, </span>}
                      </span>
                    ))
                  : `you are ${userId}`}
              </div>
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
