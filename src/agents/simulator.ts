/**
 * Agent Simulator — Mode Trial
 * 
 * Génère des réponses réalistes SANS appeler l'API Claude.
 * Coût API trial = 0€.
 * 
 * L'utilisateur voit exactement ce que les agents feraient,
 * avec un badge "Simulation" et un CTA upgrade.
 */

export interface SimulatedResult {
  text: string;
  toolResults: Record<string, unknown>[];
  isSimulated: true;
  upgradeMessage: string;
}

const UPGRADE_MSG = "🔒 Résultat simulé — Passez au plan Essentiel pour activer l'IA réelle.";

/**
 * Génère une réponse simulée selon le type de tâche
 */
export function simulateAgent(
  agentType: string,
  taskType: string,
  input: Record<string, unknown>
): SimulatedResult {
  const simulator = SIMULATORS[agentType];
  if (!simulator) {
    return {
      text: "Tâche traitée avec succès (simulation).",
      toolResults: [],
      isSimulated: true,
      upgradeMessage: UPGRADE_MSG,
    };
  }

  return simulator(taskType, input);
}

// ============================================
// Simulateurs par type d'agent
// ============================================

const SIMULATORS: Record<
  string,
  (taskType: string, input: Record<string, unknown>) => SimulatedResult
> = {
  email: (taskType, input) => {
    const from = String(input.from ?? "contact@exemple.fr");
    const subject = String(input.subject ?? "Demande d'information");

    if (taskType.includes("classify")) {
      return {
        text: `Email classifié avec succès.`,
        toolResults: [
          {
            tool: "classify_email",
            result: {
              category: detectCategory(subject),
              urgency: "medium",
              summary: `Email de ${from} concernant "${subject}" — classé automatiquement.`,
            },
          },
        ],
        isSimulated: true,
        upgradeMessage: UPGRADE_MSG,
      };
    }

    return {
      text: `Email traité : "${subject}" de ${from}.\n\nL'agent a classifié l'email, identifié le sujet principal, et préparé un brouillon de réponse professionnelle.\n\n---\nBrouillon de réponse :\n\nBonjour,\n\nNous avons bien reçu votre message et nous vous en remercions.\nNous revenons vers vous dans les plus brefs délais.\n\nCordialement,\nL'équipe`,
      toolResults: [
        {
          tool: "classify_email",
          result: { category: detectCategory(subject), urgency: "medium" },
        },
      ],
      isSimulated: true,
      upgradeMessage: UPGRADE_MSG,
    };
  },

  commercial: (taskType, input) => {
    const email = String(input.email ?? input.leadEmail ?? "prospect@exemple.fr");
    const company = String(input.company ?? "Entreprise SA");

    if (taskType.includes("qualify")) {
      const score = 45 + Math.floor(Math.random() * 40);
      return {
        text: `Lead qualifié : ${email} (${company})\n\nScore : ${score}/100\nPotentiel : ${score >= 70 ? "Élevé" : score >= 40 ? "Moyen" : "Faible"}\n\nRecommandation : ${score >= 70 ? "Envoyer un devis sous 24h" : score >= 40 ? "Planifier un appel découverte" : "Nourrir avec du contenu"}`,
        toolResults: [
          {
            tool: "qualify_lead",
            result: {
              score,
              reason: `Entreprise identifiée, taille estimée PME, secteur compatible.`,
              nextAction: score >= 70 ? "Envoi devis" : "Appel découverte",
            },
          },
        ],
        isSimulated: true,
        upgradeMessage: UPGRADE_MSG,
      };
    }

    if (taskType.includes("followup")) {
      return {
        text: `Relance préparée pour ${email}.\n\nL'agent a analysé l'historique des échanges et rédigé un message de suivi personnalisé avec rappel de la proposition et nouvelle date de disponibilité.`,
        toolResults: [
          {
            tool: "schedule_followup",
            result: {
              scheduled: true,
              followupDate: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
            },
          },
        ],
        isSimulated: true,
        upgradeMessage: UPGRADE_MSG,
      };
    }

    return {
      text: `Action commerciale traitée pour ${company}.`,
      toolResults: [],
      isSimulated: true,
      upgradeMessage: UPGRADE_MSG,
    };
  },

  admin: (taskType, input) => {
    const fileName = String(input.fileName ?? "document.pdf");

    if (taskType.includes("classify")) {
      const category = detectDocCategory(fileName);
      return {
        text: `Document "${fileName}" classifié : ${category}\n\nL'agent a analysé le document, identifié son type et extrait les métadonnées principales.`,
        toolResults: [
          {
            tool: "classify_document",
            result: {
              category,
              confidence: 0.87,
              extractedFields: {
                type: category,
                dateDetected: new Date().toISOString().split("T")[0],
              },
            },
          },
        ],
        isSimulated: true,
        upgradeMessage: UPGRADE_MSG,
      };
    }

    if (taskType.includes("extract")) {
      return {
        text: `Données extraites de "${fileName}" :\n\n• Date : ${new Date().toLocaleDateString("fr-FR")}\n• Montant détecté : 1 250,00 €\n• Fournisseur : À confirmer\n• Référence : DOC-${Math.floor(Math.random() * 10000)}`,
        toolResults: [
          {
            tool: "extract_data",
            result: {
              fields: {
                date: new Date().toISOString().split("T")[0],
                amount: 125000,
                currency: "EUR",
                reference: `DOC-${Math.floor(Math.random() * 10000)}`,
              },
            },
          },
        ],
        isSimulated: true,
        upgradeMessage: UPGRADE_MSG,
      };
    }

    return {
      text: `Document traité : ${fileName}`,
      toolResults: [],
      isSimulated: true,
      upgradeMessage: UPGRADE_MSG,
    };
  },

  support: (taskType, input) => {
    const customerEmail = String(input.customerEmail ?? "client@exemple.fr");

    return {
      text: `Ticket support traité pour ${customerEmail}.\n\nL'agent a analysé la demande, consulté la base de connaissances, et préparé une réponse empathique et solution-orientée.\n\n---\nRéponse préparée :\n\nBonjour,\n\nMerci de nous avoir contactés. Nous comprenons votre situation et souhaitons la résoudre au plus vite.\n\nVoici les étapes que nous vous recommandons :\n1. [Action spécifique identifiée]\n2. [Vérification complémentaire]\n\nN'hésitez pas à revenir vers nous.\n\nCordialement`,
      toolResults: [
        {
          tool: "reply_to_customer",
          result: { message: "Réponse préparée", tone: "empathetic" },
        },
      ],
      isSimulated: true,
      upgradeMessage: UPGRADE_MSG,
    };
  },

  direction: (taskType, input) => {
    return {
      text: `Bilan quotidien préparé.\n\n📊 Résumé de la journée :\n• 12 emails traités (3 urgents)\n• 4 leads qualifiés (score moyen 67/100)\n• 2 documents classés\n• 0 escalade nécessaire\n\n⚡ Points d'attention :\n• Relance commerciale à planifier pour Entreprise ABC\n• Facture fournisseur proche de l'échéance (J-3)\n\n✅ Recommandations :\n• Prioriser le prospect XYZ (score 85)\n• Valider le devis en attente depuis 5 jours`,
      toolResults: [
        {
          tool: "send_daily_brief",
          result: {
            summary: "Journée productive, pas d'anomalie majeure.",
            keyMetrics: { emails: 12, leads: 4, documents: 2, escalations: 0 },
            alerts: ["Facture échéance J-3"],
            recommendations: ["Prioriser prospect XYZ"],
          },
        },
      ],
      isSimulated: true,
      upgradeMessage: UPGRADE_MSG,
    };
  },
};

// ============================================
// Helpers
// ============================================

function detectCategory(subject: string): string {
  const s = subject.toLowerCase();
  if (s.includes("urgent") || s.includes("asap")) return "urgent";
  if (s.includes("devis") || s.includes("prix") || s.includes("offre")) return "commercial";
  if (s.includes("facture") || s.includes("contrat") || s.includes("document")) return "admin";
  if (s.includes("problème") || s.includes("aide") || s.includes("bug")) return "support";
  if (s.includes("spam") || s.includes("promo") || s.includes("newsletter")) return "spam";
  return "commercial";
}

function detectDocCategory(fileName: string): string {
  const f = fileName.toLowerCase();
  if (f.includes("facture") || f.includes("invoice")) return "facture";
  if (f.includes("contrat") || f.includes("contract")) return "contrat";
  if (f.includes("devis") || f.includes("quote")) return "devis";
  if (f.includes("bon") || f.includes("commande")) return "bon_commande";
  if (f.includes("releve") || f.includes("bank")) return "releve";
  return "autre";
}
