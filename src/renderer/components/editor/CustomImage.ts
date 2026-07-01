import Image from '@tiptap/extension-image';

export const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute('width') || element.style.width || null,
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return { width: attributes.width };
        },
      },
      align: {
        default: null,
        parseHTML: (element) => {
          return element.getAttribute('align') || element.style.textAlign || null;
        },
        renderHTML: (attributes) => {
          if (!attributes.align) return {};
          return { align: attributes.align };
        },
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const { align, width } = HTMLAttributes;
    let style = '';
    
    if (align === 'center') {
      style += 'display: block; margin: 0 auto;';
    } else if (align === 'left') {
      style += 'display: block; margin: 0 auto 0 0;';
    } else if (align === 'right') {
      style += 'display: block; margin: 0 0 0 auto;';
    }

    if (width) {
      style += `width: ${width};`;
    }

    return ['img', { ...HTMLAttributes, style: style || undefined }];
  },

  renderMarkdown: (node) => {
    const { src, alt, title, width, align } = node.attrs;
    
    if (width || align) {
      let style = '';
      if (align === 'center') {
        style = 'display: block; margin: 0 auto;';
      } else if (align === 'left') {
        style = 'display: block; margin: 0 auto 0 0;';
      } else if (align === 'right') {
        style = 'display: block; margin: 0 0 0 auto;';
      }
      
      const widthAttr = width ? ` width="${width}"` : '';
      const styleAttr = style ? ` style="${style}"` : '';
      const altAttr = alt ? ` alt="${alt}"` : '';
      const titleAttr = title ? ` title="${title}"` : '';
      
      return `<img src="${src}"${altAttr}${titleAttr}${widthAttr}${styleAttr} />`;
    }

    const titleString = title ? ` "${title}"` : '';
    return `![${alt || ''}](${src}${titleString})`;
  }
} as any);
