import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { allProducts } from "../../../data/mockData";

export default defineTool({
  name: "search_products",
  title: "Search the catalogue",
  description:
    "Search Paula's public product catalogue by free text, category and maximum price in PLN. Returns product id, name, brand, price and store.",
  inputSchema: {
    query: z.string().trim().optional().describe("Free text matched against product name and brand."),
    category: z
      .enum(["dresses", "tops", "bottoms", "skirts", "outerwear", "shoes", "accessories"])
      .optional()
      .describe("Restrict to one category."),
    maxPrice: z.number().positive().optional().describe("Maximum price in PLN."),
    limit: z.number().int().min(1).max(50).optional().describe("Maximum number of results. Defaults to 10."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ query, category, maxPrice, limit }) => {
    const needle = query?.toLowerCase() ?? "";
    const items = allProducts
      .filter((p) => (category ? p.category === category : true))
      .filter((p) => (maxPrice ? p.price <= maxPrice : true))
      .filter((p) =>
        needle ? `${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(needle) : true,
      )
      .slice(0, limit ?? 10)
      .map((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        price: p.price,
        currency: "PLN" as const,
        category: p.category,
        store: p.store,
        secondHand: p.isSecondHand,
      }));

    const text = items.length
      ? items.map((p) => `${p.id}. ${p.name} — ${p.brand}, ${p.price} PLN (${p.category})`).join("\n")
      : "No products matched.";
    return { content: [{ type: "text", text }], structuredContent: { items } };
  },
});
