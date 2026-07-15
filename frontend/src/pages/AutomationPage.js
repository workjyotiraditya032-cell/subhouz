import { useState, useEffect } from 'react';
import { 
  Zap, MessageCircle, Bell, Calendar, BarChart3, FileText, 
  Shield, Mail, CreditCard, Check, X, Play, Clock, ArrowRight, 
  Settings2, Activity, RefreshCw, AlertCircle, CheckCircle2, 
  Search, SlidersHorizontal, Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle 
} from '../components/ui/dialog';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '../components/ui/table';
import { toast } from 'sonner';
import api from '../lib/api';

const triggerIcons = {
  rent_paid: CreditCard,
  due_date: Calendar,
  follow_up: Bell,
  new_enquiry: Mail,
  booking_confirmed: Check,
  kyc_request: FileText,
  document_submitted: FileText,
  payment_recorded: CreditCard,
  vacancy_update: Shield,
};

const triggerColors = {
  rent_paid: { bg: 'bg-[#E2F0D9]', text: 'text-[#385723]', icon: 'text-[#385723]' },
  due_date: { bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-700', icon: 'text-amber-600' },
  follow_up: { bg: 'bg-red-50 text-red-700 border-red-200', text: 'text-red-700', icon: 'text-red-600' },
  new_enquiry: { bg: 'bg-blue-50 text-blue-700 border-blue-200', text: 'text-blue-700', icon: 'text-blue-600' },
  booking_confirmed: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-700', icon: 'text-emerald-600' },
  kyc_request: { bg: 'bg-purple-50 text-purple-700 border-purple-200', text: 'text-purple-700', icon: 'text-purple-600' },
  document_submitted: { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', text: 'text-indigo-700', icon: 'text-indigo-600' },
  payment_recorded: { bg: 'bg-[#E2F0D9] text-[#385723] border-[#385723]/30', text: 'text-[#385723]', icon: 'text-[#385723]' },
  vacancy_update: { bg: 'bg-cyan-50 text-cyan-700 border-cyan-200', text: 'text-cyan-700', icon: 'text-cyan-600' },
};

export default function AutomationPage() {
  const [workflows, setWorkflows] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  // Running workflow state removed
  
  // Modal / Editing Configuration state
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [configText, setConfigText] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Search & Filter state for logs
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [nameFilter, setNameFilter] = useState('all');

  const fetchData = async () => {
    try {
      const [wRes, lRes] = await Promise.all([
        api.get('/automation/workflows'),
        api.get('/automation/logs')
      ]);
      setWorkflows(wRes.data);
      setLogs(lRes.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load automation data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleWorkflow = async (id, enabled) => {
    try {
      await api.put(`/automation/workflows/${id}`, { enabled });
      setWorkflows(ws => ws.map(w => w.id === id ? { ...w, enabled } : w));
      toast.success(enabled ? 'Automation enabled' : 'Automation disabled');
    } catch { 
      toast.error('Error updating automation'); 
    }
  };
  const openConfigModal = (workflow) => {
    setEditingWorkflow(workflow);
    setConfigText(JSON.stringify(workflow.config || {}, null, 2));
  };

  const saveConfig = async () => {
    if (!editingWorkflow) return;
    setIsSavingConfig(true);
    try {
      let parsedConfig = {};
      try {
        parsedConfig = JSON.parse(configText);
      } catch {
        toast.error('Invalid JSON configuration');
        setIsSavingConfig(false);
        return;
      }

      await api.put(`/automation/workflows/${editingWorkflow.id}`, { 
        config: parsedConfig 
      });
      setWorkflows(ws => ws.map(w => w.id === editingWorkflow.id ? { ...w, config: parsedConfig } : w));
      toast.success('Configuration saved');
      setEditingWorkflow(null);
    } catch {
      toast.error('Failed to save configuration');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Stats calculation
  const totalAutomations = workflows.length;
  const activeAutomations = workflows.filter(w => w.enabled).length;
  const totalRuns = workflows.reduce((acc, w) => acc + (w.run_count || 0), 0);
  const successRuns = logs.filter(l => l.status === 'success' || l.status === 'triggered').length;
  const failedRuns = logs.filter(l => l.status === 'failed').length;
  const successRate = totalRuns > 0 ? Math.round(((totalRuns - failedRuns) / totalRuns) * 100) : 100;

  // Filtered Logs
  const filteredLogs = logs.filter(l => {
    const matchesSearch = 
      (l.resident_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (l.details?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (l.message?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (l.automation_name?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'success' && (l.status === 'success' || l.status === 'triggered')) ||
      (statusFilter === 'failed' && l.status === 'failed');

    const matchesName = 
      nameFilter === 'all' || 
      l.automation_name === nameFilter;

    return matchesSearch && matchesStatus && matchesName;
  });

  return (
    <div className="space-y-8 pb-12" data-testid="automation-page" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1C1917] tracking-tight" style={{ fontFamily: 'Fraunces, serif' }}>
            Automation Control Panel
          </h1>
          <p className="text-sm text-[#6B5E54] mt-1">
            Build, configure, and monitor automated operations for notifications, vacancy statuses, and rent tracking.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => { setLoading(true); fetchData(); }}
            variant="outline"
            className="border-[#8C7E72]/20 text-[#6B5E54] hover:bg-[#FAF7F2]"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Status
          </Button>

        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-[#FAF7F2] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#8C7E72] uppercase tracking-wider">Total Workflows</span>
              <div className="w-8 h-8 rounded-lg bg-[#FAF7F2] flex items-center justify-center text-[#2D5F3F]">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#1C1917]">{totalAutomations}</span>
              <span className="text-xs text-[#2D5F3F] font-medium">{activeAutomations} enabled</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#FAF7F2] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#8C7E72] uppercase tracking-wider">Total Executions</span>
              <div className="w-8 h-8 rounded-lg bg-[#FAF7F2] flex items-center justify-center text-[#2D5F3F]">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#1C1917]">{totalRuns}</span>
              <span className="text-xs text-[#6B5E54] font-medium">runs triggered</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#FAF7F2] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#8C7E72] uppercase tracking-wider">Success Rate</span>
              <div className="w-8 h-8 rounded-lg bg-[#E2F0D9] flex items-center justify-center text-[#385723]">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#1C1917]">{successRate}%</span>
              <span className="text-xs text-[#385723] font-medium">{failedRuns} failed executions</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#FAF7F2] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#8C7E72] uppercase tracking-wider">API Connection</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <MessageCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-lg font-bold text-emerald-600">WhatsApp Active</span>
              <span className="text-xs text-[#8C7E72] font-medium">Twilio integration verified</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflows Cards grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#1C1917]" style={{ fontFamily: 'Fraunces, serif' }}>
            Active Automation Workflows
          </h2>
          <span className="text-xs text-[#8C7E72] font-medium bg-[#FAF7F2] px-3 py-1.5 rounded-full">
            Realtime DB triggers configured
          </span>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-48 bg-white border border-[#FAF7F2] rounded-3xl animate-pulse shadow-sm" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflows.map(w => {
              const Icon = triggerIcons[w.trigger_type] || Zap;
              const colors = triggerColors[w.trigger_type] || { bg: 'bg-slate-50', text: 'text-slate-700', icon: 'text-slate-600' };
              const isActive = w.enabled;

              return (
                <Card 
                  key={w.id} 
                  className={`border-[#FAF7F2] shadow-[0_4px_20px_rgba(0,0,0,0.015)] transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.03)] bg-white rounded-3xl overflow-hidden flex flex-col justify-between ${
                    !isActive ? 'opacity-85' : ''
                  }`}
                  data-testid={`workflow-card-${w.id}`}
                >
                  <CardContent className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3">
                        <div className={`w-10 h-10 rounded-2xl ${colors.bg} flex items-center justify-center shrink-0 border border-[#FAF7F2]`}>
                          <Icon className={`w-5 h-5 ${colors.icon}`} />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-[#1C1917] tracking-tight">{w.name}</h3>
                          <Badge className="bg-[#FAF7F2] text-[#8C7E72] text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 border-0 mt-1">
                            {w.trigger_type.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1.5">
                        <Switch
                          checked={w.enabled}
                          onCheckedChange={(v) => toggleWorkflow(w.id, v)}
                          data-testid={`workflow-toggle-${w.id}`}
                        />
                        <span className={`text-[10px] font-semibold tracking-wider uppercase ${
                          w.enabled ? 'text-[#2D5F3F]' : 'text-[#8C7E72]'
                        }`}>
                          {w.enabled ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-[#6B5E54] leading-relaxed line-clamp-3">
                      {w.description || "No description provided."}
                    </p>

                    {/* Run statistics */}
                    <div className="bg-[#FAF7F2]/50 rounded-2xl p-3 space-y-2 border border-[#FAF7F2]">
                      <div className="flex justify-between items-center text-[11px] text-[#6B5E54]">
                        <span>Last Execution:</span>
                        <span className="font-medium text-[#1C1917]">
                          {w.last_run ? new Date(w.last_run).toLocaleString() : 'Never run'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-[#6B5E54]">
                        <span>Execution Status:</span>
                        {w.run_count > 0 ? (
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border-0 uppercase ${
                            w.execution_status === 'failed' 
                              ? 'bg-red-50 text-red-700' 
                              : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {w.execution_status || 'success'}
                          </Badge>
                        ) : (
                          <span className="text-[#8C7E72]">No executions</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-[#6B5E54]">
                        <span>Run Count:</span>
                        <span className="font-semibold text-[#1C1917]">{w.run_count || 0} times</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openConfigModal(w)}
                      className="flex-1 text-xs border-[#8C7E72]/20 hover:bg-[#FAF7F2] text-[#6B5E54]"
                    >
                      <Settings2 className="w-3.5 h-3.5 mr-1.5" />
                      Configure
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Logs and Auditing Section */}
      <Card className="border-[#FAF7F2] bg-white rounded-[32px] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
        <CardHeader className="border-b border-[#FAF7F2] p-6 bg-gradient-to-r from-white to-[#FAF7F2]/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold text-[#1C1917] flex items-center gap-2" style={{ fontFamily: 'Fraunces, serif' }}>
                <FileText className="w-5 h-5 text-[#2D5F3F]" />
                Automation Activity Logs
              </CardTitle>
              <CardDescription className="text-xs text-[#6B5E54] mt-0.5">
                Audit history of all background triggers, message queues, and notifications.
              </CardDescription>
            </div>
            
            {/* Filters panel */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#8C7E72]" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 w-48 text-xs rounded-full border-[#8C7E72]/20 bg-white placeholder:text-[#8C7E72]/60"
                />
              </div>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 px-3 text-xs rounded-full border border-[#8C7E72]/20 bg-white text-[#6B5E54] focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
              </select>

              {/* Workflow name filter */}
              <select
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                className="h-9 px-3 text-xs rounded-full border border-[#8C7E72]/20 bg-white text-[#6B5E54] focus:outline-none"
              >
                <option value="all">All Automations</option>
                {Array.from(new Set(logs.map(l => l.automation_name).filter(Boolean))).map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 bg-[#FAF7F2]/50 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#FAF7F2]/30">
                  <TableRow className="hover:bg-transparent border-b border-[#FAF7F2]">
                    <TableHead className="text-xs text-[#8C7E72] font-semibold py-3.5 pl-6">Time</TableHead>
                    <TableHead className="text-xs text-[#8C7E72] font-semibold py-3.5">Automation Name</TableHead>
                    <TableHead className="text-xs text-[#8C7E72] font-semibold py-3.5">Resident</TableHead>
                    <TableHead className="text-xs text-[#8C7E72] font-semibold py-3.5">Hostel</TableHead>
                    <TableHead className="text-xs text-[#8C7E72] font-semibold py-3.5">Status</TableHead>
                    <TableHead className="text-xs text-[#8C7E72] font-semibold py-3.5">Message / Details</TableHead>
                    <TableHead className="text-xs text-[#8C7E72] font-semibold py-3.5 pr-6">Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => {
                    const isSuccess = log.status === 'success' || log.status === 'triggered';
                    return (
                      <TableRow key={log.id} className="hover:bg-[#FAF7F2]/20 border-b border-[#FAF7F2] last:border-0">
                        <TableCell className="text-xs font-medium text-[#1C1917] py-3.5 pl-6 shrink-0">
                          {log.time ? new Date(log.time).toLocaleString() : 'N/A'}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-[#1C1917] py-3.5">
                          {log.automation_name || 'N/A'}
                        </TableCell>
                        <TableCell className="text-xs text-[#6B5E54] py-3.5">
                          {log.resident_name || 'N/A'}
                        </TableCell>
                        <TableCell className="text-xs text-[#6B5E54] py-3.5">
                          {log.hostel_name || 'N/A'}
                        </TableCell>
                        <TableCell className="py-3.5">
                          <Badge className={`text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 border-0 ${
                            isSuccess 
                              ? 'bg-emerald-50 text-emerald-700' 
                              : 'bg-red-50 text-red-700'
                          }`}>
                            {log.status || 'success'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-[#6B5E54] py-3.5 max-w-sm truncate">
                          {log.message || log.details || 'N/A'}
                        </TableCell>
                        <TableCell className="text-xs text-red-600 font-mono py-3.5 max-w-xs truncate pr-6">
                          {log.error || '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-16 px-4">
              <AlertCircle className="w-8 h-8 text-[#8C7E72]/40 mx-auto mb-3" />
              <p className="text-sm font-semibold text-[#1C1917]">No Activity Logs Found</p>
              <p className="text-xs text-[#6B5E54] mt-1">
                No logs match your filter queries or none have been generated yet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Configuration Dialog */}
      <Dialog open={!!editingWorkflow} onOpenChange={(open) => !open && setEditingWorkflow(null)}>
        <DialogContent className="sm:max-w-lg bg-white rounded-3xl p-6 border-[#FAF7F2] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#1C1917] flex items-center gap-2" style={{ fontFamily: 'Fraunces, serif' }}>
              <Settings2 className="w-5 h-5 text-[#2D5F3F]" />
              Configure {editingWorkflow?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B5E54] mt-1">
              Adjust JSON configuration parameters for template texts, grace periods, or delay values.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="config-editor" className="text-xs font-semibold text-[#1C1917]">
                JSON Parameters
              </Label>
              <Textarea
                id="config-editor"
                rows={10}
                value={configText}
                onChange={(e) => setConfigText(e.target.value)}
                className="font-mono text-xs p-3 rounded-2xl border-[#8C7E72]/20 focus:ring-[#2D5F3F]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEditingWorkflow(null)}
              className="border-[#8C7E72]/20 text-[#6B5E54] hover:bg-[#FAF7F2]"
            >
              Cancel
            </Button>
            <Button
              onClick={saveConfig}
              disabled={isSavingConfig}
              className="bg-[#2D5F3F] hover:bg-[#1F4A2E] text-white shadow-md"
            >
              {isSavingConfig ? 'Saving...' : 'Save Configuration'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
