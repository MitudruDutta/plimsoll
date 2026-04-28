"use client";
import React, { useEffect, useState } from 'react';
import { Table, Tag, Space, Typography, Card, Statistic, Row, Col, Spin, Tooltip as AntTooltip } from 'antd';
import { useCurrentUser } from '@/context/SupabaseAuthContext';
import { apiRequest, ApiError } from '@/services/apiClient';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { InfoCircleOutlined } from '@ant-design/icons';
import { ModeBanner } from '@/components/ModeBanner';
import { BrandLockup } from '@/components/Brand';

const { Title, Text } = Typography;

// Plimsoll chart palette — single accent gradient + status colors
// (PRD F2.6 / designprompt.md). The dashboard still runs on AntD;
// a full shadcn rewrite is tracked under F1.2 (admin shell).
const COLORS = ['#A78BFA', '#7C3AED', '#4F46E5', '#22D3A8', '#F5B544'];

// Mock Data fallbacks — see ModeBanner above the dashboard. Until
// /api/admin/stats and /api/admin/performance are wired (PRD §B7),
// these are clearly labeled as demo telemetry.
const MOCK_CATEGORIES = [
  { name: 'VIP Customer', value: 45 },
  { name: 'Normal Customer', value: 120 },
  { name: 'High-risk Customer', value: 15 },
  { name: 'New Registration', value: 32 }
];

const MOCK_TRENDS = [
  { date: '2024-01-18', count: 42, active: 30 },
  { date: '2024-01-19', count: 56, active: 45 },
  { date: '2024-01-20', count: 38, active: 25 },
  { date: '2024-01-21', count: 65, active: 50 },
  { date: '2024-01-22', count: 89, active: 70 },
  { date: '2024-01-23', count: 72, active: 60 },
  { date: '2024-01-24', count: 95, active: 80 }
];

const MOCK_PERFORMANCE = [
  { time: '09:00', latency: 120, confidence: 0.92 },
  { time: '12:00', latency: 450, confidence: 0.88 },
  { time: '15:00', latency: 230, confidence: 0.95 },
  { time: '18:00', latency: 180, confidence: 0.91 },
  { time: '21:00', latency: 150, confidence: 0.94 },
  { time: '00:00', latency: 110, confidence: 0.96 }
];

interface Customer {
  id: number;
  name: string;
  email: string;
  company: string;
  category: string;
  priority_score: number;
}

interface Stats {
  categories: { name: string; value: number }[];
  trends: { date: string; count: number }[];
  overall: {
    avg_confidence: number;
    total_customers: number;
    total_conversations: number;
  };
}

export const AdminDashboard: React.FC = () => {
  const { user, fullName, email } = useCurrentUser();
  const [customers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsRes = await apiRequest<Stats | null>('/admin/stats', {
          requireAuth: false,
        }).catch((err: unknown) => {
          if (!(err instanceof ApiError)) console.error('Stats fetch error:', err);
          return null;
        });
        setStats(statsRes ?? null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Contact Email', dataIndex: 'email', key: 'email' },
    { title: 'Company', dataIndex: 'company', key: 'company' },
    {
      title: 'Customer Tag',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => {
        let color = 'purple';
        let label = category?.toUpperCase() || 'NORMAL';
        if (category === 'high_value') { color = 'gold'; label = 'VIP'; }
        if (category === 'low_value') { color = 'default'; label = 'LOW'; }
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: 'Priority',
      dataIndex: 'priority_score',
      key: 'priority_score',
      render: (score: number) => (
        <Text strong style={{ color: score >= 4 ? '#22D3A8' : '#A1A1AA' }}>
          {score || 3}/5
        </Text>
      ),
    },
    {
      title: 'Actions',
      key: 'action',
      render: () => (
        <Space size="middle">
          <a style={{ color: '#7C3AED' }}>View</a>
          <a style={{ color: '#A78BFA' }}>Manage</a>
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: '#0A0A0B',
          color: '#A1A1AA',
          fontFamily: 'JetBrains Mono, ui-monospace, monospace',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          fontSize: 12,
        }}
      >
        <Spin size="large" tip="Loading admin dashboard…" />
      </div>
    );
  }

  // Determine which data to use (backend or mock)
  const categoryData = stats?.categories && stats.categories.length > 0 ? stats.categories : MOCK_CATEGORIES;
  const trendData = stats?.trends && stats.trends.length > 0 ? stats.trends : MOCK_TRENDS;
  const performanceData = MOCK_PERFORMANCE; // Completely mock for now as requested

  return (
    <div style={{ padding: '32px', background: '#f5f5f7', minHeight: '100vh' }}>
      <div style={{ marginBottom: 16 }}>
        <ModeBanner mode="demo" message="Admin telemetry is demo-only until /api/admin/stats and /api/admin/performance ship in v1.x." />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <BrandLockup size={26} />
          </div>
          <Title
            level={2}
            style={{
              marginBottom: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontWeight: 600,
              letterSpacing: '-0.02em',
            }}
          >
            Admin <span style={{ fontFamily: 'Instrument Serif, serif', fontStyle: 'italic', fontWeight: 400 }}>dashboard</span>
            <AntTooltip title="Real-time AI analytics overview">
              <InfoCircleOutlined style={{ fontSize: '14px', color: '#8c8c8c', cursor: 'pointer' }} />
            </AntTooltip>
          </Title>
          <Text type="secondary">Live monitoring &amp; analytics — currently rendering demo telemetry.</Text>
        </div>
        <div style={{ textAlign: 'right', background: 'white', padding: '10px 16px', borderRadius: '12px', boxShadow: '0 2px 6px rgba(15,15,20,0.05)' }}>
          <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em' }}>Signed in as</Text>
          <div style={{ fontWeight: 600, color: '#1D4ED8' }}>{fullName || email} <span style={{ color: '#94A3B8', fontWeight: 500 }}>· admin</span></div>
        </div>
      </div>

      <Row gutter={[24, 24]}>
        {/* Statistics Cards */}
        {/* Stats — fall back to em-dash when the backend hasn't shipped
            yet (PRD §F2.6). The previous hard-coded 184/92.4/1256/3
            looked credible but was fabricated. */}
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} hoverable>
            <Statistic
              title="Total customers"
              value={stats?.overall?.total_customers ?? '—'}
              prefix={<Tag color="purple">Live</Tag>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} hoverable>
            <Statistic
              title="AI confidence"
              value={stats?.overall?.avg_confidence ? stats.overall.avg_confidence * 100 : '—'}
              precision={1}
              suffix={stats?.overall?.avg_confidence ? '%' : ''}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} hoverable>
            <Statistic
              title="Total conversations"
              value={stats?.overall?.total_conversations ?? '—'}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} hoverable>
            <Statistic title="Pending handoffs" value="—" />
          </Card>
        </Col>

        {/* Chart: 7-day Trend */}
        <Col xs={24} lg={16}>
          <Card title="7-Day Trend (Bar)" bordered={false} bodyStyle={{ height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Total" fill="#7C3AED" radius={[6, 6, 0, 0]} />
                <Bar dataKey="active" name="Active" fill="#A78BFA" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        
        {/* Chart: Category Distribution */}
        <Col xs={24} lg={8}>
          <Card title="Category Distribution (Pie)" bordered={false} bodyStyle={{ height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={8}
                  dataKey="value"
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Chart: AI Performance */}
        <Col span={24}>
          <Card title="AI Performance (Line & Area)" bordered={false} bodyStyle={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="time" />
                <YAxis yAxisId="left" orientation="left" stroke="#7C3AED" label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" stroke="#22D3A8" domain={[0, 1]} label={{ value: 'Confidence', angle: 90, position: 'insideRight' }} />
                <Tooltip />
                <Legend />
                <Area yAxisId="left" type="monotone" dataKey="latency" name="AI Latency" stroke="#7C3AED" fillOpacity={1} fill="url(#colorLatency)" />
                <Line yAxisId="right" type="monotone" dataKey="confidence" name="Confidence" stroke="#22D3A8" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Customer Table */}
        <Col span={24}>
          <Card title="Customer List" bordered={false}>
            <Table 
              columns={columns} 
              dataSource={customers.length > 0 ? customers : [
                { id: 101, name: 'Alex Chen', email: 'chen@mock.com', company: 'Acme Logistics', category: 'high_value', priority_score: 5 },
                { id: 102, name: 'Linda Wang', email: 'linda@example.com', company: 'Global Trade Co.', category: 'normal', priority_score: 3 },
                { id: 103, name: 'James Zhang', email: 'zhang@corp.com', company: 'Pacific Shipping', category: 'low_value', priority_score: 2 }
              ]} 
              rowKey="id" 
              pagination={{ pageSize: 5 }} 
              size="middle"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};


export default AdminDashboard;
