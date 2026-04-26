export interface PollOption {
  text: string;
  image?: string;
}

export interface Poll {
  id: string;
  question: string;
  description?: string;
  options: (string | PollOption)[];
  votes: Record<string, number>; // optionIndex -> count
  total_votes: number;
  created_at: string;
  starts_at?: string;
  image?: string;
  likes?: number;
  is_ended?: boolean;
  expires_at?: string;
  group_id?: string;
}

export interface PollGroup {
  id: string;
  title: string;
  description?: string;
  image?: string;
  starts_at?: string;
  expires_at?: string;
  created_at: string;
  is_ended?: boolean;
}

export interface Vote {
  id: string;
  poll_id: string;
  device_id: string;
  selected_option: number;
  created_at: string;
}

export interface Post {
  id: string;
  title: string;
  author: string;
  author_id?: string;
  content: string;
  image: string;
  likes: number;
  category?: string;
  url?: string;
  created_at: string;
  comments_count?: number;
}

export interface Message {
  id: string;
  content: string;
  approved: boolean;
  created_at: string;
  likes: number;
  comments_count?: number;
  url?: string;
}

export interface MessageComment {
  id: string;
  message_id: string;
  content: string;
  created_at: string;
  parent_id?: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  content: string;
  created_at: string;
  parent_id?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  image: string;
  likes?: number;
  bio?: string;
  url?: string;
  created_at: string;
}

export interface Analytics {
  id: string;
  total_visitors: number;
  daily_visitors: Record<string, number>; // date string -> count
}

export interface Ad {
  id: string;
  name: string;
  media_url: string;
  media_type: 'image' | 'video';
  link_url?: string;
  description?: string;
  is_active: boolean;
  expires_at?: string;
  impressions: number;
  clicks: number;
  created_at: string;
}

export interface Question {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer?: string;
  category: 'Science Courses' | 'Commercial Courses';
  created_at: string;
}

export interface Token {
  id: string;
  token: string;
  category: 'Science Courses' | 'Commercial Courses';
  full_name: string;
  email_phone: string;
  matric_number: string;
  department: string;
  has_started_exam: boolean;
  has_submitted: boolean;
  score: number;
  start_time?: string;
  submitted_at?: string;
  time_used?: number;
  created_at: string;
}

export interface Submission {
  id: string;
  token_id: string;
  score: number;
  answers: Record<string, string>;
  time_taken: number;
  submitted_at: string;
  tokens?: Token; // For legacy joins
  mock_exam_users?: MockExamUser; // For new joins
}

export interface Blog {
  id: string;
  title: string;
  content: string;
  author: string;
  image_url?: string;
  created_at: string;
}

export interface CommissionPost {
  id: string;
  title: string;
  image_url?: string;
  start_time: string;
  end_time: string;
  status: 'upcoming' | 'active' | 'ended';
  created_at: string;
  votes_count?: number;
}

export interface CommissionVote {
  id: string;
  post_id: string;
  user_identifier: string;
  created_at: string;
}

export interface MockExamUser {
  id: string;
  full_name: string;
  email_phone: string;
  matric_number: string;
  department: string;
  category: 'Science Courses' | 'Commercial Courses';
  token: string;
  ip_address?: string;
  has_started_exam?: boolean;
  has_submitted?: boolean;
  start_time?: string;
  score?: number;
  answers?: Record<string, string>;
  created_at: string;
}
