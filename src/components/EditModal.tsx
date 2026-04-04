import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, AlertCircle, Camera } from 'lucide-react';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  title: string;
  initialData: any;
  type: 'poll' | 'post' | 'message' | 'team' | 'ad' | 'poll_group';
  pollGroups?: any[];
  team?: any[];
}

const EditModal: React.FC<EditModalProps> = ({ isOpen, onClose, onSave, title, initialData, type, pollGroups = [], team = [] }) => {
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Ensure all expected fields are at least empty strings to avoid uncontrolled input warnings
    const sanitizedData = { ...initialData };
    if (type === 'poll') {
      sanitizedData.question = sanitizedData.question || '';
      sanitizedData.description = sanitizedData.description || '';
      sanitizedData.options = sanitizedData.options || [{ text: '', image: null }, { text: '', image: null }];
      sanitizedData.group_id = sanitizedData.group_id || '';
      sanitizedData.likes = sanitizedData.likes ?? 0;
      sanitizedData.is_ended = sanitizedData.is_ended ?? false;
      sanitizedData.expires_at = sanitizedData.expires_at || '';
    } else if (type === 'poll_group') {
      sanitizedData.title = sanitizedData.title || '';
      sanitizedData.description = sanitizedData.description || '';
      sanitizedData.expires_at = sanitizedData.expires_at || '';
      sanitizedData.is_ended = sanitizedData.is_ended ?? false;
    } else if (type === 'post') {
      sanitizedData.title = sanitizedData.title || '';
      sanitizedData.author = sanitizedData.author || '';
      sanitizedData.content = sanitizedData.content || '';
      sanitizedData.author_id = sanitizedData.author_id || '';
      sanitizedData.category = sanitizedData.category || 'Gist';
    } else if (type === 'ad') {
      sanitizedData.name = sanitizedData.name || '';
      sanitizedData.link_url = sanitizedData.link_url || '';
      sanitizedData.description = sanitizedData.description || '';
      sanitizedData.media_type = sanitizedData.media_type || 'image';
    } else if (type === 'team') {
      sanitizedData.name = sanitizedData.name || '';
      sanitizedData.role = sanitizedData.role || '';
      sanitizedData.bio = sanitizedData.bio || '';
    }
    setFormData(sanitizedData);
  }, [initialData, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save changes");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100"
        >
          <div className="p-6 md:p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-xl font-bold text-slate-800">{title}</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <X size={20} className="text-slate-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center space-x-3 text-red-600 text-sm font-medium">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {type === 'poll' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500 ml-2">Poll Group (Optional)</label>
                  <select
                    value={formData.group_id || ''}
                    onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                    className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-purple-400 font-bold text-slate-600 text-sm"
                  >
                    <option value="">No Group</option>
                    {pollGroups.map((group: any) => (
                      <option key={group.id} value={group.id}>{group.title}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500 ml-2">Poll Question</label>
                  <input
                    type="text"
                    value={formData.question}
                    onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                    className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-purple-400"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500 ml-2">Poll Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-purple-400 min-h-[100px] resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500 ml-2">Options</label>
                  {formData.options.map((opt: any, i: number) => {
                    const optionText = typeof opt === 'string' ? opt : opt.text;
                    const optionImage = typeof opt === 'string' ? null : opt.image;
                    return (
                      <div key={i} className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={optionText}
                            onChange={(e) => {
                              const opts = [...formData.options];
                              if (typeof opts[i] === 'string') {
                                opts[i] = { text: e.target.value, image: null };
                              } else {
                                opts[i] = { ...opts[i], text: e.target.value };
                              }
                              setFormData({ ...formData, options: opts });
                            }}
                            className="flex-1 p-2 rounded-lg bg-white border border-slate-100 outline-none focus:border-purple-400 text-sm"
                            placeholder={`Option ${i + 1}`}
                            required
                          />
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                const opts = [...formData.options];
                                if (typeof opts[i] === 'string') {
                                  opts[i] = { text: opts[i], image: null, imageFile: file };
                                } else {
                                  opts[i] = { ...opts[i], imageFile: file };
                                }
                                setFormData({ ...formData, options: opts });
                              }}
                              className="hidden"
                              id={`edit-poll-opt-image-${i}`}
                            />
                            <label 
                              htmlFor={`edit-poll-opt-image-${i}`}
                              className={`p-2 rounded-lg border cursor-pointer transition-colors flex items-center justify-center ${
                                (opt.imageFile || optionImage) ? 'bg-purple-50 border-purple-200 text-purple-600' : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'
                              }`}
                            >
                              <Camera size={16} />
                            </label>
                          </div>
                        </div>
                        {(opt.imageFile || optionImage) && (
                          <div className="text-[10px] text-slate-400 ml-2 truncate max-w-[200px]">
                            {opt.imageFile ? opt.imageFile.name : 'Current Image'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500 ml-2">Likes Count</label>
                  <input
                    type="number"
                    value={formData.likes || 0}
                    onChange={(e) => setFormData({ ...formData, likes: parseInt(e.target.value) || 0 })}
                    className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-purple-400"
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500 ml-2">Poll Image</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFormData({ ...formData, imageFile: e.target.files?.[0] || null })}
                      className="hidden"
                      id="edit-poll-image-upload"
                    />
                    <label 
                      htmlFor="edit-poll-image-upload"
                      className="flex items-center justify-center p-4 rounded-2xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors text-slate-500 font-medium"
                    >
                      <Camera size={20} className="mr-2" />
                      {formData.imageFile ? formData.imageFile.name : (formData.image ? 'Change Image' : 'Add Image')}
                    </label>
                  </div>
                  {formData.image && !formData.imageFile && (
                    <div className="mt-2 relative w-full h-32 rounded-xl overflow-hidden border border-slate-100">
                      <img src={formData.image} alt="Current" className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
                      <button 
                        type="button"
                        onClick={() => setFormData({ ...formData, image: '' })}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-2xl">
                    <input
                      type="checkbox"
                      id="is_ended"
                      checked={formData.is_ended}
                      onChange={(e) => setFormData({ ...formData, is_ended: e.target.checked })}
                      className="w-5 h-5 rounded border-slate-300 text-purple-500 focus:ring-purple-500"
                    />
                    <label htmlFor="is_ended" className="font-bold text-slate-700">Poll Ended</label>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500 ml-2">Expiration Date</label>
                    <input
                      type="datetime-local"
                      value={formData.expires_at ? new Date(formData.expires_at).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setFormData({ ...formData, expires_at: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:border-purple-400 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {type === 'poll_group' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500 ml-2">Group Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-purple-400"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500 ml-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-purple-400 min-h-[100px] resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500 ml-2">Group Image</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFormData({ ...formData, imageFile: e.target.files?.[0] || null })}
                      className="hidden"
                      id="edit-group-image-upload"
                    />
                    <label 
                      htmlFor="edit-group-image-upload"
                      className="flex items-center justify-center p-4 rounded-2xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors text-slate-500 font-medium"
                    >
                      <Camera size={20} className="mr-2" />
                      {formData.imageFile ? formData.imageFile.name : (formData.image ? 'Change Image' : 'Add Image')}
                    </label>
                  </div>
                </div>
              </div>
            )}
            {type === 'post' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500 ml-2">Post Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-blue-400"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500 ml-2">Author (Display)</label>
                    <input
                      type="text"
                      value={formData.author}
                      onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:border-blue-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500 ml-2">Link to Team Member</label>
                    <select
                      value={formData.author_id || ''}
                      onChange={(e) => {
                        const selectedTeam = team.find(t => t.id === e.target.value);
                        setFormData({ 
                          ...formData, 
                          author_id: e.target.value,
                          author: selectedTeam ? selectedTeam.name : formData.author 
                        });
                      }}
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:border-blue-400 font-bold text-slate-600"
                    >
                      <option value="">Select Team Member (Optional)</option>
                      {team.map((member: any) => (
                        <option key={member.id} value={member.id}>{member.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500 ml-2">Category</label>
                    <select
                      value={formData.category || 'Gist'}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:border-blue-400 font-bold text-slate-600"
                    >
                      {['Gist', 'News', 'Events', 'Drama', 'Trends'].map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500 ml-2">Image</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFormData({ ...formData, imageFile: e.target.files?.[0] || null })}
                      className="hidden"
                      id="edit-post-image-upload"
                    />
                    <label 
                      htmlFor="edit-post-image-upload"
                      className="flex items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors text-slate-500 text-sm font-medium"
                    >
                      <Camera size={18} className="mr-2" />
                      {formData.imageFile ? formData.imageFile.name : 'Change Image'}
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500 ml-2">Content</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full h-48 p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-blue-400 resize-none"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500 ml-2">Likes Count</label>
                  <input
                    type="number"
                    value={formData.likes || 0}
                    onChange={(e) => setFormData({ ...formData, likes: parseInt(e.target.value) || 0 })}
                    className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-purple-400"
                    min="0"
                  />
                </div>
              </div>
            )}

            {type === 'message' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500 ml-2">Message Content</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full h-48 p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-orange-400 resize-none"
                    required
                  />
                </div>
                <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-2xl">
                  <input
                    type="checkbox"
                    id="approved"
                    checked={formData.approved}
                    onChange={(e) => setFormData({ ...formData, approved: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                  />
                  <label htmlFor="approved" className="font-bold text-slate-700">Approved</label>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500 ml-2">Likes Count</label>
                  <input
                    type="number"
                    value={formData.likes || 0}
                    onChange={(e) => setFormData({ ...formData, likes: parseInt(e.target.value) || 0 })}
                    className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-orange-400"
                    min="0"
                  />
                </div>
              </div>
            )}

            {type === 'team' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500 ml-2">Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-pink-400"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500 ml-2">Role</label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-pink-400"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500 ml-2">Bio</label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-pink-400 resize-none h-24"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500 ml-2">Profile Photo</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFormData({ ...formData, imageFile: e.target.files?.[0] || null })}
                      className="hidden"
                      id="edit-team-image-upload"
                    />
                    <label 
                      htmlFor="edit-team-image-upload"
                      className="flex items-center justify-center p-4 rounded-2xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors text-slate-500 font-medium"
                    >
                      <Camera size={20} className="mr-2" />
                      {formData.imageFile ? formData.imageFile.name : 'Change Photo'}
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500 ml-2">Likes Count</label>
                  <input
                    type="number"
                    value={formData.likes || 0}
                    onChange={(e) => setFormData({ ...formData, likes: parseInt(e.target.value) || 0 })}
                    className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-pink-400"
                    min="0"
                  />
                </div>
              </div>
            )}

            {type === 'ad' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500 ml-2">Ad Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-yellow-400"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500 ml-2">Media Type</label>
                    <select
                      value={formData.media_type}
                      onChange={(e) => setFormData({ ...formData, media_type: e.target.value as 'image' | 'video' })}
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 outline-none focus:border-yellow-400 font-bold text-slate-600"
                    >
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500 ml-2">Upload New Media</label>
                    <div className="relative">
                      <input
                        type="file"
                        accept={formData.media_type === 'image' ? 'image/*' : 'video/*'}
                        onChange={(e) => setFormData({ ...formData, imageFile: e.target.files?.[0] || null })}
                        className="hidden"
                        id="edit-ad-media-upload"
                      />
                      <label 
                        htmlFor="edit-ad-media-upload"
                        className="flex items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors text-slate-500 text-sm font-medium"
                      >
                        <Camera size={18} className="mr-2" />
                        {formData.imageFile ? formData.imageFile.name : 'Change Media'}
                      </label>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500 ml-2">Media URL (Fallback)</label>
                  <input
                    type="text"
                    value={formData.media_url}
                    onChange={(e) => setFormData({ ...formData, media_url: e.target.value })}
                    className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-yellow-400"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500 ml-2">Destination Link</label>
                  <input
                    type="text"
                    value={formData.link_url}
                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                    className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-yellow-400"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500 ml-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full h-24 p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-yellow-400 resize-none"
                  />
                </div>
                <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-2xl">
                  <input
                    type="checkbox"
                    id="ad-active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300 text-yellow-500 focus:ring-yellow-500"
                  />
                  <label htmlFor="ad-active" className="font-bold text-slate-700">Active</label>
                </div>
              </div>
            )}

            <div className="flex space-x-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-4 rounded-2xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-4 rounded-2xl font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-lg transition-all flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Save size={18} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default EditModal;
