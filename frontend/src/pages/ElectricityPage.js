import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Zap, Plus, Check, Search, ChevronLeft, ChevronRight, FileText, Calculator, Pencil, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '../components/ui/alert-dialog';
import { toast } from 'sonner';
import api from '../lib/api';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function ElectricityPage() {
  const { user } = useAuth();
  const { selectedHostel } = useOutletContext();
  const [bills, setBills] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [residents, setResidents] = useState([]);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ resident_id: '', previous_reading: 0, current_reading: 0, rate_per_unit: 8, additional_charges: 0 });
  const [editingBill, setEditingBill] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [undoModalOpen, setUndoModalOpen] = useState(false);
  const [undoingBill, setUndoingBill] = useState(null);
  const [isUndoing, setIsUndoing] = useState(false);

  const fetchData = useCallback(() => {
    const params = { month, year };
    if (selectedHostel) params.hostel_id = selectedHostel.id;
    Promise.all([
      api.get('/electricity/bills', { params }),
      api.get('/electricity/stats', { params }),
      api.get('/residents', { params: { status: 'active', ...(selectedHostel ? { hostel_id: selectedHostel.id } : {}) } })
    ]).then(([bRes, sRes, rRes]) => { setBills(bRes.data); setStats(sRes.data); setResidents(rRes.data); })
      .catch(console.error).finally(() => setLoading(false));
  }, [month, year, selectedHostel]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    try {
      const prevReading = parseFloat(form.previous_reading || 0);
      const currReading = parseFloat(form.current_reading || 0);

      if (currReading < prevReading) {
        toast.error('Current Reading cannot be less than Previous Reading.');
        return;
      }

      const resident = residents.find(r => r.id === form.resident_id);
      const payload = {
        resident_id: form.resident_id,
        hostel_id: selectedHostel?.id || user?.hostel_id || resident?.hostel_id || '',
        room_number: resident?.room_number || '',
        resident_name: resident?.name || '',
        previous_reading: prevReading,
        current_reading: currReading,
        rate_per_unit: parseFloat(form.rate_per_unit || 8),
        additional_charges: parseFloat(form.additional_charges || 0),
        billing_month: month,
        billing_year: year,
      };
      if (editingBill) {
        const res = await api.put(`/electricity/bills/${editingBill}`, {
          previous_reading: payload.previous_reading,
          current_reading: payload.current_reading,
          rate_per_unit: payload.rate_per_unit,
          additional_charges: payload.additional_charges
        });
        toast.success('Bill updated successfully');
        setBills(prev => prev.map(b => b.id === editingBill ? { ...b, ...res.data } : b));
      } else {
        const res = await api.post('/electricity/bills', payload);
        toast.success('Bill created');
        setBills(prev => [res.data, ...prev]);
      }
      setDialogOpen(false); setEditingBill(null); fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error saving bill'); }
  };

  const markPaid = async (id) => {
    try { await api.post(`/electricity/bills/${id}/mark-paid`); toast.success('Marked as paid'); fetchData(); }
    catch (err) { toast.error(err.response?.data?.detail || 'Error marking bill as paid'); }
  };

  const confirmUndo = async () => {
    if (!undoingBill) return;
    const recordId = typeof undoingBill === 'string' ? undoingBill : (undoingBill.id || undoingBill._id);
    if (!recordId) {
      toast.error('Invalid electricity record ID.');
      setUndoModalOpen(false);
      return;
    }
    
    setIsUndoing(true);
    try {
      let res;
      try {
        res = await api.post(`/electricity/bills/${recordId}/undo`);
      } catch (firstErr) {
        if (firstErr.response?.status === 404 || firstErr.response?.status === 405) {
          try {
            res = await api.post(`/electricity/${recordId}/undo`);
          } catch (secondErr) {
            if (secondErr.response?.status === 404 || secondErr.response?.status === 405) {
              res = await api.delete(`/electricity/bills/${recordId}`);
            } else {
              throw secondErr;
            }
          }
        } else {
          throw firstErr;
        }
      }
      
      // Immediately remove record from local table UI
      setBills(prev => prev.filter(b => (b.id || b._id) !== recordId));
      
      toast.success(res?.data?.message || 'Electricity entry undone successfully.');
      setUndoModalOpen(false);
      setUndoingBill(null);
      fetchData();
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.message;
      let errorMsg = 'Error undoing electricity entry';
      if (typeof detail === 'string') {
        errorMsg = detail;
      } else if (err.response?.status === 404) {
        errorMsg = 'Electricity record not found.';
      } else if (err.response?.status === 403) {
        errorMsg = 'Permission denied. You can only undo entries for your own hostel.';
      }
      toast.error(errorMsg);
    } finally {
      setIsUndoing(false);
    }
  };

  const generateBills = async () => {
    setGenerating(true);
    try {
      const res = await api.post(`/electricity/generate-monthly?month=${month}&year=${year}`);
      toast.success(res.data.message);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
    finally { setGenerating(false); }
  };

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const units = Math.max(0, parseFloat(form.current_reading || 0) - parseFloat(form.previous_reading || 0));
  const total = units * parseFloat(form.rate_per_unit || 8) + parseFloat(form.additional_charges || 0);

  return (
    <div className="space-y-6" data-testid="electricity-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F172A] tracking-tight" style={{ fontFamily: 'Outfit' }}>Electricity Billing</h1>
          <p className="text-sm text-[#64748B] mt-1">Manage meter readings, generate bills, and adjust entries</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-sm font-semibold w-32 text-center">{MONTH_NAMES[month-1]} {year}</span>
            <Button variant="outline" size="sm" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
          </div>
          <Button onClick={generateBills} disabled={generating} className="bg-amber-500 hover:bg-amber-600 text-white" data-testid="generate-bills-btn">
            {generating ? 'Generating...' : <><Calculator className="w-4 h-4 mr-2" />Generate Monthly Bills</>}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Total Bills', value: stats.total_bills || 0 },
          { label: 'Paid', value: stats.paid || 0, color: '#10B981' },
          { label: 'Pending', value: stats.pending || 0, color: '#F59E0B' },
          { label: 'Total Units', value: `${stats.total_units || 0}` },
          { label: 'Total Amount', value: `₹${(stats.total_amount || 0).toLocaleString()}` },
          { label: 'Collected', value: `₹${(stats.collected || 0).toLocaleString()}`, color: '#10B981' },
          { label: 'Outstanding', value: `₹${(stats.outstanding || 0).toLocaleString()}`, color: '#EF4444' },
        ].map((s, i) => (
          <div key={i} className="stat-card text-center">
            <p className="text-lg font-bold" style={{ color: s.color || '#0F172A', fontFamily: 'Outfit' }}>{s.value}</p>
            <p className="text-[10px] text-[#64748B] uppercase tracking-wider font-semibold mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Add bill */}
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-bill-btn" className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white" onClick={() => { setEditingBill(null); setForm({ resident_id: '', previous_reading: 0, current_reading: 0, rate_per_unit: 8, additional_charges: 0 }); }}>
              <Plus className="w-4 h-4 mr-2" /> Add Bill
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle style={{ fontFamily: 'Outfit' }}>{editingBill ? 'Edit Electricity Bill' : 'New Electricity Bill'}</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              {!editingBill ? (
                <div>
                  <Label className="text-xs">Resident *</Label>
                  <Select value={form.resident_id} onValueChange={v => setForm({ ...form, resident_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select resident" /></SelectTrigger>
                    <SelectContent>{residents.map(r => <SelectItem key={r.id} value={r.id}>{r.name} (Room {r.room_number})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                  <span className="text-slate-500 font-medium">Resident: </span>
                  <span className="font-semibold text-slate-900">{bills.find(b=>b.id===editingBill)?.resident_name}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs">Previous Reading</Label><Input type="number" data-testid="previous-reading" value={form.previous_reading} onChange={e => setForm({ ...form, previous_reading: e.target.value })} /></div>
                <div><Label className="text-xs">Current Reading</Label><Input type="number" data-testid="current-reading" value={form.current_reading} onChange={e => setForm({ ...form, current_reading: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs">Rate/Unit (₹)</Label><Input type="number" data-testid="rate-per-unit" value={form.rate_per_unit} onChange={e => setForm({ ...form, rate_per_unit: e.target.value })} /></div>
                <div><Label className="text-xs">Additional Charges (₹)</Label><Input type="number" data-testid="additional-charges" value={form.additional_charges} onChange={e => setForm({ ...form, additional_charges: e.target.value })} /></div>
              </div>
              <div className="bg-[#F1F5F9] rounded-lg p-4 text-sm">
                <div className="flex justify-between"><span className="text-[#64748B]">Units Consumed:</span><span className="font-semibold">{units.toFixed(1)}</span></div>
                <div className="flex justify-between mt-1"><span className="text-[#64748B]">Total Bill:</span><span className="font-bold text-[#0F172A] text-lg">₹{total.toFixed(2)}</span></div>
              </div>
              <Button data-testid="save-bill-btn" onClick={handleSave} className="w-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white">{editingBill ? 'Update Bill' : 'Create Bill'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Bills table */}
      <Card className="border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table data-testid="electricity-table">
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Resident</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Room</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider text-right">Prev</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider text-right">Current</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider text-right">Units</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider text-right">Amount</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider text-center">Status</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={8}><div className="h-10 bg-slate-100 rounded animate-pulse" /></TableCell></TableRow>) :
              bills.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-[#94A3B8]"><Zap className="w-10 h-10 mx-auto mb-2 text-[#CBD5E1]" />No bills for this month. Click "Generate Monthly Bills" to create them.</TableCell></TableRow>
              ) : bills.map(b => (
                <TableRow key={b.id} className="hover:bg-[#F8FAFC]" data-testid={`bill-row-${b.id}`}>
                  <TableCell className="text-sm font-medium text-[#0F172A]">{b.resident_name}</TableCell>
                  <TableCell className="text-sm text-[#64748B]">{b.room_number || '—'}</TableCell>
                  <TableCell className="text-sm text-[#64748B] text-right">{b.previous_reading}</TableCell>
                  <TableCell className="text-sm text-[#64748B] text-right">{b.current_reading}</TableCell>
                  <TableCell className="text-sm font-medium text-[#0F172A] text-right">{b.units_consumed?.toFixed(1)}</TableCell>
                  <TableCell className="text-sm font-bold text-[#0F172A] text-right">₹{b.total_amount?.toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={`text-[10px] font-semibold border ${b.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {b.payment_status === 'paid' ? 'PAID' : 'PENDING'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {b.payment_status !== 'paid' && (
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => markPaid(b.id)}
                          data-testid={`pay-bill-${b.id}`}
                          title="Mark as Paid"
                        >
                          <Check className="w-3 h-3 mr-1" />Paid
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                        title="Edit Reading/Bill"
                        data-testid={`edit-bill-${b.id}`}
                        onClick={() => {
                          setEditingBill(b.id);
                          setForm({
                            resident_id: b.resident_id,
                            previous_reading: b.previous_reading,
                            current_reading: b.current_reading,
                            rate_per_unit: b.rate_per_unit,
                            additional_charges: b.additional_charges || 0
                          });
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                        title="Undo Reading/Bill"
                        data-testid={`undo-bill-${b.id}`}
                        onClick={() => {
                          setUndoingBill(b);
                          setUndoModalOpen(true);
                        }}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Undo Confirmation Dialog */}
      <AlertDialog open={undoModalOpen} onOpenChange={setUndoModalOpen}>
        <AlertDialogContent data-testid="undo-electricity-dialog" className="max-w-md rounded-2xl p-6 bg-white shadow-2xl border border-slate-100">
          <AlertDialogHeader>
            <div className="mx-auto sm:mx-0 w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-2">
              <RotateCcw className="w-6 h-6 text-amber-600" />
            </div>
            <AlertDialogTitle className="text-xl font-semibold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Undo Electricity Entry
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 text-sm mt-1">
              Are you sure you want to undo this electricity record for <span className="font-semibold text-slate-900">{undoingBill?.resident_name}</span> ({undoingBill?.billing_month}/{undoingBill?.billing_year})? This action will restore the previous state and automatically update all related calculations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <AlertDialogCancel
              disabled={isUndoing}
              data-testid="undo-cancel-btn"
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border-none"
            >
              Cancel
            </AlertDialogCancel>
            <Button
              data-testid="undo-confirm-btn"
              disabled={isUndoing}
              onClick={confirmUndo}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-lg shadow-sm"
            >
              {isUndoing ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Undoing...</span>
                </div>
              ) : (
                <span>Undo Entry</span>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
