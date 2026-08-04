import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Settings as SettingsIcon, Building2, MessageCircle, Bell, Shield, Save, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import api from '../lib/api';

export default function SettingsPage() {
  const { user } = useAuth();
  const [whatsappConfig, setWhatsappConfig] = useState({ phone_number_id: '', business_account_id: '', access_token: '', enabled: false });
  const [saving, setSaving] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', name: '', role: 'hostel_admin', hostel_id: '' });
  const [hostels, setHostels] = useState([]);
  const [users, setUsers] = useState([]);
  const [pwdForm, setPwdForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwdChanging, setPwdChanging] = useState(false);

  useEffect(() => {
    api.get('/automation/whatsapp-config').then(res => setWhatsappConfig(res.data)).catch(() => {});
    if (user?.role === 'super_admin') {
      api.get('/hostels').then(res => setHostels(res.data)).catch(() => {});
      api.get('/auth/users').then(res => setUsers(res.data)).catch(() => {});
    }
  }, [user]);

  const saveWhatsApp = async () => {
    setSaving(true);
    try {
      // Auto-enable if credentials are present
      const cfg = {
        ...whatsappConfig,
        enabled: !!(whatsappConfig.phone_number_id && whatsappConfig.access_token) || whatsappConfig.enabled
      };
      await api.put('/automation/whatsapp-config', cfg);
      setWhatsappConfig(cfg);
      toast.success('WhatsApp configuration saved!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error saving');
    } finally { setSaving(false); }
  };

  const sendTestWhatsApp = async () => {
    if (!testPhone.trim()) { toast.error('Please enter a phone number'); return; }
    setTestSending(true);
    try {
      const res = await api.post('/automation/test-whatsapp', { phone: testPhone.trim() });
      toast.success(res.data.message || 'Test message sent!');
    } catch (err) {
      const detail = err.response?.data?.detail || 'Failed to send test message';
      toast.error(detail);
    } finally { setTestSending(false); }
  };

  const createUser = async () => {
    try {
      await api.post('/auth/register', newUser);
      toast.success('User created');
      setUserDialogOpen(false);
      setNewUser({ email: '', password: '', name: '', role: 'hostel_admin', hostel_id: '' });
      api.get('/auth/users').then(res => setUsers(res.data));
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error creating user');
    }
  };

  const handleSelfChangePassword = async (e) => {
    e.preventDefault();
    if (!pwdForm.current_password) {
      toast.error('Current password is required');
      return;
    }
    if (!pwdForm.new_password || pwdForm.new_password.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }
    if (pwdForm.new_password !== pwdForm.confirm_password) {
      toast.error('New password and confirm password do not match');
      return;
    }
    setPwdChanging(true);
    try {
      const res = await api.post('/auth/change-password', pwdForm);
      toast.success(res.data.message || 'Password changed successfully');
      setPwdForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to change password');
    } finally {
      setPwdChanging(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="settings-page">
      <div>
        <h1 className="text-2xl font-semibold text-[#0F172A] tracking-tight" style={{ fontFamily: 'Outfit' }}>Settings</h1>
        <p className="text-sm text-[#64748B] mt-1">Configure platform settings and integrations</p>
      </div>

      <Tabs defaultValue="whatsapp" className="space-y-6">
        <TabsList className="bg-[#F1F5F9]">
          <TabsTrigger value="whatsapp" data-testid="tab-whatsapp" className="text-sm">WhatsApp API</TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security" className="text-sm">Security & Password</TabsTrigger>
          {user?.role === 'super_admin' && <TabsTrigger value="users" data-testid="tab-users" className="text-sm">User Management</TabsTrigger>}
          <TabsTrigger value="general" data-testid="tab-general" className="text-sm">General</TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp">
          <Card className="border-[#E2E8F0] shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base" style={{ fontFamily: 'Outfit' }}>
                <MessageCircle className="w-5 h-5 text-emerald-600" /> WhatsApp Business API Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-[#64748B]">
                Connect your WhatsApp Business API to enable automated rent challans and payment reminders.
                You need a Meta Business account with WhatsApp Business API access.
              </p>
              <div className="flex items-center gap-3 mb-4">
                <Label className="text-sm font-medium">Enable WhatsApp Integration</Label>
                <Switch
                  checked={whatsappConfig.enabled}
                  onCheckedChange={v => setWhatsappConfig({...whatsappConfig, enabled: v})}
                  data-testid="whatsapp-enabled-switch"
                />
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">Phone Number ID</Label>
                  <Input
                    data-testid="whatsapp-phone-id"
                    value={whatsappConfig.phone_number_id}
                    onChange={e => setWhatsappConfig({...whatsappConfig, phone_number_id: e.target.value})}
                    placeholder="From Meta Business Dashboard"
                  />
                </div>
                <div>
                  <Label className="text-xs">Business Account ID</Label>
                  <Input
                    data-testid="whatsapp-business-id"
                    value={whatsappConfig.business_account_id}
                    onChange={e => setWhatsappConfig({...whatsappConfig, business_account_id: e.target.value})}
                    placeholder="WhatsApp Business Account ID"
                  />
                </div>
                <div>
                  <Label className="text-xs">Access Token</Label>
                  <Input
                    data-testid="whatsapp-token"
                    type="password"
                    value={whatsappConfig.access_token}
                    onChange={e => setWhatsappConfig({...whatsappConfig, access_token: e.target.value})}
                    placeholder="Permanent Access Token"
                  />
                </div>
                <Button
                  data-testid="save-whatsapp-btn"
                  onClick={saveWhatsApp}
                  disabled={saving}
                  className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white"
                >
                  <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>

              {/* ── Test Message Section ── */}
              <div className="mt-6 pt-6 border-t border-[#E2E8F0] space-y-3">
                <h3 className="text-sm font-semibold text-[#0F172A]">Send Test WhatsApp Message</h3>
                <p className="text-xs text-[#64748B]">Enter a phone number to send a real test message and verify your API credentials are working.</p>
                <div className="flex gap-2">
                  <input
                    data-testid="test-whatsapp-phone"
                    className="flex-1 px-3 py-2 border border-[#E2E8F0] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                    placeholder="e.g. 8260631388 or +918260631388"
                    value={testPhone}
                    onChange={e => setTestPhone(e.target.value)}
                  />
                  <Button
                    data-testid="send-test-whatsapp-btn"
                    onClick={sendTestWhatsApp}
                    disabled={testSending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white whitespace-nowrap"
                  >
                    {testSending ? '⏳ Sending...' : '📱 Send Test'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {user?.role === 'super_admin' && (
          <TabsContent value="users">
            <Card className="border-[#E2E8F0] shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base" style={{ fontFamily: 'Outfit' }}>User Management</CardTitle>
                <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="add-user-btn" className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white" size="sm">
                      <UserPlus className="w-4 h-4 mr-2" /> Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle style={{ fontFamily: 'Outfit' }}>Create New User</DialogTitle></DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div><Label className="text-xs">Name *</Label><Input data-testid="new-user-name" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} /></div>
                      <div><Label className="text-xs">Email *</Label><Input data-testid="new-user-email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} /></div>
                      <div><Label className="text-xs">Password *</Label><Input data-testid="new-user-password" type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} /></div>
                      <div>
                        <Label className="text-xs">Role</Label>
                        <Select value={newUser.role} onValueChange={v => setNewUser({...newUser, role: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                            <SelectItem value="hostel_admin">Property Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {newUser.role === 'hostel_admin' && (
                        <div>
                          <Label className="text-xs">Assigned Property</Label>
                          <Select value={newUser.hostel_id} onValueChange={v => setNewUser({...newUser, hostel_id: v})}>
                            <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                            <SelectContent>{hostels.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      )}
                      <Button data-testid="create-user-btn" onClick={createUser} className="w-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white">Create User</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {users.map(u => (
                    <div key={u.id || u._id} className="flex items-center justify-between py-3 border-b border-[#F1F5F9] last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1D4ED8]/10 flex items-center justify-center text-xs font-bold text-[#1D4ED8]">{u.name?.charAt(0)}</div>
                        <div>
                          <p className="text-sm font-medium text-[#0F172A]">{u.name}</p>
                          <p className="text-xs text-[#94A3B8]">{u.email}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.role === 'super_admin' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                        {u.role === 'super_admin' ? 'Super Admin' : 'Property Admin'}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="security">
          <Card className="border-[#E2E8F0] shadow-sm max-w-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base" style={{ fontFamily: 'Outfit' }}>
                <Shield className="w-5 h-5 text-[#1D4ED8]" /> Change Password
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSelfChangePassword} className="space-y-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Current Password *</Label>
                  <Input
                    type="password"
                    placeholder="Enter current password"
                    value={pwdForm.current_password}
                    onChange={e => setPwdForm({ ...pwdForm, current_password: e.target.value })}
                    required
                    className="mt-1 text-xs h-10 bg-white border-[#8C7E72]/20"
                    data-testid="self-current-password"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">New Password *</Label>
                  <Input
                    type="password"
                    placeholder="Enter new password (min 6 characters)"
                    value={pwdForm.new_password}
                    onChange={e => setPwdForm({ ...pwdForm, new_password: e.target.value })}
                    required
                    className="mt-1 text-xs h-10 bg-white border-[#8C7E72]/20"
                    data-testid="self-new-password"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Confirm New Password *</Label>
                  <Input
                    type="password"
                    placeholder="Re-enter new password"
                    value={pwdForm.confirm_password}
                    onChange={e => setPwdForm({ ...pwdForm, confirm_password: e.target.value })}
                    required
                    className="mt-1 text-xs h-10 bg-white border-[#8C7E72]/20"
                    data-testid="self-confirm-password"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={pwdChanging}
                  className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white rounded-xl text-xs px-6 font-semibold"
                  data-testid="submit-self-change-pwd-btn"
                >
                  {pwdChanging ? 'Updating Password...' : 'Update Password'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general">
          <Card className="border-[#E2E8F0] shadow-sm">
            <CardHeader>
              <CardTitle className="text-base" style={{ fontFamily: 'Outfit' }}>General Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Platform Name</Label>
                  <Input value="Subhouz" disabled className="bg-[#F8FAFC]" />
                </div>
                <div>
                  <Label className="text-xs">Default Currency</Label>
                  <Input value="INR (₹)" disabled className="bg-[#F8FAFC]" />
                </div>
              </div>
              <div className="pt-4 border-t border-[#F1F5F9]">
                <h3 className="text-sm font-semibold text-[#0F172A] mb-2">About</h3>
                <p className="text-sm text-[#64748B]">Subhouz v1.0 — Smart Property Management Platform</p>
                <p className="text-xs text-[#94A3B8] mt-1">Built for property owners & rental managers across India</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
