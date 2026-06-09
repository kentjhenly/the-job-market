export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="font-mono text-green text-sm tracking-widest uppercase">
            THE JOB MARKET
          </span>
          <p className="text-muted text-xs mt-1 font-mono">
            THE TRADING FLOOR FOR HUMAN TALENT
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
