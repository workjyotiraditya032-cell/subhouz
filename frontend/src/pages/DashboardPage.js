import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Users, DoorOpen, CreditCard, TrendingUp, AlertCircle, Calendar, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../lib/api';

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#1D4ED8'];

export default function DashboardPage() {
  const { user } = useAuth();
  const { selectedHostel } = useOutletContext();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = {};
    if (selectedHostel) params.hostel_id = selectedHostel.id;
    api.get('/dashboard/stats', { params }).then(res => {
      setStats(res.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [selectedHostel]);

  if (loading) {
    return (
      <div className="space-y-4" data-testid="dashboard-loading">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="stat-card animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-24 mb-3" />
              <div className="h-8 bg-slate-200 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { label: 'Total Hostels', value: stats.total_hostels, icon: Building2, color: '#1D4ED8', show: user?.role === 'super_admin' },
    { label: 'Total Rooms', value: stats.total_rooms, icon: DoorOpen, color: '#8B5CF6' },
    { label: 'Total Beds', value: stats.total_beds, icon: DoorOpen, color: '#0EA5E9' },
    { label: 'Active Residents', value: stats.total_residents, icon: Users, color: '#10B981' },
    { label: 'Occupancy Rate', value: `${stats.occupancy_rate}%`, icon: TrendingUp, color: stats.occupancy_rate > 80 ? '#10B981' : '#F59E0B' },
    { label: 'Monthly Revenue', value: `₹${(stats.monthly_revenue / 1000).toFixed(1)}K`, icon: CreditCard, color: '#10B981' },
    { label: 'Pending Rent', value: stats.pending_this_month, icon: AlertCircle, color: '#F59E0B' },
    { label: "Today's Collection", value: `₹${stats.today_collection.toLocaleString()}`, icon: Calendar, color: '#1D4ED8' },
  ].filter(s => s.show !== false);

  const paymentPie = [
    { name: 'Paid', value: stats.paid_this_month },
    { name: 'Pending', value: stats.pending_this_month },
  ];

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F172A] tracking-tight" style={{ fontFamily: 'Outfit' }}>
            {selectedHostel ? selectedHostel.name : 'Dashboard Overview'}
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Welcome back, {user?.name}. Here's your hostel performance for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}.
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <div key={i} className="stat-card" data-testid={`stat-${s.label.toLowerCase().replace(/\s+/g, '-')}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">{s.label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${s.color}12` }}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#0F172A] tracking-tight" style={{ fontFamily: 'Outfit' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2 border-[#E2E8F0] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-[#0F172A]" style={{ fontFamily: 'Outfit' }}>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.revenue_chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month_name" tick={{ fill: '#64748B', fontSize: 12 }} />
                <YAxis tick={{ fill: '#64748B', fontSize: 12 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(v) => [`₹${v.toLocaleString()}`, 'Revenue']} contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <Bar dataKey="revenue" fill="#1D4ED8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Status Pie */}
        <Card className="border-[#E2E8F0] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-[#0F172A]" style={{ fontFamily: 'Outfit' }}>Payment Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={paymentPie} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                  {paymentPie.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2">
              <span className="flex items-center gap-1.5 text-xs text-[#64748B]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" /> Paid ({stats.paid_this_month})
              </span>
              <span className="flex items-center gap-1.5 text-xs text-[#64748B]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" /> Pending ({stats.pending_this_month})
              </span>
            </div>
            <p className="text-lg font-bold text-[#0F172A] mt-3" style={{ fontFamily: 'Outfit' }}>{stats.collection_rate}% Collected</p>
          </CardContent>
        </Card>
      </div>

      {/* Hostel Breakdown (Super Admin) */}
      {stats.hostel_breakdown?.length > 0 && (
        <Card className="border-[#E2E8F0] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-[#0F172A]" style={{ fontFamily: 'Outfit' }}>Hostel Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="hostel-breakdown-table">
                <thead>
                  <tr className="border-b border-[#E2E8F0]">
                    <th className="text-left py-2 px-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Hostel</th>
                    <th className="text-right py-2 px-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Beds</th>
                    <th className="text-right py-2 px-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Occupancy</th>
                    <th className="text-right py-2 px-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Residents</th>
                    <th className="text-right py-2 px-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Revenue</th>
                    <th className="text-right py-2 px-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.hostel_breakdown.map(h => (
                    <tr key={h.id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]">
                      <td className="py-3 px-4 font-medium text-[#0F172A]">{h.name}</td>
                      <td className="text-right py-3 px-4 text-[#64748B]">{h.occupied_beds}/{h.total_beds}</td>
                      <td className="text-right py-3 px-4">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${h.occupancy_rate > 80 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {h.occupancy_rate}%
                        </span>
                      </td>
                      <td className="text-right py-3 px-4 text-[#64748B]">{h.total_residents}</td>
                      <td className="text-right py-3 px-4 font-medium text-[#0F172A]">₹{h.monthly_revenue.toLocaleString()}</td>
                      <td className="text-right py-3 px-4">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${h.pending_rent > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {h.pending_rent}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card className="border-[#E2E8F0] shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-[#0F172A]" style={{ fontFamily: 'Outfit' }}>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.recent_activities?.length > 0 ? stats.recent_activities.slice(0, 8).map((a, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-[#F1F5F9] last:border-0">
                <Activity className="w-4 h-4 text-[#64748B] mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#0F172A]">{a.details}</p>
                  <p className="text-xs text-[#94A3B8] mt-0.5">{a.user_name} &middot; {new Date(a.timestamp).toLocaleString()}</p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-[#94A3B8] text-center py-4">No recent activity</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
