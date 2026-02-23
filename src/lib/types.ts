export type SystemRole = 'General' | 'Admin' | 'Temp_Admin';

export type Job = 'Doctor' | 'Paramedic' | 'Medic' | 'Logistical' | 'Other';

export type Rank =
  | 'Rabat'
  | 'Samal'
  | 'Samar'
  | 'Rasal'
  | 'Rasar'
  | 'Rasam'
  | 'Rasab'
  | 'Ranag'
  | 'Sagam'
  | 'Segen'
  | 'Seren'
  | 'Rasan'
  | "Sa'al"
  | 'Alam'
  | "Ta'al"
  | 'Aluf'
  | "Ra'al"
  | 'Kama'
  | "Ka'ab"
  | "Ka'am";

export const RANK_LABELS: Record<Rank, string> = {
  Rabat: 'רב״ט',
  Samal: 'סמל',
  Samar: 'סמ״ר',
  Rasal: 'רס״ל',
  Rasar: 'רס״ר',
  Rasam: 'רס״מ',
  Rasab: 'רס״ב',
  Ranag: 'רנ״ג',
  Sagam: 'סג״ם',
  Segen: 'סגן',
  Seren: 'סרן',
  Rasan: 'רס״ן',
  "Sa'al": 'סא״ל',
  Alam: 'אל״ם',
  "Ta'al": 'תא״ל',
  Aluf: 'אלוף',
  "Ra'al": 'רא״ל',
  Kama: 'קמ״א',
  "Ka'ab": 'קא״ב',
  "Ka'am": 'קא״ם',
};

export const RANKS: Rank[] = Object.keys(RANK_LABELS) as Rank[];
export const JOBS: Job[] = ['Doctor', 'Paramedic', 'Medic', 'Logistical', 'Other'];
export const SYSTEM_ROLES: SystemRole[] = ['General', 'Admin', 'Temp_Admin'];

export type ActionType = 'Given' | 'Administered' | 'Returned' | 'Lost/Damaged';

export interface User {
  id: string;
  military_id: number;
  full_name: string;
  rank: Rank;
  job: Job;
  phone_number: string;
  system_role: SystemRole;
  email: string | null;
  role_expiration_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryBatch {
  id: string;
  drug_category: 'Actiq' | 'Other';
  amount_received: number;
  date_received: string;
  receiving_admin_id: string;
  lot_number: string | null;
  expiration_date: string | null;
  other_drugs_notes: string | null;
  created_at: string;
}

export interface ActiveAssignment {
  id: string;
  soldier_id: string;
  actiq_balance: number;
  other_drugs_text: string | null;
  last_assigned_date: string;
  last_assigned_by: string;
  updated_at: string;
  soldier?: User;
  assigned_by_user?: User;
}

export interface ActionLog {
  id: string;
  action_type: ActionType;
  actiq_amount: number;
  other_drugs_text: string | null;
  timestamp: string;
  admin_id: string;
  soldier_id: string;
  signature_image_url: string | null;
  admin?: User;
  soldier?: User;
}
