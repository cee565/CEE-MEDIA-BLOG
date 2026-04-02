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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE team ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for security)
-- For now, we'll allow public read and authenticated write (simulated by admin password in app)
-- In a real app, you'd use Supabase Auth

DROP POLICY IF EXISTS "Public Read" ON analytics;
CREATE POLICY "Public Read" ON analytics FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read" ON polls;
CREATE POLICY "Public Read" ON polls FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read" ON posts;
CREATE POLICY "Public Read" ON posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read" ON messages;
CREATE POLICY "Public Read" ON messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read" ON team;
CREATE POLICY "Public Read" ON team FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read" ON message_comments;
CREATE POLICY "Public Read" ON message_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read" ON post_comments;
CREATE POLICY "Public Read" ON post_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read" ON ads;
CREATE POLICY "Public Read" ON ads FOR SELECT USING (true);

-- Allow all operations for now (since we're using the anon key and managing auth in-app)
-- WARNING: This is for development. In production, use proper RLS policies.
DROP POLICY IF EXISTS "Allow All" ON analytics;
CREATE POLICY "Allow All" ON analytics FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow All" ON polls;
CREATE POLICY "Allow All" ON polls FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow All" ON posts;
CREATE POLICY "Allow All" ON posts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow All" ON messages;
CREATE POLICY "Allow All" ON messages FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow All" ON team;
CREATE POLICY "Allow All" ON team FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow All" ON message_comments;
CREATE POLICY "Allow All" ON message_comments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow All" ON post_comments;
CREATE POLICY "Allow All" ON post_comments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow All" ON ads;
CREATE POLICY "Allow All" ON ads FOR ALL USING (true) WITH CHECK (true);
