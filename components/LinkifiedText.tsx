type LinkifiedTextProps = {
  text?: string | null;
  className?: string;
  style?: React.CSSProperties;
  emptyText?: string;
};

const urlPattern = /(https?:\/\/[^\s]+)/g;

export function LinkifiedText({
  text,
  className,
  style,
  emptyText = "-",
}: LinkifiedTextProps) {
  if (!text?.trim()) {
    return <span className={className} style={style}>{emptyText}</span>;
  }

  const parts = text.split(urlPattern);

  return (
    <span className={className} style={style}>
      {parts.map((part, index) => {
        if (urlPattern.test(part)) {
          return (
            <a
              key={`${part}-${index}`}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "var(--primary)",
                textDecoration: "underline",
                wordBreak: "break-all",
              }}
            >
              {part}
            </a>
          );
        }

        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}
