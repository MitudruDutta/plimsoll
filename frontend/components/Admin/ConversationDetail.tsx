// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Timeline, Button, Tag, Spin, Empty, message as antMessage, Descriptions } from 'antd';
import { ArrowLeftOutlined, RobotOutlined, UserOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { chatAPI } from '../../services/api';
import styles from './ConversationDetail.module.css';
import { formatUTCDateTime } from '../../utils/timeUtils';

const ConversationDetail = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [customer, setCustomer] = useState(null);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await chatAPI.getConversations(customerId);
      setConversations(response.data);
      
      // 
      const customersResponse = await chatAPI.getCustomers();
      const customerData = customersResponse.data.find(c => c.id === parseInt(customerId));
      setCustomer(customerData);
    } catch (error) {
      console.error('Failed to get conversation:', error);
      antMessage.error('Failed to get conversation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [customerId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  const getCategoryTag = (category, priority) => {
    const config = {
      HIGH_VALUE: { color: 'red', text: 'VIP' },
      NORMAL: { color: 'green', text: 'Normal' },
      LOW_VALUE: { color: 'default', text: 'Low Value' }
    };
    const { color, text } = config[category] || config.NORMAL;
    return <Tag color={color}>{text} (: {priority})</Tag>;
  };

  return (
    <div style={{ padding: 24 }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/admin/customers')}
        style={{ marginBottom: 16 }}
      >
        
      </Button>

      {customer && (
        <Card title="" style={{ marginBottom: 24 }}>
          <Descriptions>
            <Descriptions.Item label="Name">
              <strong>{customer.name}</strong>
            </Descriptions.Item>
            <Descriptions.Item label="">{customer.email}</Descriptions.Item>
            <Descriptions.Item label="Company">{customer.company || '-'}</Descriptions.Item>
            <Descriptions.Item label="">
              {getCategoryTag(customer.category, customer.priority_score)}
            </Descriptions.Item>
            <Descriptions.Item label="Created At (UTC)">
              {formatUTCDateTime(customer.created_at)}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      <Card title="">
        {conversations.length === 0 ? (
          <Empty description="" />
        ) : (
          conversations.map((conversation) => (
            <div key={conversation.id} style={{ marginBottom: 32 }}>
              <h4>
                 #{conversation.id} 
                <span style={{ fontSize: 14, color: '#8c8c8c', marginLeft: 16 }}>
                  {formatUTCDateTime(conversation.created_at)}
                </span>
              </h4>
              
              <Timeline>
                {conversation.messages && conversation.messages.map((message) => (
                  <Timeline.Item
                    key={message.id}
                    dot={
                      message.sender === 'CUSTOMER' ? 
                      <UserOutlined style={{ fontSize: 16 }} /> : 
                      <RobotOutlined style={{ fontSize: 16 }} />
                    }
                    color={message.sender === 'CUSTOMER' ? 'blue' : 'green'}
                  >
                    <div className={styles.messageItem}>
                      <div className={styles.messageHeader}>
                        <Tag color={message.sender === 'CUSTOMER' ? 'blue' : 'green'}>
                          {message.sender === 'CUSTOMER' ? '' : 'AI'}
                        </Tag>
                        <span className={styles.messageTime}>
                          {formatUTCDateTime(message.created_at)}
                        </span>
                        {message.ai_confidence !== undefined && (
                          <Tag>Confidence: {(message.ai_confidence * 100).toFixed(0)}%</Tag>
                        )}
                      </div>
                      <div className={styles.messageContent}>
                        {message.sender === 'AI' ? (
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        ) : (
                          <p>{message.content}</p>
                        )}
                      </div>
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            </div>
          ))
        )}
      </Card>
    </div>
  );
};

export default ConversationDetail;
