import React, { useState } from 'react';
import { Bell, Plus, X, Clock } from 'lucide-react';
import styles from './MetadataBar.module.css';

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
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);

      const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      
      if (date.toDateString() === today.toDateString()) {
        return `Today, ${timeStr}`;
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return `Tomorrow, ${timeStr}`;
      } else {
        return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at ${timeStr}`;
      }
    } catch {
      return '';
    }
  };

  return (
    <div className={styles.container}>
      {/* TAGS LIST */}
      <div className={styles.tagsList}>
        {tags.map(tag => (
          <span key={tag} className={styles.tagPill}>
            #{tag}
            <button
              onClick={() => handleRemoveTag(tag)}
              title="Remove tag"
              className={styles.removeBtn}
            >
              <X size={10} />
            </button>
          </span>
        ))}

        {showAddTag ? (
          <form onSubmit={handleAddTag} className={styles.addTagForm}>
            <input
              type="text"
              value={newTagText}
              onChange={(e) => setNewTagText(e.target.value)}
              placeholder="tag..."
              autoFocus
              onBlur={() => setShowAddTag(false)}
              className={styles.newTagInput}
            />
          </form>
        ) : (
          <button
            onClick={() => setShowAddTag(true)}
            className={styles.addBtn}
            title="Add Tag"
          >
            <Plus size={12} />
          </button>
        )}
      </div>

      {/* REMINDER SECTION */}
      <div className={styles.reminderSection}>
        {reminder ? (
          <div className={styles.reminderPill}>
            <Bell size={12} className={styles.reminderIcon} />
            <span className={styles.reminderText}>{formatReminderDate(reminder)}</span>
            <button
              onClick={() => onReminderChange(null)}
              title="Clear Reminder"
              className={styles.removeBtn}
            >
              <X size={10} />
            </button>
          </div>
        ) : (
          <div className={styles.reminderPickerWrapper}>
            <input
              type="datetime-local"
              onChange={handleReminderChange}
              className={styles.reminderInput}
              title="Set Reminder Date"
            />
            <button className={styles.addReminderBtn}>
              <Clock size={12} className={styles.reminderIcon} />
              <span>Add reminder</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
