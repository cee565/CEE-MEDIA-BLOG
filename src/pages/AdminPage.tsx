import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { Logo } from '../components/Logo';
import { Poll, Post, Message, Analytics, TeamMember, Ad, PollGroup } from '../types';
import { Shield, LayoutDashboard, BarChart3, BookOpen, MessageSquare, Plus, Trash2, Edit, Check, X, Users, TrendingUp, Image as ImageIcon, AlertCircle, Camera, Clock, ShieldAlert, Megaphone, Monitor, Video, Globe, PieChart, Activity, PlusCircle, Upload, Edit3, RefreshCw, Database, Eye, EyeOff } from 'lucide-react';
import { format, addHours, addDays, isAfter } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart as RePieChart, Pie } from 'recharts';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import EditModal from '../components/EditModal';

const AdminDashboard = () => {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [pollGroups, setPollGroups] = useState<PollGroup[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [messageComments, setMessageComments] = useState<any[]>([]);
  const [postComments, setPostComments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'poll_groups' | 'polls' | 'posts' | 'messages' | 'team' | 'ads' | 'comments' | 'blog_comments'>('overview');

  // Modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; table: string } | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showAnalysis, setShowAnalysis] = useState<Poll | null>(null);

  // Form states
  const [newPollGroup, setNewPollGroup] = useState({ title: '', description: '', image: null as File | null, duration: 'never', custom_expires_at: '' });
  const [newPoll, setNewPoll] = useState({ question: '', description: '', group_id: '', options: [{ text: '', image: null as File | null }, { text: '', image: null as File | null }], image: null as File | null, duration: 'never', custom_expires_at: '' });
  const [newPost, setNewPost] = useState({ title: '', author: '', content: '', image: null as File | null, author_id: '', category: 'Gist', url: '' });
  const [newMessage, setNewMessage] = useState({ content: '', url: '' });
  const [newTeamMember, setNewTeamMember] = useState({ name: '', role: '', image: null as File | null, bio: '', url: '' });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [newAd, setNewAd] = useState({ name: '', media_url: '', media_type: 'image' as 'image' | 'video', link_url: '', description: '', mediaFile: null as File | null });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{ id: string; table: string; data: any } | null>(null);

  const [supabaseStatus, setSupabaseStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [missingTables, setMissingTables] = useState<string[]>([]);
  const [missingBuckets, setMissingBuckets] = useState<string[]>([]);
  const [isTestingStorage, setIsTestingStorage] = useState(false);

  const testStorage = async () => {
    setIsTestingStorage(true);
    try {
      const testFile = new File(["test"], "test.txt", { type: "text/plain" });
      const filePath = `test-${Date.now()}.txt`;
      
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, testFile);
      
      if (uploadError) {
        console.error("Storage test failed:", uploadError);
        showNotification(`Storage test failed: ${uploadError.message}`, "error");
      } else {
        showNotification("Storage is working correctly!", "success");
        // Cleanup
        await supabase.storage.from('media').remove([filePath]);
      }
    } catch (err: any) {
      console.error("Storage test exception:", err);
      showNotification(`Storage test failed: ${err.message || err}`, "error");
    } finally {
      setIsTestingStorage(false);
    }
  };
  const [diagnostics, setDiagnostics] = useState<{
    url: string;
    hasKey: boolean;
    ping: boolean | 'checking';
  }>({
    url: import.meta.env.VITE_SUPABASE_URL || 'Not Set',
    hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
    ping: 'checking'
  });

  const checkPing = async () => {
    setDiagnostics(prev => ({ ...prev, ping: 'checking' }));
    try {
      const { error } = await supabase.from('analytics').select('id').limit(1);
      setDiagnostics(prev => ({ ...prev, ping: !error || error.code !== 'PGRST116' }));
    } catch (e) {
      setDiagnostics(prev => ({ ...prev, ping: false }));
    }
  };

  const checkSupabase = async () => {
    setSupabaseStatus('checking');
    try {
      const tables = ['analytics', 'poll_groups', 'polls', 'posts', 'messages', 'team', 'message_comments', 'post_comments', 'ads'];
      const results = await Promise.all(tables.map(async (table) => {
        try {
          // Use a simple select to check for existence and columns
          const { data, error } = await supabase.from(table).select('*').limit(1);
          
          let missingColumns: string[] = [];
          if (!error) {
            // Table exists, check columns if data is present
            const sample = data && data.length > 0 ? data[0] : null;
            
            // If table is empty, we can't easily check columns without a more complex query
            // But we can try to insert a dummy row or use a system table query if needed.
            // For now, let's assume if it's empty, we might still be missing columns.
            
            if (table === 'polls') {
              const { error: colErr } = await supabase.from('polls').select('image, description, group_id, votes, total_votes, likes, is_ended').limit(1);
              if (colErr && colErr.code === 'PGRST106') {
                if (colErr.message.includes('image')) missingColumns.push('image');
                if (colErr.message.includes('description')) missingColumns.push('description');
                if (colErr.message.includes('group_id')) missingColumns.push('group_id');
                if (colErr.message.includes('votes')) missingColumns.push('votes');
                if (colErr.message.includes('total_votes')) missingColumns.push('total_votes');
                if (colErr.message.includes('likes')) missingColumns.push('likes');
                if (colErr.message.includes('is_ended')) missingColumns.push('is_ended');
              }
            } else if (table === 'poll_groups') {
              const { error: colErr } = await supabase.from('poll_groups').select('description, image, expires_at, is_ended').limit(1);
              if (colErr && colErr.code === 'PGRST106') {
                if (colErr.message.includes('description')) missingColumns.push('description');
                if (colErr.message.includes('image')) missingColumns.push('image');
                if (colErr.message.includes('expires_at')) missingColumns.push('expires_at');
                if (colErr.message.includes('is_ended')) missingColumns.push('is_ended');
              }
            } else if (table === 'posts') {
              const { error: colErr } = await supabase.from('posts').select('image, author_id, category, url, comments_count').limit(1);
              if (colErr && colErr.code === 'PGRST106') {
                if (colErr.message.includes('image')) missingColumns.push('image');
                if (colErr.message.includes('author_id')) missingColumns.push('author_id');
                if (colErr.message.includes('category')) missingColumns.push('category');
                if (colErr.message.includes('url')) missingColumns.push('url');
                if (colErr.message.includes('comments_count')) missingColumns.push('comments_count');
              }
            } else if (table === 'messages') {
              const { error: colErr } = await supabase.from('messages').select('likes, comments_count, url').limit(1);
              if (colErr && colErr.code === 'PGRST106') {
                if (colErr.message.includes('likes')) missingColumns.push('likes');
                if (colErr.message.includes('comments_count')) missingColumns.push('comments_count');
                if (colErr.message.includes('url')) missingColumns.push('url');
              }
            } else if (table === 'team') {
              const { error: colErr } = await supabase.from('team').select('image, bio, url').limit(1);
              if (colErr && colErr.code === 'PGRST106') {
                if (colErr.message.includes('image')) missingColumns.push('image');
                if (colErr.message.includes('bio')) missingColumns.push('bio');
                if (colErr.message.includes('url')) missingColumns.push('url');
              }
            } else if (table === 'ads') {
              const { error: colErr } = await supabase.from('ads').select('media_url').limit(1);
              if (colErr && colErr.code === 'PGRST106' && colErr.message.includes('media_url')) missingColumns.push('media_url');
            }
          }
          
          return { table, error, missingColumns };
        } catch (e) {
          return { table, error: { message: (e as any).message, code: 'UNKNOWN' }, missingColumns: [] };
        }
      }));
      
      // Check storage bucket
      let bucketMissing = false;
      try {
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();
        if (listError) {
          console.warn("Could not list buckets:", listError);
          // Try direct get as fallback
          const { error: getError } = await supabase.storage.getBucket('media');
          if (getError) bucketMissing = true;
        } else if (!buckets || !buckets.find(b => b.id === 'media')) {
          bucketMissing = true;
        }
        
        if (bucketMissing) {
          setMissingBuckets(['media']);
        } else {
          setMissingBuckets([]);
        }
      } catch (e) {
        console.warn("Bucket check skipped due to error:", e);
        setMissingBuckets([]);
      }
      
      const missingTableNames = results.filter(r => r.error && r.error.code !== 'PGRST116').map(e => e.table);
      const missingColInfo = results.filter(r => r.missingColumns.length > 0).map(e => `${e.table}(${e.missingColumns.join(', ')})`);
      
      if (missingTableNames.length > 0 || missingColInfo.length > 0 || bucketMissing) {
        setMissingTables([...missingTableNames, ...missingColInfo]);
        setSupabaseStatus('error');
      } else {
        setSupabaseStatus('connected');
      }
    } catch (e) {
      console.error("Supabase connection check failed", e);
      setSupabaseStatus('error');
    }
  };

  const fetchData = async () => {
    checkSupabase();
    try {
      // Fetch analytics
      const { data: analyticsData } = await supabase.from('analytics').select('*').eq('id', 'main').single();
      if (analyticsData) setAnalytics(analyticsData as Analytics);

      // Fetch polls
      const { data: pollsData } = await supabase.from('polls').select('*').order('created_at', { ascending: false });
      if (pollsData) setPolls(pollsData as Poll[]);

      // Fetch poll groups
      const { data: groupsData } = await supabase.from('poll_groups').select('*').order('created_at', { ascending: false });
      if (groupsData) setPollGroups(groupsData as PollGroup[]);

      // Fetch posts
      const { data: postsData } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
      if (postsData) setPosts(postsData as Post[]);

      // Fetch messages
      const { data: messagesData } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
      if (messagesData) setMessages(messagesData as Message[]);

      // Fetch team
      const { data: teamData } = await supabase.from('team').select('*').order('created_at', { ascending: false });
      if (teamData) setTeam(teamData as TeamMember[]);

      // Fetch ads
      const { data: adsData } = await supabase.from('ads').select('*').order('created_at', { ascending: false });
      if (adsData) setAds(adsData as Ad[]);

      // Fetch message comments
      const { data: commentsData } = await supabase.from('message_comments').select('*').order('created_at', { ascending: false });
      if (commentsData) setMessageComments(commentsData);

      // Fetch post comments
      const { data: postCommentsData } = await supabase.from('post_comments').select('*').order('created_at', { ascending: false });
      if (postCommentsData) setPostComments(postCommentsData);
    } catch (e) {
      console.error("Admin data fetch failed", e);
    }
  };

  useEffect(() => {
    fetchData();
    checkPing();

    // Real-time subscriptions
    const tables = ['poll_groups', 'polls', 'posts', 'messages', 'analytics', 'team', 'message_comments', 'post_comments', 'ads'];
    const channels = tables.map(table => {
      return supabase.channel(`${table}_admin_channel`)
        .on('postgres_changes' as any, { event: '*', schema: 'public', table }, (payload: any) => {
          if (table === 'analytics') {
            if (payload.new) setAnalytics(payload.new as Analytics);
            return;
          }

          const setter = {
            poll_groups: setPollGroups,
            polls: setPolls,
            posts: setPosts,
            messages: setMessages,
            team: setTeam,
            ads: setAds,
            message_comments: setMessageComments,
            post_comments: setPostComments
          }[table];

          if (!setter) return;

          if (payload.eventType === 'INSERT') {
            setter((prev: any[]) => {
              if (prev.find(item => item.id === payload.new.id)) return prev;
              return [payload.new, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            setter((prev: any[]) => prev.map(item => item.id === payload.new.id ? { ...item, ...payload.new } : item));
          } else if (payload.eventType === 'DELETE') {
            setter((prev: any[]) => prev.filter(item => payload.old && item.id !== payload.old.id));
          }
        })
        .subscribe();
    });

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, []);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreatePollGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPollGroup.title) {
      showNotification("Please fill in the title", "error");
      return;
    }

    try {
      let imageUrl = '';
      if (newPollGroup.image) {
        imageUrl = await uploadMedia(newPollGroup.image);
      }

      let expiresAt = null;
      if (newPollGroup.duration === 'custom' && newPollGroup.custom_expires_at) {
        expiresAt = new Date(newPollGroup.custom_expires_at).toISOString();
      } else if (newPollGroup.duration !== 'never') {
        const now = new Date();
        if (newPollGroup.duration === '1h') expiresAt = addHours(now, 1).toISOString();
        else if (newPollGroup.duration === '6h') expiresAt = addHours(now, 6).toISOString();
        else if (newPollGroup.duration === '1d') expiresAt = addDays(now, 1).toISOString();
        else if (newPollGroup.duration === '3d') expiresAt = addDays(now, 3).toISOString();
        else if (newPollGroup.duration === '7d') expiresAt = addDays(now, 7).toISOString();
      }

      const { data, error } = await supabase.from('poll_groups').insert({
        title: newPollGroup.title,
        description: newPollGroup.description,
        image: imageUrl,
        expires_at: expiresAt,
        is_ended: false
      }).select().single();

      if (error) throw error;
      
      // Optimistically update state if not already updated by subscription
      if (data) {
        setPollGroups(prev => {
          if (prev.find(g => g.id === data.id)) return prev;
          return [data as PollGroup, ...prev];
        });
      }
      showNotification("Poll group created successfully", "success");
      setNewPollGroup({ title: '', description: '', image: null, duration: 'never', custom_expires_at: '' });
    } catch (e: any) {
      console.error("Poll group creation failed", e);
      showNotification(`Failed to create poll group: ${e.message}`, "error");
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPoll.question || newPoll.options.some(o => !o.text)) {
      showNotification("Please fill in the question and all options", "error");
      return;
    }
    
    try {
      let imageUrl = '';
      if (newPoll.image) {
        imageUrl = await uploadMedia(newPoll.image);
      }

      // Upload option images sequentially to avoid "Failed to fetch" on mobile
      const optionsWithImages = [];
      for (const opt of newPoll.options) {
        let optImageUrl = '';
        if (opt.image) {
          try {
            optImageUrl = await uploadMedia(opt.image);
          } catch (err: any) {
            console.error(`Failed to upload image for option: ${opt.text}`, err);
            throw new Error(`Failed to upload image for option "${opt.text}": ${err.message}`);
          }
        }
        optionsWithImages.push({ text: opt.text, image: optImageUrl });
      }

      let expiresAt = null;
      if (newPoll.duration === 'custom' && newPoll.custom_expires_at) {
        expiresAt = new Date(newPoll.custom_expires_at).toISOString();
      } else if (newPoll.duration !== 'never') {
        const now = new Date();
        if (newPoll.duration === '1h') expiresAt = addHours(now, 1).toISOString();
        else if (newPoll.duration === '6h') expiresAt = addHours(now, 6).toISOString();
        else if (newPoll.duration === '1d') expiresAt = addDays(now, 1).toISOString();
        else if (newPoll.duration === '3d') expiresAt = addDays(now, 3).toISOString();
        else if (newPoll.duration === '7d') expiresAt = addDays(now, 7).toISOString();
      }

      const { data, error } = await supabase.from('polls').insert({
        question: newPoll.question,
        description: newPoll.description,
        group_id: newPoll.group_id || null,
        options: optionsWithImages,
        votes: {},
        total_votes: 0,
        image: imageUrl,
        likes: 0,
        expires_at: expiresAt,
        is_ended: false
      }).select().single();

      if (error) {
        console.error("Supabase insert error details:", error);
        throw new Error(error.message || "Database error");
      }

      if (data) {
        setPolls(prev => {
          if (prev.find(p => p.id === data.id)) return prev;
          return [data as Poll, ...prev];
        });
      }

      showNotification("Poll created successfully", "success");
      setNewPoll({ question: '', description: '', group_id: '', options: [{ text: '', image: null }, { text: '', image: null }], image: null, duration: 'never', custom_expires_at: '' });
    } catch (e: any) {
      console.error("Poll creation failed", e);
      showNotification(`Failed to create poll: ${e.message || 'Unknown error'}`, "error");
    }
  };

  const handleEndPoll = async (pollId: string) => {
    try {
      const { error } = await supabase
        .from('polls')
        .update({ is_ended: true })
        .eq('id', pollId);
      
      if (error) throw error;
      showNotification("Poll ended successfully", "success");
    } catch (e) {
      console.error("Failed to end poll", e);
      showNotification("Failed to end poll", "error");
    }
  };

  const PollAnalysis = ({ poll }: { poll: Poll }) => {
    const data = poll.options.map((opt, i) => ({
      name: typeof opt === 'string' ? opt : opt.text,
      votes: poll.votes[i] || 0
    }));

    const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100">
            <p className="text-xs font-bold text-purple-400 uppercase">Total Votes</p>
            <p className="text-2xl font-black text-purple-700">{poll.total_votes}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
            <p className="text-xs font-bold text-blue-400 uppercase">Total Likes</p>
            <p className="text-2xl font-black text-blue-700">{poll.likes || 0}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
            <p className="text-xs font-bold text-green-400 uppercase">Status</p>
            <p className="text-2xl font-black text-green-700">
              {poll.is_ended || (poll.expires_at && isAfter(new Date(), new Date(poll.expires_at))) ? 'Ended' : 'Active'}
            </p>
          </div>
        </div>

        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
          <h4 className="text-sm font-bold text-slate-500 mb-6 uppercase flex items-center">
            <Activity size={16} className="mr-2" /> Vote Distribution
          </h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f1f5f9' }}
                />
                <Bar dataKey="votes" radius={[8, 8, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-bold text-slate-500 uppercase">Detailed Breakdown</h4>
          {data.map((item, i) => {
            const percentage = poll.total_votes > 0 ? ((item.votes / poll.total_votes) * 100).toFixed(1) : '0.0';
            return (
              <div key={i} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-sm font-medium text-slate-700">{item.name}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-bold text-slate-900">{item.votes.toLocaleString()} votes</span>
                  <span className="text-xs font-black text-slate-400 w-12 text-right">{percentage}%</span>
                </div>
              </div>
            );
          })}
          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center px-3">
            <span className="text-sm font-black text-slate-900 uppercase tracking-wider">Total Overall</span>
            <span className="text-lg font-black text-purple-600">{poll.total_votes.toLocaleString()} Votes</span>
          </div>
        </div>
      </div>
    );
  };

  const uploadMedia = async (file: File) => {
    try {
      if (!file) return '';
      setIsUploading(true);
      setUploadProgress(10);
      console.log("Starting upload for file:", file.name, "Type:", file.type, "Size:", file.size);
      
      // Validation: 10MB for images, 50MB for videos
      const isVideo = file.type.startsWith('video/');
      const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      
      if (file.size > maxSize) {
        throw new Error(`File too large. Maximum size is ${isVideo ? '50MB' : '10MB'}.`);
      }

      setUploadProgress(30);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      console.log("Uploading to path:", filePath);

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Supabase storage upload error:", uploadError);
        throw uploadError;
      }

      setUploadProgress(80);
      const { data } = supabase.storage.from('media').getPublicUrl(filePath);
      if (!data || !data.publicUrl) {
        throw new Error("Failed to get public URL for uploaded file.");
      }
      
      setUploadProgress(100);
      console.log("Upload successful, public URL:", data.publicUrl);
      
      // Keep progress bar visible for a moment
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 1000);
      
      return data.publicUrl;
    } catch (err: any) {
      setIsUploading(false);
      setUploadProgress(0);
      console.error("uploadMedia exception:", err);
      throw err;
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.title || !newPost.content) {
      showNotification("Title and Content are required", "error");
      return;
    }

    try {
      let imageUrl = '';
      if (newPost.image) {
        try {
          imageUrl = await uploadMedia(newPost.image);
        } catch (uploadErr: any) {
          console.error("Image upload failed for post:", uploadErr);
          showNotification(`Image upload failed: ${uploadErr.message || uploadErr}`, "error");
          return;
        }
      }

      const { data: postData, error: postError } = await supabase.from('posts').insert({
        title: newPost.title,
        author: newPost.author || 'Admin',
        content: newPost.content,
        image: imageUrl,
        author_id: newPost.author_id || null,
        category: newPost.category,
        url: newPost.url || null,
        likes: 0
      }).select().single();

      if (postError) {
        console.error("Supabase insert error (posts):", postError);
        throw postError;
      }

      if (postData) {
        setPosts(prev => [postData as Post, ...prev]);
      }

      showNotification("Post created successfully", "success");
      setNewPost({ title: '', author: '', content: '', image: null, author_id: '', category: 'Gist', url: '' });
    } catch (e: any) {
      console.error("Post creation failed", e);
      showNotification(`Failed to create post: ${e.message || e}`, "error");
    }
  };

  const handleCreateTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamMember.name || !newTeamMember.role) {
      showNotification("Name and Role are required", "error");
      return;
    }

    try {
      let imageUrl = '';
      if (newTeamMember.image) {
        try {
          imageUrl = await uploadMedia(newTeamMember.image);
        } catch (uploadErr: any) {
          console.error("Image upload failed for team member:", uploadErr);
          showNotification(`Image upload failed: ${uploadErr.message || uploadErr}`, "error");
          return;
        }
      }

      const { data, error } = await supabase.from('team').insert({
        name: newTeamMember.name,
        role: newTeamMember.role,
        image: imageUrl,
        bio: newTeamMember.bio,
        url: newTeamMember.url || null
      }).select().single();

      if (error) {
        console.error("Supabase insert error (team):", error);
        throw error;
      }
      
      if (data) {
        setTeam(prev => {
          if (prev.find(t => t.id === data.id)) return prev;
          return [data as TeamMember, ...prev];
        });
      }

      showNotification("Team member added successfully", "success");
      setNewTeamMember({ name: '', role: '', image: null, bio: '', url: '' });
    } catch (e: any) {
      console.error("Team member creation failed", e);
      showNotification(`Failed to add team member: ${e.message || e}`, "error");
    }
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAd.name || !newAd.link_url) {
      showNotification("Ad Name and Destination Link are required", "error");
      return;
    }

    try {
      let mediaUrl = newAd.media_url;
      
      if (newAd.mediaFile) {
        try {
          mediaUrl = await uploadMedia(newAd.mediaFile);
        } catch (uploadErr: any) {
          console.error("Ad media upload failed:", uploadErr);
          showNotification(`Ad media upload failed: ${uploadErr.message || uploadErr}`, "error");
          return;
        }
      }

      if (!mediaUrl) {
        showNotification("Please upload a media file or provide a media URL", "error");
        return;
      }

      const { data, error } = await supabase.from('ads').insert({
        name: newAd.name,
        media_url: mediaUrl,
        media_type: newAd.media_type,
        link_url: newAd.link_url,
        description: newAd.description,
        is_active: true
      }).select().single();

      if (error) {
        console.error("Supabase insert error (ads):", error);
        throw error;
      }

      if (data) {
        setAds(prev => {
          if (prev.find(a => a.id === data.id)) return prev;
          return [data as Ad, ...prev];
        });
      }

      showNotification("Ad created successfully", "success");
      setNewAd({ name: '', media_url: '', media_type: 'image', link_url: '', description: '', mediaFile: null });
    } catch (e: any) {
      console.error("Ad creation failed", e);
      showNotification(`Failed to create ad: ${e.message || e}`, "error");
    }
  };

  const handleCreateMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.content) return;

    try {
      const { data, error } = await supabase.from('messages').insert({
        content: newMessage.content,
        url: newMessage.url || null,
        approved: true, // Admin created messages are approved by default
        likes: 0
      }).select().single();

      if (error) throw error;

      if (data) {
        setMessages(prev => [data as Message, ...prev]);
      }

      showNotification("Confession created successfully", "success");
      setNewMessage({ content: '', url: '' });
    } catch (e: any) {
      console.error("Confession creation failed", e);
      showNotification(`Failed to create confession: ${e.message || e}`, "error");
    }
  };

  const setMessageApproval = async (id: string, status: boolean) => {
    const { error } = await supabase.from('messages').update({ approved: status }).eq('id', id);
    if (error) {
      showNotification("Failed to update message status", "error");
    } else {
      showNotification(status ? "Message approved" : "Message rejected", "success");
    }
  };

  const handleEdit = async (id: string, table: string, data: any) => {
    setEditingItem({ id, table, data });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (updatedData: any) => {
    if (!editingItem) return;
    const { id, table } = editingItem;
    
    try {
      const finalData = { ...updatedData };
      delete finalData.id;
      delete finalData.created_at;

      if (finalData.imageFile) {
        const uploadedUrl = await uploadMedia(finalData.imageFile);
        if (table === 'ads') {
          finalData.media_url = uploadedUrl;
        } else {
          finalData.image = uploadedUrl;
        }
        delete finalData.imageFile;
      }

      // Handle poll option images
      if (table === 'polls' && finalData.options) {
        const processedOptions = await Promise.all(finalData.options.map(async (opt: any) => {
          if (opt.imageFile) {
            const imageUrl = await uploadMedia(opt.imageFile);
            const { imageFile, ...rest } = opt;
            return { ...rest, image: imageUrl };
          }
          const { imageFile, ...rest } = opt;
          return rest;
        }));
        finalData.options = processedOptions;
      }

      const { error } = await supabase.from(table).update(finalData).eq('id', id);
      if (error) throw error;

      showNotification(`${table.slice(0, -1)} updated successfully`, "success");
    } catch (e) {
      console.error("Update failed", e);
      showNotification("Failed to update item", "error");
      throw e;
    }
  };

  const confirmDelete = (id: string, table: string) => {
    setItemToDelete({ id, table });
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    const { id, table } = itemToDelete;
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      
      if (error) throw error;

      // Optimistically update state
      if (table === 'polls') setPolls(prev => prev.filter(i => i.id !== id));
      else if (table === 'poll_groups') setPollGroups(prev => prev.filter(i => i.id !== id));
      else if (table === 'posts') setPosts(prev => prev.filter(i => i.id !== id));
      else if (table === 'messages') setMessages(prev => prev.filter(i => i.id !== id));
      else if (table === 'team') setTeam(prev => prev.filter(i => i.id !== id));
      else if (table === 'ads') setAds(prev => prev.filter(i => i.id !== id));

      showNotification(`${table.slice(0, -1)} deleted successfully`, "success");
    } catch (e) {
      console.error("Delete failed", e);
      showNotification("Failed to delete item", "error");
    } finally {
      setItemToDelete(null);
    }
  };

  return (
    <div className="space-y-6 pb-16 relative">
      {/* Progress Bar */}
      <AnimatePresence>
        {isUploading && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-0 left-0 right-0 z-[9999] bg-white/95 backdrop-blur-xl p-6 border-b border-slate-200 shadow-2xl"
          >
            <div className="max-w-7xl mx-auto space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-brand-secondary/10 flex items-center justify-center">
                    <Upload className="text-brand-secondary animate-bounce" size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-800">Uploading Media</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Please do not close this tab</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-brand-secondary">{uploadProgress}%</span>
                </div>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <motion.div 
                  className="h-full bg-gradient-to-r from-brand-secondary to-purple-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification */}
      <div className="fixed top-20 right-4 z-50 space-y-2">
        {notification && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={`p-4 rounded-2xl shadow-xl border flex items-center space-x-3 ${
              notification.type === 'success' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'
            }`}
          >
            {notification.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
            <span className="font-bold">{notification.message}</span>
          </motion.div>
        )}
      </div>

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
      />

      <EditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveEdit}
        title={`Edit ${editingItem?.table.slice(0, -1)}`}
        initialData={editingItem?.data || {}}
        type={
          editingItem?.table === 'polls' ? 'poll' : 
          editingItem?.table === 'posts' ? 'post' : 
          editingItem?.table === 'team' ? 'team' : 
          editingItem?.table === 'ads' ? 'ad' : 
          editingItem?.table === 'poll_groups' ? 'poll_group' : 
          'message'
        }
        pollGroups={pollGroups}
        team={team}
      />

      {/* Analysis Modal */}
      <AnimatePresence>
        {showAnalysis && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="p-4 md:p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Poll Analysis</h3>
                  <p className="text-[10px] text-slate-500 mt-1">{showAnalysis.question}</p>
                </div>
                <button onClick={() => setShowAnalysis(null)} className="p-1.5 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={18} className="text-slate-500" />
                </button>
              </div>
              <div className="p-4 md:p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <PollAnalysis poll={showAnalysis} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-brand-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-primary/20">
            <Shield size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Admin Dashboard</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Control Center</p>
          </div>
        </div>
        <div className="flex bg-slate-50 p-1.5 rounded-2xl overflow-x-auto hide-scrollbar border border-slate-100">
          {(['overview', 'poll_groups', 'polls', 'posts', 'messages', 'team', 'ads', 'comments', 'blog_comments'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === tab 
                  ? 'bg-brand-secondary text-white shadow-md' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`p-6 rounded-[1.5rem] border transition-all col-span-full ${
            supabaseStatus === 'connected' ? 'bg-white border-slate-100' : 'bg-red-50 border-red-100'
          }`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-slate-800 flex items-center">
                    <Activity className="mr-2 text-blue-600" size={18} /> System Status
                  </h3>
                  <button 
                    onClick={() => {
                      checkSupabase();
                      checkPing();
                    }}
                    className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"
                    title="Refresh Status"
                  >
                    <RefreshCw size={16} className={supabaseStatus === 'checking' ? 'animate-spin' : ''} />
                  </button>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-500">Connection</span>
                    <div className="flex items-center">
                      <div className={`w-1.5 h-1.5 rounded-full mr-2 ${diagnostics.ping === true ? 'bg-green-500' : diagnostics.ping === 'checking' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
                      <span className={`text-[9px] font-black uppercase tracking-wider ${diagnostics.ping === true ? 'text-green-600' : diagnostics.ping === 'checking' ? 'text-yellow-600' : 'text-red-600'}`}>
                        {diagnostics.ping === true ? 'Connected' : diagnostics.ping === 'checking' ? 'Checking...' : 'Disconnected'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-500">Database Schema</span>
                    <div className="flex items-center">
                      <div className={`w-1.5 h-1.5 rounded-full mr-2 ${supabaseStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className={`text-[9px] font-black uppercase tracking-wider ${supabaseStatus === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                        {supabaseStatus === 'connected' ? 'Healthy' : 'Config Error'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-black text-slate-800 flex items-center">
                  <Globe className="mr-2 text-purple-600" size={18} /> Diagnostics
                </h3>
                <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 overflow-hidden">
                  <div className="space-y-0.5">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Supabase URL</p>
                    <p className="text-[10px] text-slate-600 font-mono truncate">{diagnostics.url}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Anon Key Status</p>
                    <p className="text-[10px] text-slate-600 font-bold">{diagnostics.hasKey ? 'Present ✓' : 'Missing ✗'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-slate-800 flex items-center">
                    <AlertCircle className="mr-2 text-orange-600" size={18} /> Issues & Fixes
                  </h3>
                  <button 
                    onClick={() => fetchData()}
                    disabled={supabaseStatus === 'checking'}
                    className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 disabled:opacity-50"
                    title="Refresh Status"
                  >
                    <RefreshCw size={14} className={supabaseStatus === 'checking' ? 'animate-spin' : ''} />
                  </button>
                </div>
                {supabaseStatus === 'connected' ? (
                  <div className="flex items-center space-x-2 p-3 bg-green-50 text-green-700 rounded-xl border border-green-100">
                    <Check size={16} />
                    <span className="text-[10px] font-bold">All systems operational</span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-slate-500 font-medium">Missing items detected below. Scroll down to see SQL fixes.</p>
                    <div className="flex flex-wrap gap-1">
                      {missingTables.map(t => (
                        <span key={t} className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded-md text-[9px] font-mono">{t}</span>
                      ))}
                      {missingBuckets.map(b => (
                        <span key={b} className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded-md text-[9px] font-mono">Bucket: {b}</span>
                      ))}
                    </div>
                    <button 
                      onClick={testStorage}
                      disabled={isTestingStorage}
                      className="mt-1 text-[9px] font-bold text-slate-400 hover:text-slate-600 flex items-center space-x-1 uppercase tracking-tighter transition-colors disabled:opacity-50"
                    >
                      <RefreshCw size={8} className={isTestingStorage ? 'animate-spin' : ''} />
                      <span>{isTestingStorage ? 'Testing...' : 'Test Storage Connection'}</span>
                    </button>
                  </div>
                ) }
              </div>
            </div>
          </div>

          {/* SQL Fixes Section */}
          {supabaseStatus === 'error' && (
            <div className="col-span-full space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                  <Database size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Database Repair Kit</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Run these in your Supabase SQL Editor</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {missingBuckets.includes('media') && (
                  <div className="p-4 bg-slate-900 rounded-3xl space-y-3 border border-slate-800">
                    <p className="text-[10px] text-yellow-400 font-bold uppercase">SQL Fix for Media Bucket:</p>
                    <code className="block text-[9px] text-slate-300 font-mono break-all bg-slate-800 p-3 rounded-xl border border-slate-700 whitespace-pre-wrap">
{`INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true) ON CONFLICT (id) DO UPDATE SET public = true;
DROP POLICY IF EXISTS "Public Access Media" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload Media" ON storage.objects;
DROP POLICY IF EXISTS "Public Bucket Access" ON storage.buckets;
CREATE POLICY "Public Access Media" ON storage.objects FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "Public Upload Media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media');
CREATE POLICY "Public Bucket Access" ON storage.buckets FOR SELECT USING (id = 'media');`}
                    </code>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true) ON CONFLICT (id) DO UPDATE SET public = true;
DROP POLICY IF EXISTS "Public Access Media" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload Media" ON storage.objects;
DROP POLICY IF EXISTS "Public Bucket Access" ON storage.buckets;
CREATE POLICY "Public Access Media" ON storage.objects FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "Public Upload Media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media');
CREATE POLICY "Public Bucket Access" ON storage.buckets FOR SELECT USING (id = 'media');`);
                        showNotification("SQL copied to clipboard", "success");
                      }}
                      className="w-full py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      Copy SQL
                    </button>
                  </div>
                )}
                {missingTables.some(t => t === 'team') && (
                  <div className="p-4 bg-slate-900 rounded-3xl space-y-3 border border-slate-800">
                    <p className="text-[10px] text-pink-400 font-bold uppercase">SQL Fix for Team Table:</p>
                    <code className="block text-[9px] text-slate-300 font-mono break-all bg-slate-800 p-3 rounded-xl border border-slate-700 whitespace-pre-wrap">
{`CREATE TABLE IF NOT EXISTS team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  image TEXT,
  bio TEXT,
  likes INTEGER DEFAULT 0,
  url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE team ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read" ON team;
DROP POLICY IF EXISTS "Allow All" ON team;
CREATE POLICY "Public Read" ON team FOR SELECT USING (true);
CREATE POLICY "Allow All" ON team FOR ALL USING (true) WITH CHECK (true);`}
                    </code>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`CREATE TABLE IF NOT EXISTS team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  image TEXT,
  bio TEXT,
  likes INTEGER DEFAULT 0,
  url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE team ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read" ON team;
DROP POLICY IF EXISTS "Allow All" ON team;
CREATE POLICY "Public Read" ON team FOR SELECT USING (true);
CREATE POLICY "Allow All" ON team FOR ALL USING (true) WITH CHECK (true);`);
                        showNotification("SQL copied to clipboard", "success");
                      }}
                      className="w-full py-2 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      Copy SQL
                    </button>
                  </div>
                )}
                {missingTables.some(t => t === 'posts') && (
                  <div className="p-4 bg-slate-900 rounded-3xl space-y-3 border border-slate-800">
                    <p className="text-[10px] text-blue-400 font-bold uppercase">SQL Fix for Posts Table:</p>
                    <code className="block text-[9px] text-slate-300 font-mono break-all bg-slate-800 p-3 rounded-xl border border-slate-700 whitespace-pre-wrap">
{`CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  image TEXT,
  author_id UUID REFERENCES team(id),
  category TEXT DEFAULT 'Gist',
  url TEXT,
  likes INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read" ON posts;
DROP POLICY IF EXISTS "Allow All" ON posts;
CREATE POLICY "Public Read" ON posts FOR SELECT USING (true);
CREATE POLICY "Allow All" ON posts FOR ALL USING (true) WITH CHECK (true);`}
                    </code>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  image TEXT,
  author_id UUID REFERENCES team(id),
  category TEXT DEFAULT 'Gist',
  url TEXT,
  likes INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read" ON posts;
DROP POLICY IF EXISTS "Allow All" ON posts;
CREATE POLICY "Public Read" ON posts FOR SELECT USING (true);
CREATE POLICY "Allow All" ON posts FOR ALL USING (true) WITH CHECK (true);`);
                        showNotification("SQL copied to clipboard", "success");
                      }}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      Copy SQL
                    </button>
                  </div>
                )}
                {missingTables.some(t => t === 'messages') && (
                  <div className="p-4 bg-slate-900 rounded-3xl space-y-3 border border-slate-800">
                    <p className="text-[10px] text-purple-400 font-bold uppercase">SQL Fix for Messages Table:</p>
                    <code className="block text-[9px] text-slate-300 font-mono break-all bg-slate-800 p-3 rounded-xl border border-slate-700 whitespace-pre-wrap">
{`CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  author TEXT DEFAULT 'Anonymous',
  likes INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  approved BOOLEAN DEFAULT FALSE,
  url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read" ON messages;
DROP POLICY IF EXISTS "Allow All" ON messages;
CREATE POLICY "Public Read" ON messages FOR SELECT USING (true);
CREATE POLICY "Allow All" ON messages FOR ALL USING (true) WITH CHECK (true);`}
                    </code>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  author TEXT DEFAULT 'Anonymous',
  likes INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  approved BOOLEAN DEFAULT FALSE,
  url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read" ON messages;
DROP POLICY IF EXISTS "Allow All" ON messages;
CREATE POLICY "Public Read" ON messages FOR SELECT USING (true);
CREATE POLICY "Allow All" ON messages FOR ALL USING (true) WITH CHECK (true);`);
                        showNotification("SQL copied to clipboard", "success");
                      }}
                      className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      Copy SQL
                    </button>
                  </div>
                )}
                {missingTables.some(t => t === 'poll_groups') && (
                  <div className="p-4 bg-slate-900 rounded-3xl space-y-3 border border-slate-800">
                    <p className="text-[10px] text-green-400 font-bold uppercase">SQL Fix for Poll Groups:</p>
                    <code className="block text-[9px] text-slate-300 font-mono break-all bg-slate-800 p-3 rounded-xl border border-slate-700 whitespace-pre-wrap">
{`CREATE TABLE IF NOT EXISTS poll_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image TEXT,
  duration TEXT DEFAULT 'never',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE poll_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read" ON poll_groups;
DROP POLICY IF EXISTS "Allow All" ON poll_groups;
CREATE POLICY "Public Read" ON poll_groups FOR SELECT USING (true);
CREATE POLICY "Allow All" ON poll_groups FOR ALL USING (true) WITH CHECK (true);`}
                    </code>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`CREATE TABLE IF NOT EXISTS poll_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image TEXT,
  duration TEXT DEFAULT 'never',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE poll_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read" ON poll_groups;
DROP POLICY IF EXISTS "Allow All" ON poll_groups;
CREATE POLICY "Public Read" ON poll_groups FOR SELECT USING (true);
CREATE POLICY "Allow All" ON poll_groups FOR ALL USING (true) WITH CHECK (true);`);
                        showNotification("SQL copied to clipboard", "success");
                      }}
                      className="w-full py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      Copy SQL
                    </button>
                  </div>
                )}
                {missingTables.some(t => t === 'poll_groups') && (
                  <div className="p-4 bg-slate-900 rounded-3xl space-y-3 border border-slate-800">
                    <p className="text-[10px] text-purple-400 font-bold uppercase">SQL Fix for Poll Groups:</p>
                    <code className="block text-[9px] text-slate-300 font-mono break-all bg-slate-800 p-3 rounded-xl border border-slate-700 whitespace-pre-wrap">
{`CREATE TABLE IF NOT EXISTS poll_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image TEXT,
  is_ended BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE poll_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read" ON poll_groups;
DROP POLICY IF EXISTS "Allow All" ON poll_groups;
CREATE POLICY "Public Read" ON poll_groups FOR SELECT USING (true);
CREATE POLICY "Allow All" ON poll_groups FOR ALL USING (true) WITH CHECK (true);`}
                    </code>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`CREATE TABLE IF NOT EXISTS poll_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image TEXT,
  is_ended BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE poll_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read" ON poll_groups;
DROP POLICY IF EXISTS "Allow All" ON poll_groups;
CREATE POLICY "Public Read" ON poll_groups FOR SELECT USING (true);
CREATE POLICY "Allow All" ON poll_groups FOR ALL USING (true) WITH CHECK (true);`);
                        showNotification("SQL copied to clipboard", "success");
                      }}
                      className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      Copy SQL
                    </button>
                  </div>
                )}
                {missingTables.some(t => t === 'polls') && (
                  <div className="p-4 bg-slate-900 rounded-3xl space-y-3 border border-slate-800">
                    <p className="text-[10px] text-orange-400 font-bold uppercase">SQL Fix for Polls Table:</p>
                    <code className="block text-[9px] text-slate-300 font-mono break-all bg-slate-800 p-3 rounded-xl border border-slate-700 whitespace-pre-wrap">
{`-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES poll_groups(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  description TEXT,
  options JSONB NOT NULL DEFAULT '[]',
  votes JSONB NOT NULL DEFAULT '{}',
  total_votes INTEGER DEFAULT 0,
  image TEXT,
  likes INTEGER DEFAULT 0,
  duration TEXT DEFAULT 'never',
  expires_at TIMESTAMP WITH TIME ZONE,
  is_ended BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Upgrade existing table if columns are missing
ALTER TABLE polls ADD COLUMN IF NOT EXISTS votes JSONB NOT NULL DEFAULT '{}';
ALTER TABLE polls ADD COLUMN IF NOT EXISTS total_votes INTEGER DEFAULT 0;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS is_ended BOOLEAN DEFAULT FALSE;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES poll_groups(id) ON DELETE CASCADE;

ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read" ON polls;
DROP POLICY IF EXISTS "Allow All" ON polls;
CREATE POLICY "Public Read" ON polls FOR SELECT USING (true);
CREATE POLICY "Allow All" ON polls FOR ALL USING (true) WITH CHECK (true);

-- RPC for atomic voting (handles millions of votes accurately)
CREATE OR REPLACE FUNCTION increment_vote(p_id UUID, opt_idx TEXT)
RETURNS void AS $$
BEGIN
  UPDATE polls
  SET 
    total_votes = COALESCE(total_votes, 0) + 1,
    votes = jsonb_set(
      COALESCE(votes, '{}'::jsonb),
      ARRAY[opt_idx],
      (COALESCE((votes->>opt_idx)::int, 0) + 1)::text::jsonb
    )
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

-- RPC for atomic liking
CREATE OR REPLACE FUNCTION increment_poll_like(p_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE polls
  SET likes = COALESCE(likes, 0) + 1
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;`}
                    </code>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES poll_groups(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  description TEXT,
  options JSONB NOT NULL DEFAULT '[]',
  votes JSONB NOT NULL DEFAULT '{}',
  total_votes INTEGER DEFAULT 0,
  image TEXT,
  likes INTEGER DEFAULT 0,
  duration TEXT DEFAULT 'never',
  expires_at TIMESTAMP WITH TIME ZONE,
  is_ended BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Upgrade existing table if columns are missing
ALTER TABLE polls ADD COLUMN IF NOT EXISTS votes JSONB NOT NULL DEFAULT '{}';
ALTER TABLE polls ADD COLUMN IF NOT EXISTS total_votes INTEGER DEFAULT 0;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS is_ended BOOLEAN DEFAULT FALSE;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE polls ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES poll_groups(id) ON DELETE CASCADE;

ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read" ON polls;
DROP POLICY IF EXISTS "Allow All" ON polls;
CREATE POLICY "Public Read" ON polls FOR SELECT USING (true);
CREATE POLICY "Allow All" ON polls FOR ALL USING (true) WITH CHECK (true);

-- RPC for atomic voting (handles millions of votes accurately)
CREATE OR REPLACE FUNCTION increment_vote(p_id UUID, opt_idx TEXT)
RETURNS void AS $$
BEGIN
  UPDATE polls
  SET 
    total_votes = COALESCE(total_votes, 0) + 1,
    votes = jsonb_set(
      COALESCE(votes, '{}'::jsonb),
      ARRAY[opt_idx],
      (COALESCE((votes->>opt_idx)::int, 0) + 1)::text::jsonb
    )
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

-- RPC for atomic liking
CREATE OR REPLACE FUNCTION increment_poll_like(p_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE polls
  SET likes = COALESCE(likes, 0) + 1
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;`);
                        showNotification("SQL copied to clipboard", "success");
                      }}
                      className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      Copy SQL
                    </button>
                  </div>
                )}
                {missingTables.some(t => t === 'poll_votes') && (
                  <div className="p-4 bg-slate-900 rounded-3xl space-y-3 border border-slate-800">
                    <p className="text-[10px] text-cyan-400 font-bold uppercase">SQL Fix for Poll Votes:</p>
                    <code className="block text-[9px] text-slate-300 font-mono break-all bg-slate-800 p-3 rounded-xl border border-slate-700 whitespace-pre-wrap">
{`CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  voter_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read" ON poll_votes;
DROP POLICY IF EXISTS "Allow All" ON poll_votes;
CREATE POLICY "Public Read" ON poll_votes FOR SELECT USING (true);
CREATE POLICY "Allow All" ON poll_votes FOR ALL USING (true) WITH CHECK (true);`}
                    </code>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  voter_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read" ON poll_votes;
DROP POLICY IF EXISTS "Allow All" ON poll_votes;
CREATE POLICY "Public Read" ON poll_votes FOR SELECT USING (true);
CREATE POLICY "Allow All" ON poll_votes FOR ALL USING (true) WITH CHECK (true);`);
                        showNotification("SQL copied to clipboard", "success");
                      }}
                      className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      Copy SQL
                    </button>
                  </div>
                )}
                {missingTables.some(t => t === 'post_comments') && (
                  <div className="p-4 bg-slate-900 rounded-3xl space-y-3 border border-slate-800">
                    <p className="text-[10px] text-indigo-400 font-bold uppercase">SQL Fix for Comments:</p>
                    <code className="block text-[9px] text-slate-300 font-mono break-all bg-slate-800 p-3 rounded-xl border border-slate-700 whitespace-pre-wrap">
{`CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author TEXT DEFAULT 'Anonymous',
  parent_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read" ON post_comments;
DROP POLICY IF EXISTS "Allow All" ON post_comments;
CREATE POLICY "Public Read" ON post_comments FOR SELECT USING (true);
CREATE POLICY "Allow All" ON post_comments FOR ALL USING (true) WITH CHECK (true);`}
                    </code>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author TEXT DEFAULT 'Anonymous',
  parent_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read" ON post_comments;
DROP POLICY IF EXISTS "Allow All" ON post_comments;
CREATE POLICY "Public Read" ON post_comments FOR SELECT USING (true);
CREATE POLICY "Allow All" ON post_comments FOR ALL USING (true) WITH CHECK (true);`);
                        showNotification("SQL copied to clipboard", "success");
                      }}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      Copy SQL
                    </button>
                  </div>
                )}
                {missingTables.some(t => t === 'message_comments') && (
                  <div className="p-4 bg-slate-900 rounded-3xl space-y-3 border border-slate-800">
                    <p className="text-[10px] text-orange-400 font-bold uppercase">SQL Fix for Confession Comments:</p>
                    <code className="block text-[9px] text-slate-300 font-mono break-all bg-slate-800 p-3 rounded-xl border border-slate-700 whitespace-pre-wrap">
{`CREATE TABLE IF NOT EXISTS message_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author TEXT DEFAULT 'Anonymous',
  parent_id UUID REFERENCES message_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE message_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read" ON message_comments;
DROP POLICY IF EXISTS "Allow All" ON message_comments;
CREATE POLICY "Public Read" ON message_comments FOR SELECT USING (true);
CREATE POLICY "Allow All" ON message_comments FOR ALL USING (true) WITH CHECK (true);`}
                    </code>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`CREATE TABLE IF NOT EXISTS message_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author TEXT DEFAULT 'Anonymous',
  parent_id UUID REFERENCES message_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE message_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read" ON message_comments;
DROP POLICY IF EXISTS "Allow All" ON message_comments;
CREATE POLICY "Public Read" ON message_comments FOR SELECT USING (true);
CREATE POLICY "Allow All" ON message_comments FOR ALL USING (true) WITH CHECK (true);`);
                        showNotification("SQL copied to clipboard", "success");
                      }}
                      className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      Copy SQL
                    </button>
                  </div>
                )}
                {missingTables.some(t => t === 'analytics') && (
                  <div className="p-4 bg-slate-900 rounded-3xl space-y-3 border border-slate-800">
                    <p className="text-[10px] text-blue-400 font-bold uppercase">SQL Fix for Analytics:</p>
                    <code className="block text-[9px] text-slate-300 font-mono break-all bg-slate-800 p-3 rounded-xl border border-slate-700 whitespace-pre-wrap">
{`CREATE TABLE IF NOT EXISTS analytics (
  id TEXT PRIMARY KEY,
  total_visitors INTEGER DEFAULT 0,
  total_votes INTEGER DEFAULT 0,
  active_polls INTEGER DEFAULT 0,
  total_posts INTEGER DEFAULT 0,
  team_members INTEGER DEFAULT 0,
  active_ads INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
INSERT INTO analytics (id, total_visitors) VALUES ('main', 0) ON CONFLICT (id) DO NOTHING;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read" ON analytics;
DROP POLICY IF EXISTS "Allow All" ON analytics;
CREATE POLICY "Public Read" ON analytics FOR SELECT USING (true);
CREATE POLICY "Allow All" ON analytics FOR ALL USING (true) WITH CHECK (true);`}
                    </code>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`CREATE TABLE IF NOT EXISTS analytics (
  id TEXT PRIMARY KEY,
  total_visitors INTEGER DEFAULT 0,
  total_votes INTEGER DEFAULT 0,
  active_polls INTEGER DEFAULT 0,
  total_posts INTEGER DEFAULT 0,
  team_members INTEGER DEFAULT 0,
  active_ads INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
INSERT INTO analytics (id, total_visitors) VALUES ('main', 0) ON CONFLICT (id) DO NOTHING;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read" ON analytics;
DROP POLICY IF EXISTS "Allow All" ON analytics;
CREATE POLICY "Public Read" ON analytics FOR SELECT USING (true);
CREATE POLICY "Allow All" ON analytics FOR ALL USING (true) WITH CHECK (true);`);
                        showNotification("SQL copied to clipboard", "success");
                      }}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      Copy SQL
                    </button>
                  </div>
                )}
                {missingTables.some(t => t === 'ads') && (
                  <div className="p-4 bg-slate-900 rounded-3xl space-y-3 border border-slate-800">
                    <code className="block text-[9px] text-slate-300 font-mono break-all bg-slate-800 p-3 rounded-xl border border-slate-700 whitespace-pre-wrap">
{`CREATE TABLE IF NOT EXISTS ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT CHECK (media_type IN ('image', 'video')),
  link_url TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read" ON ads;
DROP POLICY IF EXISTS "Allow All" ON ads;
CREATE POLICY "Public Read" ON ads FOR SELECT USING (true);
CREATE POLICY "Allow All" ON ads FOR ALL USING (true) WITH CHECK (true);`}
                    </code>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`CREATE TABLE IF NOT EXISTS ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT CHECK (media_type IN ('image', 'video')),
  link_url TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read" ON ads;
DROP POLICY IF EXISTS "Allow All" ON ads;
CREATE POLICY "Public Read" ON ads FOR SELECT USING (true);
CREATE POLICY "Allow All" ON ads FOR ALL USING (true) WITH CHECK (true);`);
                        showNotification("SQL copied to clipboard", "success");
                      }}
                      className="w-full py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      Copy SQL
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                <Users size={24} />
              </div>
              <TrendingUp size={20} className="text-slate-200" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Visitors</p>
            <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{analytics?.total_visitors || 0}</h3>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 bg-brand-primary rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                <TrendingUp size={24} />
              </div>
              <Activity size={20} className="text-slate-200" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Votes</p>
            <h3 className="text-4xl font-black text-slate-900 tracking-tighter">
              {polls.reduce((acc, p) => acc + (p.total_votes || 0), 0).toLocaleString()}
            </h3>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 bg-brand-secondary rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                <BarChart3 size={24} />
              </div>
              <PieChart size={20} className="text-slate-200" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Polls</p>
            <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{polls.length}</h3>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 bg-brand-accent rounded-2xl flex items-center justify-center text-brand-primary shadow-lg group-hover:scale-110 transition-transform">
                <BookOpen size={24} />
              </div>
              <Edit3 size={20} className="text-slate-200" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Posts</p>
            <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{posts.length}</h3>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                <Users size={24} />
              </div>
              <Shield size={20} className="text-slate-200" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Team Members</p>
            <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{team.length}</h3>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                <Megaphone size={24} />
              </div>
              <Monitor size={20} className="text-slate-200" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Ads</p>
            <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{ads.filter(a => a.is_active).length}</h3>
          </div>
          <div className="bg-white p-4 rounded-2xl card-shadow border border-slate-50 space-y-1">
            <div className="flex items-center justify-between">
              <MessageSquare className="text-indigo-500" size={18} />
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Comments</span>
            </div>
            <p className="text-2xl font-black text-slate-800">{messageComments.length + postComments.length}</p>
          </div>
        </div>
      )}

      {activeTab === 'poll_groups' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[1.5rem] card-shadow border border-slate-50">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
              <PlusCircle className="mr-2 text-purple-600" size={20} /> Create New Poll Group
            </h3>
            <form onSubmit={handleCreatePollGroup} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Group Title</label>
                    <input
                      type="text"
                      value={newPollGroup.title || ''}
                      onChange={(e) => setNewPollGroup({ ...newPollGroup, title: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm font-medium"
                      placeholder="e.g., Presidential Election 2024"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Description</label>
                    <textarea
                      value={newPollGroup.description || ''}
                      onChange={(e) => setNewPollGroup({ ...newPollGroup, description: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm font-medium h-24"
                      placeholder="Describe this poll group..."
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Group Image (Optional)</label>
                    <div className="relative group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setNewPollGroup({ ...newPollGroup, image: e.target.files?.[0] || null })}
                        className="hidden"
                        id="poll-group-image"
                      />
                      <label
                        htmlFor="poll-group-image"
                        className="flex flex-col items-center justify-center w-full h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all"
                      >
                        {newPollGroup.image ? (
                          <div className="flex items-center space-x-2 text-purple-600">
                            <ImageIcon size={24} />
                            <span className="text-sm font-bold">{(newPollGroup.image as any).name}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center text-slate-400">
                            <Upload size={24} className="mb-2" />
                            <span className="text-xs font-bold uppercase">Upload Group Image</span>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Duration</label>
                      <select
                        value={newPollGroup.duration || 'never'}
                        onChange={(e) => setNewPollGroup({ ...newPollGroup, duration: e.target.value })}
                        className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none transition-all font-medium"
                      >
                        <option value="never">Never Ends</option>
                        <option value="1h">1 Hour</option>
                        <option value="6h">6 Hours</option>
                        <option value="1d">1 Day</option>
                        <option value="3d">3 Days</option>
                        <option value="7d">7 Days</option>
                        <option value="custom">Custom Date</option>
                      </select>
                    </div>
                    {newPollGroup.duration === 'custom' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Expires At</label>
                        <input
                          type="datetime-local"
                          value={newPollGroup.custom_expires_at || ''}
                          onChange={(e) => setNewPollGroup({ ...newPollGroup, custom_expires_at: e.target.value })}
                          className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none transition-all font-medium"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-black uppercase tracking-wider shadow-lg shadow-purple-200 transition-all text-xs"
              >
                Create Poll Group
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pollGroups.map((group) => (
              <div key={group.id} className="bg-white rounded-[1.5rem] card-shadow border border-slate-50 overflow-hidden flex flex-col">
                {group.image && (
                  <div className="h-32 overflow-hidden relative">
                    <img src={group.image} alt={group.title} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  </div>
                )}
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="text-base font-bold text-slate-800">{group.title}</h4>
                    <div className="flex space-x-1.5">
                      <button onClick={() => handleEdit(group.id, 'poll_groups', group)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => confirmDelete(group.id, 'poll_groups')} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">{group.description}</p>
                  <div className="mt-auto pt-3 border-t border-slate-50 flex justify-between items-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">
                      {polls.filter(p => p.group_id === group.id).length} Polls
                    </span>
                    {group.expires_at && (
                      <span className="text-[9px] font-bold text-purple-500 uppercase">
                        Ends: {new Date(group.expires_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {activeTab === 'polls' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Create Poll */}
          <div className="bg-white p-4 rounded-2xl card-shadow border border-slate-50 space-y-4 self-start">
            <h3 className="text-lg font-bold text-slate-800 flex items-center">
              <Plus className="mr-2 text-purple-600" size={20} /> Create New Poll
            </h3>
            <form onSubmit={handleCreatePoll} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Poll Group (Optional)</label>
                <select
                  value={newPoll.group_id || ''}
                  onChange={(e) => setNewPoll({ ...newPoll, group_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:border-purple-400 font-bold text-slate-600 text-xs"
                >
                  <option value="">No Group</option>
                  {pollGroups.map(group => (
                    <option key={group.id} value={group.id}>{group.title}</option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                placeholder="Poll Question"
                value={newPoll.question || ''}
                onChange={(e) => setNewPoll({ ...newPoll, question: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:border-purple-400 text-sm"
              />
              <textarea
                placeholder="Poll Description (Optional)"
                value={newPoll.description || ''}
                onChange={(e) => setNewPoll({ ...newPoll, description: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:border-purple-400 text-sm min-h-[80px] resize-none"
              />
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNewPoll({ ...newPoll, image: e.target.files?.[0] || null })}
                  className="hidden"
                  id="poll-image-upload"
                />
                <label 
                  htmlFor="poll-image-upload"
                  className="flex items-center justify-center p-2.5 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors text-slate-500 text-xs font-medium"
                >
                  <Camera size={16} className="mr-2" />
                  {newPoll.image ? (newPoll.image as any).name : 'Upload Poll Image (Optional)'}
                </label>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Poll Duration</label>
                <select
                  value={newPoll.duration || 'never'}
                  onChange={(e) => setNewPoll({ ...newPoll, duration: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:border-purple-400 font-bold text-slate-600 text-xs"
                >
                  <option value="never">Never Expires</option>
                  <option value="1h">1 Hour</option>
                  <option value="6h">6 Hours</option>
                  <option value="1d">1 Day</option>
                  <option value="3d">3 Days</option>
                  <option value="7d">7 Days</option>
                  <option value="custom">Custom Time</option>
                </select>
              </div>
              {newPoll.duration === 'custom' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase ml-2">Custom Expiration Date & Time</label>
                  <input
                    type="datetime-local"
                    value={newPoll.custom_expires_at || ''}
                    onChange={(e) => setNewPoll({ ...newPoll, custom_expires_at: e.target.value })}
                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:border-purple-400 font-bold text-slate-600 text-sm"
                  />
                </div>
              )}
              {newPoll.options.map((opt, i) => (
                <div key={i} className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Option {i + 1}</label>
                    {newPoll.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          const opts = newPoll.options.filter((_, index) => index !== i);
                          setNewPoll({ ...newPoll, options: opts });
                        }}
                        className="text-red-400 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder={`Option ${i + 1} text`}
                    value={opt.text || ''}
                    onChange={(e) => {
                      const opts = [...newPoll.options];
                      opts[i] = { ...opts[i], text: e.target.value };
                      setNewPoll({ ...newPoll, options: opts });
                    }}
                    className="w-full p-3 rounded-xl bg-white border border-slate-100 outline-none focus:border-purple-400 text-sm"
                  />
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const opts = [...newPoll.options];
                        opts[i] = { ...opts[i], image: e.target.files?.[0] || null };
                        setNewPoll({ ...newPoll, options: opts });
                      }}
                      className="hidden"
                      id={`opt-image-${i}`}
                    />
                    <label 
                      htmlFor={`opt-image-${i}`}
                      className="flex items-center justify-center p-2 rounded-lg bg-white border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors text-slate-400 text-[10px] font-bold uppercase"
                    >
                      <Camera size={14} className="mr-2" />
                      {opt.image ? (opt.image as any).name : 'Option Image (Optional)'}
                    </label>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setNewPoll({ ...newPoll, options: [...newPoll.options, { text: '', image: null }] })}
                className="text-sm font-bold text-purple-600 hover:text-purple-700 flex items-center"
              >
                <Plus size={16} className="mr-1" /> Add Option
              </button>
              <button type="submit" className="w-full bg-purple-600 text-white p-4 rounded-2xl font-bold shadow-lg hover:bg-purple-700 transition-all">
                Publish Poll
              </button>
            </form>
          </div>

            {/* Polls List */}
            <div className="space-y-3">
              {polls.map((poll) => {
                const isEnded = poll.is_ended || (poll.expires_at && isAfter(new Date(), new Date(poll.expires_at)));
                
                return (
                  <div key={poll.id} className="bg-white p-4 rounded-2xl border border-slate-100 card-shadow flex justify-between items-center group">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-slate-800 text-sm">{poll.question}</h4>
                        {isEnded && (
                          <span className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full text-[9px] font-black uppercase">Ended</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {poll.total_votes} votes • {poll.likes || 0} likes • {format(new Date(poll.created_at), 'MMM d, yyyy HH:mm:ss')}
                        {poll.expires_at && !isEnded && ` • Ends ${format(new Date(poll.expires_at), 'MMM d, HH:mm:ss')}`}
                      </p>
                    </div>
                    <div className="flex space-x-1.5">
                      <button 
                        onClick={() => setShowAnalysis(poll)}
                        className="p-1.5 text-indigo-400 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="View Analysis"
                      >
                        <PieChart size={16} />
                      </button>
                      {!isEnded && (
                        <button 
                          onClick={() => handleEndPoll(poll.id)}
                          className="p-1.5 text-orange-400 hover:bg-orange-50 rounded-lg transition-colors"
                          title="End Poll Now"
                        >
                          <Clock size={16} />
                        </button>
                      )}
                      <button 
                        onClick={() => handleEdit(poll.id, 'polls', { 
                          question: poll.question, 
                          options: poll.options, 
                          likes: poll.likes, 
                          is_ended: poll.is_ended, 
                          expires_at: poll.expires_at,
                          group_id: poll.group_id,
                          description: poll.description,
                          image: poll.image
                        })}
                        className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => confirmDelete(poll.id, 'polls')} 
                        className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
        </div>
      )}

      {activeTab === 'posts' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Create Post */}
          <div className="bg-white p-4 rounded-2xl card-shadow border border-slate-50 space-y-4 self-start">
            <h3 className="text-lg font-bold text-slate-800 flex items-center">
              <Plus className="mr-2 text-blue-600" size={20} /> Create New Post
            </h3>
            <form onSubmit={handleCreatePost} className="space-y-3">
              <input
                type="text"
                placeholder="Post Title"
                value={newPost.title || ''}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:border-blue-400 text-sm"
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 ml-2 uppercase tracking-wider">Author Name (Display)</label>
                  <input
                    type="text"
                    placeholder="Author Name"
                    value={newPost.author || ''}
                    onChange={(e) => setNewPost({ ...newPost, author: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:border-blue-400 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 ml-2 uppercase tracking-wider">Link to Team Member</label>
                  <select
                    value={newPost.author_id || ''}
                    onChange={(e) => {
                      const selectedTeam = team.find(t => t.id === e.target.value);
                      setNewPost({ 
                        ...newPost, 
                        author_id: e.target.value,
                        author: selectedTeam ? selectedTeam.name : newPost.author 
                      });
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:border-blue-400 font-bold text-slate-600 text-xs"
                  >
                    <option value="">Select Team Member (Optional)</option>
                    {team.map(member => (
                      <option key={member.id} value={member.id}>{member.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 ml-2 uppercase tracking-wider">Category</label>
                  <select
                    value={newPost.category || 'Gist'}
                    onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:border-blue-400 font-bold text-slate-600 text-xs"
                  >
                    {['Gist', 'News', 'Events', 'Drama', 'Trends'].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNewPost({ ...newPost, image: e.target.files?.[0] || null })}
                  className="hidden"
                  id="post-image-upload"
                />
                <label 
                  htmlFor="post-image-upload"
                  className="flex items-center justify-center p-2.5 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors text-slate-500 text-xs font-medium"
                >
                  <Camera size={16} className="mr-2" />
                  {newPost.image ? (newPost.image as any).name : 'Upload Image'}
                </label>
              </div>
              <textarea
                placeholder="Post Content"
                value={newPost.content || ''}
                onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                className="w-full h-32 p-3 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:border-blue-400 resize-none text-sm"
              />
              <input
                type="text"
                placeholder="External URL (Optional)"
                value={newPost.url || ''}
                onChange={(e) => setNewPost({ ...newPost, url: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:border-blue-400 text-sm"
              />
              <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all text-xs">
                Publish Post
              </button>
            </form>
          </div>

          {/* Posts List */}
          <div className="space-y-3">
            {posts.map((post) => (
              <div key={post.id} className="bg-white p-4 rounded-2xl border border-slate-100 card-shadow flex justify-between items-center group">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shadow-inner">
                    <img src={post.image || `https://picsum.photos/seed/${post.id}/100/100`} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-slate-800 line-clamp-1 text-sm">{post.title}</h4>
                    <p className="text-[10px] text-slate-400">{post.likes} likes • {format(new Date(post.created_at), 'MMM d, yyyy')}</p>
                  </div>
                </div>
                <div className="flex space-x-1.5">
                  <button 
                    onClick={() => handleEdit(post.id, 'posts', { 
                      title: post.title, 
                      author: post.author, 
                      content: post.content, 
                      image: post.image, 
                      category: post.category || 'Gist',
                      url: post.url,
                      likes: post.likes
                    })}
                    className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => confirmDelete(post.id, 'posts')} 
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[2.5rem] card-shadow border border-slate-100 space-y-4">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                <MessageSquare size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Create New Confession</h3>
            </div>
            <form onSubmit={handleCreateMessage} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500 ml-2">Confession Content</label>
                <textarea
                  value={newMessage.content}
                  onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                  className="w-full h-32 p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-orange-400 resize-none font-medium text-slate-700"
                  placeholder="Type the confession here..."
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500 ml-2">External URL (Optional)</label>
                <input
                  type="text"
                  value={newMessage.url}
                  onChange={(e) => setNewMessage({ ...newMessage, url: e.target.value })}
                  className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-orange-400 font-medium text-slate-700"
                  placeholder="https://example.com"
                />
              </div>
              <button
                type="submit"
                className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl shadow-lg shadow-orange-200 transition-all flex items-center justify-center space-x-2"
              >
                <Plus size={20} />
                <span>Post Confession</span>
              </button>
            </form>
          </div>

          <div className="space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`bg-white p-4 rounded-[1.5rem] border ${msg.approved ? 'border-green-100 bg-green-50/10' : 'border-orange-100 bg-orange-50/10'} card-shadow space-y-3`}>
                <p className="text-slate-700 italic leading-relaxed text-sm">"{msg.content}"</p>
                {msg.url && (
                  <a href={msg.url} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-500 hover:underline flex items-center">
                    <Globe size={12} className="mr-1" />
                    Visit Link
                  </a>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-400">{format(new Date(msg.created_at), 'MMM d, h:mm a')}</span>
                  <div className="flex space-x-1.5">
                    <button
                      onClick={() => handleEdit(msg.id, 'messages', { content: msg.content, approved: msg.approved, likes: msg.likes, url: msg.url })}
                      className="p-2 text-slate-400 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => setMessageApproval(msg.id, true)}
                      className={`p-2 rounded-xl transition-all shadow-sm ${
                        msg.approved ? 'bg-green-500 text-white' : 'bg-green-100 text-green-600'
                      }`}
                      title="Approve"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => setMessageApproval(msg.id, false)}
                      className={`p-2 rounded-xl transition-all shadow-sm ${
                        !msg.approved ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-600'
                      }`}
                      title="Reject (Unapprove)"
                    >
                      <X size={16} />
                    </button>
                    <button 
                      onClick={() => confirmDelete(msg.id, 'messages')} 
                      className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-all"
                      title="Delete Permanently"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {messages.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                <p className="text-slate-400 text-sm">No messages to manage.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Create Team Member */}
          <div className="bg-white p-4 rounded-2xl card-shadow border border-slate-50 space-y-4 self-start">
            <h3 className="text-lg font-bold text-slate-800 flex items-center">
              <Plus className="mr-2 text-pink-600" size={20} /> Add Team Member
            </h3>
            <form onSubmit={handleCreateTeamMember} className="space-y-3">
              <input
                type="text"
                placeholder="Full Name"
                value={newTeamMember.name || ''}
                onChange={(e) => setNewTeamMember({ ...newTeamMember, name: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:border-pink-400 text-sm"
              />
              <input
                type="text"
                placeholder="Role (e.g. CEO, Editor)"
                value={newTeamMember.role || ''}
                onChange={(e) => setNewTeamMember({ ...newTeamMember, role: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:border-pink-400 text-sm"
              />
              <textarea
                placeholder="Bio (Optional)"
                value={newTeamMember.bio || ''}
                onChange={(e) => setNewTeamMember({ ...newTeamMember, bio: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:border-pink-400 resize-none h-20 text-sm"
              />
              <input
                type="text"
                placeholder="External URL (Optional)"
                value={newTeamMember.url || ''}
                onChange={(e) => setNewTeamMember({ ...newTeamMember, url: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:border-pink-400 text-sm"
              />
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNewTeamMember({ ...newTeamMember, image: e.target.files?.[0] || null })}
                  className="hidden"
                  id="team-image-upload"
                />
                <label 
                  htmlFor="team-image-upload"
                  className="flex items-center justify-center p-2.5 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors text-slate-500 text-xs font-medium"
                >
                  <Camera size={16} className="mr-2" />
                  {newTeamMember.image ? newTeamMember.image.name : 'Upload Profile Photo'}
                </label>
              </div>
              <button type="submit" className="w-full bg-pink-600 text-white p-3 rounded-xl font-bold shadow-lg hover:bg-pink-700 transition-all text-xs">
                Add Member
              </button>
            </form>
          </div>

          {/* Team List */}
          <div className="space-y-3">
            {team.map((member) => (
              <div key={member.id} className="bg-white p-4 rounded-2xl border border-slate-100 card-shadow flex justify-between items-center group">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shadow-inner">
                    <img src={member.image || `https://picsum.photos/seed/${member.id}/100/100`} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-slate-800 text-sm">{member.name}</h4>
                    <p className="text-[10px] text-slate-400">{member.role} • {member.likes || 0} likes</p>
                  </div>
                </div>
                <div className="flex space-x-1.5">
                  <button 
                    onClick={() => handleEdit(member.id, 'team', { 
                      name: member.name, 
                      role: member.role, 
                      bio: member.bio, 
                      image: member.image,
                      url: member.url,
                      likes: member.likes
                    })}
                    className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => confirmDelete(member.id, 'team')} 
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {team.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                <p className="text-slate-400 text-sm">No team members yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'ads' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Create Ad */}
          <div className="bg-white p-4 rounded-2xl card-shadow border border-slate-50 space-y-4 self-start">
            <h3 className="text-lg font-bold text-slate-800 flex items-center">
              <Megaphone className="mr-2 text-yellow-600" size={20} /> Create New Ad
            </h3>
            <form onSubmit={handleCreateAd} className="space-y-3">
              <input
                type="text"
                placeholder="Ad Name"
                value={newAd.name || ''}
                onChange={(e) => setNewAd({ ...newAd, name: e.target.value })}
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:border-yellow-400 text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={newAd.media_type || 'image'}
                  onChange={(e) => setNewAd({ ...newAd, media_type: e.target.value as 'image' | 'video' })}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:border-yellow-400 font-bold text-slate-600 text-xs"
                >
                  <option value="image">Image Ad</option>
                  <option value="video">Video Ad</option>
                </select>
                <div className="relative">
                  <input
                    type="file"
                    accept={newAd.media_type === 'image' ? 'image/*' : 'video/*'}
                    onChange={(e) => setNewAd({ ...newAd, mediaFile: e.target.files?.[0] || null })}
                    className="hidden"
                    id="ad-media-upload"
                  />
                  <label 
                    htmlFor="ad-media-upload"
                    className="flex items-center justify-center p-2.5 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors text-slate-500 text-xs font-medium"
                  >
                    {newAd.media_type === 'image' ? <Camera size={16} className="mr-2" /> : <Video size={16} className="mr-2" />}
                    {newAd.mediaFile ? newAd.mediaFile.name : `Upload ${newAd.media_type}`}
                  </label>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase ml-2">Or Media URL</label>
                <input
                  type="text"
                  placeholder="https://example.com/image.jpg"
                  value={newAd.media_url || ''}
                  onChange={(e) => setNewAd({ ...newAd, media_url: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:border-yellow-400 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase ml-2">Destination Link</label>
                <input
                  type="text"
                  placeholder="https://yourlink.com"
                  value={newAd.link_url || ''}
                  onChange={(e) => setNewAd({ ...newAd, link_url: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:border-yellow-400 text-sm"
                />
              </div>
              <textarea
                placeholder="Short Description (Optional)"
                value={newAd.description || ''}
                onChange={(e) => setNewAd({ ...newAd, description: e.target.value })}
                className="w-full h-20 p-3 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:border-yellow-400 resize-none text-sm"
              />
              <button type="submit" className="w-full bg-yellow-500 text-white p-3 rounded-xl font-bold shadow-lg hover:bg-yellow-600 transition-all text-xs">
                Publish Ad
              </button>
            </form>
          </div>

          {/* Ads List */}
          <div className="space-y-3">
            {ads.map((ad) => (
              <div key={ad.id} className={`bg-white p-4 rounded-2xl border ${ad.is_active ? 'border-slate-100' : 'border-red-100 opacity-60'} card-shadow flex justify-between items-center group`}>
                <div className="flex items-center space-x-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shadow-inner relative">
                    {ad.media_type === 'image' ? (
                      <img src={ad.media_url} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white">
                        <Video size={18} />
                      </div>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-slate-800 flex items-center text-sm">
                      {ad.name}
                      {!ad.is_active && <span className="ml-2 text-[7px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full uppercase">Inactive</span>}
                    </h4>
                    <p className="text-[10px] text-slate-400 line-clamp-1">{ad.link_url}</p>
                    <p className="text-[9px] text-slate-300 uppercase font-bold tracking-widest">{format(new Date(ad.created_at), 'MMM d, yyyy')}</p>
                  </div>
                </div>
                <div className="flex space-x-1.5">
                  <button 
                    onClick={async () => {
                      const { error } = await supabase.from('ads').update({ is_active: !ad.is_active }).eq('id', ad.id);
                      if (error) showNotification("Failed to toggle status", "error");
                      else showNotification(ad.is_active ? "Ad deactivated" : "Ad activated", "success");
                    }}
                    className={`p-1.5 rounded-lg transition-colors ${ad.is_active ? 'text-green-500 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-50'}`}
                    title={ad.is_active ? "Deactivate" : "Activate"}
                  >
                    <Monitor size={16} />
                  </button>
                  <button 
                    onClick={() => handleEdit(ad.id, 'ads', { name: ad.name, media_url: ad.media_url, media_type: ad.media_type, link_url: ad.link_url, description: ad.description, is_active: ad.is_active })}
                    className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => confirmDelete(ad.id, 'ads')} 
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {ads.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                <p className="text-slate-400 text-sm">No ads running yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-slate-800 flex items-center">
            <MessageSquare className="mr-2 text-indigo-600" size={20} /> Manage Confession Comments
          </h3>
          {messageComments.map((comment) => {
            const parentMessage = messages.find(m => m.id === comment.message_id);
            return (
              <div key={comment.id} className="bg-white p-4 rounded-[1.5rem] border border-slate-100 card-shadow space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <p className="text-slate-700 font-medium leading-relaxed text-sm">{comment.content}</p>
                      {comment.parent_id && (
                        <span className="text-[9px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold uppercase">Reply</span>
                      )}
                    </div>
                    {parentMessage && (
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">On Confession:</p>
                        <p className="text-[11px] text-slate-500 line-clamp-2 italic">"{parentMessage.content}"</p>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => confirmDelete(comment.id, 'message_comments')} 
                    className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-all flex-shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="text-[10px] text-slate-400 flex items-center space-x-1.5">
                  <Clock size={10} />
                  <span>{format(new Date(comment.created_at), 'MMM d, h:mm a')}</span>
                </div>
              </div>
            );
          })}
          {messageComments.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
              <p className="text-slate-400 text-sm">No confession comments to manage.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'blog_comments' && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-slate-800 flex items-center">
            <BookOpen className="mr-2 text-blue-600" size={20} /> Manage Blog Comments
          </h3>
          {postComments.map((comment) => {
            const parentPost = posts.find(p => p.id === comment.post_id);
            return (
              <div key={comment.id} className="bg-white p-4 rounded-[1.5rem] border border-slate-100 card-shadow space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <p className="text-slate-700 font-medium leading-relaxed text-sm">{comment.content}</p>
                      {comment.parent_id && (
                        <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-bold uppercase">Reply</span>
                      )}
                    </div>
                    {parentPost && (
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">On Post:</p>
                        <p className="text-[11px] text-slate-500 line-clamp-2 italic">"{parentPost.title}"</p>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => confirmDelete(comment.id, 'post_comments')} 
                    className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-all flex-shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="text-[10px] text-slate-400 flex items-center space-x-1.5">
                  <Clock size={10} />
                  <span>{format(new Date(comment.created_at), 'MMM d, h:mm a')}</span>
                </div>
              </div>
            );
          })}
          {postComments.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
              <p className="text-slate-400 text-sm">No blog comments to manage.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AdminPage = () => {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const adminPass = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';
    // Use trim() to avoid common copy-paste space issues, but only if the user didn't intentionally put spaces
    if (password === adminPass || password.trim() === adminPass) {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Invalid password. Access denied.');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 bg-slate-50/50">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl p-8 md:p-10 border border-white/5 space-y-8"
        >
          <div className="text-center space-y-3">
            <div className="flex justify-center mb-6">
              <Logo iconClassName="w-20 h-20" dark={true} />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">Admin Access</h1>
            <p className="text-sm text-slate-400 font-medium">Enter the secret password to continue.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/50 outline-none transition-all text-center text-base tracking-widest font-mono text-white placeholder:text-slate-600"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {error && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[10px] text-red-500 text-center font-bold"
                >
                  {error}
                </motion.p>
              )}
            </div>
            <button
              type="submit"
              className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black shadow-xl hover:bg-slate-800 transition-all text-xs uppercase tracking-widest active:scale-[0.98]"
            >
              Unlock Dashboard
            </button>
            <p className="text-[9px] text-slate-400 text-center mt-4">
              Default password is <code className="bg-slate-100 px-1 rounded text-slate-600">admin123</code> if not set in Vercel.
            </p>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <AdminDashboard />
    </div>
  );
};

export default AdminPage;
