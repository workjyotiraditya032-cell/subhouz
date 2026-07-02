import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MessageCircle, Plus, Search, Filter, Trash2, Phone, Mail, Calendar, User, ChevronDown, ExternalLink, StickyNote } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import api from '../lib/api';

const STATUS_STYLES = {
  new: 'bg-blue-50 text-blue-700 border-blue-200',
  contacted: 'bg-amber-50 text-amber-700 border-amber-200',
  'follow-up': 'bg-purple-50 text-purple-700 border-purple-200',
  converted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  closed: 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function EnquiriesPage() {
  const { user } = useAuth();
  const { selectedHostel } = useOutletContext();
  const [enquiries, setEnquiries] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [users, setUsers] = useState([]);

  const fetchEnquiries = () => {
    const params = {};
    if (selectedHostel) params.hostel_id = selectedHostel.id;
    if (statusFilter !== 'all') params.status = statusFilter;
    Promise.all([
      api.get('/enquiries', { params }),
      api.get('/enquiries/stats', { params: selectedHostel ? { hostel_id: selectedHostel.id } : {} })
    ]).then(([eRes, sRes]) => { setEnquiries(eRes.data); setStats(sRes.data); })
      .catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchEnquiries(); }, [selectedHostel, statusFilter]);
  useEffect(() => {
    if (user?.role === 'super_admin') api.get('/admin/users').then(r => setUsers(r.data)).catch(() => {});
  }, [user]);

  const updateEnquiry = async (id, updates) => {
    try {
      await api.put(`/enquiries/${id}`, updates);
      toast.success('Enquiry updated');
      fetchEnquiries();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const addNote = async () => {
    if (!noteText.trim() || !selected) return;
    try {
      await api.post(`/enquiries/${selected.id}/notes`, { text: noteText });
      toast.success('Note added');
      setNoteText('');
      fetchEnquiries();
      const updated = await api.get(`/enquiries/${selected.id}`);
      setSelected(updated.data);
    } catch { toast.error('Error adding note'); }
  };

  const deleteEnquiry = async (id) => {
    if (!window.confirm('Delete this enquiry?')) return;
    try { await api.delete(`/enquiries/${id}`); toast.success('Deleted'); fetchEnquiries(); }
    catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const filtered = enquiries.filter(e =>
    (e.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.phone || '').includes(search) ||
    (e.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6" data-testid="enquiries-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F172A] tracking-tight" style={{ fontFamily: 'Outfit' }}>Enquiry Management</h1>
          <p className="text-sm text-[#64748B] mt-1">{enquiries.length} enquiries total</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: stats.total || 0, color: '#0F172A' },
          { label: 'New', value: stats.new || 0, color: '#3B82F6' },
          { label: 'Contacted', value: stats.contacted || 0, color: '#F59E0B' },
          { label: 'Follow-up', value: stats.follow_up || 0, color: '#8B5CF6' },
          { label: 'Converted', value: stats.converted || 0, color: '#10B981' },
          { label: 'Closed', value: stats.closed || 0, color: '#64748B' },
        ].map((s, i) => (
          <div key={i} className="stat-card text-center" data-testid={`enquiry-stat-${s.label.toLowerCase()}`}>
            <p className="text-2xl font-bold" style={{ color: s.color, fontFamily: 'Outfit' }}>{s.value}</p>
            <p className="text-[10px] text-[#64748B] uppercase tracking-wider font-semibold mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-white border border-[#E2E8F0] rounded-lg px-3 py-1.5 flex-1 max-w-xs">
          <Search className="w-4 h-4 text-slate-400" />
          <input data-testid="enquiry-search" type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search enquiries..." className="bg-transparent text-sm border-none outline-none w-full" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9 text-sm" data-testid="enquiry-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="follow-up">Follow-up</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table data-testid="enquiries-table">
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Name</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Contact</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Hostel</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Source</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Date</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? [...Array(3)].map((_, i) => (
                <TableRow key={i}><TableCell colSpan={7}><div className="h-10 bg-slate-100 rounded animate-pulse" /></TableCell></TableRow>
              )) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-[#94A3B8]"><MessageCircle className="w-10 h-10 mx-auto mb-2 text-[#CBD5E1]" />No enquiries found</TableCell></TableRow>
              ) : filtered.map(e => (
                <TableRow key={e.id} className="hover:bg-[#F8FAFC] cursor-pointer" onClick={() => setSelected(e)} data-testid={`enquiry-row-${e.id}`}>
                  <TableCell>
                    <p className="font-medium text-sm text-[#0F172A]">{e.name}</p>
                    {e.message && <p className="text-xs text-[#94A3B8] line-clamp-1 max-w-[200px]">{e.message}</p>}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-[#64748B]">{e.phone}</p>
                    {e.email && <p className="text-xs text-[#94A3B8]">{e.email}</p>}
                  </TableCell>
                  <TableCell className="text-sm text-[#64748B]">{e.preferred_hostel || e.hostel_id || '—'}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{e.source || 'website'}</Badge></TableCell>
                  <TableCell>
                    <Select value={e.status || 'new'} onValueChange={v => { updateEnquiry(e.id, { status: v }); }}>
                      <SelectTrigger className={`h-7 w-28 text-[10px] font-semibold border rounded-full ${STATUS_STYLES[e.status] || STATUS_STYLES.new}`} onClick={ev => ev.stopPropagation()}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="follow-up">Follow-up</SelectItem>
                        <SelectItem value="converted">Converted</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs text-[#94A3B8]">{e.created_at ? new Date(e.created_at).toLocaleDateString() : '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={ev => ev.stopPropagation()}>
                      {e.phone && <a href={`tel:${e.phone}`} className="p-1.5 rounded hover:bg-[#F1F5F9]"><Phone className="w-3.5 h-3.5 text-[#64748B]" /></a>}
                      {user?.role === 'super_admin' && <button onClick={() => deleteEnquiry(e.id)} className="p-1.5 rounded hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Outfit' }}>Enquiry Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-[10px] text-[#94A3B8] uppercase">Name</Label><p className="text-sm font-medium">{selected.name}</p></div>
                  <div><Label className="text-[10px] text-[#94A3B8] uppercase">Phone</Label><p className="text-sm">{selected.phone}</p></div>
                  <div><Label className="text-[10px] text-[#94A3B8] uppercase">Email</Label><p className="text-sm">{selected.email || '—'}</p></div>
                  <div><Label className="text-[10px] text-[#94A3B8] uppercase">Hostel</Label><p className="text-sm">{selected.preferred_hostel || '—'}</p></div>
                </div>
                {selected.message && <div><Label className="text-[10px] text-[#94A3B8] uppercase">Message</Label><p className="text-sm text-[#64748B]">{selected.message}</p></div>}

                {/* Status + Assign */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[10px] text-[#94A3B8] uppercase">Status</Label>
                    <Select value={selected.status || 'new'} onValueChange={v => updateEnquiry(selected.id, { status: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="follow-up">Follow-up</SelectItem>
                        <SelectItem value="converted">Converted</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {user?.role === 'super_admin' && (
                    <div>
                      <Label className="text-[10px] text-[#94A3B8] uppercase">Assign To</Label>
                      <Select value={selected.assigned_to || '__none__'} onValueChange={v => updateEnquiry(selected.id, { assigned_to: v === '__none__' ? '' : v })}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Unassigned</SelectItem>
                          {users.filter(u => u.role === 'hostel_admin').map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <Label className="text-[10px] text-[#94A3B8] uppercase mb-2 block">Follow-up Notes</Label>
                  {(selected.follow_up_notes || []).length > 0 ? (
                    <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                      {selected.follow_up_notes.map((n, i) => (
                        <div key={i} className="bg-[#F8FAFC] rounded-lg px-3 py-2 text-sm">
                          <p className="text-[#0F172A]">{n.text}</p>
                          <p className="text-[10px] text-[#94A3B8] mt-1">{n.by} &middot; {n.at ? new Date(n.at).toLocaleString() : ''}</p>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-xs text-[#94A3B8] mb-3">No notes yet</p>}
                  <div className="flex gap-2">
                    <Input value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a follow-up note..." className="text-sm h-9" data-testid="enquiry-note-input" />
                    <Button onClick={addNote} size="sm" className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white h-9" data-testid="add-note-btn">
                      <StickyNote className="w-3.5 h-3.5 mr-1" /> Add
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
