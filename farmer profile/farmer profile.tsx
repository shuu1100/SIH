"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  MapPin,
  Sprout,
  Layers,
  Activity,
  IndianRupee,
  Clock,
  Bell,
  ShieldCheck,
  Plus,
  Edit3,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Search,
  X,
  Home,
  Store,
  Check,
  LogOut
} from "lucide-react";
import { smartCropAuth } from "@/lib/smartcrop-auth";
import { useLanguage } from "@/lib/language-context";
import LanguageSelector from "@/components/LanguageSelector";

export default function FarmerProfilePage() {
  const { t } = useLanguage();
  // Master Farmer State (following PRD specs & mock data)
  const [farmer, setFarmer] = useState({
    name: "Ramesh",
    role: "Farmer & Landholder",
    village: "Demo Village",
    district: "Mayurbhanj",
    state: "Odisha",

    phone: "+91 98451 28210",
    maskedPhone: "+91 9XXXX XX210",
    landArea: "2.5 acres",
    currentCrop: "Paddy",
    sowingDate: "12 July 2026",
    cropStage: "Vegetative Stage",
    cropHealth: "Moderate Stress",
    healthStatus: "warning", // good | warning | critical
    loanAmount: "₹1,20,000",
    loanDueDate: "30 August 2026",
    loanDueInDays: 8,
    profileCompleteness: 85,
    farms: [
      { id: "1", name: "North Plot (Plot 01)", area: "1.8 acres", location: "Mayurbhanj Sector 4", crop: "Paddy (Swarna)", status: "Active" },
      { id: "2", name: "South Stream Plot", area: "0.7 acres", location: "Riverside Zone B", crop: "Mustard & Pulses", status: "Active" }
    ],
    notifications: {
      weather: true,
      risk: true,
      market: false,
      farming: true,
      officer: true
    }
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFarm, setExpandedFarm] = useState<string | null>(null);
  const router = useRouter();

  React.useEffect(() => {
    const timer = setTimeout(() => setShowSkeleton(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Load from DB API on mount
  React.useEffect(() => {
    setMounted(true);
    async function loadFarmerProfile() {
      try {
        const session = await smartCropAuth.getCurrentSession();
        const activeId = session?.id || 'FRM_47166869_622';

        const res = await fetch(`/api/farmer/${activeId}`);
        const f = await res.json();
        
        if (f && !f.error) {
          setFarmer(prev => ({
            ...prev,
            name: f.name || prev.name,
            phone: f.phone || prev.phone,
            maskedPhone: f.phone ? f.phone.slice(0, 5) + "XXXX" + f.phone.slice(-3) : prev.maskedPhone,
            village: f.village || prev.village,
            district: f.district || prev.district,
            state: f.state || prev.state,
            landArea: f.landArea ? `${f.landArea} acres` : prev.landArea,
            loanAmount: f.loans && f.loans.length > 0 ? `₹${Number(f.loans[0].loanAmount).toLocaleString('en-IN')}` : prev.loanAmount,
            loanDueDate: f.loans && f.loans.length > 0 ? new Date(f.loans[0].dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : prev.loanDueDate,
            farms: f.farms && f.farms.length > 0 ? f.farms.map((farm: any) => ({
              id: farm.id,
              name: farm.name,
              area: farm.area ? (String(farm.area).includes('acre') ? farm.area : `${farm.area} acres`) : "1.5 acres",
              location: `${farm.village || f.village || 'Baripada'}, ${farm.district || f.district || 'Mayurbhanj'}`,
              crop: farm.crops && farm.crops.length > 0 ? farm.crops[0].name : (farm.crop || "Paddy (Swarna)"),
              status: "Active"
            })) : prev.farms
          }));

          setEditFormData({
            name: f.name || 'Ramesh Kumar Patel',
            phone: f.phone || '9876543210',
            village: f.village || 'Baripada Rural',
            district: f.district || 'Mayurbhanj'
          });
        }
      } catch (e) {
        console.warn('Could not fetch farmer profile:', e);
      } finally {
        setLoading(false);
      }
    }
    loadFarmerProfile();
  }, []);

  // Edit Form State
  const [editFormData, setEditFormData] = useState({
    name: farmer.name,
    phone: farmer.phone,
    village: farmer.village,
    district: farmer.district
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };



  const handleNotificationToggle = (key: keyof typeof farmer.notifications) => {
    setFarmer(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key]
      }
    }));
    showToast("Farm parcel successfully registered!");
  };

  // Skeleton loader — shown while not yet mounted or still loading data
  if (!mounted || loading) {
    if (!showSkeleton) {
      return (
        <div className="relative min-h-screen w-full bg-[#e8ece9] text-[#1e2a22] font-sans antialiased overflow-x-hidden">
          <div
            className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center sm:bg-top bg-no-repeat opacity-95 transition-all duration-700"
            style={{ backgroundImage: `url('/farmer-bg.png')` }}
          />
          <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-white/60 via-white/20 to-black/35 backdrop-blur-[2px]" />
        </div>
      );
    }

    return (
      <div className="relative min-h-screen w-full bg-[#e8ece9] font-sans antialiased overflow-x-hidden">
        {/* Background shimmer */}
        <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-[#d4e4d8]/80 via-[#e8ece9]/60 to-[#c8dece]/70" />
        <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-white/50 via-white/10 to-black/20" />

        <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 space-y-6">

          {/* Navbar Skeleton */}
          <div className="w-full bg-white/70 backdrop-blur-xl border border-white/60 shadow rounded-full px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-200 animate-pulse" />
              <div className="flex flex-col gap-1">
                <div className="w-16 h-4 bg-gray-200 rounded animate-pulse" />
                <div className="w-20 h-2.5 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
            <div className="hidden md:flex gap-2">
              {[80, 64, 72, 60].map((w, i) => (
                <div key={i} className="h-7 rounded-full bg-gray-200 animate-pulse" style={{ width: w }} />
              ))}
            </div>
            <div className="flex gap-2">
              <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse" />
              <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse" />
              <div className="w-24 h-9 rounded-full bg-gray-200 animate-pulse" />
            </div>
          </div>

          {/* Hero Banner Skeleton */}
          <div className="rounded-3xl bg-white/75 backdrop-blur-2xl border border-white/80 shadow p-6 sm:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-8 space-y-4">
                <div className="w-48 h-6 bg-gray-200 rounded-full animate-pulse" />
                <div className="w-3/4 h-9 bg-gray-200 rounded-2xl animate-pulse" />
                <div className="w-full h-5 bg-gray-100 rounded animate-pulse" />
                <div className="w-4/5 h-5 bg-gray-100 rounded animate-pulse" />
                <div className="flex gap-3 pt-2">
                  <div className="w-36 h-10 rounded-full bg-gray-200 animate-pulse" />
                  <div className="w-40 h-10 rounded-full bg-gray-100 animate-pulse" />
                  <div className="w-28 h-10 rounded-full bg-red-100 animate-pulse" />
                </div>
              </div>
              <div className="lg:col-span-4">
                <div className="bg-gray-800/70 rounded-2xl p-5 space-y-3">
                  <div className="w-24 h-4 bg-gray-600 rounded animate-pulse" />
                  <div className="w-20 h-10 bg-gray-500 rounded animate-pulse" />
                  <div className="w-full h-2 bg-gray-600 rounded-full animate-pulse" />
                </div>
              </div>
            </div>
            {/* Metrics bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-black/5">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white/80 border border-black/5 rounded-2xl p-3.5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gray-200 animate-pulse" />
                  <div className="space-y-1.5">
                    <div className="w-14 h-3 bg-gray-100 rounded animate-pulse" />
                    <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Two column content skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left column */}
            <div className="space-y-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white/80 backdrop-blur-xl border border-white/90 rounded-3xl p-6 shadow space-y-4">
                  <div className="flex items-center gap-2.5 pb-4 border-b border-black/5">
                    <div className="w-8 h-8 rounded-lg bg-gray-200 animate-pulse" />
                    <div className="space-y-1.5">
                      <div className="w-36 h-4 bg-gray-200 rounded animate-pulse" />
                      <div className="w-24 h-3 bg-gray-100 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map(j => (
                      <div key={j} className="bg-white/60 p-3 rounded-2xl border border-black/5 space-y-1.5">
                        <div className="w-16 h-3 bg-gray-100 rounded animate-pulse" />
                        <div className="w-24 h-4 bg-gray-200 rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {/* Right column */}
            <div className="space-y-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white/80 backdrop-blur-xl border border-white/90 rounded-3xl p-6 shadow space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b border-black/5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gray-200 animate-pulse" />
                      <div className="space-y-1.5">
                        <div className="w-40 h-4 bg-gray-200 rounded animate-pulse" />
                        <div className="w-28 h-3 bg-gray-100 rounded animate-pulse" />
                      </div>
                    </div>
                    <div className="w-20 h-6 rounded-full bg-gray-100 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    {[1, 2, 3].map(j => (
                      <div key={j} className="h-12 rounded-2xl bg-gray-100 animate-pulse" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile bottom nav skeleton */}
        <div className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-xl border-t border-black/10 py-2 px-6 flex justify-around items-center z-40 md:hidden">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="w-5 h-5 rounded bg-gray-200 animate-pulse" />
              <div className="w-8 h-2.5 rounded bg-gray-100 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const handleAddFarm = async () => {
    try {
      const session = await smartCropAuth.getCurrentSession();
      const farmerId = session?.id || 'FRM_47166869_622';
      const farmName = `East Basin Plot (Plot 0${farmer.farms.length + 1})`;

      const res = await fetch(`/api/farmer/${farmerId}/farms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: farmName,
          area: 1.2,
          soilType: 'Red Loamy',
          village: farmer.village || 'Baripada',
          district: farmer.district || 'Mayurbhanj',
          latitude: 21.9324,
          longitude: 86.7351
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || 'Failed to save farm to AWS RDS database.');
      }

      const savedFarm = await res.json();
      const newFarm = {
        id: savedFarm?.id || String(farmer.farms.length + 1),
        name: farmName,
        area: "1.2 acres",
        location: `${farmer.village}, ${farmer.district}`,
        crop: "Groundnut",
        status: "Active"
      };

      setFarmer(prev => ({
        ...prev,
        farms: [...prev.farms, newFarm],
        profileCompleteness: Math.min(100, prev.profileCompleteness + 5)
      }));

      showToast("New farm plot added and saved to AWS RDS!");
    } catch (err: any) {
      console.error('Failed to add farm:', err);
      showToast(err.message || "Failed to add farm. Please try again.");
    }
  };

  const openEditModal = () => {
    setEditFormData({
      name: farmer.name,
      phone: farmer.phone,
      village: farmer.village,
      district: farmer.district
    });
    setErrors({});
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!editFormData.name.trim()) newErrors.name = "Name cannot be empty";
    if (!editFormData.village.trim()) newErrors.village = "Village cannot be empty";
    if (!editFormData.district.trim()) newErrors.district = "District cannot be empty";
    if (!editFormData.phone.trim() || editFormData.phone.length < 10) newErrors.phone = "Enter a valid 10-digit phone number";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const masked = editFormData.phone.length >= 10
      ? editFormData.phone.slice(0, 5) + "XXXX" + editFormData.phone.slice(-3)
      : editFormData.phone;

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editFormData.name.trim(),
          phone: editFormData.phone.trim(),
          village: editFormData.village.trim(),
          district: editFormData.district.trim(),
        })
      });

      const resData = await res.json().catch(() => ({}));
      if (!res.ok || !resData?.success) {
        throw new Error(resData?.error || 'Failed to save profile changes to AWS RDS.');
      }

      setFarmer(prev => ({
        ...prev,
        name: editFormData.name,
        phone: editFormData.phone,
        maskedPhone: masked,
        village: editFormData.village,
        district: editFormData.district
      }));

      setIsEditModalOpen(false);
      showToast("Profile details updated and saved to AWS RDS MySQL!");
    } catch (err: any) {
      console.error('Sync to database failed:', err);
      showToast(err.message || 'Failed to save profile changes to database.');
    }
  };

  const handleSignOut = async () => {
    try {
      await smartCropAuth.signOut();
    } catch {
      // ignore
    }
    router.push("/authentication");
  };

  return (
    <div className="relative min-h-screen w-full bg-[#e8ece9] text-[#1e2a22] font-sans antialiased overflow-x-hidden selection:bg-[#d8e678] selection:text-black">
      {/* Dynamic Background Image with Theme Tint Overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center sm:bg-top bg-no-repeat opacity-95 transition-all duration-700"
        style={{ backgroundImage: `url('/farmer-bg.png')` }}
      />

      {/* Atmospheric Glass/Gradient Vignette tuned for BG_2.png */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-white/60 via-white/20 to-black/35 backdrop-blur-[2px]" />

      {/* Main Glass Shell Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28">

        {/* TOP NAVBAR (Exact match to Hecta aesthetic from reference image) */}
        <header className="w-full bg-white/75 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.06)] rounded-full px-5 py-3.5 mb-6 flex items-center justify-between transition-all">
          <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-90 transition">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#1f3d2b] to-[#2f6b3c] flex items-center justify-center text-[#d8e678] shadow-md shadow-emerald-950/20">
              <Sprout className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight text-[#16271c]">hect<span className="text-[#3b7c4a]">a</span></span>
              <span className="text-[9px] uppercase tracking-widest text-[#7a8b6f] font-semibold -mt-1">Smart Crop</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 bg-black/5 p-1 rounded-full border border-black/5 text-xs font-medium">
            <Link
              href="/crop-monitoring"
              className="px-4 py-1.5 rounded-full transition-all duration-200 flex items-center gap-1.5 text-[#3f5245] hover:text-black hover:bg-white/50"
            >
              {t('monitoring', 'Crop Monitor')}
            </Link>
            <Link
              href="/market"
              className="px-4 py-1.5 rounded-full transition-all duration-200 flex items-center gap-1.5 text-[#3f5245] hover:text-black hover:bg-white/50"
            >
              {t('market_prices', 'Market')}
            </Link>
            <Link
              href="/schemes"
              className="px-4 py-1.5 rounded-full transition-all duration-200 flex items-center gap-1.5 text-[#3f5245] hover:text-black hover:bg-white/50"
            >
              {t('schemes', 'Govt Schemes')}
            </Link>
            <Link
              href="/farmer-profile"
              className="px-4 py-1.5 rounded-full transition-all duration-200 flex items-center gap-1.5 bg-[#1c2e22] text-white shadow-sm font-semibold"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[#d8e678]" />
              {t('farmer_profile', 'Profile')}
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search Button + Dropdown */}
            <div className="relative">
              <button
                onClick={() => setSearchOpen(o => !o)}
                className="w-9 h-9 rounded-full bg-white/90 hover:bg-white border border-black/5 flex items-center justify-center text-gray-700 shadow-sm transition hover:scale-105"
              >
                <Search className="w-4 h-4" />
              </button>
              {searchOpen && (
                <div className="absolute right-0 top-11 w-64 bg-white/95 backdrop-blur-xl border border-black/10 rounded-2xl shadow-xl p-3 z-50">
                  <div className="flex items-center gap-2 border-b border-black/5 pb-2">
                    <Search className="w-4 h-4 text-gray-400 shrink-0" />
                    <input
                      autoFocus
                      type="text"
                      placeholder={t('search_placeholder', 'Search farms, crops...')}
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400 text-[#1e2a22]"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery("")} className="text-gray-400 hover:text-black">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="mt-2 space-y-1">
                    {farmer.farms
                      .filter(f =>
                        !searchQuery ||
                        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        f.crop.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        f.location.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map(f => (
                        <button
                          key={f.id}
                          onClick={() => { setExpandedFarm(f.id); setSearchOpen(false); setSearchQuery(""); }}
                          className="w-full text-left px-2 py-1.5 rounded-xl hover:bg-black/5 transition"
                        >
                          <p className="text-xs font-semibold text-[#1e2a22]">{f.name}</p>
                          <p className="text-[11px] text-gray-500">{f.crop} · {f.location}</p>
                        </button>
                      ))
                    }
                    {searchQuery && farmer.farms.filter(f =>
                      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      f.crop.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      f.location.toLowerCase().includes(searchQuery.toLowerCase())
                    ).length === 0 && (
                      <p className="text-xs text-gray-400 px-2 py-1">{t('no_farms_found', 'No farms found')}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            {/* Bell → Notifications Page */}
            <button
              onClick={() => router.push('/notifications')}
              className="w-9 h-9 rounded-full bg-white/90 hover:bg-white border border-black/5 flex items-center justify-center text-gray-700 shadow-sm transition hover:scale-105 relative"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#d8e678] border border-black/20 rounded-full" />
            </button>
            <LanguageSelector variant="compact" />
            <div
              onClick={openEditModal}
              className="flex items-center gap-2 pl-2 pr-3 py-1 bg-black/5 hover:bg-black/10 border border-black/5 rounded-full cursor-pointer transition"
            >
              <div className="w-7 h-7 rounded-full bg-[#1f3d2b] text-[#d8e678] font-bold text-xs flex items-center justify-center border border-white/50">
                {farmer.name.charAt(0)}
              </div>
              <span className="text-xs font-semibold hidden sm:inline text-[#1f3d2b]">{farmer.name}</span>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleSignOut}
              title="Sign Out to Authentication"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold shadow-sm transition hover:scale-105 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('logout', 'Logout')}</span>
            </button>
          </div>
        </header>

        {/* HERO SECTION / BANNER (Hecta Drone Precision Card Style) */}
        <div className="relative rounded-3xl overflow-hidden bg-white/75 backdrop-blur-2xl border border-white/80 shadow-[0_12px_40px_rgba(31,61,43,0.08)] p-6 sm:p-8 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">

            {/* Main Headline & Intro */}
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1f3d2b]/10 border border-[#1f3d2b]/15 text-[#1f3d2b] text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-[#3b7c4a]" />
                <span>{t('smart_crop_dashboard', 'Smart Crop Precision Dashboard')}</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#16271c] leading-[1.2]">
                {t('farmer_profile_title', 'Farmer Profile & Precision Farm Intelligence')}
              </h1>

              <p className="text-sm sm:text-base text-[#4a5f51] max-w-2xl leading-relaxed">
                {t('empowering', 'Empowering')} <span className="font-semibold text-black">{farmer.name}</span> {t('with_telemetry', 'with automated crop telemetry, real-time stress surveillance, drone soil scanning, and multilingual advisories.')}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={openEditModal}
                  className="px-5 py-2.5 rounded-full bg-[#1c2e22] hover:bg-[#2a4533] text-[#d8e678] font-medium text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-black/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>{t('edit_profile_details', 'Edit Profile Details')}</span>
                </button>

                <button
                  onClick={handleAddFarm}
                  className="px-5 py-2.5 rounded-full bg-white/90 hover:bg-white text-[#1f3d2b] border border-[#1f3d2b]/20 font-medium text-xs sm:text-sm flex items-center gap-2 shadow-sm transition hover:scale-[1.02]"
                >
                  <Plus className="w-4 h-4 text-[#3b7c4a]" />
                  <span>{t('add_plot', 'Add Another Plot / Farm')}</span>
                </button>

                <button
                  onClick={handleSignOut}
                  className="px-5 py-2.5 rounded-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-medium text-xs sm:text-sm flex items-center gap-2 shadow-sm transition hover:scale-[1.02] cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-red-600" />
                  <span>{t('sign_out', 'Sign Out')}</span>
                </button>
              </div>
            </div>

            {/* Profile Completeness Pill / Score Card */}
            <div className="lg:col-span-4 flex flex-col justify-center">
              <div className="bg-gradient-to-br from-[#1c2e22] to-[#122017] text-white rounded-2xl p-5 border border-white/10 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#d8e678]/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-[#9bb3a1] font-semibold">{t('profile_accuracy', 'Profile Accuracy')}</span>
                    <h3 className="text-3xl font-black text-white mt-0.5 tracking-tight">{farmer.profileCompleteness}%</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#d8e678] text-black flex items-center justify-center font-bold shadow-md">
                    <ShieldCheck className="w-5 h-5 text-[#1c2e22]" />
                  </div>
                </div>

                <p className="text-xs text-[#a6bdaf] leading-snug mb-3">
                  {t('accuracy_unlocks', 'High completeness unlocks targeted drone scanning & state subsidy qualification.')}
                </p>

                {/* Progress Bar */}
                <div className="w-full bg-white/15 h-2 rounded-full overflow-hidden p-0.5">
                  <div
                    className="bg-gradient-to-r from-[#8be058] to-[#d8e678] h-full rounded-full transition-all duration-1000 shadow-sm"
                    style={{ width: `${farmer.profileCompleteness}%` }}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-[#8ea494]">
                  <span>{t('village_label', 'Village:')} {farmer.village}</span>
                  <span className="text-[#d8e678] font-semibold">{t('verified', 'Verified')}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Quick Metrics Bar (matching bottom badges from reference design) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-black/5">
            <div className="bg-white/80 border border-black/5 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#eef5e6] text-[#2f6b3c] flex items-center justify-center font-bold text-sm">
                {farmer.farms.length}
              </div>
              <div>
                <p className="text-[11px] text-[#7a8b6f] font-medium leading-none">{t("registered", "Registered")}</p>
                <p className="text-xs sm:text-sm font-bold text-[#1e2a22]">{t("total_plots", "Total Plots")}</p>
              </div>
            </div>

            <div className="bg-white/80 border border-black/5 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#eef5e6] text-[#2f6b3c] flex items-center justify-center font-bold text-sm">
                {farmer.landArea.split(" ")[0]}
              </div>
              <div>
                <p className="text-[11px] text-[#7a8b6f] font-medium leading-none">{t("acreage", "Acreage")}</p>
                <p className="text-xs sm:text-sm font-bold text-[#1e2a22]">{farmer.landArea}</p>
              </div>
            </div>

            <div className="bg-white/80 border border-black/5 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#fef8e7] text-[#c97a1e] flex items-center justify-center font-bold text-sm">
                🌾
              </div>
              <div>
                <p className="text-[11px] text-[#7a8b6f] font-medium leading-none">{t("current_crop", "Current Crop")}</p>
                <p className="text-xs sm:text-sm font-bold text-[#1e2a22]">{farmer.currentCrop}</p>
              </div>
            </div>

            <div className="bg-white/80 border border-black/5 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#fbf0ee] text-[#c0473b] flex items-center justify-center font-bold text-sm">
                {farmer.loanDueInDays}d
              </div>
              <div>
                <p className="text-[11px] text-[#7a8b6f] font-medium leading-none">{t("due_in", "Due In")}</p>
                <p className="text-xs sm:text-sm font-bold text-[#1e2a22]">{t("credit_window", "Credit Window")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* TWO COLUMN CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* LEFT COLUMN: WHO & WHERE (Personal & Farm info) */}
          <div className="space-y-6">

            {/* 1. PERSONAL INFORMATION CARD */}
            <div className="bg-white/80 backdrop-blur-xl border border-white/90 rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-md transition">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-black/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#1f3d2b]/10 text-[#1f3d2b] flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#16271c]">{t("personal_information", "Personal Information")}</h2>
                    <p className="text-xs text-[#7a8b6f]">{t("primary_contact_kyc", "Primary contact and KYC record")}</p>
                  </div>
                </div>
                <button
                  onClick={openEditModal}
                  className="p-1.5 hover:bg-black/5 rounded-lg text-[#2f6b3c] transition text-xs font-semibold flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{t("edit", "Edit")}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm">
                <div className="bg-white/60 p-3 rounded-2xl border border-black/5">
                  <span className="text-[11px] text-[#7a8b6f] block font-medium">{t("full_name", "Full Name")}</span>
                  <span className="font-semibold text-[#1e2a22] mt-0.5 block">{farmer.name}</span>
                </div>

                <div className="bg-white/60 p-3 rounded-2xl border border-black/5">
                  <span className="text-[11px] text-[#7a8b6f] block font-medium">{t("contact_phone", "Contact Phone")}</span>
                  <span className="font-semibold text-[#1e2a22] mt-0.5 block font-mono">{farmer.maskedPhone}</span>
                </div>

                <div className="bg-white/60 p-3 rounded-2xl border border-black/5">
                  <span className="text-[11px] text-[#7a8b6f] block font-medium">{t("village", "Village")}</span>
                  <span className="font-semibold text-[#1e2a22] mt-0.5 block">{farmer.village}</span>
                </div>

                <div className="bg-white/60 p-3 rounded-2xl border border-black/5">
                  <span className="text-[11px] text-[#7a8b6f] block font-medium">{t("district_state", "District & State")}</span>
                  <span className="font-semibold text-[#1e2a22] mt-0.5 block">{farmer.district}, {farmer.state}</span>
                </div>
              </div>
            </div>

            {/* 2. MY FARMS (Multi-plot Management) */}
            <div className="bg-white/80 backdrop-blur-xl border border-white/90 rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-black/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#2f6b3c]/10 text-[#2f6b3c] flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#16271c]">{t("my_registered_farms", "My Registered Farms")}</h2>
                    <p className="text-xs text-[#7a8b6f]">{t("agricultural_parcels_desc", "Agricultural parcels linked to Smart Crop")}</p>
                  </div>
                </div>
                <button
                  onClick={handleAddFarm}
                  className="px-3 py-1 bg-[#1f3d2b] hover:bg-[#2f6b3c] text-white text-xs font-semibold rounded-full flex items-center gap-1 transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>{t("add_farm", "Add Farm")}</span>
                </button>
              </div>

              <div className="space-y-3">
                {farmer.farms.map((farm, idx) => (
                  <div key={farm.id} className="rounded-2xl bg-white/70 border border-black/5 shadow-sm overflow-hidden transition-all">
                    {/* Clickable header row */}
                    <button
                      onClick={() => setExpandedFarm(expandedFarm === farm.id ? null : farm.id)}
                      className="w-full p-4 flex items-center justify-between group hover:bg-white transition text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#f2f6ee] text-[#1f3d2b] flex items-center justify-center font-bold text-sm border border-black/5">
                          0{idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-[#1e2a22]">{farm.name}</h4>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                              {farm.area}
                            </span>
                          </div>
                          <p className="text-xs text-[#7a8b6f] mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {farm.location} • <span className="text-[#2f6b3c] font-medium">{farm.crop}</span>
                          </p>
                        </div>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 transition-transform duration-300 ${expandedFarm === farm.id ? 'rotate-90 text-[#2f6b3c]' : 'text-gray-400 group-hover:text-black'}`}
                      />
                    </button>
                    {/* Expanded details panel */}
                    {expandedFarm === farm.id && (
                      <div className="px-4 pb-4 pt-1 border-t border-black/5 grid grid-cols-2 sm:grid-cols-3 gap-3 animate-in slide-in-from-top-2 duration-200">
                        <div className="p-3 bg-[#f2f6ee] rounded-xl">
                          <p className="text-[11px] text-[#7a8b6f] mb-0.5">{t("total_area", "Total Area")}</p>
                          <p className="text-sm font-bold text-[#1e2a22]">{farm.area}</p>
                        </div>
                        <div className="p-3 bg-[#f2f6ee] rounded-xl">
                          <p className="text-[11px] text-[#7a8b6f] mb-0.5">{t("current_crop", "Current Crop")}</p>
                          <p className="text-sm font-bold text-[#2f6b3c]">{farm.crop}</p>
                        </div>
                        <div className="p-3 bg-[#f2f6ee] rounded-xl">
                          <p className="text-[11px] text-[#7a8b6f] mb-0.5">{t("location", "Location")}</p>
                          <p className="text-sm font-bold text-[#1e2a22]">{farm.location}</p>
                        </div>
                        <div className="p-3 bg-[#f2f6ee] rounded-xl">
                          <p className="text-[11px] text-[#7a8b6f] mb-0.5">{t("status", "Status")}</p>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">{farm.status}</span>
                        </div>
                        <div className="col-span-2 p-3 bg-[#fffbea] rounded-xl border border-yellow-100">
                          <p className="text-[11px] text-[#7a8b6f] mb-0.5">{t("farm_id", "Farm ID")}</p>
                          <p className="text-xs font-mono text-[#1e2a22]">FARM-{farm.id.toString().padStart(4, "0")}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 3. FARM SPECIFICATIONS */}
            <div className="bg-white/80 backdrop-blur-xl border border-white/90 rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-black/5">
                <div className="w-8 h-8 rounded-lg bg-[#d8e678]/40 text-[#1f3d2b] flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#16271c]">{t("land_soil_telemetry", "Land & Soil Telemetry")}</h2>
                  <p className="text-xs text-[#7a8b6f]">{t("drone_calibrated_desc", "Drone calibrated geographic parameters")}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white/60 rounded-xl border border-black/5">
                  <span className="text-[11px] text-[#7a8b6f] block">{t("total_operational_land", "Total Operational Land")}</span>
                  <span className="font-bold text-[#1e2a22] text-sm mt-0.5 block">{farmer.landArea}</span>
                </div>
                <div className="p-3 bg-white/60 rounded-xl border border-black/5">
                  <span className="text-[11px] text-[#7a8b6f] block">{t("irrigation_access", "Irrigation Access")}</span>
                  <span className="font-bold text-[#1e2a22] text-sm mt-0.5 block">{t("canal_tubewell", "Canal + Tubewell")}</span>
                </div>
                <div className="p-3 bg-white/60 rounded-xl border border-black/5">
                  <span className="text-[11px] text-[#7a8b6f] block">{t("soil_classification", "Soil Classification")}</span>
                  <span className="font-bold text-[#1e2a22] text-sm mt-0.5 block">{t("alluvial_sandy_loam", "Alluvial Sandy Loam")}</span>
                </div>
                <div className="p-3 bg-white/60 rounded-xl border border-black/5">
                  <span className="text-[11px] text-[#7a8b6f] block">{t("drone_scan_status", "Drone Scan Status")}</span>
                  <span className="font-bold text-emerald-700 text-sm mt-0.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Calibrated
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: WHAT & HOW (Crop, Loan, Language, Alerts) */}
          <div className="space-y-6">

            {/* 4. CURRENT CROP CARD (Highlight) */}
            <div className="bg-white/85 backdrop-blur-xl border border-white/90 rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] relative overflow-hidden">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-black/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center text-base">
                    🌾
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#16271c]">{t("current_crop_lifecycle", "Current Crop Lifecycle")}</h2>
                    <p className="text-xs text-[#7a8b6f]">{t("active_season_telemetry", "Active season telemetry")}</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-semibold text-xs flex items-center gap-1">
                  <Activity className="w-3 h-3 text-amber-700" />
                  {farmer.cropHealth}
                </span>
              </div>

              <div className="bg-gradient-to-r from-[#f7f9f4] to-[#eef4ea] p-4 rounded-2xl border border-[#d2e3ca] mb-4">
                {/* CURRENT label — PRD §15 */}
                <div className="inline-flex items-center gap-1.5 mb-2 px-2 py-0.5 rounded-full bg-emerald-700/10 border border-emerald-700/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">{t("current_kharif_2026", "Current — Kharif 2026")}</span>
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-extrabold text-[#16271c]">{farmer.currentCrop} (Swarna Sub-1)</h3>
                    <p className="text-xs text-[#526a57] mt-0.5">Farm 01 • Sown: {farmer.sowingDate} • Stage: {farmer.cropStage}</p>
                  </div>
                  <button
                    onClick={() => router.push('/crop-details')}
                    className="px-3 py-1.5 bg-[#1c2e22] text-[#d8e678] text-xs font-semibold rounded-xl flex items-center gap-1 hover:bg-black transition shadow-sm"
                  >
                    <span>{t("view_crop", "View Crop")}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                <div className="mt-4 pt-3 border-t border-black/5 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-[#7a8b6f] block">{t("vegetative_days", "Vegetative Days")}</span>
                    <span className="font-bold text-[#1e2a22]">{t("days_count", "{count} Days", { count: 42 })}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#7a8b6f] block">{t("moisture_index", "Moisture Index")}</span>
                    <span className="font-bold text-amber-700">{t("moisture_low", "68% (Low)")}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#7a8b6f] block">{t("pest_risk", "Pest Risk")}</span>
                    <span className="font-bold text-emerald-700">{t("low_risk", "Low Risk")}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. FINANCIAL INFORMATION & DISTRESS MONITOR */}
            <div className="bg-white/80 backdrop-blur-xl border border-white/90 rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-black/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center">
                    <IndianRupee className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#16271c]">{t("financial_context_credit", "Financial Context & Credit")}</h2>
                    <p className="text-xs text-[#7a8b6f]">{t("kcc_agri_credit_desc", "KCC & Agricultural credit window")}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#c97a1e] bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {t("due_in_days", "Due in {days} days", { days: farmer.loanDueInDays })}
                </span>
              </div>

              <div className="p-4 bg-white/60 rounded-2xl border border-black/5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[#7a8b6f]">{t("kcc_active_balance", "KCC Active Balance")}</span>
                  <span className="text-lg font-extrabold text-[#16271c] font-mono">{farmer.loanAmount}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#7a8b6f]">{t("repayment_due_date", "Repayment Due Date")}</span>
                  <span className="font-semibold text-[#1e2a22]">{farmer.loanDueDate}</span>
                </div>
                <div className="pt-2 border-t border-black/5 flex items-center justify-between text-xs text-[#5a7260]">
                  <span>{t("distress_shield_status", "Distress Shield Status:")}</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {t("advisory_support_eligible", "Advisory Support Eligible")}
                  </span>
                </div>
              </div>
            </div>

            {/* 5.5 INSURANCE SUMMARY — PRD §17 */}
            <div className="bg-white/80 backdrop-blur-xl border border-white/90 rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-black/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100/50 text-emerald-900 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#16271c]">{t("insurance", "Insurance")}</h2>
                    <p className="text-xs text-[#7a8b6f]">{t("current_protection_status", "Current protection status")}</p>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200" aria-label="Insurance status: Not Registered">{t("not_registered", "Not Registered")}</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-black/5">
                  <span className="text-[#7a8b6f]">{t("crop", "Crop")}</span>
                  <span className="font-bold text-[#16271c]">{farmer.currentCrop}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-black/5">
                  <span className="text-[#7a8b6f]">{t("farm", "Farm")}</span>
                  <span className="font-bold text-[#16271c]">{farmer.farms[0]?.name ?? 'Farm 01'}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-[#7a8b6f]">{t("area", "Area")}</span>
                  <span className="font-bold text-[#16271c]">{farmer.landArea}</span>
                </div>
              </div>
              <div className="pt-4 flex flex-col gap-2">
                <p className="text-[11px] text-center text-[#5a7260]">{t('explore_schemes_text', 'Explore matching government schemes & subsidies.')}</p>
                <Link href="/schemes" className="w-full text-center px-4 py-2.5 bg-[#1c2e22] text-[#d8e678] font-bold text-xs rounded-xl shadow-sm hover:bg-[#2a4533] transition">
                  {t('view_schemes', 'View Schemes →')}
                </Link>
              </div>
            </div>



            {/* 7. NOTIFICATION PREFERENCES */}
            <div className="bg-white/80 backdrop-blur-xl border border-white/90 rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-black/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-900 flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#16271c]">{t("alert_channels", "Alert Channels & Notifications")}</h2>
                    <p className="text-xs text-[#7a8b6f]">{t("select_channels_desc", "Select channels for automated advisories")}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                {[
                  { key: "weather", title: t("alert_weather_title", "Weather & Rain Alerts"), desc: t("alert_weather_desc", "Heavy rain, storm & frost warnings") },
                  { key: "risk", title: t("alert_risk_title", "Pest & Crop Stress Alerts"), desc: t("alert_risk_desc", "Drone spectral pest detection") },
                  { key: "market", title: t("alert_market_title", "Mandi Price Changes"), desc: t("alert_market_desc", "Daily district price updates") },
                  { key: "farming", title: t("alert_farming_title", "Farming Calendar Reminders"), desc: t("alert_farming_desc", "Sowing, fertilizer & harvesting dates") },
                  { key: "officer", title: t("alert_officer_title", "Agriculture Officer Updates"), desc: t("alert_officer_desc", "Direct messages from block officer") }
                ].map(item => {
                  const enabled = farmer.notifications[item.key as keyof typeof farmer.notifications];
                  return (
                    <div
                      key={item.key}
                      onClick={() => handleNotificationToggle(item.key as keyof typeof farmer.notifications)}
                      className="p-3 bg-white/60 hover:bg-white rounded-2xl border border-black/5 flex items-center justify-between cursor-pointer transition"
                    >
                      <div>
                        <span className="font-semibold text-[#1e2a22] block">{item.title}</span>
                        <span className="text-[11px] text-[#7a8b6f]">{item.desc}</span>
                      </div>
                      {/* Accessible toggle — PRD §19: not color-alone */}
                      <div className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${enabled ? "bg-[#2f6b3c]" : "bg-gray-300"}`} role="switch" aria-checked={enabled} aria-label={item.title}>
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${enabled ? "translate-x-4" : "translate-x-0"}`} />
                      </div>
                      <span className={`text-[10px] font-bold ml-1 w-6 text-center ${enabled ? 'text-emerald-700' : 'text-gray-400'}`}>{enabled ? 'ON' : 'OFF'}</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* FLOATING TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-20 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#1c2e22] text-[#d8e678] px-5 py-2.5 rounded-full shadow-2xl border border-white/20 flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom-4 duration-200">
          <Check className="w-4 h-4 text-[#8be058]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* EDIT PROFILE MODAL / BOTTOM SHEET */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-white/80 relative space-y-4">

            <div className="flex items-center justify-between pb-3 border-b border-black/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#1f3d2b] text-[#d8e678] flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#16271c]">{t("edit_profile_details", "Edit Profile Details")}</h3>
                  <p className="text-xs text-[#7a8b6f]">{t("update_personal_contact", "Update your personal & contact records")}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">{t("full_name", "Full Name")}</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2f6b3c]"
                  placeholder={t("enter_full_name", "Enter full name")}
                />
                {errors.name && <p className="text-red-500 text-[11px] mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">{t("phone_number_label", "Phone Number (10 digits)")}</label>
                <input
                  type="text"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2f6b3c]"
                  placeholder={t("phone_placeholder", "+91 9XXXXXXXXX")}
                />
                {errors.phone && <p className="text-red-500 text-[11px] mt-1">{errors.phone}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">{t("village", "Village")}</label>
                  <input
                    type="text"
                    value={editFormData.village}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, village: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2f6b3c]"
                    placeholder={t("village_placeholder", "Village")}
                  />
                  {errors.village && <p className="text-red-500 text-[11px] mt-1">{errors.village}</p>}
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">{t("district_label", "District")}</label>
                  <input
                    type="text"
                    value={editFormData.district}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, district: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2f6b3c]"
                    placeholder={t("district_placeholder", "District")}
                  />
                  {errors.district && <p className="text-red-500 text-[11px] mt-1">{errors.district}</p>}
                </div>
              </div>



              <div className="flex items-center justify-end gap-2 pt-4 border-t border-black/10">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#1c2e22] hover:bg-[#2a4533] text-[#d8e678] font-bold shadow-md transition"
                >
                  Save Changes
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-xl border-t border-black/10 py-2 px-6 flex justify-around items-center z-40 md:hidden shadow-lg">
        <Link href="/dashboard" className="flex flex-col items-center gap-1 text-gray-500 hover:text-[#1f3d2b]">
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-medium">{t("home", "Home")}</span>
        </Link>
        <Link href="/crop-monitoring" className="flex flex-col items-center gap-1 text-gray-500 hover:text-[#1f3d2b]">
          <Sprout className="w-5 h-5" />
          <span className="text-[10px] font-medium">{t("crop", "Crop")}</span>
        </Link>
        <Link href="/schemes" className="flex flex-col items-center gap-1 text-gray-500 hover:text-[#1f3d2b]">
          <ShieldCheck className="w-5 h-5" />
          <span className="text-[10px] font-medium">{t('schemes', 'Schemes')}</span>
        </Link>
        <Link href="/market" className="flex flex-col items-center gap-1 text-gray-500 hover:text-[#1f3d2b]">
          <Store className="w-5 h-5" />
          <span className="text-[10px] font-medium">{t("market", "Market")}</span>
        </Link>
        <Link href="/farmer-profile" className="flex flex-col items-center gap-1 text-[#1f3d2b] font-bold">
          <User className="w-5 h-5 text-[#2f6b3c]" />
          <span className="text-[10px]">{t("profile", "Profile")}</span>
        </Link>
      </div>

    </div>
  );
}