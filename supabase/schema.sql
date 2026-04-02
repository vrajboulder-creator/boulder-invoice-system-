-- ============================================================
-- Boulder Construction CRM — Supabase Database Schema
-- Run this in the Supabase SQL Editor to create all tables
-- ============================================================

-- ── 1. USERS / AUTH ─────────────────────────────────────────
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  role text not null default 'User' check (role in ('Admin', 'Project Manager', 'Foreman', 'Office Manager', 'Safety Officer', 'User')),
  phone text,
  initials text,
  avatar_url text,
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  hire_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── 2. CLIENTS ──────────────────────────────────────────────
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  phone text,
  email text,
  address text,
  status text not null default 'Active' check (status in ('Active', 'Inactive', 'Lead')),
  last_contact date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── 3. PROJECTS ─────────────────────────────────────────────
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_id uuid references public.clients(id) on delete set null,
  status text not null default 'Planning' check (status in ('Planning', 'In Progress', 'On Hold', 'Completed')),
  progress integer default 0 check (progress >= 0 and progress <= 100),
  budget numeric(14,2) default 0,
  spent numeric(14,2) default 0,
  start_date date,
  deadline date,
  description text,
  phase text,
  contract_type text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── 4. PROJECT TEAM MEMBERS (junction) ──────────────────────
create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  role text,
  unique(project_id, user_id)
);

-- ── 5. PROJECT TASKS ────────────────────────────────────────
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  name text not null,
  phase text,
  status text not null default 'Pending' check (status in ('Pending', 'In Progress', 'Completed', 'On Hold')),
  assignee_id uuid references public.users(id) on delete set null,
  assignee_name text,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- ── 6. DAILY LOGS ───────────────────────────────────────────
create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  log_date date not null,
  summary text,
  crew_count integer default 0,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now()
);

-- ── 7. ESTIMATES ────────────────────────────────────────────
create table if not exists public.estimates (
  id uuid primary key default gen_random_uuid(),
  estimate_number text unique,
  client_id uuid references public.clients(id) on delete set null,
  project_name text,
  status text not null default 'Draft' check (status in ('Draft', 'Sent', 'Accepted', 'Rejected')),
  subtotal numeric(14,2) default 0,
  tax numeric(14,2) default 0,
  grand_total numeric(14,2) default 0,
  valid_until date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── 8. ESTIMATE LINE ITEMS ──────────────────────────────────
create table if not exists public.estimate_line_items (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid references public.estimates(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) default 1,
  unit_cost numeric(14,2) default 0,
  total numeric(14,2) default 0,
  sort_order integer default 0
);

-- ── 9. INVOICES ─────────────────────────────────────────────
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  amount numeric(14,2) not null,
  due_date date,
  issue_date date,
  paid_date date,
  status text not null default 'Pending' check (status in ('Draft', 'Pending', 'Paid', 'Overdue')),
  terms text default 'Net 30',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── 10. INVOICE LINE ITEMS ──────────────────────────────────
create table if not exists public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) default 1,
  unit_cost numeric(14,2) default 0,
  total numeric(14,2) default 0,
  sort_order integer default 0
);

-- ── 11. SUBCONTRACTORS ──────────────────────────────────────
create table if not exists public.subcontractors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trade text,
  contact_person text,
  phone text,
  email text,
  address text,
  license_number text,
  insurance_expiry date,
  rating numeric(2,1) default 0,
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  certifications text[], -- array of certification names
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── 12. TIMESHEET ENTRIES ───────────────────────────────────
create table if not exists public.timesheet_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  employee_name text,
  project_id uuid references public.projects(id) on delete set null,
  project_name text,
  phase text,
  entry_date date not null,
  clock_in time,
  clock_out time,
  hours numeric(5,2) default 0,
  status text not null default 'Pending Approval' check (status in ('Pending Approval', 'Approved', 'Rejected')),
  created_at timestamptz default now()
);

-- ── 13. CHANGE ORDERS ───────────────────────────────────────
create table if not exists public.change_orders (
  id uuid primary key default gen_random_uuid(),
  co_number text unique,
  project_id uuid references public.projects(id) on delete set null,
  description text not null,
  amount numeric(14,2) default 0,
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Under Review', 'Rejected')),
  requested_by text,
  co_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── 14. CHANGE ORDER VERSIONS ───────────────────────────────
create table if not exists public.change_order_versions (
  id uuid primary key default gen_random_uuid(),
  change_order_id uuid references public.change_orders(id) on delete cascade,
  version_number integer not null,
  amount numeric(14,2) default 0,
  notes text,
  version_date date,
  created_at timestamptz default now()
);

-- ── 15. RFIs ────────────────────────────────────────────────
create table if not exists public.rfis (
  id uuid primary key default gen_random_uuid(),
  rfi_number text unique,
  project_id uuid references public.projects(id) on delete set null,
  subject text not null,
  status text not null default 'Open' check (status in ('Open', 'Responded', 'Closed')),
  submitted_by text,
  date_submitted date,
  date_responded date,
  response text,
  created_at timestamptz default now()
);

-- ── 16. DOCUMENTS ───────────────────────────────────────────
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  file_type text,
  project_id uuid references public.projects(id) on delete set null,
  category text,
  file_size text,
  file_url text, -- Supabase Storage URL
  uploaded_by uuid references public.users(id) on delete set null,
  uploaded_by_name text,
  upload_date date default current_date,
  created_at timestamptz default now()
);

-- ── 17. PAY APPLICATIONS (AIA G702) ────────────────────────
create table if not exists public.pay_applications (
  id uuid primary key default gen_random_uuid(),
  application_no integer not null,
  project_id uuid references public.projects(id) on delete set null,
  is_subcontractor_version boolean default false,
  subcontractor_id uuid references public.subcontractors(id) on delete set null,
  owner_name text,
  owner_address text,
  contractor_name text default 'Boulder Construction',
  contractor_address text default '123 Commerce Way, Newark, NJ 07102',
  architect_name text,
  architect_address text,
  contract_for text,
  contract_date date,
  period_to date,
  application_date date,
  original_contract_sum numeric(14,2) default 0,
  net_change_orders numeric(14,2) default 0,
  contract_sum_to_date numeric(14,2) default 0,
  total_completed_and_stored numeric(14,2) default 0,
  retainage_percent numeric(5,2) default 10,
  retainage_on_completed numeric(14,2) default 0,
  retainage_on_stored numeric(14,2) default 0,
  total_retainage numeric(14,2) default 0,
  total_earned_less_retainage numeric(14,2) default 0,
  less_previous_certificates numeric(14,2) default 0,
  current_payment_due numeric(14,2) default 0,
  balance_to_finish numeric(14,2) default 0,
  status text not null default 'Draft' check (status in ('Draft', 'Submitted', 'Approved', 'Paid', 'Rejected')),
  -- Change order summary
  co_previous_additions numeric(14,2) default 0,
  co_previous_deductions numeric(14,2) default 0,
  co_this_month_additions numeric(14,2) default 0,
  co_this_month_deductions numeric(14,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── 18. PAY APPLICATION LINE ITEMS (G703) ───────────────────
create table if not exists public.pay_application_line_items (
  id uuid primary key default gen_random_uuid(),
  pay_application_id uuid references public.pay_applications(id) on delete cascade,
  item_no integer not null,
  description text not null,
  scheduled_value numeric(14,2) default 0,
  previous_application numeric(14,2) default 0,
  this_period numeric(14,2) default 0,
  materials_stored numeric(14,2) default 0,
  total_completed numeric(14,2) default 0,
  percent_complete numeric(5,1) default 0,
  balance_to_finish numeric(14,2) default 0,
  retainage numeric(14,2) default 0,
  is_change_order boolean default false,
  sort_order integer default 0
);

-- ── 19. PAY APP BACKUP / DRAW HISTORY ───────────────────────
create table if not exists public.pay_app_draw_history (
  id uuid primary key default gen_random_uuid(),
  pay_application_id uuid references public.pay_applications(id) on delete cascade,
  draw_number integer not null,
  g703_item_no integer,
  description text,
  commentary text,
  amount numeric(14,2) default 0,
  retainage numeric(14,2) default 0,
  net_amount numeric(14,2) default 0,
  sort_order integer default 0
);

-- ── 20. LIEN WAIVERS ────────────────────────────────────────
create table if not exists public.lien_waivers (
  id uuid primary key default gen_random_uuid(),
  form_type text not null check (form_type in ('K1', 'K2', 'K3', 'K4')),
  form_title text,
  statute text default 'TEX. PROP. CODE § 53.284',
  project_id uuid references public.projects(id) on delete set null,
  pay_application_id uuid references public.pay_applications(id) on delete set null,
  owner_name text,
  owner_address text,
  property_location text,
  signer_company text,
  signer_name text,
  signer_title text,
  maker_of_check text default 'Boulder Construction',
  check_amount numeric(14,2) default 0,
  payable_to text,
  job_description text,
  waiver_date date,
  status text not null default 'Draft' check (status in ('Draft', 'Pending Signature', 'Signed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── 21. COMMUNICATION LOG ───────────────────────────────────
create table if not exists public.communication_log (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  comm_date date,
  comm_type text check (comm_type in ('Email', 'Phone', 'Meeting', 'Text', 'Other')),
  subject text,
  notes text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now()
);

-- ── 22. NOTIFICATIONS ───────────────────────────────────────
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  message text not null,
  type text default 'info' check (type in ('info', 'warning', 'error', 'success')),
  read boolean default false,
  created_at timestamptz default now()
);

-- ── 23. SCHEDULE EVENTS ─────────────────────────────────────
create table if not exists public.schedule_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  project_id uuid references public.projects(id) on delete set null,
  start_date date not null,
  end_date date,
  color text default '#3b82f6',
  event_type text default 'task' check (event_type in ('task', 'milestone', 'delivery', 'inspection', 'meeting', 'training')),
  created_at timestamptz default now()
);

-- ── 24. MATERIAL CATALOG ────────────────────────────────────
create table if not exists public.material_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit text,
  cost_per_unit numeric(10,2) default 0,
  created_at timestamptz default now()
);

-- ── 25. JOB COST DATA ───────────────────────────────────────
create table if not exists public.job_costs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  category text not null check (category in ('Labor', 'Materials', 'Subcontractors', 'Equipment', 'General Conditions')),
  budgeted numeric(14,2) default 0,
  actual numeric(14,2) default 0,
  created_at timestamptz default now()
);


-- ============================================================
-- ROW LEVEL SECURITY (RLS) — Enable on all tables
-- ============================================================
-- For now, allow all authenticated users full access.
-- Refine per-role policies in Phase 2.

alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;
alter table public.daily_logs enable row level security;
alter table public.estimates enable row level security;
alter table public.estimate_line_items enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_line_items enable row level security;
alter table public.subcontractors enable row level security;
alter table public.timesheet_entries enable row level security;
alter table public.change_orders enable row level security;
alter table public.change_order_versions enable row level security;
alter table public.rfis enable row level security;
alter table public.documents enable row level security;
alter table public.pay_applications enable row level security;
alter table public.pay_application_line_items enable row level security;
alter table public.pay_app_draw_history enable row level security;
alter table public.lien_waivers enable row level security;
alter table public.communication_log enable row level security;
alter table public.notifications enable row level security;
alter table public.schedule_events enable row level security;
alter table public.material_catalog enable row level security;
alter table public.job_costs enable row level security;

-- Allow anon/authenticated full access for development (tighten in production)
create policy "Allow all for authenticated" on public.users for all using (true) with check (true);
create policy "Allow all for authenticated" on public.clients for all using (true) with check (true);
create policy "Allow all for authenticated" on public.projects for all using (true) with check (true);
create policy "Allow all for authenticated" on public.project_members for all using (true) with check (true);
create policy "Allow all for authenticated" on public.tasks for all using (true) with check (true);
create policy "Allow all for authenticated" on public.daily_logs for all using (true) with check (true);
create policy "Allow all for authenticated" on public.estimates for all using (true) with check (true);
create policy "Allow all for authenticated" on public.estimate_line_items for all using (true) with check (true);
create policy "Allow all for authenticated" on public.invoices for all using (true) with check (true);
create policy "Allow all for authenticated" on public.invoice_line_items for all using (true) with check (true);
create policy "Allow all for authenticated" on public.subcontractors for all using (true) with check (true);
create policy "Allow all for authenticated" on public.timesheet_entries for all using (true) with check (true);
create policy "Allow all for authenticated" on public.change_orders for all using (true) with check (true);
create policy "Allow all for authenticated" on public.change_order_versions for all using (true) with check (true);
create policy "Allow all for authenticated" on public.rfis for all using (true) with check (true);
create policy "Allow all for authenticated" on public.documents for all using (true) with check (true);
create policy "Allow all for authenticated" on public.pay_applications for all using (true) with check (true);
create policy "Allow all for authenticated" on public.pay_application_line_items for all using (true) with check (true);
create policy "Allow all for authenticated" on public.pay_app_draw_history for all using (true) with check (true);
create policy "Allow all for authenticated" on public.lien_waivers for all using (true) with check (true);
create policy "Allow all for authenticated" on public.communication_log for all using (true) with check (true);
create policy "Allow all for authenticated" on public.notifications for all using (true) with check (true);
create policy "Allow all for authenticated" on public.schedule_events for all using (true) with check (true);
create policy "Allow all for authenticated" on public.material_catalog for all using (true) with check (true);
create policy "Allow all for authenticated" on public.job_costs for all using (true) with check (true);


-- ============================================================
-- INDEXES for common queries
-- ============================================================
create index if not exists idx_projects_client on public.projects(client_id);
create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_invoices_client on public.invoices(client_id);
create index if not exists idx_invoices_project on public.invoices(project_id);
create index if not exists idx_invoices_status on public.invoices(status);
create index if not exists idx_tasks_project on public.tasks(project_id);
create index if not exists idx_timesheet_user on public.timesheet_entries(user_id);
create index if not exists idx_timesheet_project on public.timesheet_entries(project_id);
create index if not exists idx_pay_apps_project on public.pay_applications(project_id);
create index if not exists idx_lien_waivers_project on public.lien_waivers(project_id);
create index if not exists idx_change_orders_project on public.change_orders(project_id);
create index if not exists idx_documents_project on public.documents(project_id);
create index if not exists idx_schedule_events_project on public.schedule_events(project_id);
create index if not exists idx_job_costs_project on public.job_costs(project_id);


-- ============================================================
-- UPDATED_AT trigger function
-- ============================================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply to tables with updated_at column
create trigger set_updated_at before update on public.users for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.clients for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.projects for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.estimates for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.invoices for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.subcontractors for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.change_orders for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.pay_applications for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.lien_waivers for each row execute function public.update_updated_at();
