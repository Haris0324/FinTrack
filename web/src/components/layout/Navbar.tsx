import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 glass px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="w-8 h-8 shrink-0 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xl">
          B
        </div>
        <div className="flex flex-col min-w-0">
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground truncate">Fintrack</h1>
          <p className="text-[8px] md:text-[10px] text-muted-foreground uppercase tracking-wider text-muted truncate">Ai-Powered Market Intelligence</p>
        </div>
      </div>
      <div className="shrink-0">
        <Link 
          href="/signin" 
          className="px-4 py-1.5 md:px-5 md:py-2 rounded-md bg-card border border-card-border text-sm font-medium hover:bg-card-border transition-colors whitespace-nowrap"
        >
          Sign In
        </Link>
      </div>
    </nav>
  );
}
