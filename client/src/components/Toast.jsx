// ============================================================================
// Toast — THE MESSAGE AT THE BOTTOM
// ============================================================================

export function Toast({ toast, onDismiss }) {
  // Returning null renders nothing at all. It is the React equivalent of the
  // `hidden` attribute, and it is better: the element is not in the document,
  // so no stylesheet rule can accidentally reveal it.
  if (!toast) return null;

  return (
    // role="status" rather than "alert": alert interrupts whatever a screen
    // reader is currently saying, which is right for a failure and rude for
    // "Task deleted. Undo?".
    <div className={`toast toast--${toast.tone}`} role="status">
      <span>{toast.message}</span>

      {toast.action && (
        <button
          type="button"
          className="toast__action"
          onClick={() => {
            onDismiss();
            toast.action.onClick();
          }}
        >
          {toast.action.label}
        </button>
      )}
    </div>
  );
}
