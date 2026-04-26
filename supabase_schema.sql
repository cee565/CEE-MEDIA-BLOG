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
CREATE TABLE IF NOT EXISTS mock_exam_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email_phone TEXT NOT NULL,
  matric_number TEXT UNIQUE NOT NULL,
  department TEXT NOT NULL,
  category TEXT NOT NULL,
  token TEXT NOT NULL,
  ip_address TEXT,
  has_started_exam BOOLEAN DEFAULT FALSE,
  has_submitted BOOLEAN DEFAULT FALSE,
  start_time TIMESTAMP WITH TIME ZONE,
  score INTEGER DEFAULT 0,
  answers JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  category TEXT NOT NULL CHECK (category IN ('Science Courses', 'Commercial Courses')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES mock_exam_users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  answers JSONB NOT NULL,
  time_taken INTEGER NOT NULL, -- in seconds
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Science Courses', 'Commercial Courses')),
  participant_name TEXT NOT NULL,
  department TEXT,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
  v_total_questions INTEGER := 0;
  v_question_id UUID;
  v_user_answer TEXT;
  v_correct_answer TEXT;
  v_has_submitted BOOLEAN;
BEGIN
  -- 1. Check if user has already submitted
  SELECT has_submitted INTO v_has_submitted FROM mock_exam_users WHERE id = p_token_id;
  
  IF v_has_submitted THEN
    RAISE EXCEPTION 'Exam already submitted';
  END IF;

  -- 2. Calculate score
  SELECT count(*) INTO v_total_questions FROM questions WHERE category = (SELECT category FROM mock_exam_users WHERE id = p_token_id);
  
  FOR v_question_id, v_user_answer IN SELECT * FROM jsonb_each_text(p_answers)
  LOOP
    SELECT correct_answer INTO v_correct_answer FROM questions WHERE id = v_question_id::UUID;
    IF v_user_answer = v_correct_answer THEN
      v_score := v_score + 1;
    END IF;
  END LOOP;

  -- Calculate final score out of 100
  IF v_total_questions > 0 THEN
    v_score := ROUND((v_score::FLOAT / v_total_questions::FLOAT) * 100);
  ELSE
    v_score := 0;
  END IF;

  -- 3. Mark as submitted and save score
  UPDATE mock_exam_users 
  SET has_submitted = TRUE, score = v_score, answers = p_answers
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

-- 12. Blogs Table
CREATE TABLE IF NOT EXISTS blogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Commission Posts Table (Voting)
CREATE TABLE IF NOT EXISTS commission_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  image_url TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'ended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Votes Table
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES commission_posts(id) ON DELETE CASCADE,
  user_identifier TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Blogs Table
ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exam_users ENABLE ROW LEVEL SECURITY;

-- Policies for new tables
DROP POLICY IF EXISTS "Public Read Blogs" ON blogs;
CREATE POLICY "Public Read Blogs" ON blogs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow All Blogs" ON blogs;
CREATE POLICY "Allow All Blogs" ON blogs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Read Commission Posts" ON commission_posts;
CREATE POLICY "Public Read Commission Posts" ON commission_posts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow All Commission Posts" ON commission_posts;
CREATE POLICY "Allow All Commission Posts" ON commission_posts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Read Votes" ON votes;
CREATE POLICY "Public Read Votes" ON votes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow All Votes" ON votes;
CREATE POLICY "Allow All Votes" ON votes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Read Mock Exam Users" ON mock_exam_users;
CREATE POLICY "Public Read Mock Exam Users" ON mock_exam_users FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Insert Mock Exam Users" ON mock_exam_users;
CREATE POLICY "Public Insert Mock Exam Users" ON mock_exam_users FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public Update Mock Exam Users" ON mock_exam_users;
CREATE POLICY "Public Update Mock Exam Users" ON mock_exam_users FOR UPDATE USING (true);
-- 16. Push Subscriptions Table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription JSONB NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Public Insert Subscriptions" ON push_subscriptions;
CREATE POLICY "Public Insert Subscriptions" ON push_subscriptions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public Read Subscriptions" ON push_subscriptions;
CREATE POLICY "Public Read Subscriptions" ON push_subscriptions FOR SELECT USING (true);

-- 17. Question Bank Data
-- Clear existing to avoid duplicates if re-running
DELETE FROM questions WHERE category IN ('Science Courses', 'Commercial Courses');

INSERT INTO questions (question, option_a, option_b, option_c, option_d, correct_answer, category) VALUES
-- GST 101: Use of English (Common to both)
('Which of the following is a synonym for "industrious"?', 'Lazy', 'Diligent', 'Weak', 'Careless', 'B', 'Science Courses'),
('Choose the correctly spelled word:', 'Accommodation', 'Acomodation', 'Accomodation', 'Acommodation', 'A', 'Science Courses'),
('Identify the part of speech of the underlined word: "The cat sat SILENTLY on the mat."', 'Noun', 'Verb', 'Adverb', 'Adjective', 'C', 'Science Courses'),
('Which of the following is a complete sentence?', 'Walking down the street.', 'After the movie ended.', 'She sang beautifully.', 'Under the big tree.', 'C', 'Science Courses'),
('The plural of "criterion" is:', 'Criterions', 'Criteria', 'Criterias', 'Criteries', 'B', 'Science Courses'),

-- Science: Maths
('Find the value of x in 2x - 10 = 30', '10', '20', '15', '40', 'B', 'Science Courses'),
('What is the square root of 625?', '15', '25', '35', '45', 'B', 'Science Courses'),
('If a triangle has angles 60° and 90°, what is the third angle?', '30°', '45°', '60°', '90°', 'A', 'Science Courses'),
('Solve for y: y/4 + 5 = 10', '10', '20', '15', '5', 'B', 'Science Courses'),
('What is the value of log10(100)?', '1', '2', '3', '10', 'B', 'Science Courses'),

-- Science: Physics
('What is the S.I. unit of power?', 'Newton', 'Joule', 'Pascal', 'Watt', 'D', 'Science Courses'),
('Which of these is a scalar quantity?', 'Velocity', 'Force', 'Acceleration', 'Speed', 'D', 'Science Courses'),
('The process of heat transfer in fluids is called:', 'Conduction', 'Convection', 'Radiation', 'Evaporation', 'B', 'Science Courses'),
('According to Newton''s first law, an object at rest stays at rest unless acted upon by a/an:', 'Friction', 'Internal force', 'Balanced force', 'External force', 'D', 'Science Courses'),
('What is the speed of light in a vacuum?', '3.0 x 10^6 m/s', '3.0 x 10^8 m/s', '3.0 x 10^10 m/s', '3.0 x 10^5 m/s', 'B', 'Science Courses'),

-- Science: Chemistry
('What is the atomic number of Hydrogen?', '0', '1', '2', '3', 'B', 'Science Courses'),
('Which gas is known as the "laughing gas"?', 'Carbon dioxide', 'Nitrous oxide', 'Oxygen', 'Methane', 'B', 'Science Courses'),
('What is the pH value of pure water?', '0', '7', '14', '1', 'B', 'Science Courses'),
('Which element is represented by the symbol "Fe"?', 'Fluorine', 'Iron', 'Francium', 'Fermium', 'B', 'Science Courses'),
('What is the chemical formula for common salt?', 'KCl', 'NaCl', 'CaCl2', 'MgCl2', 'B', 'Science Courses'),

-- Commercial: GST 101/102
('Which of the following is a synonym for "industrious"?', 'Lazy', 'Diligent', 'Weak', 'Careless', 'B', 'Commercial Courses'),
('Philosophy literally means:', 'Love of God', 'Love of Wisdom', 'Love of Power', 'Love of Nature', 'B', 'Commercial Courses'),
('A valid argument in logic means:', 'The premises are true', 'The conclusion follows from the premises', 'The conclusion is true', 'Everyone agrees with it', 'B', 'Commercial Courses'),
('In logic, a "syllogism" consists of how many premises?', 'One', 'Two', 'Three', 'Four', 'B', 'Commercial Courses'),
('Which is the plural of "ox"?', 'Oxen', 'Oxes', 'Oxs', 'Oxens', 'A', 'Commercial Courses'),

-- Commercial: Accounting
('The "father of modern accounting" is:', 'Adam Smith', 'Luca Pacioli', 'Karl Marx', 'John Keynes', 'B', 'Commercial Courses'),
('Assets = Liabilities + ?', 'Income', 'Equity', 'Expenses', 'Debtors', 'B', 'Commercial Courses'),
('A trial balance is used to:', 'Check arithmetic accuracy', 'Prepare cash book', 'Calculate profit', 'Track inventory', 'A', 'Commercial Courses'),
('Which of these is a current asset?', 'Building', 'Machinery', 'Cash at bank', 'Land', 'C', 'Commercial Courses'),
('The recording of financial transactions is called:', 'Auditing', 'Book-keeping', 'Economics', 'Management', 'B', 'Commercial Courses'),

-- Commercial: Economics
('Economics is often defined as the study of:', 'Money', 'Scarcity and Choice', 'Stock market', 'Banking', 'B', 'Commercial Courses'),
('The "invisible hand" concept was introduced by:', 'David Ricardo', 'Adam Smith', 'Malthus', 'Alfred Marshall', 'B', 'Commercial Courses'),
('Opportunity cost is the:', 'Money cost', 'Next best alternative forgone', 'Real cost', 'Variable cost', 'B', 'Commercial Courses'),
('When demand exceeds supply, price tends to:', 'Decrease', 'Increase', 'Stay same', 'Fluctuate wildly', 'B', 'Commercial Courses'),
('Macroeconomics deals with:', 'Individual firms', 'National income', 'Small households', 'Specific products', 'B', 'Commercial Courses'),

-- More GST 102
('An inductive argument moves from:', 'General to Specific', 'Specific to General', 'Truth to Falsehood', 'Hypothesis to Fact', 'B', 'Commercial Courses'),
('Who is known as the father of logic?', 'Plato', 'Aristotle', 'Socrates', 'Descartes', 'B', 'Commercial Courses'),
('GST 102 covers:', 'Pure Sciences', 'Philosophy and Logic', 'Literature', 'Accounting', 'B', 'Commercial Courses'),
('A informal fallacy occurs in:', 'Deductive reasoning', 'Everyday conversation and arguments', 'Mathematical proofs', 'Scientific experiments', 'B', 'Commercial Courses'),
('The law of identity states:', 'A is B', 'A is A', 'A is not A', 'Everything is A', 'B', 'Science Courses')
ON CONFLICT DO NOTHING;

-- 18. Secure Question View
CREATE OR REPLACE VIEW public_questions AS
SELECT id, question, option_a, option_b, option_c, option_d, category, created_at
FROM questions;

-- Ensure public read access is enabled for everyone (for the exam and preview)
DROP POLICY IF EXISTS "Public Read Questions" ON questions;
CREATE POLICY "Public Read Questions" ON questions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin Read Questions" ON questions;
CREATE POLICY "Allow All Questions" ON questions FOR ALL USING (true) WITH CHECK (true);
