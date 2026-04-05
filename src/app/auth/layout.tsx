import { Star, Sparkles, CheckCircle } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#08090f] text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Ambient blurs */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-600/15 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-violet-600/10 rounded-full blur-[80px]" />

        <div className="relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-400 to-brand-600 rounded-xl flex items-center justify-center font-bold shadow-glow-brand">
              V
            </div>
            <span className="text-xl font-bold tracking-tight">VotrIA</span>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-3xl font-bold leading-tight mb-4">
            Votre premier
            <br />
            <span className="text-gradient">employe IA.</span>
          </h2>
          <p className="text-white/40 leading-relaxed mb-8">
            Des agents IA autonomes qui traitent vos emails, qualifient vos
            prospects et gerent votre admin — pendant que vous developpez votre
            business.
          </p>

          {/* Feature list */}
          <ul className="space-y-3 mb-10">
            {[
              "5 agents specialises (Email, Commercial, Admin, Support, Direction)",
              "Operationnel en 5 minutes, sans code",
              "Dashboard temps reel avec KPIs",
              "RGPD compliant, donnees en France",
            ].map((feat) => (
              <li key={feat} className="flex items-start gap-2.5 text-sm text-white/50">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                {feat}
              </li>
            ))}
          </ul>

          {/* Testimonial */}
          <div className="glass-white p-5">
            <div className="flex gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-sm text-white/50 leading-relaxed mb-4">
              &ldquo;VotrIA a transforme notre facon de gerer les emails clients. On gagne 3h par jour.&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-violet-400 flex items-center justify-center text-xs font-bold">
                SM
              </div>
              <div>
                <div className="text-sm font-medium">Sophie M.</div>
                <div className="text-xs text-white/30">DG, Cabinet Conseil</div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-1 text-xs text-white/20">
          <span>&copy; {new Date().getFullYear()} AI2 / DATAKOO</span>
          <span className="mx-2">·</span>
          <span>Construit avec</span>
          <Sparkles className="w-3 h-3 text-brand-400" />
          <span>en France</span>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-surface-50">
        <div className="w-full max-w-md animate-fade-in">{children}</div>
      </div>
    </div>
  );
}
