import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Building2, MapPin, Phone, Mail, Plus, Pencil, Trash2, Users, DoorOpen } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import api from '../lib/api';

export default function HostelsPage() {
  const { user } = useAuth();
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', address: '', city: 'Bhubaneswar', state: 'Odisha', phone: '', email: '', description: '', hostel_type: 'mixed', monthly_due_date: 5 });

  const fetchHostels = () => {
    api.get('/hostels').then(res => setHostels(res.data)).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { fetchHostels(); }, []);

  const handleSave = async () => {
    try {
      if (editing) {
        await api.put(`/hostels/${editing}`, form);
        toast.success('Hostel updated');
      } else {
        await api.post('/hostels', form);
        toast.success('Hostel created');
      }
      setDialogOpen(false);
      setEditing(null);
      setForm({ name: '', code: '', address: '', city: 'Bhubaneswar', state: 'Odisha', phone: '', email: '', description: '', hostel_type: 'mixed', monthly_due_date: 5 });
      fetchHostels();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error saving hostel');
    }
  };

  const handleEdit = (h) => {
    setEditing(h.id);
    setForm({ name: h.name, code: h.code, address: h.address, city: h.city || 'Bhubaneswar', state: h.state || 'Odisha', phone: h.phone || '', email: h.email || '', description: h.description || '', hostel_type: h.hostel_type || 'mixed', monthly_due_date: h.monthly_due_date || 5 });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this hostel? This cannot be undone.')) return;
    try {
      await api.delete(`/hostels/${id}`);
      toast.success('Hostel deleted');
      fetchHostels();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error deleting');
    }
  };

  return (
    <div className="space-y-6" data-testid="hostels-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F172A] tracking-tight" style={{ fontFamily: 'Outfit' }}>Hostels</h1>
          <p className="text-sm text-[#64748B] mt-1">Manage your hostel properties</p>
        </div>
        {user?.role === 'super_admin' && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-hostel-btn" className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white" onClick={() => { setEditing(null); setForm({ name: '', code: '', address: '', city: 'Bhubaneswar', state: 'Odisha', phone: '', email: '', description: '', hostel_type: 'mixed', monthly_due_date: 5 }); }}>
                <Plus className="w-4 h-4 mr-2" /> Add Hostel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Outfit' }}>{editing ? 'Edit Hostel' : 'Add New Hostel'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-xs">Name *</Label><Input data-testid="hostel-name-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Hostel Name" /></div>
                  <div><Label className="text-xs">Code *</Label><Input data-testid="hostel-code-input" value={form.code} onChange={e => setForm({...form, code: e.target.value})} placeholder="JMH" /></div>
                </div>
                <div><Label className="text-xs">Address *</Label><Input data-testid="hostel-address-input" value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Full address" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-xs">Phone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+91..." /></div>
                  <div><Label className="text-xs">Email</Label><Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="email@hostel.com" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Type</Label>
                    <Select value={form.hostel_type} onValueChange={v => setForm({...form, hostel_type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="boys">Boys</SelectItem>
                        <SelectItem value="girls">Girls</SelectItem>
                        <SelectItem value="mixed">Mixed / Co-ed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Monthly Due Date</Label><Input type="number" min={1} max={28} value={form.monthly_due_date} onChange={e => setForm({...form, monthly_due_date: parseInt(e.target.value) || 5})} /></div>
                </div>
                <Button data-testid="save-hostel-btn" onClick={handleSave} className="w-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white">{editing ? 'Update Hostel' : 'Create Hostel'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="stat-card h-48 animate-pulse"><div className="h-6 bg-slate-200 rounded w-32 mb-4" /><div className="h-4 bg-slate-200 rounded w-48" /></div>)}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hostels.map(h => (
            <Card key={h.id} className="border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow" data-testid={`hostel-card-${h.id}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-[#0F172A]" style={{ fontFamily: 'Outfit' }}>{h.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">{h.code}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${h.hostel_type === 'boys' ? 'bg-blue-50 text-blue-700' : h.hostel_type === 'girls' ? 'bg-pink-50 text-pink-700' : 'bg-purple-50 text-purple-700'}`}>
                    {h.hostel_type}
                  </span>
                </div>
                <div className="space-y-2 text-sm text-[#64748B]">
                  <p className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span className="line-clamp-2">{h.address}, {h.city}</span></p>
                  {h.phone && <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" />{h.phone}</p>}
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-[#F1F5F9]">
                  <div className="text-center">
                    <p className="text-lg font-bold text-[#0F172A]" style={{ fontFamily: 'Outfit' }}>{h.total_rooms || 0}</p>
                    <p className="text-xs text-[#94A3B8]">Rooms</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-[#0F172A]" style={{ fontFamily: 'Outfit' }}>{h.total_residents || 0}</p>
                    <p className="text-xs text-[#94A3B8]">Residents</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-[#0F172A]" style={{ fontFamily: 'Outfit' }}>
                      {h.total_beds > 0 ? Math.round(h.occupied_beds / h.total_beds * 100) : 0}%
                    </p>
                    <p className="text-xs text-[#94A3B8]">Occupancy</p>
                  </div>
                </div>
                {user?.role === 'super_admin' && (
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(h)} className="flex-1 text-xs" data-testid={`edit-hostel-${h.id}`}><Pencil className="w-3 h-3 mr-1" /> Edit</Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(h.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs" data-testid={`delete-hostel-${h.id}`}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
