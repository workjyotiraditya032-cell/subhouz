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
  const [form, setForm] = useState({ 
    email: '', password: '', name: '', role: 'hostel_admin', hostel_id: '', phone: '',
    sec_school: '', sec_mother: '', sec_father: '' 
  });

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState(null);
  const [resetForm, setResetForm] = useState({ new_password: '', confirm_password: '' });
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

  const fetchUsers = () => {
    Promise.all([api.get('/admin/users'), api.get('/hostels')])
      .then(([uRes, hRes]) => { setUsers(uRes.data); setHostels(hRes.data); })
      .catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { fetchUsers(); }, []);

  const handleSave = async () => {
    try {
      if (editing) {
        await api.put(`/admin/users/${editing}`, form);
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

  const openResetModal = (u) => {
    setResetTargetUser(u);
    setResetForm({ new_password: '', confirm_password: '' });
    setResetModalOpen(true);
  };

  const handleAdminResetPassword = async (e) => {
    e.preventDefault();
    if (!resetForm.new_password || resetForm.new_password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    if (resetForm.new_password !== resetForm.confirm_password) {
      toast.error('New password and confirm password do not match');
      return;
    }
    setIsSubmittingReset(true);
    try {
      const res = await api.put(`/admin/users/${resetTargetUser.id}/reset-password`, resetForm);
      toast.success(res.data.message || `Password updated for ${resetTargetUser.name}`);
      setResetModalOpen(false);
      setResetTargetUser(null);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update password');
    } finally {
      setIsSubmittingReset(false);
    }
  };

  const deleteUser = async (id, name) => {
    if (!window.confirm(`Delete user ${name}? This cannot be undone.`)) return;
    try { await api.delete(`/admin/users/${id}`); toast.success('User deleted'); fetchUsers(); }
    catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const openEdit = (u) => {
    setEditing(u.id);
    setForm({ 
      email: u.email, password: '', name: u.name, role: u.role, hostel_id: u.hostel_id || '', phone: u.phone || '',
      sec_school: u.sec_school || '', sec_mother: u.sec_mother || '', sec_father: u.sec_father || ''
    });
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
            <Button data-testid="create-admin-btn" className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white" onClick={() => { setEditing(null); setForm({ email: '', password: '', name: '', role: 'hostel_admin', hostel_id: '', phone: '', sec_school: '', sec_mother: '', sec_father: '' }); }}>
              <UserPlus className="w-4 h-4 mr-2" /> Create Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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

              {/* Security Questions Section */}
              <div className="border-t border-slate-200 pt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800 block">
                    Security Questions (Password Recovery)
                  </Label>
                  {form.sec_school === "••••••••" && (
                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">
                      ✅ Answers Saved & Encrypted
                    </Badge>
                  )}
                </div>
                {form.sec_school === "••••••••" && (
                  <p className="text-[11px] text-[#64748B]">
                    Answers are securely stored. Type new answers below only if you wish to change them.
                  </p>
                )}
                <div>
                  <Label className="text-[11px] text-slate-600 block">1. What was the name of your first school?</Label>
                  <Input placeholder="First School Name" value={form.sec_school || ''} onChange={e => setForm({ ...form, sec_school: e.target.value })} className="h-8 text-xs mt-1" data-testid="admin-sec-school" />
                </div>
                <div>
                  <Label className="text-[11px] text-slate-600 block">2. What is your mother&apos;s first name?</Label>
                  <Input placeholder="Mother's First Name" value={form.sec_mother || ''} onChange={e => setForm({ ...form, sec_mother: e.target.value })} className="h-8 text-xs mt-1" data-testid="admin-sec-mother" />
                </div>
                <div>
                  <Label className="text-[11px] text-slate-600 block">3. What is your father&apos;s first name?</Label>
                  <Input placeholder="Father's First Name" value={form.sec_father || ''} onChange={e => setForm({ ...form, sec_father: e.target.value })} className="h-8 text-xs mt-1" data-testid="admin-sec-father" />
                </div>
              </div>

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
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openResetModal(u)} title="Reset Password" data-testid={`reset-pwd-${u.id}`}><Key className="w-3.5 h-3.5 text-amber-500" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => deleteUser(u.id, u.name)} title="Delete" data-testid={`delete-admin-${u.id}`}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Super Admin Reset User Password Modal */}
      <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 border-[#FAF7F2] shadow-2xl">
          <DialogHeader className="border-b border-[#FAF7F2] pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-[#1C1917]" style={{ fontFamily: 'Fraunces, serif' }}>
                  Reset User Password
                </DialogTitle>
                <p className="text-xs text-[#6B5E54]">Set a new password for user account</p>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleAdminResetPassword} className="space-y-4 py-3">
            <div>
              <Label className="text-xs font-semibold text-slate-700">User</Label>
              <Input
                value={`${resetTargetUser?.name || ''} (${resetTargetUser?.email || ''})`}
                readOnly
                disabled
                className="mt-1 text-xs h-9 bg-slate-100 border-slate-200 text-slate-700 font-medium"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-800">New Password *</Label>
              <Input
                type="password"
                placeholder="Enter new password (min 6 chars)"
                value={resetForm.new_password}
                onChange={e => setResetForm({ ...resetForm, new_password: e.target.value })}
                required
                className="mt-1 text-xs h-9 bg-white border-[#8C7E72]/20 focus:ring-[#2D5F3F]"
                data-testid="super-reset-new-password"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-800">Confirm Password *</Label>
              <Input
                type="password"
                placeholder="Confirm new password"
                value={resetForm.confirm_password}
                onChange={e => setResetForm({ ...resetForm, confirm_password: e.target.value })}
                required
                className="mt-1 text-xs h-9 bg-white border-[#8C7E72]/20 focus:ring-[#2D5F3F]"
                data-testid="super-reset-confirm-password"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#FAF7F2]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setResetModalOpen(false)}
                className="rounded-full text-xs px-4 border-slate-200 text-slate-600"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingReset}
                className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white rounded-full text-xs px-5 font-semibold"
                data-testid="confirm-reset-pwd-btn"
              >
                {isSubmittingReset ? 'Updating Password...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
