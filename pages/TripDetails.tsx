
import React, { useState, useEffect } from 'react';
import { Trip, TripParticipant, Expense, MasterParticipant } from '../types';
import { fetchMasterParticipants } from '../services/csvService';
import { MASTER_PARTICIPANTS_URL } from '../constants';
import { PaymentModal } from '../components/PaymentModal';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { AddParticipantModal } from '../components/AddParticipantModal';
import { ArrowRight, Plus, Receipt, Search, Trash2, CheckCircle2, UserPlus, Landmark, Filter, XCircle, Check, X, HeartHandshake, Share } from 'lucide-react';
import { PieChart as RePie, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend } from 'recharts';

interface TripDetailsProps {
  trip: Trip;
  onUpdateTrip: (updatedTrip: Trip) => void;
  onBack: () => void;
}

interface Transfer {
    targetId: string;
    amount: number;
}

type FilterStatus = 'ALL' | 'PAID' | 'UNPAID' | 'SURPLUS';

export const TripDetails: React.FC<TripDetailsProps> = ({ trip, onUpdateTrip, onBack }) => {
  const [activeTab, setActiveTab] = useState<'participants' | 'expenses' | 'stats'>('participants');
  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
  const [isExpenseModalOpen, setExpenseModalOpen] = useState(false);
  const [isAddParticipantModalOpen, setAddParticipantModalOpen] = useState(false);
  const [addParticipantMode, setAddParticipantMode] = useState<'participant' | 'support'>('participant');
  
  const [selectedParticipant, setSelectedParticipant] = useState<TripParticipant | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  
  // Expense Delete State
  const [expenseDeleteId, setExpenseDeleteId] = useState<string | null>(null);

  const [masterParticipants, setMasterParticipants] = useState<MasterParticipant[]>([]);

  useEffect(() => {
    fetchMasterParticipants(MASTER_PARTICIPANTS_URL).then(setMasterParticipants).catch(console.error);
  }, []);

  // --- Logic ---

  const handleAddParticipants = (newParticipantsData: { name: string; type: string; fee: number; paidAmount?: number; paymentMethod?: string; isNew: boolean; id?: string }[]) => {
      const newEntries: TripParticipant[] = newParticipantsData.map(p => ({
          id: p.id || `custom_${Date.now()}_${Math.random()}`,
          name: p.name,
          type: p.type,
          fee: p.fee,
          paidAmount: p.paidAmount || 0,
          paymentMethod: p.paymentMethod,
          notes: p.paidAmount && p.paidAmount > 0 ? 'داعم خارجي' : undefined
      }));
      
      onUpdateTrip({
          ...trip,
          participants: [...trip.participants, ...newEntries]
      });
  };

  const handleDeleteParticipant = (participantId: string) => {
      const updatedParticipants = trip.participants.filter(p => p.id !== participantId);
      onUpdateTrip({
          ...trip,
          participants: updatedParticipants
      });
      setPaymentModalOpen(false);
  };

  const handleUpdateParticipant = (updated: TripParticipant, transfers?: Transfer[]) => {
    let newParticipants = trip.participants.map(p => p.id === updated.id ? updated : p);

    if (transfers && transfers.length > 0) {
        newParticipants = newParticipants.map(p => {
            const transferIn = transfers.find(t => t.targetId === p.id);
            if (transferIn) {
                 return {
                     ...p,
                     paidAmount: p.paidAmount + transferIn.amount,
                     notes: (p.notes ? p.notes + '\n' : '') + `تم استلام دعم ${transferIn.amount} من ${updated.name}.`,
                     paymentMethod: `غطاها: ${updated.name}`
                 };
            }
            if (p.id === updated.id) {
                const totalTransferred = transfers.reduce((sum, t) => sum + t.amount, 0);
                return {
                    ...p,
                    paidAmount: p.paidAmount - totalTransferred,
                    notes: (p.notes ? p.notes + '\n' : '') + `تم تحويل فائض ${totalTransferred} إلى مشاركين آخرين.`
                };
            }
            return p;
        });
    }

    onUpdateTrip({ ...trip, participants: newParticipants });
  };

  const handleTogglePayment = (p: TripParticipant) => {
      const isPaid = p.paidAmount >= p.fee;
      
      if (isPaid) {
          // Toggle OFF (Unpaid)
           const updated = { ...p, paidAmount: 0, paymentMethod: undefined };
           handleUpdateParticipant(updated);
      } else {
          // Toggle ON (Paid with Cash default)
          const updated = { ...p, paidAmount: p.fee, paymentMethod: 'كاش' };
          handleUpdateParticipant(updated);
      }
  };

  const handleAddExpense = (payerId: string, amount: number, description: string) => {
    const participants = [...trip.participants];
    let actualExpenseAmount = amount;
    let feeCoveredAmount = 0;

    if (payerId !== 'POOL') {
        const payerIndex = participants.findIndex(p => p.id === payerId);
        if (payerIndex !== -1) {
            const payer = participants[payerIndex];
            const owed = Math.max(0, payer.fee - payer.paidAmount);
            
            feeCoveredAmount = Math.min(amount, owed);
            actualExpenseAmount = amount - feeCoveredAmount;

            if (feeCoveredAmount > 0) {
                participants[payerIndex] = {
                    ...payer,
                    paidAmount: payer.paidAmount + feeCoveredAmount,
                    paymentMethod: 'دفعها كمصروف',
                    notes: (payer.notes ? payer.notes + '\n' : '') + `تم تغطية ${feeCoveredAmount} من القِطَّة عبر مصروف: ${description}`
                };
            }
        }
    }

    const newExpenses = [...trip.expenses];
    if (actualExpenseAmount > 0) {
      const newExpense: Expense = {
        id: Date.now().toString(),
        payerId,
        amount: actualExpenseAmount,
        originalAmount: amount,
        feeCoveredAmount,
        description,
        date: new Date().toISOString()
      };
      newExpenses.push(newExpense);
    }

    onUpdateTrip({
      ...trip,
      participants,
      expenses: newExpenses
    });
  };

  const handleDeleteExpense = (expenseId: string) => {
      const newExpenses = trip.expenses.filter(e => e.id !== expenseId);
      onUpdateTrip({...trip, expenses: newExpenses});
      setExpenseDeleteId(null);
  }

  // --- Stats Calculations ---
  const totalPaid = trip.participants.reduce((sum, p) => sum + p.paidAmount, 0);
  const totalActualExpenses = trip.expenses.reduce((sum, e) => sum + e.amount, 0);
  const netBalance = totalPaid - totalActualExpenses;
  
  const countAdults = trip.participants.filter(p => p.type === 'كبير').length;
  const countChildren = trip.participants.filter(p => p.type.includes('صغير') || p.type.includes('طفل')).length;

  const paymentMethodStats = trip.participants.reduce((acc, p) => {
      if (p.paidAmount > 0 && p.paymentMethod) {
          acc[p.paymentMethod] = (acc[p.paymentMethod] || 0) + p.paidAmount;
      }
      return acc;
  }, {} as Record<string, number>);

  // --- Report Generation ---
  const handleShareReport = async () => {
    // 1. Calculate Base Fees Collected vs Support
    let baseFeesCollected = 0;
    const supportersList: { name: string, amount: number }[] = [];

    trip.participants.forEach(p => {
        const base = Math.min(p.paidAmount, p.fee);
        baseFeesCollected += base;

        const surplus = Math.max(0, p.paidAmount - p.fee);
        if (surplus > 0) {
            supportersList.push({ name: p.name, amount: surplus });
        }
    });

    // Sort supporters by amount descending
    supportersList.sort((a, b) => b.amount - a.amount);

    // 2. Build String
    let report = `السلام عليكم\n\n`;
    report += `🌴 *تقرير: ${trip.name}* 🌴\n`;
    if (trip.location) report += `📍 المكان: ${trip.location}\n`;
    if (trip.tripDate) report += `🗓️ التاريخ: ${trip.tripDate}\n`;
    
    report += `\n👥 *الأعداد:*`;
    report += `\n• الكلي: ${trip.participants.length}`;
    report += `\n• 👨 كبار: ${countAdults}`;
    report += `\n• 👶 صغار: ${countChildren}\n`;

    report += `\nالمبالغ المجموعة:\n`;
    report += `• ${baseFeesCollected.toLocaleString()} ريال 🍀 مجموع القطيات كاملة\n`;
    
    supportersList.forEach(s => {
        report += `• ${s.amount.toLocaleString()} ريال 🍀 دعم من ${s.name}\n`;
    });

    report += `\n🟩 *المجموع الكلي للقطيات والدعم:*\n`;
    report += `${totalPaid.toLocaleString()} ريال تم جمعها\n`;

    report += `\nالمصروفات:\n`;
    if (trip.expenses.length === 0) {
        report += `• لا يوجد مصاريف مسجلة\n`;
    } else {
        trip.expenses.forEach(e => {
            report += `• ${e.description}: 🔻 ${e.amount.toLocaleString()} ريال\n`;
        });
    }

    report += `\n🟥 *المجموع الكلي للمصروفات:*\n`;
    report += `${totalActualExpenses.toLocaleString()} ريال\n`;

    report += `\n🟩 *الفائض:*\n`;
    report += `${netBalance.toLocaleString()} ريال\n`;

    report += `\n📝 *ملاحظة:*
الفائض سيكون محفوظًا في الصندوق، ويُستخدم لتغطية أي نقص لاحق بإذن الله. ومن باب العدل، من لم يدفع القطية حتى الآن، نأمل منه التحويل إلى حسابي عبر STC Pay لإضافته مع الفائض.

ومن عايدة انشاء الله
نلتقي بكم في جمعات أخرى

🌹`;

    if (navigator.share) {
        try {
            await navigator.share({
                title: `تقرير ${trip.name}`,
                text: report
            });
        } catch (err) {
            console.error("Share failed", err);
        }
    } else {
        navigator.clipboard.writeText(report);
        alert("تم نسخ التقرير للحافظة");
    }
  };

  // --- Filtering & Sorting ---
  let filteredParticipants = trip.participants.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    const isPaid = p.paidAmount >= p.fee;
    const isSurplus = p.paidAmount > p.fee;

    if (filterStatus === 'PAID') return isPaid;
    if (filterStatus === 'UNPAID') return !isPaid;
    if (filterStatus === 'SURPLUS') return isSurplus;

    return true;
  });

  // Sort Surplus: Highest surplus first
  if (filterStatus === 'SURPLUS') {
      filteredParticipants.sort((a, b) => {
          const surplusA = a.paidAmount - a.fee;
          const surplusB = b.paidAmount - b.fee;
          return surplusB - surplusA;
      });
  }

  // Helper to determine sidebar color
  const getSidebarColor = (type: string) => {
    // "كبير" -> Dark Olive Green (#556B2F)
    if (type === 'كبير' || type === 'ك') return 'bg-[#556B2F]';
    // "صغير" -> Sky Blue
    if (type === 'صغير' || type.includes('صغير') || type === 'ص') return 'bg-sky-400';
    return 'bg-gray-400'; // Fallback
  };

  return (
    <div className="space-y-6 pb-safe">
      {/* iOS Style Navbar */}
      <div className="flex flex-col gap-4 bg-white/80 backdrop-blur-md sticky top-0 z-20 -mx-4 px-4 py-4 border-b border-gray-100">
        <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="p-2 -mr-2 active:bg-gray-100 rounded-full text-gray-600 transition-colors">
                   <ArrowRight size={24} />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 leading-tight">{trip.name}</h1>
                    <div className="flex items-center gap-3 text-sm mt-1">
                         <span className={`font-bold ${netBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`} dir="ltr">
                            {netBalance.toLocaleString()}
                        </span>
                        <span className="text-gray-300">|</span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                            {trip.participants.length} كلي
                            <span className="text-gray-300">/</span>
                            {countAdults} كبار
                            <span className="text-gray-300">/</span>
                            {countChildren} صغار
                        </span>
                    </div>
                </div>
            </div>
            <div className="flex gap-2">
                 <button 
                    onClick={() => setExpenseModalOpen(true)}
                    className="w-10 h-10 flex items-center justify-center bg-black text-white rounded-full shadow-lg active:scale-90 transition-transform"
                 >
                    <Plus size={20} />
                 </button>
            </div>
        </div>

        {/* Segmented Control Tabs */}
        <div className="flex bg-gray-100/80 p-1 rounded-xl">
          {(['participants', 'expenses', 'stats'] as const).map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'participants' && 'المشاركون'}
              {tab === 'expenses' && 'المصاريف'}
              {tab === 'stats' && 'التقارير'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="animate-in fade-in zoom-in-95 duration-200">
        
        {/* --- Participants View --- */}
        {activeTab === 'participants' && (
          <div className="space-y-4">
            {/* Search Bar + Add Button */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                <Search className="absolute right-3 top-3 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="بحث..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                />
                </div>
                {filterStatus === 'SURPLUS' ? (
                    <button 
                        onClick={() => { setAddParticipantMode('support'); setAddParticipantModalOpen(true); }}
                        className="flex items-center gap-2 px-3 bg-blue-100 text-blue-700 rounded-2xl border border-blue-200 active:scale-95 transition-transform font-medium text-xs"
                    >
                        <HeartHandshake size={16} />
                        <span className="hidden sm:inline">إضافة داعم</span>
                        <span className="sm:hidden">داعم</span>
                    </button>
                ) : (
                    <button 
                        onClick={() => { setAddParticipantMode('participant'); setAddParticipantModalOpen(true); }}
                        className="w-12 h-12 flex items-center justify-center bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 active:scale-95 transition-transform"
                    >
                        <UserPlus size={20} />
                    </button>
                )}
            </div>

            {/* Filter Chips */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                <button 
                    onClick={() => setFilterStatus('ALL')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${filterStatus === 'ALL' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}
                >
                    الكل
                </button>
                <button 
                    onClick={() => setFilterStatus('PAID')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${filterStatus === 'PAID' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'}`}
                >
                    الخالص
                </button>
                <button 
                    onClick={() => setFilterStatus('UNPAID')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${filterStatus === 'UNPAID' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'}`}
                >
                    باقي عليه
                </button>
                <button 
                    onClick={() => setFilterStatus('SURPLUS')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${filterStatus === 'SURPLUS' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}
                >
                    الداعم
                </button>
            </div>

            {/* Mobile Cards (Primary View) */}
            <div className="space-y-3">
                {filteredParticipants.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                        <p>
                            {filterStatus === 'SURPLUS' ? 'لا يوجد داعمين حالياً' : 'لا يوجد مشاركين'}
                        </p>
                    </div>
                ) : (
                    filteredParticipants.map(p => {
                        const isPaid = p.paidAmount >= p.fee;
                        const surplus = Math.max(0, p.paidAmount - p.fee);
                        const remaining = p.fee - p.paidAmount;
                        
                        // Calculate percentage for background fill
                        const percent = p.fee > 0 ? Math.min(100, (p.paidAmount / p.fee) * 100) : (p.paidAmount > 0 ? 100 : 0);
                        
                        return (
                            <div 
                                key={p.id} 
                                onClick={() => { setSelectedParticipant(p); setPaymentModalOpen(true); }}
                                className="relative w-full h-24 rounded-[24px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] cursor-pointer bg-gray-200"
                            >
                                {/* 1. Dynamic Background Fill (White overlay from Left) */}
                                <div 
                                    className="absolute top-0 left-0 h-full bg-white transition-all duration-700 ease-out"
                                    style={{ width: `${percent}%` }}
                                />

                                {/* 2. Category Sidebar (Right Edge) */}
                                <div 
                                    className={`absolute top-0 right-0 w-2.5 h-full z-10 ${getSidebarColor(p.type)}`}
                                />

                                {/* 3. Content Container */}
                                <div className="relative z-20 h-full flex justify-between items-center pr-7 pl-5">
                                    {/* Text Info (Right) */}
                                    <div className="text-right">
                                        <h3 className="text-lg font-bold text-gray-900 leading-tight">{p.name}</h3>
                                        
                                        <div className="flex items-center justify-start gap-2 mt-1 text-sm font-medium text-gray-500">
                                            <span className="flex items-center gap-1">
                                                مطلوب:
                                                <span className="font-mono font-bold text-gray-900">{p.fee}</span>
                                            </span>
                                            <span className="text-gray-300">|</span>
                                            <span className="flex items-center gap-1">
                                                مدفوع:
                                                <span className={`font-mono font-bold ${p.paidAmount >= p.fee ? 'text-emerald-600' : 'text-gray-900'}`}>
                                                    {p.paidAmount}
                                                </span>
                                            </span>
                                            {p.paidAmount > 0 && p.paymentMethod && (
                                                <>
                                                    <span className="text-gray-300">|</span>
                                                    <span className="text-blue-600 text-xs font-bold">
                                                        {p.paymentMethod}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Status Indicator (Left) */}
                                    <div onClick={(e) => { e.stopPropagation(); handleTogglePayment(p); }}>
                                        {isPaid ? (
                                            <div className="relative">
                                                <div className="w-14 h-14 rounded-full bg-[#00B16A] flex items-center justify-center border-[3px] border-white shadow-sm active:scale-90 transition-transform">
                                                    <Check color="white" strokeWidth={4} size={28} />
                                                </div>
                                                {surplus > 0 && (
                                                    <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs font-bold px-1.5 h-6 min-w-[24px] rounded-full flex items-center justify-center border-2 border-white shadow-sm z-10">
                                                        +{surplus}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="bg-red-50/80 backdrop-blur-sm text-red-500 font-bold text-xl px-4 py-2 rounded-[14px] border-2 border-red-200 active:scale-90 transition-transform">
                                                <span dir="ltr">{remaining}-</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
          </div>
        )}

        {/* --- Expenses View --- */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            {trip.expenses.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-20 text-gray-400 opacity-60">
                 <Receipt size={48} className="mb-4" strokeWidth={1.5} />
                 <p>لا توجد مصاريف</p>
               </div>
            ) : (
                <div className="space-y-3">
                    {trip.expenses.map(e => {
                        const isPool = e.payerId === 'POOL';
                        const payerName = isPool 
                            ? 'الصندوق (القطة)' 
                            : trip.participants.find(p => p.id === e.payerId)?.name || "غير معروف";
                        
                        const isDeleting = expenseDeleteId === e.id;

                        return (
                            <div key={e.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        {isPool && <Landmark size={14} className="text-blue-500" />}
                                        <span className={`font-bold text-sm ${isPool ? 'text-blue-600' : 'text-gray-900'}`}>{payerName}</span>
                                        <span className="text-xs text-gray-400">• {new Date(e.date).toLocaleDateString('ar-SA')}</span>
                                    </div>
                                    <p className="text-gray-600 text-sm">{e.description}</p>
                                    {e.feeCoveredAmount && e.feeCoveredAmount > 0 ? (
                                        <div className="mt-2 text-xs text-blue-600 bg-blue-50 inline-block px-2 py-1 rounded-lg">
                                           تم خصم {e.feeCoveredAmount} لتغطية القطة
                                        </div>
                                    ) : null}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className="font-bold text-red-600 dir-ltr font-mono">-{e.amount}</span>
                                    
                                    {isDeleting ? (
                                        <div className="flex items-center gap-2 mt-1">
                                            <button onClick={() => handleDeleteExpense(e.id)} className="p-1 bg-red-500 text-white rounded hover:bg-red-600">
                                                <Check size={16} />
                                            </button>
                                            <button onClick={() => setExpenseDeleteId(null)} className="p-1 bg-gray-200 text-gray-600 rounded hover:bg-gray-300">
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setExpenseDeleteId(e.id)} className="text-gray-300 hover:text-red-500 p-1">
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
          </div>
        )}

        {/* --- Stats View --- */}
        {activeTab === 'stats' && (
            <div className="space-y-4">
                {/* Big Cards */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                        <p className="text-xs text-emerald-600 font-medium mb-1">المقبوضات</p>
                        <p className="text-xl font-bold text-emerald-900 font-mono">{totalPaid}</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                        <p className="text-xs text-red-600 font-medium mb-1">المصاريف</p>
                        <p className="text-xl font-bold text-red-900 font-mono">{totalActualExpenses}</p>
                    </div>
                </div>

                {/* Chart */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-800">حالة الصندوق</h3>
                        <span className={`text-lg font-bold ${netBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`} dir="ltr">{netBalance}</span>
                    </div>
                    <div className="h-64 w-full">
                         <ResponsiveContainer width="100%" height="100%">
                            <RePie>
                                <Pie
                                data={[
                                    { name: 'مدفوع', value: trip.participants.filter(p => p.paidAmount >= p.fee).length },
                                    { name: 'غير مدفوع', value: trip.participants.filter(p => p.paidAmount < p.fee).length },
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                >
                                <Cell fill="#10b981" stroke="none" /> 
                                <Cell fill="#f87171" stroke="none" /> 
                                </Pie>
                                <ReTooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                                <Legend iconType="circle" />
                            </RePie>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Share Button */}
                <button 
                    onClick={handleShareReport}
                    className="w-full py-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                    <Share size={20} />
                    <span className="font-bold">مشاركة التقرير</span>
                </button>

                {/* Payment Methods Table */}
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4 text-sm">تفاصيل طرق الدفع</h3>
                    <div className="divide-y divide-gray-100">
                        {Object.entries(paymentMethodStats).length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-4">لا يوجد مدفوعات حتى الآن</p>
                        ) : (
                             Object.entries(paymentMethodStats).map(([method, amount]) => (
                                <div key={method} className="flex justify-between py-3 text-sm">
                                    <span className="text-gray-600">{method}</span>
                                    <span className="font-bold font-mono">{amount}</span>
                                </div>
                            ))
                        )}
                        <div className="flex justify-between py-3 text-sm font-bold bg-gray-50 -mx-5 px-5 mt-2">
                             <span>الإجمالي</span>
                             <span className="font-mono text-emerald-600">{totalPaid}</span>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Modals */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        participant={selectedParticipant}
        otherParticipants={trip.participants.filter(p => p.id !== selectedParticipant?.id)}
        onSave={handleUpdateParticipant}
        onDelete={() => selectedParticipant && handleDeleteParticipant(selectedParticipant.id)}
      />

      <AddExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        participants={trip.participants}
        onAddExpense={handleAddExpense}
      />

      <AddParticipantModal 
        isOpen={isAddParticipantModalOpen}
        onClose={() => setAddParticipantModalOpen(false)}
        masterParticipants={masterParticipants}
        currentParticipants={trip.participants}
        onAdd={handleAddParticipants}
        defaultFees={{ adult: trip.adultFee, child: trip.childFee }}
        mode={addParticipantMode}
      />
    </div>
  );
};
