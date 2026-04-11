-- Supabase Schema for CEE MEDIA

-- 1. Analytics Table
CREATE TABLE IF NOT EXISTS analytics (
  id TEXT PRIMARY KEY,
  total_visitors INTEGER DEFAULT 0,
  daily_visitors JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Polls Table
CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  votes JSONB DEFAULT '{}'::jsonb,
  total_votes INTEGER DEFAULT 0,
  image TEXT,
  likes INTEGER DEFAULT 0,
  is_ended BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Posts Table
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  image TEXT,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Messages Table (Confessions)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  author TEXT DEFAULT 'Anonymous',
  likes INTEGER DEFAULT 0,
  approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Team Table
CREATE TABLE IF NOT EXISTS team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  image TEXT,
  bio TEXT,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Message Comments Table
CREATE TABLE IF NOT EXISTS message_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES message_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Post Comments Table
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Ads Table
CREATE TABLE IF NOT EXISTS ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT CHECK (media_type IN ('image', 'video')),
  link_url TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Functions to increment ad metrics
CREATE OR REPLACE FUNCTION increment_ad_impressions(ad_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE ads
  SET impressions = impressions + 1
  WHERE id = ad_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_ad_clicks(ad_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE ads
  SET clicks = clicks + 1
  WHERE id = ad_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Storage Setup (Run these manually in SQL Editor if storage.buckets table exists)
-- Create storage bucket for media (images and videos)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Set up access policies for the bucket
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'media');

DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media');

DROP POLICY IF EXISTS "Public Update" ON storage.objects;
CREATE POLICY "Public Update" ON storage.objects FOR UPDATE USING (bucket_id = 'media');

DROP POLICY IF EXISTS "Public Delete" ON storage.objects;
CREATE POLICY "Public Delete" ON storage.objects FOR DELETE USING (bucket_id = 'media');

-- 11. Mock Exam Tables
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  category TEXT NOT NULL CHECK (category IN ('Art', 'Physical Science', 'Life Science')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Art', 'Physical Science', 'Life Science')),
  participant_name TEXT NOT NULL,
  department TEXT,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES tokens(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  answers JSONB NOT NULL,
  time_taken INTEGER NOT NULL, -- in seconds
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for Mock Exam Tables
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Mock Exam Policies
DROP POLICY IF EXISTS "Public Read Questions" ON questions;
CREATE POLICY "Public Read Questions" ON questions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Tokens" ON tokens;
CREATE POLICY "Public Read Tokens" ON tokens FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Submissions" ON submissions;
CREATE POLICY "Public Read Submissions" ON submissions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow All Questions" ON questions;
CREATE POLICY "Allow All Questions" ON questions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow All Tokens" ON tokens;
CREATE POLICY "Allow All Tokens" ON tokens FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow All Submissions" ON submissions;
CREATE POLICY "Allow All Submissions" ON submissions FOR ALL USING (true) WITH CHECK (true);

-- RPC Function to submit mock exam and calculate score securely
CREATE OR REPLACE FUNCTION submit_mock_exam_securely(
  p_token_id UUID,
  p_answers JSONB,
  p_time_taken INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_question_id UUID;
  v_user_answer TEXT;
  v_correct_answer TEXT;
  v_is_used BOOLEAN;
BEGIN
  -- 1. Check if token is already used
  SELECT is_used INTO v_is_used FROM tokens WHERE id = p_token_id;
  
  IF v_is_used THEN
    RAISE EXCEPTION 'Token already used';
  END IF;

  -- 2. Calculate score
  FOR v_question_id, v_user_answer IN SELECT * FROM jsonb_each_text(p_answers)
  LOOP
    SELECT correct_answer INTO v_correct_answer FROM questions WHERE id = v_question_id::UUID;
    IF v_user_answer = v_correct_answer THEN
      v_score := v_score + 1;
    END IF;
  END LOOP;

  -- 3. Mark token as used
  UPDATE tokens 
  SET is_used = TRUE, used_at = NOW() 
  WHERE id = p_token_id;

  -- 4. Insert submission
  INSERT INTO submissions (token_id, score, answers, time_taken)
  VALUES (p_token_id, v_score, p_answers, p_time_taken);

  RETURN v_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE team ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
-- Analytics
DROP POLICY IF EXISTS "Public Read" ON analytics;
CREATE POLICY "Public Read" ON analytics FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow All" ON analytics;
CREATE POLICY "Allow All" ON analytics FOR ALL USING (true) WITH CHECK (true);

-- Polls
DROP POLICY IF EXISTS "Public Read" ON polls;
CREATE POLICY "Public Read" ON polls FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow All" ON polls;
CREATE POLICY "Allow All" ON polls FOR ALL USING (true) WITH CHECK (true);

-- Poll Groups
DROP POLICY IF EXISTS "Public Read" ON poll_groups;
CREATE POLICY "Public Read" ON poll_groups FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow All" ON poll_groups;
CREATE POLICY "Allow All" ON poll_groups FOR ALL USING (true) WITH CHECK (true);

-- Posts
DROP POLICY IF EXISTS "Public Read" ON posts;
CREATE POLICY "Public Read" ON posts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow All" ON posts;
CREATE POLICY "Allow All" ON posts FOR ALL USING (true) WITH CHECK (true);

-- Messages
DROP POLICY IF EXISTS "Public Read" ON messages;
CREATE POLICY "Public Read" ON messages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow All" ON messages;
CREATE POLICY "Allow All" ON messages FOR ALL USING (true) WITH CHECK (true);

-- Team
DROP POLICY IF EXISTS "Public Read" ON team;
CREATE POLICY "Public Read" ON team FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow All" ON team;
CREATE POLICY "Allow All" ON team FOR ALL USING (true) WITH CHECK (true);

-- Message Comments
DROP POLICY IF EXISTS "Public Read" ON message_comments;
CREATE POLICY "Public Read" ON message_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow All" ON message_comments;
CREATE POLICY "Allow All" ON message_comments FOR ALL USING (true) WITH CHECK (true);

-- Post Comments
DROP POLICY IF EXISTS "Public Read" ON post_comments;
CREATE POLICY "Public Read" ON post_comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow All" ON post_comments;
CREATE POLICY "Allow All" ON post_comments FOR ALL USING (true) WITH CHECK (true);

-- Ads
DROP POLICY IF EXISTS "Public Read" ON ads;
CREATE POLICY "Public Read" ON ads FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow All" ON ads;
CREATE POLICY "Allow All" ON ads FOR ALL USING (true) WITH CHECK (true);

-- Storage Policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'media');
DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media');
DROP POLICY IF EXISTS "Public Update" ON storage.objects;
CREATE POLICY "Public Update" ON storage.objects FOR UPDATE USING (bucket_id = 'media');
DROP POLICY IF EXISTS "Public Delete" ON storage.objects;
CREATE POLICY "Public Delete" ON storage.objects FOR DELETE USING (bucket_id = 'media');
