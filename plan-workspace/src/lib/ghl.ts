// Deep links into the live GHL location (mirrors the original app's ghl helper).
const BASE = "https://app.gohighlevel.com/v2/location";
export const ghlWorkflow = (loc: string, id: string) => `${BASE}/${loc}/automation/workflows/builder/${id}`;
export const ghlWorkflows = (loc: string) => `${BASE}/${loc}/automation/workflows`;
export const ghlPipelines = (loc: string) => `${BASE}/${loc}/settings/pipelines`;
export const ghlFields = (loc: string) => `${BASE}/${loc}/settings/custom-fields`;
export const ghlObjects = (loc: string) => `${BASE}/${loc}/settings/objects/list`;
