import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// API
export const chatAPI = {
  // Create customer
  createCustomer: (data) => api.post('/customers', data),
  
  // 
  sendMessage: (data) => api.post('/chat', data),
  
  // 
  getCustomers: (params) => api.get('/customers', { params }),
  
  // Get conversation history
  getConversations: (customerId) => api.get(`/conversations/${customerId}`),
  
  // (conversation_id)
  getConversation: (conversationId) => api.get(`/conversation/${conversationId}`),
  
  // 
  classifyCustomer: (customerId) => api.post(`/classify/${customerId}`),
  
  // 
  recordHandoff: (data) => api.post('/handoff', data),
  
  // 
  getHandoffs: (params) => api.get('/handoffs', { params }),
  sendHumanMessage: (data) => api.post('/messages/human', data),
  updateHandoffStatus: (handoffId, data) => api.put(`/handoffs/${handoffId}/status`, data)
};

export default api;
