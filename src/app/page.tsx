import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  Zap,
  Shield,
  Clock,
  BarChart3,
  Mail,
  Briefcase,
  FileText,
  Headphones,
  PieChart,
  Star,
  ChevronRight,
  Play,
  Sparkles,
  Globe,
  Lock,
  TrendingUp,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#08090f] text-white overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-brand-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-violet-600/8 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-500/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10">
        {/* ============================================ */}
        {/* Navigation */}
        {/* ============================================ */}
        <nav className="flex items-center justify-between px-6 sm:px-8 py-5 max-w-7xl mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-brand-400 to-brand-600 rounded-xl flex items-center justify-center font-bold text-sm shadow-glow-brand">
              V
            </div>
            <span className="text-xl font-bold tracking-tight">VotrIA</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-white/50">
            <a href="#agents" className="hover:text-white transition">Agents</a>
            <a href="#how-it-works" className="hover:text-white transition">Comment</a>
            <a href="#pricing" className="hover:text-white transition">Tarifs</a>
            <a href="#testimonials" className="hover:text-white transition">Avis</a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm text-white/60 hover:text-white transition hidden sm:block"
            >
              Connexion
            </Link>
            <Link
              href="/auth/signup"
              className="text-sm font-medium px-5 py-2.5 bg-white text-[#08090f] rounded-lg hover:bg-white/90 transition-all shadow-lg shadow-white/10"
            >
              Essai gratuit
            </Link>
          </div>
        </nav>

        {/* ============================================ */}
        {/* Hero */}
        {/* ============================================ */}
        <main className="max-w-5xl mx-auto px-6 sm:px-8 pt-20 sm:pt-28 pb-32 text-center">
          {/* Status badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-white text-sm text-brand-200 mb-8 animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            2 847 taches IA traitees cette semaine
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-6 animate-fade-in-up">
            Votre premier
            <br />
            <span className="text-gradient">employe IA.</span>
            <br />
            <span className="text-white/40">Sans informatique.</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/40 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            VotrIA deploie des agents IA autonomes qui traitent vos emails,
            qualifient vos prospects, classent vos documents et briefent votre
            direction — pendant que vous developpez votre business.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: "200ms" }}>
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center gap-2 text-base font-medium px-8 py-3.5 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-xl hover:from-brand-400 hover:to-brand-500 transition-all shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40"
            >
              Demarrer gratuitement
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="#agents"
              className="inline-flex items-center justify-center gap-2 text-base font-medium px-8 py-3.5 glass-white text-white/80 hover:text-white hover:bg-white/10 transition-all"
            >
              <Play className="w-4 h-4" />
              Voir la demo
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-3 gap-8 max-w-lg mx-auto animate-fade-in-up" style={{ animationDelay: "300ms" }}>
            {[
              { value: "< 15s", label: "Temps de traitement" },
              { value: "98%", label: "Taux de reussite" },
              { value: "24/7", label: "Disponibilite" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl font-bold text-gradient">{stat.value}</div>
                <div className="text-xs text-white/30 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Trusted by */}
          <div className="mt-20 animate-fade-in" style={{ animationDelay: "400ms" }}>
            <p className="text-xs text-white/20 uppercase tracking-widest mb-6">Ils nous font confiance</p>
            <div className="flex items-center justify-center gap-10 opacity-30">
              {["PME Tech", "Groupe BTP", "Studio Design", "Conseil RH", "Logistique Pro"].map((name) => (
                <span key={name} className="text-sm font-medium text-white/60">{name}</span>
              ))}
            </div>
          </div>
        </main>

        {/* ============================================ */}
        {/* Agents Section */}
        {/* ============================================ */}
        <section id="agents" className="max-w-6xl mx-auto px-6 sm:px-8 pb-32">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-white text-xs text-brand-300 mb-4">
              <Sparkles className="w-3 h-3" />
              Intelligence Artificielle
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">5 agents, zero code</h2>
            <p className="text-white/40 max-w-lg mx-auto">
              Chaque agent est specialise dans un domaine et travaille de maniere autonome, 24h/24.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { icon: Mail, name: "Email", desc: "Trie, repond et escalade vos emails automatiquement", color: "from-blue-500/20 to-blue-600/5" },
              { icon: Briefcase, name: "Commercial", desc: "Qualifie vos leads, envoie devis et relances", color: "from-emerald-500/20 to-emerald-600/5" },
              { icon: FileText, name: "Admin", desc: "Classe documents, extrait donnees, archive", color: "from-amber-500/20 to-amber-600/5" },
              { icon: Headphones, name: "Support", desc: "Repond aux clients 24/7, cree des tickets", color: "from-violet-500/20 to-violet-600/5" },
              { icon: PieChart, name: "Direction", desc: "Bilans quotidiens, suivi decisions, alertes", color: "from-rose-500/20 to-rose-600/5" },
            ].map((agent) => {
              const Icon = agent.icon;
              return (
                <div
                  key={agent.name}
                  className="group relative glass-white p-6 text-center hover:bg-white/10 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className={`absolute inset-0 rounded-xl bg-gradient-to-b ${agent.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  <div className="relative">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-white/5 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-white/70" />
                    </div>
                    <div className="font-semibold mb-2">{agent.name}</div>
                    <div className="text-sm text-white/40 leading-relaxed">{agent.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ============================================ */}
        {/* How it works */}
        {/* ============================================ */}
        <section id="how-it-works" className="max-w-5xl mx-auto px-6 sm:px-8 pb-32">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-white text-xs text-emerald-300 mb-4">
              <Zap className="w-3 h-3" />
              Simple comme bonjour
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Operationnel en 3 etapes</h2>
            <p className="text-white/40 max-w-lg mx-auto">
              Pas de code, pas d'integration complexe. Configurez et laissez l'IA travailler.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Connectez vos outils",
                desc: "Gmail, Outlook, votre CRM... VotrIA s'integre en quelques clics a vos outils existants.",
                icon: Globe,
              },
              {
                step: "02",
                title: "Configurez vos agents",
                desc: "Choisissez quels agents activer et definissez leurs regles de fonctionnement.",
                icon: Sparkles,
              },
              {
                step: "03",
                title: "Laissez l'IA agir",
                desc: "Vos agents travaillent 24/7. Surveillez tout depuis votre tableau de bord en temps reel.",
                icon: TrendingUp,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="relative">
                  <div className="text-6xl font-bold text-white/[0.03] absolute -top-4 -left-2">{item.step}</div>
                  <div className="relative glass-white p-6">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500/20 to-brand-600/5 flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5 text-brand-400" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                    <p className="text-sm text-white/40 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ============================================ */}
        {/* Benefits */}
        {/* ============================================ */}
        <section className="max-w-6xl mx-auto px-6 sm:px-8 pb-32">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Clock, title: "Gain de temps", desc: "Economisez 20h/semaine sur les taches repetitives", value: "20h" },
              { icon: Shield, title: "RGPD compliant", desc: "Donnees hebergees en France, chiffrees de bout en bout", value: "100%" },
              { icon: BarChart3, title: "ROI mesurable", desc: "Dashboard temps reel avec tracking des couts et KPIs", value: "3x" },
              { icon: Lock, title: "Securise", desc: "Chiffrement AES-256, audit logs, isolation des donnees", value: "A+" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="glass-white p-6 group hover:bg-white/10 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-brand-400" />
                    </div>
                    <span className="text-2xl font-bold text-gradient">{item.value}</span>
                  </div>
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-white/40">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ============================================ */}
        {/* Pricing */}
        {/* ============================================ */}
        <section id="pricing" className="max-w-5xl mx-auto px-6 sm:px-8 pb-32">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-white text-xs text-amber-300 mb-4">
              <Zap className="w-3 h-3" />
              Tarification transparente
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Choisissez votre plan</h2>
            <p className="text-white/40 max-w-lg mx-auto">
              14 jours d'essai gratuit sur tous les plans. Sans engagement.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Essentiel",
                price: "990",
                period: "/mois",
                setup: "2 500 EUR setup",
                features: ["1 agent IA", "50 taches/jour", "Dashboard temps reel", "Support email", "Rapports hebdomadaires"],
                popular: false,
              },
              {
                name: "Professionnel",
                price: "1 900",
                period: "/mois",
                setup: "5 000 EUR setup",
                features: ["3 agents IA", "150 taches/jour", "Dashboard + analytics", "Support prioritaire", "Rapports quotidiens", "Integration CRM"],
                popular: true,
              },
              {
                name: "Commande Totale",
                price: "Sur mesure",
                period: "",
                setup: "Sur devis",
                features: ["5 agents IA", "Volume illimite", "Account manager dedie", "SLA garanti", "API access", "Formation equipe"],
                popular: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`relative glass-white p-8 ${
                  plan.popular ? "ring-2 ring-brand-500/50 bg-white/[0.06]" : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-brand-500 to-brand-600 text-white text-xs font-medium px-4 py-1 rounded-full shadow-lg shadow-brand-500/25">
                    Populaire
                  </div>
                )}

                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && <span className="text-white/40">{plan.period}</span>}
                </div>
                <p className="text-xs text-white/30 mb-6">{plan.setup}</p>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-white/60">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                {plan.popular ? (
                  <Link
                    href="/auth/signup"
                    className="block text-center w-full py-3 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-medium rounded-lg hover:from-brand-400 hover:to-brand-500 transition-all shadow-lg shadow-brand-500/25"
                  >
                    Commencer l'essai
                  </Link>
                ) : plan.price === "Sur mesure" ? (
                  <button className="w-full py-3 glass-white text-white/70 font-medium hover:bg-white/10 transition-all text-center">
                    Nous contacter
                  </button>
                ) : (
                  <Link
                    href="/auth/signup"
                    className="block text-center w-full py-3 glass-white text-white/70 font-medium hover:bg-white/10 transition-all"
                  >
                    Commencer l'essai
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ============================================ */}
        {/* Testimonials */}
        {/* ============================================ */}
        <section id="testimonials" className="max-w-5xl mx-auto px-6 sm:px-8 pb-32">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-white text-xs text-violet-300 mb-4">
              <Star className="w-3 h-3" />
              Temoignages
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ce qu'en disent nos clients</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: "VotrIA a transforme notre gestion des emails. On gagne 3h par jour et les reponses sont impeccables.",
                name: "Sophie M.",
                role: "DG, Cabinet Conseil",
                rating: 5,
              },
              {
                quote: "L'agent commercial a qualifie 40% de leads en plus que notre equipe seule. Le ROI est evident.",
                name: "Thomas L.",
                role: "Directeur Commercial, SaaS B2B",
                rating: 5,
              },
              {
                quote: "Fini les heures de classement de factures. L'agent Admin fait en 15 secondes ce qui prenait 20 minutes.",
                name: "Marie K.",
                role: "DAF, PME Logistique",
                rating: 5,
              },
            ].map((testimonial) => (
              <div key={testimonial.name} className="glass-white p-6">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-white/60 leading-relaxed mb-6">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div>
                  <div className="font-medium text-sm">{testimonial.name}</div>
                  <div className="text-xs text-white/30">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================ */}
        {/* CTA */}
        {/* ============================================ */}
        <section className="max-w-4xl mx-auto px-6 sm:px-8 pb-32">
          <div className="relative overflow-hidden rounded-2xl p-12 text-center">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-600/20 via-brand-500/10 to-violet-600/20 rounded-2xl" />
            <div className="absolute inset-0 glass-white !rounded-2xl" />

            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Pret a automatiser votre entreprise ?
              </h2>
              <p className="text-white/40 max-w-lg mx-auto mb-8">
                Rejoignez les PME qui font confiance a VotrIA pour gagner du temps, reduire les couts et scaler leurs operations.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center justify-center gap-2 text-base font-medium px-8 py-3.5 bg-white text-[#08090f] rounded-xl hover:bg-white/90 transition-all shadow-lg shadow-white/10"
                >
                  Demarrer l'essai gratuit
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <button className="inline-flex items-center justify-center gap-2 text-base font-medium px-8 py-3.5 glass-white text-white/80 hover:text-white hover:bg-white/10 transition-all">
                  Demander une demo
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================ */}
        {/* Footer */}
        {/* ============================================ */}
        <footer className="border-t border-white/[0.06] py-12 px-6 sm:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 bg-gradient-to-br from-brand-400 to-brand-600 rounded-lg flex items-center justify-center font-bold text-xs">
                    V
                  </div>
                  <span className="font-bold tracking-tight">VotrIA</span>
                </div>
                <p className="text-xs text-white/30 leading-relaxed">
                  Plateforme d'agents IA autonomes pour les PME francaises.
                </p>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-3">Produit</h4>
                <ul className="space-y-2 text-sm text-white/40">
                  <li><a href="#agents" className="hover:text-white transition">Agents</a></li>
                  <li><a href="#pricing" className="hover:text-white transition">Tarifs</a></li>
                  <li><a href="#" className="hover:text-white transition">Documentation</a></li>
                  <li><a href="#" className="hover:text-white transition">Changelog</a></li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-3">Entreprise</h4>
                <ul className="space-y-2 text-sm text-white/40">
                  <li><a href="#" className="hover:text-white transition">A propos</a></li>
                  <li><a href="#" className="hover:text-white transition">Blog</a></li>
                  <li><a href="#" className="hover:text-white transition">Carrieres</a></li>
                  <li><a href="#" className="hover:text-white transition">Contact</a></li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-3">Legal</h4>
                <ul className="space-y-2 text-sm text-white/40">
                  <li><a href="#" className="hover:text-white transition">CGU</a></li>
                  <li><a href="#" className="hover:text-white transition">Confidentialite</a></li>
                  <li><a href="#" className="hover:text-white transition">RGPD</a></li>
                  <li><a href="#" className="hover:text-white transition">Mentions legales</a></li>
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-white/20">
                &copy; {new Date().getFullYear()} AI2 / DATAKOO — Tous droits reserves
              </p>
              <div className="flex items-center gap-1 text-xs text-white/20">
                <span>Construit avec</span>
                <Sparkles className="w-3 h-3 text-brand-400" />
                <span>en France</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
