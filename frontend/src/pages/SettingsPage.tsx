'use client';

import { AuthGuard } from '@/components/auth-guard';
import { useWallet } from '@/lib/wallet-context';
import { db } from '@/lib/api-client';
import { useState, useEffect } from 'react';
import { LogOut, CheckCircle2, Wallet, User as UserIcon, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/toast';

export default function SettingsPage() {
  const { user, walletAddress, disconnectWallet, refreshUser } = useWallet();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setBusinessName(user.business_name || '');
      setEmail(user.email || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.business_name, user?.email]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await db.updateUser(user.id, { business_name: businessName, email });
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      showToast('Profile saved successfully', 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    navigate('/');
  };

  return (
    <AuthGuard>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-8">Settings</h1>

        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-8">
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-violet-500" /> Merchant Profile
            </h3>
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-4 w-4 text-gray-400" />
                  </div>
                  <input 
                    type="text" 
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Your Business Name"
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">This will appear on your public invoices.</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-gray-400" />
                  </div>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hello@example.com"
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Displayed on invoices sent to clients.</p>
              </div>

              <button
                onClick={handleSave}
                disabled={saving || (businessName === user?.business_name && email === user?.email)}
                className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-medium transition-all"
              >
                {saving ? 'Saving...' : 'Save Profile'} 
                {saved && !saving && <CheckCircle2 className="w-4 h-4 text-green-400" />}
              </button>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-teal-500" /> Connected Wallet
            </h3>
            
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Stellar Address</p>
              <p className="font-mono text-gray-900 break-all">{walletAddress}</p>
            </div>

            <button
              onClick={handleDisconnect}
              className="flex items-center gap-2 text-red-600 bg-red-50 hover:bg-red-100 px-5 py-2.5 rounded-xl font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" /> Disconnect Wallet
            </button>
          </div>

        </div>
      </div>
    </AuthGuard>
  );
}
