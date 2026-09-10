import { defineMcp } from "@lovable.dev/mcp-js";
import classifyBodyShapeTool from "./tools/classify-body-shape";
import searchProductsTool from "./tools/search-products";
import scoreProductFitTool from "./tools/score-product-fit";

export default defineMcp({
  name: "remix-of-stylist-paula",
  title: "Remix of Stylist Paula",
  version: "0.1.0",
  instructions:
    "Tools for Paula, a fit-first fashion app for the Polish market (prices in PLN). Use `classify_body_shape` to turn bust/waist/hip measurements into a proportion label, `search_products` to browse the public catalogue, and `score_product_fit` to estimate fit risk per body point for one product. Describe cut and arithmetic only, as the tool results do; evaluative or prescriptive phrasing about the body is out of scope, and so is any statement about weight, diet, health or age.",
  tools: [classifyBodyShapeTool, searchProductsTool, scoreProductFitTool],
});
