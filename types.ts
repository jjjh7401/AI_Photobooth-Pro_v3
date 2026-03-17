
export enum AspectRatio {
  RATIO_16_9 = '16:9',
  RATIO_4_3 = '4:3',
  RATIO_1_1 = '1:1',
  RATIO_3_4 = '3:4',
  RATIO_9_16 = '9:16',
}

export enum LightingStyle {
  NONE = '선택안함',
  SOFT_LIGHT = 'Soft Light (부드러운 조명)',
  HARD_LIGHT = 'Hard Light (하드 라이트)',
  HIGH_KEY = 'High Key Lighting (하이키 조명)',
  LOW_KEY = 'Low Key Lighting (로우키 조명)',
  RIM_LIGHT = 'Rim Lighting (림 라이트)',
  GRADIENT = 'Gradient Lighting (그라데이션 조명)',
  REFLECTIVE = 'Reflective Lighting (반사 강조 조명)',
}

export enum AppMode {
  BEAUTY = 'BEAUTY',
  COMPOSITION = 'COMPOSITION',
}

export interface HistoryItem {
  id: string;
  url: string;
  type: 'preview' | 'final';
  prompt: string;
  timestamp: number;
}

export interface AppState {
  activeMode: AppMode;
  uploadedFiles: File[];
  referenceFiles: File[];
  aspectRatio: AspectRatio;
  concept: string;
  lightingStyle: LightingStyle;
  // Composition specific fields
  bgFiles: File[];
  bgColor: string;
  quantities: {
    product1: number;
    product2: number;
    product3: number;
  };
  generatedPrompt: string;
  previewImage: string | null;
  finalImage: string | null;
  isGeneratingPrompt: boolean;
  isGeneratingPreview: boolean;
  isGeneratingFinal: boolean;
  error: string | null;
  history: HistoryItem[];
}

export const SYSTEM_PROMPT = `
# COMPOSITION PAGE — SYSTEM PROMPT
## Identity-First · 2-Tier Stadium · Front-Facing Edition (v1.9)

---

## 🚨 ABSOLUTE CONSTITUTIONAL MANDATE: PRODUCT FIDELITY (최우선 지침)
The primary and most critical instruction is the **PERFECT REPLICATION of the product identity**. This overrides all other rules.

- **ZERO DISTORTION & ZERO OCCLUSION:** Products must NEVER overlap or hide parts of each other. Every single product unit must be 100% visible and separate.
- **NO MUTATION:** Do not alter label text, logo font, cap shape, bottle color, or proportions. 
- **NO STYLE-IMAGE LEAKAGE:** NEVER use products from the [STYLE REFERENCE] images. Only use products from [VISUAL SOURCE].

---

## 📐 SPATIAL LAYOUT & SUPPORT STRUCTURE (STRICT RULES)

### 1. MAX 2-TIER HORIZONTAL LAYOUT (최대 2단 배열 제한)
- Even with large quantities, products must **NOT exceed 2 rows (2 tiers)**.
- **HORIZONTAL EXTENSION:** If there are many products, extend the arrangement horizontally (wide) even if it leaves empty space at the top and bottom of the frame.
- **ROW DISTRIBUTION LOGIC:** 
  - The **Bottom Row** must always contain **more or equal** units than the Top Row for visual stability. 
  - *Example:* 13 units = Bottom 7, Top 6.
  - *Example:* 20 units = Bottom 10, Top 10.

### 2. CAMERA-FRONT ORIENTATION (모든 제품 정면 배치)
- **STRICTLY FRONT-FACING:** Every single product in the composition (left, center, or right side) must face **directly toward the camera**.
- **NO ANGLED OR INWARD FACING:** Do not rotate products toward the center or show side profiles. All labels must be perfectly readable from the front.

### 3. DUAL-LEVEL SPACING & TRANSPARENCY
- **INTER-GROUP SPACING:** Maintain wide horizontal gutters between different product types (P1, P2, P3).
- **INTRA-GROUP SPACING:** Keep same-type products close but ensure a visible gap between them.
- **VERTICAL GAPS:** Ensure clear vertical breathing room between the bottom row and the elevated back row.
- **SUPPORT:** Analyze [STYLE REFERENCE] for objects (podiums, transparent acrylic). Replicate materials while ensuring the background is visible between gaps.

---

## 🛡️ ABSOLUTE PRODUCT & SET IMMUTABILITY
- If the uploaded VISUAL SOURCE contains a **Bottle + Box**, these define **ONE PRODUCT SET**.
- Quantity **1 = ONE COMPLETE SET**.
- ❌ Rendering bottle alone or box alone is FORBIDDEN.

---

## 🧪 PRE-RENDER VALIDATION (MANDATORY)
Before output, internally confirm:
1. **Row Count Check:** Are there exactly 1 or 2 rows? (3+ rows are FORBIDDEN).
2. **Bottom-Heavy Check:** Does the bottom row have more units than the top row?
3. **Orientation Check:** Do ALL products face the camera directly? (No side profiles).
4. **Occlusion Check:** Is there ZERO overlapping?
5. **Horizontal Priority:** Is the arrangement stretched horizontally to accommodate high counts?
`;
