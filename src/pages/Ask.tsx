import { useNavigate } from 'react-router-dom';
import MatrixRain from '../components/MatrixRain';
import { useTheme } from '../lib/theme';
import Logo from '../components/LogoMark';

export default function Ask() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const userId = localStorage.getItem('userId') || 'anon';

  return (
    <>
      <MatrixRain />
      <nav className="nav">
        <div className="nav-brand">
          <Logo size={22} />
          CipherChat
        </div>
        <div className="nav-right">
          <button className="theme-toggle" onClick={toggle}>{theme === 'dark' ? '☀' : '☾'}</button>
          <span className="nav-tag">{userId}</span>
        </div>
      </nav>

      <div className="auth-page">
        <div className="auth-box">
          <div className="auth-header">
            <div className="auth-title">Hey, <span className="g">{userId}</span></div>
            <div className="auth-desc">create a room or join an existing one</div>
          </div>

          <div className="btn-stack">
            <button className="btn-primary" onClick={() => navigate('/create')}>
              + Create Room
            </button>
            <button className="btn-outline" onClick={() => navigate('/lobby')}>
              Browse Rooms
            </button>
            <div className="or-row">or</div>
            <button className="btn-outline" onClick={() => navigate('/join')}>
              Join with Room ID
            </button>
          </div>

          <div className="enc-footer">
            <div className="dot" />
            All rooms are end-to-end encrypted. Messages are ephemeral — they vanish when you leave.
          </div>
        </div>
      </div>
    </>
  );
}
