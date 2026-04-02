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
  content: string;
  image: string;
  likes: number;
  created_at: string;
}

export interface Message {
  id: string;
  content: string;
  approved: boolean;
  created_at: string;
  likes: number;
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
  link_url: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}
