import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Space, message as antMessage, Badge, Card, Modal, Input } from 'antd';
import { EyeOutlined, ReloadOutlined, ClockCircleOutlined, CheckCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { chatAPI } from '../../services/api';
import HandoffStats from './HandoffStats';
import styles from './HandoffQueue.module.css';
import { formatUTCDateTimeCN } from '../../utils/timeUtils';

const HandoffQueue = () => {
  const [handoffs, setHandoffs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('pending'); // pending/processing/all
  const [takeoverModalVisible, setTakeoverModalVisible] = useState(false);
  const [selectedHandoffId, setSelectedHandoffId] = useState(null);
  const [agentName, setAgentName] = useState('');
  const navigate = useNavigate();

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
    setAgentName('Sales - Li Si');
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
      5: { color: 'red', text: '' },
      4: { color: 'orange', text: '' },
      3: { color: 'blue', text: '' },
      2: { color: 'default', text: '' },
      1: { color: 'default', text: '' }
    };
    const { color, text } = config[priority] || config[3];
    return <Tag color={color}>{text}</Tag>;
  };

  const getCategoryTag = (category) => {
    const config = {
      high_value: { color: 'red', text: '' },
      normal: { color: 'green', text: '' },
      low_value: { color: 'default', text: '' }
    };
    const { color, text } = config[category] || config.normal;
    return <Tag color={color}>{text}</Tag>;
  };

  const getStatusTag = (status) => {
    const config = {
      pending: { color: 'orange', text: '', icon: <ClockCircleOutlined /> },
      processing: { color: 'blue', text: '', icon: <ClockCircleOutlined /> },
      completed: { color: 'green', text: '', icon: <CheckCircleOutlined /> }
    };
    const { color, text, icon } = config[status] || config.pending;
    return <Tag color={color} icon={icon}>{text}</Tag>;
  };

  const getReasonText = (reason) => {
    const reasons = {
      customer_request: '',
      low_confidence: 'AI',
      manual_request: '',
      complex_query: ''
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
      title: '',
      key: 'customer',
      render: (_, record) => (
        <div>
          <div><strong>{record.customer.name}</strong></div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>{record.customer.email}</div>
        </div>
      )
    },
    {
      title: '',
      key: 'priority',
      width: 80,
      render: (_, record) => getPriorityTag(record.customer.priority_score),
      sorter: (a, b) => b.customer.priority_score - a.customer.priority_score,
      defaultSortOrder: 'ascend'
    },
    {
      title: '',
      key: 'category',
      width: 100,
      render: (_, record) => getCategoryTag(record.customer.category)
    },
    {
      title: '',
      dataIndex: 'trigger_reason',
      key: 'trigger_reason',
      width: 120,
      render: (reason) => getReasonText(reason)
    },
    {
      title: '',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => getStatusTag(status)
    },
    {
      title: '',
      dataIndex: 'agent_name',
      key: 'agent_name',
      width: 100,
      render: (name) => name || '-'
    },
    {
      title: ' (UTC)',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (text) => formatUTCDateTimeCN(text),
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at)
    },
    {
      title: '',
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
              
            </Button>
          )}
          <Button
            type="default"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/admin/handoff/${record.id}`)}
          >
            
          </Button>
        </Space>
      )
    }
  ];

  const pendingCount = handoffs.filter(h => h.status === 'pending').length;
  const processingCount = handoffs.filter(h => h.status === 'processing').length;

  return (
    <div className={styles.handoffQueue} style={{ padding: 24 }}>
      {/*  */}
      <HandoffStats />
      
      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space size="large">
            <div>
              <strong style={{ fontSize: 18 }}></strong>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                : {pendingCount} | : {processingCount}
              </div>
            </div>
            <Space>
              <Button
                type={filter === 'pending' ? 'primary' : 'default'}
                onClick={() => setFilter('pending')}
              >
                <Badge count={pendingCount} offset={[10, 0]}>
                  
                </Badge>
              </Button>
              <Button
                type={filter === 'processing' ? 'primary' : 'default'}
                onClick={() => setFilter('processing')}
              >
                
              </Button>
              <Button
                type={filter === 'all' ? 'primary' : 'default'}
                onClick={() => setFilter('all')}
              >
                
              </Button>
            </Space>
          </Space>

          <Button icon={<ReloadOutlined />} onClick={fetchHandoffs}>
            
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
            showTotal: (total) => ` ${total} `
          }}
        />
      </Card>

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
