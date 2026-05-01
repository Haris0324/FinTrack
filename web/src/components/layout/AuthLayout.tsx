import React from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default function AuthLayout({
  children,
  title,
  subtitle,
  features,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  features: { title: string; description: string; icon?: React.ReactNode }[];
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      {/* Mobile Logo */}
      <div className="lg:hidden w-full flex justify-center mb-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-2xl">
            B
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Fintrack</h1>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider text-muted">Ai-Powered Market Intelligence</p>
          </div>
        </Link>
      </div>

      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 lg:gap-24 items-center">
        {/* Left Side - Info */}
        <div className="hidden lg:flex flex-col max-w-md">
          <Link href="/" className="flex items-center gap-2 mb-12">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-2xl">
              B
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Fintrack</h1>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider text-muted">Ai-Powered Market Intelligence</p>
            </div>
          </Link>

          <h2 className="text-4xl font-bold mb-4 leading-tight">
            {title.split(' ').map((word, i) => 
              word.toLowerCase() === 'smarter' || word.toLowerCase() === 'trading' 
                ? <span key={i} className="text-primary">{word} </span> 
                : <span key={i}>{word} </span>
            )}
          </h2>
          
          <p className="text-muted text-lg mb-12">
            {subtitle}
          </p>

          <div className="space-y-8">
            {features.map((feature, i) => (
              <div key={i} className="flex gap-4">
                <div className="mt-1">
                  {feature.icon || <CheckCircle2 className="w-6 h-6 text-success" />}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full max-w-md mx-auto lg:mx-0 bg-card border border-card-border rounded-3xl p-8 md:p-10 shadow-2xl">
          {children}
        </div>
      </div>
    </div>
  );
}
