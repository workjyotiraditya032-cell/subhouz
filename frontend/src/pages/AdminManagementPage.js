import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus, Pencil, Trash2, Shield, ShieldOff, Key, ToggleLeft, ToggleRight, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import api from '../lib/api';

export default function AdminManagementPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'hostel_admin', hostel_id: '', phone: '' });

  const fetchUsers = () => {
    Promise.all([api.get('/admin/users'), api.get('/hostels')])
      .then(([uRes, hRes]) => { setUsers(uRes.data); setHostels(hRes.data); })
      .catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { fetchUsers(); }, []);

  const handleSave = async () => {
    try {
      if (editing) {
        await api.put(`/admin/users/${editing}`, { name: form.name, email: form.email, phone: form.phone, hostel_id: form.hostel_id, role: form.role });
        toast.success('User updated');
      } else {
        await api.post('/admin/users', form);
        toast.success('User created');
      }
      setDialogOpen(false); setEditing(null); fetchUsers();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const toggleStatus = async (id) => {
    try { const res = await api.put(`/admin/users/${id}/toggle-status`); toast.success(res.data.message); fetchUsers(); }
    catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const resetPassword = async (id, name) => {
    if (!window.confirm(`Reset password for ${name}?`)) return;
    try { const res = await api.put(`/admin/users/${id}/reset-password`); toast.success(`Password reset. New password: ${res.data.new_password}`); }
    catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const deleteUser = async (id, name) => {
    if (!window.confirm(`Delete user ${name}? This cannot be undone.`)) return;
    try { await api.delete(`/admin/users/${id}`); toast.success('User deleted'); fetchUsers(); }
    catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const openEdit = (u) => {
    setEditing(u.id);
    setForm({ email: u.email, password: '', name: u.name, role: u.role, hostel_id: u.hostel_id || '', phone: u.phone || '' });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6" data-testid="admin-management-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F172A] tracking-tight" style={{ fontFamily: 'Outfit' }}>Admin Management</h1>
          <p className="text-sm text-[#64748B] mt-1">Manage hostel administrator accounts</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="create-admin-btn" className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white" onClick={() => { setEditing(null); setForm({ email: '', password: '', name: '', role: 'hostel_admin', hostel_id: '', phone: '' }); }}>
              <UserPlus className="w-4 h-4 mr-2" /> Create Admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle style={{ fontFamily: 'Outfit' }}>{editing ? 'Edit User' : 'Create New Admin'}</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs">Name *</Label><Input data-testid="admin-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label className="text-xs">Email *</Label><Input data-testid="admin-email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              </div>
              {!editing && <div><Label className="text-xs">Password *</Label><Input data-testid="admin-password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>}
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs">Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                <div>
                  <Label className="text-xs">Role</Label>
                  <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                      <SelectItem value="hostel_admin">Hostel Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.role === 'hostel_admin' && (
                <div>
                  <Label className="text-xs">Assigned Hostel</Label>
                  <Select value={form.hostel_id} onValueChange={v => setForm({ ...form, hostel_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select hostel" /></SelectTrigger>
                    <SelectContent>{hostels.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <Button data-testid="save-admin-btn" onClick={handleSave} className="w-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white">{editing ? 'Update' : 'Create'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table data-testid="admin-users-table">
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">User</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Role</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Hostel</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Created</TableHead>
                <TableHead className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={6}><div className="h-10 bg-slate-100 rounded animate-pulse" /></TableCell></TableRow>) :
              users.map(u => (
                <TableRow key={u.id} className="hover:bg-[#F8FAFC]" data-testid={`admin-row-${u.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#1D4ED8]/10 flex items-center justify-center text-xs font-bold text-[#1D4ED8]">{u.name?.charAt(0)}</div>
                      <div>
                        <p className="font-medium text-sm text-[#0F172A]">{u.name}</p>
                        <p className="text-xs text-[#94A3B8]">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] font-semibold ${u.role === 'super_admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'} border`}>
                      {u.role === 'super_admin' ? 'Super Admin' : 'Hostel Admin'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-[#64748B]">{u.hostel_name || (u.role === 'super_admin' ? 'All Hostels' : '—')}</TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] ${u.disabled ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'} border`}>
                      {u.disabled ? 'Disabled' : 'Active'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-[#94A3B8]">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(u)} title="Edit" data-testid={`edit-admin-${u.id}`}><Pencil className="w-3.5 h-3.5 text-[#64748B]" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toggleStatus(u.id)} title={u.disabled ? 'Enable' : 'Disable'} data-testid={`toggle-admin-${u.id}`}>
                        {u.disabled ? <ToggleLeft className="w-4 h-4 text-red-500" /> : <ToggleRight className="w-4 h-4 text-emerald-500" />}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => resetPassword(u.id, u.name)} title="Reset Password" data-testid={`reset-pwd-${u.id}`}><Key className="w-3.5 h-3.5 text-amber-500" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => deleteUser(u.id, u.name)} title="Delete" data-testid={`delete-admin-${u.id}`}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
