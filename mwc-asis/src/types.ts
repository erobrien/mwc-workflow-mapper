export type StepType =
  | "trigger"
  | "action"
  | "if_else"
  | "wait"
  | "send_sms"
  | "send_email"
  | "add_tag"
  | "remove_tag"
  | "update_field"
  | "move_pipeline"
  | "webhook"
  | "end";

export interface Trigger {
  id?: string;
  type?: string;
  filters?: Array<Record<string, unknown>>;
  raw?: unknown;
}

export interface Branch {
  label?: string;
  next_id?: string | null;
  expression?: string;
}

export interface Step {
  id: string;
  index: number;
  type: StepType | string;
  title: string;
  parent_id?: string | null;
  branch?: string | null;
  next_id?: string | null;

  wait?: {
    duration?: number | string | null;
    unit?: string | null;
    until_event?: string | null;
    business_hours?: boolean;
  };
  sms?: {
    template_id?: string | null;
    template_name?: string | null;
    from?: string | null;
    body?: string | null;
  };
  email?: {
    template_id?: string | null;
    template_name?: string | null;
    from?: string | null;
    subject?: string | null;
    html?: string | null;
    plain?: string | null;
  };
  tag?: { action?: string; name?: string | null };
  condition?: { label?: string | null; expression?: string; branches?: Branch[] };
  pipeline?: { name?: string; stage?: string };
  field_update?: { field?: string; value?: string };

  raw?: unknown;
}

export interface WorkflowStats {
  total_steps?: number;
  send_sms_count?: number;
  send_email_count?: number;
  wait_count?: number;
  if_else_count?: number;
  terminal_paths?: number;
}

export interface Workflow {
  id: string;
  name: string;
  folder: string;
  status?: string;
  triggers: Trigger[];
  steps: Step[];
  stats?: WorkflowStats;
  extracted?: boolean;
  extraction_method?: string | null;
  extracted_at?: string | null;
}

export interface MessageSms {
  id: string;
  template_name?: string | null;
  from?: string | null;
  body?: string | null;
}

export interface MessageEmail {
  id: string;
  template_name?: string | null;
  from?: string | null;
  subject?: string | null;
  html?: string | null;
  plain?: string | null;
}

export interface AppData {
  generated_at?: string;
  folders: Array<{ name: string; workflows: string[] }>;
  workflows: Workflow[];
  messages: { sms: MessageSms[]; email: MessageEmail[] };
}

export type DrawerRef =
  | { kind: "step"; step: Step; workflow: Workflow }
  | { kind: "trigger"; triggers: Trigger[]; workflow: Workflow };
