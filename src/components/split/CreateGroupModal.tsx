import React, { useState } from 'react';
import { X, UserPlus, Users, Check, Sparkles } from 'lucide-react';
import { Friend, SplitGroup } from '../../types';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (groupData: Omit<SplitGroup, 'id' | 'createdAt'>) => void;
  friends: Friend[];
  onAddFriend: (name: string, note?: string) => void;
}

const GROUP_ICONS = [
  { icon: '✈️', label: 'Trip' },
  { icon: '🏖️', label: 'Vacation' },
  { icon: '🏠', label: 'Home/Rent' },
  { icon: '🍽️', label: 'Food' },
  { icon: '🚗', label: 'Road Trip' },
  { icon: '🎉', label: 'Event/Party' },
  { icon: '💼', label: 'Project' },
  { icon: '🍿', label: 'Entertainment' },
  { icon: '🏷️', label: 'General' },
];

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  friends,
  onAddFriend,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('✈️');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [error, setError] = useState('');

  // Inline friend creation state
  const [isAddingInlineFriend, setIsAddingInlineFriend] = useState(false);
  const [inlineFriendName, setInlineFriendName] = useState('');
  const [inlineFriendNote, setInlineFriendNote] = useState('');

  if (!isOpen) return null;

  const toggleMember = (friendId: string) => {
    if (selectedMembers.includes(friendId)) {
      setSelectedMembers(selectedMembers.filter((id) => id !== friendId));
    } else {
      setSelectedMembers([...selectedMembers, friendId]);
    }
    setError('');
  };

  const handleSelectAll = () => {
    setSelectedMembers(friends.map((f) => f.id));
    setError('');
  };

  const handleClearAll = () => {
    setSelectedMembers([]);
  };

  const handleCreateInlineFriend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineFriendName.trim()) return;
    onAddFriend(inlineFriendName.trim(), inlineFriendNote.trim() || undefined);
    // Note: We'll automatically select new friends as they come in via effect or user click
    setInlineFriendName('');
    setInlineFriendNote('');
    setIsAddingInlineFriend(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a name for the group (e.g., VISIT TO PARIS).');
      return;
    }

    if (selectedMembers.length === 0) {
      setError('Please select at least 1 friend to split expenses with in this group.');
      return;
    }

    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      icon: selectedIcon,
      memberIds: ['YOU', ...selectedMembers],
      status: 'active',
    });

    setName('');
    setDescription('');
    setSelectedMembers([]);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 light:border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 light:text-slate-900">
                Create Split Group
              </h3>
              <p className="text-xs text-slate-400">
                Organize a trip, shared flat, or event to isolate group expenses
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 light:hover:text-slate-700 rounded-lg hover:bg-slate-800 light:hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Group Name & Icon Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1.5">
              Group Name *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. VISIT TO PARIS, Goa Trip 2026, Flat 402"
                className="flex-1 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-100 light:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Icon Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1.5">
              Group Theme Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {GROUP_ICONS.map((item) => (
                <button
                  key={item.icon}
                  type="button"
                  onClick={() => setSelectedIcon(item.icon)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border transition-all ${
                    selectedIcon === item.icon
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-semibold'
                      : 'bg-slate-950/60 light:bg-slate-50 border-slate-800 light:border-slate-200 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 light:text-slate-700 mb-1">
              Description / Notes (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Hotel, flights, museum passes, and dinners"
              className="w-full bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-100 light:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Members Selection */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 light:text-slate-700">
                Group Members ({selectedMembers.length + 1} selected)
              </label>
              <div className="flex items-center gap-2 text-xs">
                {friends.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-indigo-400 hover:underline text-[11px]"
                    >
                      Select All
                    </button>
                    <span className="text-slate-600">•</span>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="text-slate-400 hover:underline text-[11px]"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* "You" chip (always in group) */}
            <div className="p-2.5 rounded-xl bg-indigo-950/30 light:bg-indigo-50 border border-indigo-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
                  Y
                </div>
                <span className="font-semibold text-slate-100 light:text-slate-900">You (Organizer)</span>
              </div>
              <span className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">
                Default Member
              </span>
            </div>

            {/* Friends list */}
            {friends.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-800 light:border-slate-200 text-center space-y-2">
                <p className="text-xs text-slate-400">
                  No friends added yet. Add friends below to include them in this group!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {friends.map((friend) => {
                  const isSelected = selectedMembers.includes(friend.id);
                  return (
                    <button
                      key={friend.id}
                      type="button"
                      onClick={() => toggleMember(friend.id)}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all ${
                        isSelected
                          ? 'bg-indigo-600/15 border-indigo-500 text-slate-100 light:text-slate-900'
                          : 'bg-slate-950/40 light:bg-slate-50 border-slate-800 light:border-slate-200 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                          style={{ backgroundColor: friend.avatarColor || '#6366f1' }}
                        >
                          {friend.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-semibold truncate block">
                          {friend.name}
                        </span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'border-slate-700 light:border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Inline Add Friend Widget */}
            {!isAddingInlineFriend ? (
              <button
                type="button"
                onClick={() => setIsAddingInlineFriend(true)}
                className="w-full py-2 px-3 border border-dashed border-slate-800 hover:border-slate-700 light:border-slate-300 rounded-xl text-xs font-semibold text-slate-400 hover:text-indigo-400 flex items-center justify-center gap-1.5 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Add a new friend to this group</span>
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 space-y-2 animate-in fade-in duration-200">
                <div className="text-xs font-semibold text-slate-200 light:text-slate-800">
                  Quick Add Friend
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Friend's Name"
                    value={inlineFriendName}
                    onChange={(e) => setInlineFriendName(e.target.value)}
                    className="bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 light:text-slate-900"
                  />
                  <input
                    type="text"
                    placeholder="Role/Note (e.g. Travel buddy)"
                    value={inlineFriendNote}
                    onChange={(e) => setInlineFriendNote(e.target.value)}
                    className="bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 light:text-slate-900"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingInlineFriend(false)}
                    className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateInlineFriend}
                    disabled={!inlineFriendName.trim()}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold"
                  >
                    Save & Add Friend
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-3 border-t border-slate-800 light:border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 light:hover:text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all active:scale-95"
            >
              Create Group
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
