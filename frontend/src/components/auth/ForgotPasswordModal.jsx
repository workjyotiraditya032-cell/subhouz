import React, { useState } from 'react';
import { 
  KeyRound, ShieldCheck, Mail, ArrowRight, ArrowLeft, Eye, EyeOff, 
  CheckCircle2, AlertCircle, HelpCircle, Lock, Sparkles 
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import api, { formatApiError } from '../../lib/api';

export default function ForgotPasswordModal({ open, onClose }) {
  const [step, setStep] = useState(1); // 1: Email, 2: Questions, 3: Reset, 4: Success
  const [email, setEmail] = useState('');
  const [answers, setAnswers] = useState({
    sec_school: '',
    sec_mother: '',
    sec_father: ''
  });
  const [passwords, setPasswords] = useState({
    new_password: '',
    confirm_password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attemptsWarning, setAttemptsWarning] = useState('');

  const resetModal = () => {
    setStep(1);
    setEmail('');
    setAnswers({ sec_school: '', sec_mother: '', sec_father: '' });
    setPasswords({ new_password: '', confirm_password: '' });
    setResetToken('');
    setError('');
    setAttemptsWarning('');
    setLoading(false);
    onClose();
  };

  // Step 1: Submit Email
  const handleVerifyUser = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !email.trim()) {
      setError('Please enter your registered email address.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/forgot-password/verify-user', { email: email.trim() });
      setStep(2);
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || 'User verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Security Questions Answers
  const handleVerifyQuestions = async (e) => {
    e.preventDefault();
    setError('');
    setAttemptsWarning('');

    if (!answers.sec_school.trim() || !answers.sec_mother.trim() || !answers.sec_father.trim()) {
      setError('Please answer all 3 security questions.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password/verify-questions', {
        email: email.trim(),
        sec_school: answers.sec_school.trim(),
        sec_mother: answers.sec_mother.trim(),
        sec_father: answers.sec_father.trim()
      });

      if (res.data?.reset_token) {
        setResetToken(res.data.reset_token);
        setStep(3);
      }
    } catch (err) {
      const detailMsg = formatApiError(err.response?.data?.detail) || 'Security question verification failed.';
      setError(detailMsg);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (!passwords.new_password || passwords.new_password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (passwords.new_password !== passwords.confirm_password) {
      setError('New password and Confirm password do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/forgot-password/reset-password', {
        reset_token: resetToken,
        new_password: passwords.new_password,
        confirm_password: passwords.confirm_password
      });
      setStep(4);
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && resetModal()}>
      <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 border-[#FAF7F2] shadow-2xl font-sans">
        <DialogHeader className="border-b border-[#FAF7F2] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E2F0D9] flex items-center justify-center shrink-0 border border-[#385723]/20">
              <KeyRound className="w-5 h-5 text-[#385723]" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-[#1C1917] tracking-tight" style={{ fontFamily: 'Fraunces, serif' }}>
                Reset Password
              </DialogTitle>
              <DialogDescription className="text-xs text-[#6B5E54] mt-0.5">
                Verify identity using your registered Security Questions
              </DialogDescription>
            </div>
          </div>

          {/* Step Indicator */}
          {step <= 3 && (
            <div className="flex items-center justify-between mt-4 px-2">
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === 1 ? 'bg-[#2D5F3F] text-white' : 'bg-emerald-100 text-emerald-800'
                }`}>1</span>
                <span className="text-[11px] font-medium text-[#6B5E54]">Account</span>
              </div>
              <div className="h-[2px] w-8 bg-slate-200" />
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === 2 ? 'bg-[#2D5F3F] text-white' : step > 2 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'
                }`}>2</span>
                <span className="text-[11px] font-medium text-[#6B5E54]">Questions</span>
              </div>
              <div className="h-[2px] w-8 bg-slate-200" />
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === 3 ? 'bg-[#2D5F3F] text-white' : 'bg-slate-100 text-slate-400'
                }`}>3</span>
                <span className="text-[11px] font-medium text-[#6B5E54]">Password</span>
              </div>
            </div>
          )}
        </DialogHeader>

        <div className="py-4">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl p-3 text-xs text-red-700 font-medium flex items-start gap-2" data-testid="forgot-password-error">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Enter Email */}
          {step === 1 && (
            <form onSubmit={handleVerifyUser} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-[#1C1917]">Registered Email Address *</Label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="email"
                    placeholder="e.g. admin@subhouz.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-9 text-xs h-10 bg-white border-[#8C7E72]/20"
                    data-testid="forgot-email-input"
                  />
                </div>
                <p className="text-[11px] text-[#6B5E54]">Enter the email address associated with your admin account.</p>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={resetModal} className="rounded-full text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-[#2D5F3F] hover:bg-[#1F4A2E] text-white rounded-full text-xs px-5" data-testid="verify-account-btn">
                  {loading ? 'Verifying Account...' : 'Continue'} <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </DialogFooter>
            </form>
          )}

          {/* STEP 2: Answer 3 Mandatory Security Questions */}
          {step === 2 && (
            <form onSubmit={handleVerifyQuestions} className="space-y-4">
              <div className="bg-[#FAF7F2]/60 p-3 rounded-2xl border border-[#FAF7F2] mb-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#1C1917]">
                  <HelpCircle className="w-4 h-4 text-[#2D5F3F]" />
                  <span>Answer Security Questions</span>
                </div>
                <p className="text-[11px] text-[#6B5E54] mt-0.5">Answers are case-insensitive and trimmed of whitespace.</p>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-[#1C1917]">
                    1. What was the name of your first school? *
                  </Label>
                  <Input
                    placeholder="Enter school name"
                    value={answers.sec_school}
                    onChange={(e) => setAnswers({ ...answers, sec_school: e.target.value })}
                    required
                    className="mt-1 text-xs h-9 bg-white border-[#8C7E72]/20"
                    data-testid="sec-school-input"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-[#1C1917]">
                    2. What is your mother&apos;s first name? *
                  </Label>
                  <Input
                    placeholder="Enter mother's first name"
                    value={answers.sec_mother}
                    onChange={(e) => setAnswers({ ...answers, sec_mother: e.target.value })}
                    required
                    className="mt-1 text-xs h-9 bg-white border-[#8C7E72]/20"
                    data-testid="sec-mother-input"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-[#1C1917]">
                    3. What is your father&apos;s first name? *
                  </Label>
                  <Input
                    placeholder="Enter father's first name"
                    value={answers.sec_father}
                    onChange={(e) => setAnswers({ ...answers, sec_father: e.target.value })}
                    required
                    className="mt-1 text-xs h-9 bg-white border-[#8C7E72]/20"
                    data-testid="sec-father-input"
                  />
                </div>
              </div>

              <DialogFooter className="pt-3">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="rounded-full text-xs">
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
                </Button>
                <Button type="submit" disabled={loading} className="bg-[#2D5F3F] hover:bg-[#1F4A2E] text-white rounded-full text-xs px-5" data-testid="verify-questions-btn">
                  {loading ? 'Verifying Answers...' : 'Verify Answers'}
                </Button>
              </DialogFooter>
            </form>
          )}

          {/* STEP 3: Reset Password Form */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-[#1C1917]">New Password *</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="At least 6 characters"
                      value={passwords.new_password}
                      onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                      required
                      className="text-xs h-10 bg-white border-[#8C7E72]/20 pr-10"
                      data-testid="forgot-new-password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-[#1C1917]">Confirm New Password *</Label>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter new password"
                    value={passwords.confirm_password}
                    onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
                    required
                    className="mt-1 text-xs h-10 bg-white border-[#8C7E72]/20"
                    data-testid="forgot-confirm-password-input"
                  />
                </div>
              </div>

              <DialogFooter className="pt-3">
                <Button type="button" variant="outline" onClick={resetModal} className="rounded-full text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-[#2D5F3F] hover:bg-[#1F4A2E] text-white rounded-full text-xs px-5" data-testid="reset-password-submit-btn">
                  {loading ? 'Resetting Password...' : 'Reset Password'}
                </Button>
              </DialogFooter>
            </form>
          )}

          {/* STEP 4: Success Message */}
          {step === 4 && (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1C1917]" style={{ fontFamily: 'Fraunces, serif' }}>
                  Password Reset Successfully!
                </h3>
                <p className="text-xs text-[#6B5E54] mt-1">
                  Your password has been updated. You can now sign in using your new credentials.
                </p>
              </div>
              <Button onClick={resetModal} className="bg-[#2D5F3F] hover:bg-[#1F4A2E] text-white rounded-full text-xs px-6" data-testid="back-to-login-btn">
                Back to Sign In
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
