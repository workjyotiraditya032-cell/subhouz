import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CreditCard, Check, X, ChevronLeft, ChevronRight, Receipt, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import api from '../lib/api';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function RentTrackerPage() {
  const { user } = useAuth();
  const { selectedHostel } = useOutletContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(null);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const fetchTracker = useCallback(() => {
    setLoading(true);
    const params = { month, year };
    if (selectedHostel) params.hostel_id = selectedHostel.id;
    api.get('/rent/tracker', { params })
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [month, year, selectedHostel]);

  useEffect(() => { fetchTracker(); }, [fetchTracker]);

  const handleMarkPaid = async (residentId, name) => {
    setMarking(residentId);
    try {
      const res = await api.post(`/rent/mark-paid/${residentId}?month=${month}&year=${year}`, { payment_mode: 'cash' });
      toast.success(`Rent marked paid for ${name}`, { description: `Receipt: ${res.data.receipt_number}` });
      fetchTracker();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error marking payment');
    } finally {
      setMarking(null);
    }
  };

  const handleMarkUnpaid = async (residentId) => {
    try {
      await api.post(`/rent/mark-unpaid/${residentId}?month=${month}&year=${year}`);
      toast.info('Payment status reverted');
      fetchTracker();
    } catch { toast.error('Error reverting payment'); }
  };

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const statusStyle = {
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    overdue: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <div className="space-y-6" data-testid="rent-tracker-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F172A] tracking-tight" style={{ fontFamily: 'Outfit' }}>Rent Tracker</h1>
          <p className="text-sm text-[#64748B] mt-1">Mark rent payments with one tap. Receipts auto-generated.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={prevMonth} data-testid="prev-month-btn"><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm font-semibold text-[#0F172A] w-36 text-center" data-testid="current-month-display">{MONTH_NAMES[month - 1]} {year}</span>
          <Button variant="outline" size="sm" onClick={nextMonth} data-testid="next-month-btn"><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Summary cards */}
      {data?.summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="stat-card" data-testid="summary-total">
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1">Total Residents</p>
            <p className="text-2xl font-bold text-[#0F172A]" style={{ fontFamily: 'Outfit' }}>{data.summary.total}</p>
          </div>
          <div className="stat-card" data-testid="summary-paid">
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Paid</p>
            <p className="text-2xl font-bold text-emerald-700" style={{ fontFamily: 'Outfit' }}>{data.summary.paid}</p>
          </div>
          <div className="stat-card" data-testid="summary-pending">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">Pending</p>
            <p className="text-2xl font-bold text-amber-700" style={{ fontFamily: 'Outfit' }}>{data.summary.pending}</p>
          </div>
          <div className="stat-card" data-testid="summary-overdue">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1">Overdue</p>
            <p className="text-2xl font-bold text-red-700" style={{ fontFamily: 'Outfit' }}>{data.summary.overdue}</p>
          </div>
          <div className="stat-card" data-testid="summary-collected">
            <p className="text-xs font-semibold text-[#1D4ED8] uppercase tracking-wider mb-1">Collected</p>
            <p className="text-2xl font-bold text-[#1D4ED8]" style={{ fontFamily: 'Outfit' }}>₹{(data.summary.total_collected || 0).toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Rent table */}
      <Card className="border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table data-testid="rent-tracker-table">
            <TableHeader>
              <TableRow className="border-b border-[#E2E8F0]">
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider w-[200px]">Resident</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Room/Bed</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider text-right">Rent</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider text-center">Status</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Receipt</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={6}><div className="h-10 bg-slate-100 rounded animate-pulse" /></TableCell></TableRow>
                ))
              ) : data?.entries?.length > 0 ? data.entries.map(entry => (
                <TableRow key={entry.resident_id} className="hover:bg-[#F8FAFC] transition-colors" data-testid={`rent-row-${entry.resident_id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1D4ED8]/10 flex items-center justify-center text-xs font-bold text-[#1D4ED8]">{entry.name?.charAt(0)}</div>
                      <div>
                        <p className="font-medium text-sm text-[#0F172A]">{entry.name}</p>
                        <p className="text-xs text-[#94A3B8]">{entry.phone}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-[#64748B]">{entry.room_number}/{entry.bed_number}</TableCell>
                  <TableCell className="text-sm font-semibold text-[#0F172A] text-right">₹{entry.monthly_rent?.toLocaleString()}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={`${statusStyle[entry.status]} text-xs font-semibold border`} data-testid={`rent-status-${entry.resident_id}`}>
                      {entry.status === 'paid' ? 'PAID' : entry.status === 'overdue' ? 'OVERDUE' : 'PENDING'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-[#64748B]">
                    {entry.receipt_number ? (
                      <span className="flex items-center gap-1"><Receipt className="w-3 h-3" />{entry.receipt_number}</span>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    {entry.status === 'paid' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleMarkUnpaid(entry.resident_id)}
                        data-testid={`undo-paid-${entry.resident_id}`}
                      >
                        <X className="w-3 h-3 mr-1" /> Undo
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className={`h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm ${marking === entry.resident_id ? 'opacity-50' : ''}`}
                        disabled={marking === entry.resident_id}
                        onClick={() => handleMarkPaid(entry.resident_id, entry.name)}
                        data-testid={`mark-paid-${entry.resident_id}`}
                      >
                        {marking === entry.resident_id ? (
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1" />
                        ) : (
                          <Check className="w-3 h-3 mr-1" />
                        )}
                        Mark Paid
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-[#94A3B8]">
                    <CreditCard className="w-12 h-12 text-[#CBD5E1] mx-auto mb-3" />
                    No residents found for this period
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
