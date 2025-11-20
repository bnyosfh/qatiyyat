import React, { useState, useEffect } from 'react';
import { MasterParticipant, TripParticipant } from '../types';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Search, UserPlus, CheckSquare, CreditCard, Coins, CheckCircle2 } from 'lucide-react';

interface AddParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterParticipants: MasterParticipant[];
  currentParticipants: TripParticipant[];
  onAdd: (participants: { name: string; type: string; fee: number; paidAmount?: number; paymentMethod?: string; isNew: boolean; id?: string }[]) => void;
  defaultFees: { adult: number; child: number };
  mode?: 'participant' | 'support'; // New prop to distinguish modes
}

export const AddParticipantModal: React.FC<AddParticipantModalProps> = ({
  isOpen,
  onClose,
  masterParticipants,
  currentParticipants,
  onAdd,
  defaultFees,
  mode = 'participant'
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'custom'>('list');
  const [searchTerm, setSearchTerm] = useState("");
  
  // Bulk selection state (Participant Mode)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Single selection state (Support Mode)
  const [selectedSupportId, setSelectedSupportId] = useState<string | null>(null);

  // Support Details
  const [supportAmount, setSupportAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("كاش");

  // Custom Form State
  const [customName, setCustomName] = useState("");
  const [customType, setCustomType] = useState("كبير");
  const [customFee, setCustomFee] = useState<string>(defaultFees.adult.toString());

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
      if(isOpen) {
          setSelectedIds(new Set());
          setSelectedSupportId(null);
          setSupportAmount("");
          setCustomName("");
          setPaymentMethod("كاش");
      }
  }, [isOpen]);

  // Filter master list to show only those NOT in the trip
  const availableParticipants = masterParticipants.filter(
    mp => !currentParticipants.some(cp => cp.id === mp.id || cp.name === mp.name)
  ).filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const toggleSelection = (id: string) => {
    if (mode === 'support') {
        // Single select logic for support
        setSelectedSupportId(id === selectedSupportId ? null : id);
    } else {
        // Bulk select logic for participants
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    }
  };

  const handleBulkAdd = () => {
      const participantsToAdd = availableParticipants
        .filter(p => selectedIds.has(p.id))
        .map(mp => {
            const isChild = mp.type.includes('صغير') || mp.type.includes('طفل');
            const fee = isChild ? defaultFees.child : defaultFees.adult;
            return { name: mp.name, type: mp.type, fee, isNew: false, id: mp.id };
        });
      
      onAdd(participantsToAdd);
      onClose();
  };

  const handleAddSupportFromList = () => {
      const participant = availableParticipants.find(p => p.id === selectedSupportId);
      if (participant && supportAmount) {
          onAdd([{
              name: participant.name,
              type: participant.type,
              fee: 0, // Supporter has 0 fee
              paidAmount: parseFloat(supportAmount),
              paymentMethod: paymentMethod,
              isNew: false,
              id: participant.id
          }]);
          onClose();
      }
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customName) {
        if (mode === 'support') {
             onAdd([{ 
                 name: customName, 
                 type: customType, 
                 fee: 0, 
                 paidAmount: parseFloat(supportAmount) || 0,
                 paymentMethod: paymentMethod,
                 isNew: true 
             }]);
        } else {
            onAdd([{ 
                name: customName, 
                type: customType, 
                fee: parseFloat(customFee) || 0, 
                isNew: true 
            }]);
        }
        setCustomName("");
        onClose();
    }
  };

  // Helper to simplify type
  const getSimplifiedType = (type: string) => {
    if (type === 'كبير') return 'ك';
    if (type === 'صغير') return 'ص';
    return type;
  };

  const isSupport = mode === 'support';

  return (
    <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title={isSupport ? "إضافة داعم خارجي" : "إضافة مشاركين"}
    >
      <div className="flex gap-2 mb-4 border-b border-gray-100 pb-2">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'list' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          من القائمة الرئيسية
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'custom' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          {isSupport ? 'داعم جديد (ضيف)' : 'ضيف جديد'}
        </button>
      </div>

      {activeTab === 'list' ? (
        <div className="space-y-4 flex flex-col h-[60vh]">
          <div className="relative">
            <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="بحث في الأسماء..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2 border rounded-lg p-2">
            {availableParticipants.length === 0 ? (
              <p className="text-center text-gray-500 py-4 text-sm">لا يوجد أسماء متاحة للإضافة</p>
            ) : (
              availableParticipants.map(p => {
                 const isChild = p.type.includes('صغير');
                 const previewFee = isChild ? defaultFees.child : defaultFees.adult;
                 const isSelected = isSupport ? (selectedSupportId === p.id) : selectedIds.has(p.id);

                 return (
                    <div 
                        key={p.id} 
                        onClick={() => toggleSelection(p.id)}
                        className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border border-blue-200' : 'bg-white border border-gray-100 hover:bg-gray-50'}`}
                    >
                         <div className={`w-5 h-5 rounded border flex items-center justify-center ml-3 transition-colors ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 bg-white'}`}>
                            {isSelected && (isSupport ? <div className="w-2.5 h-2.5 bg-white rounded-full" /> : <CheckSquare size={14} />)}
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 text-sm">{p.name}</p>
                            {!isSupport && <p className="text-xs text-gray-500">{getSimplifiedType(p.type)} <span className="text-blue-400">({previewFee})</span></p>}
                        </div>
                    </div>
                 );
              })
            )}
          </div>

          {/* Support Input Fields for List Mode */}
          {isSupport && selectedSupportId && (
              <div className="bg-blue-50 p-3 rounded-lg space-y-3 animate-in slide-in-from-bottom-2">
                  <div>
                      <label className="block text-xs font-bold text-blue-800 mb-1">مبلغ الدعم</label>
                      <div className="relative">
                        <Coins className="absolute right-3 top-2 text-blue-400" size={16} />
                        <input 
                            type="number"
                            inputMode="decimal"
                            pattern="[0-9]*"
                            onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                            placeholder="0"
                            value={supportAmount}
                            onChange={(e) => setSupportAmount(e.target.value)}
                            className="w-full pr-9 pl-2 py-1.5 border-blue-200 rounded text-sm focus:ring-blue-500 bg-[#333] text-white placeholder-gray-400"
                            autoFocus
                        />
                      </div>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-blue-800 mb-1">طريقة الدفع</label>
                      <select 
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-full py-1.5 px-2 border-blue-200 rounded text-sm focus:ring-blue-500"
                      >
                          {PAYMENT_METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                      </select>
                  </div>
                  <Button onClick={handleAddSupportFromList} disabled={!supportAmount} className="w-full py-2 text-sm">
                      إضافة كداعم
                  </Button>
              </div>
          )}

          {!isSupport && (
            <div className="pt-2">
                <Button onClick={handleBulkAdd} disabled={selectedIds.size === 0} className="w-full">
                    إضافة المحددين ({selectedIds.size})
                </Button>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleAddCustom} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الاسم</label>
            <input
              required
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="اسم الشخص"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">التصنيف</label>
              <select
                value={customType}
                onChange={(e) => {
                    setCustomType(e.target.value);
                    if (!isSupport) {
                        if (e.target.value === 'صغير') setCustomFee(defaultFees.child.toString());
                        else setCustomFee(defaultFees.adult.toString());
                    }
                }}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="كبير">كبير</option>
                <option value="صغير">صغير</option>
              </select>
            </div>
            
            {!isSupport ? (
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">القِطَّة المطلوبة</label>
                <input
                    required
                    type="number"
                    inputMode="decimal"
                    pattern="[0-9]*"
                    onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                    value={customFee}
                    onChange={(e) => setCustomFee(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md bg-[#333] text-white placeholder-gray-400"
                />
                </div>
            ) : (
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">مبلغ الدعم</label>
                    <input
                        required
                        type="number"
                        inputMode="decimal"
                        pattern="[0-9]*"
                        onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                        value={supportAmount}
                        onChange={(e) => setSupportAmount(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md bg-[#333] text-white placeholder-gray-400"
                        placeholder="0"
                    />
                </div>
            )}
          </div>

          {isSupport && (
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">طريقة الدفع</label>
                  <select 
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                  >
                      {PAYMENT_METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
              </div>
          )}

          <Button type="submit" className="w-full mt-2">
            {isSupport ? 'إضافة كداعم' : 'إضافة للقائمة'}
          </Button>
        </form>
      )}
    </Modal>
  );
};