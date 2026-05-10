const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '../../../uploads');

const SYSTEM_PROMPT = `Eres un experto en gestión de inventarios. Analiza la imagen de este producto y extrae la información técnica. Devuelve solo un objeto JSON con exactamente estos campos: {"name": "...", "brand": "...", "model": "...", "category": "...", "capacity": "...", "description": "..."}. Si un dato no es visible, pon null. Usa solo texto plano, sin caracteres especiales, emojis ni símbolos. Solo letras, numeros, espacios, comas, guiones y puntos. Se conciso.`;

function saveImage(base64Data, barcode) {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  const filename = `${barcode}_${Date.now()}.jpg`;
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), Buffer.from(base64Data, 'base64'));
  return filename;
}

async function analyzeProductImage(base64Data, mimeType = 'image/jpeg') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY no está configurada en el entorno');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

  const result = await model.generateContent([
    SYSTEM_PROMPT,
    { inlineData: { mimeType, data: base64Data } },
  ]);

  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('La IA no devolvió un JSON válido');

  return JSON.parse(jsonMatch[0]);
}

module.exports = { analyzeProductImage, saveImage };
