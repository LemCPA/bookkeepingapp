require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');

const apiKey = process.env.STRIPE_SECRET_KEY;
if (!apiKey) {
  console.error('[TEST] STRIPE_SECRET_KEY not found in environment');
  process.exit(1);
}

const stripe = new Stripe(apiKey, { apiVersion: '2024-04-10' });

async function test() {
  try {
    console.log('[TEST] Fetching test customers...');
    const customers = await stripe.customers.list({ limit: 5 });
    
    if (customers.data.length === 0) {
      console.log('[TEST] No customers found');
      process.exit(0);
    }
    
    console.log(`[TEST] Found ${customers.data.length} customers\n`);
    
    for (const customer of customers.data) {
      const subs = await stripe.subscriptions.list({ 
        customer: customer.id, 
        status: 'active',
        limit: 1 
      });
      
      if (subs.data.length > 0) {
        const sub = subs.data[0];
        const item = sub.items.data[0];
        const priceAmount = typeof item.price === 'object' ? item.price.unit_amount : 0;
        const plan = sub.metadata?.plan || 'unknown';
        
        console.log(`Customer: ${customer.id}`);
        console.log(`  Email: ${customer.email}`);
        console.log(`  Subscription: ${sub.id}`);
        console.log(`  Plan: ${plan}`);
        console.log(`  Price: $${(priceAmount / 100).toFixed(2)}`);
        console.log(`  Period ends: ${new Date(sub.current_period_end * 1000).toLocaleDateString()}\n`);
      }
    }
  } catch (err) {
    console.error('[TEST] Error:', err.message);
    process.exit(1);
  }
}

test();
