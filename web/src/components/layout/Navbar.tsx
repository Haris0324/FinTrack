import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 glass px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xl">
          B
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Fintrack</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider text-muted">Ai-Powered Market Intelligence</p>
        </div>
      </div>
      <div>
        <Link 
          href="/signin" 
          className="px-5 py-2 rounded-md bg-card border border-card-border text-sm font-medium hover:bg-card-border transition-colors"
        >
          Sign In
        </Link>
      </div>
    </nav>
  );
}
