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

    // No real-time for team member likes to save resources
    return () => {};
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
      className="group bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 hover:border-brand-secondary hover:shadow-2xl transition-all duration-500 flex flex-col"
    >
      <div className="aspect-[4/5] relative overflow-hidden bg-slate-50">
        <img 
          src={member.image || `https://picsum.photos/seed/${member.id}/400/500`} 
          alt={member.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
        
        <div className="absolute top-6 right-6 z-10">
          <button 
            onClick={handleLike}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl backdrop-blur-md transition-all ${liked ? 'bg-brand-accent text-brand-primary' : 'bg-white/20 text-white hover:bg-white/40'}`}
          >
            <Heart size={14} fill={liked ? 'currentColor' : 'none'} />
            <span className="text-[10px] font-black uppercase tracking-widest">{localLikes}</span>
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
          <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
            <button className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-brand-secondary hover:text-white transition-all">
              <Twitter size={16} />
            </button>
            <button className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-brand-secondary hover:text-white transition-all">
              <Linkedin size={16} />
            </button>
            <button className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-brand-secondary hover:text-white transition-all">
              <Mail size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-3 text-center flex-grow flex flex-col justify-center">
        <div className="space-y-1">
          <div className="flex items-center justify-center space-x-2">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{member.name}</h3>
            <ShieldCheck size={18} className="text-brand-secondary" />
          </div>
          <p className="text-brand-secondary font-black text-[10px] uppercase tracking-[0.3em]">{member.role}</p>
        </div>
        
        {member.bio && (
          <p className="text-slate-500 text-xs font-medium leading-relaxed italic opacity-80">
            "{member.bio}"
          </p>
        )}
        
        <div className="pt-4 flex justify-center">
          <button className="text-[10px] font-black text-slate-400 hover:text-brand-secondary flex items-center space-x-2 uppercase tracking-widest transition-colors group/btn">
            <span>View Profile</span>
            <ExternalLink size={12} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
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

    // No real-time for team page to save resources
    return () => {};
  }, []);

  const fetchTeam = async () => {
    try {
      const { data, error } = await supabase
        .from('team')
        .select('id, name, role, bio, image, likes, created_at')
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
    <div className="min-h-screen pt-24 pb-24 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-6xl mx-auto space-y-24">
        {/* Header */}
        <div className="text-center space-y-8 bg-brand-primary p-16 md:p-24 rounded-[3rem] shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_50%)]"></div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center space-x-2 bg-white/10 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] relative z-10"
          >
            <Users size={16} />
            <span>Meet the Visionaries</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase leading-none relative z-10"
          >
            THE MINDS BEHIND <span className="text-brand-accent">CEE MEDIA</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-indigo-100 text-lg md:text-xl max-w-2xl mx-auto font-medium tracking-tight opacity-90 relative z-10"
          >
            A diverse group of creators, thinkers, and storytellers dedicated to bringing you the best in entertainment and news.
          </motion.p>
        </div>

        {/* Team Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-[2.5rem] border border-slate-100 h-[500px] animate-pulse flex flex-col">
                <div className="aspect-[4/5] bg-slate-100" />
                <div className="p-8 space-y-4 flex-grow flex flex-col justify-center items-center">
                  <div className="h-8 bg-slate-100 rounded-xl w-3/4" />
                  <div className="h-4 bg-slate-100 rounded-lg w-1/2" />
                  <div className="h-4 bg-slate-100 rounded-lg w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {team.map((member) => (
              <TeamMemberCard key={member.id} member={member} />
            ))}
          </div>
        )}

        {!loading && team.length === 0 && (
          <div className="text-center py-24 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-100 space-y-4">
            <Users size={48} className="mx-auto text-slate-200" />
            <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No team members listed yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamPage;
