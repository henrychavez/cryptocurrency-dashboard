import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  ConnectionStatus,
  CURRENCY_PAIRS,
  CurrencyPair,
  HourlyAverage,
  PairState,
  TickerPrice,
  WEBSOCKET_EVENTS,
} from '@cryptocurrency-dashboard/shared-types';

const BACKEND_URL = import.meta.env['VITE_BACKEND_URL'] ?? 'http://localhost:3000';
const MAX_HISTORY_POINTS = 60;

function buildInitialState(): Record<CurrencyPair, PairState> {
  return Object.fromEntries(
    CURRENCY_PAIRS.map((pair) => [
      pair,
      { pair, currentPrice: null, lastUpdated: null, hourlyAverage: null, priceHistory: [] },
    ]),
  ) as unknown as Record<CurrencyPair, PairState>;
}

export function useCryptoDashboard() {
  const [pairStates, setPairStates] = useState<Record<CurrencyPair, PairState>>(buildInitialState);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'connecting',
  });
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(BACKEND_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnectionStatus({ status: 'connected' }));
    socket.on('disconnect', () => setConnectionStatus({ status: 'disconnected' }));
    socket.on('connect_error', (err) =>
      setConnectionStatus({ status: 'error', message: err.message }),
    );

    socket.on(WEBSOCKET_EVENTS.CONNECTION_STATUS, (status: ConnectionStatus) => {
      setConnectionStatus(status);
    });

    socket.on(WEBSOCKET_EVENTS.PRICE_UPDATE, (ticker: TickerPrice) => {
      setPairStates((prev) => {
        const state = prev[ticker.pair];
        const history = [...state.priceHistory, ticker].slice(-MAX_HISTORY_POINTS);
        return {
          ...prev,
          [ticker.pair]: {
            ...state,
            currentPrice: ticker.price,
            lastUpdated: ticker.timestamp,
            priceHistory: history,
          },
        };
      });
    });

    socket.on('price_history', ({ pair, history }: { pair: CurrencyPair; history: TickerPrice[] }) => {
      setPairStates((prev) => ({
        ...prev,
        [pair]: { ...prev[pair], priceHistory: history.slice(-MAX_HISTORY_POINTS) },
      }));
    });

    socket.on(WEBSOCKET_EVENTS.HOURLY_AVERAGE, (avg: HourlyAverage) => {
      setPairStates((prev) => ({
        ...prev,
        [avg.pair]: { ...prev[avg.pair], hourlyAverage: avg.average },
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { pairStates, connectionStatus };
}
