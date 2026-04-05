import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "votria",
  eventKey: process.env.INNGEST_EVENT_KEY,
});

// ============================================
// Event types for type safety
// ============================================
export type VotrIAEvents = {
  "agent/email.received": {
    data: {
      tenantId: string;
      agentId: string;
      emailId: string;
      from: string;
      subject: string;
      body: string;
      attachments?: string[];
    };
  };
  "agent/lead.new": {
    data: {
      tenantId: string;
      agentId: string;
      leadId: string;
      email: string;
      company?: string;
      source: string;
    };
  };
  "agent/document.uploaded": {
    data: {
      tenantId: string;
      agentId: string;
      documentId: string;
      filePath: string;
      fileName: string;
      mimeType: string;
    };
  };
  "agent/support.ticket": {
    data: {
      tenantId: string;
      agentId: string;
      ticketId: string;
      customerEmail: string;
      subject: string;
      message: string;
    };
  };
  "agent/direction.daily_brief": {
    data: {
      tenantId: string;
      agentId: string;
    };
  };
  "agent/commercial.followup": {
    data: {
      tenantId: string;
      agentId: string;
      leadId: string;
    };
  };
};
