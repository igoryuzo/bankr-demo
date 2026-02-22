-- Agent logs: captures every agent action
create table agent_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  type text not null, -- prompt, response, trade, error, balance_update, analysis
  content text not null, -- human-readable message shown in feed
  raw_data jsonb,
  job_id text,
  thread_id text
);

create index idx_agent_logs_created_at on agent_logs (created_at desc);
create index idx_agent_logs_type on agent_logs (type);

-- Trades: structured trade records
create table trades (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  token_in text not null,
  token_out text not null,
  amount_in text not null,
  amount_out text,
  status text not null default 'pending', -- pending, completed, failed
  job_id text,
  tx_hash text,
  raw_response jsonb
);

create index idx_trades_created_at on trades (created_at desc);
create index idx_trades_status on trades (status);

-- Balances: periodic balance snapshots
create table balances (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  total_usd numeric not null default 0,
  breakdown jsonb
);

create index idx_balances_created_at on balances (created_at desc);

-- Enable Realtime on agent_logs and balances
alter publication supabase_realtime add table agent_logs;
alter publication supabase_realtime add table balances;
alter publication supabase_realtime add table trades;
