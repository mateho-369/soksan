import { Fragment } from 'react';
import { Link } from 'react-router-dom';

interface RichCaptionProps {
  text: string;
  hashtags?: string;
  className?: string;
  tagClassName?: string;
}

const TOKEN_REGEX = /([#@][\w\u1780-\u17FF.-]+)/g;

/**
 * Parses #hashtags and @mentions in captions and hashtag strings and renders
 * them as clickable <Link> elements routing to /discover?q=...
 * If a caption has no inline #/@ tokens, the plain string is rendered directly
 * as a single text node so substring text matchers remain intact.
 */
export function RichCaption({ text, hashtags, className = '', tagClassName = '' }: RichCaptionProps) {
  const hasInlineTokens = /[#@][\w\u1780-\u17FF]/.test(text);
  const parts = hasInlineTokens ? text.split(TOKEN_REGEX) : [text];

  const extraTags = hashtags
    ? hashtags
        .split(/\s+/)
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];

  return (
    <>
      <p className={className}>
        {hasInlineTokens
          ? parts.map((part, index) => {
              if (part.startsWith('#') && part.length > 1) {
                const clean = part.slice(1);
                return (
                  <Link
                    key={`${part}-${index}`}
                    to={`/discover?q=${encodeURIComponent(clean)}&tab=tags`}
                    className={`rich-tag-link hashtag-link ${tagClassName}`.trim()}
                  >
                    {part}
                  </Link>
                );
              }
              if (part.startsWith('@') && part.length > 1) {
                const clean = part.slice(1);
                return (
                  <Link
                    key={`${part}-${index}`}
                    to={`/discover?q=${encodeURIComponent(clean)}&tab=users`}
                    className={`rich-tag-link mention-link ${tagClassName}`.trim()}
                  >
                    {part}
                  </Link>
                );
              }
              return <Fragment key={index}>{part}</Fragment>;
            })
          : text}
      </p>
      {extraTags.length > 0 && (
        <div className="rich-hashtags-row" aria-label="Post tags">
          {extraTags.map((rawTag, idx) => {
            const formatted = rawTag.startsWith('#') || rawTag.startsWith('@') ? rawTag : `#${rawTag}`;
            const queryValue = formatted.replace(/^[#@]/, '');
            const isMention = formatted.startsWith('@');
            return (
              <Link
                key={`${formatted}-${idx}`}
                to={`/discover?q=${encodeURIComponent(queryValue)}&tab=${isMention ? 'users' : 'tags'}`}
                className={`rich-tag-pill ${isMention ? 'mention-pill' : 'hashtag-pill'}`}
              >
                {formatted}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

export default RichCaption;
