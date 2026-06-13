import type { AppData } from "../types";

// Placeholder data shown ONLY when public/app.json is missing or empty.
// Never merge this into real workflow records.
export const DEMO_APP: AppData = {
  generated_at: "demo",
  folders: [{ name: "01. WP Lead Capture", workflows: ["demo-1"] }],
  workflows: [
    {
      id: "demo-1",
      name: "DEMO — run scripts to load real data",
      folder: "01. WP Lead Capture",
      status: "Demo",
      extracted: true,
      extraction_method: "demo",
      triggers: [{ id: "t1", type: "Inbound Webhook", filters: [] }],
      steps: [
        { id: "s1", index: 0, type: "add_tag", title: "Add Tag", next_id: "s2", tag: { action: "add", name: "Lead_Source_Meta" } },
        { id: "s2", index: 1, type: "if_else", title: "Source?", condition: { label: "Source?", branches: [{ label: "Meta", next_id: "s3" }, { label: "None", next_id: "s4" }] } },
        { id: "s3", index: 2, type: "send_sms", title: "Welcome SMS", next_id: "s5", sms: { template_name: "Welcome SMS", from: "+18663444955", body: "Hi {{contact.first_name}}, thanks for reaching out to Men's Wellness Centers!" } },
        { id: "s4", index: 3, type: "send_email", title: "Welcome Email", next_id: "s5", email: { template_name: "Welcome Email", from: "info@email.menswellnesscenters.com", subject: "Welcome to MWC", html: "<h1>Welcome</h1><p>We're glad you're here.</p>" } },
        { id: "s5", index: 4, type: "wait", title: "Wait", next_id: "s6", wait: { duration: 5, unit: "minutes" } },
        { id: "s6", index: 5, type: "end", title: "END" },
      ],
      stats: { total_steps: 6, send_sms_count: 1, send_email_count: 1, wait_count: 1, if_else_count: 1, terminal_paths: 1 },
    },
  ],
  messages: { sms: [], email: [] },
};
