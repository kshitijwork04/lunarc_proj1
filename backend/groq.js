const Groq = require('groq-sdk');
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

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function processChat(history) {
  // Translate history array { role: 'user' | 'model', text: '...' } into Groq/OpenAI format
  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  for (const msg of history) {
    messages.push({
      role: msg.role === 'model' ? 'assistant' : 'user',
      content: msg.text
    });
  }

  const tools = [
    { type: 'function', function: searchLiveProductsDeclaration },
    { type: 'function', function: trackOrderDeclaration }
  ];

  let response = await groq.chat.completions.create({
    model: 'openai/gpt-oss-120b',
    messages,
    tools,
    tool_choice: 'auto',
  });

  const responseMessage = response.choices[0].message;

  // Handle tool calls
  if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
    messages.push(responseMessage); // Add the assistant's tool call message to history

    for (const toolCall of responseMessage.tool_calls) {
      const args = JSON.parse(toolCall.function.arguments);
      let result;

      try {
        if (toolCall.function.name === 'searchLiveProducts') {
          result = await searchLiveProducts(args.query);
        } else if (toolCall.function.name === 'trackOrder') {
          result = await trackOrder(args.orderId);
        }
      } catch (err) {
        result = { error: err.message || "An error occurred while running the tool." };
      }

      messages.push({
        tool_call_id: toolCall.id,
        role: 'tool',
        name: toolCall.function.name,
        content: JSON.stringify(result)
      });
    }

    // Call Groq again with the tool responses
    response = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages,
      tools,
      tool_choice: 'auto',
    });
  }

  return response.choices[0].message.content;
}

module.exports = { processChat };
