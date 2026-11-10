// Separador visual entre el formulario de credenciales y los proveedores.
// Solo se pinta cuando ambos métodos están activos.
export function AuthDivider() {
  return (
    <div className="my-6 flex items-center gap-3">
      <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
      <span className="text-xs font-medium text-slate-500">o continúa con</span>
      <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
    </div>
  )
}
