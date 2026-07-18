import { useJson } from "./asis";

// Shapes mirror public/cody-inventory.json (built from the live extraction of
// the Cody / Cavenaugh Media build sub-account VoeVvlByAem9pkxb7f6a).

export const CODY_LOCATION_ID = "VoeVvlByAem9pkxb7f6a";

export interface CodyField { name: string; key: string; dataType: string; model: string; group: string; }
export interface CodyPipeline { name: string; stages: string[]; }
export interface CodyInventory {
  location_id: string;
  fields: CodyField[];
  tags: string[];
  pipelines: CodyPipeline[];
  custom_values: { name: string; key: string }[];
  calendars: { name: string; id: string }[];
  forms: { name: string; id: string }[];
}

export interface CodyIndexEntry { id: string; name: string; status: string; folder: string; }

export const useCodyInventory = () => useJson<CodyInventory>("/cody-inventory.json");
export const useCodyIndex = () => useJson<CodyIndexEntry[]>("/cody-index.json");
