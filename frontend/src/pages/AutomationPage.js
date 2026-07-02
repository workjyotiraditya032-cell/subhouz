import { useState, useEffect } from 'react';
import { Zap, MessageCircle, Bell, Calendar, BarChart3, FileText, Shield, Mail, CreditCard, Check, X, Play, Clock, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { toast } from 'sonner';
import api from '../lib/api';

const triggerIcons = {
  rent_paid: CreditCard,
  due_date: Calendar,
  follow_up: Bell,
  new_enquiry: Mail,
  daily_summary: BarChart3,
  agreement_expiry: FileText,
  vacancy_alert: Shield,
  monthly_report: BarChart3,
};

const triggerColors = {
  rent_paid: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'text-emerald-600' },
  due_date: { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'text-amber-600' },
  follow_up: { bg: 'bg-red-50', text: 'text-red-700', icon: 'text-red-600' },
  new_enquiry: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-600' },
  daily_summary: { bg: 'bg-purple-50', text: 'text-purple-700', icon: 'text-purple-600' },
  agreement_expiry: { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'text-orange-600' },
  vacancy_alert: { bg: 'bg-cyan-50', text: 'text-cyan-700', icon: 'text-cyan-600' },
  monthly_report: { bg: 'bg-indigo-50', text: 'text-indigo-700', icon: 'text-indigo-600' },
};

export default function AutomationPage() {
  const [workflows, setWorkflows] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggeringReminders, setTriggeringReminders] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/automation/workflows'),
      api.get('/automation/logs')
    ]).then(([wRes, lRes]) => {
      setWorkflows(wRes.data);
      setLogs(lRes.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const toggleWorkflow = async (id, enabled) => {
    try {
      await api.put(`/automation/workflows/${id}`, { enabled });
      setWorkflows(ws => ws.map(w => w.id === id ? { ...w, enabled } : w));
      toast.success(enabled ? 'Workflow enabled' : 'Workflow disabled');
    } catch { toast.error('Error updating workflow'); }
  };

  const handleTriggerReminders = async () => {
    setTriggeringReminders(true);
    try {
      const res = await api.post('/automation/trigger-reminders');
      toast.success(res.data.message);
      // Refresh logs
      const lRes = await api.get('/automation/logs');
      setLogs(lRes.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error triggering reminders');
    } finally {
      setTriggeringReminders(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="automation-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F172A] tracking-tight" style={{ fontFamily: 'Outfit' }}>Automation Engine</h1>
          <p className="text-sm text-[#64748B] mt-1">Manage automated workflows for rent collection, reminders, and notifications</p>
        </div>
        <Button
          data-testid="trigger-reminders-btn"
          className="bg-amber-500 hover:bg-amber-600 text-white"
          disabled={triggeringReminders}
          onClick={handleTriggerReminders}
        >
          {triggeringReminders ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> : <Bell className="w-4 h-4 mr-2" />}
          Send Rent Reminders
        </Button>
      </div>

      {/* WhatsApp Integration Status */}
      <Card className="border-[#E2E8F0] shadow-sm border-l-4 border-l-emerald-500">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-sm text-[#0F172A]">WhatsApp Business API</p>
              <p className="text-xs text-[#64748B]">Configure in Settings to enable automated WhatsApp messages</p>
            </div>
          </div>
          <Badge className="bg-amber-50 text-amber-700 border border-amber-200" data-testid="whatsapp-status">Pending Setup</Badge>
        </CardContent>
      </Card>

      {/* Workflows */}
      <div>
        <h2 className="text-lg font-semibold text-[#0F172A] mb-4" style={{ fontFamily: 'Outfit' }}>Workflows</h2>
        {loading ? (
          <div className="grid md:grid-cols-2 gap-4">{[1,2,3,4].map(i => <div key={i} className="stat-card h-32 animate-pulse" />)}</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {workflows.map(w => {
              const Icon = triggerIcons[w.trigger_type] || Zap;
              const colors = triggerColors[w.trigger_type] || { bg: 'bg-slate-50', text: 'text-slate-700', icon: 'text-slate-600' };
              return (
                <Card key={w.id} className="border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow" data-testid={`workflow-card-${w.id}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center shrink-0`}>
                          <Icon className={`w-5 h-5 ${colors.icon}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-[#0F172A]">{w.name}</h3>
                          <p className="text-xs text-[#94A3B8] mt-0.5 line-clamp-2">{w.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={w.enabled}
                        onCheckedChange={(v) => toggleWorkflow(w.id, v)}
                        data-testid={`workflow-toggle-${w.id}`}
                      />
                    </div>
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#F1F5F9]">
                      <Badge className={`${colors.bg} ${colors.text} text-xs border-0`}>{w.trigger_type.replace(/_/g, ' ')}</Badge>
                      <span className="text-xs text-[#94A3B8] flex items-center gap-1">
                        <ArrowRight className="w-3 h-3" />
                        {w.actions?.join(' → ')}
                      </span>
                    </div>
                    {w.run_count > 0 && (
                      <p className="text-xs text-[#94A3B8] mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Ran {w.run_count} times
                        {w.last_run && ` · Last: ${new Date(w.last_run).toLocaleDateString()}`}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Automation Logs */}
      <Card className="border-[#E2E8F0] shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-[#0F172A]" style={{ fontFamily: 'Outfit' }}>Recent Automation Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length > 0 ? (
            <div className="space-y-3">
              {logs.slice(0, 15).map((l, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-[#F1F5F9] last:border-0">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${l.status === 'triggered' ? 'bg-emerald-500' : l.status === 'failed' ? 'bg-red-500' : 'bg-amber-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#0F172A]">{l.details || l.workflow_name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-[#94A3B8]">{l.trigger}</span>
                      {l.resident_name && <span className="text-xs text-[#94A3B8]">{l.resident_name}</span>}
                      {l.whatsapp_number && <span className="text-xs text-[#94A3B8] flex items-center gap-1"><MessageCircle className="w-3 h-3" />{l.whatsapp_number}</span>}
                      <span className="text-xs text-[#94A3B8]">{new Date(l.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#94A3B8] text-center py-8">No automation logs yet. Workflows will generate logs when triggered.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
