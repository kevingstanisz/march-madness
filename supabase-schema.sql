-- ============================================
-- MARCH MADNESS DRAFT APP - SUPABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  draft_order INTEGER NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) NOT NULL,
  team_name TEXT NOT NULL UNIQUE,
  seed INTEGER NOT NULL,
  pick_number INTEGER NOT NULL,
  auto_assigned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE draft_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  current_pick_number INTEGER DEFAULT 0,
  current_player_id UUID REFERENCES players(id),
  player_order UUID[],
  is_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 1: Authentication > Users > Add User
-- Create ONE user (admin). Copy their UUID.
-- ============================================
-- STEP 2: Run this with your real values:

-- INSERT INTO players (auth_user_id, name, email, phone, draft_order, is_admin) VALUES
--   ('ADMIN_UUID', 'Your Name', 'you@email.com', '+13125550001', 1, TRUE),
--   (NULL, 'Player 2', 'p2@email.com', '+13125550002', 2, FALSE),
--   (NULL, 'Player 3', 'p3@email.com', '+13125550003', 3, FALSE),
--   (NULL, 'Player 4', 'p4@email.com', '+13125550004', 4, FALSE);

-- Phone format: +1XXXXXXXXXX (US numbers)
