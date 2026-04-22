import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { deriveKeyFromPassword, encryptMessage, decryptMessage } from '../lib/crypto';

interface ChatMessage {
  id: string;
  type: 'own' | 'other' | 'system';
  sender: string;
  text: string;
  time: string;
}

function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Chat() {
  const navigate = useNavigate();
  const roomId = sessionStorage.getItem('roomId') || '';
  const password = sessionStorage.getItem('roomPassword') || '';
  const userId = localStorage.getItem('userId') || 'anonymous';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [key, setKey] = useState<Uint8Array | null>(null);
  const [memberCount, setMemberCount] = useState(1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Redirect if no session
  useEffect(() => {
    if (!roomId || !password) {
      navigate('/');
    }
  }, [roomId, password, navigate]);

  // Derive encryption key from password
  useEffect(() => {
    if (!password) return;
    deriveKeyFromPassword(password).then(setKey);
  }, [password]);

  // Add presence + realtime messaging via Supabase
  useEffect(() => {
    if (!key || !roomId) return;

    // Announce join
    const addSystemMsg = (text: string) => {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        type: 'system',
        sender: 'system',
        text,
        time: now(),
      }]);
    };

    addSystemMsg('🔒 End-to-end encrypted channel established.');

    const channel = supabase.channel(`room:${roomId}`, {
      config: { presence: { key: userId } }
    });

    channelRef.current = channel;

    // Listen for encrypted messages broadcast
    channel.on('broadcast', { event: 'encrypted_message' }, ({ payload }) => {
      if (payload.sender === userId) return; // already shown locally
      try {
        const text = decryptMessage(payload.cipher, payload.nonce, key);
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          type: 'other',
          sender: payload.sender,
          text,
          time: now(),
        }]);
      } catch {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          type: 'other',
          sender: payload.sender,
          text: '[Decryption failed — wrong password?]',
          time: now(),
        }]);
      }
    });

    // Presence tracking
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const count = Object.keys(state).length;
      setMemberCount(count);
    });

    channel.on('presence', { event: 'join' }, ({ key: joinedKey }) => {
      if (joinedKey !== userId) {
        addSystemMsg(`${joinedKey} joined the room.`);
      }
    });

    channel.on('presence', { event: 'leave' }, ({ key: leftKey }) => {
      addSystemMsg(`${leftKey} left the room.`);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user: userId, online_at: new Date().toISOString() });
        // Increment member count in DB
        await supabase.rpc('increment_member_count', { p_room_id: roomId });
      }
    });

    return () => {
      supabase.rpc('decrement_member_count', { p_room_id: roomId });
      supabase.removeChannel(channel);
    };
  }, [key, roomId, userId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(() => {
    if (!key || !input.trim() || !channelRef.current) return;
    const text = input.trim();
    setInput('');

    const { nonce, cipher } = encryptMessage(text, key);

    // Show locally immediately
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      type: 'own',
      sender: userId,
      text,
      time: now(),
    }]);

    // Broadcast encrypted payload (no plaintext hits the server)
    channelRef.current.send({
      type: 'broadcast',
      event: 'encrypted_message',
      payload: { sender: userId, nonce, cipher },
    });
  }, [key, input, userId]);

  const handleLeave = async () => {
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
    }
    sessionStorage.removeItem('roomId');
    sessionStorage.removeItem('roomPassword');
    navigate('/lobby');
  };

  return (
    <div className="chat-layout">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          <div className="online-indicator" />
          <div className="chat-header-info">
            <h3># {roomId}</h3>
            <p>{memberCount} connected · You: {userId}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="tag">E2EE</span>
          <button className="btn-danger" onClick={handleLeave}>Leave</button>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div style={{ color: 'var(--text-dim)', fontFamily: 'var(--mono)', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
            Waiting for messages… Share the Room ID and password with your contact.
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`msg ${m.type}`}>
            {m.type !== 'system' && (
              <div className="msg-sender">{m.type === 'own' ? 'You' : m.sender}</div>
            )}
            <div className="msg-bubble">{m.text}</div>
            {m.type !== 'system' && (
              <div className="msg-time">{m.time}</div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="chat-input-area">
        <input
          placeholder={key ? 'Type a message… (Enter to send)' : 'Deriving encryption key…'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={!key}
          autoFocus
        />
        <button
          className="send-btn"
          onClick={handleSend}
          disabled={!key || !input.trim()}
        >
          Send →
        </button>
      </div>
    </div>
  );
}
