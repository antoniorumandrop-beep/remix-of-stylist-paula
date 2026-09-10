import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { computeFit } from "../../fit/score";
import { parseStretch } from "../../fit/stretch";
import { allProducts, productMaterials } from "../../../data/mockData";
import { productFitAttributes } from "../../../data/fitAttributes";
import type { BodyInput } from "../../fit/types";

const SHAPES = [
  "hourglass",
  "bottom-hourglass",
  "top-hourglass",
  "spoon",
  "triangle",
  "inverted-triangle",
  "rectangle",
  "diamond",
  "oval",
] as const;

export default defineTool({
  name: "score_product_fit",
  title: "Score fit risk for a product",
  description:
    "Estimate fit risk per body point (bust, waist, hips, thighs, stomach) for one catalogue product, from measurements or a proportion label. Returns a score, a confidence and a tight/loose/neutral verdict with reason codes per point. This is fit risk, not an aesthetic judgement.",
  inputSchema: {
    productId: z.string().trim().min(1).describe("Product id from search_products."),
    bust: z.number().positive().optional().describe("Bust circumference in cm."),
    waist: z.number().positive().optional().describe("Waist circumference in cm."),
    hips: z.number().positive().optional().describe("Hip circumference in cm."),
    highHip: z.number().positive().optional().describe("Upper hip in cm, optional."),
    shape: z
      .enum(SHAPES)
      .optional()
      .describe("Proportion label, used instead of measurements when they are not available."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ productId, bust, waist, hips, highHip, shape }) => {
    const product = allProducts.find((p) => p.id === productId);
    if (!product) throw new ToolError(`No product with id "${productId}".`);

    const attrs = productFitAttributes[productId];
    if (!attrs) {
      throw new ToolError(
        `Product "${product.name}" carries no fit attributes, so no fit risk can be computed for it.`,
      );
    }

    let body: BodyInput;
    if (bust && waist && hips) body = { bust, waist, hips, highHip };
    else if (shape) body = { shape };
    else throw new ToolError("Provide bust, waist and hips together, or a shape.");

    const material = productMaterials[productId]?.composition;
    const stretch = material ? parseStretch(material) : null;
    const withStretch = stretch
      ? { ...attrs, stretchLevel: { value: stretch.level, confidence: stretch.confidence } }
      : attrs;

    const result = computeFit(withStretch, body);
    const lines = result.points.map(
      (p) => `${p.point}: ${p.verdict} (risk ${Math.round(p.risk * 100)}%) [${p.reasons.join(", ") || "no reason codes"}]`,
    );
    const text = [
      `${product.name} — ${product.brand}, ${product.price} PLN`,
      `Fit score ${result.score}, confidence ${Math.round(result.confidence * 100)}%`,
      ...lines,
    ].join("\n");

    return {
      content: [{ type: "text", text }],
      structuredContent: {
        product: { id: product.id, name: product.name, brand: product.brand, price: product.price },
        fit: {
          score: result.score,
          confidence: result.confidence,
          points: result.points.map((p) => ({
            point: p.point,
            verdict: p.verdict,
            risk: p.risk,
            reasons: [...p.reasons],
          })),
        },
      },
    };
  },
});
