import React from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { Info, AlertTriangle, AlertCircle, Sparkles, LucideIcon } from 'lucide-react';
import styles from './Editor.module.css';

interface CalloutViewProps {
  node: {
    attrs: {
      type: 'note' | 'warning' | 'tip' | 'important' | 'caution' | null;
    };
  };
}

export const CalloutView: React.FC<CalloutViewProps> = ({ node }) => {
  const type = node.attrs.type;

  // Render a standard blockquote if no callout type is specified
  if (!type) {
    return (
      <NodeViewWrapper className="blockquote-wrapper">
        <blockquote>
          <NodeViewContent />
        </blockquote>
      </NodeViewWrapper>
    );
  }

  let Icon: LucideIcon = Info;
  let title = 'Note';
  let themeClass = styles.calloutNote;

  if (type === 'warning') {
    Icon = AlertTriangle;
    title = 'Warning';
    themeClass = styles.calloutWarning;
  } else if (type === 'tip') {
    Icon = Sparkles;
    title = 'Tip';
    themeClass = styles.calloutTip;
  } else if (type === 'important') {
    Icon = AlertCircle;
    title = 'Important';
    themeClass = styles.calloutImportant;
  } else if (type === 'caution') {
    Icon = AlertTriangle;
    title = 'Caution';
    themeClass = styles.calloutCaution;
  }

  return (
    <NodeViewWrapper className={`${styles.calloutBlock} ${themeClass}`}>
      <div className={styles.calloutHeader} contentEditable={false}>
        <Icon size={16} className={styles.calloutIcon} />
        <span className={styles.calloutTitle}>{title}</span>
      </div>
      <div className={styles.calloutContent}>
        <NodeViewContent />
      </div>
    </NodeViewWrapper>
  );
};

export default CalloutView;
