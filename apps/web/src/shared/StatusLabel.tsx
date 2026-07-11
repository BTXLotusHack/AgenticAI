export function StatusLabel({ state }: { readonly state: string }) {
  return (
    <span aria-label="Convoy state" className="status-label" data-state={state} role="status">
      <i aria-hidden="true" />{state}
    </span>
  );
}
