-- HyperMCP Hub Database Schema
-- Run these migrations in Supabase to set up the orchestration layer tables

-- Hub Connections Table
CREATE TABLE hub_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'disconnected',
  provider VARCHAR(100),
  config JSONB NOT NULL DEFAULT '{}',
  credentials_encrypted VARCHAR(2000),
  last_sync TIMESTAMP,
  last_error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Hub Workflows Table
CREATE TABLE hub_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  actions JSONB NOT NULL DEFAULT '[]',
  routing_rules JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Hub Logs Table
CREATE TABLE hub_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES hub_workflows(id),
  connection_id UUID REFERENCES hub_connections(id),
  level VARCHAR(50),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Hub Cost Tracking
CREATE TABLE hub_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES hub_connections(id),
  workflow_id UUID REFERENCES hub_workflows(id),
  cost_amount DECIMAL(10, 4),
  cost_type VARCHAR(100),
  date DATE DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Hub Audit Trail
CREATE TABLE hub_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(100),
  entity_id UUID,
  action VARCHAR(100),
  actor VARCHAR(255),
  changes JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_hub_connections_status ON hub_connections(status);
CREATE INDEX idx_hub_workflows_status ON hub_workflows(status);
CREATE INDEX idx_hub_logs_workflow ON hub_logs(workflow_id);
CREATE INDEX idx_hub_logs_created ON hub_logs(created_at);
CREATE INDEX idx_hub_audit_entity ON hub_audit_trail(entity_type, entity_id);
CREATE INDEX idx_hub_audit_date ON hub_audit_trail(created_at);
