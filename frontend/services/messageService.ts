// @ts-nocheck
import { chatAPI } from './api';

/**
 * Message Service - Supports HTTP Polling and WebSocket strategies
 */

// HTTP Polling Strategy (MVP)
export class PollingStrategy {
  subscribe(customerId, callback) {
    const interval = setInterval(async () => {
      try {
        const response = await chatAPI.getConversations(customerId);
        callback(response.data);
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 5000); // Poll every 5 seconds
    
    return {
      type: 'polling',
      interval,
      unsubscribe: () => clearInterval(interval)
    };
  }
  
  unsubscribe(subscription) {
    if (subscription && subscription.unsubscribe) {
      subscription.unsubscribe();
    }
  }
}

// WebSocket Strategy (V1.0 - future use)
export class WebSocketStrategy {
  constructor() {
    this.connections = new Map();
  }
  
  subscribe(customerId, callback) {
    const baseWsUrl =
      process.env.NEXT_PUBLIC_WS_URL ||
      'ws://127.0.0.1:8001/ws';
    const wsUrl = `${baseWsUrl}/${customerId}`;
    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      callback(data);
    };
    
    ws.onerror = (error) => {
      console.warn('WebSocket error, falling back to polling', error);
      // Fallback to polling
      const pollingStrategy = new PollingStrategy();
      return pollingStrategy.subscribe(customerId, callback);
    };
    
    this.connections.set(customerId, ws);
    
    return {
      type: 'websocket',
      ws,
      unsubscribe: () => {
        ws.close();
        this.connections.delete(customerId);
      }
    };
  }
  
  unsubscribe(subscription) {
    if (subscription && subscription.unsubscribe) {
      subscription.unsubscribe();
    }
  }
}

// Message Service - Strategy Pattern
export class MessageService {
  constructor(strategy = new PollingStrategy()) {
    this.strategy = strategy;
  }
  
  subscribe(customerId, callback) {
    return this.strategy.subscribe(customerId, callback);
  }
  
  unsubscribe(subscription) {
    this.strategy.unsubscribe(subscription);
  }
  
  setStrategy(strategy) {
    this.strategy = strategy;
  }
}

// Default export with polling strategy
export default new MessageService(new PollingStrategy());
