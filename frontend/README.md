# NaviGuard Maritime AI - Frontend

Frontend interface, including customer chat widget and admin dashboard.

## Tech Stack

- **React** 18
- **Ant Design** 5
- **Vite** 5
- **React Router** 6
- **Axios**

## Quick Start

### Install Dependencies

```bash
npm install
```

### Start Development Server

```bash
npm run dev
```

Visit: http://localhost:5173

### Build for Production

```bash
npm run build
```

## Pages

### Customer Side

- **Home** (`/`) - Contains Chat Widget floating chat window
- Customers can chat with AI directly on the webpage

### Admin Dashboard

- **Customer List** (`/admin/customers`) - View all customers, sorted by priority
- **Conversation Details** (`/admin/conversations/:id`) - View specific customer's conversation history

## Features

### Chat Widget

- ✅ Floating chat button
- ✅ Real-time conversation
- ✅ Markdown rendering
- ✅ Message polling (5 seconds)
- ✅ Responsive design

### Admin Dashboard

- ✅ Customer list table
- ✅ Search and sort
- ✅ Customer category tags (high-value/normal/low-value)
- ✅ Conversation history timeline
- ✅ Confidence display

## Configuration

### Environment Variables

Create `.env` file:

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000/ws  # Used in V1.0
```

## Architecture Features

### Message Service Abstraction Layer

Uses adapter pattern for easy upgrade from HTTP polling to WebSocket:

```javascript
// MVP: HTTP polling
const messageService = new MessageService(new PollingStrategy());

// V1.0: WebSocket (only need to modify 1 line)
const messageService = new MessageService(new WebSocketStrategy());
```

### API Service Layer

Unified API calling interface for easy management and testing.

## Directory Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ChatWidget/       # Customer chat components
│   │   └── Admin/            # Admin dashboard components
│   ├── services/
│   │   ├── api.js            # API calls
│   │   └── messageService.js # Message service abstraction
│   ├── App.jsx               # Main application
│   └── main.jsx              # Entry point
├── package.json
└── vite.config.js
```

## Development Notes

### Adding New Pages

1. Create component in `src/components`
2. Add route in `App.jsx`

### Calling APIs

```javascript
import { chatAPI } from "./services/api";

const response = await chatAPI.sendMessage({
  customer_id: 1,
  message: "What is the M30's flight time?",
});
```

---

**Version**: 1.0.0  
**Status**: ✅ Development Complete
