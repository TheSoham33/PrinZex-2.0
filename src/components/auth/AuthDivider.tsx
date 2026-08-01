export default function AuthDivider({ label = 'Or continue with' }: { label?: string }) {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center" aria-hidden>
        <div className="w-full border-t border-slate-200" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-white px-3 text-xs font-medium uppercase tracking-wide text-slate-400">
          {label}
        </span>
      </div>
    </div>
  );
}
