import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

async function setupStripePrices() {
  console.log('Setting up Stripe products and prices...\n');

  try {
    // Create Pro Run Analytics product
    const proProduct = await stripe.products.create({
      name: 'Pro Run Analytics',
      description: 'Unlock advanced running analytics including unlimited AI insights, training plans, race predictions, and more.',
    });
    console.log(`Created product: ${proProduct.name} (${proProduct.id})`);

    // Create Pro monthly price
    const proMonthly = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 399, // $3.99 in cents
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      lookup_key: 'pro_monthly',
    });
    console.log(`  - Pro Monthly: $3.99/month (${proMonthly.id})`);

    // Create Pro annual price
    const proAnnual = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 3999, // $39.99 in cents
      currency: 'usd',
      recurring: {
        interval: 'year',
      },
      lookup_key: 'pro_annual',
    });
    console.log(`  - Pro Annual: $39.99/year (${proAnnual.id})`);

    // Create Premium Run Analytics product
    const premiumProduct = await stripe.products.create({
      name: 'Premium Run Analytics',
      description: 'The ultimate running analytics experience with AI Running Coach Chat, Form Stability Analysis, Priority Support, and Early Access to new features.',
    });
    console.log(`\nCreated product: ${premiumProduct.name} (${premiumProduct.id})`);

    // Create Premium monthly price
    const premiumMonthly = await stripe.prices.create({
      product: premiumProduct.id,
      unit_amount: 799, // $7.99 in cents
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      lookup_key: 'premium_monthly',
    });
    console.log(`  - Premium Monthly: $7.99/month (${premiumMonthly.id})`);

    // Create Premium annual price
    const premiumAnnual = await stripe.prices.create({
      product: premiumProduct.id,
      unit_amount: 7999, // $79.99 in cents
      currency: 'usd',
      recurring: {
        interval: 'year',
      },
      lookup_key: 'premium_annual',
    });
    console.log(`  - Premium Annual: $79.99/year (${premiumAnnual.id})`);

    console.log('\n========================================');
    console.log('STRIPE SETUP COMPLETE!');
    console.log('========================================\n');
    console.log('Update your pricing.tsx with these price IDs:\n');
    console.log(`const PRICE_IDS = {
  pro: {
    monthly: "${proMonthly.id}",
    annual: "${proAnnual.id}"
  },
  premium: {
    monthly: "${premiumMonthly.id}",
    annual: "${premiumAnnual.id}"
  }
};`);
    console.log('\n========================================\n');

  } catch (error: any) {
    console.error('Error setting up Stripe:', error.message);
    process.exit(1);
  }
}

setupStripePrices();
