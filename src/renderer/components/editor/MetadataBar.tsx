import React, { useState } from 'react';
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
    <div className={styles.container}>
      <div className={styles.header}>
        {/* Title/Label or Brief Metadata Preview when collapsed */}
        <div className={styles.previewWrapper}>
          <span className={styles.label}>Metadata</span>
          {!isOpen && (
            <div className={styles.previewList}>
              {tags.map(tag => (
                <span key={tag} className={styles.tagPreview}>#{tag}</span>
              ))}
              {reminder && (
                <span className={styles.reminderPreview}>⏰ {formatReminderDate(reminder)}</span>
              )}
            </div>
          )}
        </div>

        {/* Collapsible toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          title={isOpen ? "Collapse Metadata" : "Expand Metadata"}
          className={styles.toggleBtn}
        >
          ···
        </button>
      </div>

      {isOpen && (
        <div className={`${styles.detailsPanel} animate-fade-in`}>
          {/* TAGS SECTION */}
          <div className={styles.tagsSection}>
            <span className={styles.sectionTitle}>Tags:</span>
            {tags.map(tag => (
              <span
                key={tag}
                className={styles.tagPill}
              >
                #{tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  title="Remove tag"
                  className={styles.removeBtn}
                >
                  ×
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
                  className={styles.newTagInput}
                />
                <button type="submit" className="hidden" />
              </form>
            ) : (
              <button
                onClick={() => setShowAddTag(true)}
                className={styles.addTagTrigger}
              >
                + Tag
              </button>
            )}
          </div>

          {/* REMINDER SECTION */}
          <div className={styles.reminderSection}>
            <span className={styles.sectionTitle}>Reminder:</span>
            {reminder ? (
              <div className={styles.reminderPill}>
                <svg style={{ color: 'var(--accent-primary)', width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{formatReminderDate(reminder)}</span>
                <button
                  onClick={() => onReminderChange(null)}
                  title="Clear Reminder"
                  className={styles.removeBtn}
                >
                  ×
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
                <button className={styles.reminderBtn}>
                  <svg style={{ width: '12px', height: '12px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
