import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { supabase } from '../supabase';
import { TeamMember } from '../types';
import { Users, Linkedin, Twitter, Mail, ExternalLink, ShieldCheck, Heart } from 'lucide-react';

const TeamMemberCard: React.FC<{ member: TeamMember }> = ({ member }) => {
  const [liked, setLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(member.likes || 0);
  const storageKey = `liked_team_${member.id}`;

  useEffect(() => {
    const hasLiked = localStorage.getItem(storageKey);
    if (hasLiked) setLiked(true);
    setLocalLikes(member.likes || 0);
  }, [member.id, member.likes]);

  const handleLike = async () => {
    if (liked) return;
    
    setLocalLikes(prev => prev + 1);
    setLiked(true);
    localStorage.setItem(storageKey, 'true');

    try {
      const { data: currentMember, error: fetchError } = await supabase
        .from('team')
        .select('likes')
        .eq('id', member.id)
        .maybeSingle();
      
      if (fetchError) throw fetchError;

      const newLikes = (currentMember?.likes || 0) + 1;
      const { error } = await supabase
        .from('team')
        .update({ likes: newLikes })
        .eq('id', member.id);
      
      if (error) throw error;
    } catch (e) {
      console.error("Like failed", e);
      setLocalLikes(prev => Math.max(0, prev - 1));
      setLiked(false);
      localStorage.removeItem(storageKey);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-white rounded-[1rem] overflow-hidden card-shadow border border-slate-100 hover:border-pink-200 transition-all duration-500"
    >
      <div className="aspect-[4/5] relative overflow-hidden">
        <img 
          src={member.image || `https://picsum.photos/seed/${member.id}/800/1000`} 
          alt={member.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
        
        <div className="absolute top-3 right-3 z-10">
          <button 
            onClick={handleLike}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded-full backdrop-blur-md transition-all ${liked ? 'bg-pink-600 text-white' : 'bg-white/20 text-white hover:bg-white/40'}`}
          >
            <Heart size={12} fill={liked ? 'currentColor' : 'none'} />
            <span className="text-[9px] font-black">{localLikes}</span>
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
          <div className="flex space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
            <button className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-pink-600 transition-all">
              <Twitter size={12} />
            </button>
            <button className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-pink-600 transition-all">
              <Linkedin size={12} />
            </button>
            <button className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-pink-600 transition-all">
              <Mail size={12} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-3 space-y-0.5 text-center">
        <div className="flex items-center justify-center space-x-1">
          <h3 className="text-lg font-black text-slate-800">{member.name}</h3>
          <ShieldCheck size={14} className="text-blue-500" />
        </div>
        <p className="text-pink-600 font-bold text-[10px] uppercase tracking-widest">{member.role}</p>
        
        {member.bio && (
          <p className="text-slate-500 text-[10px] line-clamp-3 pt-1.5 leading-relaxed italic">
            "{member.bio}"
          </p>
        )}
        
        <div className="pt-3 flex justify-center">
          <button className="text-[9px] font-black text-slate-400 hover:text-slate-600 flex items-center space-x-1 uppercase tracking-tighter transition-colors">
            <span>View Profile</span>
            <ExternalLink size={9} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const TeamPage = () => {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeam();

    const channel = supabase
      .channel('team_page_channel')
      .on('postgres_changes' as any, { event: '*', table: 'team' }, () => {
        fetchTeam();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTeam = async () => {
    try {
      const { data, error } = await supabase
        .from('team')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTeam(data as TeamMember[]);
    } catch (e) {
      console.error('Error fetching team:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-16 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center space-x-1.5 bg-pink-100 text-pink-600 px-2.5 py-1 rounded-full text-[10px] font-bold"
          >
            <Users size={12} />
            <span>Meet the Visionaries</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight"
          >
            The Minds Behind <span className="text-pink-600">CEE MEDIA</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-500 text-xs sm:text-sm max-w-2xl mx-auto"
          >
            A diverse group of creators, thinkers, and storytellers dedicated to bringing you the best in entertainment and news.
          </motion.p>
        </div>

        {/* Team Grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-pink-600 border-t-transparent"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {team.map((member) => (
              <TeamMemberCard key={member.id} member={member} />
            ))}
          </div>
        )}

        {!loading && team.length === 0 && (
          <div className="text-center py-16 bg-white rounded-[1.25rem] border-2 border-dashed border-slate-200">
            <Users size={32} className="mx-auto text-slate-200 mb-2" />
            <p className="text-slate-400 font-medium text-sm">No team members listed yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamPage;
