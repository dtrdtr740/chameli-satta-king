'use client';

/** A submit button that asks for confirmation first (used for deletes). */
export function ConfirmButton({
  message = 'Are you sure?',
  children,
  className = 'btn btn-sm btn-danger',
  formAction,
  name,
  value,
}: {
  message?: string;
  children: React.ReactNode;
  className?: string;
  formAction?: (fd: FormData) => void | Promise<void>;
  name?: string;
  value?: string | number;
}) {
  return (
    <button
      type="submit"
      className={className}
      formAction={formAction}
      formNoValidate={!!formAction}
      name={name}
      value={value}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

/** Standalone delete form: <DeleteForm action={deleteX} id={row.id} />. */
export function DeleteForm({
  action,
  id,
  message,
  label = 'Delete',
}: {
  action: (fd: FormData) => void | Promise<void>;
  id: number;
  message?: string;
  label?: string;
}) {
  return (
    <form action={action} style={{ display: 'inline' }}>
      <input type="hidden" name="id" value={id} />
      <ConfirmButton message={message}>{label}</ConfirmButton>
    </form>
  );
}
