import type { z } from "zod";
import type { ProviderCategorySchema, ProviderSubtypeSchema } from "../schemas";

export type { ActivationType, City } from "../schemas";
export type ProviderCategory = z.infer<typeof ProviderCategorySchema>;
export type ProviderSubtype = z.infer<typeof ProviderSubtypeSchema>;
