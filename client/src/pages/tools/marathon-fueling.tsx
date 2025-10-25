import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'wouter';
import { ArrowLeft, Zap, Droplets, Calculator, AlertTriangle, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import {
  GEL_CATALOG,
  GUT_TRAINING_PRESETS,
  SODIUM_PRESETS,
  calculateFeedingEvents,
  calculateFuelingPlan,
  optimizeFuelingPlan,
  formatTimeDisplay,
  type FuelingInputs,
  type FeedingEvent,
  type FuelingPlan,
  type GelProduct
} from '@/lib/fuelingCalculator';

export default function MarathonFuelingPlanner() {
  const { isAuthenticated } = useAuth();
  // Input state
  const [finishHours, setFinishHours] = useState('4');
  const [finishMinutes, setFinishMinutes] = useState('00');
  const [feedingInterval, setFeedingInterval] = useState('30');
  const [firstGelTime, setFirstGelTime] = useState('30');
  const [lastGelCutoff, setLastGelCutoff] = useState('15');
  const [preStartGel, setPreStartGel] = useState(true);
  
  const [carbTarget, setCarbTarget] = useState('80');
  const [carbPreset, setCarbPreset] = useState('80');
  const [useCustomCarb, setUseCustomCarb] = useState(false);
  
  const [sodiumTarget, setSodiumTarget] = useState('500');
  const [sodiumPreset, setSodiumPreset] = useState('500');
  const [useCustomSodium, setUseCustomSodium] = useState(false);
  
  const [drinkVolume, setDrinkVolume] = useState('500');
  const [drinkSodium, setDrinkSodium] = useState('1000');
  const [drinkCarbs, setDrinkCarbs] = useState('0');

  // Plan state
  const [feedingEvents, setFeedingEvents] = useState<FeedingEvent[]>([]);
  const [plan, setPlan] = useState<FuelingPlan | null>(null);

  // Regenerate feeding schedule when schedule parameters change
  useEffect(() => {
    const inputs: FuelingInputs = {
      finishTimeMinutes: parseInt(finishHours) * 60 + parseInt(finishMinutes),
      feedingIntervalMinutes: parseInt(feedingInterval),
      firstGelMinutes: parseInt(firstGelTime),
      lastGelCutoffMinutes: parseInt(lastGelCutoff),
      preStartGel,
      carbTargetPerHour: parseInt(useCustomCarb ? carbTarget : carbPreset),
      sodiumTargetPerHour: parseInt(useCustomSodium ? sodiumTarget : sodiumPreset),
      drinkVolumePerHour: parseInt(drinkVolume),
      drinkSodiumPerLiter: parseInt(drinkSodium),
      drinkCarbsPerLiter: parseInt(drinkCarbs)
    };

    const events = calculateFeedingEvents(inputs);
    setFeedingEvents(events);
  }, [finishHours, finishMinutes, feedingInterval, firstGelTime, lastGelCutoff, preStartGel]);

  // Recalculate plan whenever feedingEvents or nutrition targets change
  useEffect(() => {
    const inputs: FuelingInputs = {
      finishTimeMinutes: parseInt(finishHours) * 60 + parseInt(finishMinutes),
      feedingIntervalMinutes: parseInt(feedingInterval),
      firstGelMinutes: parseInt(firstGelTime),
      lastGelCutoffMinutes: parseInt(lastGelCutoff),
      preStartGel,
      carbTargetPerHour: parseInt(useCustomCarb ? carbTarget : carbPreset),
      sodiumTargetPerHour: parseInt(useCustomSodium ? sodiumTarget : sodiumPreset),
      drinkVolumePerHour: parseInt(drinkVolume),
      drinkSodiumPerLiter: parseInt(drinkSodium),
      drinkCarbsPerLiter: parseInt(drinkCarbs)
    };

    const calculatedPlan = calculateFuelingPlan(inputs, feedingEvents);
    setPlan(calculatedPlan);
  }, [feedingEvents, carbTarget, carbPreset, useCustomCarb, sodiumTarget, sodiumPreset, useCustomSodium,
      drinkVolume, drinkSodium, drinkCarbs, finishHours, finishMinutes, feedingInterval, 
      firstGelTime, lastGelCutoff, preStartGel]);

  const handleOptimize = () => {
    const inputs: FuelingInputs = {
      finishTimeMinutes: parseInt(finishHours) * 60 + parseInt(finishMinutes),
      feedingIntervalMinutes: parseInt(feedingInterval),
      firstGelMinutes: parseInt(firstGelTime),
      lastGelCutoffMinutes: parseInt(lastGelCutoff),
      preStartGel,
      carbTargetPerHour: parseInt(useCustomCarb ? carbTarget : carbPreset),
      sodiumTargetPerHour: parseInt(useCustomSodium ? sodiumTarget : sodiumPreset),
      drinkVolumePerHour: parseInt(drinkVolume),
      drinkSodiumPerLiter: parseInt(drinkSodium),
      drinkCarbsPerLiter: parseInt(drinkCarbs)
    };

    const optimized = optimizeFuelingPlan(inputs, feedingEvents);
    setFeedingEvents(optimized);
  };

  const updateGelAtEvent = (index: number, gelId: string) => {
    const updated = [...feedingEvents];
    updated[index] = { ...updated[index], gelId };
    setFeedingEvents(updated);
  };

  const getGaugeColor = (actual: number, target: number, type: 'carbs' | 'sodium') => {
    const percentage = (actual / target) * 100;
    if (type === 'carbs') {
      if (percentage < 85) return 'bg-red-500';
      if (percentage > 110) return 'bg-yellow-500';
      return 'bg-green-500';
    } else {
      if (percentage < 70) return 'bg-red-500';
      if (percentage < 90) return 'bg-yellow-500';
      return 'bg-green-500';
    }
  };

  return (
    <>
      <Helmet>
        <title>Marathon Fueling Planner - Calculate Your Race Nutrition Strategy | RunAnalytics</title>
        <meta name="description" content="Free marathon fueling calculator. Plan your race nutrition strategy with optimal gel timing, carb intake, and electrolyte balance. Get personalized feeding schedules based on your finish time and gut capacity." />
        <meta property="og:title" content="Marathon Fueling Planner - Race Nutrition Calculator" />
        <meta property="og:description" content="Calculate optimal race fueling strategy. Plan gel timing, carb targets, and sodium intake for marathon success. Free tool for all runners." />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <Link href="/tools">
              <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back-tools">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Tools
              </Button>
            </Link>
            <h1 className="text-4xl font-bold mb-3" data-testid="text-page-title">Marathon Fueling Planner</h1>
            <p className="text-xl text-muted-foreground" data-testid="text-page-description">
              Calculate your optimal race nutrition strategy with precise gel timing and fueling targets
            </p>
          </div>

          {/* CTA for non-authenticated users */}
          {!isAuthenticated && (
            <Card className="mb-6 bg-gradient-to-r from-strava-orange/10 to-strava-orange/5 border-strava-orange/20" data-testid="card-signup-cta">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-6 h-6 text-strava-orange flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg mb-1">Want More Running Tools & AI Insights?</h3>
                      <p className="text-sm text-muted-foreground">
                        Create a free account to access AI-powered training insights, race predictions, and personalized coaching - plus auto-import your Strava activities for instant analysis.
                      </p>
                    </div>
                  </div>
                  <Link href="/auth">
                    <Button className="bg-strava-orange text-white hover:bg-strava-orange/90 whitespace-nowrap" data-testid="button-signup-cta">
                      Get Started Free
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Inputs */}
            <div className="lg:col-span-1 space-y-6">
              {/* Race Time */}
              <Card data-testid="card-race-time">
                <CardHeader>
                  <CardTitle className="text-lg">Race Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="finish-time">Projected Finish Time</Label>
                    <div className="flex gap-2 mt-2">
                      <div className="flex-1">
                        <Input
                          id="finish-hours"
                          type="number"
                          min="2"
                          max="8"
                          value={finishHours}
                          onChange={(e) => setFinishHours(e.target.value)}
                          placeholder="Hours"
                          data-testid="input-finish-hours"
                        />
                        <span className="text-xs text-muted-foreground">Hours</span>
                      </div>
                      <div className="flex-1">
                        <Input
                          id="finish-minutes"
                          type="number"
                          min="0"
                          max="59"
                          value={finishMinutes}
                          onChange={(e) => setFinishMinutes(e.target.value)}
                          placeholder="Minutes"
                          data-testid="input-finish-minutes"
                        />
                        <span className="text-xs text-muted-foreground">Minutes</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="feeding-interval">Feeding Interval (minutes)</Label>
                    <Input
                      id="feeding-interval"
                      type="number"
                      min="20"
                      max="45"
                      value={feedingInterval}
                      onChange={(e) => setFeedingInterval(e.target.value)}
                      className="mt-2"
                      data-testid="input-feeding-interval"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Typical: 25-35 minutes</p>
                  </div>

                  <div>
                    <Label htmlFor="first-gel">First Gel At (minutes)</Label>
                    <Input
                      id="first-gel"
                      type="number"
                      min="15"
                      max="60"
                      value={firstGelTime}
                      onChange={(e) => setFirstGelTime(e.target.value)}
                      className="mt-2"
                      data-testid="input-first-gel"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cutoff">Last Gel Cutoff (minutes before finish)</Label>
                    <Input
                      id="cutoff"
                      type="number"
                      min="0"
                      max="30"
                      value={lastGelCutoff}
                      onChange={(e) => setLastGelCutoff(e.target.value)}
                      className="mt-2"
                      data-testid="input-cutoff"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="pre-start">Pre-Start Gel (10 min before)</Label>
                    <Switch
                      id="pre-start"
                      checked={preStartGel}
                      onCheckedChange={setPreStartGel}
                      data-testid="switch-pre-start"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Nutrition Targets */}
              <Card data-testid="card-nutrition-targets">
                <CardHeader>
                  <CardTitle className="text-lg">Nutrition Targets</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Carb Target (g/h)</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Custom</span>
                        <Switch
                          checked={useCustomCarb}
                          onCheckedChange={setUseCustomCarb}
                          data-testid="switch-custom-carb"
                        />
                      </div>
                    </div>
                    {!useCustomCarb ? (
                      <Select value={carbPreset} onValueChange={setCarbPreset}>
                        <SelectTrigger data-testid="select-carb-preset">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GUT_TRAINING_PRESETS.map(preset => (
                            <SelectItem key={preset.value} value={preset.value.toString()}>
                              {preset.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type="number"
                        min="40"
                        max="140"
                        value={carbTarget}
                        onChange={(e) => setCarbTarget(e.target.value)}
                        data-testid="input-carb-custom"
                      />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Sodium Target (mg/h)</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Custom</span>
                        <Switch
                          checked={useCustomSodium}
                          onCheckedChange={setUseCustomSodium}
                          data-testid="switch-custom-sodium"
                        />
                      </div>
                    </div>
                    {!useCustomSodium ? (
                      <Select value={sodiumPreset} onValueChange={setSodiumPreset}>
                        <SelectTrigger data-testid="select-sodium-preset">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SODIUM_PRESETS.map(preset => (
                            <SelectItem key={preset.value} value={preset.value.toString()}>
                              {preset.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type="number"
                        min="200"
                        max="1200"
                        value={sodiumTarget}
                        onChange={(e) => setSodiumTarget(e.target.value)}
                        data-testid="input-sodium-custom"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Drink Strategy */}
              <Card data-testid="card-drink-strategy">
                <CardHeader>
                  <CardTitle className="text-lg">Drink Strategy</CardTitle>
                  <CardDescription>Hydration and electrolytes from drinks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="drink-volume">Volume Per Hour (ml)</Label>
                    <Input
                      id="drink-volume"
                      type="number"
                      min="0"
                      max="1000"
                      value={drinkVolume}
                      onChange={(e) => setDrinkVolume(e.target.value)}
                      className="mt-2"
                      data-testid="input-drink-volume"
                    />
                  </div>

                  <div>
                    <Label htmlFor="drink-sodium">Sodium Concentration (mg/L)</Label>
                    <Input
                      id="drink-sodium"
                      type="number"
                      min="0"
                      max="2000"
                      value={drinkSodium}
                      onChange={(e) => setDrinkSodium(e.target.value)}
                      className="mt-2"
                      data-testid="input-drink-sodium"
                    />
                  </div>

                  <div>
                    <Label htmlFor="drink-carbs">Carbs in Drink (g/L)</Label>
                    <Input
                      id="drink-carbs"
                      type="number"
                      min="0"
                      max="100"
                      value={drinkCarbs}
                      onChange={(e) => setDrinkCarbs(e.target.value)}
                      className="mt-2"
                      data-testid="input-drink-carbs"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Optional: 0-60 g/L typical</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Results */}
            <div className="lg:col-span-2 space-y-6">
              {/* Gauges */}
              {plan && (
                <div className="grid md:grid-cols-2 gap-4">
                  <Card data-testid="card-carb-gauge">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Zap className="w-5 h-5" />
                          Carbohydrates
                        </CardTitle>
                        <span className="text-2xl font-bold" data-testid="text-carb-rate">
                          {Math.round(plan.carbsPerHour)} g/h
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Target: {useCustomCarb ? carbTarget : carbPreset} g/h</span>
                          <span data-testid="text-carb-percentage">
                            {Math.round((plan.carbsPerHour / parseInt(useCustomCarb ? carbTarget : carbPreset)) * 100)}%
                          </span>
                        </div>
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${getGaugeColor(plan.carbsPerHour, parseInt(useCustomCarb ? carbTarget : carbPreset), 'carbs')}`}
                            style={{ width: `${Math.min(100, (plan.carbsPerHour / parseInt(useCustomCarb ? carbTarget : carbPreset)) * 100)}%` }}
                            data-testid="gauge-carb-bar"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Total: {Math.round(plan.totalCarbs)}g over race
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card data-testid="card-sodium-gauge">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Droplets className="w-5 h-5" />
                          Sodium
                        </CardTitle>
                        <span className="text-2xl font-bold" data-testid="text-sodium-rate">
                          {Math.round(plan.sodiumPerHour)} mg/h
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Target: {useCustomSodium ? sodiumTarget : sodiumPreset} mg/h</span>
                          <span data-testid="text-sodium-percentage">
                            {Math.round((plan.sodiumPerHour / parseInt(useCustomSodium ? sodiumTarget : sodiumPreset)) * 100)}%
                          </span>
                        </div>
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${getGaugeColor(plan.sodiumPerHour, parseInt(useCustomSodium ? sodiumTarget : sodiumPreset), 'sodium')}`}
                            style={{ width: `${Math.min(100, (plan.sodiumPerHour / parseInt(useCustomSodium ? sodiumTarget : sodiumPreset)) * 100)}%` }}
                            data-testid="gauge-sodium-bar"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Total: {Math.round(plan.totalSodium)}mg over race
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Warnings */}
              {plan && plan.warnings.length > 0 && (
                <Card className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20" data-testid="card-warnings">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                      <AlertTriangle className="w-5 h-5" />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {plan.warnings.map((warning, index) => (
                        <li key={index} className="text-sm" data-testid={`text-warning-${index}`}>
                          • {warning}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Feeding Timeline */}
              <Card data-testid="card-timeline">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Feeding Schedule</CardTitle>
                      <CardDescription>
                        {feedingEvents.length} total gels • Tap to change gel brand
                      </CardDescription>
                    </div>
                    <Button onClick={handleOptimize} className="bg-strava-orange text-white hover:bg-strava-orange/90" size="sm" data-testid="button-optimize">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Optimize
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {feedingEvents.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No feeding events. Adjust your race time or settings.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {feedingEvents.map((event, index) => {
                        const gel = GEL_CATALOG.find(g => g.id === event.gelId);
                        return (
                          <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg" data-testid={`event-${index}`}>
                            <div className="flex-shrink-0 w-16 font-mono font-semibold">
                              {event.timeDisplay}
                            </div>
                            <div className="flex-1">
                              <Select value={event.gelId} onValueChange={(value) => updateGelAtEvent(index, value)}>
                                <SelectTrigger className="h-auto py-2" data-testid={`select-gel-${index}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {GEL_CATALOG.map(g => (
                                    <SelectItem key={g.id} value={g.id}>
                                      <div className="flex flex-col">
                                        <span className="font-medium">{g.brand} {g.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {g.carbsPerGel}g carbs • {g.sodiumPerGel}mg sodium
                                          {g.caffeinePerGel > 0 && ` • ${g.caffeinePerGel}mg caffeine`}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {event.isPreStart && (
                              <span className="text-xs bg-blue-500/20 text-blue-700 dark:text-blue-400 px-2 py-1 rounded">
                                Pre-Start
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Shopping List */}
              {plan && plan.gelBreakdown.length > 0 && (
                <Card data-testid="card-shopping-list">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5" />
                      Shopping List
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {plan.gelBreakdown.map((item, index) => (
                        <div key={index} className="flex justify-between items-center" data-testid={`shopping-item-${index}`}>
                          <div>
                            <p className="font-medium">{item.gel.brand} {item.gel.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.gel.carbsPerGel}g carbs • {item.gel.sodiumPerGel}mg sodium per gel
                            </p>
                          </div>
                          <span className="text-xl font-bold">{item.count}×</span>
                        </div>
                      ))}
                      <Separator />
                      <div className="pt-2">
                        <p className="font-medium">Drink Requirements</p>
                        <p className="text-sm text-muted-foreground">
                          {Math.round((parseInt(drinkVolume) * (parseInt(finishHours) * 60 + parseInt(finishMinutes))) / 60)} ml total
                          ({drinkVolume} ml/h @ {drinkSodium} mg/L sodium)
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Educational Content */}
          <Card className="mt-8" data-testid="card-education">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                How to Use This Calculator
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <h3>Getting Started</h3>
              <ol>
                <li><strong>Enter your projected finish time</strong> - Be realistic based on training</li>
                <li><strong>Set your nutrition targets</strong> - Use presets or customize based on your gut training</li>
                <li><strong>Configure drink strategy</strong> - Plan your hydration and electrolyte intake</li>
                <li><strong>Review the timeline</strong> - See exactly when to take each gel</li>
                <li><strong>Click "Optimize"</strong> - Let the calculator suggest the best gel combination</li>
              </ol>

              <h3>Understanding the Gauges</h3>
              <ul>
                <li><strong className="text-green-600">Green</strong>: You're hitting your targets perfectly</li>
                <li><strong className="text-yellow-600">Yellow</strong>: Slightly over target (manageable but watch GI distress)</li>
                <li><strong className="text-red-600">Red</strong>: Under target (risk of bonking) or way over (GI issues likely)</li>
              </ul>

              <h3>Key Principles</h3>
              <ul>
                <li><strong>Feeding interval matters</strong>: 30 min = ~2 gels/hour. Shorter intervals = more gels = higher carb intake</li>
                <li><strong>Gut training is essential</strong>: Don't try 100g/h in a race if you haven't trained for it</li>
                <li><strong>Balance gels + drinks</strong>: Gels for carbs, drinks for hydration and sodium</li>
                <li><strong>Test in training</strong>: Never try a new fueling strategy on race day</li>
              </ul>

              <h3>Common Strategies</h3>
              <p><strong>4-hour marathoner (80g/h target)</strong>: Use 40g gels every 30 min = 8 gels total = 320g carbs. Add caffeine gels in final hour.</p>
              <p><strong>5-hour marathoner (60g/h target)</strong>: Mix 25g and 40g gels every 30 min = 9-10 gels = 300g carbs. Higher sodium in drinks.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
