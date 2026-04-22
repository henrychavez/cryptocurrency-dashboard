# WebSocket Flows

The system uses **two independent WebSocket connections** with different roles:

| Connection | Direction | Protocol | Purpose |
|---|---|---|---|
| Finnhub WSS | Backend → Finnhub | Native WebSocket (`ws`) | Receive live trade prices |
| Socket.IO | Browser → Backend | Socket.IO over WS | Stream prices to the UI |

---

## Connection 1 — Backend ↔ Finnhub

The backend is the **client**. It opens one persistent connection and subscribes to three symbols.

### Startup sequence

```mermaid
sequenceDiagram
    participant BE as Backend (FinnhubService)
    participant FH as Finnhub WSS

    BE->>FH: connect wss://ws.finnhub.io?token=KEY
    FH-->>BE: open
    BE->>FH: {"type":"subscribe","symbol":"BINANCE:ETHUSDC"}
    BE->>FH: {"type":"subscribe","symbol":"BINANCE:ETHUSDT"}
    BE->>FH: {"type":"subscribe","symbol":"BINANCE:ETHBTC"}
    Note over BE,FH: Connection is now live
```

### Receiving a price tick

```mermaid
sequenceDiagram
    participant FH as Finnhub WSS
    participant FS as FinnhubService
    participant PS as PriceStoreService
    participant GW as CryptoGateway

    FH->>FS: {"type":"trade","data":[{"s":"BINANCE:ETHUSDC","p":1854.23,"t":1714000000000}]}
    FS->>FS: handleMessage() — parse & map symbol → CurrencyPair
    FS->>PS: addPrice({ pair:"ETH/USDC", price:1854.23, timestamp:... })
    FS->>GW: onPrice callback fires
    GW->>GW: server.emit("price_update", ticker)
    Note over GW: Broadcasts to ALL connected browsers
```

### Reconnection logic

```mermaid
stateDiagram-v2
    [*] --> Connecting
    Connecting --> Connected : open event
    Connected --> Disconnected : close / error event
    Disconnected --> Connecting : setTimeout(reconnectDelay)\ndelay doubles each attempt\n(5s → 10s → 20s → … → 60s cap)
    Connecting --> Disconnected : error event
```

Reconnection is handled entirely inside `FinnhubService`. The `CryptoGateway` and browsers are unaffected — they receive a `connection_status` event and continue waiting for the next tick.

---

## Connection 2 — Browser ↔ Backend (Socket.IO)

The backend is the **server**. Each browser tab opens its own Socket.IO connection.

### New client connects

```mermaid
sequenceDiagram
    participant BR as Browser (useCryptoDashboard)
    participant GW as CryptoGateway
    participant PS as PriceStoreService

    BR->>GW: socket.io connect
    GW->>GW: handleConnection(client)
    loop for each CurrencyPair
        GW->>PS: getLatestPrice(pair)
        PS-->>GW: TickerPrice | null
        GW-->>BR: emit("price_update", ticker)

        GW->>PS: getPriceHistory(pair)
        PS-->>GW: TickerPrice[]
        GW-->>BR: emit("price_history", { pair, history })

        GW->>PS: getLastHourlyAverage(pair)
        PS-->>GW: HourlyAverage | null
        GW-->>BR: emit("hourly_average", avg)
    end
    Note over BR: UI populated immediately, no blank state
```

### Live price broadcast

```mermaid
sequenceDiagram
    participant FH as Finnhub WSS
    participant FS as FinnhubService
    participant GW as CryptoGateway
    participant B1 as Browser 1
    participant B2 as Browser 2

    FH->>FS: trade message
    FS->>GW: onPrice callback
    GW->>B1: server.emit("price_update", ticker)
    GW->>B2: server.emit("price_update", ticker)
    Note over B1,B2: All tabs updated simultaneously
```

### Hourly average broadcast

```mermaid
sequenceDiagram
    participant SC as @Cron (every hour)
    participant PS as PriceStoreService
    participant GW as CryptoGateway
    participant BR as All Browsers

    SC->>PS: computeHourlyAverages()
    loop for each pair with data in last 60 min
        PS->>PS: filter prices, compute mean
        PS->>PS: persist to lastHourlyAverage
        PS->>GW: onHourlyAverage callback
        GW->>BR: server.emit("hourly_average", avg)
    end
```

---

## Connection States (Browser Side)

The `ConnectionBadge` component reflects the status managed by `useCryptoDashboard`:

```mermaid
stateDiagram-v2
    [*] --> connecting : hook mounts, socket.io tries to connect
    connecting --> connected : socket "connect" event
    connected --> disconnected : socket "disconnect" event
    disconnected --> connecting : socket.io auto-reconnects
    connecting --> error : socket "connect_error" event
    error --> connecting : socket.io retries
    connected --> error : backend emits connection_status{status:"error"}\n(e.g. Finnhub key missing)
```

Note: `connecting` / `connected` / `disconnected` are driven by the **Socket.IO** connection between browser and backend. The separate `error` state from Finnhub is forwarded by the backend as a `connection_status` event and overlaid on top.

---

## Why Two Separate WebSocket Libraries

| Concern | Finnhub side (`ws`) | Browser side (`socket.io`) |
|---|---|---|
| Role | Client only | Server |
| Protocol | Raw WebSocket | WebSocket + HTTP polling fallback |
| Auto-reconnect | Manual (exponential backoff) | Built-in |
| Multiplexing | Not needed | Namespaces / rooms available |
| Message format | JSON strings | JSON with event names |

Using `ws` on the Finnhub side keeps the dependency minimal — there's no need for Socket.IO's server features when acting as a pure client.
