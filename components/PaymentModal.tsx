import React, { useState, useEffect } from 'react';
import { TripParticipant } from '../types';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Coins, Wallet, CreditCard, Trash2 } from 'lucide-react';

interface Transfer {
  targetId: string;
  amount: number;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  participant: TripParticipant | null;
  otherParticipants: TripParticipant[];
  onSave: (updatedParticipant: TripParticipant, transfers?: Transfer[]) => void;
  onDelete: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  participant,
  otherParticipants,
  onSave,
  onDelete
}) => {
  const [fee, setFee] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('كاش');
  
  // Surplus Multi-Select Logic
  const [distributeMode, setDistributeMode] = useState(false);
  const [transfers, setTransfers] = useState<Transfer[]>([]);

  // Delete confirmation state
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);

  const PAYMENT_METHODS = [
    { id: 'كاش', label: '💵 كاش' },
    { id: 'STC Pay', label: '📱 STC Pay' },
    { id: 'بنك الراجحي', label: '🏦 بنك الراجحي' },
    { id: 'بنك الأهلي', label: '🏦 بنك الأهلي' },
    { id: 'بنك الرياض', label: '🏦 بنك الرياض' },
    { id: 'بنك الإنماء', label: '🏦 بنك الإنماء' },
    { id: 'أخرى', label: '🔖 أخرى' },
  ];

  useEffect(() => {
    if (participant) {
      setFee(participant.fee);
      setPaidAmount(participant.paidAmount);
      setPaymentMethod(participant.paymentMethod || 'كاش');
      setDistributeMode(false);
      setTransfers([]);
      setIsDeleteConfirming(false);
    }
  }, [participant]);

  if (!participant) return null;

  const surplus = Math.max(0, paidAmount - fee);
  const hasSurplus = surplus > 0;

  // Filter potential receivers (those who owe money)
  const receivers = otherParticipants.filter(p => p.fee > p.paidAmount);

  const handleTransferChange = (targetId: string, amountStr: string) => {
    const amount = parseFloat(amountStr) || 0;
    setTransfers(prev => {
      const existing = prev.find(t => t.targetId === targetId);
      if (amount <= 0) return prev.filter(t => t.targetId !== targetId);
      
      if (existing) {
        return prev.map(t => t.targetId === targetId ? { ...t, amount } : t);
      } else {
        return [...prev, { targetId, amount }];
      }
    });
  };

  const totalTransferred = transfers.reduce((sum, t) => sum + t.amount, 0);
  const remainingSurplus = surplus - totalTransferred;

  const handleSave = () => {
    const updated: TripParticipant = {
      ...participant,
      fee,
      paidAmount,
      paymentMethod,
    };
    
    if (hasSurplus && distributeMode && transfers.length > 0) {
      onSave(updated, transfers);
    } else {
      onSave(updated);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`تعديل بيانات: ${participant.name}`}>
      <div className="space-y-6">
        
        <div className="grid grid-cols-2 gap-4">
            {/* Fee Input */}
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                القِطَّة المطلوبة
            </label>
            <div className="relative">
                <Wallet className="absolute right-3 top-2.5 text-gray-400" size={20} />
                <input
                type="number"
                inputMode="decimal"
                pattern="[0-9]*"
                onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                value={fee}
                onChange={(e) => setFee(Number(e.target.value))}
                className="block w-full pr-10 pl-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-[#333] text-white placeholder-gray-400"
                />
            </div>
            </div>

            {/* Paid Amount Input */}
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                المبلغ المدفوع
            </label>
            <div className="relative">
                <Coins className="absolute right-3 top-2.5 text-gray-400" size={20} />
                <input
                type="number"
                inputMode="decimal"
                pattern="[0-9]*"
                onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                value={paidAmount}
                onChange={(e) => setPaidAmount(Number(e.target.value))}
                className="block w-full pr-10 pl-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-[#333] text-white placeholder-gray-400"
                />
            </div>
            </div>
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            طريقة الدفع
          </label>
          <div className="relative">
            <CreditCard className="absolute right-3 top-2.5 text-gray-400" size={20} />
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="block w-full pr-10 pl-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
            >
              {PAYMENT_METHODS.map(method => (
                <option key={method.id} value={method.id}>{method.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Surplus Logic */}
        {hasSurplus && (
          <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200 animate-in fade-in">
            <div className="flex items-center justify-between text-emerald-800 font-bold mb-3">
              <div className="flex items-center gap-2">
                <Coins size={20} />
                <span>يوجد فائض: {surplus} ريال</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="surplusAction"
                  className="w-4 h-4 text-emerald-600"
                  checked={!distributeMode}
                  onChange={() => setDistributeMode(false)}
                />
                <span className="text-sm text-gray-700">اعتبار الفائض دعم عام للقطية</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="surplusAction"
                  className="w-4 h-4 text-emerald-600"
                  checked={distributeMode}
                  onChange={() => setDistributeMode(true)}
                />
                <span className="text-sm text-gray-700">توزيع الفائض لتغطية آخرين</span>
              </label>
            </div>

            {distributeMode && (
              <div className="mt-4 border-t border-emerald-200 pt-3">
                <div className="flex justify-between text-xs font-bold mb-2 text-gray-600">
                    <span>توزيع الفائض (المتبقي: {remainingSurplus})</span>
                </div>
                
                {receivers.length === 0 ? (
                    <p className="text-xs text-gray-500">الجميع سددوا قطتهم، لا يوجد أحد لتغطية مبلغه.</p>
                ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {receivers.map(r => {
                            const owed = r.fee - r.paidAmount;
                            const currentTransfer = transfers.find(t => t.targetId === r.id)?.amount || 0;
                            
                            return (
                                <div key={r.id} className="flex items-center gap-2 bg-white/60 p-2 rounded">
                                    <div className="flex-1">
                                        <span className="text-sm font-medium text-gray-900 block">{r.name}</span>
                                        <span className="text-xs text-red-500">باقي عليه: {owed}</span>
                                    </div>
                                    <div className="w-24">
                                        <input 
                                            type="number"
                                            inputMode="decimal"
                                            pattern="[0-9]*"
                                            onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                                            placeholder="0"
                                            className="w-full p-1 border rounded text-center text-sm bg-[#333] text-white placeholder-gray-400"
                                            value={currentTransfer === 0 ? '' : currentTransfer}
                                            onChange={(e) => handleTransferChange(r.id, e.target.value)}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
                {remainingSurplus < 0 && (
                    <p className="text-xs text-red-600 mt-2 font-bold">تنبيه: لقد وزعت مبلغاً أكبر من الفائض!</p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t mt-2">
            {isDeleteConfirming ? (
                <div className="flex items-center gap-2 animate-in slide-in-from-left-2 fade-in duration-200">
                    <span className="text-sm text-red-600 font-bold">تأكيد الحذف؟</span>
                    <button
                        type="button"
                        onClick={onDelete}
                        className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors font-medium"
                    >
                        نعم، احذف
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsDeleteConfirming(false)}
                        className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 transition-colors font-medium"
                    >
                        تراجع
                    </button>
                </div>
            ) : (
                <button 
                    type="button"
                    onClick={() => setIsDeleteConfirming(true)} 
                    className="text-red-500 p-2 rounded hover:bg-red-50 flex items-center gap-1 text-sm font-medium transition-colors"
                >
                    <Trash2 size={18} />
                    حذف من القطة
                </button>
            )}
            
            {!isDeleteConfirming && (
                <div className="flex gap-3">
                    <Button variant="outline" onClick={onClose}>إلغاء</Button>
                    <Button onClick={handleSave} disabled={distributeMode && remainingSurplus < 0}>حفظ التغييرات</Button>
                </div>
            )}
        </div>
      </div>
    </Modal>
  );
};