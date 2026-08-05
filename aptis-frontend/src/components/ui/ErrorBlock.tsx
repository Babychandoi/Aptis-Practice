export function ErrorBlock({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-xl bg-red-50 p-5 text-center" role="alert">
      <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-red-100 text-red-700" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <path d="M12 8v5M12 17h.01" /><path d="M10.3 3.6 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z" />
        </svg>
      </span>
      <p className="mt-3 text-sm font-medium text-red-800">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary mt-3">
          Thử lại
        </button>
      )}
    </div>
  );
}
