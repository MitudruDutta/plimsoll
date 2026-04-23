// @ts-nocheck
import axios from 'axios';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Chat API
export const chatAPI = {
  // Create customer
  createCustomer: (data) => api.post('/customers', data),
  
  // Send message
  sendMessage: (data) => api.post('/chat', data),
  
  // Get customers
  getCustomers: (params) => api.get('/customers', { params }),
  
  // Get conversation history
  getConversations: (customerId) => api.get(`/conversations/${customerId}`),
  
  // Get single conversation by ID
  getConversation: (conversationId) => api.get(`/conversation/${conversationId}`),
  
  // Classify customer
  classifyCustomer: (customerId) => api.post(`/classify/${customerId}`),
  
  // Record handoff
  recordHandoff: (data) => api.post('/handoff', data),
  
  // Get handoffs
  getHandoffs: (params) => api.get('/handoffs', { params }),
  sendHumanMessage: (data) => api.post('/messages/human', data),
  updateHandoffStatus: (handoffId, data) => api.put(`/handoffs/${handoffId}/status`, data)
};

export default api;
