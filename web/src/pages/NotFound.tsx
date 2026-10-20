import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 12, background: '#E9F0F4', color: '#243B4B' }}>
      <h1 style={{ fontSize: 48, fontWeight: 700 }}>404</h1>
      <p style={{ color: '#4F6a7e' }}>This page doesn't exist.</p>
      <Link to="/" style={{ color: '#5D7F94', fontWeight: 600 }}>Back home</Link>
    </div>
  );
}
