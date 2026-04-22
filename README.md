# Cryptocurrency Dashboard

Real-time ETH exchange rate dashboard built with **Nx**, **NestJS**, and **React**.

Tracks live prices for `ETH/USDC`, `ETH/USDT`, and `ETH/BTC` via [Finnhub](https://finnhub.io), streams updates to the browser over WebSockets, and computes hourly averages.

---

## Project Structure

```
cryptocurrency-dashboard/
├── apps/
│   ├── backend/          # NestJS API + WebSocket gateway
│   └── frontend/         # React dashboard
├── libs/
│   └── shared-types/     # Shared TypeScript interfaces & constants
```

---

## Prerequisites

- Node.js 22+
- npm 10+
- A free [Finnhub API key](https://finnhub.io/register)

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

**Backend**

```bash
cp apps/backend/.env.example apps/backend/.env
# Edit apps/backend/.env and set your FINNHUB_API_KEY
```

**Frontend** (optional — defaults to `http://localhost:3000`)

```bash
cp apps/frontend/.env.example apps/frontend/.env
```

### 3. Run both services

In two separate terminals:

```bash
# Terminal 1 — backend (port 3000)
npx nx serve backend

# Terminal 2 — frontend (port 4200)
npx nx serve frontend
```

Open [http://localhost:4200](http://localhost:4200).

---

## Obtaining a Finnhub API Key

1. Sign up at [https://finnhub.io/register](https://finnhub.io/register) (free tier, no credit card).
2. Copy the API key from your dashboard.
3. Paste it in `apps/backend/.env`:
   ```
   FINNHUB_API_KEY=your_key_here
   ```

The free tier supports up to 60 API requests/minute, which is sufficient for 3 subscribed symbols.

---

## Running Tests

```bash
# All backend unit tests
npx nx test backend

# Or with coverage
npx nx test backend --coverage
```

---

## Architecture

### Backend

- **`FinnhubService`** — Opens a WebSocket connection to `wss://ws.finnhub.io`, subscribes to `BINANCE:ETHUSDC`, `BINANCE:ETHUSDT`, `BINANCE:ETHBTC`. Implements exponential back-off reconnection (5 s → 60 s cap).
- **`PriceStoreService`** — In-memory ring buffer (max 3 600 data points per pair). Computes hourly averages via `@nestjs/schedule` every hour using only the last 60-minute window.
- **`CryptoGateway`** — Socket.IO gateway that broadcasts price ticks, hourly averages, and connection status events to all connected browser clients. Sends a snapshot of the latest price + history to each new client on connect.

### Frontend

- **`useCryptoDashboard`** hook — Manages the Socket.IO connection lifecycle and merges incoming events into per-pair state.
- **`PairCard`** — Displays current price, last-update timestamp, hourly average, and a live `recharts` line chart for the last 60 data points.
- **`ConnectionBadge`** — Shows real-time connection status (`connecting / connected / disconnected / error`).

### Shared Library

`@cryptocurrency-dashboard/shared-types` contains all TypeScript interfaces, event name constants, currency pair definitions, and Finnhub symbol mappings shared between the two apps.

---

## Real-time Data Flow

```
Finnhub WSS ──► FinnhubService ──► PriceStoreService
                                         │
                                   CryptoGateway
                                         │
                              Socket.IO broadcast
                                         │
                               React useCryptoDashboard
                                         │
                                    PairCard (chart)
```
