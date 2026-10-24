export function FormErrorMessage({ id, message }: { id: string; message?: string }) {
  if (!message) return null;

  return (
    <span id={id} role="alert" className="text-xs leading-[1.4] text-danger-600">
      {message}
    </span>
  );
}
