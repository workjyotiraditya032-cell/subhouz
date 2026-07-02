import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Users, Plus, Pencil, Trash2, LogOut as LogOutIcon, Phone, Mail, MapPin, Search } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import api from '../lib/api';

export default function ResidentsPage() {
  const { user } = useAuth();
  const { selectedHostel } = useOutletContext();
  const [residents, setResidents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ hostel_id: '', name: '', phone: '', email: '', whatsapp: '', gender: 'male', occupation: '', room_id: '', bed_id: '', monthly_rent: 0, security_deposit: 0, guardian_name: '', guardian_phone: '' });
  const [beds, setBeds] = useState([]);

  const fetchResidents = () => {
    const params = { status: 'active' };
    if (selectedHostel) params.hostel_id = selectedHostel.id;
    api.get('/residents', { params }).then(res => setResidents(res.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchResidents(); }, [selectedHostel]);
  useEffect(() => {
    const hostelId = selectedHostel?.id || user?.hostel_id;
    if (hostelId) {
      api.get('/rooms', { params: { hostel_id: hostelId } }).then(res => setRooms(res.data)).catch(() => {});
    }
    if (user?.role === 'super_admin') {
      api.get('/hostels').then(res => setHostels(res.data)).catch(() => {});
    }
  }, [selectedHostel, user]);

  const fetchBeds = async (roomId) => {
    if (!roomId) { setBeds([]); return; }
    try {
      const res = await api.get(`/rooms/${roomId}`);
      setBeds((res.data.beds || []).filter(b => b.status === 'available'));
    } catch { setBeds([]); }
  };

  const handleSave = async () => {
    try {
      const hostelId = form.hostel_id || selectedHostel?.id || user?.hostel_id;
      if (!hostelId) { toast.error('Select a hostel'); return; }
      const payload = { ...form, hostel_id: hostelId, monthly_rent: parseFloat(form.monthly_rent) || 0, security_deposit: parseFloat(form.security_deposit) || 0 };
      if (!payload.whatsapp) payload.whatsapp = payload.phone;
      if (editing) {
        await api.put(`/residents/${editing}`, payload);
        toast.success('Resident updated');
      } else {
        await api.post('/residents', payload);
        toast.success('Resident added');
      }
      setDialogOpen(false); setEditing(null); fetchResidents();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error saving'); }
  };

  const handleCheckout = async (id, name) => {
    if (!window.confirm(`Check out ${name}? This will free their bed.`)) return;
    try { await api.post(`/residents/${id}/checkout`); toast.success(`${name} checked out`); fetchResidents(); } catch { toast.error('Error checking out'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this resident permanently?')) return;
    try { await api.delete(`/residents/${id}`); toast.success('Resident deleted'); fetchResidents(); } catch { toast.error('Error deleting'); }
  };

  const filtered = residents.filter(r => r.name?.toLowerCase().includes(search.toLowerCase()) || r.phone?.includes(search) || r.room_number?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6" data-testid="residents-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F172A] tracking-tight" style={{ fontFamily: 'Outfit' }}>Residents</h1>
          <p className="text-sm text-[#64748B] mt-1">{filtered.length} active residents</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-[#E2E8F0] rounded-lg px-3 py-1.5">
            <Search className="w-4 h-4 text-slate-400" />
            <input data-testid="resident-search" type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search residents..." className="bg-transparent text-sm border-none outline-none w-40" />
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-resident-btn" className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white" onClick={() => { setEditing(null); setForm({ hostel_id: selectedHostel?.id || user?.hostel_id || '', name: '', phone: '', email: '', whatsapp: '', gender: 'male', occupation: '', room_id: '', bed_id: '', monthly_rent: 0, security_deposit: 0, guardian_name: '', guardian_phone: '' }); setBeds([]); }}>
                <Plus className="w-4 h-4 mr-2" /> Add Resident
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle style={{ fontFamily: 'Outfit' }}>{editing ? 'Edit Resident' : 'Add New Resident'}</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                {user?.role === 'super_admin' && (
                  <div><Label className="text-xs">Hostel</Label>
                    <Select value={form.hostel_id} onValueChange={v => { setForm({...form, hostel_id: v, room_id: '', bed_id: ''}); api.get('/rooms', { params: { hostel_id: v }}).then(r => setRooms(r.data)); }}>
                      <SelectTrigger><SelectValue placeholder="Select hostel" /></SelectTrigger>
                      <SelectContent>{hostels.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-xs">Name *</Label><Input data-testid="resident-name-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                  <div><Label className="text-xs">Phone *</Label><Input data-testid="resident-phone-input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-xs">Email</Label><Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                  <div><Label className="text-xs">WhatsApp</Label><Input value={form.whatsapp} onChange={e => setForm({...form, whatsapp: e.target.value})} placeholder="Same as phone" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Gender</Label>
                    <Select value={form.gender} onValueChange={v => setForm({...form, gender: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Occupation</Label><Input value={form.occupation} onChange={e => setForm({...form, occupation: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Room</Label>
                    <Select value={form.room_id} onValueChange={v => { setForm({...form, room_id: v, bed_id: ''}); fetchBeds(v); const rm = rooms.find(r=>r.id===v); if(rm) setForm(f=>({...f, room_id: v, monthly_rent: rm.rent})); }}>
                      <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                      <SelectContent>{rooms.map(r => <SelectItem key={r.id} value={r.id}>Room {r.room_number} ({r.occupied||0}/{r.capacity})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Bed</Label>
                    <Select value={form.bed_id} onValueChange={v => setForm({...form, bed_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Select bed" /></SelectTrigger>
                      <SelectContent>{beds.map(b => <SelectItem key={b.id} value={b.id}>{b.bed_number}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-xs">Monthly Rent (₹)</Label><Input type="number" data-testid="resident-rent-input" value={form.monthly_rent} onChange={e => setForm({...form, monthly_rent: e.target.value})} /></div>
                  <div><Label className="text-xs">Security Deposit (₹)</Label><Input type="number" value={form.security_deposit} onChange={e => setForm({...form, security_deposit: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-xs">Guardian Name</Label><Input value={form.guardian_name} onChange={e => setForm({...form, guardian_name: e.target.value})} /></div>
                  <div><Label className="text-xs">Guardian Phone</Label><Input value={form.guardian_phone} onChange={e => setForm({...form, guardian_phone: e.target.value})} /></div>
                </div>
                <Button data-testid="save-resident-btn" onClick={handleSave} className="w-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white">{editing ? 'Update' : 'Add Resident'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="stat-card animate-pulse h-64" />
      ) : filtered.length === 0 ? (
        <Card className="border-[#E2E8F0]"><CardContent className="py-12 text-center"><Users className="w-12 h-12 text-[#CBD5E1] mx-auto mb-3" /><p className="text-[#64748B]">{search ? 'No matching residents' : 'No residents yet'}</p></CardContent></Card>
      ) : (
        <Card className="border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table data-testid="residents-table">
              <TableHeader>
                <TableRow className="border-b border-[#E2E8F0]">
                  <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Name</TableHead>
                  <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Room/Bed</TableHead>
                  <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Phone</TableHead>
                  <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Rent</TableHead>
                  <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Occupation</TableHead>
                  <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id} className="hover:bg-[#F8FAFC]" data-testid={`resident-row-${r.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1D4ED8]/10 flex items-center justify-center text-xs font-bold text-[#1D4ED8]">{r.name?.charAt(0)}</div>
                        <div>
                          <p className="font-medium text-[#0F172A] text-sm">{r.name}</p>
                          <p className="text-xs text-[#94A3B8]">{r.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-[#64748B]">{r.room_number || '—'}/{r.bed_number || '—'}</TableCell>
                    <TableCell className="text-sm text-[#64748B]">{r.phone}</TableCell>
                    <TableCell className="text-sm font-medium text-[#0F172A]">₹{r.monthly_rent?.toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-[#64748B]">{r.occupation || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditing(r.id); setForm({ hostel_id: r.hostel_id, name: r.name, phone: r.phone, email: r.email || '', whatsapp: r.whatsapp || '', gender: r.gender || 'male', occupation: r.occupation || '', room_id: r.room_id || '', bed_id: r.bed_id || '', monthly_rent: r.monthly_rent || 0, security_deposit: r.security_deposit || 0, guardian_name: r.guardian_name || '', guardian_phone: r.guardian_phone || '' }); setDialogOpen(true); }}><Pencil className="w-3.5 h-3.5 text-[#64748B]" /></Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleCheckout(r.id, r.name)} title="Check Out"><LogOutIcon className="w-3.5 h-3.5 text-amber-500" /></Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDelete(r.id)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
