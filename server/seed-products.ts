// Seed Stripe Products Script
// Run with: npx tsx server/seed-products.ts

import { getUncachableStripeClient } from './stripeClient';

async function createProducts() {
  const stripe = await getUncachableStripeClient();
  
  console.log('Creating RunAnalytics subscription products...');

  // Check if products already exist
  const existingProducts = await stripe.products.search({
    query: "name:'RunAnalytics Pro' OR name:'RunAnalytics Premium'"
  });
  
  if (existingProducts.data.length > 0) {
    console.log('Products already exist:', existingProducts.data.map(p => p.name));
    console.log('Skipping creation. Delete existing products in Stripe Dashboard to recreate.');
    return;
  }

  // Create Pro Plan Product
  const proProduct = await stripe.products.create({
    name: 'RunAnalytics Pro',
    description: 'Advanced analytics, AI insights, and training recommendations for serious runners.',
    metadata: {
      plan: 'pro',
      features: 'AI Insights,Race Predictions,Training Plans,Runner Score'
    }
  });
  console.log('Created Pro product:', proProduct.id);

  // Pro Monthly Price: $3.99/month
  const proMonthly = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 399,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { plan: 'pro', billing: 'monthly' }
  });
  console.log('Created Pro monthly price:', proMonthly.id, '- $3.99/month');

  // Pro Annual Price: $39.99/year (save ~17%)
  const proAnnual = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 3999,
    currency: 'usd',
    recurring: { interval: 'year' },
    metadata: { plan: 'pro', billing: 'annual' }
  });
  console.log('Created Pro annual price:', proAnnual.id, '- $39.99/year');

  // Create Premium Plan Product
  const premiumProduct = await stripe.products.create({
    name: 'RunAnalytics Premium',
    description: 'Everything in Pro plus AI Coach chat, advanced form analysis, and priority support.',
    metadata: {
      plan: 'premium',
      features: 'All Pro Features,AI Coach Chat,Form Stability Analysis,Priority Support,Early Access'
    }
  });
  console.log('Created Premium product:', premiumProduct.id);

  // Premium Monthly Price: $7.99/month
  const premiumMonthly = await stripe.prices.create({
    product: premiumProduct.id,
    unit_amount: 799,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { plan: 'premium', billing: 'monthly' }
  });
  console.log('Created Premium monthly price:', premiumMonthly.id, '- $7.99/month');

  // Premium Annual Price: $79.99/year (save ~17%)
  const premiumAnnual = await stripe.prices.create({
    product: premiumProduct.id,
    unit_amount: 7999,
    currency: 'usd',
    recurring: { interval: 'year' },
    metadata: { plan: 'premium', billing: 'annual' }
  });
  console.log('Created Premium annual price:', premiumAnnual.id, '- $79.99/year');

  console.log('\n✅ All products and prices created successfully!');
  console.log('\nProduct Summary:');
  console.log('================');
  console.log('Pro Plan:');
  console.log(`  - Monthly: ${proMonthly.id} ($3.99/mo)`);
  console.log(`  - Annual: ${proAnnual.id} ($39.99/yr - save 17%)`);
  console.log('Premium Plan:');
  console.log(`  - Monthly: ${premiumMonthly.id} ($7.99/mo)`);
  console.log(`  - Annual: ${premiumAnnual.id} ($79.99/yr - save 17%)`);
}

createProducts().catch(console.error);
