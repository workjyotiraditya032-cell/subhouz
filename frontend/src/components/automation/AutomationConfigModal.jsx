import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings2, MessageSquare, Folder, Clock, FileText, Code2, 
  HelpCircle, AlertCircle, Plus, Trash2, Eye, Sparkles, Check
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

// Sample variables that can be inserted into templates
const TEMPLATE_VARIABLES = [
  { tag: '{{tenant_name}}', label: 'Tenant Name', example: 'Rahul Sharma' },
  { tag: '{{amount}}', label: 'Amount', example: '5,000' },
  { tag: '{{due_date}}', label: 'Due Date', example: '05th Aug' },
  { tag: '{{property_name}}', label: 'Property Name', example: 'Jogmaya Hostel' },
  { tag: '{{room_number}}', label: 'Room Number', example: '101' },
];

export default function AutomationConfigModal({ open, onClose, workflow, onSave, isSaving }) {
  const [advancedMode, setAdvancedMode] = useState(false);
  const [rawJsonText, setRawJsonText] = useState('{}');
  const [jsonError, setJsonError] = useState('');

  // Structured form state
  const [formState, setFormState] = useState({});
  const [customFields, setCustomFields] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});

  // Determine automation category
  const triggerType = workflow?.trigger_type || '';
  const workflowName = workflow?.name || '';

  const isMessageAutomation = ['new_enquiry', 'booking_confirmed', 'due_date', 'kyc_request', 'payment_recorded', 'rent_paid'].includes(triggerType) || workflowName.toLowerCase().includes('whatsapp') || workflowName.toLowerCase().includes('reminder');
  const isDocumentAutomation = triggerType === 'document_submitted' || workflowName.toLowerCase().includes('document') || workflowName.toLowerCase().includes('kyc');
  const isVacancyAutomation = triggerType === 'vacancy_update' || workflowName.toLowerCase().includes('vacancy');

  // Initialize state when workflow changes
  useEffect(() => {
    if (!workflow) return;

    const currentConfig = workflow.config || {};
    setRawJsonText(JSON.stringify(currentConfig, null, 2));
    setJsonError('');
    setValidationErrors({});
    setAdvancedMode(false);

    // Populate structured form values with smart defaults
    if (isDocumentAutomation) {
      setFormState({
        folder: currentConfig.folder || 'Aadhaar',
        autoRename: currentConfig.autoRename !== undefined ? Boolean(currentConfig.autoRename) : true,
        prefix: currentConfig.prefix || 'AAD',
        delay: currentConfig.delay !== undefined ? Number(currentConfig.delay) : 2,
        notifyManager: currentConfig.notifyManager !== undefined ? Boolean(currentConfig.notifyManager) : true,
      });
    } else if (isMessageAutomation) {
      setFormState({
        message_template: currentConfig.message_template || currentConfig.template || getDefaultTemplate(triggerType),
        send_time: currentConfig.send_time || '09:00 AM',
        days_before: currentConfig.days_before !== undefined ? Number(currentConfig.days_before) : 3,
        recipient_type: currentConfig.recipient_type || 'tenant',
        enable_automation: currentConfig.enable_automation !== undefined ? Boolean(currentConfig.enable_automation) : true,
      });
    } else if (isVacancyAutomation) {
      setFormState({
        auto_release_inventory: currentConfig.auto_release_inventory !== undefined ? Boolean(currentConfig.auto_release_inventory) : true,
        update_occupancy_stats: currentConfig.update_occupancy_stats !== undefined ? Boolean(currentConfig.update_occupancy_stats) : true,
        notify_admin: currentConfig.notify_admin !== undefined ? Boolean(currentConfig.notify_admin) : true,
      });
    } else {
      // Generic configuration mapping
      setFormState({ ...currentConfig });
      const extraKeys = Object.keys(currentConfig).filter(k => typeof currentConfig[k] !== 'object');
      setCustomFields(extraKeys.map(k => ({ key: k, value: String(currentConfig[k]) })));
    }
  }, [workflow]);

  // Sync Form State -> Raw JSON Text
  useEffect(() => {
    if (advancedMode) return; // don't overwrite if user is editing raw JSON manually
    const generatedJson = generateConfigObject();
    setRawJsonText(JSON.stringify(generatedJson, null, 2));
    setJsonError('');
  }, [formState, customFields, advancedMode]);

  function getDefaultTemplate(type) {
    switch (type) {
      case 'new_enquiry':
        return 'Dear {{tenant_name}},\n\nThank you for reaching out to {{property_name}}! Our team will contact you shortly.\n\nWarm regards,\nSUBHOUZ Team';
      case 'booking_confirmed':
        return 'Dear {{tenant_name}},\n\nYour booking at {{property_name}} (Room {{room_number}}) has been confirmed!\n\nThank you,\nSUBHOUZ';
      case 'due_date':
        return 'Dear {{tenant_name}},\n\nYour rent payment of ₹{{amount}} for {{property_name}} is due on {{due_date}}.\n\nPlease pay promptly to avoid late fees.\n\nThank you,\nSUBHOUZ';
      case 'kyc_request':
        return 'Dear {{tenant_name}},\n\nPlease submit your Aadhaar document for verification at {{property_name}}.\n\nThank you,\nSUBHOUZ';
      default:
        return 'Dear {{tenant_name}},\n\nNotification regarding your stay at {{property_name}}.\n\nThank you,\nSUBHOUZ';
    }
  }

  // Generate final JSON object from current form values
  const generateConfigObject = () => {
    if (isDocumentAutomation) {
      return {
        folder: formState.folder || 'Aadhaar',
        autoRename: Boolean(formState.autoRename),
        prefix: formState.prefix || 'AAD',
        delay: Number(formState.delay) || 0,
        notifyManager: Boolean(formState.notifyManager),
      };
    }

    if (isMessageAutomation) {
      return {
        message_template: formState.message_template || '',
        send_time: formState.send_time || '09:00 AM',
        days_before: Number(formState.days_before) || 0,
        recipient_type: formState.recipient_type || 'tenant',
        enable_automation: Boolean(formState.enable_automation),
      };
    }

    if (isVacancyAutomation) {
      return {
        auto_release_inventory: Boolean(formState.auto_release_inventory),
        update_occupancy_stats: Boolean(formState.update_occupancy_stats),
        notify_admin: Boolean(formState.notify_admin),
      };
    }

    // Generic custom fields
    const obj = { ...formState };
    customFields.forEach(f => {
      if (f.key && f.key.trim()) {
        obj[f.key.trim()] = f.value;
      }
    });
    return obj;
  };

  // Live preview message computation
  const livePreviewMessage = useMemo(() => {
    let text = formState.message_template || '';
    TEMPLATE_VARIABLES.forEach(v => {
      text = text.replace(new RegExp(v.tag.replace(/[{}]/g, '\\$&'), 'g'), v.example);
    });
    return text;
  }, [formState.message_template]);

  // Insert variable tag into template textarea
  const insertVariableTag = (tag) => {
    const current = formState.message_template || '';
    setFormState({ ...formState, message_template: current + ' ' + tag });
  };

  // Validate form fields before submitting
  const validateForm = () => {
    const errors = {};
    if (advancedMode) {
      try {
        JSON.parse(rawJsonText);
      } catch (err) {
        setJsonError(err.message || 'Invalid JSON format');
        return false;
      }
      return true;
    }

    if (isDocumentAutomation) {
      if (!formState.folder || !formState.folder.trim()) {
        errors.folder = 'Folder name is required';
      }
      if (formState.delay < 0) {
        errors.delay = 'Delay cannot be negative';
      }
    }

    if (isMessageAutomation) {
      if (!formState.message_template || !formState.message_template.trim()) {
        errors.message_template = 'Message template cannot be empty';
      }
      if (formState.days_before < 0) {
        errors.days_before = 'Days before due date cannot be negative';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      toast.error('Please fix validation errors before saving');
      return;
    }

    let finalConfig = {};
    if (advancedMode) {
      try {
        finalConfig = JSON.parse(rawJsonText);
      } catch {
        toast.error('Invalid JSON syntax');
        return;
      }
    } else {
      finalConfig = generateConfigObject();
    }

    onSave(finalConfig);
  };

  if (!workflow) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl bg-white rounded-3xl p-6 border-[#FAF7F2] shadow-2xl max-h-[90vh] overflow-y-auto font-sans">
        {/* Modal Header */}
        <DialogHeader className="border-b border-[#FAF7F2] pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#E2F0D9] flex items-center justify-center shrink-0 border border-[#385723]/20">
                <Settings2 className="w-5 h-5 text-[#385723]" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-[#1C1917] tracking-tight" style={{ fontFamily: 'Fraunces, serif' }}>
                  Configure {workflow.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-[#6B5E54] mt-0.5">
                  Set user-friendly parameters without writing raw code.
                </DialogDescription>
              </div>
            </div>

            {/* Advanced Mode Toggle Switch */}
            <div className="flex items-center gap-2 bg-[#FAF7F2] px-3 py-1.5 rounded-full border border-[#8C7E72]/15">
              <Code2 className="w-3.5 h-3.5 text-[#8C7E72]" />
              <Label htmlFor="advanced-mode-switch" className="text-[11px] font-semibold text-[#6B5E54] cursor-pointer">
                Edit Raw JSON
              </Label>
              <Switch
                id="advanced-mode-switch"
                checked={advancedMode}
                onCheckedChange={(val) => {
                  if (val) {
                    // Sync current form to JSON when enabling advanced mode
                    setRawJsonText(JSON.stringify(generateConfigObject(), null, 2));
                  }
                  setAdvancedMode(val);
                }}
                data-testid="advanced-mode-toggle"
              />
            </div>
          </div>
        </DialogHeader>

        {/* Modal Body */}
        <div className="py-4 space-y-6">
          {advancedMode ? (
            /* Advanced Mode Raw JSON Editor */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="json-editor" className="text-xs font-semibold text-[#1C1917] flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-[#2D5F3F]" /> Raw JSON Configuration
                </Label>
                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 font-medium">
                  Technical Mode
                </Badge>
              </div>
              <Textarea
                id="json-editor"
                rows={12}
                value={rawJsonText}
                onChange={(e) => {
                  setRawJsonText(e.target.value);
                  try {
                    JSON.parse(e.target.value);
                    setJsonError('');
                  } catch (err) {
                    setJsonError(err.message);
                  }
                }}
                className={`font-mono text-xs p-3.5 rounded-2xl border ${
                  jsonError ? 'border-red-500 focus:ring-red-500' : 'border-[#8C7E72]/20 focus:ring-[#2D5F3F]'
                } bg-slate-950 text-emerald-400`}
                data-testid="raw-json-textarea"
              />
              {jsonError && (
                <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {jsonError}
                </p>
              )}
            </div>
          ) : (
            /* Standard User-Friendly Visual Form */
            <div className="space-y-5">
              {isDocumentAutomation && (
                <div className="space-y-4 bg-[#FAF7F2]/40 p-4 rounded-2xl border border-[#FAF7F2]">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold text-[#1C1917]">Folder Name *</Label>
                      <Input
                        value={formState.folder || ''}
                        onChange={(e) => setFormState({ ...formState, folder: e.target.value })}
                        placeholder="e.g. Aadhaar"
                        className="mt-1 text-xs h-9 bg-white border-[#8C7E72]/20"
                        data-testid="config-folder-input"
                      />
                      {validationErrors.folder && <p className="text-[11px] text-red-600 mt-1">{validationErrors.folder}</p>}
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-[#1C1917]">File Prefix</Label>
                      <Input
                        value={formState.prefix || ''}
                        onChange={(e) => setFormState({ ...formState, prefix: e.target.value })}
                        placeholder="e.g. AAD"
                        className="mt-1 text-xs h-9 bg-white border-[#8C7E72]/20"
                        data-testid="config-prefix-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold text-[#1C1917]">Processing Delay (Minutes)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={formState.delay ?? 2}
                        onChange={(e) => setFormState({ ...formState, delay: parseInt(e.target.value) || 0 })}
                        className="mt-1 text-xs h-9 bg-white border-[#8C7E72]/20"
                        data-testid="config-delay-input"
                      />
                      {validationErrors.delay && <p className="text-[11px] text-red-600 mt-1">{validationErrors.delay}</p>}
                    </div>

                    <div className="flex flex-col justify-end">
                      <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-[#8C7E72]/20">
                        <Label htmlFor="auto-rename-switch" className="text-xs font-medium text-[#1C1917] cursor-pointer">
                          Auto Rename Files
                        </Label>
                        <Switch
                          id="auto-rename-switch"
                          checked={formState.autoRename}
                          onCheckedChange={(val) => setFormState({ ...formState, autoRename: val })}
                          data-testid="config-auto-rename-switch"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isMessageAutomation && (
                <div className="space-y-4">
                  {/* Template Textarea & Variable Tag Chips */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-[#1C1917] flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-[#2D5F3F]" /> Message Template *
                      </Label>
                      <span className="text-[11px] text-[#8C7E72]">Click chip to insert placeholder</span>
                    </div>

                    {/* Variable Chips */}
                    <div className="flex flex-wrap gap-1.5 py-1">
                      {TEMPLATE_VARIABLES.map(v => (
                        <button
                          key={v.tag}
                          type="button"
                          onClick={() => insertVariableTag(v.tag)}
                          className="text-[10px] font-semibold bg-[#E2F0D9] text-[#385723] hover:bg-[#385723] hover:text-white px-2.5 py-1 rounded-full border border-[#385723]/20 transition-all flex items-center gap-1 active:scale-95"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          <span>{v.label}</span>
                        </button>
                      ))}
                    </div>

                    <Textarea
                      rows={5}
                      value={formState.message_template || ''}
                      onChange={(e) => setFormState({ ...formState, message_template: e.target.value })}
                      placeholder="Enter WhatsApp / Notification message template..."
                      className="text-xs p-3 rounded-2xl border-[#8C7E72]/20 focus:ring-[#2D5F3F] leading-relaxed bg-white"
                      data-testid="config-template-textarea"
                    />
                    {validationErrors.message_template && (
                      <p className="text-[11px] text-red-600 mt-1 font-medium">{validationErrors.message_template}</p>
                    )}
                  </div>

                  {/* Settings Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#FAF7F2]/40 p-3.5 rounded-2xl border border-[#FAF7F2]">
                    <div>
                      <Label className="text-xs font-semibold text-[#1C1917]">Send Time</Label>
                      <Select
                        value={formState.send_time || '09:00 AM'}
                        onValueChange={(val) => setFormState({ ...formState, send_time: val })}
                      >
                        <SelectTrigger className="mt-1 text-xs h-9 bg-white border-[#8C7E72]/20" data-testid="config-send-time-select">
                          <SelectValue placeholder="Select Time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="08:00 AM">08:00 AM</SelectItem>
                          <SelectItem value="09:00 AM">09:00 AM</SelectItem>
                          <SelectItem value="10:00 AM">10:00 AM</SelectItem>
                          <SelectItem value="12:00 PM">12:00 PM</SelectItem>
                          <SelectItem value="06:00 PM">06:00 PM</SelectItem>
                          <SelectItem value="08:00 PM">08:00 PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-[#1C1917]">Days Before Due</Label>
                      <Input
                        type="number"
                        min={0}
                        value={formState.days_before ?? 3}
                        onChange={(e) => setFormState({ ...formState, days_before: parseInt(e.target.value) || 0 })}
                        className="mt-1 text-xs h-9 bg-white border-[#8C7E72]/20"
                        data-testid="config-days-before-input"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-[#1C1917]">Recipient</Label>
                      <Select
                        value={formState.recipient_type || 'tenant'}
                        onValueChange={(val) => setFormState({ ...formState, recipient_type: val })}
                      >
                        <SelectTrigger className="mt-1 text-xs h-9 bg-white border-[#8C7E72]/20" data-testid="config-recipient-select">
                          <SelectValue placeholder="Select Recipient" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tenant">Tenant / Resident</SelectItem>
                          <SelectItem value="manager">Hostel Manager</SelectItem>
                          <SelectItem value="both">Tenant & Manager</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Sample WhatsApp Live Preview Card */}
                  <div className="bg-emerald-900/5 rounded-2xl p-4 border border-emerald-800/10 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp Live Preview
                      </span>
                      <span className="text-[10px] text-[#8C7E72] font-normal">Formatted Sample</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-emerald-950/10 text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                      {livePreviewMessage}
                    </div>
                  </div>
                </div>
              )}

              {isVacancyAutomation && (
                <div className="space-y-3 bg-[#FAF7F2]/40 p-4 rounded-2xl border border-[#FAF7F2]">
                  <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-[#8C7E72]/20">
                    <div>
                      <Label className="text-xs font-semibold text-[#1C1917] block">Auto Release Bed Inventory</Label>
                      <p className="text-[11px] text-[#6B5E54]">Mark room/bed available upon checkout or transfer.</p>
                    </div>
                    <Switch
                      checked={formState.auto_release_inventory}
                      onCheckedChange={(val) => setFormState({ ...formState, auto_release_inventory: val })}
                    />
                  </div>

                  <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-[#8C7E72]/20">
                    <div>
                      <Label className="text-xs font-semibold text-[#1C1917] block">Update Occupancy Stats</Label>
                      <p className="text-[11px] text-[#6B5E54]">Recalculate live occupancy percentage automatically.</p>
                    </div>
                    <Switch
                      checked={formState.update_occupancy_stats}
                      onCheckedChange={(val) => setFormState({ ...formState, update_occupancy_stats: val })}
                    />
                  </div>
                </div>
              )}

              {!isDocumentAutomation && !isMessageAutomation && !isVacancyAutomation && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-[#1C1917]">Configuration Settings</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCustomFields([...customFields, { key: '', value: '' }])}
                      className="text-xs h-8 border-[#8C7E72]/20 text-[#2D5F3F] hover:bg-[#FAF7F2]"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Field
                    </Button>
                  </div>

                  {customFields.length === 0 ? (
                    <div className="text-center py-6 bg-[#FAF7F2]/30 rounded-2xl border border-[#FAF7F2] text-xs text-[#8C7E72]">
                      No custom fields added yet. Click &quot;Add Field&quot; to configure custom parameters.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {customFields.map((f, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Input
                            placeholder="Setting Key"
                            value={f.key}
                            onChange={(e) => {
                              const updated = [...customFields];
                              updated[i].key = e.target.value;
                              setCustomFields(updated);
                            }}
                            className="text-xs h-9 bg-white border-[#8C7E72]/20"
                          />
                          <Input
                            placeholder="Value"
                            value={f.value}
                            onChange={(e) => {
                              const updated = [...customFields];
                              updated[i].value = e.target.value;
                              setCustomFields(updated);
                            }}
                            className="text-xs h-9 bg-white border-[#8C7E72]/20"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setCustomFields(customFields.filter((_, index) => index !== i))}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-9 w-9 p-0 shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="gap-2 border-t border-[#FAF7F2] pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[#8C7E72]/20 text-[#6B5E54] hover:bg-[#FAF7F2] rounded-full text-xs px-5"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#2D5F3F] hover:bg-[#1F4A2E] text-white shadow-md rounded-full text-xs px-6 font-semibold"
            data-testid="save-config-btn"
          >
            {isSaving ? 'Saving Configuration...' : 'Save Configuration'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
