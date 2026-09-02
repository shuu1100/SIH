'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sprout, ShieldCheck, User, Phone, MapPin, CheckCircle, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import LanguageSelector from '@/components/LanguageSelector';
import { useLanguage } from '@/lib/language-context';

export default function OnboardingPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [role, setRole] = useState<'farmer' | 'admin'>('farmer');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const MAYURBHANJ_BLOCK_COORDS: Record<string, [number, number]> = {
    'Baripada': [21.9324, 86.7351],
    'Betnoti': [21.7382, 86.8524],
    'Badasahi': [21.7241, 86.7583],
    'Kuliana': [22.0425, 86.6342],
    'Rairangpur': [22.2684, 86.1682],
    'Udala': [21.5842, 86.5721],
    'Karanjia': [21.7845, 85.9723],
    'Jashipur': [21.9681, 86.0824],
    'Morada': [21.8482, 86.9925],
    'Samakhunta': [21.9083, 86.7121],
    'Khunta': [21.6243, 86.6281],
    'Bangriposi': [22.1582, 86.5342],
  };

  // Farmer form state matching DB schema
  const [farmerForm, setFarmerForm] = useState({
    name: 'Ramesh Mohanty',
    phone: '+91 94371 88291',
    district: 'Mayurbhanj',
    block: 'Baripada',
    village: 'Baripada Rural',
    latitude: 21.9324,
    longitude: 86.7351,
    language: 'or',
    land_area: '4.8',
    loan_amount: '50000',
    crop_name: 'Paddy (Swarna)',
    crop_stage: 'Vegetative - Tillering',
    sowing_date: '2026-06-15'
  });

  const [gpsDetecting, setGpsDetecting] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setGpsStatus('Geolocation not supported');
      return;
    }
    setGpsDetecting(true);
    setGpsStatus('Detecting farm GPS...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setFarmerForm((prev) => ({
          ...prev,
          latitude: parseFloat(latitude.toFixed(6)),
          longitude: parseFloat(longitude.toFixed(6)),
        }));
        setGpsDetecting(false);
        setGpsStatus(`GPS Locked: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      },
      (err) => {
        console.warn('GPS error, using block center:', err.message);
        const blockCoord = MAYURBHANJ_BLOCK_COORDS[farmerForm.block] || [21.9324, 86.7351];
        setFarmerForm((prev) => ({
          ...prev,
          latitude: blockCoord[0],
          longitude: blockCoord[1],
        }));
        setGpsDetecting(false);
        setGpsStatus(`Locked to ${farmerForm.block} block coords`);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Admin / Officer form state
  const [officerForm, setOfficerForm] = useState({
    name: 'Dr. Debabrata Jena',
    phone: '+91 98610 99881',
    district: 'Mayurbhanj',
    designation: 'Senior Agriculture Officer',
    department: 'Department of Agriculture & Farmers Empowerment'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      if (role === 'farmer') {
        const cleanPhone = farmerForm.phone.replace(/\D/g, '').slice(-10);
        if (!cleanPhone || cleanPhone.length !== 10) {
          throw new Error('Please enter a valid 10-digit Indian mobile number.');
        }

        // 1. Transactional Atomic Registration in AWS RDS MySQL
        const farmerRes = await fetch('/api/farmer/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: farmerForm.name.trim(),
            mobileNumber: cleanPhone,
            password: 'Password123!',
            district: farmerForm.district,
            block: farmerForm.block,
            village: farmerForm.village,
            latitude: farmerForm.latitude,
            longitude: farmerForm.longitude,
            landArea: parseFloat(farmerForm.land_area) || 3.5,
            currentCrop: farmerForm.crop_name || 'Rice / Paddy',
            sowingDate: farmerForm.sowing_date || new Date().toISOString().split('T')[0],
            preferredLanguage: farmerForm.language || 'or',
          })
        });

        const resData = await farmerRes.json().catch(() => ({}));
        if (!farmerRes.ok) {
          throw new Error(resData?.error?.message || 'Failed to register farmer in AWS RDS.');
        }

        setSuccess(true);
        setTimeout(() => {
          router.push('/dashboard');
        }, 1200);

      } else if (role === 'admin') {
        const cleanPhone = officerForm.phone.replace(/\D/g, '').slice(-10);
        const adminRes = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: officerForm.name.trim(),
            mobileNumber: cleanPhone,
            email: `officer_${cleanPhone}@smartcrop.in`,
            password: 'Password123!',
            role: 'administrator',
            district: officerForm.district,
            metadata: {
              designation: officerForm.designation,
              department: officerForm.department
            }
          })
        });

        const adminData = await adminRes.json().catch(() => ({}));
        if (!adminRes.ok) {
          throw new Error(adminData?.error?.message || 'Failed to register officer profile.');
        }

        setSuccess(true);
        setTimeout(() => {
          router.push('/officer-dashboard');
        }, 1200);
      }
    } catch (err: any) {
      console.error('Onboarding submission error:', err);
      setErrorMessage(err.message || 'An unexpected error occurred during onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-zinc-900 to-emerald-950 text-white flex flex-col justify-center items-center p-4 sm:p-6 md:p-10">
      
      {/* Background ambient glowing spheres */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-3xl bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-black/60">
        
        {/* Header with Language Selector */}
        <div className="flex items-center justify-between mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Smart Crop Ecosystem Setup
          </div>
          <LanguageSelector variant="compact" />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {t('register_farmer', 'Complete Your Role Profile')}
          </h1>
          <p className="text-sm text-zinc-400 mt-2 max-w-md mx-auto">
            Your information is automatically synced to AWS RDS MySQL to personalize your intelligence portal and market data.
          </p>
        </div>

        {/* Role Selection Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          <button
            type="button"
            onClick={() => setRole('farmer')}
            className={`flex flex-col items-center text-center p-4 rounded-2xl border transition-all duration-200 ${
              role === 'farmer'
                ? 'bg-emerald-600/20 border-emerald-500 ring-2 ring-emerald-500/30 text-white'
                : 'bg-white/5 border-white/10 hover:bg-white/10 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <div className={`p-2.5 rounded-xl mb-2.5 ${role === 'farmer' ? 'bg-emerald-500 text-white' : 'bg-white/10 text-zinc-300'}`}>
              <Sprout className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold">{t('role_farmer', 'Farmer')}</span>
            <span className="text-xs text-zinc-400 mt-0.5">Crop, Farm & Mandi Advisory</span>
          </button>

          <button
            type="button"
            onClick={() => setRole('admin')}
            className={`flex flex-col items-center text-center p-4 rounded-2xl border transition-all duration-200 ${
              role === 'admin'
                ? 'bg-teal-600/20 border-teal-500 ring-2 ring-teal-500/30 text-white'
                : 'bg-white/5 border-white/10 hover:bg-white/10 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <div className={`p-2.5 rounded-xl mb-2.5 ${role === 'admin' ? 'bg-teal-500 text-white' : 'bg-white/10 text-zinc-300'}`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold">{t('role_officer', 'Agriculture Extension Officer')}</span>
            <span className="text-xs text-zinc-400 mt-0.5">District Distress Monitoring & Alerts</span>
          </button>
        </div>

        {/* Error Alert Message */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-200 text-sm flex items-start gap-3">
            <span className="text-red-400 font-bold">✕</span>
            <div className="flex-1">
              <p className="font-semibold text-red-100">Registration Failed</p>
              <p className="text-xs text-red-200/80 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Dynamic Form based on selected Role */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {role === 'farmer' && (
            <div className="space-y-4">
              <div className="border-b border-white/10 pb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Farmer Personal & Land Schema</span>
                <span className="text-xs text-zinc-400">AWS RDS: `farmers` + `crops`</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Full Name (name)</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      required
                      value={farmerForm.name}
                      onChange={e => setFarmerForm({ ...farmerForm, name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Phone Number (phone)</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      required
                      value={farmerForm.phone}
                      onChange={e => setFarmerForm({ ...farmerForm, phone: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">District</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      required
                      value={farmerForm.district}
                      onChange={e => setFarmerForm({ ...farmerForm, district: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Administrative Block</label>
                  <select
                    value={farmerForm.block}
                    onChange={(e) => {
                      const newBlock = e.target.value;
                      const coords = MAYURBHANJ_BLOCK_COORDS[newBlock] || [21.9324, 86.7351];
                      setFarmerForm({
                        ...farmerForm,
                        block: newBlock,
                        latitude: coords[0],
                        longitude: coords[1],
                      });
                    }}
                    className="w-full bg-zinc-800 border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                  >
                    <option value="Baripada">Baripada Block</option>
                    <option value="Betnoti">Betnoti Block</option>
                    <option value="Badasahi">Badasahi Block</option>
                    <option value="Kuliana">Kuliana Block</option>
                    <option value="Rairangpur">Rairangpur Block</option>
                    <option value="Udala">Udala Block</option>
                    <option value="Karanjia">Karanjia Block</option>
                    <option value="Jashipur">Jashipur Block</option>
                    <option value="Morada">Morada Block</option>
                    <option value="Samakhunta">Samakhunta Block</option>
                    <option value="Khunta">Khunta Block</option>
                    <option value="Bangriposi">Bangriposi Block</option>
                  </select>
                </div>

                <div className="sm:col-span-2 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">📍 Farm Geo-Location:</span>
                      <span className="text-xs font-mono text-white bg-black/40 px-2 py-0.5 rounded-md border border-white/10">
                        {farmerForm.latitude.toFixed(4)}° N, {farmerForm.longitude.toFixed(4)}° E
                      </span>
                    </div>
                    {gpsStatus && (
                      <p className="text-[11px] text-emerald-300 mt-1">{gpsStatus}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleDetectGPS}
                    disabled={gpsDetecting}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-95"
                  >
                    {gpsDetecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
                    <span>{gpsDetecting ? 'Locating...' : 'Detect Live Farm GPS'}</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Village / Gram Panchayat (village)</label>
                  <input
                    type="text"
                    required
                    value={farmerForm.village}
                    onChange={e => setFarmerForm({ ...farmerForm, village: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Total Land Area in Acres (land_area)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={farmerForm.land_area}
                    onChange={e => setFarmerForm({ ...farmerForm, land_area: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Active Loan Amount in ₹ (loan_amount)</label>
                  <input
                    type="number"
                    step="1000"
                    value={farmerForm.loan_amount}
                    onChange={e => setFarmerForm({ ...farmerForm, loan_amount: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Current Primary Crop (crops.name)</label>
                  <input
                    type="text"
                    required
                    value={farmerForm.crop_name}
                    onChange={e => setFarmerForm({ ...farmerForm, crop_name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Crop Stage (crops.stage)</label>
                  <select
                    value={farmerForm.crop_stage}
                    onChange={e => setFarmerForm({ ...farmerForm, crop_stage: e.target.value })}
                    className="w-full bg-zinc-800 border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                  >
                    <option value="Sowing & Germination">Sowing & Germination</option>
                    <option value="Vegetative - Tillering">Vegetative - Tillering</option>
                    <option value="Panicle Initiation / Flowering">Panicle Initiation / Flowering</option>
                    <option value="Grain Filling">Grain Filling</option>
                    <option value="Harvesting Ready">Harvesting Ready</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {role === 'admin' && (
            <div className="space-y-4">
              <div className="border-b border-white/10 pb-2">
                <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">Officer Credentials</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Officer Name</label>
                  <input
                    type="text"
                    required
                    value={officerForm.name}
                    onChange={e => setOfficerForm({ ...officerForm, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Official Phone</label>
                  <input
                    type="text"
                    required
                    value={officerForm.phone}
                    onChange={e => setOfficerForm({ ...officerForm, phone: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Jurisdiction District</label>
                  <input
                    type="text"
                    required
                    value={officerForm.district}
                    onChange={e => setOfficerForm({ ...officerForm, district: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Designation</label>
                  <input
                    type="text"
                    required
                    value={officerForm.designation}
                    onChange={e => setOfficerForm({ ...officerForm, designation: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || success}
            className={`w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl font-bold text-white shadow-lg transition-all duration-300 ${
              success
                ? 'bg-emerald-600'
                : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/25 active:scale-[0.99]'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Storing into AWS RDS MySQL...</span>
              </>
            ) : success ? (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Saved! Redirecting to your Dashboard...</span>
              </>
            ) : (
              <>
                <span>Save Profile & Enter Platform</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
