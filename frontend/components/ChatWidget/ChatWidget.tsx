// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, Card, Avatar, Badge, Spin, message as antMessage } from 'antd';
import { MessageOutlined, SendOutlined, CloseOutlined, RobotOutlined, UserOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { chatAPI } from '../../services/api';
import messageService from '../../services/messageService';
import styles from './ChatWidget.module.css';

const { TextArea } = Input;

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(true);
  const messagesEndRef = useRef(null);
  const subscriptionRef = useRef(null);

  // Scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Subscribe to message updates
  useEffect(() => {
    if (customerId && isOpen) {
      subscriptionRef.current = messageService.subscribe(customerId, (conversations) => {
        if (conversations && conversations.length > 0) {
          const latestConversation = conversations[0];
          if (latestConversation.messages) {
            setMessages(latestConversation.messages);
          }
        }
      });

      return () => {
        if (subscriptionRef.current) {
          messageService.unsubscribe(subscriptionRef.current);
        }
      };
    }
  }, [customerId, isOpen]);

  // Create customer
  const handleStartChat = async () => {
    if (!customerName.trim()) {
      antMessage.warning('Please enter your name');
      return;
    }

    try {
      setLoading(true);
      const response = await chatAPI.createCustomer({
        name: customerName,
        email: `${customerName.toLowerCase()}@temp.com` // temporary email
      });
      setCustomerId(response.data.id);
      setShowNameInput(false);
      antMessage.success('Welcome! Start your inquiry');
    } catch (error) {
      console.error('Create customer failed:', error);
      antMessage.error('Failed to create customer');
    } finally {
      setLoading(false);
    }
  };

  // Send message
  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: Date.now(),
      sender: 'CUSTOMER',
      content: inputValue,
      created_at: new Date().toISOString()
    };

    // Add user message to chat
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      const response = await chatAPI.sendMessage({
        customer_id: customerId,
        message: inputValue,
        language: 'en'
      });

      // AI response
      const aiMessage = {
        id: Date.now() + 1,
        sender: 'AI',
        content: response.data.answer,
        ai_confidence: response.data.confidence,
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);

      // Check for handoff
      if (response.data.should_handoff) {
        antMessage.info('Connecting you to a human agent...');
      }
    } catch (error) {
      console.error('Send message failed:', error);
      antMessage.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.chatWidget}>
      {/* Chat toggle button */}
      {!isOpen && (
        <Badge count={messages.length} offset={[-10, 10]}>
          <Button
            type="primary"
            shape="circle"
            size="large"
            icon={<MessageOutlined />}
            onClick={() => setIsOpen(true)}
            className={styles.chatButton}
          />
        </Badge>
      )}

      {/* Chat window */}
      {isOpen && (
        <Card
          className={styles.chatWindow}
          title={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <RobotOutlined style={{ marginRight: 8 }} />
                Plimsoll Assistant
              </div>
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={() => setIsOpen(false)}
              />
            </div>
          }
        >
          {/* Welcome screen */}
          {showNameInput ? (
            <div className={styles.welcomeScreen}>
              <Avatar size={64} icon={<RobotOutlined />} style={{ marginBottom: 16 }} />
              <h3>Welcome to Plimsoll</h3>
              <p style={{ color: '#8c8c8c', marginBottom: 24 }}>
                Please enter your name
              </p>
              <Input
                placeholder="Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                onPressEnter={handleStartChat}
                style={{ marginBottom: 16 }}
              />
              <Button
                type="primary"
                block
                onClick={handleStartChat}
                loading={loading}
              >
                Start Chat
              </Button>
            </div>
          ) : (
            <>
              {/* Messages area */}
              <div className={styles.messagesContainer}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#8c8c8c', padding: 32 }}>
                    <RobotOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                    <p>Welcome to the Plimsoll Assistant.</p>
                    <p>How can I help you today?</p>
                  </div>
                )}
                
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`${styles.message} ${msg.sender === 'CUSTOMER' ? styles.userMessage : styles.aiMessage}`}
                  >
                    <Avatar
                      size="small"
                      icon={msg.sender === 'CUSTOMER' ? <UserOutlined /> : <RobotOutlined />}
                      style={{
                        backgroundColor: msg.sender === 'CUSTOMER' ? '#1890ff' : '#52c41a'
                      }}
                    />
                    <div className={styles.messageContent}>
                      {msg.sender === 'AI' ? (
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      ) : (
                        <div>{msg.content}</div>
                      )}
                      {msg.ai_confidence !== undefined && (
                        <div className={styles.confidenceBadge}>
                          Confidence: {(msg.ai_confidence * 100).toFixed(0)}%
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {loading && (
                  <div className={`${styles.message} ${styles.aiMessage}`}>
                    <Avatar size="small" icon={<RobotOutlined />} style={{ backgroundColor: '#52c41a' }} />
                    <div className={styles.messageContent}>
                      <Spin size="small" /> AI is thinking...
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div className={styles.inputContainer}>
                <TextArea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  disabled={loading}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSend}
                  loading={loading}
                  disabled={!inputValue.trim()}
                >
                  Send
                </Button>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
};

export default ChatWidget;
