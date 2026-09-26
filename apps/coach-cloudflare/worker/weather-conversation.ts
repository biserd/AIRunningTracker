// Short-lived conversation continuity, not an account location preference.
// Only caller-scoped, server-loaded user messages may supply a city. Assistant
// text, running data and old conversations must never establish one.
export type ConversationTurn = { role: string; content: string; created_at?: number };
const weatherTopic = /\b(weather|forecast|rain|raining|rainy|temperature|wind|windy|snow|sunny)\b/i;
const followup = /\b(tomorrow|today|tonight|morning|afternoon|evening|weekend|later|there|instead|actually|how about|what about|\d{1,2}\s*(?:am|pm))\b/i;
const cityOnly = (value: string) => {
  const city = value.trim().replace(/[?!.]+$/, '').trim();
  if (!/^[\p{L}][\p{L}\s,.'’-]{1,99}$/u.test(city) || city.split(/\s+/).length > 8 ||
      /\b(and|or|my|home|here|there|location|run|runs|running|plan|training|shoes|shoe|tomorrow|today|tonight|morning|afternoon|evening|weekend|later|yes|no|thanks|please|forecast|weather|rain|wind|temperature)\b/i.test(city)) return undefined;
  return city;
};
function cityInWeatherQuestion(text: string) {
  if (!weatherTopic.test(text)) return undefined;
  const match = text.match(/\b(?:in|for|at|near)\s+([\p{L}][\p{L}\s,.'’-]*)/iu);
  if (!match) return undefined;
  return cityOnly(match[1].split(/\b(?:today|tomorrow|tonight|this|next|on|at|for|during|around|please)\b/i)[0]);
}
export function conversationWeatherCity(message: string, history: readonly ConversationTurn[] = [], now = Date.now()) {
  const current = cityInWeatherQuestion(message);
  if (current) return current;
  let city: string | undefined, previousAssistant = '';
  for (const turn of history.slice(-12)) {
    if (typeof turn.created_at !== 'number' || turn.created_at * 1000 < now - 2 * 60 * 60 * 1000 || turn.created_at * 1000 > now + 60_000) {
      city = undefined; previousAssistant = ''; continue;
    }
    if (turn.role === 'assistant') { previousAssistant = turn.content; continue; }
    if (turn.role !== 'user') continue;
    const named = cityInWeatherQuestion(turn.content);
    const corrected = city && /^(?:actually|instead|what about|how about)\b/i.test(turn.content)
      ? cityOnly(turn.content.replace(/^(?:actually|instead|what about|how about)[,\s]+/i, '')) : undefined;
    const answeredCity = /\b(which|what) city|city and region/i.test(previousAssistant) ? cityOnly(turn.content) : undefined;
    if (named || corrected || answeredCity) city = named || corrected || answeredCity;
    else if (!weatherTopic.test(turn.content) && !followup.test(turn.content)) city = undefined;
    previousAssistant = '';
  }
  if (!city) return undefined;
  const corrected = /^(?:actually|instead|what about|how about)\b/i.test(message)
    ? cityOnly(message.replace(/^(?:actually|instead|what about|how about)[,\s]+/i, '')) : undefined;
  if (corrected) return corrected;
  // An explicit but unparseable/ambiguous new place must not reuse the old city.
  if (/\b(?:in|near)\s+\p{L}/iu.test(message)) return undefined;
  return weatherTopic.test(message) || followup.test(message) ? city : undefined;
}
