import { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Users, DoorOpen, CreditCard, TrendingUp, AlertCircle, Calendar, Activity, Zap, Check, FileText, ArrowRight, Calculator } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'sonner';
import api from '../lib/api';

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#1D4ED8'];

export default function DashboardPage() {
  const { user } = useAuth();
  const { selectedHostel } = useOutletContext();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(() => {
    const params = {};
    if (selectedHostel) params.hostel_id = selectedHostel.id;
    api.get('/dashboard/stats', { params }).then(res => {
      console.log('[DASHBOARD DEBUG] Full API response:', JSON.stringify(res.data?.electricity || res.data?.electricity_summary || 'NO ELECTRICITY KEY'));
      console.log('[DASHBOARD DEBUG] res.data keys:', Object.keys(res.data || {}));
      setStats(res.data);
    }).catch(err => {
      console.error('[DASHBOARD DEBUG] API Error:', err);
    }).finally(() => setLoading(false));
  }, [selectedHostel]);

  useEffect(() => {
    fetchStats();
    const handleFocus = () => fetchStats();
    window.addEventListener('focus', handleFocus);
    window.addEventListener('electricity_data_changed', fetchStats);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('electricity_data_changed', fetchStats);
    };
  }, [fetchStats]);

  const markElectricityPaid = async (id) => {
    try {
      await api.post(`/electricity/bills/${id}/mark-paid`);
      toast.success('Electricity bill marked as paid');
      fetchStats();
      window.dispatchEvent(new Event('electricity_data_changed'));
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error marking bill as paid');
    }
  };

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
    { label: 'Total Properties', value: stats.total_hostels, icon: Building2, color: '#1D4ED8', show: user?.role === 'super_admin' },
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

  const elecSummary = stats.electricity || stats.electricity_summary || stats.electricitySummary || {};
  const totalBills = elecSummary.totalBills ?? elecSummary.total_bills ?? 0;
  const totalAmount = elecSummary.totalAmount ?? elecSummary.total_amount ?? 0;
  const collectedAmount = elecSummary.collectedAmount ?? elecSummary.collected ?? elecSummary.collected_amount ?? 0;
  const pendingAmount = elecSummary.pendingAmount ?? elecSummary.pending ?? elecSummary.pending_amount ?? 0;
  const paidBills = elecSummary.paidBills ?? elecSummary.paid_bills ?? 0;
  const pendingBills = elecSummary.pendingBills ?? elecSummary.pending_bills ?? 0;

  const recentElectricity = stats.recent_electricity_records || [];

  const elecPieData = [
    { name: 'Collected', value: elecSummary.month_collected || collectedAmount || 0 },
    { name: 'Pending', value: elecSummary.month_pending || pendingAmount || 0 },
  ];

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F172A] tracking-tight" style={{ fontFamily: 'Outfit' }}>
            {selectedHostel ? selectedHostel.name : 'Dashboard Overview'}
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Welcome back, {user?.name}. Here's your property & electricity performance summary.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={() => navigate('/dashboard/electricity')}
            className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs"
            data-testid="quick-view-electricity"
          >
            <Zap className="w-3.5 h-3.5 mr-1.5" /> View Electricity Module
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/dashboard/electricity')}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs"
            data-testid="quick-generate-electricity"
          >
            <Calculator className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> Generate Electricity Bill
          </Button>
        </div>
      </div>

      {/* Primary Stat cards */}
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

      {/* Electricity Summary Section */}
      <div className="space-y-4" data-testid="electricity-summary-section">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold text-[#0F172A]" style={{ fontFamily: 'Outfit' }}>Electricity Summary</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard/electricity')}
            className="text-xs text-[#1D4ED8] hover:text-[#1E40AF] p-0 h-auto font-medium"
          >
            View Full Module <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>

        {/* Electricity Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total Bills', value: totalBills, icon: FileText, color: '#3B82F6' },
            { label: 'Total Amount', value: `₹${totalAmount.toLocaleString()}`, icon: CreditCard, color: '#8B5CF6' },
            { label: 'Collected', value: `₹${collectedAmount.toLocaleString()}`, icon: Check, color: '#10B981' },
            { label: 'Pending Dues', value: `₹${pendingAmount.toLocaleString()}`, icon: AlertCircle, color: '#F59E0B' },
            { label: 'Pending Bills', value: pendingBills, icon: AlertCircle, color: '#EF4444' },
            { label: 'Paid Bills', value: paidBills, icon: Check, color: '#10B981' },
          ].map((c, i) => (
            <div key={i} className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-shadow" data-testid={`elec-card-${c.label.toLowerCase().replace(/\s+/g, '-')}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">{c.label}</span>
                <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: `${c.color}15` }}>
                  <c.icon className="w-3.5 h-3.5" style={{ color: c.color }} />
                </div>
              </div>
              <p className="text-lg font-bold text-[#0F172A]" style={{ fontFamily: 'Outfit' }}>{c.value}</p>
            </div>
          ))}
        </div>
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

        {/* Electricity Monthly Analytics Chart */}
        <Card className="border-[#E2E8F0] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-[#0F172A]" style={{ fontFamily: 'Outfit' }}>
              Electricity Analytics (This Month)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={elecPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                  <Cell fill="#10B981" />
                  <Cell fill="#F59E0B" />
                </Pie>
                <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString()}`, 'Amount']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2">
              <span className="flex items-center gap-1.5 text-xs text-[#64748B]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" /> Collected (₹{elecSummary.month_collected || 0})
              </span>
              <span className="flex items-center gap-1.5 text-xs text-[#64748B]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" /> Pending (₹{elecSummary.month_pending || 0})
              </span>
            </div>
            <p className="text-sm font-semibold text-[#0F172A] mt-3" style={{ fontFamily: 'Outfit' }}>
              {elecSummary.month_bills || 0} Bills Generated This Month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Electricity Records Table */}
      <Card className="border-[#E2E8F0] shadow-sm overflow-hidden" data-testid="dashboard-recent-electricity-card">
        <CardHeader className="flex flex-row items-center justify-between pb-3 bg-slate-50/50 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <CardTitle className="text-base font-semibold text-[#0F172A]" style={{ fontFamily: 'Outfit' }}>
              Recent Electricity Records
            </CardTitle>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/dashboard/electricity')}
            className="text-xs border-slate-200 text-slate-700 hover:bg-white"
            data-testid="view-all-electricity-btn"
          >
            View All Bills <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="recent-electricity-table">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-slate-50/30">
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Tenant</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Room</th>
                  <th className="text-right py-2.5 px-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Prev</th>
                  <th className="text-right py-2.5 px-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Current</th>
                  <th className="text-right py-2.5 px-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Units</th>
                  <th className="text-right py-2.5 px-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Amount</th>
                  <th className="text-center py-2.5 px-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Status</th>
                  <th className="text-center py-2.5 px-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Billing Date</th>
                  <th className="text-center py-2.5 px-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentElectricity.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-[#94A3B8]">
                      <Zap className="w-8 h-8 mx-auto mb-2 text-[#CBD5E1]" />
                      No electricity records available.
                    </td>
                  </tr>
                ) : (
                  recentElectricity.map(eb => (
                    <tr key={eb.id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]">
                      <td className="py-3 px-4 font-medium text-[#0F172A]">{eb.resident_name}</td>
                      <td className="py-3 px-4 text-[#64748B]">{eb.room_number || '—'}</td>
                      <td className="py-3 px-4 text-right text-[#64748B]">{eb.previous_reading}</td>
                      <td className="py-3 px-4 text-right text-[#64748B]">{eb.current_reading}</td>
                      <td className="py-3 px-4 text-right font-medium text-[#0F172A]">{eb.units_consumed?.toFixed(1)}</td>
                      <td className="py-3 px-4 text-right font-bold text-[#0F172A]">₹{eb.total_amount?.toFixed(2)}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={`text-[10px] font-semibold border ${eb.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {eb.payment_status === 'paid' ? 'PAID' : 'PENDING'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center text-xs text-[#64748B]">{eb.billing_month}/{eb.billing_year}</td>
                      <td className="py-3 px-4 text-center">
                        {eb.payment_status !== 'paid' ? (
                          <Button
                            size="sm"
                            className="h-6 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white px-2"
                            onClick={() => markElectricityPaid(eb.id)}
                            data-testid={`dash-pay-elec-${eb.id}`}
                          >
                            <Check className="w-3 h-3 mr-1" />Paid
                          </Button>
                        ) : (
                          <span className="text-xs text-emerald-600 font-medium">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

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
