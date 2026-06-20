/**
 * Adds 2026 marathon super-shoe comparison pairs to the database.
 * Safe to re-run — skips any pairs that already exist.
 */
import { db } from '../server/db';
import { runningShoes, shoeComparisons } from '../shared/schema';
import { eq, inArray } from 'drizzle-orm';

// ── Types ──────────────────────────────────────────────────────────────────

type CompType = 'evolution' | 'category_rival' | 'popular';

interface KeyDiff { attribute: string; shoe1: string; shoe2: string }
interface BestFor { shoe1: string; shoe2: string }

interface CompSpec {
  slug1: string;
  slug2: string;
  type: CompType;
  title: string;
  metaDescription: string;
  verdict: string;
  winner: 'shoe1' | 'shoe2' | 'tie';
  winnerReason: string;
  keyDiffs: KeyDiff[];
  bestFor: BestFor;
}

// ── Comparison data ────────────────────────────────────────────────────────

const COMPARISONS: CompSpec[] = [
  // ── Intra-Nike ──────────────────────────────────────────────────────────
  {
    slug1: 'nike-vaporfly-5', slug2: 'nike-alphafly-4',
    type: 'category_rival',
    title: 'Nike Vaporfly 5 vs Nike Alphafly 4',
    metaDescription: 'Nike Vaporfly 5 vs Alphafly 4: which 2026 Nike super-shoe is right for you? Full specs, weight, stack height and marathon verdict.',
    verdict: 'Both are elite Nike marathon racers, but they serve different runners. The Vaporfly 5 is lighter (6.6 oz vs 7.2 oz), snappier, and easier to run in across all paces — it\'s the everyday race shoe in Nike\'s lineup. The Alphafly 4 doubles down on propulsion with twin Air Zoom pods under the forefoot and a 40 mm ZoomX stack, making it the most cushioned and energetic shoe Nike makes. If you want maximum ride and propulsion for a marathon PB attempt, the Alphafly 4 edges it out. For half-marathons, 10Ks or runners who prefer a nimbler feel, the Vaporfly 5 wins.',
    winner: 'shoe2',
    winnerReason: 'Alphafly 4 delivers greater propulsive energy return for the marathon distance',
    keyDiffs: [
      { attribute: 'Weight', shoe1: '6.6 oz (lighter)', shoe2: '7.2 oz' },
      { attribute: 'Heel stack', shoe1: '39 mm', shoe2: '40 mm' },
      { attribute: 'Drop', shoe1: '8 mm (more traditional)', shoe2: '4 mm (lower)' },
      { attribute: 'Air Zoom pods', shoe1: 'None', shoe2: 'Twin forefoot pods' },
      { attribute: 'Price', shoe1: '$260', shoe2: '$285' },
      { attribute: 'Best distance', shoe1: '5K–half marathon', shoe2: 'Marathon' },
    ],
    bestFor: { shoe1: 'Speedwork, half marathons, versatile racing', shoe2: 'Marathon PB attempts, maximum cushioning' },
  },
  // ── Nike Vaporfly 5 rivals ───────────────────────────────────────────────
  {
    slug1: 'nike-vaporfly-5', slug2: 'adidas-adizero-adios-pro-5',
    type: 'category_rival',
    title: 'Nike Vaporfly 5 vs Adidas Adizero Adios Pro 5',
    metaDescription: 'Nike Vaporfly 5 vs Adidas Adios Pro 5 for 2026: specs, stack height, weight and which super-shoe wins the marathon battle.',
    verdict: 'The two most popular marathon super-shoes of 2026 go head-to-head. The Vaporfly 5 is the lighter shoe (6.6 oz vs 7.2 oz) with a more traditional 8 mm drop that suits a heel-striker who wants a proven feel. The Adios Pro 5 runs with Energyrods 2.0 and Lightstrike Pro foam — a combination that some runners find delivers a stronger "push-forward" sensation. At $10 less, the Adidas is also better value. The race between these two is genuinely close: both test at similar energy-return percentages. Heel-strikers and runners used to Nike geometry tend to edge toward the Vaporfly; midfoot strikers who like Adidas\'s toe-rocker geometry prefer the Pro 5.',
    winner: 'tie',
    winnerReason: 'Both deliver elite-level energy return — choice comes down to strike pattern and brand feel',
    keyDiffs: [
      { attribute: 'Weight', shoe1: '6.6 oz (lighter)', shoe2: '7.2 oz' },
      { attribute: 'Drop', shoe1: '8 mm', shoe2: '6 mm' },
      { attribute: 'Midsole', shoe1: 'ZoomX (PEBA)', shoe2: 'Lightstrike Pro (PEBA-based)' },
      { attribute: 'Plate', shoe1: 'Single carbon', shoe2: 'Energyrods 2.0 (multi-rod carbon)' },
      { attribute: 'Price', shoe1: '$260', shoe2: '$250' },
    ],
    bestFor: { shoe1: 'Heel-strikers, runners who prefer Nike geometry', shoe2: 'Midfoot strikers, toe-rocker geometry fans' },
  },
  {
    slug1: 'nike-vaporfly-5', slug2: 'saucony-endorphin-elite-3',
    type: 'category_rival',
    title: 'Nike Vaporfly 5 vs Saucony Endorphin Elite 3',
    metaDescription: 'Nike Vaporfly 5 vs Saucony Endorphin Elite 3 (2026): weight, stack, forked carbon plate and marathon racing verdict.',
    verdict: 'The Vaporfly 5 and Endorphin Elite 3 are both sub-7 oz marathon racers with carbon plates, but they feel quite different underfoot. The Vaporfly 5 is noticeably lighter (6.6 oz vs 7.2 oz) and has the snappier, more direct ZoomX feel that Nike has refined over five iterations. The Endorphin Elite 3 counters with PWRRUN HG PEBA foam and Saucony\'s unique forked carbon plate geometry, which provides a wider, more stable base and a slightly cushier landing — appealing to runners who want race-day compliance without sacrificing pop. The Elite 3 costs $30 more. Overall, the Vaporfly 5 wins on pure weight and proven race-day credentials; the Elite 3 wins on comfort and stability at speed.',
    winner: 'shoe1',
    winnerReason: 'Vaporfly 5 is lighter, more proven, and slightly better at pure race performance',
    keyDiffs: [
      { attribute: 'Weight', shoe1: '6.6 oz (lighter)', shoe2: '7.2 oz' },
      { attribute: 'Heel stack', shoe1: '39 mm', shoe2: '39.5 mm' },
      { attribute: 'Drop', shoe1: '8 mm', shoe2: '8 mm (same)' },
      { attribute: 'Plate', shoe1: 'Single carbon', shoe2: 'Forked carbon (wider base)' },
      { attribute: 'Price', shoe1: '$260', shoe2: '$290' },
    ],
    bestFor: { shoe1: 'Runners prioritising pure speed and weight', shoe2: 'Runners wanting stability + cushion at race pace' },
  },
  {
    slug1: 'nike-vaporfly-5', slug2: 'hoka-rocket-x-3',
    type: 'category_rival',
    title: 'Nike Vaporfly 5 vs HOKA Rocket X 3',
    metaDescription: 'Nike Vaporfly 5 vs HOKA Rocket X 3 (2026): which carbon-plated marathon super-shoe should you race in?',
    verdict: 'The Vaporfly 5 and Rocket X 3 share nearly identical weight (6.6 vs 7.4 oz) and stack height (39 mm) but diverge in feel. Nike\'s ZoomX is the snappiest PEBA foam available, with a firm-yet-bouncy character. HOKA\'s PEBA-infused midsole in the Rocket X 3 is softer and more cushioned, with the meta-rocker geometry providing a pronounced roll-through. The Rocket X 3 suits runners with longer strides who want maximum cushioning in a race shoe; the Vaporfly 5 suits runners who want a crisper, more responsive ride at all race paces. At the same $250 price point (Vaporfly is $10 more), the Rocket X 3 is strong value.',
    winner: 'shoe1',
    winnerReason: 'Vaporfly 5 edges on responsiveness and proven marathon race records',
    keyDiffs: [
      { attribute: 'Weight', shoe1: '6.6 oz (lighter)', shoe2: '7.4 oz' },
      { attribute: 'Drop', shoe1: '8 mm', shoe2: '4 mm (lower, more cushioned ride)' },
      { attribute: 'Midsole character', shoe1: 'Firm-bouncy ZoomX', shoe2: 'Soft, cushioned PEBA' },
      { attribute: 'Rocker geometry', shoe1: 'Moderate', shoe2: 'Pronounced meta-rocker' },
      { attribute: 'Price', shoe1: '$260', shoe2: '$250' },
    ],
    bestFor: { shoe1: 'Crisp, responsive feel; sub-3hr marathon', shoe2: 'Cushioned long-distance ride; HOKA geometry fans' },
  },
  {
    slug1: 'nike-vaporfly-5', slug2: 'new-balance-fuelcell-supercomp-elite-v5',
    type: 'category_rival',
    title: 'Nike Vaporfly 5 vs New Balance FuelCell SuperComp Elite v5',
    metaDescription: 'Vaporfly 5 vs NB FuelCell SuperComp Elite v5 (2026): weight, stack, carbon plate and marathon super-shoe comparison.',
    verdict: 'The Vaporfly 5 is the lighter, more nimble option at 6.6 oz vs the v5\'s 7.6 oz — a meaningful 1 oz difference at marathon distance. The SuperComp Elite v5 counters with a 40 mm heel stack and PEBA-based FuelCell foam that many runners describe as the most cushioned ride in elite racing without sacrificing propulsion. The 4 mm drop of the NB also suits midfoot and forefoot strikers better than the Vaporfly\'s 8 mm. If you want the lightest possible shoe and are a proven heel-striker, the Vaporfly 5 is your pick. If you want a plush, bouncy ride with maximum stack, the v5 is worth the extra weight.',
    winner: 'shoe1',
    winnerReason: 'Vaporfly 5 wins on weight; v5 wins on cushion — Vaporfly takes the overall speed edge',
    keyDiffs: [
      { attribute: 'Weight', shoe1: '6.6 oz (lighter by 1 oz)', shoe2: '7.6 oz' },
      { attribute: 'Heel stack', shoe1: '39 mm', shoe2: '40 mm' },
      { attribute: 'Drop', shoe1: '8 mm', shoe2: '4 mm' },
      { attribute: 'Price', shoe1: '$260', shoe2: '$280' },
      { attribute: 'Cushioning feel', shoe1: 'Firm-bouncy', shoe2: 'Plush, maximal' },
    ],
    bestFor: { shoe1: 'Lighter feel, heel-strikers, sub-3 marathon target', shoe2: 'Maximum cushion, midfoot strikers, 100-mile training builds' },
  },
  {
    slug1: 'nike-vaporfly-5', slug2: 'asics-metaspeed-sky-tokyo',
    type: 'category_rival',
    title: 'Nike Vaporfly 5 vs ASICS Metaspeed Sky Tokyo',
    metaDescription: 'Nike Vaporfly 5 vs ASICS Metaspeed Sky Tokyo (2026): weight, FF Turbo Plus foam, drop and marathon racing comparison.',
    verdict: 'The Metaspeed Sky Tokyo is ASICS\'s top marathon racer for stride-length runners, featuring FF Turbo Plus PEBA foam and a full-length carbon plate. Against the Vaporfly 5, the ASICS is 0.1 oz heavier (6.5 vs 6.6 oz — essentially the same), matches on stack height (39.5 vs 39 mm), but costs $15 more ($275 vs $260). The key difference is geometry: the Sky Tokyo has a 5 mm drop versus the Vaporfly\'s 8 mm, which rewards a more midfoot-forward strike. For stride-length runners (fewer than 180 spm), the ASICS geometry is specifically optimised and can outperform the Vaporfly. For heel-strike–heavy runners, the Vaporfly 5 is the safer bet.',
    winner: 'tie',
    winnerReason: 'Nearly identical performance — stride type determines the winner',
    keyDiffs: [
      { attribute: 'Weight', shoe1: '6.6 oz', shoe2: '6.5 oz (slightly lighter)' },
      { attribute: 'Drop', shoe1: '8 mm (heel-strike friendly)', shoe2: '5 mm (midfoot-forward)' },
      { attribute: 'Heel stack', shoe1: '39 mm', shoe2: '39.5 mm' },
      { attribute: 'Plate geometry', shoe1: 'Full-length single carbon', shoe2: 'Full-length + stride-runner tuned' },
      { attribute: 'Price', shoe1: '$260', shoe2: '$275' },
    ],
    bestFor: { shoe1: 'Heel-strikers, runners familiar with Nike geometry', shoe2: 'Stride-length runners (<180 spm), ASICS-loyal athletes' },
  },
  // ── Nike Alphafly 4 rivals ───────────────────────────────────────────────
  {
    slug1: 'nike-alphafly-4', slug2: 'adidas-adizero-adios-pro-evo-3',
    type: 'category_rival',
    title: 'Nike Alphafly 4 vs Adidas Adizero Adios Pro Evo 3',
    metaDescription: 'Nike Alphafly 4 vs Adidas Adios Pro Evo 3 (2026): the two most extreme marathon super-shoes compared — specs, price and verdict.',
    verdict: 'These are the two most performance-focused shoes in the 2026 marathon super-shoe market. The Evo 3 at 3.4 oz is astonishingly light — less than half the Alphafly 4\'s 7.2 oz. It uses Energyrods 3.0 and a barely-there upper that pushes the boundaries of legality in some events. But the $500 price tag is steep and durability is extremely limited (100–150 miles). The Alphafly 4 at $285 is far more durable, adds twin Air Zoom pods for maximum propulsion, and suits a wider range of runners. For elite runners chasing an outright PB and willing to pay, the Evo 3 is the edge case weapon. For most competitive amateur marathoners, the Alphafly 4 delivers comparable results with far better value.',
    winner: 'shoe1',
    winnerReason: 'Alphafly 4 wins on durability and value; Evo 3 wins on raw weight only',
    keyDiffs: [
      { attribute: 'Weight', shoe1: '7.2 oz', shoe2: '3.4 oz — extraordinary' },
      { attribute: 'Drop', shoe1: '4 mm', shoe2: '3 mm' },
      { attribute: 'Price', shoe1: '$285', shoe2: '$500 (limited release)' },
      { attribute: 'Durability', shoe1: '300–400+ miles', shoe2: '100–150 miles' },
      { attribute: 'Propulsion system', shoe1: 'Twin Air Zoom + ZoomX', shoe2: 'Energyrods 3.0 + Lightstrike Pro' },
    ],
    bestFor: { shoe1: 'Competitive marathon runners needing durability and propulsion', shoe2: 'Elite racers, race-only wear, outright weight minimisation' },
  },
  {
    slug1: 'nike-alphafly-4', slug2: 'asics-metaspeed-sky-tokyo',
    type: 'category_rival',
    title: 'Nike Alphafly 4 vs ASICS Metaspeed Sky Tokyo',
    metaDescription: 'Nike Alphafly 4 vs ASICS Metaspeed Sky Tokyo 2026: propulsion platforms, stack heights and marathon racing verdict.',
    verdict: 'The Alphafly 4 and Metaspeed Sky Tokyo represent two very different philosophies for marathon propulsion. Nike relies on twin Air Zoom forefoot pods to add a spring-loaded "pop" on top of ZoomX foam; ASICS relies on FF Turbo Plus foam geometry and a full-length carbon plate tuned for stride-length runners. The Alphafly is 0.7 oz heavier (7.2 vs 6.5 oz) but feels more explosive underfoot due to the air pods. The ASICS has a 5 mm drop versus the Alphafly\'s 4 mm — similar geometry territory. For runners whose cadence runs below 180 spm, the Sky Tokyo\'s stride-optimised geometry can be faster; for everyone else the Alphafly 4 likely delivers more raw propulsion.',
    winner: 'shoe1',
    winnerReason: 'Alphafly 4 Air Zoom pods deliver the most propulsive feel available in 2026',
    keyDiffs: [
      { attribute: 'Weight', shoe1: '7.2 oz', shoe2: '6.5 oz (lighter)' },
      { attribute: 'Propulsion tech', shoe1: 'Twin Air Zoom pods + ZoomX', shoe2: 'FF Turbo Plus + stride-tuned plate' },
      { attribute: 'Drop', shoe1: '4 mm', shoe2: '5 mm' },
      { attribute: 'Price', shoe1: '$285', shoe2: '$275' },
    ],
    bestFor: { shoe1: 'Maximum propulsion, all-pace marathon racing', shoe2: 'Stride-length optimised runners (<180 spm)' },
  },
  {
    slug1: 'nike-alphafly-4', slug2: 'saucony-endorphin-elite-3',
    type: 'category_rival',
    title: 'Nike Alphafly 4 vs Saucony Endorphin Elite 3',
    metaDescription: 'Nike Alphafly 4 vs Saucony Endorphin Elite 3 2026: Air Zoom vs forked carbon, stack, weight, price marathon comparison.',
    verdict: 'Two very different approaches to the marathon super-shoe. The Alphafly 4 is Nike\'s most aggressive marathon weapon, using twin Air Zoom pods for explosive propulsion. The Endorphin Elite 3 uses a forked carbon plate for stability and PWRRUN HG PEBA for cushioning — a more conservative but highly capable setup. The Elite 3 is lighter (7.2 vs 7.2 oz — same), actually slightly cheaper at $290 vs $285 — close on price too. The key difference is feel: the Alphafly\'s pods create a distinct "pop," while the Elite 3 offers a smooth, stable roll that many runners prefer in the later stages of a marathon. Runners prone to late-race wobble benefit most from the Endorphin Elite\'s forked plate.',
    winner: 'shoe1',
    winnerReason: 'Alphafly 4 Air Zoom pods deliver more peak propulsion for most runners',
    keyDiffs: [
      { attribute: 'Weight', shoe1: '7.2 oz (same)', shoe2: '7.2 oz' },
      { attribute: 'Drop', shoe1: '4 mm', shoe2: '8 mm (more traditional)' },
      { attribute: 'Plate', shoe1: 'Single carbon + Air Zoom pods', shoe2: 'Forked carbon (wider, more stable)' },
      { attribute: 'Price', shoe1: '$285', shoe2: '$290' },
    ],
    bestFor: { shoe1: 'Maximum pop, aggressive marathon racing', shoe2: 'Late-race stability, runners who need a forgiving platform' },
  },
  {
    slug1: 'nike-alphafly-4', slug2: 'hoka-rocket-x-3',
    type: 'category_rival',
    title: 'Nike Alphafly 4 vs HOKA Rocket X 3',
    metaDescription: 'Nike Alphafly 4 vs HOKA Rocket X 3 2026: maximum cushion battle — Air Zoom pods vs PEBA meta-rocker for marathon racing.',
    verdict: 'Both the Alphafly 4 and Rocket X 3 sit at the cushioned end of the marathon super-shoe spectrum, but they achieve it differently. The Alphafly uses twin Air Zoom pods for a bouncy, propulsive feel on top of a 40 mm ZoomX stack. The Rocket X 3 uses HOKA\'s meta-rocker geometry and a 39 mm PEBA-infused midsole for a rolling, cushioned ride. The Alphafly is heavier (7.2 vs 7.4 oz — nearly identical) and $35 more expensive. The key differentiator is propulsion vs comfort: the Alphafly feels more explosive at race pace; the Rocket X 3 feels more effortless and sustainable over a four-plus hour marathon.',
    winner: 'shoe1',
    winnerReason: 'Alphafly 4 edges on peak propulsion; Rocket X 3 wins on sustainable long-run comfort',
    keyDiffs: [
      { attribute: 'Weight', shoe1: '7.2 oz', shoe2: '7.4 oz (similar)' },
      { attribute: 'Drop', shoe1: '4 mm (both low)', shoe2: '4 mm' },
      { attribute: 'Propulsion', shoe1: 'Twin Air Zoom pods', shoe2: 'Meta-rocker geometry' },
      { attribute: 'Price', shoe1: '$285', shoe2: '$250' },
      { attribute: 'Feel', shoe1: 'Explosive, bouncy', shoe2: 'Rolling, sustainable' },
    ],
    bestFor: { shoe1: 'Sub-3hr marathon, aggressive race-day feel', shoe2: 'Comfortable long-distance racing, 3–5hr marathon' },
  },
  // ── Adidas Adios Pro 5 rivals ────────────────────────────────────────────
  {
    slug1: 'adidas-adizero-adios-pro-5', slug2: 'asics-metaspeed-sky-tokyo',
    type: 'category_rival',
    title: 'Adidas Adizero Adios Pro 5 vs ASICS Metaspeed Sky Tokyo',
    metaDescription: 'Adidas Adios Pro 5 vs ASICS Metaspeed Sky Tokyo 2026: Lightstrike Pro vs FF Turbo Plus — which marathon super-shoe wins?',
    verdict: 'Both are elite PEBA-foam marathon racers from brands with multiple major marathon records to their name. The Adios Pro 5 (7.2 oz) is heavier than the Sky Tokyo (6.5 oz) but uses the Energyrods 2.0 system — multiple carbon rods rather than a single plate — for a wider propulsive contact patch. The Sky Tokyo\'s single full-length plate tuned for stride-length runners provides a more direct, stiffer feel. Both have similar heel stacks (39 vs 39.5 mm). ASICS is the lighter and marginally more expensive shoe ($275 vs $250). For runners with cadence below ~180 spm and longer strides, the ASICS wins. For midfoot-neutral runners, the Adidas\'s Energyrod propulsion system is highly competitive.',
    winner: 'shoe2',
    winnerReason: 'Sky Tokyo is lighter and optimised for stride-length runners who benefit most from its plate geometry',
    keyDiffs: [
      { attribute: 'Weight', shoe1: '7.2 oz', shoe2: '6.5 oz (lighter)' },
      { attribute: 'Drop', shoe1: '6 mm', shoe2: '5 mm' },
      { attribute: 'Plate system', shoe1: 'Energyrods 2.0 (multi-rod)', shoe2: 'Single full-length plate' },
      { attribute: 'Price', shoe1: '$250', shoe2: '$275' },
    ],
    bestFor: { shoe1: 'Neutral midfoot runners, Adidas loyalists', shoe2: 'Stride-length runners (<180 spm), ASICS loyalists' },
  },
  {
    slug1: 'adidas-adizero-adios-pro-5', slug2: 'saucony-endorphin-elite-3',
    type: 'category_rival',
    title: 'Adidas Adizero Adios Pro 5 vs Saucony Endorphin Elite 3',
    metaDescription: 'Adidas Adios Pro 5 vs Saucony Endorphin Elite 3 2026: Energyrods vs forked carbon plate — marathon super-shoe face-off.',
    verdict: 'Two 7.2 oz marathon super-shoes with different midsole philosophies. The Adidas pairs Lightstrike Pro foam with the Energyrods 2.0 multi-rod carbon system; Saucony uses PWRRUN HG PEBA with a distinctive forked carbon plate that provides a wider stable landing zone. Both offer similar heel stacks (39 vs 39.5 mm) and the same drop (8 mm for Saucony vs 6 mm for Adidas). The Adidas is $40 cheaper at $250. In practice, the Adidas has a more toe-rocker–forward feel while the Saucony offers more mid-stance stability. For heel–midfoot runners who want the best value, the Adidas Pro 5 edges it. For runners who need extra stability at race pace, the Endorphin Elite 3 is worth the premium.',
    winner: 'shoe1',
    winnerReason: 'Adidas Adios Pro 5 offers near-equivalent performance at a better price',
    keyDiffs: [
      { attribute: 'Weight', shoe1: '7.2 oz (same)', shoe2: '7.2 oz' },
      { attribute: 'Drop', shoe1: '6 mm', shoe2: '8 mm (more heel stack)' },
      { attribute: 'Plate', shoe1: 'Energyrods 2.0 (multi-rod)', shoe2: 'Forked carbon (stability-oriented)' },
      { attribute: 'Price', shoe1: '$250 (better value)', shoe2: '$290' },
    ],
    bestFor: { shoe1: 'Value-seeking competitive runners, toe-rocker stride', shoe2: 'Stability-needing runners, late-race form retention' },
  },
  {
    slug1: 'adidas-adizero-adios-pro-5', slug2: 'hoka-rocket-x-3',
    type: 'category_rival',
    title: 'Adidas Adizero Adios Pro 5 vs HOKA Rocket X 3',
    metaDescription: 'Adidas Adios Pro 5 vs HOKA Rocket X 3 (2026): Energyrods 2.0 vs PEBA meta-rocker — marathon super-shoe comparison.',
    verdict: 'The Adios Pro 5 and Rocket X 3 weigh within 0.2 oz of each other (7.2 vs 7.4 oz) but feel significantly different underfoot. The Adidas has a 6 mm drop and uses the Energyrods 2.0 rod system for a direct, propulsive push-off; the HOKA uses a 4 mm drop and pronounced meta-rocker for a smooth rolling transition. Both cost the same — Adidas at $250, HOKA at $250. The Adidas feels faster underfoot; the HOKA feels more sustainable. For races below the marathon, the Adidas is the pick. For runners whose form deteriorates in the final 10K of a marathon, the HOKA\'s automatic roll-through helps maintain pace without effort.',
    winner: 'tie',
    winnerReason: 'Same price, similar weight — race distance and stride preference determine the winner',
    keyDiffs: [
      { attribute: 'Weight', shoe1: '7.2 oz', shoe2: '7.4 oz' },
      { attribute: 'Drop', shoe1: '6 mm', shoe2: '4 mm' },
      { attribute: 'Plate', shoe1: 'Energyrods 2.0', shoe2: 'Single carbon' },
      { attribute: 'Rocker', shoe1: 'Moderate', shoe2: 'Pronounced meta-rocker' },
      { attribute: 'Price', shoe1: '$250', shoe2: '$250' },
    ],
    bestFor: { shoe1: 'Direct propulsive feel, half-marathon to marathon', shoe2: 'Effortless roll-through, sustained marathon pacing' },
  },
  {
    slug1: 'adidas-adizero-adios-pro-5', slug2: 'new-balance-fuelcell-supercomp-elite-v5',
    type: 'category_rival',
    title: 'Adidas Adizero Adios Pro 5 vs New Balance FuelCell SuperComp Elite v5',
    metaDescription: 'Adidas Adios Pro 5 vs NB FuelCell SuperComp Elite v5 (2026): Energyrods 2.0 vs PEBA FuelCell — complete marathon super-shoe comparison.',
    verdict: 'The Adios Pro 5 is lighter (7.2 oz vs 7.6 oz), cheaper ($250 vs $280), and has a 6 mm drop compared to the NB\'s 4 mm. The FuelCell SuperComp Elite v5 offers a 40 mm heel stack — the tallest in this comparison — and PEBA-based FuelCell foam that delivers an exceptionally bouncy, cushioned ride. The NB platform suits runners who want maximum underfoot material at the expense of a small weight penalty. For most competitive runners aiming to go fast in the marathon, the Adios Pro 5\'s combination of weight, price, and Energyrods propulsion gives a slight edge. The v5 is the pick for runners doing high-mileage training in race shoes or racing a course with significant downhill.',
    winner: 'shoe1',
    winnerReason: 'Adios Pro 5 wins on weight and price; v5 wins on cushion depth',
    keyDiffs: [
      { attribute: 'Weight', shoe1: '7.2 oz (lighter)', shoe2: '7.6 oz' },
      { attribute: 'Heel stack', shoe1: '39 mm', shoe2: '40 mm (tallest here)' },
      { attribute: 'Drop', shoe1: '6 mm', shoe2: '4 mm' },
      { attribute: 'Price', shoe1: '$250 (better value)', shoe2: '$280' },
    ],
    bestFor: { shoe1: 'Weight-conscious racers, sub-3:30 marathoners', shoe2: 'Maximum cushion, downhill courses, training-in-racers' },
  },
  // ── ASICS Metaspeed Sky Tokyo rivals ─────────────────────────────────────
  {
    slug1: 'asics-metaspeed-sky-tokyo', slug2: 'asics-metaspeed-edge-tokyo',
    type: 'category_rival',
    title: 'ASICS Metaspeed Sky Tokyo vs Metaspeed Edge Tokyo',
    metaDescription: 'ASICS Metaspeed Sky Tokyo vs Edge Tokyo 2026: stride runners vs cadence runners — which ASICS super-shoe is right for you?',
    verdict: 'ASICS makes this decision simple: the Sky Tokyo is built for stride-length runners (fewer ground contacts per minute, longer strides) and the Edge Tokyo is built for cadence runners (higher turnover, shorter strides). Both use FF Turbo Plus PEBA foam and cost $275. The Sky Tokyo has a slightly higher heel stack (39.5 mm vs 39 mm) and softer cushioning character. The Edge Tokyo is tuned with a stiffer plate geometry to snap the foot through quickly at high cadence. Practically, if you run below ~180 steps per minute, choose the Sky Tokyo. Above 185 spm, choose the Edge Tokyo. If you\'re between 180–185 spm, test both — the difference is subtle.',
    winner: 'tie',
    winnerReason: 'Sky Tokyo for stride runners; Edge Tokyo for cadence runners — both are equally capable',
    keyDiffs: [
      { attribute: 'Target runner', shoe1: 'Stride-length (< 180 spm)', shoe2: 'Cadence (> 185 spm)' },
      { attribute: 'Heel stack', shoe1: '39.5 mm', shoe2: '39 mm' },
      { attribute: 'Cushioning', shoe1: 'Softer, more compliant', shoe2: 'Firmer, snappier plate' },
      { attribute: 'Weight', shoe1: '6.5 oz', shoe2: '6.6 oz (same class)' },
      { attribute: 'Price', shoe1: '$275', shoe2: '$275' },
    ],
    bestFor: { shoe1: 'Long-striding marathon runners, < 180 spm', shoe2: 'High-cadence runners, > 185 spm' },
  },
  {
    slug1: 'asics-metaspeed-sky-tokyo', slug2: 'saucony-endorphin-elite-3',
    type: 'category_rival',
    title: 'ASICS Metaspeed Sky Tokyo vs Saucony Endorphin Elite 3',
    metaDescription: 'ASICS Metaspeed Sky Tokyo vs Saucony Endorphin Elite 3 2026: FF Turbo Plus vs PWRRUN HG marathon super-shoe comparison.',
    verdict: 'The Sky Tokyo (6.5 oz) is noticeably lighter than the Endorphin Elite 3 (7.2 oz) — a 0.7 oz advantage that matters over 26.2 miles. Both use PEBA-based foams (FF Turbo Plus vs PWRRUN HG) and both have aggressive carbon-plate systems. The Sky Tokyo costs $15 less ($275 vs $290). The Saucony\'s forked carbon plate gives a wider base and more stability underfoot, which runners with wider feet or prone to late-race foot splay often prefer. For stride-length runners who fit the ASICS geometry, the Sky Tokyo has a clear performance edge. For runners who need stability with race-level performance, the Elite 3 is the more forgiving choice.',
    winner: 'shoe1',
    winnerReason: 'Sky Tokyo is 0.7 oz lighter and cheaper — weight advantage wins at marathon distance',
    keyDiffs: [
      { attribute: 'Weight', shoe1: '6.5 oz (lighter)', shoe2: '7.2 oz' },
      { attribute: 'Drop', shoe1: '5 mm', shoe2: '8 mm' },
      { attribute: 'Plate', shoe1: 'Full-length, stride-tuned', shoe2: 'Forked (wider, more stable)' },
      { attribute: 'Price', shoe1: '$275', shoe2: '$290' },
    ],
    bestFor: { shoe1: 'Stride-length runners, lighter weight priority', shoe2: 'Stability-seeking runners, wider feet, late-race form' },
  },
  {
    slug1: 'asics-metaspeed-sky-tokyo', slug2: 'hoka-rocket-x-3',
    type: 'category_rival',
    title: 'ASICS Metaspeed Sky Tokyo vs HOKA Rocket X 3',
    metaDescription: 'ASICS Metaspeed Sky Tokyo vs HOKA Rocket X 3 2026: FF Turbo Plus vs PEBA meta-rocker — marathon super-shoe face-off.',
    verdict: 'The Sky Tokyo at 6.5 oz is nearly a full ounce lighter than the Rocket X 3 (7.4 oz) and $25 more expensive ($275 vs $250). The ASICS is tuned for stride runners with a 5 mm drop and full-length plate; the HOKA uses its signature meta-rocker with a 4 mm drop to produce a rolling, effortless gait cycle. These shoes suit fundamentally different runners: if you\'re a strider who wants a direct, efficient race shoe, the Sky Tokyo is likely the faster option. If you want a cushioned, forgiving marathon shoe that does the work of pacing for you via its rocker, the Rocket X 3 is extremely capable.',
    winner: 'shoe1',
    winnerReason: 'Sky Tokyo lighter and more efficient for stride runners — Rocket X 3 preferred for cushion-first approach',
    keyDiffs: [
      { attribute: 'Weight', shoe1: '6.5 oz (lighter)', shoe2: '7.4 oz' },
      { attribute: 'Drop', shoe1: '5 mm', shoe2: '4 mm' },
      { attribute: 'Rocker', shoe1: 'Moderate', shoe2: 'Pronounced meta-rocker' },
      { attribute: 'Price', shoe1: '$275', shoe2: '$250' },
    ],
    bestFor: { shoe1: 'Stride runners, technical road courses, sub-3hr', shoe2: 'Cushion-first racing, rolling courses, 3–4:30hr marathon' },
  },
  // ── Saucony Endorphin Elite 3 rivals ────────────────────────────────────
  {
    slug1: 'saucony-endorphin-elite-3', slug2: 'hoka-rocket-x-3',
    type: 'category_rival',
    title: 'Saucony Endorphin Elite 3 vs HOKA Rocket X 3',
    metaDescription: 'Saucony Endorphin Elite 3 vs HOKA Rocket X 3 2026: forked carbon vs meta-rocker PEBA marathon super-shoe comparison.',
    verdict: 'Both the Endorphin Elite 3 and Rocket X 3 sit at the cushioned end of 2026 marathon racing, but they get there differently. The Elite 3 uses PWRRUN HG PEBA foam and a forked carbon plate — providing a stable, bouncy platform. The Rocket X 3 uses PEBA-infused foam and HOKA\'s meta-rocker for an automatic roll-through. The Elite 3 is lighter (7.2 vs 7.4 oz) and $40 more expensive ($290 vs $250). The Saucony has more of a "traditional racing shoe" feel with active propulsion; the HOKA has more of an "effortless forward motion" feel. For runners who want to feel their power at the push-off, the Elite 3 wins. For runners who want the shoe to do the work, the Rocket X 3 is outstanding value.',
    winner: 'shoe2',
    winnerReason: 'Rocket X 3 is $40 cheaper with near-identical performance for most runners',
    keyDiffs: [
      { attribute: 'Weight', shoe1: '7.2 oz (lighter)', shoe2: '7.4 oz' },
      { attribute: 'Drop', shoe1: '8 mm', shoe2: '4 mm' },
      { attribute: 'Plate', shoe1: 'Forked carbon', shoe2: 'Single carbon + meta-rocker' },
      { attribute: 'Price', shoe1: '$290', shoe2: '$250 (better value)' },
    ],
    bestFor: { shoe1: 'Active push-off feel, traditional race shoe experience', shoe2: 'Effortless roll-through, $40 better value' },
  },
  {
    slug1: 'saucony-endorphin-elite-3', slug2: 'new-balance-fuelcell-supercomp-elite-v5',
    type: 'category_rival',
    title: 'Saucony Endorphin Elite 3 vs New Balance FuelCell SuperComp Elite v5',
    metaDescription: 'Saucony Endorphin Elite 3 vs New Balance FuelCell SuperComp Elite v5 2026: PWRRUN HG vs PEBA FuelCell marathon super-shoe comparison.',
    verdict: 'Two cushion-forward marathon racers with near-identical weights (7.2 vs 7.6 oz) and prices ($290 vs $280). The Endorphin Elite 3 has a lower heel stack (39.5 vs 40 mm) and an 8 mm drop identical to most traditional trainers, making the transition to race day smooth. The SuperComp Elite v5 has a 4 mm drop and PEBA FuelCell foam widely described as the "bounciest ride" in the NB lineup. For runners who prefer a more familiar high-drop feel with race-level performance, the Elite 3 wins. For runners who want the most cushioned, lively ride regardless of drop transition, the v5 is exceptional.',
    winner: 'tie',
    winnerReason: 'Essentially matched — drop preference and brand familiarity decide',
    keyDiffs: [
      { attribute: 'Weight', shoe1: '7.2 oz', shoe2: '7.6 oz' },
      { attribute: 'Drop', shoe1: '8 mm (high, familiar)', shoe2: '4 mm (low, rocker-friendly)' },
      { attribute: 'Heel stack', shoe1: '39.5 mm', shoe2: '40 mm (slightly taller)' },
      { attribute: 'Price', shoe1: '$290', shoe2: '$280' },
    ],
    bestFor: { shoe1: 'Runners transitioning from traditional trainers, 8mm drop preference', shoe2: 'Low-drop runners wanting maximum stack bounce' },
  },
  // ── Brooks Hyperion Elite 5 rivals ──────────────────────────────────────
  {
    slug1: 'brooks-hyperion-elite-5', slug2: 'saucony-endorphin-elite-3',
    type: 'category_rival',
    title: 'Brooks Hyperion Elite 5 vs Saucony Endorphin Elite 3',
    metaDescription: 'Brooks Hyperion Elite 5 vs Saucony Endorphin Elite 3 2026: SpeedVault Race+ vs PWRRUN HG — marathon super-shoe comparison.',
    verdict: 'Two 8 mm drop marathon racers with full-length carbon plates and PEBA-class foams — these shoes have more in common than they differ. The Hyperion Elite 5 uses Brooks SpeedVault Race+ PEBA and weighs 7.4 oz; the Endorphin Elite 3 uses PWRRUN HG PEBA at 7.2 oz. Both cost the same ($250 vs $290 — wait, Brooks is $250, Saucony is $290, so Brooks wins on price by $40 for essentially the same category). The Saucony\'s forked plate provides a subtly wider stable base. The Brooks has a more traditional single-carbon feel. For most runners, the Brooks at $250 is the better value pick in this head-to-head. For runners needing the Saucony\'s stability geometry, the $40 premium is justified.',
    winner: 'shoe1',
    winnerReason: 'Brooks Hyperion Elite 5 is $40 cheaper for near-equivalent marathon performance',
    keyDiffs: [
      { attribute: 'Weight', shoe1: '7.4 oz', shoe2: '7.2 oz (lighter)' },
      { attribute: 'Drop', shoe1: '8 mm', shoe2: '8 mm (same)' },
      { attribute: 'Plate', shoe1: 'Full-length single carbon', shoe2: 'Forked carbon (wider base)' },
      { attribute: 'Price', shoe1: '$250 (better value)', shoe2: '$290' },
    ],
    bestFor: { shoe1: 'Value-seeking competitive runners, straightforward race day', shoe2: 'Stability-needing runners, wider-foot runners' },
  },
  {
    slug1: 'brooks-hyperion-elite-5', slug2: 'nike-vaporfly-5',
    type: 'category_rival',
    title: 'Brooks Hyperion Elite 5 vs Nike Vaporfly 5',
    metaDescription: 'Brooks Hyperion Elite 5 vs Nike Vaporfly 5 2026: SpeedVault Race+ PEBA vs ZoomX — which is the better marathon racing shoe?',
    verdict: 'The Vaporfly 5 is the lighter shoe (6.6 vs 7.4 oz) and has the more proven race-day pedigree of the two — five generations of the world\'s most-worn marathon super-shoe. The Hyperion Elite 5 counters with SpeedVault Race+ PEBA foam and a full-length carbon plate at $10 less ($250 vs $260). The Vaporfly\'s ZoomX foam is marginally snappier; the Hyperion Elite has a slightly more cushioned feel. For runners loyal to neither brand, the Vaporfly 5\'s weight advantage and proven race records tip the balance in its favour. For Brooks runners who want to stay in the ecosystem while going to a super-shoe, the HE5 is an excellent choice.',
    winner: 'shoe2',
    winnerReason: 'Vaporfly 5 is lighter and has more proven marathon race day credentials',
    keyDiffs: [
      { attribute: 'Weight', shoe1: '7.4 oz', shoe2: '6.6 oz (lighter)' },
      { attribute: 'Drop', shoe1: '8 mm (same)', shoe2: '8 mm' },
      { attribute: 'Midsole', shoe1: 'SpeedVault Race+ PEBA', shoe2: 'ZoomX PEBA' },
      { attribute: 'Price', shoe1: '$250 (cheaper)', shoe2: '$260' },
    ],
    bestFor: { shoe1: 'Brooks-loyal runners, value-conscious racing', shoe2: 'Pure speed, lightest possible race shoe' },
  },
  // ── On Cloudboom Strike LS rivals ────────────────────────────────────────
  {
    slug1: 'on-cloudboom-strike-ls', slug2: 'nike-vaporfly-5',
    type: 'category_rival',
    title: 'On Cloudboom Strike LS vs Nike Vaporfly 5',
    metaDescription: 'On Cloudboom Strike LS vs Nike Vaporfly 5 2026: LightSpray robotically-sprayed upper vs Flyknit — which marathon super-shoe wins?',
    verdict: 'The Cloudboom Strike LS is the most unusual shoe in this comparison. Its upper is robotically sprayed onto a last — no seams, no traditional construction — which helps explain its 6 oz weight and $330 price tag. The Vaporfly 5 at $260 is $70 less, weighs 0.6 oz more (6.6 oz), and has a more conventional feel. The Cloudboom Strike LS has the highest forefoot stack in the 2026 super-shoe market (43 mm heel / 39 mm forefoot) with a 4 mm drop — very different geometry from the Vaporfly\'s 8 mm drop. Both have carbon plates. The Cloudboom is an exceptional shoe for runners who want cutting-edge design and a very low-to-ground forward feel; the Vaporfly is the proven, versatile choice for the rest.',
    winner: 'shoe2',
    winnerReason: 'Vaporfly 5 wins on value and broader applicability; Cloudboom Strike LS wins on innovation and ultra-low drop geometry',
    keyDiffs: [
      { attribute: 'Weight', shoe1: '6 oz (lightest here)', shoe2: '6.6 oz' },
      { attribute: 'Drop', shoe1: '4 mm', shoe2: '8 mm' },
      { attribute: 'Heel stack', shoe1: '43 mm (tallest here)', shoe2: '39 mm' },
      { attribute: 'Upper', shoe1: 'LightSpray (robotically sprayed)', shoe2: 'Flyknit' },
      { attribute: 'Price', shoe1: '$330', shoe2: '$260' },
    ],
    bestFor: { shoe1: 'Midfoot/forefoot runners, low-drop, tech-forward gear', shoe2: 'All-round marathon racing, proven heel-to-midfoot geometry' },
  },
  {
    slug1: 'on-cloudboom-strike-ls', slug2: 'adidas-adizero-adios-pro-5',
    type: 'category_rival',
    title: 'On Cloudboom Strike LS vs Adidas Adizero Adios Pro 5',
    metaDescription: 'On Cloudboom Strike LS vs Adidas Adizero Adios Pro 5 2026: LightSpray technology vs Energyrods 2.0 — which marathon super-shoe should you choose?',
    verdict: 'The Cloudboom Strike LS is 1.2 oz lighter than the Adios Pro 5 (6 vs 7.2 oz) and has an 80 mm taller heel stack (43 vs 39 mm) — making it the more cushioned and lighter option on paper. But at $330 vs $250, it\'s $80 more expensive. The Adidas uses Energyrods 2.0 with a 6 mm drop; the On uses a single carbon plate with a 4 mm drop. Adidas\'s Energyrods have a well-documented forward-push feel; the Cloudboom Strike LS delivers a high-stack, low-drop glide. For runners with the budget, the Cloudboom Strike LS is a cutting-edge race day weapon. For value-focused competitive runners, the Adios Pro 5 delivers excellent results at $80 less.',
    winner: 'shoe2',
    winnerReason: 'Adios Pro 5 offers 90% of the performance at $80 less and better durability',
    keyDiffs: [
      { attribute: 'Weight', shoe1: '6 oz (lighter)', shoe2: '7.2 oz' },
      { attribute: 'Heel stack', shoe1: '43 mm (taller)', shoe2: '39 mm' },
      { attribute: 'Drop', shoe1: '4 mm', shoe2: '6 mm' },
      { attribute: 'Price', shoe1: '$330', shoe2: '$250 (better value)' },
      { attribute: 'Upper', shoe1: 'LightSpray (seamless)', shoe2: 'Traditional engineered mesh' },
    ],
    bestFor: { shoe1: 'Tech enthusiasts, midfoot runners, budget unlimited', shoe2: 'Value-focused racers, Energyrods feel, wider size range' },
  },
  // ── Version progressions ────────────────────────────────────────────────
  {
    slug1: 'nike-vaporfly-4', slug2: 'nike-vaporfly-5',
    type: 'evolution',
    title: 'Nike Vaporfly 4 vs Nike Vaporfly 5',
    metaDescription: 'Nike Vaporfly 4 vs Vaporfly 5 (2025 vs 2026): what changed? Weight, stack height, upper, carbon plate upgrade comparison.',
    verdict: 'The Vaporfly 5 refines the v4 rather than reinventing it. The headline changes are a lighter, more breathable Flyknit upper and marginal adjustments to the ZoomX foam geometry for better energy return. The v4 drops from 6.7 oz to 6.6 oz in the v5 — a modest but real improvement. Stack height moves from 32 mm (v4 heel) to 39 mm — this is the largest change, significantly increasing the cushioning and stack. If you race in the v4, upgrading to the v5 gives you a noticeably taller, more cushioned platform for the same race-day responsiveness. At $260, the v5 is the same price as the v4 was.',
    winner: 'shoe2',
    winnerReason: 'Vaporfly 5 is lighter, more cushioned, and has a refined upper over the v4',
    keyDiffs: [
      { attribute: 'Weight', shoe1: '6.7 oz', shoe2: '6.6 oz (lighter)' },
      { attribute: 'Heel stack', shoe1: '32 mm', shoe2: '39 mm (significantly more cushion)' },
      { attribute: 'Year', shoe1: '2025', shoe2: '2026' },
    ],
    bestFor: { shoe1: 'Runners happy with the proven v4 fit and feel', shoe2: 'Anyone seeking the latest refinement and more cushion' },
  },
  {
    slug1: 'nike-alphafly-3', slug2: 'nike-alphafly-4',
    type: 'evolution',
    title: 'Nike Alphafly 3 vs Nike Alphafly 4',
    metaDescription: 'Nike Alphafly 3 vs Alphafly 4 (2024 vs 2026): what changed between generations? Weight, Air Zoom pods, stack comparison.',
    verdict: 'The Alphafly 4 is meaningfully lighter than the 3 (7.2 vs 7.0 oz — very close) with the same 40 mm heel stack and 4 mm drop carried over. The biggest change is a refined ZoomX midsole geometry and upgraded Flyknit upper. The Air Zoom twin-pod system persists and remains the defining feature of this line. The Alphafly 3 at this point can often be found discounted, making it an attractive option — but the 4\'s fit and foam refinements make it the recommended choice for anyone buying new.',
    winner: 'shoe2',
    winnerReason: 'Alphafly 4 refines the v3 with improved upper, foam geometry and slightly better fit',
    keyDiffs: [
      { attribute: 'Weight', shoe1: '7.0 oz', shoe2: '7.2 oz (marginally heavier)' },
      { attribute: 'Stack', shoe1: '40 mm heel', shoe2: '40 mm heel (unchanged)' },
      { attribute: 'Year', shoe1: '2024', shoe2: '2026' },
      { attribute: 'Upper', shoe1: 'Previous Flyknit', shoe2: 'Refined Flyknit (better breathability)' },
    ],
    bestFor: { shoe1: 'Discounted option for budget-conscious Alphafly fans', shoe2: 'Latest generation, best fit and feel refinements' },
  },
  {
    slug1: 'saucony-endorphin-elite-2', slug2: 'saucony-endorphin-elite-3',
    type: 'evolution',
    title: 'Saucony Endorphin Elite 2 vs Endorphin Elite 3',
    metaDescription: 'Saucony Endorphin Elite 2 vs Elite 3 (2025 vs 2026): what changed? PWRRUN HG foam, forked carbon plate and weight comparison.',
    verdict: 'The Endorphin Elite 3 makes meaningful improvements over the v2. Most notably, it sheds 0.2 oz (7.0 to 7.2 — wait, it\'s 0.2 heavier actually: 7.0 → 7.2 oz), but gains a significantly refined forked carbon plate geometry and improved PWRRUN HG PEBA foam. The upper has been updated with better ventilation. The stack height stays consistent at around 39.5 mm heel. If you raced in the Elite 2, the v3 will feel familiar but more polished — particularly in the midfoot transition where the forked plate now provides a more stable, locked-in sensation.',
    winner: 'shoe2',
    winnerReason: 'Endorphin Elite 3 refines the plate geometry and foam for a more polished race experience',
    keyDiffs: [
      { attribute: 'Weight', shoe1: '7.0 oz', shoe2: '7.2 oz (marginally heavier)' },
      { attribute: 'Heel stack', shoe1: '~39 mm', shoe2: '39.5 mm' },
      { attribute: 'Year', shoe1: '2025', shoe2: '2026' },
      { attribute: 'Plate', shoe1: 'Forked carbon', shoe2: 'Refined forked carbon (improved geometry)' },
    ],
    bestFor: { shoe1: 'Runners who liked the v2 and want a proven, discounted option', shoe2: 'Latest refinement, improved midfoot transition and upper' },
  },
  {
    slug1: 'new-balance-fuelcell-supercomp-elite-v4', slug2: 'new-balance-fuelcell-supercomp-elite-v5',
    type: 'evolution',
    title: 'New Balance FuelCell SuperComp Elite v4 vs v5',
    metaDescription: 'New Balance FuelCell SuperComp Elite v4 vs v5 (2024 vs 2026): what improved? PEBA foam, stack height and marathon performance.',
    verdict: 'The SuperComp Elite v5 brings a 40 mm heel stack (up from 39.5 mm in the v4) and a refined carbon plate geometry. Weight stays comparable at 7.6 oz vs 7.0 oz (v4 was slightly lighter). The PEBA-based FuelCell foam has been improved in the v5 for better energy return per compression cycle. The drop changes from 8 mm in the v4 to 4 mm in the v5 — a significant shift that will require an adaptation period for heel-strike–dominant runners used to the v4 geometry. If you\'re a v4 user, try the v5 in training before race day.',
    winner: 'shoe2',
    winnerReason: 'v5 improves stack, foam quality and carbon geometry — a clear upgrade',
    keyDiffs: [
      { attribute: 'Weight', shoe1: '7.0 oz', shoe2: '7.6 oz (slightly heavier)' },
      { attribute: 'Heel stack', shoe1: '39.5 mm', shoe2: '40 mm' },
      { attribute: 'Drop', shoe1: '8 mm', shoe2: '4 mm (major change)' },
      { attribute: 'Year', shoe1: '2024', shoe2: '2026' },
    ],
    bestFor: { shoe1: 'High-drop runners not ready to transition, discounted option', shoe2: 'Latest NB tech, low-drop runners, maximum PEBA cushion' },
  },
  {
    slug1: 'hoka-rocket-x-2', slug2: 'hoka-rocket-x-3',
    type: 'evolution',
    title: 'HOKA Rocket X 2 vs Rocket X 3',
    metaDescription: 'HOKA Rocket X 2 vs Rocket X 3 (2023 vs 2026): what changed between generations? PEBA foam upgrade, weight, stack comparison.',
    verdict: 'The Rocket X 3 is a significant upgrade over the v2. The headline change is the introduction of PEBA-infused foam, replacing the v2\'s earlier-generation midsole compound. The result is a noticeably livelier, more propulsive ride that puts the Rocket X 3 in direct competition with the Nike Vaporfly and Adidas Adios Pro 5 on energy return metrics. Weight stays similar (7.4 oz for both). The v3 also debuts a refined meta-rocker geometry for a more aggressive forward roll. If you race in the Rocket X 2, the v3 is a meaningful performance upgrade worth experiencing.',
    winner: 'shoe2',
    winnerReason: 'Rocket X 3 introduces PEBA foam — a generation-defining improvement over the v2',
    keyDiffs: [
      { attribute: 'Foam', shoe1: 'Earlier HOKA compound', shoe2: 'PEBA-infused (major upgrade)' },
      { attribute: 'Weight', shoe1: '7.4 oz (same)', shoe2: '7.4 oz' },
      { attribute: 'Heel stack', shoe1: '39 mm', shoe2: '39 mm (unchanged)' },
      { attribute: 'Year', shoe1: '2023', shoe2: '2026' },
    ],
    bestFor: { shoe1: 'Runners happy with existing v2 fit, looking for a discounted option', shoe2: 'Any HOKA racer — PEBA foam is a definitive upgrade' },
  },
  {
    slug1: 'adidas-adizero-adios-pro-4', slug2: 'adidas-adizero-adios-pro-5',
    type: 'evolution',
    title: 'Adidas Adizero Adios Pro 4 vs Adios Pro 5',
    metaDescription: 'Adidas Adios Pro 4 vs Adios Pro 5 (2025 vs 2026): Energyrods upgrade, stack height and weight — what changed?',
    verdict: 'The Adios Pro 5 improves on the v4 in several key areas. The Energyrods 2.0 system is stiffer and more precisely tuned for the updated heel stack (39 mm vs 32 mm in the v4 — a major increase in cushioning depth). Weight is stable (7.2 vs 7.1 oz — essentially the same). The upper is lighter and more breathable. The heel stack jump from 32 mm to 39 mm is the most impactful change, bringing the Pro 5 into the same cushioning territory as the Nike Vaporfly 5 and HOKA Rocket X 3. Runners in the Pro 4 should transition to the 5 — it\'s a more competitive shoe against the 2026 field.',
    winner: 'shoe2',
    winnerReason: 'Pro 5 significantly increases stack height and improves Energyrods — clear upgrade',
    keyDiffs: [
      { attribute: 'Heel stack', shoe1: '32 mm', shoe2: '39 mm (major increase)' },
      { attribute: 'Weight', shoe1: '7.1 oz', shoe2: '7.2 oz (same class)' },
      { attribute: 'Energyrods', shoe1: 'Energyrods (v1)', shoe2: 'Energyrods 2.0 (stiffer, refined)' },
      { attribute: 'Year', shoe1: '2025', shoe2: '2026' },
    ],
    bestFor: { shoe1: 'Runners who found the Pro 4 stack sufficient, looking for discount', shoe2: 'Any Adidas racer — full-stack upgrade with Pro 5' },
  },
  {
    slug1: 'adidas-adizero-adios-pro-evo-2', slug2: 'adidas-adizero-adios-pro-evo-3',
    type: 'evolution',
    title: 'Adidas Adizero Adios Pro Evo 2 vs Evo 3',
    metaDescription: 'Adidas Adios Pro Evo 2 vs Evo 3 (2025 vs 2026): Energyrods 3.0 upgrade, weight change and ultra-lightweight marathon comparison.',
    verdict: 'The Evo 3 takes ultra-lightweight marathon racing to its extreme. At 3.4 oz (down from 4.9 oz in the Evo 2), it\'s almost unbelievably light for a carbon-plated, full-stack marathon shoe. The Energyrods 3.0 system is stiffer and more refined than the Evo 2\'s rods. Both are limited-edition, single-race shoes with very short durability windows (100–150 miles). The Evo 3 is $500, up from the Evo 2\'s price. The weight drop from 4.9 to 3.4 oz is the Evo line\'s defining achievement. For elite runners who can afford the price and single-race usage model, the Evo 3 is the fastest Adidas product available.',
    winner: 'shoe2',
    winnerReason: 'Evo 3 drops 1.5 oz and upgrades to Energyrods 3.0 — a significant performance improvement',
    keyDiffs: [
      { attribute: 'Weight', shoe1: '4.9 oz', shoe2: '3.4 oz (extraordinary reduction)' },
      { attribute: 'Drop', shoe1: '3 mm', shoe2: '3 mm (unchanged)' },
      { attribute: 'Energyrods', shoe1: 'Energyrods 2.0', shoe2: 'Energyrods 3.0 (stiffer)' },
      { attribute: 'Year', shoe1: '2025', shoe2: '2026' },
    ],
    bestFor: { shoe1: 'Elite runners seeking Evo-line performance at lower price', shoe2: 'Outright speed maximisers, race-only use, budget not a concern' },
  },
  // ── Evo vs standard Adios comparison ────────────────────────────────────
  {
    slug1: 'adidas-adizero-adios-pro-5', slug2: 'adidas-adizero-adios-pro-evo-3',
    type: 'category_rival',
    title: 'Adidas Adizero Adios Pro 5 vs Adios Pro Evo 3',
    metaDescription: 'Adidas Adios Pro 5 vs Adios Pro Evo 3 (2026): which Adidas marathon super-shoe should you choose? Durability, weight and price compared.',
    verdict: 'The Adios Pro Evo 3 is for elite runners who want the absolute lightest carbon-plated marathon shoe available — period. At 3.4 oz vs 7.2 oz for the standard Pro 5, it weighs less than half. But the Evo 3 costs $500 vs $250 and lasts only 100–150 miles; the Pro 5 is a full-season training and racing shoe. For most competitive amateur marathoners, the Pro 5 is the correct choice: it delivers Adidas\'s Energyrods 2.0 and Lightstrike Pro at a price that makes sense, with durability that supports a full marathon build. The Evo 3 is reserved for elite-level athletes for whom every gram matters and single-race usage is acceptable.',
    winner: 'shoe1',
    winnerReason: 'Pro 5 wins for almost all runners — better durability, value, and accessible performance',
    keyDiffs: [
      { attribute: 'Weight', shoe1: '7.2 oz (durable)', shoe2: '3.4 oz (ultra-light, single-race)' },
      { attribute: 'Price', shoe1: '$250', shoe2: '$500' },
      { attribute: 'Durability', shoe1: '300–400+ miles', shoe2: '100–150 miles' },
      { attribute: 'Energyrods', shoe1: 'Energyrods 2.0', shoe2: 'Energyrods 3.0 (more aggressive)' },
      { attribute: 'Upper', shoe1: 'Standard mesh', shoe2: 'Bare-minimum racing upper' },
    ],
    bestFor: { shoe1: 'Most competitive runners — race + training dual-use possible', shoe2: 'Elite athletes, race-day only, every gram matters' },
  },
];

// ── Insert logic ───────────────────────────────────────────────────────────

async function main() {
  console.log('=== 2026 Marathon Shoe Comparisons Update ===\n');

  // Load all slugs needed
  const allSlugs = [...new Set(COMPARISONS.flatMap(c => [c.slug1, c.slug2]))];
  const shoes = await db.select({ id: runningShoes.id, slug: runningShoes.slug, brand: runningShoes.brand, model: runningShoes.model })
    .from(runningShoes)
    .where(inArray(runningShoes.slug, allSlugs));

  const slugToShoe = new Map(shoes.map(s => [s.slug, s]));

  // Check which slugs are missing from DB
  const missing = allSlugs.filter(s => !slugToShoe.has(s));
  if (missing.length > 0) {
    console.warn('⚠  These shoe slugs were not found in the DB:', missing);
  }

  // Load existing comparison slugs to avoid duplicates
  const existingComps = await db.select({ slug: shoeComparisons.slug }).from(shoeComparisons);
  const existingSlugs = new Set(existingComps.map(c => c.slug));

  let inserted = 0;
  let skipped = 0;

  for (const spec of COMPARISONS) {
    const shoe1 = slugToShoe.get(spec.slug1);
    const shoe2 = slugToShoe.get(spec.slug2);

    if (!shoe1 || !shoe2) {
      console.log(`  ⚠  Skipping "${spec.slug1} vs ${spec.slug2}" — shoe(s) not found in DB`);
      skipped++;
      continue;
    }

    const compSlug = `${spec.slug1}-vs-${spec.slug2}`;
    const reverseSlug = `${spec.slug2}-vs-${spec.slug1}`;

    if (existingSlugs.has(compSlug) || existingSlugs.has(reverseSlug)) {
      console.log(`  → Already exists: ${compSlug}`);
      skipped++;
      continue;
    }

    await db.insert(shoeComparisons).values({
      slug: compSlug,
      shoe1Id: shoe1.id,
      shoe2Id: shoe2.id,
      comparisonType: spec.type,
      title: spec.title,
      metaDescription: spec.metaDescription,
      verdict: spec.verdict,
      verdictWinner: spec.winner,
      verdictReason: spec.winnerReason,
      keyDifferences: JSON.stringify(spec.keyDiffs),
      bestFor: JSON.stringify(spec.bestFor),
    });

    console.log(`  ✓  Added: ${shoe1.brand} ${shoe1.model} vs ${shoe2.brand} ${shoe2.model}`);
    inserted++;
  }

  console.log(`\n=== Done ===`);
  console.log(`Inserted : ${inserted}`);
  console.log(`Skipped  : ${skipped} (already existed or shoe not found)`);
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
