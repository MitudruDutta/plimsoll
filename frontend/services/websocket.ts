"use client";
// @ts-nocheck
import { useState, useRef } from "react";

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [events, setEvents] = useState<any[]>([]);
  const ws = useRef<WebSocket | null>(null);

  const resolveWebSocketUrl = (url: string) => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

    try {
      const parsedUrl = new URL(url, window.location.origin);
      const apiUrl = apiBaseUrl ? new URL(apiBaseUrl) : null;

      if (apiUrl && (parsedUrl.port === "8000" || parsedUrl.origin === window.location.origin)) {
        parsedUrl.protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
        parsedUrl.hostname = apiUrl.hostname;
        parsedUrl.port = apiUrl.port;
      } else if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
        parsedUrl.protocol = parsedUrl.protocol === "https:" ? "wss:" : "ws:";
      }

      return parsedUrl.toString();
    } catch {
      return url;
    }
  };

  const connect = (url: string) => {
    if (ws.current) {
        ws.current.close();
    }
    const resolvedUrl = resolveWebSocketUrl(url);
    ws.current = new WebSocket(resolvedUrl);

    ws.current.onopen = () => {
      console.log("WebSocket connected:", resolvedUrl);
      setIsConnected(true);
      // 
      ws.current?.send(JSON.stringify({ action: "play" }));
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WebSocket event:", data);
        setEvents((prev) => [...prev, data]);
        // UI logic can be added here or in the component depending on state
      } catch (e) {
        console.error("Error parsing websocket message", e);
      }
    };

    ws.current.onerror = (error) => {
      console.warn("WebSocket connection issue:", {
        url: resolvedUrl,
        readyState: ws.current?.readyState,
        error,
      });
    };

    ws.current.onclose = (event) => {
      console.log("WebSocket closed", {
        url: resolvedUrl,
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });
      setIsConnected(false);
    };
  };

  const send = (data: any) => {
    console.log('[WebSocket] Attempting to send:', data);
    console.log('[WebSocket] Current state:', ws.current ? ws.current.readyState : 'null');
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      const message = JSON.stringify(data);
      console.log('[WebSocket] Sending JSON:', message);
      ws.current.send(message);
      console.log('[WebSocket] Message sent successfully');
    } else {
      console.warn("[WebSocket] Cannot send - not connected. ReadyState:", ws.current?.readyState);
    }
  };

  return { connect, isConnected, events, send };
};
