// Seed Stripe Products Script
// Run with: npx tsx server/seed-products.ts

import { getUncachableStripeClient } from './stripeClient';

async function createProducts() {
  const stripe = await getUncachableStripeClient();
  
  console.log('Creating RunAnalytics subscription products...');

  // Check if products already exist
  const existingProducts = await stripe.products.search({
    query: "name:'RunAnalytics Premium'"
  });
  
  if (existingProducts.data.length > 0) {
    console.log('Products already exist:', existingProducts.data.map(p => p.name));
    console.log('Skipping creation. Delete existing products in Stripe Dashboard to recreate.');
    return;
  }

  // Create Premium Plan Product
  const premiumProduct = await stripe.products.create({
    name: 'RunAnalytics Premium',
    description: 'Personalized run analysis, AI Coach, adaptive training plans, race predictions, and progress comparisons.',
    metadata: {
      plan: 'premium',
      features: 'Personalized Analysis,AI Coach,Adaptive Training Plans,Race Predictions,Progress Comparisons'
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
  console.log('Premium Plan:');
  console.log(`  - Monthly: ${premiumMonthly.id} ($7.99/mo)`);
  console.log(`  - Annual: ${premiumAnnual.id} ($79.99/yr - save 17%)`);
}

createProducts().catch(console.error);
