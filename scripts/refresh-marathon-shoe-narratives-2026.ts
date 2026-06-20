/**
 * Refreshes aiNarrative, aiFaq, aiResilienceScore, aiMileageEstimate and
 * aiTargetUsage for all 2026 marathon/racing super-shoes.
 *
 * Safe to re-run — uses upsert-style UPDATE by slug.
 */
import { db } from '../server/db';
import { runningShoes } from '../shared/schema';
import { eq } from 'drizzle-orm';

interface ShoeContent {
  slug: string;
  aiNarrative: string;
  aiFaq: { question: string; answer: string }[];
  aiResilienceScore: number;   // 1–100, durability relative to category
  aiMileageEstimate: number;   // expected miles before retirement
  aiTargetUsage: string;       // brief usage label
}

const SHOE_CONTENT: ShoeContent[] = [
  // ── Nike ──────────────────────────────────────────────────────────────────
  {
    slug: 'nike-vaporfly-5',
    aiResilienceScore: 52,
    aiMileageEstimate: 320,
    aiTargetUsage: 'Marathon & half-marathon racing',
    aiNarrative: `The Nike Vaporfly 5 is the fifth generation of the most race-proven super-shoe in marathon history. Weighing 6.6 oz, it carries ZoomX PEBA foam — Nike's highest energy-return compound — under a full-length carbon-fibre plate. The 39 mm heel / 31 mm forefoot stack gives the Vaporfly 5 significantly more cushioning depth than its predecessor without adding weight, making it more accessible for runners racing longer on the roads. The updated Flyknit upper is lighter and more breathable, with a secure fit that holds the foot stable through the heel-to-toe transition. At $260, it remains the benchmark against which every other carbon-plated marathon shoe is measured.`,
    aiFaq: [
      { question: 'How does the Vaporfly 5 differ from the Vaporfly 4?', answer: 'The v5 gains a significantly taller heel stack (39 mm vs 32 mm) and a refined Flyknit upper, while shaving 0.1 oz. The result is a more cushioned ride with the same responsive ZoomX snap runners know from previous generations.' },
      { question: 'Is the Vaporfly 5 legal for road racing?', answer: 'Yes. As of 2026 the Vaporfly 5 meets World Athletics regulations: one rigid embedded plate and a stack height under 40 mm.' },
      { question: 'How many miles should I expect from a pair?', answer: 'Most runners report 250–350 miles before the ZoomX foam noticeably softens and energy return drops. Racing-only use extends lifespan; training in them accelerates wear.' },
      { question: 'Is the Vaporfly 5 better than the Alphafly 4 for a marathon?', answer: 'The Alphafly 4 has twin Air Zoom pods and a slightly higher stack, making it marginally more propulsive for pure marathon distance. The Vaporfly 5 is lighter and more versatile across all race distances from 5K to the marathon.' },
      { question: 'What drop does the Vaporfly 5 have?', answer: '8 mm, the same as previous Vaporfly models. This suits heel-to-midfoot strikers and eases the transition from traditional training shoes.' },
    ],
  },
  {
    slug: 'nike-alphafly-4',
    aiResilienceScore: 48,
    aiMileageEstimate: 280,
    aiTargetUsage: 'Marathon racing, PB attempts',
    aiNarrative: `The Nike Alphafly 4 is Nike's most aggressive marathon racing weapon. Its defining feature is a twin Air Zoom unit beneath the forefoot — two pressurised pods that add a spring-loaded "pop" on top of the 40 mm ZoomX midsole. At 7.2 oz and a 4 mm drop, it sits at the cushioned, low-drop end of the racing spectrum — best suited to midfoot and forefoot strikers who want maximum propulsion at marathon pace. The full-length carbon-fibre plate channels force efficiently through the toe-off phase. The Flyknit upper has been refined for the 4th generation, improving heel lockdown and reducing hot spots on long efforts. At $285, it's the most expensive shoe in Nike's racing range and the one reserved for goal-race days.`,
    aiFaq: [
      { question: 'Who is the Alphafly 4 designed for?', answer: 'Midfoot and forefoot strikers targeting marathon PBs who want the maximum propulsion Nike offers. Heel-strikers often prefer the Vaporfly 5\'s 8 mm drop geometry.' },
      { question: 'What are the twin Air Zoom pods?', answer: 'Two pressurised air chambers built into the forefoot midsole. They compress on landing and release energy at toe-off, adding a distinct "bounce" sensation on top of the ZoomX foam.' },
      { question: 'Can I train in the Alphafly 4?', answer: 'You can, but with only 280 estimated miles before foam compression, training in race shoes shortens their life significantly. Most runners use the Alphafly exclusively on race day and in key tune-up sessions.' },
      { question: 'How does the Alphafly 4 compare to the Alphafly 3?', answer: 'The v4 refines the upper for better breathability and heel lockdown. The Air Zoom + ZoomX + carbon system is largely unchanged, but foam geometry tweaks improve the toe-off sensation.' },
      { question: 'Is the Alphafly 4 worth $285?', answer: 'For runners targeting a marathon PB, the propulsion advantage is real. For half-marathon and shorter distances, the Vaporfly 5 is lighter and better value.' },
    ],
  },
  {
    slug: 'nike-streakfly-2',
    aiResilienceScore: 55,
    aiMileageEstimate: 250,
    aiTargetUsage: '5K–10K racing, track, short road events',
    aiNarrative: `The Nike Streakfly 2 is a plateless racing flat built specifically for short-distance speed. At 5.6 oz — the lightest shoe in Nike's racing lineup — it uses ZoomX foam without a carbon plate, delivering a low-to-ground, snappy feel that's ideal for 5K and 10K efforts. The 8 mm drop maintains familiarity for most runners. The Flyknit upper wraps closely around the foot, and the outsole is thin enough to keep the weight down while offering enough grip for road racing. Compared to the full super-shoe stack of the Vaporfly or Alphafly, the Streakfly 2 rewards good running form rather than amplifying it — a true racing flat for runners who move well at high cadence. At $170 it's the most accessible shoe in Nike's racing portfolio.`,
    aiFaq: [
      { question: 'Does the Streakfly 2 have a carbon plate?', answer: 'No. It uses ZoomX foam without any embedded plate, giving it a ground-feel racing flat character rather than the propulsive "super-shoe" experience of the Vaporfly or Alphafly.' },
      { question: 'What distances is the Streakfly 2 best for?', answer: '5K and 10K primarily. Some runners use it for half-marathons, but the lower stack depth (32 mm heel) makes it less cushioned than ideal for longer distances at race effort.' },
      { question: 'How does the Streakfly 2 compare to the original Streakfly?', answer: 'The v2 updates the upper for improved breathability and a slightly refined outsole traction pattern. The core foam and weight class are unchanged.' },
      { question: 'Is the Streakfly 2 good for track racing?', answer: 'It works well on track for road runners who don\'t want spikes. Dedicated track athletes typically prefer a spike for lap distances, but the Streakfly 2 is a capable alternative.' },
      { question: 'Why choose the Streakfly 2 over the Vaporfly 5?', answer: 'If your race distance is 5K–10K and you prioritise ground feel and a lighter shoe over maximum energy return, the Streakfly 2\'s $90 cheaper price and plateless design make it the better choice.' },
    ],
  },
  // ── Adidas ────────────────────────────────────────────────────────────────
  {
    slug: 'adidas-adizero-adios-pro-5',
    aiResilienceScore: 54,
    aiMileageEstimate: 340,
    aiTargetUsage: 'Marathon & half-marathon racing',
    aiNarrative: `The Adidas Adizero Adios Pro 5 is the brand's flagship marathon super-shoe, worn at finish lines across every World Marathon Major. Its Energyrods 2.0 system — multiple carbon-fibre rods rather than a single plate — provides a wider propulsive contact patch that many runners describe as smoother than single-plate alternatives. Lightstrike Pro PEBA foam fills the 39 mm heel stack, delivering exceptional energy return in a responsive, medium-soft package. At 7.2 oz and a 6 mm drop, the Pro 5 suits midfoot strikers and those who prefer the toe-rocker geometry that Adidas has refined across five generations. At $250 it's priced accessibly for elite-level racing equipment.`,
    aiFaq: [
      { question: 'What are Energyrods 2.0?', answer: 'Multiple carbon-fibre rods embedded in the Lightstrike Pro midsole, running from heel to toe. Unlike a single plate, the multi-rod design flexes slightly differently in the midfoot, providing a wider propulsive surface. V2 rods are stiffer and more precisely tuned than the original.' },
      { question: 'How does the Adios Pro 5 compare to the Vaporfly 5?', answer: 'Both weigh around 7 oz and use PEBA-class foams. The Adios Pro 5 is $10 less and has a 6 mm drop (vs Vaporfly\'s 8 mm). Midfoot strikers often prefer Adidas\'s toe-rocker feel; heel-strikers tend to prefer Nike\'s higher drop.' },
      { question: 'How many miles does the Adios Pro 5 last?', answer: 'Approximately 300–380 miles before Lightstrike Pro foam shows significant compression. Slightly more durable than Nike\'s ZoomX in most runner reports.' },
      { question: 'Can you train in the Adios Pro 5?', answer: 'Yes — the Pro line is more durable than the Evo line. Many runners use the Pro 5 for long runs, tempo work, and race day. Dedicating it to quality sessions extends lifespan.' },
      { question: 'Is the Adios Pro 5 World Athletics legal?', answer: 'Yes. The multi-rod Energyrods system qualifies under the current rules, and stack height is under 40 mm.' },
    ],
  },
  {
    slug: 'adidas-adizero-adios-pro-evo-3',
    aiResilienceScore: 22,
    aiMileageEstimate: 120,
    aiTargetUsage: 'Race-day only, elite marathon PB attempts',
    aiNarrative: `The Adidas Adizero Adios Pro Evo 3 is the lightest carbon-plated marathon super-shoe in production at 3.4 oz — less than half the weight of its sibling, the Pro 5. Built for elite-level single-race use, it strips the upper to near-nothing and uses Energyrods 3.0 — Adidas's stiffest and most aggressive rod geometry — to generate maximum propulsion from each stride. Lightstrike Pro PEBA fills the midsole to a 39 mm heel stack. The tradeoff is durability: expect 100–150 miles before the minimal construction starts to degrade. At $500, the Evo 3 is a specialist weapon for runners who need every gram off their foot and are willing to pay for a shoe that may last one major race.`,
    aiFaq: [
      { question: 'How durable is the Pro Evo 3?', answer: 'Very limited — approximately 100–150 miles. The ultra-minimal upper and aggressive foam compression make it unsuitable for training. It\'s designed for race day only.' },
      { question: 'Is the Evo 3 worth $500?', answer: 'For elite runners where fractions of a second matter, the weight advantage (3.4 oz vs 7+ oz for full-spec shoes) is meaningful. For most competitive amateur runners, the Pro 5 delivers near-equivalent speed at $250.' },
      { question: 'How does the Evo 3 differ from the Evo 2?', answer: 'The Evo 3 drops 1.5 oz from the Evo 2 (4.9 oz → 3.4 oz) and upgrades to Energyrods 3.0, which are stiffer and provide more aggressive propulsion. A meaningful performance improvement.' },
      { question: 'Is the Evo 3 legal for road racing?', answer: 'Yes — it meets World Athletics regulations as of 2026. Always confirm with your race organiser if competing at major events.' },
      { question: 'Who should buy the Evo 3?', answer: 'Elite or sub-elite runners targeting marathon records who race in shoes once and can afford the $500 per-race cost. For everyone else, the Pro 5 is the rational choice.' },
    ],
  },
  {
    slug: 'adidas-takumi-sen-11',
    aiResilienceScore: 50,
    aiMileageEstimate: 280,
    aiTargetUsage: '5K–half-marathon racing, track events',
    aiNarrative: `The Adidas Takumi Sen 11 is a lightweight, short-distance racing shoe that sits between a traditional flat and a full super-shoe. At 6.4 oz with a 33 mm heel stack and 6 mm drop, it carries Lightstrike Pro foam and carbon Energyrods tuned for shorter efforts. The lower stack (vs the Pro 5's 39 mm) gives the Takumi Sen 11 a more ground-feel, direct character — better suited for 5K, 10K, and half-marathon race pace than marathon pounding. At $200 it's Adidas's most accessible carbon racing shoe and a popular choice for club runners competing in shorter road events who want Energyrods propulsion without a full super-shoe price.`,
    aiFaq: [
      { question: 'What distances is the Takumi Sen 11 designed for?', answer: '5K through half-marathon. Its 33 mm heel stack is lower than marathon super-shoes, giving a ground-feel suited to shorter, faster efforts.' },
      { question: 'How does the Takumi Sen 11 compare to the Adios Pro 5?', answer: 'The Takumi Sen 11 is lighter (6.4 vs 7.2 oz), cheaper ($200 vs $250), and has a lower stack (33 vs 39 mm). It\'s snappier for shorter distances; the Pro 5 is more cushioned and better for marathon efforts.' },
      { question: 'Does the Takumi Sen 11 have a carbon plate?', answer: 'Yes — it uses carbon Energyrods, the same system as the Pro line but tuned with a lower stack for shorter race distances.' },
      { question: 'Can I use the Takumi Sen 11 for a marathon?', answer: 'Technically yes, but the lower stack depth makes it less comfortable over 26.2 miles at race effort. The Adios Pro 5 is the better marathon choice from Adidas.' },
    ],
  },
  // ── ASICS ─────────────────────────────────────────────────────────────────
  {
    slug: 'asics-metaspeed-sky-tokyo',
    aiResilienceScore: 53,
    aiMileageEstimate: 300,
    aiTargetUsage: 'Marathon racing for stride-length runners',
    aiNarrative: `The ASICS Metaspeed Sky Tokyo is the brand's flagship marathon super-shoe, specifically engineered for stride-length runners — athletes whose speed comes primarily from taking longer strides rather than faster cadence. At 6.5 oz with a 39.5 mm heel stack and 5 mm drop, it uses FF Turbo Plus PEBA foam and a full-length carbon plate tuned to amplify stride extension. ASICS has validated through biomechanical testing that the Sky geometry benefits runners with cadence below approximately 180 steps per minute. For those athletes, the Metaspeed Sky Tokyo performs at the very top of the 2026 super-shoe market. At $275 it matches the Vaporfly 5 in quality and exceeds it in specificity.`,
    aiFaq: [
      { question: 'What is a "stride-length" runner?', answer: 'A runner whose primary speed mechanism is taking longer strides rather than faster turnover. Typically characterised by a cadence below 180 steps per minute and a longer ground contact time.' },
      { question: 'How does the Sky Tokyo differ from the Edge Tokyo?', answer: 'The Sky Tokyo is for stride-length runners (<180 spm); the Edge Tokyo is for cadence runners (>185 spm) with a stiffer plate geometry for rapid turnover. Both cost $275 and use FF Turbo Plus foam.' },
      { question: 'How does FF Turbo Plus compare to Nike\'s ZoomX?', answer: 'Both are PEBA-based foams with excellent energy return. FF Turbo Plus is often described as slightly softer and more compliant; ZoomX as snappier. Real-world performance difference is minimal at elite level.' },
      { question: 'Is the Sky Tokyo the same as the Sky Paris?', answer: 'The Tokyo edition is the 2026 update to the Paris (2024) model. Key improvements include foam refinements and an updated upper for better lockdown.' },
      { question: 'What drop does the Sky Tokyo have?', answer: '5 mm — lower than Nike\'s Vaporfly (8 mm). Runners transitioning from high-drop trainers should adapt gradually.' },
    ],
  },
  {
    slug: 'asics-metaspeed-edge-tokyo',
    aiResilienceScore: 53,
    aiMileageEstimate: 300,
    aiTargetUsage: 'Marathon racing for cadence runners',
    aiNarrative: `The ASICS Metaspeed Edge Tokyo is the cadence-runner counterpart to the Sky Tokyo — engineered for athletes whose speed comes from rapid turnover (above approximately 185 steps per minute) rather than stride extension. It uses the same FF Turbo Plus PEBA foam and $275 price point as the Sky Tokyo, but its carbon plate is tuned with a stiffer forefoot geometry that snaps the foot through quickly at high cadence. At 6.6 oz with a 39 mm heel stack and 5 mm drop, it sits within 0.1 oz and 0.5 mm of the Sky Tokyo — the difference is entirely in how the plate transfers force at different stride rates. If you're unsure which model suits you, run with a GPS watch and check your cadence: Edge for >185 spm, Sky for <180 spm.`,
    aiFaq: [
      { question: 'What is a "cadence" runner?', answer: 'A runner who generates speed primarily through a higher step rate rather than longer strides. Typically characterised by cadence above 185 steps per minute and shorter, quicker ground contacts.' },
      { question: 'How do I know if I should choose Edge or Sky?', answer: 'Check your average running cadence in a recent race or tempo session. Below 180 spm → Sky Tokyo. Above 185 spm → Edge Tokyo. Between 180–185 spm → try both if possible, or choose based on feel.' },
      { question: 'Are the Edge and Sky Tokyo the same price?', answer: 'Yes — both are $275. The choice is purely biomechanical.' },
      { question: 'Can I use the Edge Tokyo for shorter races?', answer: 'Yes. The cadence-oriented plate works well for half-marathon and 10K race paces where high cadence is natural.' },
    ],
  },
  // ── Brooks ────────────────────────────────────────────────────────────────
  {
    slug: 'brooks-hyperion-elite-5',
    aiResilienceScore: 55,
    aiMileageEstimate: 350,
    aiTargetUsage: 'Marathon & half-marathon racing',
    aiNarrative: `The Brooks Hyperion Elite 5 is Brooks's answer to the elite marathon super-shoe market, combining a full-length carbon plate with SpeedVault Race+ PEBA foam for an energy return experience that competes directly with the Vaporfly 5 and Adios Pro 5. At 7.4 oz with a 39 mm heel stack and 8 mm drop — identical drop to most Brooks trainers — the HE5 offers the smoothest transition of any super-shoe for Brooks loyalists. The 8 mm drop also makes it one of the most accessible super-shoes for heel-strike–heavy runners who aren't ready to make a geometry shift. At $250, it's well priced against the Nike and Adidas flagships, and slightly more durable at an estimated 350 miles.`,
    aiFaq: [
      { question: 'Is the Hyperion Elite 5 good for beginner marathon runners?', answer: 'More accessible than most super-shoes — the 8 mm drop matches standard training shoe geometry. Heavier at 7.4 oz, but very stable and forgiving for runners new to carbon plates.' },
      { question: 'How does the HE5 compare to the Vaporfly 5?', answer: 'The Vaporfly 5 is 0.8 oz lighter and has a snappier ZoomX feel. The HE5 has the same 8 mm drop, is $10 cheaper, and is slightly more durable. For Brooks loyalists it\'s the clear choice.' },
      { question: 'What is SpeedVault Race+ foam?', answer: 'Brooks\'s proprietary PEBA-based racing foam — their equivalent to Nike\'s ZoomX or Adidas\'s Lightstrike Pro. High energy return with a slightly plusher, softer character than ZoomX.' },
      { question: 'How many miles does the Hyperion Elite 5 last?', answer: 'Approximately 300–400 miles — marginally more durable than Nike\'s ZoomX-based shoes in most user reports.' },
    ],
  },
  // ── HOKA ─────────────────────────────────────────────────────────────────
  {
    slug: 'hoka-rocket-x-3',
    aiResilienceScore: 54,
    aiMileageEstimate: 320,
    aiTargetUsage: 'Marathon & half-marathon racing',
    aiNarrative: `The HOKA Rocket X 3 is HOKA's most significant leap in marathon racing to date. The introduction of PEBA-infused foam — a generation-defining upgrade from the Rocket X 2's previous compound — brings energy return metrics into direct competition with the Nike Vaporfly and Adidas Adios Pro 5. At 7.4 oz with a 39 mm heel stack, 4 mm drop, and HOKA's signature meta-rocker geometry, the Rocket X 3 delivers an automatic forward roll that many runners describe as effortless at marathon pace. A full-length carbon plate channels the energy efficiently. At $250, it matches the Adios Pro 5 on price and offers excellent value for HOKA-loyal athletes who want to race in a familiar geometry.`,
    aiFaq: [
      { question: 'What changed between the Rocket X 2 and Rocket X 3?', answer: 'The Rocket X 3 introduces PEBA-infused foam — a generation-defining improvement. The v2 used an earlier HOKA compound; the v3\'s foam energy return is in the same class as ZoomX and Lightstrike Pro.' },
      { question: 'What is HOKA\'s meta-rocker?', answer: 'A pronounced curved midsole geometry that promotes a smooth heel-to-toe rolling transition. At marathon pace it reduces the muscular effort needed to push off, helping maintain form in the final miles.' },
      { question: 'Is the Rocket X 3 good for heel-strikers?', answer: 'The 4 mm drop is lower than many runners are used to. Heel-strikers who want a more familiar geometry might prefer the Vaporfly 5 (8 mm drop) or Hyperion Elite 5 (8 mm drop).' },
      { question: 'How does the Rocket X 3 compare to the Vaporfly 5?', answer: 'The Vaporfly 5 is 0.8 oz lighter and has a snappier, more direct feel. The Rocket X 3 offers HOKA\'s signature effortless roll-through and is $10 cheaper. Both are elite marathon options.' },
    ],
  },
  // ── New Balance ───────────────────────────────────────────────────────────
  {
    slug: 'new-balance-fuelcell-supercomp-elite-v5',
    aiResilienceScore: 52,
    aiMileageEstimate: 310,
    aiTargetUsage: 'Marathon racing, maximum cushion',
    aiNarrative: `The New Balance FuelCell SuperComp Elite v5 is the most cushioned flagship in the 2026 super-shoe field, with a 40 mm heel stack and PEBA-based FuelCell foam that many runners describe as the bounciest ride in elite racing. At 7.6 oz — the heaviest of the mainstream 2026 super-shoes — it carries that weight in service of a remarkably lively, propulsive midsole. A full-length carbon plate runs through the midsole. The 4 mm drop positions it alongside the HOKA Rocket X 3 and On Cloudboom Strike LS in the low-drop racing category. At $280, it sits between the Adios Pro 5 and Nike Alphafly 4 on price. Best suited to runners who prioritise maximum underfoot energy return and can adapt to the low-drop geometry.`,
    aiFaq: [
      { question: 'Is the FuelCell SuperComp Elite v5 the most cushioned 2026 super-shoe?', answer: 'At 40 mm heel stack it ties with the Nike Alphafly 4 for the tallest stack among mainstream 2026 marathon super-shoes. Combined with PEBA foam, it\'s one of the most cushioned options available.' },
      { question: 'How does the v5 differ from the v4?', answer: 'The v5 increases stack height, updates the PEBA foam compound for better energy return, and revises the carbon plate geometry. The biggest adaptation for v4 users is the drop change from 8 mm (v4) to 4 mm (v5).' },
      { question: 'Is the v5 suitable for heel-strikers?', answer: 'The 4 mm drop requires adaptation for heel-strikers used to 8+ mm shoes. Spend 4–6 weeks in the v5 during training before using it on race day.' },
      { question: 'What is PEBA FuelCell foam?', answer: 'New Balance\'s proprietary PEBA-based foam, updated in the v5 for higher energy return per compression cycle. Most testers describe it as extremely bouncy with a soft landing character.' },
    ],
  },
  // ── On ────────────────────────────────────────────────────────────────────
  {
    slug: 'on-cloudboom-strike-ls',
    aiResilienceScore: 44,
    aiMileageEstimate: 260,
    aiTargetUsage: 'Marathon racing, tech-forward runners',
    aiNarrative: `The On Cloudboom Strike LS is the most technologically distinctive shoe in the 2026 marathon super-shoe market. Its upper is robotically sprayed onto a last in On's proprietary LightSpray process — producing a seamless, sock-like fit with no traditional stitching or material layering. This construction contributes to its 6 oz weight — the lightest in its class — despite a 43 mm heel stack (the tallest in the field) and a full-length carbon plate. The 4 mm drop encourages a midfoot-forward strike pattern. At $330, it's the most expensive shoe in the comparison group, but for runners who want cutting-edge materials, an unmatched fit experience, and maximum stack in the lightest possible package, the Cloudboom Strike LS is genuinely extraordinary.`,
    aiFaq: [
      { question: 'What is LightSpray technology?', answer: 'On\'s process of robotically spraying the upper material directly onto a last — eliminating traditional seams and layers. The result is a one-piece, form-fitting upper that conforms precisely to the foot and contributes meaningfully to the shoe\'s 6 oz weight.' },
      { question: 'Why is the Cloudboom Strike LS so expensive at $330?', answer: 'The LightSpray construction process and materials are significantly more costly to produce than conventional uppers. The price also reflects the shoe\'s limited production and technology leadership position.' },
      { question: 'Is 43 mm stack legal for road racing?', answer: 'As of 2026, World Athletics permits stack heights up to 40 mm for road races. At 43 mm, the Cloudboom Strike LS exceeds this limit and may not be legal at World Athletics–sanctioned events. Always confirm with your race organiser.' },
      { question: 'How does the Cloudboom Strike LS compare to the Vaporfly 5?', answer: 'The Cloudboom is lighter (6 vs 6.6 oz), has a taller stack (43 vs 39 mm), and costs $70 more. The Vaporfly has an 8 mm drop vs 4 mm for the Cloudboom. Most runners will find the Vaporfly 5 more versatile; the Cloudboom suits midfoot-forward runners who want the maximum in tech innovation.' },
      { question: 'How durable is the LightSpray upper?', answer: 'The sprayed construction is less resistant to abrasion than traditional woven uppers. Most runners report 200–280 miles before the upper shows degradation, particularly at the big toe area.' },
    ],
  },
  // ── Saucony ───────────────────────────────────────────────────────────────
  {
    slug: 'saucony-endorphin-elite-3',
    aiResilienceScore: 53,
    aiMileageEstimate: 330,
    aiTargetUsage: 'Marathon & half-marathon racing',
    aiNarrative: `The Saucony Endorphin Elite 3 is Saucony's top marathon racing shoe, distinguished by its forked carbon plate — a split design that creates a wider, more stable contact surface compared to single-plate competitors. PWRRUN HG PEBA foam fills the 39.5 mm heel stack, delivering a compliant yet propulsive ride. At 7.2 oz with an 8 mm drop, the Elite 3 is accessible for a wide range of running styles and particularly benefits runners who experience foot instability or splaying in the final miles of a marathon. At $290, it's priced above most of its rivals, but the forked plate design and stability geometry justify the premium for runners who need what it offers.`,
    aiFaq: [
      { question: 'What is a forked carbon plate?', answer: 'Saucony\'s carbon plate splits at the midfoot into two prongs, creating a wider base than a single-plate design. This increases lateral stability underfoot — particularly useful for runners whose feet tend to splay or collapse at the arch during long efforts.' },
      { question: 'How does the Elite 3 compare to the Endorphin Pro 5?', answer: 'The Elite 3 uses PEBA (PWRRUN HG) foam; the Pro 5 uses standard PWRRUN+ foam. The Elite 3 is Saucony\'s most premium racing shoe with higher energy return and a more forgiving midsole depth.' },
      { question: 'Is the 8 mm drop good for marathon racing?', answer: 'The 8 mm drop is the most accessible drop angle for heel-strike runners, matching most daily training shoes. It makes the Elite 3 one of the easiest super-shoes to transition into without a long adaptation period.' },
      { question: 'How long does the Endorphin Elite 3 last?', answer: 'Approximately 300–380 miles — slightly more durable than Nike\'s ZoomX-based shoes according to most user reports, likely due to the PWRRUN HG foam compound.' },
    ],
  },
  // ── Puma ─────────────────────────────────────────────────────────────────
  {
    slug: 'puma-fast-r-nitro-elite-3',
    aiResilienceScore: 50,
    aiMileageEstimate: 300,
    aiTargetUsage: 'Marathon & half-marathon racing',
    aiNarrative: `The Puma Fast-R Nitro Elite 3 is Puma's flagship marathon super-shoe, featuring NITROFOAM Pro PEBA-class foam and a full-length PWRPlate carbon plate. At 7.8 oz with a 40 mm heel stack and 8 mm drop, it's one of the heavier 2026 super-shoes but compensates with a notably plush, cushioned ride and a traditional high-drop geometry that suits heel-strike runners well. The split-midsole design adds forefoot compliance that smooths the toe-off transition. At $280, it competes directly with the Brooks Hyperion Elite 5 and New Balance SuperComp Elite v5 in the "established brand, quality racer" segment. For runners in Puma's ecosystem or who prefer NITROFOAM's softer character, the Fast-R Nitro Elite 3 is a capable 2026 marathon choice.`,
    aiFaq: [
      { question: 'What is NITROFOAM Pro?', answer: 'Puma\'s proprietary nitrogen-infused foam — an updated compound in the Elite 3 with improved energy return. NITROFOAM Pro is Puma\'s PEBA-adjacent racing foam, delivering a soft but propulsive midsole character.' },
      { question: 'Is the Fast-R Nitro Elite 3 competitive with Nike and Adidas?', answer: 'It performs at an elite level but is 0.6–1.4 oz heavier than the Vaporfly 5 and Adios Pro 5. For Puma loyalists and runners who prefer the cushioned ride, it\'s a genuinely capable marathon shoe.' },
      { question: 'What does the split midsole design do?', answer: 'Puma\'s dual-density midsole design — a firmer heel section with a softer forefoot — provides a cushioned landing and a springy toe-off. It\'s different from the single-compound approach of Nike and Adidas.' },
    ],
  },
  // ── Salomon ───────────────────────────────────────────────────────────────
  {
    slug: 'salomon-s-lab-phantasm-2',
    aiResilienceScore: 56,
    aiMileageEstimate: 360,
    aiTargetUsage: 'Road marathon & half-marathon racing',
    aiNarrative: `The Salomon S/Lab Phantasm 2 is Salomon's road-racing super-shoe — the trail brand's serious entry into marathon competition. At 6.8 oz with a 36 mm heel stack and 4 mm drop, it's the most ground-feel of the 2026 super-shoe lineup. Energy Foam HD fills the midsole with PEBA-adjacent energy return, and a full-length carbon plate provides propulsion. At $240, the Phantasm 2 is the most affordable 2026 carbon marathon shoe in this comparison. Its lower stack and more direct feel suit faster runners who prefer a responsive, connected experience over maximum cushioning depth. Particularly popular with runners who also race trails and want a single technical shoe that works well on roads.`,
    aiFaq: [
      { question: 'Is the S/Lab Phantasm 2 as fast as Nike or Adidas super-shoes?', answer: 'Most testers rate it slightly behind the top-tier Vaporfly, Adios Pro 5 and Metaspeed Sky Tokyo on energy return metrics, but the difference is modest. At $240 it\'s the best-value carbon super-shoe in the 2026 lineup.' },
      { question: 'What is Energy Foam HD?', answer: 'Salomon\'s high-density PEBA-adjacent midsole foam, offering solid energy return with a slightly firmer character than Adidas Lightstrike Pro or Nike ZoomX. Contributes to the Phantasm 2\'s more ground-feel character.' },
      { question: 'Is the lower 36 mm stack a drawback for marathons?', answer: 'Some runners find the lower stack less cushioned in the final 10K of a marathon vs 39–40 mm competitors. Runners who prefer a more direct feel benefit from the lower stack\'s responsiveness.' },
      { question: 'Can the Phantasm 2 be used for trail running?', answer: 'No — it\'s a road-only racing shoe. For trail-to-road athletes, it works as a dedicated road racer alongside Salomon\'s trail racing lineup.' },
    ],
  },
  // ── Mizuno ────────────────────────────────────────────────────────────────
  {
    slug: 'mizuno-wave-rebellion-pro-4',
    aiResilienceScore: 52,
    aiMileageEstimate: 320,
    aiTargetUsage: 'Marathon & half-marathon racing',
    aiNarrative: `The Mizuno Wave Rebellion Pro 4 is Mizuno's top marathon super-shoe, featuring ENERZY NXT foam — the brand's highest energy-return compound to date — and a full-length carbon plate in a distinctive forward-rocker geometry. At 7.6 oz with a 39 mm heel stack and 5 mm drop, it's one of the heavier 2026 super-shoes but benefits from Mizuno's refined energy-return engineering. The Wave Rebellion geometry creates an aggressive forward lean throughout the gait cycle, particularly effective for runners who struggle to maintain form late in a marathon. At $250 it matches the Adios Pro 5 and Rocket X 3 on price. Best suited to Mizuno-loyal runners or those who prefer a pronounced forward rocker to compensate for form degradation.`,
    aiFaq: [
      { question: 'What is ENERZY NXT foam?', answer: 'Mizuno\'s highest-performance PEBA-adjacent foam compound, introduced in the Wave Rebellion Pro 3 and refined for the Pro 4. It offers competitive energy return with a slightly firmer landing character than Adidas or Nike foams.' },
      { question: 'What makes the Wave Rebellion Pro 4 different from other super-shoes?', answer: 'Mizuno\'s forward-rocker midsole geometry is more aggressive than most competitors, creating a pronounced forward lean throughout the gait cycle. This actively assists form maintenance late in a marathon.' },
      { question: 'Is the Pro 4 heavier than rivals?', answer: 'At 7.6 oz it\'s in the heavier end of the 2026 field — similar to the NB SuperComp Elite v5. Runners prioritising weight should look at the Vaporfly 5 (6.6 oz) or ASICS Sky Tokyo (6.5 oz).' },
    ],
  },
];

// ── Update runner ──────────────────────────────────────────────────────────

async function main() {
  console.log('=== Refreshing 2026 marathon shoe AI content ===\n');

  let updated = 0;
  let notFound = 0;

  for (const content of SHOE_CONTENT) {
    const result = await db
      .update(runningShoes)
      .set({
        aiNarrative: content.aiNarrative,
        aiFaq: content.aiFaq as any,
        aiResilienceScore: content.aiResilienceScore,
        aiMileageEstimate: content.aiMileageEstimate,
        aiTargetUsage: content.aiTargetUsage,
      })
      .where(eq(runningShoes.slug, content.slug))
      .returning({ slug: runningShoes.slug, brand: runningShoes.brand, model: runningShoes.model });

    if (result.length === 0) {
      console.log(`  ⚠  Not found: ${content.slug}`);
      notFound++;
    } else {
      console.log(`  ✓  Updated: ${result[0].brand} ${result[0].model}`);
      updated++;
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Updated  : ${updated}`);
  console.log(`Not found: ${notFound}`);
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
