// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Space, message as antMessage, Badge, Card, Modal, Input } from 'antd';
import { EyeOutlined, ReloadOutlined, ClockCircleOutlined, CheckCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { chatAPI } from '../../services/api';
import HandoffStats from './HandoffStats';
import styles from './HandoffQueue.module.css';
import { formatUTCDateTime } from '../../utils/timeUtils';

const HandoffQueue = () => {
  const [handoffs, setHandoffs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('pending'); // pending/processing/all
  const [takeoverModalVisible, setTakeoverModalVisible] = useState(false);
  const [selectedHandoffId, setSelectedHandoffId] = useState(null);
  const [agentName, setAgentName] = useState('');
  const router = useRouter();
  const navigate = (path: string) => router.push(path);

  const fetchHandoffs = async () => {
    try {
      setLoading(true);
      const params = filter === 'all' ? {} : { status: filter };
      const response = await chatAPI.getHandoffs(params);
      setHandoffs(response.data.handoffs || []);
    } catch (error) {
      console.error('Failed to get handoff list:', error);
      antMessage.error('Failed to get handoff list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHandoffs();
    // Auto refresh (every 30 seconds)
    const interval = setInterval(fetchHandoffs, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const showTakeoverModal = (handoffId) => {
    setSelectedHandoffId(handoffId);
    setAgentName('Agent');
    setTakeoverModalVisible(true);
  };

  const handleTakeOver = async () => {
    if (!agentName.trim()) {
      antMessage.warning('Please enter your name');
      return;
    }

    try {
      setTakeoverModalVisible(false);
      await chatAPI.updateHandoffStatus(selectedHandoffId, {
        status: 'processing',
        agent_name: agentName
      });
      
      antMessage.success(`${agentName} has taken over the conversation`);
      await fetchHandoffs();
    } catch (error) {
      console.error('Handoff failed:', error);
      antMessage.error('Handoff failed');
    }
  };

  const getPriorityTag = (priority) => {
    const config = {
      5: { color: 'red', text: 'Urgent' },
      4: { color: 'orange', text: 'High' },
      3: { color: 'blue', text: 'Medium' },
      2: { color: 'default', text: 'Low' },
      1: { color: 'default', text: 'Minimal' }
    };
    const { color, text } = config[priority] || config[3];
    return <Tag color={color}>{text}</Tag>;
  };

  const getCategoryTag = (category) => {
    const config = {
      high_value: { color: 'red', text: 'VIP' },
      normal: { color: 'green', text: 'Normal' },
      low_value: { color: 'default', text: 'Low Value' }
    };
    const { color, text } = config[category] || config.normal;
    return <Tag color={color}>{text}</Tag>;
  };

  const getStatusTag = (status) => {
    const config = {
      pending: { color: 'orange', text: 'Pending', icon: <ClockCircleOutlined /> },
      processing: { color: 'blue', text: 'Processing', icon: <ClockCircleOutlined /> },
      completed: { color: 'green', text: 'Completed', icon: <CheckCircleOutlined /> }
    };
    const { color, text, icon } = config[status] || config.pending;
    return <Tag color={color} icon={icon}>{text}</Tag>;
  };

  const getReasonText = (reason) => {
    const reasons = {
      customer_request: 'Customer Request',
      low_confidence: 'Low AI Confidence',
      manual_request: 'Manual Request',
      complex_query: 'Complex Query'
    };
    return reasons[reason] || reason;
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60
    },
    {
      title: 'Customer',
      key: 'customer',
      render: (_, record) => (
        <div>
          <div><strong>{record.customer.name}</strong></div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>{record.customer.email}</div>
        </div>
      )
    },
    {
      title: 'Priority',
      key: 'priority',
      width: 80,
      render: (_, record) => getPriorityTag(record.customer.priority_score),
      sorter: (a, b) => b.customer.priority_score - a.customer.priority_score,
      defaultSortOrder: 'ascend'
    },
    {
      title: 'Category',
      key: 'category',
      width: 100,
      render: (_, record) => getCategoryTag(record.customer.category)
    },
    {
      title: 'Reason',
      dataIndex: 'trigger_reason',
      key: 'trigger_reason',
      width: 120,
      render: (reason) => getReasonText(reason)
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => getStatusTag(status)
    },
    {
      title: 'Agent',
      dataIndex: 'agent_name',
      key: 'agent_name',
      width: 100,
      render: (name) => name || '-'
    },
    {
      title: 'Created At (UTC)',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (text) => formatUTCDateTime(text),
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at)
    },
    {
      title: 'Actions',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          {record.status === 'pending' && (
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => showTakeoverModal(record.id)}
            >
              Take Over
            </Button>
          )}
          <Button
            type="default"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/admin/handoff/${record.id}`)}
          >
            View
          </Button>
        </Space>
      )
    }
  ];

  const pendingCount = handoffs.filter(h => h.status === 'pending').length;
  const processingCount = handoffs.filter(h => h.status === 'processing').length;

  return (
    <div className={styles.handoffQueue} style={{ padding: 24 }}>
      {/* Stats Section */}
      <HandoffStats />
      
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space size="large">
            <div>
              <strong style={{ fontSize: 18 }}>Handoff Queue</strong>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                Pending: {pendingCount} | Processing: {processingCount}
              </div>
            </div>
            <Space>
              <Button
                type={filter === 'pending' ? 'primary' : 'default'}
                onClick={() => setFilter('pending')}
              >
                <Badge count={pendingCount} offset={[10, 0]}>
                  Pending
                </Badge>
              </Button>
              <Button
                type={filter === 'processing' ? 'primary' : 'default'}
                onClick={() => setFilter('processing')}
              >
                Processing
              </Button>
              <Button
                type={filter === 'all' ? 'primary' : 'default'}
                onClick={() => setFilter('all')}
              >
                All
              </Button>
            </Space>
          </Space>

          <Button icon={<ReloadOutlined />} onClick={fetchHandoffs}>
            Refresh
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={handoffs}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} items`
          }}
        />
      </Card>

      {/* Takeover Modal */}
      <Modal
        title="Take Over Conversation"
        open={takeoverModalVisible}
        onOk={handleTakeOver}
        onCancel={() => setTakeoverModalVisible(false)}
        okText="Confirm"
        cancelText="Cancel"
      >
        <Input
          placeholder="Please enter your name"
          value={agentName}
          onChange={(e) => setAgentName(e.target.value)}
          onPressEnter={handleTakeOver}
          autoFocus
        />
      </Modal>
    </div>
  );
};

export default HandoffQueue;
