export const bostonProfiles = {
  "adidas-adizero-boston-12": {
    sourceUrl: "https://www.runningwarehouse.com/Reviews/adidas-Shoe-Reviews/adidas-adizero-boston-12.html",
    weight: 9.1, heelStackHeight: 37.5, forefootStackHeight: 30.5, heelToToeDrop: 6.5,
    foam: "Lightstrike Pro + Lightstrike 2.0",
    support: "ENERGYRODS 2.0",
    fit: "Running Warehouse lists it as true to size. Try it with your workout socks and check heel hold at tempo pace.",
    use: "Tempo sessions and long runs with faster blocks",
  },
  "adidas-boston-13": {
    sourceUrl: "https://www.runningwarehouse.com/Reviews/adidas-Shoe-Reviews/adidas-adizero-boston-13.html",
    weight: 9.0, heelStackHeight: 37, forefootStackHeight: 30, heelToToeDrop: 7,
    foam: "Lightstrike Pro + Lightstrike",
    support: "Glass-fiber ENERGYRODS",
    fit: "Running Warehouse lists it as true to size. Its medium-width testers reported a secure midfoot; wider feet may need a try-on.",
    use: "Tempo runs, progression runs and long intervals",
  },
} as const;

export const bostonCheckedOn = "2026-11-14";

export function bostonProfile(slug?: string | null) {
  return slug && Object.hasOwn(bostonProfiles, slug) ? bostonProfiles[slug as keyof typeof bostonProfiles] : undefined;
}
