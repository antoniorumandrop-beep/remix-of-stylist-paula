import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { classifyShape } from "../../fit/shape";

export default defineTool({
  name: "classify_body_shape",
  title: "Classify body proportions",
  description:
    "Classify body proportions into an FFIT proportion label (hourglass, spoon, triangle, rectangle, ...) from bust, waist and hips. Returns the label, the rule that fired and the differences in cm. Descriptive arithmetic only — never an aesthetic judgement, and never weight, BMI or health.",
  inputSchema: {
    bust: z.number().positive().describe("Bust circumference."),
    waist: z.number().positive().describe("Waist circumference."),
    hips: z.number().positive().describe("Hip circumference."),
    highHip: z
      .number()
      .positive()
      .optional()
      .describe("Upper hip, ~7-10 cm below the waist. Only needed to tell spoon from bottom-hourglass."),
    unit: z.enum(["cm", "in"]).optional().describe("Unit of the measurements. Defaults to cm."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ bust, waist, hips, highHip, unit }) => {
    const result = classifyShape({ bust, waist, hips, highHip, unit });
    const d = result.diffs;
    const text = d
      ? `Proportion label: ${result.shape} (rule ${result.rule}). Bust minus hips ${d.bustHips.toFixed(1)} cm, bust minus waist ${d.bustWaist.toFixed(1)} cm, hips minus waist ${d.hipsWaist.toFixed(1)} cm.${result.merged ? " Upper hip was missing, so spoon and bottom-hourglass are merged." : ""}`
      : `Proportion label: ${result.shape} (rule ${result.rule}).`;
    return { content: [{ type: "text", text }], structuredContent: { ...result } };
  },
});
