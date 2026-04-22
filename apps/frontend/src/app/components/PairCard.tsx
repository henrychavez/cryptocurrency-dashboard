import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { CurrencyPair, PairState } from '@cryptocurrency-dashboard/shared-types';

const PAIR_COLORS: Record<CurrencyPair, string> = {
  'ETH/USDC': '#6366f1',
  'ETH/USDT': '#10b981',
  'ETH/BTC': '#f59e0b',
};

function formatPrice(pair: CurrencyPair, price: number | null): string {
  if (price === null) return '—';
  if (pair === 'ETH/BTC') return price.toFixed(6);
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatTime(ts: number | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString();
}

interface Props {
  state: PairState;
}

export function PairCard({ state }: Props) {
  const color = PAIR_COLORS[state.pair];
  const chartData = state.priceHistory.map((p) => ({
    time: new Date(p.timestamp).toLocaleTimeString(),
    price: p.price,
  }));

  return (
    <div
      style={{
        background: '#1e1e2e',
        borderRadius: 12,
        padding: 24,
        border: `1px solid ${color}33`,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0, color, fontSize: 20, fontWeight: 700 }}>{state.pair}</h2>
          <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: 13 }}>
            Last update: {formatTime(state.lastUpdated)}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#f1f5f9' }}>
            {formatPrice(state.pair, state.currentPrice)}
          </p>
          {state.hourlyAverage !== null && (
            <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: 13 }}>
              Hourly avg: {formatPrice(state.pair, state.hourlyAverage)}
            </p>
          )}
        </div>
      </div>

      {chartData.length > 1 ? (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3d" />
            <XAxis
              dataKey="time"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fill: '#6b7280', fontSize: 10 }}
              width={70}
            />
            <Tooltip
              contentStyle={{ background: '#2d2d3d', border: 'none', borderRadius: 8 }}
              labelStyle={{ color: '#9ca3af' }}
              itemStyle={{ color }}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke={color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div
          style={{
            height: 160,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#4b5563',
            fontSize: 14,
          }}
        >
          Waiting for data...
        </div>
      )}
    </div>
  );
}
