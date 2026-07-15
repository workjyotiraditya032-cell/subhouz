import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Users, Plus, Pencil, Trash2, LogOut as LogOutIcon, Phone, Mail, Search, Camera, FileText, Shield, ShieldCheck, AlertCircle, X, Upload, User, Calendar } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
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
  const [detailResident, setDetailResident] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [form, setForm] = useState({ hostel_id: '', name: '', phone: '', email: '', whatsapp: '', gender: 'male', occupation: '', workplace: '', room_id: '', bed_id: '', monthly_rent: 0, security_deposit: 0, guardian_name: '', guardian_phone: '', guardian_relation: '', permanent_address: '', check_in_date: '', agreement_start: '', agreement_end: '' });
  const [beds, setBeds] = useState([]);
  const [docForm, setDocForm] = useState({ aadhaar_url: '', id_verified: false, emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '' });

  const fetchResidents = () => {
    const params = { status: 'active' };
    if (selectedHostel) params.hostel_id = selectedHostel.id;
    api.get('/residents', { params }).then(res => setResidents(res.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchResidents(); }, [selectedHostel]); // eslint-disable-line
  useEffect(() => {
    const hostelId = selectedHostel?.id || user?.hostel_id;
    if (hostelId) api.get('/rooms', { params: { hostel_id: hostelId } }).then(res => setRooms(res.data)).catch(() => {});
    if (user?.role === 'super_admin') api.get('/hostels').then(res => setHostels(res.data)).catch(() => {});
  }, [selectedHostel, user]);

  const fetchBeds = async (roomId) => {
    if (!roomId) { setBeds([]); return; }
    try { const res = await api.get(`/rooms/${roomId}`); setBeds((res.data.beds || []).filter(b => b.status === 'available')); } catch { setBeds([]); }
  };

  const handleSave = async () => {
    try {
      const hostelId = form.hostel_id || selectedHostel?.id || user?.hostel_id;
      if (!hostelId) { toast.error('Select a hostel'); return; }
      const payload = { ...form, hostel_id: hostelId, monthly_rent: parseFloat(form.monthly_rent) || 0, security_deposit: parseFloat(form.security_deposit) || 0 };
      if (!payload.whatsapp) payload.whatsapp = payload.phone;
      if (editing) { await api.put(`/residents/${editing}`, payload); toast.success('Resident updated'); }
      else { await api.post('/residents', payload); toast.success('Resident added'); }
      setDialogOpen(false); setEditing(null); fetchResidents();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error saving'); }
  };

  const openDetail = async (r) => {
    try {
      const res = await api.get(`/residents/${r.id}`);
      setDetailResident(res.data);
      setDocForm({
        aadhaar_url: res.data.aadhaar_url || '',
        id_verified: res.data.id_verified || false,
        emergency_contact_name: res.data.emergency_contact_name || '',
        emergency_contact_phone: res.data.emergency_contact_phone || '',
        emergency_contact_relation: res.data.emergency_contact_relation || '',
      });
      setDetailOpen(true);
    } catch { toast.error('Error loading resident details'); }
  };

  const saveDocuments = async () => {
    if (!detailResident) return;
    try {
      await api.put(`/residents/${detailResident.id}/documents`, docForm);
      toast.success('Documents updated successfully');
      fetchResidents();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error saving documents'); }
  };

  const handleCheckout = async (id, name) => {
    if (!window.confirm(`Check out ${name}? This will free their bed.`)) return;
    try { await api.post(`/residents/${id}/checkout`); toast.success(`${name} checked out`); fetchResidents(); } catch { toast.error('Error'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this resident permanently?')) return;
    try { await api.delete(`/residents/${id}`); toast.success('Deleted'); fetchResidents(); } catch { toast.error('Error'); }
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
              <Button data-testid="add-resident-btn" className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white" onClick={() => { setEditing(null); setForm({ hostel_id: selectedHostel?.id || user?.hostel_id || '', name: '', phone: '', email: '', whatsapp: '', gender: 'male', occupation: '', workplace: '', room_id: '', bed_id: '', monthly_rent: 0, security_deposit: 0, guardian_name: '', guardian_phone: '', guardian_relation: '', permanent_address: '', check_in_date: new Date().toISOString().split('T')[0], agreement_start: '', agreement_end: '' }); setBeds([]); }}>
                <Plus className="w-4 h-4 mr-2" /> Add Resident
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
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
                <div className="grid grid-cols-3 gap-4">
                  <div><Label className="text-xs">Name *</Label><Input data-testid="resident-name-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                  <div><Label className="text-xs">Phone *</Label><Input data-testid="resident-phone-input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                  <div><Label className="text-xs">Email</Label><Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div><Label className="text-xs">WhatsApp</Label><Input value={form.whatsapp} onChange={e => setForm({...form, whatsapp: e.target.value})} placeholder="Same as phone" /></div>
                  <div><Label className="text-xs">Gender</Label>
                    <Select value={form.gender} onValueChange={v => setForm({...form, gender: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Occupation</Label><Input value={form.occupation} onChange={e => setForm({...form, occupation: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div><Label className="text-xs">Workplace</Label><Input value={form.workplace} onChange={e => setForm({...form, workplace: e.target.value})} /></div>
                  <div><Label className="text-xs">Room</Label>
                    <Select value={form.room_id} onValueChange={v => { setForm({...form, room_id: v, bed_id: ''}); fetchBeds(v); const rm = rooms.find(r=>r.id===v); if(rm) setForm(f=>({...f, room_id: v, monthly_rent: rm.rent})); }}>
                      <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                      <SelectContent>{rooms.map(r => <SelectItem key={r.id} value={r.id}>Room {r.room_number} ({r.occupied||0}/{r.capacity})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Bed</Label>
                    <Select value={form.bed_id} onValueChange={v => setForm({...form, bed_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Select bed" /></SelectTrigger>
                      <SelectContent>{beds.map(b => <SelectItem key={b.id} value={b.id}>{b.bed_number}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div><Label className="text-xs">Monthly Rent (₹)</Label><Input type="number" data-testid="resident-rent-input" value={form.monthly_rent} onChange={e => setForm({...form, monthly_rent: e.target.value})} /></div>
                  <div><Label className="text-xs">Security Deposit (₹)</Label><Input type="number" value={form.security_deposit} onChange={e => setForm({...form, security_deposit: e.target.value})} /></div>
                  <div><Label className="text-xs">Check-in Date</Label><Input type="date" value={form.check_in_date} onChange={e => setForm({...form, check_in_date: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div><Label className="text-xs">Guardian Name</Label><Input value={form.guardian_name} onChange={e => setForm({...form, guardian_name: e.target.value})} /></div>
                  <div><Label className="text-xs">Guardian Phone</Label><Input value={form.guardian_phone} onChange={e => setForm({...form, guardian_phone: e.target.value})} /></div>
                  <div><Label className="text-xs">Relation</Label><Input value={form.guardian_relation} onChange={e => setForm({...form, guardian_relation: e.target.value})} placeholder="Father" /></div>
                </div>
                <div><Label className="text-xs">Permanent Address</Label><Input value={form.permanent_address} onChange={e => setForm({...form, permanent_address: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-xs">Agreement Start</Label><Input type="date" value={form.agreement_start} onChange={e => setForm({...form, agreement_start: e.target.value})} /></div>
                  <div><Label className="text-xs">Agreement End</Label><Input type="date" value={form.agreement_end} onChange={e => setForm({...form, agreement_end: e.target.value})} /></div>
                </div>
                <Button data-testid="save-resident-btn" onClick={handleSave} className="w-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white">{editing ? 'Update' : 'Add Resident'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Residents table */}
      {loading ? <div className="stat-card animate-pulse h-64" /> : filtered.length === 0 ? (
        <Card className="border-[#E2E8F0]"><CardContent className="py-12 text-center"><Users className="w-12 h-12 text-[#CBD5E1] mx-auto mb-3" /><p className="text-[#64748B]">{search ? 'No matching residents' : 'No residents yet'}</p></CardContent></Card>
      ) : (
        <Card className="border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table data-testid="residents-table">
              <TableHeader>
                <TableRow className="border-b border-[#E2E8F0]">
                  <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Resident</TableHead>
                  <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Room/Bed</TableHead>
                  <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Phone</TableHead>
                  <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Rent</TableHead>
                  <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">ID Status</TableHead>
                  <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id} className="hover:bg-[#F8FAFC] cursor-pointer" onClick={() => openDetail(r)} data-testid={`resident-row-${r.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#1D4ED8]/10 flex items-center justify-center text-xs font-bold text-[#1D4ED8] overflow-hidden">
                          {r.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-[#0F172A] text-sm">{r.name}</p>
                          <p className="text-xs text-[#94A3B8]">{r.occupation || r.email || ''}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-[#64748B]">{r.room_number || '—'}/{r.bed_number || '—'}</TableCell>
                    <TableCell className="text-sm text-[#64748B]">{r.phone}</TableCell>
                    <TableCell className="text-sm font-medium text-[#0F172A]">₹{r.monthly_rent?.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${r.id_verified ? 'bg-emerald-50 text-emerald-700' : r.aadhaar_url ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                        {r.id_verified ? 'Verified' : r.aadhaar_url ? 'Pending' : 'No ID'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditing(r.id); setForm({ hostel_id: r.hostel_id, name: r.name, phone: r.phone, email: r.email || '', whatsapp: r.whatsapp || '', gender: r.gender || 'male', occupation: r.occupation || '', workplace: r.workplace || '', room_id: r.room_id || '', bed_id: r.bed_id || '', monthly_rent: r.monthly_rent || 0, security_deposit: r.security_deposit || 0, guardian_name: r.guardian_name || '', guardian_phone: r.guardian_phone || '', guardian_relation: r.guardian_relation || '', permanent_address: r.permanent_address || '', check_in_date: r.check_in_date || '', agreement_start: r.agreement_start || '', agreement_end: r.agreement_end || '' }); setDialogOpen(true); }}><Pencil className="w-3.5 h-3.5 text-[#64748B]" /></Button>
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

      {/* ── Resident Detail Dialog ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {detailResident && (
            <>
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Outfit' }}>Resident Profile — {detailResident.name}</DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="profile" className="mt-4">
                <TabsList className="bg-[#F1F5F9]">
                  <TabsTrigger value="profile" className="text-xs" data-testid="tab-profile"><User className="w-3 h-3 mr-1" />Profile</TabsTrigger>
                  <TabsTrigger value="documents" className="text-xs" data-testid="tab-documents"><FileText className="w-3 h-3 mr-1" />Documents & ID</TabsTrigger>
                  <TabsTrigger value="emergency" className="text-xs" data-testid="tab-emergency"><AlertCircle className="w-3 h-3 mr-1" />Emergency</TabsTrigger>
                  <TabsTrigger value="history" className="text-xs" data-testid="tab-history"><Calendar className="w-3 h-3 mr-1" />Payment History</TabsTrigger>
                </TabsList>

                {/* Profile Tab */}
                <TabsContent value="profile" className="space-y-4 mt-4">
                  <div className="flex items-start gap-6">
                    <div className="w-20 h-20 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0] overflow-hidden flex items-center justify-center shrink-0">
                      <User className="w-8 h-8 text-[#CBD5E1]" />
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 flex-1">
                      {[
                        ['Name', detailResident.name],
                        ['Phone', detailResident.phone],
                        ['Email', detailResident.email],
                        ['WhatsApp', detailResident.whatsapp],
                        ['Gender', detailResident.gender],
                        ['Occupation', detailResident.occupation],
                        ['Workplace', detailResident.workplace],
                        ['Room / Bed', `${detailResident.room_number || '—'} / ${detailResident.bed_number || '—'}`],
                        ['Monthly Rent', `₹${detailResident.monthly_rent?.toLocaleString()}`],
                        ['Security Deposit', `₹${detailResident.security_deposit?.toLocaleString()}`],
                        ['Check-in Date', detailResident.check_in_date ? new Date(detailResident.check_in_date).toLocaleDateString() : '—'],
                        ['Agreement', `${detailResident.agreement_start ? new Date(detailResident.agreement_start).toLocaleDateString() : '—'} to ${detailResident.agreement_end ? new Date(detailResident.agreement_end).toLocaleDateString() : '—'}`],
                        ['Guardian', `${detailResident.guardian_name || '—'} (${detailResident.guardian_relation || '—'})`],
                        ['Guardian Phone', detailResident.guardian_phone],
                        ['Address', detailResident.permanent_address],
                      ].map(([label, val], i) => (
                        <div key={i} className="py-1">
                          <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider font-semibold">{label}</p>
                          <p className="text-sm text-[#0F172A]">{val || '—'}</p>
                        </div>
                      ))}
                      <div className="py-1 col-span-2 border-t border-[#E2E8F0] mt-2 pt-2">
                        <p className="text-[10px] text-[#94A3B8] uppercase tracking-wider font-semibold">Aadhaar Document</p>
                        {detailResident.aadhaar_url ? (
                          <a 
                            href={detailResident.aadhaar_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-1 text-sm text-[#1D4ED8] hover:underline mt-1"
                            data-testid="open-document-link"
                          >
                            <FileText className="w-4 h-4" /> Open Document
                          </a>
                        ) : (
                          <p className="text-sm text-[#64748B] mt-1">No Aadhaar document available.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Documents Tab */}
                <TabsContent value="documents" className="space-y-5 mt-4">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs text-[#64748B]">Aadhaar Document URL</Label>
                      <Input data-testid="aadhaar-url" type="url" value={docForm.aadhaar_url} onChange={e => setDocForm({...docForm, aadhaar_url: e.target.value})} placeholder="https://example.com/aadhaar.pdf" />
                    </div>
                    <div>
                      <Label className="text-xs text-[#64748B]">Identity Verification</Label>
                      <div className="flex items-center gap-3 mt-2">
                        <Switch checked={docForm.id_verified} onCheckedChange={v => setDocForm({...docForm, id_verified: v})} data-testid="id-verified-switch" />
                        <span className={`text-sm font-medium ${docForm.id_verified ? 'text-emerald-600' : 'text-[#64748B]'}`}>
                          {docForm.id_verified ? 'Verified' : 'Not Verified'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button data-testid="save-documents-btn" onClick={saveDocuments} className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white">
                    <FileText className="w-4 h-4 mr-2" /> Save Documents
                  </Button>
                </TabsContent>

                {/* Emergency Tab */}
                <TabsContent value="emergency" className="space-y-4 mt-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div><Label className="text-xs">Emergency Contact Name</Label><Input data-testid="emergency-name" value={docForm.emergency_contact_name} onChange={e => setDocForm({...docForm, emergency_contact_name: e.target.value})} /></div>
                    <div><Label className="text-xs">Emergency Phone</Label><Input data-testid="emergency-phone" value={docForm.emergency_contact_phone} onChange={e => setDocForm({...docForm, emergency_contact_phone: e.target.value})} /></div>
                    <div><Label className="text-xs">Relation</Label><Input data-testid="emergency-relation" value={docForm.emergency_contact_relation} onChange={e => setDocForm({...docForm, emergency_contact_relation: e.target.value})} placeholder="Brother, Friend..." /></div>
                  </div>
                  <div className="pt-2 border-t border-[#E2E8F0]">
                    <p className="text-xs text-[#94A3B8] mb-2">Guardian Details (from profile)</p>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div><span className="text-[10px] text-[#94A3B8] uppercase">Name</span><p>{detailResident.guardian_name || '—'}</p></div>
                      <div><span className="text-[10px] text-[#94A3B8] uppercase">Phone</span><p>{detailResident.guardian_phone || '—'}</p></div>
                      <div><span className="text-[10px] text-[#94A3B8] uppercase">Relation</span><p>{detailResident.guardian_relation || '—'}</p></div>
                    </div>
                  </div>
                  <Button onClick={saveDocuments} className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white">
                    Save Emergency Contacts
                  </Button>
                </TabsContent>

                {/* Payment History Tab */}
                <TabsContent value="history" className="mt-4">
                  {(detailResident.payment_history || []).length > 0 ? (
                    <div className="space-y-2">
                      {detailResident.payment_history.map((p, i) => (
                        <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-[#FAFBFC] border border-[#E2E8F0]">
                          <div>
                            <p className="text-sm font-medium text-[#0F172A]">{['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][p.month]} {p.year}</p>
                            <p className="text-xs text-[#94A3B8]">₹{p.amount?.toLocaleString()}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            {p.receipt_number && <span className="text-xs text-[#94A3B8]">{p.receipt_number}</span>}
                            <Badge className={`text-[10px] ${p.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{p.status?.toUpperCase()}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-[#94A3B8] text-center py-8">No payment history</p>}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
