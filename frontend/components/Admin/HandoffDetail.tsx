// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Timeline, Button, Tag, Spin, Empty, message as antMessage,
  Descriptions, Input, Space, Divider, Modal
} from 'antd';
import {
  ArrowLeftOutlined, RobotOutlined, UserOutlined, SendOutlined,
  CheckCircleOutlined, PlayCircleOutlined, UserSwitchOutlined
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { chatAPI } from '../../services/api';
import styles from './HandoffDetail.module.css';
import { formatUTCDateTime } from '../../utils/timeUtils';

const { TextArea } = Input;

const HandoffDetail = () => {
  const { handoffId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [handoff, setHandoff] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [agentName, setAgentName] = useState('');
  const [takeoverModalVisible, setTakeoverModalVisible] = useState(false);
  const [tempAgentName, setTempAgentName] = useState('');

  const fetchHandoffDetail = async () => {
    try {
      setLoading(true);
      // Get handoff details
      const handoffsRes = await chatAPI.getHandoffs();
      const handoffData = handoffsRes.data.handoffs.find(h => h.id === parseInt(handoffId));
      
      if (!handoffData) {
        antMessage.error('Handoff record does not exist');
        navigate('/admin/handoffs');
        return;
      }
      
      setHandoff(handoffData);
      setCustomer(handoffData.customer);
      
      // Get conversation history - Fix: use conversation_id instead of customer_id
      const convRes = await chatAPI.getConversation(handoffData.conversation_id);
      // Wrap single conversation into array to maintain compatibility with existing rendering logic
      setConversations(convRes.data ? [convRes.data] : []);
    } catch (error) {
      console.error('Failed to get details:', error);
      antMessage.error('Failed to get details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHandoffDetail();
  }, [handoffId]);

  const handleSendReply = async () => {
    if (!replyContent.trim()) {
      antMessage.warning('Please enter reply content');
      return;
    }

    try {
      setSending(true);
      await chatAPI.sendHumanMessage({
        conversation_id: handoff.conversation_id,
        content: replyContent,
        agent_name: agentName || 'Human Agent'
      });
      
      antMessage.success('Reply sent successfully');
      setReplyContent('');
      
      // 
      await fetchHandoffDetail();
    } catch (error) {
      console.error(':', error);
      antMessage.error('');
    } finally {
      setSending(false);
    }
  };

  const showTakeoverModal = () => {
    setTempAgentName(agentName || 'Sales - Li Si');
    setTakeoverModalVisible(true);
  };

  const handleTakeOver = async () => {
    if (!tempAgentName.trim()) {
      antMessage.warning('Please enter your name');
      return;
    }

    try {
      setTakeoverModalVisible(false);
      await chatAPI.updateHandoffStatus(handoffId, {
        status: 'processing',
        agent_name: tempAgentName
      });
      
      setAgentName(tempAgentName);
      antMessage.success(`${tempAgentName} has taken over the conversation`);
      
      // 
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('', {
          body: `${tempAgentName} has taken over the conversation`,
          icon: '/logo.png'
        });
      }
      
      await fetchHandoffDetail();
    } catch (error) {
      console.error('Handoff failed:', error);
      antMessage.error('Handoff failed');
    }
  };

  // 
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleComplete = async () => {
    try {
      await chatAPI.updateHandoffStatus(handoffId, {
        status: 'completed'
      });
      
      antMessage.success('');
      navigate('/admin/handoffs');
    } catch (error) {
      console.error(':', error);
      antMessage.error('');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!handoff) {
    return <Empty description="Handoff record does not exist" />;
  }

  const getSenderIcon = (sender) => {
    if (sender === 'customer') return <UserOutlined style={{ fontSize: 16 }} />;
    if (sender === 'human') return <UserSwitchOutlined style={{ fontSize: 16 }} />;
    return <RobotOutlined style={{ fontSize: 16 }} />;
  };

  const getSenderColor = (sender) => {
    if (sender === 'customer') return 'blue';
    if (sender === 'human') return 'purple';
    return 'green';
  };

  const getSenderText = (sender) => {
    if (sender === 'customer') return '';
    if (sender === 'human') return '';
    return 'AI';
  };

  return (
    <div style={{ padding: 24 }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/admin/handoffs')}
        style={{ marginBottom: 16 }}
      >
        
      </Button>

      {/*  */}
      <Card title="" style={{ marginBottom: 24 }}>
        <Descriptions>
          <Descriptions.Item label="Name">
            <strong>{customer.name}</strong>
          </Descriptions.Item>
          <Descriptions.Item label="">{customer.email}</Descriptions.Item>
          <Descriptions.Item label="">
            <Tag color={customer.priority_score >= 4 ? 'red' : 'blue'}>
              {customer.priority_score} 
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="">{handoff.trigger_reason}</Descriptions.Item>
          <Descriptions.Item label="">
            <Tag color={handoff.status === 'completed' ? 'green' : 'orange'}>
              {handoff.status}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="">{handoff.agent_name || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      {/*  */}
      <Card
        title=""
        extra={
          <Space>
            {handoff.status === 'pending' && (
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={showTakeoverModal}
              >
                
              </Button>
            )}
            {handoff.status === 'processing' && (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={handleComplete}
              >
                
              </Button>
            )}
          </Space>
        }
      >
        {conversations.length === 0 ? (
          <Empty description="" />
        ) : (
          conversations.map((conversation) => (
            <div key={conversation.id} style={{ marginBottom: 32 }}>
              <Timeline>
                {conversation.messages && conversation.messages.map((message) => (
                  <Timeline.Item
                    key={message.id}
                    dot={getSenderIcon(message.sender.toLowerCase())}
                    color={getSenderColor(message.sender.toLowerCase())}
                  >
                    <div className={styles.messageItem}>
                      <div className={styles.messageHeader}>
                        <Tag color={getSenderColor(message.sender.toLowerCase())}>
                          {getSenderText(message.sender.toLowerCase())}
                        </Tag>
                        <span className={styles.messageTime}>
                          {formatUTCDateTime(message.created_at)}
                        </span>
                        {message.ai_confidence !== undefined && (
                          <Tag>Confidence: {(message.ai_confidence * 100).toFixed(0)}%</Tag>
                        )}
                      </div>
                      <div className={styles.messageContent}>
                        {message.sender.toLowerCase() !== 'customer' ? (
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

      {/*  */}
      {handoff.status !== 'completed' && (
        <>
          <Divider />
          <Card title="" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <TextArea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="..."
                rows={4}
                disabled={sending}
              />
              <div style={{ textAlign: 'right' }}>
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSendReply}
                  loading={sending}
                  disabled={!replyContent.trim()}
                >
                  
                </Button>
              </div>
            </Space>
          </Card>
        </>
      )}

      {/*  */}
      <Modal
        title=""
        open={takeoverModalVisible}
        onOk={handleTakeOver}
        onCancel={() => setTakeoverModalVisible(false)}
        okText=""
        cancelText=""
      >
        <Input
          placeholder="Please enter your name"
          value={tempAgentName}
          onChange={(e) => setTempAgentName(e.target.value)}
          onPressEnter={handleTakeOver}
          autoFocus
        />
      </Modal>
    </div>
  );
};

export default HandoffDetail;
