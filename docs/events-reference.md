# Socket.IO Events Reference

All event names are defined as constants in `libs/shared-types/src/lib/shared-types.ts` under `WEBSOCKET_EVENTS` to avoid magic strings on both sides.

---

## Events emitted by the Backend → Browser

### `price_update`

Fired on every trade tick received from Finnhub. Also sent once per pair when a new client connects (snapshot).

**Payload:** `TickerPrice`

```ts
interface TickerPrice {
  pair: 'ETH/USDC' | 'ETH/USDT' | 'ETH/BTC';
  price: number;      // trade price in the quote currency
  timestamp: number;  // Unix milliseconds (from Finnhub)
}
```

**Example:**
```json
{
  "pair": "ETH/USDC",
  "price": 1854.23,
  "timestamp": 1714000000000
}
```

---

### `price_history`

Sent **only** when a new client connects. Delivers up to 60 recent data points per pair so the chart renders immediately.

**Payload:**
```ts
{
  pair: CurrencyPair;
  history: TickerPrice[];
}
```

**Example:**
```json
{
  "pair": "ETH/USDT",
  "history": [
    { "pair": "ETH/USDT", "price": 1850.10, "timestamp": 1714000000000 },
    { "pair": "ETH/USDT", "price": 1851.45, "timestamp": 1714000001000 }
  ]
}
```

---

### `hourly_average`

Fired once per hour by `PriceStoreService`'s cron job, for each pair that has data. Also sent once per pair on client connect if a previous average exists.

**Payload:** `HourlyAverage`

```ts
interface HourlyAverage {
  pair: CurrencyPair;
  average: number;      // mean price over the window
  periodStart: number;  // Unix ms — start of the 1-hour window
  periodEnd: number;    // Unix ms — end of the 1-hour window
  sampleCount: number;  // number of ticks included
}
```

**Example:**
```json
{
  "pair": "ETH/BTC",
  "average": 0.051234,
  "periodStart": 1714000000000,
  "periodEnd": 1714003600000,
  "sampleCount": 3120
}
```

---

### `connection_status`

Emitted whenever the backend's Finnhub connection changes state. Allows the UI to show whether live data is flowing even if the Socket.IO connection itself is healthy.

**Payload:** `ConnectionStatus`

```ts
interface ConnectionStatus {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  message?: string; // human-readable detail, present on 'error'
}
```

**Example:**
```json
{ "status": "error", "message": "FINNHUB_API_KEY not configured" }
```

---

## Events emitted by the Browser → Backend

### `request_snapshot`

The client can re-request the initial snapshot at any time (e.g. after a reconnect). The backend handler is registered via `@SubscribeMessage('request_snapshot')` in `CryptoGateway`.

**Payload:** none

---

## State machine on the frontend

```
socket event          React state update
────────────────────────────────────────────────────────────
connect             → connectionStatus = { status: 'connected' }
disconnect          → connectionStatus = { status: 'disconnected' }
connect_error       → connectionStatus = { status: 'error', message }
connection_status   → connectionStatus = payload
price_update        → pairStates[pair].currentPrice / lastUpdated / priceHistory
price_history       → pairStates[pair].priceHistory (initial seed)
hourly_average      → pairStates[pair].hourlyAverage
```

All state lives in `useCryptoDashboard`. Components only receive plain props — no direct Socket.IO calls outside the hook.

---

## Finnhub Symbol Mapping

```ts
// libs/shared-types/src/lib/shared-types.ts
const FINNHUB_SYMBOLS: Record<CurrencyPair, string> = {
  'ETH/USDC': 'BINANCE:ETHUSDC',
  'ETH/USDT': 'BINANCE:ETHUSDT',
  'ETH/BTC':  'BINANCE:ETHBTC',
};
```

The inverse map (symbol → pair) is built at startup in `FinnhubService` and used to route incoming trade messages to the correct buffer in `PriceStoreService`.
