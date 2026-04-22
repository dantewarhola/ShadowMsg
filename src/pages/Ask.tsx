import { useNavigate } from 'react-router-dom';

export default function Ask() {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId') || 'anonymous';

  return (
    <div className="page">
      <div className="card">
        <div className="brand">
          <div className="brand-icon">🔐</div>
          <div className="brand-name">Secure<span>Chat</span></div>
        </div>

        <h1>Hello, {userId}</h1>
        <p className="subtitle">// what would you like to do?</p>

        <button
          className="btn-primary"
          onClick={() => navigate('/create')}
          style={{ marginBottom: 12 }}
        >
          Create a new room
        </button>

        <button
          className="btn-ghost"
          style={{ width: '100%', padding: '13px' }}
          onClick={() => navigate('/lobby')}
        >
          Browse existing rooms
        </button>

        <div className="divider">or</div>

        <button
          className="btn-ghost"
          style={{ width: '100%', padding: '13px' }}
          onClick={() => navigate('/join')}
        >
          Join with room ID
        </button>
      </div>
    </div>
  );
}
