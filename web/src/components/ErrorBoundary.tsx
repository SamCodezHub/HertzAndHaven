import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 12, background: '#E9F0F4', color: '#243B4B' }}>
          <h1 style={{ fontSize: 32, fontWeight: 700 }}>Something went wrong</h1>
          <p style={{ color: '#4F6a7e' }}>Please refresh the page.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
