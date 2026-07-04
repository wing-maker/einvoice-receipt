export type ReceiptStatus = "pending" | "registered" | "skipped";

export interface Team {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  display_name: string | null;
  current_team_id: string | null;
  created_at: string;
}

export interface BuyerProfile {
  id: string;
  team_id: string;
  label: string;
  tin: string | null;
  reg_no: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
}

export interface Receipt {
  id: string;
  team_id: string;
  merchant_name: string | null;
  amount: number | null;
  image_path: string | null;
  purchase_date: string | null; // ISO date (YYYY-MM-DD)
  wait_days: number | null;
  register_open_date: string | null;
  register_deadline: string | null;
  qr_url: string | null;
  buyer_profile_id: string | null;
  status: ReceiptStatus;
  registered_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}
