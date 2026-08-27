const { GoogleGenAI } = require('@google/genai');
const faq = require('./data/faq.js');
const { searchLiveProducts, searchLiveProductsDeclaration } = require('./tools/searchProducts.js');
const { trackOrder, trackOrderDeclaration } = require('./tools/trackOrder.js');

const systemPrompt = `You are a helpful shopping assistant for an online store. You can search live products, track orders, and answer support questions.

Rules:
1. Call searchLiveProducts for anything about finding/comparing/checking products or prices. Extract intent and structured parameters (product, brand, price ceiling, category) from casual, misspelled, or indirect phrasing before calling the tool.
2. Call trackOrder only when the user gives or clearly references an order ID.
3. Answer FAQ questions directly from the FAQ block below with no tool call.
4. NEVER state a product exists, a price, or an order status unless it came from a tool result. Do not make up product names, prices, or order statuses.
5. If a tool returns no data or errors, say so honestly and suggest a next step (broaden search, rephrase, try a different order ID). Never pretend to succeed.
6. Tone: concise, friendly, no corporate filler.
7. Formatting: when presenting product results, list them clearly with name, price, source site, and link. Make it easy to scan.
8. If a user asks something totally outside scope (not product/order/FAQ related), politely say you can only help with shopping, orders, and support. Do not attempt a generic answer.

${faq}`;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function processChat(history) {
  // history is an array of { role: 'user' | 'model', text: '...' } from frontend
  // We need to convert it to the format expected by GenAI: { role: 'user' | 'model', parts: [{ text: '...' }] }
  
  const contents = history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.text }]
  }));

  const tools = [{ functionDeclarations: [searchLiveProductsDeclaration, trackOrderDeclaration] }];

  let response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents,
    config: {
      systemInstruction: systemPrompt,
      tools: tools
    }
  });

  // Handle tool calls if any
  if (response.functionCalls && response.functionCalls.length > 0) {
    const newParts = [];
    newParts.push(...response.candidates[0].content.parts); // The model's function calls

    for (const call of response.functionCalls) {
      let result;
      if (call.name === 'searchLiveProducts') {
        result = await searchLiveProducts(call.args.query);
      } else if (call.name === 'trackOrder') {
        result = await trackOrder(call.args.orderId);
      }

      newParts.push({
        functionResponse: {
          name: call.name,
          response: { data: result }
        }
      });
    }

    // Append the tool calls and responses to the contents and call again
    contents.push({ role: 'model', parts: newParts.filter(p => p.functionCall) });
    contents.push({ role: 'user', parts: newParts.filter(p => p.functionResponse) });

    response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents,
      config: {
        systemInstruction: systemPrompt,
        tools: tools
      }
    });
  }

  return response.text;
}

module.exports = { processChat };
