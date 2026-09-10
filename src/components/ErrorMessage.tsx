interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div style={styles.container} role="alert">
      <span style={styles.icon}>⚠️</span>
      <span>{message}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '1rem',
    padding: '10px 14px',
    borderRadius: '6px',
    border: '1px solid #f5c6cb',
    background: '#fff5f5',
    color: '#c0392b',
    fontSize: '14px',
  },
  icon: {
    flexShrink: 0,
  },
};
