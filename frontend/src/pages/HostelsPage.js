import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Building2, MapPin, Phone, Mail, Plus, Pencil, Trash2, Users, DoorOpen, Sparkles, Check } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
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

export const ALL_AMENITIES = [
  'Wi-Fi',
  'Washing Machine',
  'Water / RO Filter',
  'Common Kitchen',
  'Common Areas',
  'CCTV Security',
  '24/7 Security',
  'Power Backup',
  'Parking',
  'Laundry',
  'Gym',
  'Attached Bathroom',
  'Lift',
  'Housekeeping',
  'Mess / Tiffin',
  'Refrigerator',
  'Air Conditioning',
  'Geyser',
  'Study Table',
  'Wardrobe',
  'Balcony',
  'Garden',
  'Visitor Parking',
  'Drinking Water',
  'Fire Safety',
  'Bike Parking',
  'Four Wheeler Parking',
  'Indoor Games',
  'High Speed Internet',
  'Generator Backup',
];

const INITIAL_FORM = {
  name: '',
  code: '',
  address: '',
  city: '',
  state: '',
  phone: '',
  email: '',
  description: '',
  hostel_type: 'mixed',
  monthly_due_date: 5,
  amenities: [],
};

export default function HostelsPage() {
  const { user } = useAuth();
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [propertyToDelete, setPropertyToDelete] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchHostels = () => {
    api.get('/hostels').then(res => setHostels(res.data)).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { fetchHostels(); }, []);

  const handleSave = async () => {
    try {
      if (editing) {
        await api.put(`/hostels/${editing}`, form);
        toast.success('Property updated successfully.');
      } else {
        await api.post('/hostels', form);
        toast.success('Property created successfully.');
      }
      setDialogOpen(false);
      setEditing(null);
      setForm(INITIAL_FORM);
      fetchHostels();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save property.');
    }
  };

  const handleEdit = (h) => {
    setEditing(h.id);
    const existingAmenities = Array.isArray(h.amenities) ? h.amenities : (Array.isArray(h.facilities) ? h.facilities : []);
    setForm({
      name: h.name || '',
      code: h.code || '',
      address: h.address || '',
      city: h.city || '',
      state: h.state || '',
      phone: h.phone || '',
      email: h.email || '',
      description: h.description || '',
      hostel_type: h.hostel_type || 'mixed',
      monthly_due_date: h.monthly_due_date || 5,
      amenities: existingAmenities,
    });
    setDialogOpen(true);
  };

  const handleDeleteClick = (h) => {
    setPropertyToDelete(h);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!propertyToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/hostels/${propertyToDelete.id}`);
      toast.success('Property deleted successfully.');
      setDeleteDialogOpen(false);
      setPropertyToDelete(null);
      fetchHostels();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete property.');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleAmenity = (amenity) => {
    const current = form.amenities || [];
    if (current.includes(amenity)) {
      setForm({ ...form, amenities: current.filter(a => a !== amenity) });
    } else {
      setForm({ ...form, amenities: [...current, amenity] });
    }
  };

  const selectAllAmenities = () => {
    setForm({ ...form, amenities: [...ALL_AMENITIES] });
  };

  const clearAllAmenities = () => {
    setForm({ ...form, amenities: [] });
  };

  return (
    <div className="space-y-6" data-testid="hostels-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F172A] tracking-tight" style={{ fontFamily: 'Outfit' }}>Properties</h1>
          <p className="text-sm text-[#64748B] mt-1">Manage your properties and custom amenities</p>
        </div>
        {user?.role === 'super_admin' && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-hostel-btn" className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white w-full sm:w-auto" onClick={() => { setEditing(null); setForm(INITIAL_FORM); }}>
                <Plus className="w-4 h-4 mr-2" /> Add Property
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Outfit' }}>{editing ? 'Edit Property' : 'Add New Property'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-xs font-semibold text-[#475569]">Name *</Label><Input data-testid="hostel-name-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Property Name" /></div>
                  <div><Label className="text-xs font-semibold text-[#475569]">Code *</Label><Input data-testid="hostel-code-input" value={form.code} onChange={e => setForm({...form, code: e.target.value})} placeholder="JMH" /></div>
                </div>
                <div><Label className="text-xs font-semibold text-[#475569]">Address *</Label><Input data-testid="hostel-address-input" value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Full address" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-xs font-semibold text-[#475569]">City</Label><Input value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="Bengaluru" /></div>
                  <div><Label className="text-xs font-semibold text-[#475569]">State</Label><Input value={form.state} onChange={e => setForm({...form, state: e.target.value})} placeholder="Karnataka" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-xs font-semibold text-[#475569]">Phone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+91..." /></div>
                  <div><Label className="text-xs font-semibold text-[#475569]">Email</Label><Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="email@property.com" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-[#475569]">Type</Label>
                    <Select value={form.hostel_type} onValueChange={v => setForm({...form, hostel_type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="boys">Boys</SelectItem>
                        <SelectItem value="girls">Girls</SelectItem>
                        <SelectItem value="mixed">Mixed / Co-ed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs font-semibold text-[#475569]">Monthly Due Date</Label><Input type="number" min={1} max={28} value={form.monthly_due_date} onChange={e => setForm({...form, monthly_due_date: parseInt(e.target.value) || 5})} /></div>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-[#475569]">Description</Label>
                  <Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Property description..." />
                </div>

                {/* Amenities Section */}
                <div className="pt-3 border-t border-slate-200" data-testid="admin-amenities-section">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <Label className="text-sm font-semibold text-[#0F172A]" style={{ fontFamily: 'Outfit' }}>
                        Amenities & Facilities ({form.amenities?.length || 0} selected)
                      </Label>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={selectAllAmenities} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Select All</button>
                      <span className="text-slate-300">|</span>
                      <button type="button" onClick={clearAllAmenities} className="text-xs text-slate-500 hover:text-slate-700">Clear</button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">Select all amenities available at this property. Selected amenities will display directly on the public website.</p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1 border border-slate-100 rounded-lg bg-slate-50/50">
                    {ALL_AMENITIES.map((amenity) => {
                      const isSelected = (form.amenities || []).includes(amenity);
                      return (
                        <label
                          key={amenity}
                          onClick={() => toggleAmenity(amenity)}
                          data-testid={`amenity-checkbox-${amenity.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                            isSelected
                              ? 'bg-blue-50/90 border-blue-300 text-blue-900 font-medium shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors ${
                            isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="truncate">{amenity}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <Button data-testid="save-hostel-btn" onClick={handleSave} className="w-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white mt-4">
                  {editing ? 'Update Property' : 'Create Property'}
                </Button>
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
          {hostels.map(h => {
            const hAmenities = Array.isArray(h.amenities) ? h.amenities : (Array.isArray(h.facilities) ? h.facilities : []);
            return (
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
                    <p className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span className="line-clamp-2">{h.address}{h.city ? `, ${h.city}` : ''}</span></p>
                    {h.phone && <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" />{h.phone}</p>}
                  </div>

                  {/* Amenities preview */}
                  <div className="mt-3 pt-3 border-t border-[#F1F5F9]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Amenities</span>
                      <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                        {hAmenities.length} selected
                      </span>
                    </div>
                    {hAmenities.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {hAmenities.slice(0, 4).map((a, idx) => (
                          <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                            {a}
                          </span>
                        ))}
                        {hAmenities.length > 4 && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-medium">
                            +{hAmenities.length - 4} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">No amenities selected</p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-[#F1F5F9]">
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
                      <Button variant="outline" size="sm" onClick={() => handleDeleteClick(h)} className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs" data-testid={`delete-hostel-${h.id}`}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Property Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="delete-property-dialog" className="max-w-md rounded-2xl p-6 bg-white shadow-2xl border border-slate-100">
          <AlertDialogHeader>
            <div className="mx-auto sm:mx-0 w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-2">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-xl font-semibold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Delete Property
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 text-sm mt-1">
              Are you sure you want to delete this property? {propertyToDelete ? `"${propertyToDelete.name}" and all associated data will be removed.` : 'This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <AlertDialogCancel
              disabled={isDeleting}
              data-testid="delete-cancel-btn"
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border-none"
            >
              Cancel
            </AlertDialogCancel>
            <Button
              data-testid="delete-confirm-btn"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg shadow-sm"
            >
              {isDeleting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Deleting...</span>
                </div>
              ) : (
                <span>Delete Property</span>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
