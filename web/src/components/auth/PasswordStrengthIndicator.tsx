"use client";

import React, { useMemo } from "react";
import { Check, X, Shield, ShieldCheck, ShieldAlert } from "lucide-react";

interface Requirement {
  id: string;
  label: string;
  test: (pass: string) => boolean;
}

const requirements: Requirement[] = [
  { id: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { id: "number", label: "One number", test: (p) => /[0-9]/.test(p) },
  { id: "special", label: "One special character", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

interface PasswordStrengthIndicatorProps {
  password: string;
  onValidationChange?: (isValid: boolean) => void;
}

export default function PasswordStrengthIndicator({ password, onValidationChange }: PasswordStrengthIndicatorProps) {
  const results = useMemo(() => {
    return requirements.map((req) => ({
      ...req,
      met: req.test(password),
    }));
  }, [password]);

  const isValid = useMemo(() => results.every((r) => r.met), [results]);
  const metCount = useMemo(() => results.filter((r) => r.met).length, [results]);

  React.useEffect(() => {
    onValidationChange?.(isValid);
  }, [isValid, onValidationChange]);

  if (!password) return null;

  const getStrengthColor = () => {
    if (metCount <= 2) return "text-danger bg-danger/10";
    if (metCount <= 4) return "text-orange-500 bg-orange-500/10";
    return "text-success bg-success/10";
  };

  const getStrengthLabel = () => {
    if (metCount <= 2) return "Weak";
    if (metCount <= 4) return "Fair";
    return "Strong";
  };

  return (
    <div className="mt-4 p-4 rounded-xl bg-card/30 border border-card-border animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {metCount <= 2 ? (
            <ShieldAlert className="w-4 h-4 text-danger" />
          ) : metCount <= 4 ? (
            <Shield className="w-4 h-4 text-orange-500" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-success" />
          )}
          <span className="text-xs font-semibold text-foreground">Password Strength</span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${getStrengthColor()}`}>
          {getStrengthLabel()}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
        {results.map((res) => (
          <div key={res.id} className="flex items-center gap-2">
            {res.met ? (
              <div className="w-4 h-4 rounded-full bg-success/20 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 text-success" />
              </div>
            ) : (
              <div className="w-4 h-4 rounded-full bg-card-border flex items-center justify-center shrink-0">
                <X className="w-2.5 h-2.5 text-muted" />
              </div>
            )}
            <span className={`text-[11px] transition-colors ${res.met ? "text-foreground" : "text-muted"}`}>
              {res.label}
            </span>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="mt-4 h-1 w-full bg-card-border rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ease-out ${
            metCount <= 2 ? 'bg-danger' : metCount <= 4 ? 'bg-orange-500' : 'bg-success'
          }`}
          style={{ width: `${(metCount / requirements.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
