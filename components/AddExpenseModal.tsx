import React, { useState } from 'react';
import { TripParticipant } from '../types';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Calculator, CreditCard, FileText, Landmark } from 'lucide-react';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: TripParticipant[];
  onAddExpense: (payerId: string, amount: number, description: string) => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  participants,
  onAddExpense,
}) => {
  const [payerId, setPayerId] = useState<string>("POOL"); // Default to POOL
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (payerId && amount && description) {
      onAddExpense(payerId, parseFloat(amount), description);
      // Reset form
      setPayerId("POOL");
      setAmount("");
      setDescription("");
      onClose();
    }
  };

  const isPool = payerId === "POOL";
  const selectedPayer = participants.find(p => p.id === payerId);
  const payerOwed = selectedPayer ? Math.max(0, selectedPayer.fee - selectedPayer.paidAmount) : 0;
  const enteredAmount = parseFloat(amount) || 0;
  
  // Preview Calculation
  // If POOL pays, feeCoverage is 0.
  const feeCoverage = !isPool && selectedPayer ? Math.min(enteredAmount, payerOwed) : 0;
  const actualExpense = Math.max(0, enteredAmount - feeCoverage);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تسجيل مصروف جديد">
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Payer Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            من قام بالدفع؟
          </label>
          <div className="relative">
            <select
                required
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="block w-full p-2 pl-10 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
            >
                <option value="POOL" className="font-bold text-blue-800">🏛 من القطة (الصندوق)</option>
                <optgroup label="مشارك">
                    {participants.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </optgroup>
            </select>
            <div className="absolute right-3 top-2.5 pointer-events-none text-gray-500">
                {isPool ? <Landmark size={20} /> : <CreditCard size={20} />}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">
              {isPool 
                ? "سيتم خصم المبلغ من رصيد الصندوق مباشرة دون التأثير على قِطط المشاركين."
                : "سيتم خصم قِطَّة المشارك من المبلغ أولاً، والباقي يُسجل كمصروف."
              }
          </p>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            المبلغ الإجمالي (ريال)
          </label>
          <div className="relative">
            <Calculator className="absolute right-3 top-2.5 text-gray-400" size={20} />
            <input
              required
              type="number"
              inputMode="decimal"
              pattern="[0-9]*"
              onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="block w-full pr-10 pl-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-lg bg-[#333] text-white placeholder-gray-400"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            الوصف / الغرض
          </label>
          <div className="relative">
            <FileText className="absolute right-3 top-2.5 text-gray-400" size={20} />
            <input
              required
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="block w-full pr-10 pl-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="مثال: عشاء، بنزين، مقاضي..."
            />
          </div>
        </div>

        {/* Logic Preview Box */}
        {enteredAmount > 0 && (
          <div className={`p-4 rounded-lg border text-sm space-y-2 ${isPool ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-100'}`}>
            <h4 className="font-bold text-gray-800 mb-2">تفاصيل العملية:</h4>
            
            <div className="flex justify-between text-gray-600">
              <span>مبلغ المصروف المسجل:</span>
              <span className="font-mono">{enteredAmount}</span>
            </div>
            
            {!isPool && feeCoverage > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>يُخصم لتغطية قِطَّة ({selectedPayer?.name}):</span>
                <span className="font-mono">-{feeCoverage}</span>
              </div>
            )}

            <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-gray-900">
              <span>المصروف الفعلي (على الرحلة):</span>
              <span className="font-mono">{actualExpense}</span>
            </div>

            {!isPool && feeCoverage > 0 && (
              <p className="text-xs text-blue-600 mt-1">
                * سيتم تسجيل {feeCoverage} ريال كدفعة للمشارك تلقائياً.
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
          <Button type="submit" variant="secondary">
             إضافة العملية
          </Button>
        </div>
      </form>
    </Modal>
  );
};