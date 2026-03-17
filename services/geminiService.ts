
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT, AppMode, AspectRatio, LightingStyle } from "../types";
import { fileToGenerativePart } from "../utils";

/**
 * Helper to get the API key from various sources and handle AI Studio key selection.
 */
const getApiKey = async (): Promise<string> => {
  const findKey = () => {
    return (
      process.env.API_KEY || 
      process.env.GEMINI_API_KEY || 
      (window as any).process?.env?.API_KEY || 
      (window as any).process?.env?.GEMINI_API_KEY ||
      (import.meta as any).env?.VITE_GEMINI_API_KEY ||
      ""
    );
  };

  let key = findKey();

  // @ts-ignore
  if (window.aistudio && window.aistudio.openSelectKey) {
    // @ts-ignore
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey && !key) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      // We don't wait, but the next check might find it if the platform is fast
    }
  }

  key = findKey();
  
  if (!key || key === 'undefined' || key === 'null' || key === '""' || key === "''") {
    return "";
  }
  
  return key;
};

/**
 * Step 1: Analyze the product image and generate a refined prompt 
 */
export const generateRefinedPrompt = async (
  files: File[], 
  referenceFiles: File[],
  aspectRatio: AspectRatio, 
  concept: string, 
  lightingStyle: LightingStyle,
  activeMode: AppMode,
  bgFiles?: File[],
  bgColor?: string,
  quantities?: { product1: number; product2: number; product3: number }
): Promise<string> => {
  if (files.length === 0) throw new Error("No image uploaded");

  const apiKey = await getApiKey();
  if (!apiKey) throw new Error("API Key required. Please click the 'Connect API Key' button or the key icon in the header.");
  
  const genAI = new GoogleGenAI({ apiKey });

  const labeledProductParts: any[] = [];
  for (let i = 0; i < files.length; i++) {
    labeledProductParts.push({ text: `[VISUAL SOURCE FOR PRODUCT_${i + 1}]` });
    labeledProductParts.push({
      inlineData: {
        mimeType: files[i].type,
        data: await fileToGenerativePart(files[i]),
      },
    });
  }

  const referenceImageParts = await Promise.all(
    referenceFiles.map(async (file) => ({
      inlineData: {
        mimeType: file.type,
        data: await fileToGenerativePart(file),
      },
    }))
  );

  const bgImageParts = bgFiles ? await Promise.all(
    bgFiles.map(async (file, idx) => ({
      text: `[BACKGROUND SOURCE ${idx + 1}]`,
      inlineData: {
        mimeType: file.type,
        data: await fileToGenerativePart(file),
      },
    }))
  ).then(parts => parts.flatMap(p => [ {text: p.text}, {inlineData: p.inlineData} ])) : [];

  const tools: any[] = [];

  let modeSpecificInstructions = "";
  if (activeMode === AppMode.BEAUTY) {
    modeSpecificInstructions = `
      [[ MODE SWITCH: ENTERING BEAUTY MODE ]]
      - **CRITICAL MISSION**: This is an EDITORIAL / LIFESTYLE / BRAND MOOD shot. 
      - **STRICT EXCLUSION**: ABSOLUTELY DISREGARD and IGNORE all rules regarding "2-Tier Stadium", "Row Distribution", "Tiering Logic", or "Product Quantity Grids" mentioned in the system instructions.
      - **LAYOUT**: Do NOT arrange products in rigid rows or grids. Instead, focus on a high-end, artistic, and single-unit focused commercial photography style with natural, atmospheric placement.
      - **ASPECT RATIO**: ${aspectRatio}
      - **LIGHTING STYLE**: ${lightingStyle !== LightingStyle.NONE ? lightingStyle : 'Natural / Default'}
      - **CREATIVE CONCEPT (ABSOLUTE PRIORITY)**: "${concept}"
      - **MOOD**: Focus on lighting, texture, and environment as specified in the [STYLE REFERENCE] and concept. Ensure the shot feels like a luxury advertisement, not a catalog display.
    `;
  } else {
    const q1 = quantities?.product1 || 0;
    const q2 = quantities?.product2 || 0;
    const q3 = quantities?.product3 || 0;
    const total = q1 + q2 + q3;

    // Logic for Default Layout Rules
    const tierMode = total <= 5 ? "1-TIER (Single row)" : "2-TIER (Two rows)";
    let distributionDetails = "";
    if (total >= 6) {
        const topRow = Math.floor(total / 2);
        const bottomRow = Math.ceil(total / 2);
        distributionDetails = `Split into 2 rows: Top Row has ${topRow} units, Bottom Row has ${bottomRow} units. (If total is odd, bottom row has exactly 1 more than top. If total is even, they are equal).`;
    } else {
        distributionDetails = "All products arranged in a single horizontal row.";
    }

    modeSpecificInstructions = `
      [[ MODE SWITCH: ENTERING COMPOSITION MODE ]]
      - **CRITICAL MISSION**: This is a TECHNICAL ARRANGEMENT / STADIUM DISPLAY / SHELF shot.
      - **STRICT ADHERENCE**: Follow all "Composition Page" layout rules, "2-Tier Stadium" logic, and precise quantity distribution mentioned in the system instructions.
      - **TARGET**: Exactly ${total} units in total.
      
      - **DEFAULT LAYOUT RULES (Apply these UNLESS overridden by Creative Concept)**:
        1. TIERING: If total units <= 5, use 1-TIER. If total units >= 6, use 2-TIER.
        2. 2-TIER DISTRIBUTION: In 2-Tier mode, if the count is even, split Top/Bottom equally. If the count is odd, the Bottom Row MUST have 1 more unit than the Top Row.
        3. CALCULATED TARGET: Based on total ${total}, use ${tierMode}. ${distributionDetails}

      - **ASPECT RATIO**: ${aspectRatio}
      - **LIGHTING STYLE**: ${lightingStyle !== LightingStyle.NONE ? lightingStyle : 'Natural / Default'}
      - **CREATIVE CONCEPT (ABSOLUTE HIGHEST PRIORITY)**: "${concept}"
      - **PRECEDENCE RULE**: If "${concept}" specifies a layout (e.g. "one single line"), override the tiering rules above.

      - **EXCLUSION**: Do NOT focus on abstract editorial moods if it sacrifices the structural clarity and grid-like arrangement of the products.
      - ORIENTATION: ALL products must face directly TOWARD THE CAMERA.
      - BACKGROUND: ${bgFiles && bgFiles.length > 0 ? "Use [BACKGROUND SOURCE] as environment." : `Use color: ${bgColor}.`}
      
      - BREAKDOWN: PRODUCT_1: ${q1}, PRODUCT_2: ${q2}, PRODUCT_3: ${q3} units.
    `;
  }

  const promptText = `
    TASK: Write a technical photography prompt for an image generator.
    
    ${modeSpecificInstructions}

    - Lighting: Clean, professional, and matching the requested mode (Dramatic/Artistic for BEAUTY, Studio/Even for COMPOSITION).
    - Fidelity: Exact match to [VISUAL SOURCE].
    - Spacing: Distinct horizontal and vertical gutters in COMPOSITION mode; artistic, high-end placement in BEAUTY mode.
    
    IMPORTANT: You MUST distinguish between BEAUTY (Lifestyle/Mood) and COMPOSITION (Structure/Grid). Follow the [[ MODE SWITCH ]] instructions explicitly to ensure the styles do not mix.
    
    OUTPUT: PROMPT TEXT ONLY.
  `;

  try {
    const response = await genAI.models.generateContent({
      model: "gemini-3-pro-preview", 
      contents: {
        role: "user",
        parts: [...labeledProductParts, { text: "[STYLE REFERENCE]" }, ...referenceImageParts, ...bgImageParts, { text: promptText }],
      },
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.1, 
        tools: tools,
        thinkingConfig: { thinkingBudget: 16000 } 
      },
    });

    return response.text || "Failed to generate prompt.";
  } catch (error: any) {
    const fallbackModel = "gemini-2.5-flash";
    const response = await genAI.models.generateContent({
        model: fallbackModel, 
        contents: {
            role: "user",
            parts: [...labeledProductParts, ...referenceImageParts, ...bgImageParts, { text: promptText }],
        },
        config: { systemInstruction: SYSTEM_PROMPT, temperature: 0.1 },
    });
    return response.text || "Failed to generate prompt.";
  }
};

export const generatePreviewImage = async (
  files: File[],
  referenceFiles: File[],
  prompt: string,
  aspectRatio: AspectRatio = AspectRatio.RATIO_16_9
): Promise<string> => {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error("API Key required. Please select a key using the key icon.");

  const genAI = new GoogleGenAI({ apiKey });
  
  const labeledProductParts: any[] = [];
  for (let i = 0; i < files.length; i++) {
    labeledProductParts.push({ text: `[PRODUCT_${i + 1}_SOURCE]` });
    labeledProductParts.push({
      inlineData: {
        mimeType: files[i].type,
        data: await fileToGenerativePart(files[i]),
      },
    });
  }

  const manifest = `[STRICT MODE EXECUTION]: 
- Determine if prompt is BEAUTY (Artistic Lifestyle) or COMPOSITION (Grid/Stadium).
- If COMPOSITION: Max 2 rows, 100% Front-facing, Zero overlapping, strict grid.
- If BEAUTY: Artistic focus, ignore grid/row rules, lifestyle arrangement.
- IDENTITY: Replicate [PRODUCT_X_SOURCE] exactly.
\n${prompt}`;

  try {
    const response = await genAI.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: {
        parts: [...labeledProductParts, { text: manifest }],
      },
      config: { imageConfig: { aspectRatio: aspectRatio, imageSize: "2K" } }
    });
    for (const candidate of response.candidates || []) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image found");
  } catch (error) { throw error; }
};

export const generateFinalImage = async (
  files: File[],
  referenceFiles: File[],
  prompt: string,
  aspectRatio: AspectRatio = AspectRatio.RATIO_16_9
): Promise<string> => {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error("API Key required. Please select a key using the key icon.");

  const proAI = new GoogleGenAI({ apiKey });
  
  const labeledProductParts: any[] = [];
  for (let i = 0; i < files.length; i++) {
    labeledProductParts.push({ text: `[PRODUCT_${i + 1}_SOURCE]` });
    labeledProductParts.push({
      inlineData: {
        mimeType: files[i].type,
        data: await fileToGenerativePart(files[i]),
      },
    });
  }

  const proHeader = `[PREMIUM 4K MODE-SPECIFIC RENDER]: 
- STRICT MODE SEPARATION: This render must be strictly BEAUTY (Artistic) or COMPOSITION (Technical Grid). Do NOT mix styles.
- IDENTITY: Absolute pixel-perfect replication.
- ORIENTATION: Follow mode rules (Composition units must face front).
- PROMPT: 
\n${prompt}`;

  try {
    const response = await proAI.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: {
        parts: [...labeledProductParts, { text: proHeader }],
      },
      config: { imageConfig: { aspectRatio: aspectRatio, imageSize: "4K" } }
    });
    for (const candidate of response.candidates || []) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image found");
  } catch (error) { throw error; }
};

export const editImage = async (
  base64Image: string,
  prompt: string,
  isPro: boolean
): Promise<string> => {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error("API Key required. Please select a key using the key icon.");

  const ai = new GoogleGenAI({ apiKey });
  const mimeType = base64Image.split(';')[0].split(':')[1];
  const data = base64Image.split(',')[1];
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: {
        parts: [
          { inlineData: { mimeType, data } },
          { text: `[STRICT MODE EDIT]: ${prompt} \n\nIMPORTANT: Maintain the mode's core logic (Beauty/Artistic vs Composition/Grid). Respect user concept precedence.` },
        ],
      },
      config: {
        // @ts-ignore
        imageConfig: { aspectRatio: "16:9", imageSize: isPro ? "4K" : "1K" },
      }
    });
    for (const candidate of response.candidates || []) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image found");
  } catch (error) { throw error; }
};
