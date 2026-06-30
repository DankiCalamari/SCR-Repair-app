export type UserRole = "admin" | "staff" | "customer";

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login: string | null;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export type RepairStatus =
  | "lead"
  | "device_received"
  | "diagnosing"
  | "waiting_for_customer"
  | "waiting_for_parts"
  | "in_progress"
  | "repaired"
  | "ready_for_collection"
  | "completed"
  | "cancelled";

export interface Repair {
  id: string;
  ticket_number: string;
  customer_id: string;
  device_id: string;
  status: RepairStatus;
  issue_description: string;
  diagnosis: string | null;
  repair_notes: string | null;
  labour_hours: string | null;
  labour_cost: string | null;
  parts_cost: string | null;
  estimated_completion: string | null;
  intake_date: string;
  completed_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface RepairDetail extends Repair {
  customer: Customer | null;
  device: Device | null;
  status_history: RepairStatusHistory[];
  photos: Photo[];
  documents: Document[];
  quotes: Quote[];
  invoices: Invoice[];
  timeline: RepairTimelineEntry[];
}

export interface RepairStatusHistory {
  id: string;
  repair_id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface RepairTimelineEntry {
  timestamp: string;
  status: string;
  notes: string | null;
  changed_by: string | null;
}

export interface CreateRepairRequest {
  customer_id: string;
  device_id: string;
  issue_description: string;
  status?: string;
  diagnosis?: string | null;
  repair_notes?: string | null;
  labour_hours?: string | null;
  labour_cost?: string | null;
  parts_cost?: string | null;
  estimated_completion?: string | null;
}

export interface UpdateRepairRequest {
  status?: string | null;
  issue_description?: string | null;
  diagnosis?: string | null;
  repair_notes?: string | null;
  labour_hours?: string | null;
  labour_cost?: string | null;
  parts_cost?: string | null;
  estimated_completion?: string | null;
}

export interface UpdateRepairStatusRequest {
  status: string;
  notes?: string | null;
}

export interface Customer {
  id: string;
  user_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerWithRepairs extends Customer {
  devices: Device[];
  repairs: Repair[];
}

export interface CreateCustomerRequest {
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface UpdateCustomerRequest {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface Device {
  id: string;
  customer_id: string;
  device_type: string;
  brand: string;
  model: string;
  imei: string | null;
  serial_number: string | null;
  colour: string | null;
  passcode: string | null;
  accessories: string | null;
  existing_damage: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDeviceRequest {
  customer_id: string;
  device_type: string;
  brand: string;
  model: string;
  imei?: string | null;
  serial_number?: string | null;
  colour?: string | null;
  passcode?: string | null;
  accessories?: string | null;
  existing_damage?: string | null;
}

export interface UpdateDeviceRequest {
  device_type?: string | null;
  brand?: string | null;
  model?: string | null;
  imei?: string | null;
  serial_number?: string | null;
  colour?: string | null;
  passcode?: string | null;
  accessories?: string | null;
  existing_damage?: string | null;
}

export type PhotoCategory =
  | "intake"
  | "damage"
  | "diagnostic"
  | "repair_progress"
  | "parts_replacement"
  | "completed"
  | "warranty"
  | "general";

export interface Photo {
  id: string;
  repair_id: string | null;
  device_id: string | null;
  customer_id: string | null;
  uploaded_by: string | null;
  category: PhotoCategory;
  filename: string;
  original_filename: string;
  file_path: string;
  thumbnail_path: string | null;
  medium_path: string | null;
  file_size: number | null;
  mime_type: string;
  width: number | null;
  height: number | null;
  notes: string | null;
  tags: string | null;
  is_important: boolean;
  sort_order: number;
  created_at: string;
}

export interface PhotoUpdateRequest {
  category?: PhotoCategory;
  notes?: string;
  tags?: string;
  is_important?: boolean;
  sort_order?: number;
}

export interface PhotoCategoryCount {
  category: PhotoCategory;
  count: number;
}

export type DocumentType =
  | "intake_receipt"
  | "quote"
  | "quote_approval"
  | "invoice"
  | "collection_receipt"
  | "warranty_receipt";

export interface Document {
  id: string;
  repair_id: string | null;
  document_type: DocumentType;
  filename: string;
  file_path: string;
  file_size: string | null;
  generated_by: string | null;
  created_at: string;
}

export type QuoteStatus = "draft" | "sent" | "approved" | "declined" | "expired";

export interface QuoteItem {
  id: string;
  quote_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  item_type: string;
  sort_order: number;
}

export interface Quote {
  id: string;
  quote_number: string;
  repair_id: string;
  labour_cost: number;
  parts_cost: number;
  gst_amount: number;
  total_amount: number;
  description: string | null;
  status: QuoteStatus;
  created_by: string | null;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
  items: QuoteItem[];
}

export interface QuoteApproval {
  id: string;
  quote_id: string;
  action: string;
  ip_address: string | null;
  user_agent: string | null;
  digital_signature: string | null;
  notes: string | null;
  created_at: string;
}

export interface CreateQuoteItemRequest {
  description: string;
  quantity?: number;
  unit_price?: number;
  total?: number;
  item_type?: string;
  sort_order?: number;
}

export interface CreateQuoteRequest {
  repair_id: string;
  labour_cost?: number;
  parts_cost?: number;
  description?: string | null;
  valid_until?: string | null;
  items?: CreateQuoteItemRequest[];
}

export interface UpdateQuoteRequest {
  labour_cost?: number | null;
  parts_cost?: number | null;
  gst_amount?: number | null;
  total_amount?: number | null;
  description?: string | null;
  status?: string | null;
  valid_until?: string | null;
}

export interface ApproveQuoteRequest {
  action: "approve" | "decline";
  digital_signature?: string | null;
  notes?: string | null;
}

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  item_type: string;
  sort_order: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  repair_id: string;
  quote_id: string | null;
  subtotal: number;
  gst_amount: number;
  total_amount: number;
  status: InvoiceStatus;
  due_date: string | null;
  paid_date: string | null;
  paid_amount: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  items: InvoiceItem[];
}

export interface CreateInvoiceRequest {
  repair_id: string;
  quote_id?: string | null;
  subtotal?: number;
  gst_amount?: number;
  total_amount?: number;
  due_date?: string | null;
  notes?: string | null;
  items?: CreateInvoiceItemRequest[];
}

export interface CreateInvoiceItemRequest {
  description: string;
  quantity?: number;
  unit_price?: number;
  total?: number;
  item_type?: string;
  sort_order?: number;
}

export interface UpdateInvoiceRequest {
  subtotal?: number | null;
  gst_amount?: number | null;
  total_amount?: number | null;
  status?: string | null;
  due_date?: string | null;
  paid_date?: string | null;
  paid_amount?: number | null;
  notes?: string | null;
}

export interface MarkInvoicePaidRequest {
  paid_amount: number;
  paid_date?: string | null;
  notes?: string | null;
}

export type SmsDirection = "outbound" | "inbound";
export type SmsMessageStatus = "pending" | "sent" | "delivered" | "failed";

export interface SmsMessage {
  id: string;
  repair_id: string | null;
  customer_id: string | null;
  direction: SmsDirection;
  status: SmsMessageStatus;
  from_number: string;
  to_number: string;
  body: string;
  external_id: string | null;
  error_message: string | null;
  delivered_at: string | null;
  created_at: string;
}

export interface SendSmsRequest {
  to_number: string;
  body: string;
  repair_id?: string | null;
  customer_id?: string | null;
}

export interface SmsTemplate {
  id: string;
  name: string;
  body: string;
  variables: string[];
}

export interface SmsGatewayStatus {
  connected: boolean;
  device_id: string | null;
  signal_strength: number | null;
  last_seen: string | null;
  pending_count: number;
}

export type EmailDirection = "outbound" | "inbound";
export type EmailStatus = "pending" | "sent" | "received" | "failed";

export interface EmailMessage {
  id: string;
  repair_id: string | null;
  customer_id: string | null;
  direction: EmailDirection;
  status: EmailStatus;
  from_address: string;
  to_address: string;
  subject: string;
  body: string;
  body_html: string | null;
  external_id: string | null;
  error_message: string | null;
  created_at: string;
}

export interface SendEmailRequest {
  to_address: string;
  subject: string;
  body: string;
  body_html?: string | null;
  repair_id?: string | null;
  customer_id?: string | null;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  body_html: string | null;
  variables: string[];
  created_at: string;
  updated_at: string;
}

export interface EmailTemplateSendRequest {
  template_id: string;
  repair_id?: string | null;
  customer_id?: string | null;
}

export interface EmailServiceStatus {
  smtp_configured: boolean;
  imap_configured: boolean;
  smtp_host: string | null;
  smtp_port: number | null;
  imap_host: string | null;
  imap_port: number | null;
  from_email: string | null;
  from_name: string | null;
}

export type WarrantyStatus = "active" | "expired" | "claimed" | "void";
export type WarrantyClaimStatus = "pending" | "approved" | "rejected" | "resolved";

export interface WarrantyRecord {
  id: string;
  repair_id: string;
  warranty_number: string;
  issue_date: string;
  expiry_date: string;
  status: WarrantyStatus;
  notes: string | null;
  created_at: string;
}

export interface WarrantyClaim {
  id: string;
  warranty_id: string;
  description: string;
  status: WarrantyClaimStatus;
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface WarrantyValidation {
  valid: boolean;
  warranty_number: string | null;
  status: string | null;
  expiry_date: string | null;
  message: string;
}

export type LeadStatus = "new" | "contacted" | "converted" | "closed";
export type PreferredContactMethod = "phone" | "email" | "sms";

export interface Lead {
  id: string;
  customer_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  device_type: string | null;
  device_model: string | null;
  issue_description: string | null;
  preferred_contact_method: PreferredContactMethod;
  status: LeadStatus;
  source: string | null;
  notes: string | null;
  converted_repair_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateLeadRequest {
  name: string;
  phone: string;
  email?: string | null;
  device_type?: string | null;
  device_model?: string | null;
  issue_description?: string | null;
  preferred_contact_method?: string;
  source?: string | null;
  notes?: string | null;
  customer_id?: string | null;
}

export interface UpdateLeadRequest {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  device_type?: string | null;
  device_model?: string | null;
  issue_description?: string | null;
  preferred_contact_method?: string | null;
  status?: string | null;
  source?: string | null;
  notes?: string | null;
  customer_id?: string | null;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface DashboardStats {
  total_repairs: number;
  active_repairs: number;
  completed_repairs: number;
  pending_quotes: number;
  overdue_invoices: number;
  total_revenue: number;
  outstanding_balance: number;
  new_leads: number;
  warranty_claims: number;
}

export interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  entity_type: string | null;
  entity_id: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  skip: number;
  limit: number;
}

export interface ApiError {
  detail: string;
}
