import { ConnectionStatus } from '@cryptocurrency-dashboard/shared-types';

const CONFIG: Record<ConnectionStatus['status'], { label: string; color: string; dot: string }> = {
  connecting: { label: 'Connecting', color: '#f59e0b', dot: '#fbbf24' },
  connected: { label: 'Connected', color: '#10b981', dot: '#34d399' },
  disconnected: { label: 'Disconnected', color: '#6b7280', dot: '#9ca3af' },
  error: { label: 'Error', color: '#ef4444', dot: '#f87171' },
};

interface Props {
  status: ConnectionStatus;
}

export function ConnectionBadge({ status }: Props) {
  const cfg = CONFIG[status.status];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: cfg.dot,
          display: 'inline-block',
          animation: status.status === 'connecting' ? 'pulse 1.2s infinite' : 'none',
        }}
      />
      <span style={{ color: cfg.color, fontWeight: 600, fontSize: 14 }}>{cfg.label}</span>
      {status.message && (
        <span style={{ color: '#9ca3af', fontSize: 12 }}>— {status.message}</span>
      )}
    </div>
  );
}
