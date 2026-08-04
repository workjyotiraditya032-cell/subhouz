import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { DoorOpen, Plus, Pencil, Trash2, Wind, Droplets } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import api from '../lib/api';

export default function RoomsPage() {
  const { user } = useAuth();
  const { selectedHostel } = useOutletContext();
  const [rooms, setRooms] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [bathroomFilter, setBathroomFilter] = useState('all');
  const [form, setForm] = useState({
    hostel_id: '',
    room_number: '',
    floor_number: 0,
    room_type: 'bachelor',
    ac_type: 'non_ac',
    capacity: 2,
    rent: 5000,
    has_attached_bathroom: false,
    has_bathroom: false,
    has_balcony: false
  });

  const fetchRooms = useCallback(() => {
    const params = {};
    if (selectedHostel) params.hostel_id = selectedHostel.id;
    api.get('/rooms', { params }).then(res => setRooms(res.data)).catch(console.error).finally(() => setLoading(false));
  }, [selectedHostel]);

  useEffect(() => {
    fetchRooms();
    if (user?.role === 'super_admin') {
      api.get('/hostels').then(res => setHostels(res.data)).catch(() => {});
    }
  }, [fetchRooms, user]);

  const resetForm = () => {
    setForm({
      hostel_id: selectedHostel?.id || user?.hostel_id || '',
      room_number: '',
      floor_number: 0,
      room_type: 'bachelor',
      ac_type: 'non_ac',
      capacity: 2,
      rent: 5000,
      has_attached_bathroom: false,
      has_bathroom: false,
      has_balcony: false
    });
  };

  const handleSave = async () => {
    try {
      const hostelId = form.hostel_id || selectedHostel?.id || (user?.role === 'hostel_admin' ? user?.hostel_id : '');
      if (!hostelId) { toast.error('Please select a property'); return; }
      const payload = {
        ...form,
        hostel_id: hostelId,
        floor_number: parseInt(form.floor_number),
        capacity: parseInt(form.capacity),
        rent: parseFloat(form.rent),
        has_attached_bathroom: form.has_attached_bathroom,
        hasAttachedBathroom: form.has_attached_bathroom,
        has_bathroom: form.has_attached_bathroom
      };
      if (editing) {
        const res = await api.put(`/rooms/${editing}`, payload);
        const updatedRoom = res.data;
        toast.success('Room updated');
        setRooms(prev => prev.map(r => r.id === editing ? { ...r, ...updatedRoom } : r));
      } else {
        const res = await api.post('/rooms', payload);
        const newRoom = res.data;
        toast.success('Room created with beds');
        setRooms(prev => [newRoom, ...prev]);
      }
      setDialogOpen(false); setEditing(null);
      fetchRooms();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error saving room'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this room and all its beds?')) return;
    try { await api.delete(`/rooms/${id}`); toast.success('Room deleted'); fetchRooms(); } catch (err) { toast.error('Error deleting'); }
  };

  const getHostelName = (hostelId) => hostels.find(h => h.id === hostelId)?.name || '';

  const calculateRoomStatus = (occupied = 0, total = 0) => {
    const occ = parseInt(occupied) || 0;
    const tot = parseInt(total) || 0;
    if (tot === 0) return 'unavailable';
    if (occ === 0) return 'available';
    if (occ > 0 && occ < tot) return 'partially_occupied';
    if (occ >= tot) return 'occupied';
    return 'available';
  };

  const statusColor = {
    available: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    partially_occupied: 'bg-amber-50 text-amber-700 border-amber-200',
    'partially occupied': 'bg-amber-50 text-amber-700 border-amber-200',
    occupied: 'bg-blue-50 text-blue-700 border-blue-200',
    unavailable: 'bg-slate-100 text-slate-600 border-slate-200'
  };

  const statusLabel = {
    available: 'Available',
    partially_occupied: 'Partially Occupied',
    'partially occupied': 'Partially Occupied',
    occupied: 'Occupied',
    unavailable: 'Unavailable'
  };

  const filteredRooms = rooms.filter(r => {
    const hasAttached = r.has_attached_bathroom ?? r.hasAttachedBathroom ?? r.has_bathroom ?? false;
    if (bathroomFilter === 'attached') return hasAttached === true;
    if (bathroomFilter === 'non_attached') return hasAttached === false;
    return true;
  });

  return (
    <div className="space-y-6" data-testid="rooms-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F172A] tracking-tight" style={{ fontFamily: 'Outfit' }}>Rooms & Beds</h1>
          <p className="text-sm text-[#64748B] mt-1">{filteredRooms.length} rooms found</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={bathroomFilter} onValueChange={setBathroomFilter}>
            <SelectTrigger className="w-44 text-xs h-9" data-testid="bathroom-filter-select">
              <SelectValue placeholder="Filter Bathroom" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Bathrooms</SelectItem>
              <SelectItem value="attached">Attached Bathroom</SelectItem>
              <SelectItem value="non_attached">Non-Attached</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-room-btn" className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white" onClick={() => { setEditing(null); resetForm(); }}>
                <Plus className="w-4 h-4 mr-2" /> Add Room
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle style={{ fontFamily: 'Outfit' }}>{editing ? 'Edit Room' : 'Add New Room'}</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                {user?.role === 'super_admin' && !editing && (
                  <div>
                    <Label className="text-xs">Property *</Label>
                    <Select value={form.hostel_id} onValueChange={v => setForm({...form, hostel_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                      <SelectContent>{hostels.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-xs">Room Number *</Label><Input data-testid="room-number-input" value={form.room_number} onChange={e => setForm({...form, room_number: e.target.value})} /></div>
                  <div><Label className="text-xs">Floor</Label><Input type="number" value={form.floor_number} onChange={e => setForm({...form, floor_number: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Type</Label>
                    <Select value={form.room_type} onValueChange={v => setForm({...form, room_type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="bachelor">Bachelor</SelectItem><SelectItem value="family">Family</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">AC</Label>
                    <Select value={form.ac_type} onValueChange={v => setForm({...form, ac_type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="ac">AC</SelectItem><SelectItem value="non_ac">Non-AC</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-xs">Capacity (beds) *</Label><Input type="number" min={1} value={form.capacity} onChange={e => setForm({...form, capacity: e.target.value})} /></div>
                  <div><Label className="text-xs">Monthly Rent (₹) *</Label><Input type="number" value={form.rent} onChange={e => setForm({...form, rent: e.target.value})} /></div>
                </div>

                {/* Attached Bathroom Selection */}
                <div className="rounded-lg border border-[#E2E8F0] p-3 bg-slate-50/50">
                  <Label className="text-xs font-semibold text-[#0F172A] block mb-2">Attached Bathroom</Label>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="attached_bathroom"
                        data-testid="attached-bathroom-yes"
                        checked={form.has_attached_bathroom === true}
                        onChange={() => setForm({ ...form, has_attached_bathroom: true, has_bathroom: true })}
                        className="w-4 h-4 text-[#1D4ED8] focus:ring-[#1D4ED8]"
                      />
                      <span>Yes</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="attached_bathroom"
                        data-testid="attached-bathroom-no"
                        checked={form.has_attached_bathroom === false}
                        onChange={() => setForm({ ...form, has_attached_bathroom: false, has_bathroom: false })}
                        className="w-4 h-4 text-[#1D4ED8] focus:ring-[#1D4ED8]"
                      />
                      <span>No</span>
                    </label>
                  </div>
                </div>

                <Button data-testid="save-room-btn" onClick={handleSave} className="w-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white">{editing ? 'Update' : 'Create Room'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3,4,5,6].map(i => <div key={i} className="stat-card h-40 animate-pulse" />)}</div>
      ) : filteredRooms.length === 0 ? (
        <Card className="border-[#E2E8F0]"><CardContent className="py-12 text-center"><DoorOpen className="w-12 h-12 text-[#CBD5E1] mx-auto mb-3" /><p className="text-[#64748B]">No rooms match the selected criteria.</p></CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRooms.map(r => {
            const hasAttached = r.has_attached_bathroom ?? r.hasAttachedBathroom ?? r.has_bathroom ?? false;
            return (
              <Card key={r.id} className="border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow" data-testid={`room-card-${r.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-[#0F172A] text-lg" style={{ fontFamily: 'Outfit' }}>Room {r.room_number}</h3>
                      <p className="text-xs text-[#94A3B8]">Floor {r.floor_number} &middot; {r.building_name}</p>
                      {user?.role === 'super_admin' && <p className="text-xs text-[#1D4ED8] mt-0.5">{getHostelName(r.hostel_id)}</p>}
                    </div>
                    {(() => {
                      const st = calculateRoomStatus(r.occupied, r.total_beds || r.capacity);
                      return (
                        <Badge className={`${statusColor[st] || 'bg-slate-50 text-slate-700'} text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize`}>
                          {statusLabel[st] || st}
                        </Badge>
                      );
                    })()}
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="text-xs px-2 py-1 bg-[#F1F5F9] rounded-md text-[#64748B]">{r.room_type}</span>
                    <span className="text-xs px-2 py-1 bg-[#F1F5F9] rounded-md text-[#64748B] flex items-center gap-1">{r.ac_type === 'ac' ? <Wind className="w-3 h-3" /> : null}{r.ac_type === 'ac' ? 'AC' : 'Non-AC'}</span>
                    {hasAttached && <span className="text-xs px-2 py-1 bg-[#F1F5F9] rounded-md text-[#64748B] flex items-center gap-1"><Droplets className="w-3 h-3 text-[#1D4ED8]" />Bathroom</span>}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#64748B]">Beds: <strong className="text-[#0F172A]">{r.occupied || 0}/{r.total_beds || r.capacity}</strong></span>
                    <span className="font-semibold text-[#0F172A]">₹{r.rent?.toLocaleString()}/mo</span>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-[#F1F5F9]">
                    <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => {
                      setEditing(r.id);
                      setForm({
                        hostel_id: r.hostel_id,
                        room_number: r.room_number,
                        floor_number: r.floor_number,
                        room_type: r.room_type,
                        ac_type: r.ac_type,
                        capacity: r.capacity,
                        rent: r.rent,
                        has_attached_bathroom: Boolean(r.has_attached_bathroom ?? r.hasAttachedBathroom ?? r.has_bathroom),
                        has_bathroom: Boolean(r.has_attached_bathroom ?? r.hasAttachedBathroom ?? r.has_bathroom),
                        has_balcony: r.has_balcony
                      });
                      setDialogOpen(true);
                    }}><Pencil className="w-3 h-3 mr-1" />Edit</Button>
                    <Button variant="outline" size="sm" className="text-red-500 hover:bg-red-50 text-xs" onClick={() => handleDelete(r.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
