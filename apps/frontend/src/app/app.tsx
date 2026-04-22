import { CURRENCY_PAIRS } from '@cryptocurrency-dashboard/shared-types';
import { ConnectionBadge } from './components/ConnectionBadge';
import { PairCard } from './components/PairCard';
import { useCryptoDashboard } from './hooks/useCryptoDashboard';

export function App() {
  const { pairStates, connectionStatus } = useCryptoDashboard();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0f0f1a',
        color: '#f1f5f9',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        padding: '32px 24px',
      }}
    >
      <header
        style={{
          maxWidth: 1200,
          margin: '0 auto 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>
            Crypto Dashboard
          </h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
            Real-time ETH exchange rates
          </p>
        </div>
        <ConnectionBadge status={connectionStatus} />
      </header>

      <main
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: 24,
        }}
      >
        {CURRENCY_PAIRS.map((pair) => (
          <PairCard key={pair} state={pairStates[pair]} />
        ))}
      </main>
    </div>
  );
}

export default App;
