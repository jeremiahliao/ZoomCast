interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div
      className="mt-4 flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-danger-border)] bg-[var(--color-danger-surface)] px-3.5 py-2.5 text-sm text-[var(--color-danger-text)]"
      role="alert"
    >
      <span className="shrink-0">⚠️</span>
      <span>{message}</span>
    </div>
  );
}
