const { Anthropic } = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

async function testPrompt() {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });

  // Create a simple test image (we'll just use a text description for this test)
  const testMessage = `
You are analyzing a receipt image. Extract the following information:

FINDING THE AMOUNT (CRITICAL - THIS IS YOUR PRIMARY JOB):
Search for "Amount Due", "Total Due", "Balance Due", "Total", or "Please Pay"
- Look to the RIGHT of these phrases for a $ sign and the number
- Example: "Amount Due        $68.93" → extract as 68.93 (not string, real number)
- Strip symbols: $ £ € ¥ commas
- Valid range: 0.01 to 999999.99 (reject 0 or null unless genuinely blank)

ACCOUNT TYPE (ASSET vs EXPENSE):
- EXPENSE (default): rent, utilities, office supplies, meals, services, subscriptions
- ASSET: equipment, vehicles, property, furniture, tools with useful life > 1 year
- Return: "EXPENSE", "ASSET", or null

GST/HST DETAILS:
- Extract the GST/HST rate if shown (5, 13, etc.)
- Extract the GST/HST amount if shown separately
- If not shown: rate=0, amount=0

Now extract and return ONLY this JSON (no markdown, no explanations, no extra text):

{
  "date": "YYYY-MM-DD or null",
  "amount": <number or null>,
  "description": "what was purchased",
  "vendor_name": "business name or null",
  "type": "RECEIPT or INVOICE or null",
  "account_type": "EXPENSE or ASSET or null",
  "gst_hst_amount": 0,
  "gst_hst_rate": 0
}`;

  try {
    console.log('Testing improved prompt structure...\n');

    const message = await client.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: testMessage + '\n\nExample receipt: Bell Canada invoice for $125.50 including 13% HST, dated 2025-05-24'
        }
      ]
    });

    const response = message.content[0];
    if (response.type !== 'text') {
      console.log('Error: unexpected response type');
      return;
    }

    const text = response.text.trim();
    console.log('Claude Response:');
    console.log(text);
    console.log('\n---\n');

    // Try to parse the JSON
    try {
      // First try direct parse
      const data = JSON.parse(text);
      console.log('✅ SUCCESS: Direct JSON parse worked!');
      console.log(JSON.stringify(data, null, 2));
    } catch (e1) {
      console.log('Direct parse failed, trying markdown extraction...');

      // Try markdown extraction
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          const data = JSON.parse(jsonMatch[1].trim());
          console.log('✅ SUCCESS: Markdown extraction worked!');
          console.log(JSON.stringify(data, null, 2));
        } catch (e2) {
          console.log('❌ FAILED: Markdown extraction parse error');
          throw e2;
        }
      } else {
        // Try brute force extraction
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
          try {
            const data = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
            console.log('✅ SUCCESS: Brute force extraction worked!');
            console.log(JSON.stringify(data, null, 2));
          } catch (e3) {
            console.log('❌ FAILED: All parsing methods failed');
            console.log('Raw response:', text.substring(0, 300));
            throw e3;
          }
        } else {
          console.log('❌ FAILED: Could not find JSON markers');
          throw new Error('No JSON found in response');
        }
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testPrompt();
