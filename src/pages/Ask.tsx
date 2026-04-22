import { useNavigate } from 'react-router-dom';
import LogoMark from '../components/LogoMark';

export default function Ask() {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId') || 'anonymous';

  return (
    <div className="page">
      <div className="card">
        <div className="logo">
          <LogoMark size={32} />
          <div className="logo-name">Cipher<em>Chat</em></div>
        </div>

        <h1>Hello, {userId}</h1>
        <p className="sub">// what would you like to do?</p>

        <button className="btn btn-primary" onClick={() => navigate('/create')}>
          Create a room
        </button>

        <button className="btn btn-secondary" onClick={() => navigate('/lobby')}>
          Browse rooms
        </button>

        <div className="divider">or</div>

        <button className="btn btn-secondary" style={{ marginTop: 0 }} onClick={() => navigate('/join')}>
          Join with room ID
        </button>
      </div>
    </div>
  );
}
