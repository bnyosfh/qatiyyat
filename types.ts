
export interface MasterParticipant {
  id: string;
  name: string;
  type: 'كبير' | 'صغير' | string;
}

export interface TripParticipant extends MasterParticipant {
  fee: number;
  paidAmount: number;
  notes?: string;
  paymentMethod?: string; // New field for tracking how they paid
}

export interface Expense {
  id: string;
  payerId: string | 'POOL'; // 'POOL' means paid from the collected fund
  amount: number; // The actual expense amount registered
  originalAmount?: number; 
  feeCoveredAmount?: number;
  description: string;
  date: string;
}

export interface Trip {
  id: string;
  name: string;
  createdAt: string;
  // New Fields
  tripDate?: string;
  tripTime?: string;
  location?: string;
  
  adultFee: number; // Stored config
  childFee: number; // Stored config
  participants: TripParticipant[];
  expenses: Expense[];
}

export enum SheetStatus {
  IDLE,
  LOADING,
  SUCCESS,
  ERROR
}