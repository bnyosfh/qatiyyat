import React, { useState, useEffect, useCallback } from 'react';
import { Trip, MasterParticipant, SheetStatus } from '../types';
import { fetchMasterParticipants } from '../services/csvService';
import { MASTER_PARTICIPANTS_URL, DEFAULT_ADULT_FEE, DEFAULT_CHILD_FEE } from '../constants';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Plus, Palmtree, AlertTriangle, Loader2, RefreshCcw, Users, CheckSquare, MapPin, Calendar, Clock, Trash2, Pencil, X, Check } from 'lucide-react';

interface DashboardProps {
  trips: Trip[];
  onCreateTrip: (trip: Trip) => void;
  onUpdateTrip: (trip: Trip) => void;
  onSelectTrip: (tripId: string) => void;
  onDeleteTrip: (tripId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ trips, onCreateTrip, onUpdateTrip, onSelectTrip, onDeleteTrip }) => {
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  
  // Create/Edit Form State
  const [tripName, setTripName] = useState("");
  const [tripDate, setTripDate] = useState("");
  const [tripTime, setTripTime] = useState("");
  const [tripLocation, setTripLocation] = useState("");
  
  const [customAdultFee, setCustomAdultFee] = useState(DEFAULT_ADULT_FEE);
  const [customChildFee, setCustomChildFee] = useState(DEFAULT_CHILD_FEE);
  
  // Selection only for CREATE mode
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Inline Delete State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [masterParticipants, setMasterParticipants] = useState<MasterParticipant[]>([]);
  const [sheetStatus, setSheetStatus] = useState<SheetStatus>(SheetStatus.IDLE);

  const loadData = useCallback(async () => {
    setSheetStatus(SheetStatus.LOADING);
    try {
      const data = await fetchMasterParticipants(MASTER_PARTICIPANTS_URL);
      setMasterParticipants(data);
      setSheetStatus(SheetStatus.SUCCESS);
      setSelectedIds(new Set());
    } catch (e) {
      console.error(e);
      setSheetStatus(SheetStatus.ERROR);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Initialize Form for Create or Edit
  useEffect(() => {
    if (editingTrip) {
      // Edit Mode
      setTripName(editingTrip.name);
      setTripDate(editingTrip.tripDate || "");
      setTripTime(editingTrip.tripTime || "");
      setTripLocation(editingTrip.location || "");
      setCustomAdultFee(editingTrip.adultFee);
      setCustomChildFee(editingTrip.childFee);
      // We don't handle participant selection in Edit mode from here to avoid data loss complexity
    } else {
      // Create Mode (Reset)
      setTripName("");
      setTripDate("");
      setTripTime("");
      setTripLocation("");
      setCustomAdultFee(DEFAULT_ADULT_FEE);
      setCustomChildFee(DEFAULT_CHILD_FEE);
      setSelectedIds(new Set());
    }
  }, [editingTrip, isModalOpen]);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === masterParticipants.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(masterParticipants.map(p => p.id)));
    }
  };

  const handleSave = () => {
    if (!tripName) return;

    if (editingTrip) {
      // UPDATE Logic
      const updatedTrip: Trip = {
        ...editingTrip,
        name: tripName,
        tripDate,
        tripTime,
        location: tripLocation,
        adultFee: customAdultFee,
        childFee: customChildFee,
        // We keep existing participants and expenses as is
      };
      onUpdateTrip(updatedTrip);
    } else {
      // CREATE Logic
      if (selectedIds.size === 0) return;
      
      const selectedParticipants = masterParticipants.filter(p => selectedIds.has(p.id));
      const newTrip: Trip = {
        id: Date.now().toString(),
        name: tripName,
        createdAt: new Date().toISOString(),
        tripDate,
        tripTime,
        location: tripLocation,
        adultFee: customAdultFee,
        childFee: customChildFee,
        expenses: [],
        participants: selectedParticipants.map(mp => ({
          ...mp,
          fee: mp.type === 'صغير' ? customChildFee : customAdultFee,
          paidAmount: 0
        }))
      };
      onCreateTrip(newTrip);
    }

    setModalOpen(false);
    setEditingTrip(null);
  };

  const openCreateModal = () => {
    setEditingTrip(null);
    setModalOpen(true);
  };

  const openEditModal = (e: React.MouseEvent, trip: Trip) => {
    e.stopPropagation();
    setEditingTrip(trip);
    setModalOpen(true);
  };

  // Helper to simplify type
  const getSimplifiedType = (type: string) => {
    if (type === 'كبير') return 'ك';
    if (type === 'صغير') return 'ص';
    return type;
  };

  return (
    <div className="space-y-6 pb-safe">
      {/* Modern Mobile Header */}
      <div className="flex justify-between items-end pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">قائمة القِطَط</h1>
          <p className="text-sm text-gray-500 font-medium">رتب أمورك المالية</p>
        </div>
      </div>

      {/* Action Banner / Status */}
      <div className="space-y-4">
        {sheetStatus === SheetStatus.SUCCESS && (
             <Button 
              onClick={openCreateModal} 
              className="w-full h-14 text-lg rounded-2xl shadow-lg shadow-blue-200/50 active:scale-95 transition-transform"
            >
              <Plus size={24} className="ml-2" />
              إنشاء قِطَّة جديدة
            </Button>
        )}

        {sheetStatus === SheetStatus.LOADING && (
          <div className="bg-white/50 backdrop-blur p-4 rounded-2xl border border-blue-100 flex items-center justify-center gap-3 text-blue-600 shadow-sm">
            <Loader2 className="animate-spin" size={20} />
            <span className="font-medium">جاري تحديث البيانات...</span>
          </div>
        )}

        {sheetStatus === SheetStatus.ERROR && (
          <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex flex-col items-center text-center gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="bg-red-100 p-3 rounded-full text-red-600">
                <AlertTriangle size={24} />
            </div>
            <div>
                <h3 className="font-bold text-red-900">حدث خطأ في الاتصال</h3>
                <p className="text-sm text-red-700 mt-1">لم نتمكن من جلب القائمة. تحقق من الانترنت.</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadData} 
              className="w-full bg-white border-red-200 text-red-700 hover:bg-red-50"
            >
              <RefreshCcw size={16} className="ml-1" />
              إعادة المحاولة
            </Button>
          </div>
        )}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {trips.map(trip => (
          <div 
            key={trip.id} 
            className="bg-white p-5 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-gray-100 active:scale-[0.98] transition-transform cursor-pointer relative overflow-hidden group"
            onClick={() => onSelectTrip(trip.id)}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="bg-blue-50 w-12 h-12 rounded-2xl flex items-center justify-center text-blue-600">
                <Palmtree size={24} />
              </div>
               <div className="flex items-center gap-1 text-gray-400 text-xs font-medium bg-gray-50 px-2 py-1 rounded-lg">
                  <Users size={12} />
                  {trip.participants.length}
               </div>
            </div>
            
            <div className="space-y-1 mb-8">
                <h3 className="text-xl font-bold text-gray-900">{trip.name}</h3>
                <div className="flex flex-wrap gap-y-1 gap-x-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {trip.tripDate ? new Date(trip.tripDate).toLocaleDateString('ar-SA') : new Date(trip.createdAt).toLocaleDateString('ar-SA')}
                  </span>
                  {trip.tripTime && (
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {trip.tripTime}
                    </span>
                  )}
                  {trip.location && (
                     <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {trip.location}
                    </span>
                  )}
                </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 flex border-t divide-x divide-x-reverse">
                {/* Delete Logic */}
                {deleteConfirmId === trip.id ? (
                     <div className="flex-1 flex bg-red-50 animate-in slide-in-from-bottom-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); onDeleteTrip(trip.id); }}
                            className="flex-1 py-3 text-xs font-bold text-red-600 hover:bg-red-100 flex items-center justify-center gap-1"
                        >
                            <Check size={14} /> تأكيد
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }}
                            className="w-14 py-3 text-xs font-bold text-gray-500 hover:bg-gray-100 flex items-center justify-center"
                        >
                            <X size={14} />
                        </button>
                     </div>
                ) : (
                    <button 
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(trip.id); }}
                        className="w-14 py-3 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center"
                    >
                        <Trash2 size={16} />
                    </button>
                )}

                {/* Edit Button */}
                <button 
                    onClick={(e) => openEditModal(e, trip)}
                    className="flex-1 py-3 text-xs font-bold text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                >
                    <Pencil size={14} />
                    تعديل
                </button>
            </div>
          </div>
        ))}
        
        {trips.length === 0 && sheetStatus === SheetStatus.SUCCESS && (
           <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-400 opacity-60">
             <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Palmtree size={40} />
             </div>
             <p className="font-medium">لا توجد رحلات حالياً</p>
           </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={editingTrip ? "تعديل بيانات الرحلة" : "إعداد القِطَّة الجديدة"}>
        <div className="space-y-5 max-h-[80vh] overflow-y-auto p-1">
          
          {/* 1. Basic Info */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">اسم المناسبة</label>
            <input 
              type="text" 
              autoFocus
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              className="w-full p-3 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all font-medium"
              placeholder="مثال: استراحة الخميس"
            />
          </div>

          {/* Date/Time/Location */}
          <div className="grid grid-cols-2 gap-3">
             <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">التاريخ</label>
                <input 
                  type="date" 
                  value={tripDate}
                  onChange={(e) => setTripDate(e.target.value)}
                  className="w-full p-2 bg-gray-50 rounded-lg text-sm"
                />
             </div>
             <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">الوقت</label>
                <input 
                  type="time" 
                  value={tripTime}
                  onChange={(e) => setTripTime(e.target.value)}
                  className="w-full p-2 bg-gray-50 rounded-lg text-sm"
                />
             </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">المكان</label>
            <input 
              type="text" 
              value={tripLocation}
              onChange={(e) => setTripLocation(e.target.value)}
              className="w-full p-2 bg-gray-50 rounded-lg text-sm"
              placeholder="الرياض، الشاليه..."
            />
          </div>

          {/* 2. Fees Config */}
          <div className="grid grid-cols-2 gap-3 bg-blue-50 p-3 rounded-xl">
            <div>
                <label className="block text-xs font-bold text-blue-800 mb-1">قطة الكبير</label>
                <input 
                    type="number" 
                    inputMode="decimal"
                    pattern="[0-9]*"
                    onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                    value={customAdultFee}
                    onChange={(e) => setCustomAdultFee(Number(e.target.value))}
                    className="w-full p-2 bg-[#333] text-white border border-blue-100 rounded-lg text-center font-mono font-bold focus:ring-blue-500 placeholder-gray-400"
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-blue-800 mb-1">قطة الصغير</label>
                <input 
                    type="number" 
                    inputMode="decimal"
                    pattern="[0-9]*"
                    onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                    value={customChildFee}
                    onChange={(e) => setCustomChildFee(Number(e.target.value))}
                    className="w-full p-2 bg-[#333] text-white border border-blue-100 rounded-lg text-center font-mono font-bold focus:ring-blue-500 placeholder-gray-400"
                />
            </div>
          </div>

          {/* 3. Participant Selection (ONLY CREATE MODE) */}
          {!editingTrip && (
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-gray-700">اختيار المشاركين ({selectedIds.size})</label>
                    <button onClick={toggleSelectAll} className="text-xs text-blue-600 font-medium">
                        {selectedIds.size === masterParticipants.length ? 'إلغاء الجميع' : 'تحديد الكل'}
                    </button>
                </div>
                
                <div className="border rounded-xl max-h-52 overflow-y-auto bg-gray-50 divide-y">
                    {masterParticipants.map(p => (
                        <div 
                            key={p.id} 
                            onClick={() => toggleSelection(p.id)}
                            className={`flex items-center p-3 cursor-pointer transition-colors ${selectedIds.has(p.id) ? 'bg-blue-50' : 'hover:bg-gray-100'}`}
                        >
                            <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 ml-3 ${selectedIds.has(p.id) ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 bg-white'}`}>
                                {selectedIds.has(p.id) && <CheckSquare size={14} />}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-gray-900">{p.name}</p>
                                <p className="text-xs text-gray-400">{getSimplifiedType(p.type)}</p>
                            </div>
                        </div>
                    ))}
                </div>
              </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
             <Button 
                onClick={handleSave} 
                disabled={!tripName || (!editingTrip && selectedIds.size === 0)} 
                className="w-full py-3 rounded-xl"
             >
                {editingTrip ? "حفظ التعديلات" : `إنشاء (${selectedIds.size})`}
             </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};