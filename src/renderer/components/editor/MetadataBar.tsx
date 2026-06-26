import React, { useState } from 'react';

interface MetadataBarProps {
  tags: string[];
  reminder: string | null;
  onTagsChange: (newTags: string[]) => void;
  onReminderChange: (newReminder: string | null) => void;
}

export default function MetadataBar({
  tags,
  reminder,
  onTagsChange,
  onReminderChange
}: MetadataBarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [newTagText, setNewTagText] = useState('');
  const [showAddTag, setShowAddTag] = useState(false);

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTag = newTagText.trim().toLowerCase().replace(/#/g, '');
    if (cleanTag && !tags.includes(cleanTag)) {
      onTagsChange([...tags, cleanTag]);
      setNewTagText('');
      setShowAddTag(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(t => t !== tagToRemove));
  };

  const handleReminderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onReminderChange(val ? new Date(val).toISOString() : null);
  };

  const formatReminderDate = (isoString: string | null) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="w-full bg-[#111111] border-b border-white/5 flex flex-col flex-shrink-0 relative transition-all duration-200">
      <div className="flex items-center justify-between px-6 py-2 h-[40px]">
        {/* Title/Label or Brief Metadata Preview when collapsed */}
        <div className="flex items-center gap-2 overflow-hidden flex-grow pr-4">
          <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider select-none">Metadata</span>
          {!isOpen && (
            <div className="flex items-center gap-1.5 overflow-hidden truncate">
              {tags.map(tag => (
                <span key={tag} className="text-[9px] text-brand-amber font-mono">#{tag}</span>
              ))}
              {reminder && (
                <span className="text-[9px] text-brand-amber font-mono">⏰ {formatReminderDate(reminder)}</span>
              )}
            </div>
          )}
        </div>

        {/* Collapsible toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          title={isOpen ? "Collapse Metadata" : "Expand Metadata"}
          className="text-xs text-neutral-500 hover:text-white px-2 py-0.5 rounded hover:bg-neutral-800 transition-colors flex-shrink-0"
        >
          ···
        </button>
      </div>

      {isOpen && (
        <div className="px-6 pb-3 pt-1 flex flex-wrap items-center gap-4 border-t border-white/5 animate-fade-in">
          {/* TAGS SECTION */}
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-xs text-neutral-500 select-none">Tags:</span>
            {tags.map(tag => (
              <span
                key={tag}
                className="text-xs px-2.5 py-0.5 rounded border border-brand-amber/30 bg-brand-amber/5 text-brand-amber flex items-center gap-1 font-mono transition-all hover:bg-brand-amber/10"
              >
                #{tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  title="Remove tag"
                  className="text-neutral-500 hover:text-brand-amber font-sans font-bold pl-0.5 text-xs"
                >
                  ×
                </button>
              </span>
            ))}

            {showAddTag ? (
              <form onSubmit={handleAddTag} className="flex items-center">
                <input
                  type="text"
                  value={newTagText}
                  onChange={(e) => setNewTagText(e.target.value)}
                  placeholder="tag..."
                  autoFocus
                  className="bg-neutral-900 border border-brand-amber/50 rounded text-xs text-neutral-100 px-2 py-0.5 outline-none w-20 font-sans"
                />
                <button type="submit" className="hidden" />
              </form>
            ) : (
              <button
                onClick={() => setShowAddTag(true)}
                className="text-[10px] text-neutral-500 hover:text-white border border-dashed border-neutral-600 rounded px-2 py-0.5 transition-colors"
              >
                + Tag
              </button>
            )}
          </div>

          {/* REMINDER SECTION */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 select-none">Reminder:</span>
            {reminder ? (
              <div className="flex items-center gap-2 text-xs border border-brand-amber/30 bg-brand-amber/5 text-brand-amber rounded px-2.5 py-0.5 font-mono">
                <svg className="w-3.5 h-3.5 text-brand-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{formatReminderDate(reminder)}</span>
                <button
                  onClick={() => onReminderChange(null)}
                  title="Clear Reminder"
                  className="text-neutral-500 hover:text-brand-amber font-sans font-bold pl-1 text-xs"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="relative flex items-center">
                <input
                  type="datetime-local"
                  onChange={handleReminderChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  title="Set Reminder Date"
                />
                <button className="text-[10px] text-neutral-500 hover:text-white border border-dashed border-neutral-600 rounded px-2 py-0.5 transition-colors flex items-center gap-1 pointer-events-none">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  + Add Reminder
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
