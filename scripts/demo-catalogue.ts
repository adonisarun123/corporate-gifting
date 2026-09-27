/**
 * DEMO catalogue data for preview/local environments. Synthetic vendors, real-looking products,
 * Unsplash photography (free commercial licence; replace with owned media before launch).
 * No unsupported claim wording (eco-friendly, food safe, BIS certified…) — content.ts rejects it.
 */
export const U = (id: string, w = 1200, h = 900) => `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&q=80&auto=format`;

export type DemoVendorKey = "alpha" | "beta" | "gamma";

export interface DemoProduct {
  key: string;
  vendor: DemoVendorKey;
  category: string;
  terms: string[];
  name: string;
  summary: string;
  description: string;
  benefits: string[];
  suitability: string;
  specs: Array<{ name: string; value: string; unit?: string }>;
  branding: string[];
  brandingNotes?: string;
  limitations?: string;
  care?: string;
  faqs?: Array<{ question: string; answer: string }>;
  variants: Array<{ label: string; sku: string; options: Record<string, unknown> }>;
  images: Array<{ id: string; alt: string }>;
  offer: { moq: number; inc: number; lead: [number, number]; costRupees: number; mode?: "ready_stock" | "made_to_order" | "mixed"; stock?: number; staleDays?: number; setupRupees?: number };
  price: { mode: "from" | "indicative" | "request_quote"; tiers: Array<[qty: number, rupees: number]> };
}

const laser = ["laser_engraving"];
const print = ["screen_print"];

export const DEMO_PRODUCTS: DemoProduct[] = [
  /* ---------------- Drinkware ---------------- */
  { key: "bottle-matte", vendor: "alpha", category: "drinkware", terms: ["employees", "new-joiners", "onboarding", "employee-recognition"],
    name: "Matte Insulated Steel Bottle 750 ml", summary: "Double-wall vacuum-insulated 750 ml bottle in a soft-touch matte finish with a wide engraving panel.",
    description: "A 750 ml double-wall vacuum-insulated stainless steel bottle with a powder-coated matte finish. Keeps drinks cold for around 24 hours and hot for around 12. Leak-resistant screw cap with a carry loop. The body offers a single 60 × 30 mm engraving panel that reads cleanly in a contrasting tone.",
    benefits: ["24 h cold / 12 h hot insulation", "Soft-touch matte finish resists fingerprints", "Leak-resistant cap with carry loop"], suitability: "New joiners and employees who commute; a strong anchor item for welcome kits.",
    specs: [{ name: "Capacity", value: "750", unit: "ml" }, { name: "Material", value: "Stainless steel 304" }, { name: "Weight", value: "330", unit: "g" }, { name: "Packaging", value: "Individual kraft box" }], branding: laser, brandingNotes: "Single-position engraving up to 60 × 30 mm; name personalisation quoted per unit.",
    limitations: "Not suitable for carbonated drinks.", care: "Hand wash; do not microwave.",
    faqs: [{ question: "Can we engrave individual names?", answer: "Yes. Name personalisation is quoted per unit and adds about two working days." }],
    variants: [{ label: "Forest green", sku: "GRN-750", options: { colour: "Forest green", capacity: { value: 750, unit: "ml" } } }, { label: "Charcoal", sku: "CHR-750", options: { colour: "Charcoal", capacity: { value: 750, unit: "ml" } } }, { label: "Sand", sku: "SND-750", options: { colour: "Sand", capacity: { value: 750, unit: "ml" } } }],
    images: [{ id: "photo-1602143407151-7111542de6e8", alt: "Matte green insulated bottle on a white table" }, { id: "photo-1625708458528-802ec79b1ed8", alt: "Pastel insulated bottles arranged on a white surface" }],
    offer: { moq: 100, inc: 50, lead: [10, 15], costRupees: 520, stock: 1800 }, price: { mode: "from", tiers: [[100, 745], [500, 690]] } },

  { key: "bottle-pastel", vendor: "beta", category: "drinkware", terms: ["employees", "event-attendees", "conferences", "company-milestones"],
    name: "Colour-Pop Insulated Bottle 500 ml", summary: "Slim 500 ml insulated bottle in five pastel shades — a lightweight option for events and team days.",
    description: "A slim 500 ml double-wall insulated bottle in a satin pastel finish. Sized for laptop bags and cup holders, with a screw-top steel lid. Colours can be mixed within one order at the stated increment, so teams or event tracks can be colour-coded.",
    benefits: ["Five colours, mixable within one order", "Fits standard cup holders", "Satin finish takes engraving cleanly"], suitability: "Event attendees, conference delegates and team-day giveaways.",
    specs: [{ name: "Capacity", value: "500", unit: "ml" }, { name: "Material", value: "Stainless steel 304" }, { name: "Weight", value: "260", unit: "g" }], branding: laser,
    variants: [{ label: "Coral", sku: "COR-500", options: { colour: "Coral" } }, { label: "Sky", sku: "SKY-500", options: { colour: "Sky" } }, { label: "Lilac", sku: "LIL-500", options: { colour: "Lilac" } }, { label: "Mint", sku: "MNT-500", options: { colour: "Mint" } }],
    images: [{ id: "photo-1625708458528-802ec79b1ed8", alt: "Coral, sky and lilac insulated bottles" }],
    offer: { moq: 150, inc: 50, lead: [8, 12], costRupees: 410, stock: 2400 }, price: { mode: "from", tiers: [[150, 590], [500, 545]] } },

  { key: "bottle-sports", vendor: "alpha", category: "drinkware", terms: ["employees", "event-attendees", "conferences"],
    name: "Single-Wall Sports Bottle 1 L", summary: "Lightweight 1 litre single-wall steel bottle with a loop cap — built for gyms, runs and outdoor events.",
    description: "A 1 litre single-wall stainless steel bottle with a wide mouth and a loop cap for carabiners. Not insulated, which keeps the weight low. Brushed finish; laser engraving reads dark against the steel.",
    benefits: ["1 litre capacity at low weight", "Wide mouth for ice and cleaning", "Loop cap clips to bags"], suitability: "Sports days, wellness programmes and outdoor events.",
    specs: [{ name: "Capacity", value: "1000", unit: "ml" }, { name: "Material", value: "Stainless steel 304" }, { name: "Weight", value: "190", unit: "g" }], branding: laser, limitations: "Single-wall: not insulated.",
    variants: [{ label: "Brushed steel", sku: "BRS-1000", options: { colour: "Brushed steel" } }],
    images: [{ id: "photo-1544003484-3cd181d17917", alt: "Brushed steel sports bottle with black loop cap" }],
    offer: { moq: 200, inc: 100, lead: [7, 12], costRupees: 240, stock: 900, staleDays: 16 }, price: { mode: "from", tiers: [[200, 360]] } },

  { key: "bottle-white", vendor: "beta", category: "drinkware", terms: ["executives", "clients", "client-appreciation"],
    name: "Ceramic-Coated Steel Bottle 600 ml", summary: "600 ml insulated bottle with a white ceramic-coat finish and a bamboo-look lid — a quieter, executive look.",
    description: "A 600 ml vacuum-insulated bottle with a smooth white ceramic-coat exterior and a bamboo-look screw lid. The coating gives a matte, stone-like feel and a clean surface for a single-colour print or a tonal engraving.",
    benefits: ["Understated white finish", "Insulated: 18 h cold / 8 h hot", "Bamboo-look lid"], suitability: "Executives and client appreciation where a subtle finish matters.",
    specs: [{ name: "Capacity", value: "600", unit: "ml" }, { name: "Material", value: "Stainless steel 304, ceramic coat" }], branding: ["laser_engraving", "pad_print"],
    variants: [{ label: "White", sku: "WHT-600", options: { colour: "White" } }],
    images: [{ id: "photo-1605714312496-01e90cb509cc", alt: "White ceramic-coated steel bottle beside dried flowers" }],
    offer: { moq: 100, inc: 50, lead: [12, 18], costRupees: 690, stock: 600 }, price: { mode: "from", tiers: [[100, 960]] } },

  { key: "bottle-lavender", vendor: "beta", category: "drinkware", terms: ["employees", "festive-gifting", "employee-recognition"],
    name: "Gradient Steel Bottle 750 ml", summary: "750 ml insulated bottle with a two-tone gradient finish for festive and recognition gifting.",
    description: "A 750 ml double-wall insulated bottle in a two-tone gradient (lavender to lilac). The finish is a printed film under a clear coat, so a logo is added by pad print in one colour at the neck or base.",
    benefits: ["Gradient finish stands out in a festive kit", "Insulated 20 h cold", "One-colour pad print"], suitability: "Festive gifting and recognition programmes.",
    specs: [{ name: "Capacity", value: "750", unit: "ml" }, { name: "Material", value: "Stainless steel 304" }], branding: ["pad_print"],
    variants: [{ label: "Lavender", sku: "LAV-750", options: { colour: "Lavender" } }],
    images: [{ id: "photo-1598443053960-0e8608b282fd", alt: "Lavender gradient steel bottle in warm light" }],
    offer: { moq: 100, inc: 50, lead: [10, 14], costRupees: 560, stock: 700 }, price: { mode: "indicative", tiers: [[100, 780]] } },

  { key: "mug-stoneware", vendor: "gamma", category: "drinkware", terms: ["employees", "new-joiners", "onboarding"],
    name: "Matte Black Stoneware Mug 350 ml", summary: "350 ml stoneware mug in a matte black glaze with a natural clay rim — desk-first and dishwasher safe.",
    description: "A 350 ml stoneware mug with a matte black exterior glaze and an unglazed clay rim detail. Heavier in the hand than porcelain, with a wide handle. Single-colour logo by ceramic transfer, fired for durability.",
    benefits: ["Dishwasher-safe fired transfer", "Weighty stoneware feel", "Pairs with the desk kit"], suitability: "New joiners and employees; a staple for desk kits.",
    specs: [{ name: "Capacity", value: "350", unit: "ml" }, { name: "Material", value: "Stoneware" }, { name: "Packaging", value: "White gift box" }], branding: ["ceramic_transfer"],
    variants: [{ label: "Matte black", sku: "BLK-350", options: { colour: "Matte black" } }],
    images: [{ id: "photo-1518358246973-95637f1df901", alt: "Matte black stoneware mug on a wooden table" }],
    offer: { moq: 100, inc: 50, lead: [12, 18], costRupees: 210, stock: 3000 }, price: { mode: "from", tiers: [[100, 320], [500, 290]] } },

  { key: "mug-gold", vendor: "gamma", category: "drinkware", terms: ["executives", "clients", "client-appreciation", "work-anniversaries"],
    name: "Porcelain Mug with Gold Handle 300 ml", summary: "White porcelain mug with a gold-finish handle for anniversaries and client thank-yous.",
    description: "A 300 ml white porcelain mug with a metallic gold-finish handle. Smooth glaze suits a one- or two-colour transfer. Presented in a rigid gift box with a foam insert.",
    benefits: ["Gold-finish handle", "Rigid gift box included", "Two-colour transfer available"], suitability: "Work anniversaries and client appreciation.",
    specs: [{ name: "Capacity", value: "300", unit: "ml" }, { name: "Material", value: "Porcelain" }], branding: ["ceramic_transfer"], limitations: "Gold handle: hand wash only.",
    variants: [{ label: "White / gold", sku: "WG-300", options: { colour: "White" } }],
    images: [{ id: "photo-1520485521983-bfaa0bc6c80e", alt: "White porcelain mug with a gold handle" }],
    offer: { moq: 50, inc: 25, lead: [14, 20], costRupees: 340, stock: 800 }, price: { mode: "from", tiers: [[50, 495]] } },

  { key: "cups-handmade", vendor: "gamma", category: "drinkware", terms: ["clients", "executives", "client-appreciation", "festive-gifting"],
    name: "Hand-Thrown Ceramic Cup Set (2)", summary: "Two hand-thrown ceramic cups in a natural speckled glaze, boxed as a pair.",
    description: "A pair of hand-thrown 220 ml ceramic cups from a small studio, in a speckled natural glaze. Each cup varies slightly, which is part of the appeal. Branding is on the box sleeve rather than the cup.",
    benefits: ["Studio-made, slight natural variation", "Boxed pair", "Sleeve branding keeps the cup clean"], suitability: "Clients and executives; festive and appreciation gifting.",
    specs: [{ name: "Capacity", value: "220", unit: "ml" }, { name: "Material", value: "Stoneware" }, { name: "Set", value: "2 cups" }], branding: ["sleeve_print"],
    variants: [{ label: "Speckled natural", sku: "NAT-2", options: { colour: "Speckled natural" } }],
    images: [{ id: "photo-1590422749897-47036da0b0ff", alt: "Stack of hand-thrown ceramic cups" }],
    offer: { moq: 50, inc: 10, lead: [21, 28], costRupees: 760, mode: "made_to_order" }, price: { mode: "indicative", tiers: [[50, 1090]] } },

  /* ---------------- Stationery ---------------- */
  { key: "notebook-a5", vendor: "alpha", category: "stationery", terms: ["new-joiners", "employees", "onboarding", "conferences"],
    name: "Hardcover A5 Notebook, Ruled", summary: "A5 hardcover with 192 ruled pages, ribbon marker and a debossed logo option.",
    description: "Textured hardcover A5 notebook with 192 ruled 80 gsm pages, elastic closure, ribbon marker and an expandable back pocket. Debossing on the front cover is included in the branding options; foil stamping is available in gold or silver.",
    benefits: ["192 ruled 80 gsm pages", "Debossed logo up to 80 × 40 mm", "Elastic closure and ribbon marker"], suitability: "New joiners, employees and conference delegates.",
    specs: [{ name: "Size", value: "A5" }, { name: "Pages", value: "192" }, { name: "Paper", value: "80 gsm ruled" }], branding: ["debossing", "foil_stamping"],
    variants: [{ label: "Charcoal", sku: "CH", options: { colour: "Charcoal" } }, { label: "Forest", sku: "FR", options: { colour: "Forest" } }, { label: "Tan", sku: "TN", options: { colour: "Tan" } }],
    images: [{ id: "photo-1620275765334-4ed948bb4502", alt: "Hardcover notebook open with a black pen" }, { id: "photo-1554757387-fa0367573d09", alt: "Open ruled notebook" }],
    offer: { moq: 100, inc: 50, lead: [7, 10], costRupees: 205, stock: 4000 }, price: { mode: "from", tiers: [[100, 320], [500, 285]] } },

  { key: "journal-linen", vendor: "alpha", category: "stationery", terms: ["executives", "clients", "work-anniversaries", "client-appreciation"],
    name: "Linen-Bound Journal A5", summary: "Linen-covered A5 journal with dotted pages and a foil-stamped spine — for the people who still write.",
    description: "A5 journal bound in dyed linen over board, 160 dotted 100 gsm pages, lay-flat sewn binding and a matching ribbon. Foil stamping on the cover or spine in gold, silver or blind.",
    benefits: ["Lay-flat sewn binding", "100 gsm dotted paper", "Foil on cover or spine"], suitability: "Executives, senior clients, long-service milestones.",
    specs: [{ name: "Size", value: "A5" }, { name: "Pages", value: "160" }, { name: "Paper", value: "100 gsm dotted" }, { name: "Cover", value: "Linen over board" }], branding: ["foil_stamping"],
    variants: [{ label: "Navy linen", sku: "NVY", options: { colour: "Navy" } }, { label: "Oat linen", sku: "OAT", options: { colour: "Oat" } }],
    images: [{ id: "photo-1620287920810-3f5b9746380c", alt: "Navy linen journal on a wooden desk" }],
    offer: { moq: 50, inc: 25, lead: [12, 16], costRupees: 430, stock: 900 }, price: { mode: "from", tiers: [[50, 640]] } },

  { key: "journal-leather", vendor: "gamma", category: "stationery", terms: ["executives", "clients", "client-appreciation", "company-milestones"],
    name: "Wrap-Tie Leather Journal", summary: "Full-grain leather wrap journal with a cord tie and refillable A5 insert.",
    description: "A wrap-style journal in full-grain vegetable-tanned leather with a cord tie and a refillable 120-page A5 insert. Develops a patina with use. Blind-debossed logo on the flap.",
    benefits: ["Full-grain, vegetable-tanned leather", "Refillable insert", "Blind deboss on flap"], suitability: "Executives and key clients; company milestone gifts.",
    specs: [{ name: "Size", value: "A5 insert" }, { name: "Material", value: "Full-grain leather" }, { name: "Pages", value: "120" }], branding: ["debossing"], care: "Wipe with a dry cloth; avoid prolonged sun.",
    variants: [{ label: "Tan", sku: "TAN", options: { colour: "Tan" } }],
    images: [{ id: "photo-1709039549252-179925870591", alt: "Tan leather wrap journal with pen" }, { id: "photo-1764087957302-ef0756ed8e0a", alt: "Black and gold pen resting on an open notebook" }],
    offer: { moq: 25, inc: 5, lead: [18, 25], costRupees: 1150, mode: "made_to_order" }, price: { mode: "from", tiers: [[25, 1650]] } },

  { key: "notebook-spiral", vendor: "alpha", category: "stationery", terms: ["event-attendees", "conferences", "employees"],
    name: "Spiral Notebook A5, Kraft Cover", summary: "Budget-friendly A5 spiral notebook with a kraft cover and 100 ruled sheets for events and workshops.",
    description: "A5 wire-bound notebook with a 300 gsm kraft board cover and 100 ruled 70 gsm sheets. Full-cover single-colour screen print makes it a strong low-cost conference giveaway.",
    benefits: ["Low unit cost at volume", "Full-cover print area", "Lies flat when open"], suitability: "Conference delegates and workshop attendees.",
    specs: [{ name: "Size", value: "A5" }, { name: "Sheets", value: "100" }, { name: "Cover", value: "300 gsm kraft" }], branding: print,
    variants: [{ label: "Kraft", sku: "KFT", options: { colour: "Kraft" } }],
    images: [{ id: "photo-1612367980327-7454a7276aa7", alt: "Spiral notebook on a wooden table" }],
    offer: { moq: 250, inc: 50, lead: [7, 10], costRupees: 78, stock: 6000 }, price: { mode: "from", tiers: [[250, 125], [1000, 105]] } },

  { key: "pen-rollerball", vendor: "alpha", category: "stationery", terms: ["employees", "event-attendees", "conferences", "onboarding"],
    name: "Brushed Steel Rollerball Pen", summary: "Brushed steel rollerball with a chrome clip, laser-engraved along the barrel.",
    description: "A brushed stainless steel rollerball pen with a chrome clip and black 0.7 mm refill. Engraving along the barrel up to 45 × 6 mm. Supplied in a slim card sleeve; a velvet pouch is optional.",
    benefits: ["Metal body, refillable", "Barrel engraving", "Card sleeve included"], suitability: "Any team gift; pairs with a notebook.",
    specs: [{ name: "Material", value: "Stainless steel" }, { name: "Refill", value: "0.7 mm rollerball, black" }], branding: laser,
    variants: [{ label: "Brushed steel", sku: "STL", options: { colour: "Steel" } }],
    images: [{ id: "photo-1587303988571-c5563c0bceab", alt: "Brushed steel pen on white paper" }],
    offer: { moq: 100, inc: 50, lead: [7, 10], costRupees: 130, stock: 5000 }, price: { mode: "from", tiers: [[100, 195], [500, 175]] } },

  { key: "pen-fountain", vendor: "gamma", category: "stationery", terms: ["executives", "work-anniversaries", "company-milestones"],
    name: "Black Lacquer Fountain Pen", summary: "Black lacquer fountain pen with a gold-tone steel nib, in a hinged presentation box.",
    description: "A black lacquer-over-brass fountain pen with a gold-tone stainless steel nib (medium) and cartridge/converter filling. Cap-band engraving up to 30 × 4 mm. Presented in a hinged box with one ink cartridge.",
    benefits: ["Brass body, lacquer finish", "Cap-band engraving", "Hinged presentation box"], suitability: "Long-service awards and leadership milestones.",
    specs: [{ name: "Nib", value: "Steel, medium" }, { name: "Filling", value: "Cartridge / converter" }, { name: "Weight", value: "38", unit: "g" }], branding: laser,
    variants: [{ label: "Black / gold", sku: "BLKG", options: { colour: "Black" } }],
    images: [{ id: "photo-1620080207549-60efab274c16", alt: "Black and gold fountain pen" }, { id: "photo-1711254607229-f9c86c99b1e7", alt: "Three fountain pens on a white box" }],
    offer: { moq: 20, inc: 5, lead: [14, 21], costRupees: 1420, stock: 120 }, price: { mode: "from", tiers: [[20, 2100]] } },

  { key: "pen-metal-blue", vendor: "beta", category: "stationery", terms: ["employees", "event-attendees", "conferences"],
    name: "Twist Ballpoint with Stylus Tip", summary: "Slim metal twist ballpoint with a soft-touch stylus tip for tablets — an event staple.",
    description: "A slim aluminium twist-action ballpoint with a capacitive stylus tip. Available in silver with a colour accent ring. Laser engraving on the barrel.",
    benefits: ["Stylus tip for tablets", "Twist action, no cap to lose", "Low cost at volume"], suitability: "Conference and event giveaways.",
    specs: [{ name: "Material", value: "Aluminium" }, { name: "Refill", value: "Ballpoint, blue" }], branding: laser,
    variants: [{ label: "Silver / blue", sku: "SLB", options: { colour: "Silver" } }],
    images: [{ id: "photo-1600531597946-f9b1d7b0f486", alt: "Silver and blue metal pen on a notebook" }],
    offer: { moq: 250, inc: 50, lead: [7, 10], costRupees: 52, stock: 8000 }, price: { mode: "from", tiers: [[250, 85], [1000, 72]] } },

  /* ---------------- Bags ---------------- */
  { key: "backpack-navy", vendor: "beta", category: "bags", terms: ["new-joiners", "employees", "onboarding"],
    name: "Commuter Laptop Backpack 15.6\"", summary: "Padded 15.6-inch laptop backpack in water-repellent navy canvas with a trolley strap.",
    description: "A 22-litre commuter backpack in water-repellent coated canvas with a padded 15.6-inch laptop sleeve, tablet pocket, front organiser and a trolley pass-through strap. Embroidered logo on the front panel up to 80 × 80 mm.",
    benefits: ["Padded 15.6\" laptop sleeve", "Water-repellent canvas", "Embroidery up to 80 × 80 mm"], suitability: "New joiners; a high-perceived-value onboarding anchor.",
    specs: [{ name: "Volume", value: "22", unit: "L" }, { name: "Laptop", value: "up to 15.6\"" }, { name: "Material", value: "Coated canvas" }, { name: "Weight", value: "780", unit: "g" }], branding: ["embroidery"],
    variants: [{ label: "Navy", sku: "NVY", options: { colour: "Navy" } }],
    images: [{ id: "photo-1553062407-98eeb64c6a62", alt: "Navy laptop backpack against a white wall" }],
    offer: { moq: 50, inc: 25, lead: [14, 20], costRupees: 1380, stock: 400 }, price: { mode: "from", tiers: [[50, 1950], [250, 1790]] } },

  { key: "backpack-antitheft", vendor: "beta", category: "bags", terms: ["employees", "executives", "employee-recognition"],
    name: "Anti-Theft Backpack with USB Port", summary: "Hidden-zip anti-theft backpack with a USB pass-through port and padded 15-inch sleeve.",
    description: "A structured 20-litre backpack with hidden rear-facing zips, a lockable main compartment, an external USB pass-through (bring your own power bank) and a padded 15-inch laptop sleeve. Rubber logo patch or embroidery.",
    benefits: ["Hidden zips and lockable compartment", "USB pass-through port", "Structured shape keeps its form"], suitability: "Frequent travellers and recognition awards.",
    specs: [{ name: "Volume", value: "20", unit: "L" }, { name: "Laptop", value: "up to 15\"" }, { name: "Material", value: "Polyester 900D" }], branding: ["embroidery", "rubber_patch"],
    variants: [{ label: "Black", sku: "BLK", options: { colour: "Black" } }],
    images: [{ id: "photo-1594299447935-e5b840f54b9b", alt: "Black anti-theft backpack on a white box" }, { id: "photo-1667411425122-8b6be5da1c48", alt: "Black backpack with a strap, side view" }],
    offer: { moq: 50, inc: 25, lead: [14, 21], costRupees: 1650, stock: 250 }, price: { mode: "from", tiers: [[50, 2350]] } },

  { key: "backpack-hardshell", vendor: "beta", category: "bags", terms: ["executives", "employee-recognition", "company-milestones"],
    name: "Hardshell Tech Backpack", summary: "Moulded hardshell backpack that protects a laptop and camera gear — a statement award piece.",
    description: "A moulded EVA hardshell backpack with a padded 16-inch laptop compartment, customisable divider set and a rain-sealed main zip. Logo by debossing on the shell or a metal badge.",
    benefits: ["Moulded shell protects equipment", "Configurable dividers", "Metal badge or deboss"], suitability: "Recognition awards and leadership gifting.",
    specs: [{ name: "Laptop", value: "up to 16\"" }, { name: "Material", value: "EVA hardshell, polyester lining" }, { name: "Weight", value: "1.4", unit: "kg" }], branding: ["debossing", "metal_badge"],
    variants: [{ label: "Graphite", sku: "GRP", options: { colour: "Graphite" } }],
    images: [{ id: "photo-1667411424771-cadd97150827", alt: "Graphite hardshell backpack, front view" }],
    offer: { moq: 20, inc: 10, lead: [21, 30], costRupees: 3900, mode: "made_to_order" }, price: { mode: "request_quote", tiers: [] } },

  { key: "tote-canvas", vendor: "beta", category: "bags", terms: ["event-attendees", "conferences", "employees"],
    name: "Heavy Canvas Tote 14 oz", summary: "14 oz cotton canvas tote with a 30 × 30 cm print area and an inside pocket — made to order.",
    description: "Heavy 14 oz cotton canvas tote with reinforced 60 cm handles and an internal zip pocket. Produced to order with single- or two-colour screen printing across a 30 × 30 cm area.",
    benefits: ["Heavy 14 oz canvas", "Large print area", "Reinforced handles"], suitability: "Event attendees and conference delegates.",
    specs: [{ name: "Material", value: "14 oz cotton canvas" }, { name: "Size", value: "38 × 42 × 10", unit: "cm" }], branding: print,
    variants: [{ label: "Natural", sku: "NAT", options: { colour: "Natural" } }, { label: "Black", sku: "BLK", options: { colour: "Black" } }],
    images: [{ id: "photo-1574365569389-a10d488ca3fb", alt: "Natural canvas tote bag on a grey surface" }],
    offer: { moq: 250, inc: 50, lead: [12, 18], costRupees: 180, mode: "made_to_order" }, price: { mode: "from", tiers: [[250, 275], [1000, 240]] } },

  { key: "organiser-tech", vendor: "beta", category: "bags", terms: ["employees", "remote-teams", "onboarding"],
    name: "Tech Organiser Pouch", summary: "Zip organiser with elastic loops for cables, chargers and earbuds — the quiet hero of a remote-work kit.",
    description: "A zip-around organiser pouch (24 × 16 cm) with elastic loops, mesh pockets and a padded slot for a small power bank. Water-resistant polyester exterior. Woven label or single-colour print.",
    benefits: ["Keeps cables and chargers sorted", "Fits a small power bank", "Woven label option"], suitability: "Remote teams and new-joiner kits.",
    specs: [{ name: "Size", value: "24 × 16 × 4", unit: "cm" }, { name: "Material", value: "Polyester 600D" }], branding: ["woven_label", "screen_print"],
    variants: [{ label: "Black", sku: "BLK", options: { colour: "Black" } }],
    images: [{ id: "photo-1667411424598-96b5e5f3139b", alt: "Black organiser pouch open showing compartments" }],
    offer: { moq: 100, inc: 50, lead: [12, 16], costRupees: 260, stock: 1500 }, price: { mode: "from", tiers: [[100, 390]] } },

  /* ---------------- Technology accessories ---------------- */
  { key: "earbuds", vendor: "beta", category: "technology-accessories", terms: ["employees", "employee-recognition", "remote-teams"],
    name: "True Wireless Earbuds with Case", summary: "Bluetooth 5.3 earbuds with a pocket charging case, 24 hours combined playback and touch controls.",
    description: "True wireless earbuds with Bluetooth 5.3, 6 hours per charge plus 18 hours from the case, touch controls and a USB-C charging case. Case lid takes a laser-etched or pad-printed logo. Supplied with three ear-tip sizes.",
    benefits: ["24 h combined playback", "USB-C charging case", "Logo on case lid"], suitability: "Recognition programmes and remote-team kits.",
    specs: [{ name: "Bluetooth", value: "5.3" }, { name: "Playback", value: "6 h + 18 h case" }, { name: "Charging", value: "USB-C" }], branding: ["laser_engraving", "pad_print"], limitations: "Electronics carry a 6-month replacement warranty via the supplier; details in your quote.",
    variants: [{ label: "Black", sku: "BLK", options: { colour: "Black" } }, { label: "Navy", sku: "NVY", options: { colour: "Navy" } }],
    images: [{ id: "photo-1606220945770-b5b6c2c55bf1", alt: "Black wireless earbuds with open charging case" }, { id: "photo-1578319439584-104c94d37305", alt: "Black earbuds on a dark surface" }],
    offer: { moq: 50, inc: 25, lead: [14, 21], costRupees: 1250, stock: 600 }, price: { mode: "from", tiers: [[50, 1790], [250, 1650]] } },

  { key: "headphones-anc", vendor: "beta", category: "technology-accessories", terms: ["executives", "employee-recognition", "work-anniversaries"],
    name: "Over-Ear Headphones with Noise Cancelling", summary: "Foldable over-ear Bluetooth headphones with active noise cancelling and 40-hour battery.",
    description: "Over-ear Bluetooth headphones with hybrid active noise cancelling, 40 hours of playback, a foldable frame and a hard travel case. Logo on the ear-cup by pad print or laser.",
    benefits: ["Active noise cancelling", "40 h battery", "Hard travel case included"], suitability: "Recognition awards and anniversary milestones.",
    specs: [{ name: "Bluetooth", value: "5.3" }, { name: "Playback", value: "40 h" }, { name: "Weight", value: "265", unit: "g" }], branding: ["pad_print", "laser_engraving"],
    variants: [{ label: "Black", sku: "BLK", options: { colour: "Black" } }],
    images: [{ id: "photo-1618366712010-f4ae9c647dcb", alt: "Black over-ear headphones on a white table" }, { id: "photo-1583394838336-acd977736f90", alt: "Black over-ear headphones, side view" }],
    offer: { moq: 25, inc: 5, lead: [14, 21], costRupees: 3400, stock: 150 }, price: { mode: "from", tiers: [[25, 4650]] } },

  { key: "headphones-wired", vendor: "beta", category: "technology-accessories", terms: ["employees", "remote-teams", "onboarding"],
    name: "Wired On-Ear Headset with Mic", summary: "USB-C wired on-ear headset with a boom mic for calls — no charging, no pairing.",
    description: "A lightweight on-ear wired headset with a USB-C connector, in-line controls and a fold-away boom microphone. Ideal where reliability on calls matters more than wireless convenience. Pad-printed logo on the headband.",
    benefits: ["No battery or pairing", "Fold-away boom mic", "USB-C with 3.5 mm adapter"], suitability: "Remote teams and new-joiner IT kits.",
    specs: [{ name: "Connector", value: "USB-C (3.5 mm adapter)" }, { name: "Weight", value: "180", unit: "g" }], branding: ["pad_print"],
    variants: [{ label: "Black", sku: "BLK", options: { colour: "Black" } }],
    images: [{ id: "photo-1583394838336-acd977736f90", alt: "Black on-ear headset" }],
    offer: { moq: 50, inc: 25, lead: [10, 14], costRupees: 690, stock: 500, staleDays: 20 }, price: { mode: "from", tiers: [[50, 990]] } },

  { key: "powerbank-10k", vendor: "beta", category: "technology-accessories", terms: ["employees", "event-attendees", "conferences", "remote-teams"],
    name: "Slim Power Bank 10,000 mAh", summary: "Slim 10,000 mAh power bank with USB-C in/out and 20 W fast charge.",
    description: "A slim aluminium-shell 10,000 mAh power bank with USB-C in/out (20 W) and a USB-A port. Four-LED charge indicator. Laser-etched logo on the shell. Ships with a short USB-C cable.",
    benefits: ["20 W USB-C fast charge", "Aluminium shell, laser-etched", "Two devices at once"], suitability: "Conference delegates, field teams and remote staff.",
    specs: [{ name: "Capacity", value: "10000", unit: "mAh" }, { name: "Output", value: "USB-C 20 W, USB-A 12 W" }, { name: "Weight", value: "210", unit: "g" }], branding: laser, limitations: "Lithium cells: air freight surcharges may apply; stated in your quote.",
    variants: [{ label: "Silver", sku: "SLV", options: { colour: "Silver" } }, { label: "Teal", sku: "TEL", options: { colour: "Teal" } }],
    images: [{ id: "photo-1706275399494-fb26bbc5da63", alt: "Silver slim power bank on a white table" }, { id: "photo-1566554738544-d962991c3fee", alt: "Hand holding a phone charging from a teal power bank" }],
    offer: { moq: 100, inc: 50, lead: [12, 18], costRupees: 820, stock: 1200 }, price: { mode: "from", tiers: [[100, 1190], [500, 1090]] } },

  { key: "speaker", vendor: "beta", category: "technology-accessories", terms: ["employees", "employee-recognition", "festive-gifting"],
    name: "Fabric Bluetooth Speaker", summary: "Compact fabric-wrapped Bluetooth speaker with 12-hour battery and a splash-resistant shell.",
    description: "A palm-sized Bluetooth 5.0 speaker wrapped in woven fabric, with 12 hours of playback, a splash-resistant (IPX5) shell and a wrist strap. Logo by pad print on the base plate or a woven tag on the strap.",
    benefits: ["12 h playback", "IPX5 splash resistance", "Woven tag or pad print"], suitability: "Festive and recognition gifting.",
    specs: [{ name: "Bluetooth", value: "5.0" }, { name: "Playback", value: "12 h" }, { name: "Rating", value: "IPX5" }], branding: ["pad_print", "woven_label"],
    variants: [{ label: "Charcoal", sku: "CHR", options: { colour: "Charcoal" } }],
    images: [{ id: "photo-1632156752398-2b2cb4e6c907", alt: "Charcoal fabric speaker on a dark table" }],
    offer: { moq: 50, inc: 25, lead: [14, 21], costRupees: 1150, stock: 300 }, price: { mode: "indicative", tiers: [[50, 1690]] } },

  /* ---------------- Desk accessories ---------------- */
  { key: "desk-bamboo", vendor: "alpha", category: "desk-accessories", terms: ["new-joiners", "employees", "onboarding", "remote-teams"],
    name: "Bamboo Desk Organiser", summary: "Bamboo desk caddy with pen well, phone slot and two trays; laser engraving on the front face.",
    description: "A bamboo desk organiser with a pen well, an angled phone slot, a card tray and a small drawer. Natural bamboo finish; laser engraving darkens cleanly on the front face up to 90 × 25 mm.",
    benefits: ["Phone slot and drawer", "Engraving on front face", "Flat-pack, assembles in minutes"], suitability: "New joiners and remote-team home-office kits.",
    specs: [{ name: "Size", value: "24 × 12 × 10", unit: "cm" }, { name: "Material", value: "Bamboo" }], branding: laser,
    variants: [{ label: "Natural bamboo", sku: "NAT", options: { colour: "Natural" } }],
    images: [{ id: "photo-1751107807635-a2ac6035e8dd", alt: "Bamboo desk organiser holding pens" }, { id: "photo-1751107756600-fb136501dec7", alt: "Pens inside a wooden holder" }],
    offer: { moq: 100, inc: 50, lead: [10, 14], costRupees: 385, stock: 700 }, price: { mode: "from", tiers: [[100, 560]] } },

  { key: "desk-steel", vendor: "alpha", category: "desk-accessories", terms: ["employees", "executives", "onboarding"],
    name: "Powder-Coated Steel Desk Set", summary: "Three-piece powder-coated steel desk set: pen cup, tray and phone stand, in white or graphite.",
    description: "A three-piece desk set in powder-coated steel — pen cup, letter tray and a folded phone stand. Matte white or graphite finish. Single-colour pad print or laser to bare metal.",
    benefits: ["Three coordinated pieces", "Matte powder coat", "Laser reveals bare steel"], suitability: "Office refits, new-joiner desks and executive suites.",
    specs: [{ name: "Pieces", value: "3" }, { name: "Material", value: "Powder-coated steel" }], branding: ["pad_print", "laser_engraving"],
    variants: [{ label: "White", sku: "WHT", options: { colour: "White" } }, { label: "Graphite", sku: "GRP", options: { colour: "Graphite" } }],
    images: [{ id: "photo-1777917845221-f92884c1b61b", alt: "White steel desk organiser with files" }],
    offer: { moq: 50, inc: 25, lead: [14, 21], costRupees: 720, stock: 300 }, price: { mode: "from", tiers: [[50, 1040]] } },

  /* ---------------- Apparel ---------------- */
  { key: "polo-pique", vendor: "gamma", category: "apparel", terms: ["employees", "event-attendees", "conferences", "company-milestones"],
    name: "Cotton Piqué Polo", summary: "220 gsm combed-cotton piqué polo with a ribbed collar — the workhorse of event and team apparel.",
    description: "A classic-fit polo in 220 gsm combed-cotton piqué with a two-button placket, ribbed collar and cuffs, and side vents. Embroidery on the left chest up to 90 × 90 mm; sleeve embroidery optional. Sizes XS–3XL, mixable within the increment.",
    benefits: ["220 gsm combed cotton", "Sizes XS–3XL mixable", "Left-chest embroidery included"], suitability: "Team events, conferences and uniform-adjacent gifting.",
    specs: [{ name: "Fabric", value: "220 gsm cotton piqué" }, { name: "Fit", value: "Classic" }, { name: "Sizes", value: "XS–3XL" }], branding: ["embroidery"], care: "Machine wash cold; do not tumble dry hot.",
    variants: [{ label: "White", sku: "WHT", options: { colour: "White" } }, { label: "Navy", sku: "NVY", options: { colour: "Navy" } }, { label: "Black", sku: "BLK", options: { colour: "Black" } }],
    images: [{ id: "photo-1720514496268-44bb31c03815", alt: "Three folded polo shirts in white, blue and navy" }, { id: "photo-1622622016645-7b7065e7c129", alt: "Folded white polo on a black table" }],
    offer: { moq: 100, inc: 25, lead: [12, 18], costRupees: 420, stock: 2500 }, price: { mode: "from", tiers: [[100, 640], [500, 590]] } },

  { key: "polo-tipped", vendor: "gamma", category: "apparel", terms: ["employees", "executives", "conferences"],
    name: "Tipped-Collar Polo", summary: "Piqué polo with contrast tipping on collar and cuffs for a sharper, uniform-ready look.",
    description: "A tipped-collar polo in 210 gsm cotton-rich piqué with contrast tipping at the collar and cuffs. Embroidered left-chest logo; contrast colours can match brand palettes at volume (confirmed in the quotation).",
    benefits: ["Contrast tipping detail", "Cotton-rich piqué", "Brand-palette tipping at volume"], suitability: "Field teams, front-of-house staff and conference crews.",
    specs: [{ name: "Fabric", value: "210 gsm cotton-rich piqué" }, { name: "Sizes", value: "XS–3XL" }], branding: ["embroidery"],
    variants: [{ label: "White / navy tip", sku: "WNT", options: { colour: "White" } }, { label: "Navy / white tip", sku: "NWT", options: { colour: "Navy" } }],
    images: [{ id: "photo-1720514496161-914011a9ee02", alt: "Two tipped-collar polo shirts on a white background" }],
    offer: { moq: 100, inc: 25, lead: [14, 21], costRupees: 460, stock: 1200 }, price: { mode: "from", tiers: [[100, 690]] } },

  { key: "hoodie", vendor: "gamma", category: "apparel", terms: ["employees", "new-joiners", "onboarding", "employee-recognition"],
    name: "Brushed Fleece Hoodie 320 gsm", summary: "Heavyweight 320 gsm brushed fleece hoodie with a kangaroo pocket and flat drawcords.",
    description: "A relaxed-fit pullover hoodie in 320 gsm cotton-rich brushed fleece with a double-layer hood, flat drawcords and a kangaroo pocket. Embroidery or screen print on the chest; large back prints available.",
    benefits: ["320 gsm heavyweight fleece", "Chest embroidery or back print", "Sizes XS–3XL"], suitability: "New-joiner kits, recognition and winter gifting.",
    specs: [{ name: "Fabric", value: "320 gsm brushed fleece" }, { name: "Fit", value: "Relaxed" }, { name: "Sizes", value: "XS–3XL" }], branding: ["embroidery", "screen_print"], care: "Machine wash cold, inside out.",
    variants: [{ label: "Off-white", sku: "OWT", options: { colour: "Off-white" } }, { label: "Charcoal", sku: "CHR", options: { colour: "Charcoal" } }],
    images: [{ id: "photo-1620799140188-3b2a02fd9a77", alt: "Off-white hoodie hanging beside dried palms" }],
    offer: { moq: 50, inc: 25, lead: [14, 21], costRupees: 890, stock: 600 }, price: { mode: "from", tiers: [[50, 1290], [250, 1190]] } },

  { key: "tee-crew", vendor: "gamma", category: "apparel", terms: ["event-attendees", "employees", "conferences", "company-milestones"],
    name: "Combed Cotton Crew Tee 180 gsm", summary: "180 gsm combed-cotton crew-neck tee in six colours, screen-printed front or back.",
    description: "A unisex crew-neck tee in 180 gsm bio-washed combed cotton with a taped neck. Six stock colours; screen print up to A3 on front or back. Sizes XS–3XL mixable within the increment.",
    benefits: ["180 gsm bio-washed cotton", "Six stock colours", "A3 print area"], suitability: "Event teams, hackathons and milestone celebrations.",
    specs: [{ name: "Fabric", value: "180 gsm combed cotton" }, { name: "Sizes", value: "XS–3XL" }], branding: print,
    variants: [{ label: "Teal", sku: "TEL", options: { colour: "Teal" } }, { label: "Coral", sku: "COR", options: { colour: "Coral" } }, { label: "Grey melange", sku: "GRY", options: { colour: "Grey melange" } }],
    images: [{ id: "photo-1586363104862-3a5e2ab60d99", alt: "Folded crew-neck tees in green, coral and grey" }],
    offer: { moq: 100, inc: 25, lead: [10, 14], costRupees: 240, stock: 4000 }, price: { mode: "from", tiers: [[100, 360], [500, 320]] } },

  /* ---------------- Food hampers ---------------- */
  { key: "dryfruit-box", vendor: "gamma", category: "food-hampers", terms: ["clients", "employees", "festive-gifting", "client-appreciation"],
    name: "Dry Fruit Box, Four Compartments", summary: "Wooden four-compartment box with almonds, cashews, pistachios and raisins — 600 g total.",
    description: "A hinged wooden box with four compartments holding 150 g each of almonds, cashews, roasted pistachios and golden raisins. Lid takes a laser-engraved logo; a printed sleeve is available for festive artwork. Packed to order; shelf life is 6 months from packing.",
    benefits: ["600 g across four compartments", "Reusable wooden box", "Engraved lid or printed sleeve"], suitability: "Festive gifting to clients and employees.",
    specs: [{ name: "Net weight", value: "600", unit: "g" }, { name: "Box", value: "Wood, hinged" }, { name: "Shelf life", value: "6 months from packing" }], branding: ["laser_engraving", "sleeve_print"], limitations: "Contains tree nuts. Packed to order; allow the stated lead time.",
    faqs: [{ question: "Can we swap items for a vegan or nut-free mix?", answer: "Nut-free alternatives (seed mixes, dried fruit) can be quoted; tell us in the enquiry notes." }],
    variants: [{ label: "Classic mix", sku: "CLS", options: {} }],
    images: [{ id: "photo-1702043239331-da06c5c269e4", alt: "Wooden dry-fruit box beside a potted plant" }, { id: "photo-1769255484646-16988ad5552d", alt: "Bowls of assorted nuts and dates" }],
    offer: { moq: 50, inc: 10, lead: [10, 14], costRupees: 980, mode: "made_to_order" }, price: { mode: "from", tiers: [[50, 1390], [250, 1290]] } },

  { key: "dryfruit-dates", vendor: "gamma", category: "food-hampers", terms: ["clients", "executives", "festive-gifting"],
    name: "Dates and Nuts Tasting Set", summary: "Five-jar tasting set of Medjool dates, roasted almonds, cashews, walnuts and figs.",
    description: "Five 120 g glass jars — Medjool dates, roasted almonds, salted cashews, walnut halves and dried figs — in a rigid presentation box with a magnetic lid. Box-lid print or a foil-stamped card.",
    benefits: ["Glass jars, reusable", "Magnetic-lid rigid box", "Foil card or lid print"], suitability: "Executive and client festive gifting.",
    specs: [{ name: "Net weight", value: "600", unit: "g" }, { name: "Jars", value: "5 × 120 g" }, { name: "Shelf life", value: "6 months from packing" }], branding: ["box_print", "foil_stamping"], limitations: "Contains tree nuts.",
    variants: [{ label: "Five-jar set", sku: "5J", options: {} }],
    images: [{ id: "photo-1769255484888-e2c82fc1238c", alt: "Five bowls of nuts and dates on a dark surface" }],
    offer: { moq: 25, inc: 5, lead: [10, 14], costRupees: 1700, mode: "made_to_order" }, price: { mode: "from", tiers: [[25, 2390]] } },

  { key: "chocolate-25", vendor: "gamma", category: "food-hampers", terms: ["clients", "employees", "festive-gifting", "client-appreciation", "work-anniversaries"],
    name: "Assorted Chocolate Box, 25 pieces", summary: "25 hand-finished chocolates — dark, milk and filled — in a rigid box with a printed sleeve.",
    description: "A 25-piece box of hand-finished chocolates from a small-batch maker: dark ganache, milk caramel, hazelnut praline and fruit-filled pieces. Rigid black box with a full-colour printed sleeve. Ships in insulated packaging in warm months; made to order.",
    benefits: ["25 assorted pieces", "Full-colour printed sleeve", "Insulated dispatch in warm months"], suitability: "Client appreciation, anniversaries and festive gifting.",
    specs: [{ name: "Pieces", value: "25" }, { name: "Net weight", value: "300", unit: "g" }, { name: "Shelf life", value: "8 weeks from packing" }], branding: ["sleeve_print"], limitations: "Contains milk, nuts and soy. Not recommended for dispatch to destinations without cold-chain transit above 32 °C.",
    variants: [{ label: "Assorted", sku: "AST", options: {} }],
    images: [{ id: "photo-1548741487-18d363dc4469", alt: "Open box of assorted chocolates" }, { id: "photo-1526081347589-7fa3cb41b4b2", alt: "Assorted chocolates in a box" }],
    offer: { moq: 50, inc: 10, lead: [8, 12], costRupees: 640, mode: "made_to_order" }, price: { mode: "from", tiers: [[50, 920], [250, 860]] } },

  { key: "chocolate-bars", vendor: "gamma", category: "food-hampers", terms: ["employees", "event-attendees", "conferences", "festive-gifting"],
    name: "Single-Origin Chocolate Bar Trio", summary: "Three 60 g single-origin bars (India, Ghana, Peru) in a printed kraft sleeve.",
    description: "Three 60 g single-origin dark chocolate bars — Idukki 70%, Ghana 65% and Peru 72% — in a printed kraft slipcase. A compact, high-perceived-value giveaway for events and festive add-ons.",
    benefits: ["Three origins, three flavours", "Compact slipcase", "Full-colour kraft print"], suitability: "Events, festive add-ons and employee treats.",
    specs: [{ name: "Bars", value: "3 × 60 g" }, { name: "Shelf life", value: "12 months" }], branding: ["sleeve_print"], limitations: "May contain traces of milk and nuts.",
    variants: [{ label: "Trio", sku: "TRIO", options: {} }],
    images: [{ id: "photo-1614631016624-cb89bceec02c", alt: "Chocolate bars in a brown box" }],
    offer: { moq: 100, inc: 50, lead: [8, 12], costRupees: 360, stock: 900 }, price: { mode: "from", tiers: [[100, 520]] } },

  { key: "tea-box", vendor: "gamma", category: "food-hampers", terms: ["clients", "executives", "client-appreciation", "festive-gifting"],
    name: "Loose-Leaf Tea Discovery Box", summary: "Four 50 g tins of Indian loose-leaf teas with a steel infuser, in a kraft gift box.",
    description: "Four 50 g tins — Darjeeling first flush, Assam orthodox, Nilgiri frost and a masala chai blend — with a stainless steel infuser and brewing card, in a printed kraft box. Tin lids can carry a small printed label.",
    benefits: ["Four Indian estates", "Steel infuser included", "Printed box and tin labels"], suitability: "Clients and executives; a festive staple.",
    specs: [{ name: "Tea", value: "4 × 50 g" }, { name: "Shelf life", value: "18 months" }], branding: ["box_print", "label_print"],
    variants: [{ label: "Discovery set", sku: "DSC", options: {} }],
    images: [{ id: "photo-1593522427820-c35045888f11", alt: "Kraft tea box beside a glass cup of tea" }, { id: "photo-1728034261780-94beccf0eaec", alt: "Wooden box filled with tins" }],
    offer: { moq: 50, inc: 10, lead: [10, 14], costRupees: 780, stock: 400 }, price: { mode: "from", tiers: [[50, 1150]] } },

  { key: "coffee-box", vendor: "gamma", category: "food-hampers", terms: ["employees", "clients", "onboarding", "festive-gifting"],
    name: "Coffee and Cookie Gift Box", summary: "250 g of freshly roasted Indian arabica with a box of butter cookies and a ceramic tumbler.",
    description: "A 250 g bag of freshly roasted Chikmagalur arabica (whole bean or ground), a 200 g box of butter cookies and a 250 ml ceramic tumbler, packed in a printed box. Roasted to order; dispatched within a week of roasting.",
    benefits: ["Roasted to order", "Tumbler is a keepsake", "Bean or ground"], suitability: "Onboarding kits and festive gifting.",
    specs: [{ name: "Coffee", value: "250", unit: "g" }, { name: "Cookies", value: "200", unit: "g" }, { name: "Shelf life", value: "Coffee 3 months; cookies 6 weeks" }], branding: ["box_print", "ceramic_transfer"], limitations: "Cookies contain wheat, milk and egg.",
    variants: [{ label: "Whole bean", sku: "WB", options: { grind: "Whole bean" } }, { label: "Ground", sku: "GR", options: { grind: "Ground" } }],
    images: [{ id: "photo-1585819229591-a4b042795558", alt: "White teapot and cup on a white wooden table" }],
    offer: { moq: 50, inc: 10, lead: [10, 14], costRupees: 890, mode: "made_to_order" }, price: { mode: "from", tiers: [[50, 1290]] } },

  /* ---------------- Wellness ---------------- */
  { key: "candle-amber", vendor: "gamma", category: "wellness", terms: ["employees", "clients", "festive-gifting", "client-appreciation"],
    name: "Soy Wax Candle in Amber Glass 200 g", summary: "200 g soy-wax candle in amber glass, 40-hour burn, in cedar or citrus.",
    description: "A 200 g soy-wax candle poured into amber glass with a cotton wick, around 40 hours of burn time. Two fragrances: cedar and vetiver, or bergamot and citrus. Printed label on the glass and a kraft box.",
    benefits: ["Approximately 40 h burn", "Two fragrance options", "Printed label and kraft box"], suitability: "Festive gifting and appreciation kits.",
    specs: [{ name: "Wax", value: "Soy" }, { name: "Weight", value: "200", unit: "g" }, { name: "Burn time", value: "approx. 40 h" }], branding: ["label_print", "box_print"], care: "Trim wick to 5 mm before each burn.",
    variants: [{ label: "Cedar & vetiver", sku: "CDR", options: { fragrance: "Cedar & vetiver" } }, { label: "Bergamot & citrus", sku: "CIT", options: { fragrance: "Bergamot & citrus" } }],
    images: [{ id: "photo-1572726729207-a78d6feb18d7", alt: "Two amber-glass candles" }, { id: "photo-1612293905607-b003de9e54fb", alt: "Hand lighting a candle in an amber jar" }],
    offer: { moq: 100, inc: 50, lead: [12, 18], costRupees: 320, stock: 1000 }, price: { mode: "from", tiers: [[100, 490], [500, 450]] } },

  { key: "candle-white", vendor: "gamma", category: "wellness", terms: ["clients", "executives", "festive-gifting"],
    name: "Frosted Glass Candle 300 g", summary: "300 g soy-blend candle in frosted white glass with a wooden lid — 55-hour burn.",
    description: "A 300 g soy-blend candle in frosted white glass with a wooden lid, approximately 55 hours of burn. Unscented or light sandalwood. Logo engraved on the wooden lid.",
    benefits: ["Wooden lid, engraved", "Approx. 55 h burn", "Unscented option"], suitability: "Executive and client festive gifting.",
    specs: [{ name: "Weight", value: "300", unit: "g" }, { name: "Burn time", value: "approx. 55 h" }], branding: laser,
    variants: [{ label: "Sandalwood", sku: "SND", options: { fragrance: "Sandalwood" } }, { label: "Unscented", sku: "UNS", options: { fragrance: "Unscented" } }],
    images: [{ id: "photo-1605651202774-7d573fd3f12d", alt: "White candle on a wooden table" }],
    offer: { moq: 50, inc: 25, lead: [12, 18], costRupees: 520, stock: 350 }, price: { mode: "from", tiers: [[50, 760]] } },

  /* ---------------- Home and lifestyle ---------------- */
  { key: "succulent-teal", vendor: "alpha", category: "home-and-lifestyle", terms: ["employees", "new-joiners", "onboarding", "remote-teams"],
    name: "Desk Succulent in Ceramic Pot", summary: "Live succulent in a 9 cm glazed ceramic pot with a care card — a desk companion that lasts.",
    description: "A live succulent (haworthia or echeveria, by availability) in a 9 cm glazed ceramic pot with a drainage saucer and a printed care card. Pot printed with a one-colour logo. Dispatched from regional nurseries to keep transit short; metro delivery only.",
    benefits: ["Live plant, low maintenance", "Glazed pot, one-colour print", "Care card included"], suitability: "New-joiner desks and remote-team kits.",
    specs: [{ name: "Pot", value: "9", unit: "cm" }, { name: "Plant", value: "Succulent, by availability" }], branding: ["pad_print"], limitations: "Metro delivery only; species varies by season.",
    variants: [{ label: "Teal pot", sku: "TEL", options: { colour: "Teal" } }, { label: "White pot", sku: "WHT", options: { colour: "White" } }],
    images: [{ id: "photo-1485955900006-10f4d324d411", alt: "Succulent in a teal ceramic pot" }, { id: "photo-1621274220348-41dc235ff439", alt: "Green plant in a white ceramic pot" }],
    offer: { moq: 50, inc: 10, lead: [7, 10], costRupees: 260, mode: "made_to_order" }, price: { mode: "from", tiers: [[50, 390]] } },

  { key: "planter-trio", vendor: "alpha", category: "home-and-lifestyle", terms: ["clients", "employees", "festive-gifting", "client-appreciation"],
    name: "Mini Planter Trio", summary: "Three mini succulents in two-tone ceramic planters on a wooden tray.",
    description: "Three assorted mini succulents in 6 cm two-tone ceramic planters, set on a small wooden tray. Tray engraved with a logo. Regional nursery dispatch; metro delivery only.",
    benefits: ["Three plants on one tray", "Engraved wooden tray", "Two-tone ceramic"], suitability: "Festive and appreciation gifting.",
    specs: [{ name: "Planters", value: "3 × 6 cm" }, { name: "Tray", value: "Wood" }], branding: laser, limitations: "Metro delivery only.",
    variants: [{ label: "Blush & white", sku: "BLW", options: { colour: "Blush & white" } }],
    images: [{ id: "photo-1527642220350-24155bae0505", alt: "Three succulents in two-tone ceramic planters" }],
    offer: { moq: 25, inc: 5, lead: [7, 12], costRupees: 640, mode: "made_to_order" }, price: { mode: "indicative", tiers: [[25, 920]] } },

  { key: "umbrella", vendor: "beta", category: "home-and-lifestyle", terms: ["employees", "clients", "event-attendees", "conferences"],
    name: "Auto-Open Compact Umbrella", summary: "Auto-open compact umbrella with a fibreglass frame and a printed panel or two.",
    description: "A three-fold auto-open umbrella with a fibreglass frame, 190T pongee canopy and a rubberised handle. Screen print on one or two panels; full-canopy print at volume.",
    benefits: ["Auto open", "Fibreglass frame resists inversion", "Panel or full-canopy print"], suitability: "Monsoon gifting, events and client kits.",
    specs: [{ name: "Canopy", value: "97", unit: "cm" }, { name: "Folds", value: "3" }, { name: "Frame", value: "Fibreglass" }], branding: print,
    variants: [{ label: "Black", sku: "BLK", options: { colour: "Black" } }, { label: "Sky blue", sku: "SKY", options: { colour: "Sky blue" } }],
    images: [{ id: "photo-1604560353366-28e44ad06afe", alt: "Blue umbrella against a white sky" }, { id: "photo-1549882657-c5d2b3ecf5ee", alt: "Black umbrella" }],
    offer: { moq: 100, inc: 50, lead: [12, 18], costRupees: 290, stock: 1500 }, price: { mode: "from", tiers: [[100, 440], [500, 395]] } },
];

export interface DemoKit {
  slug: string;
  name: string;
  summary: string;
  description: string;
  benefits: string[];
  suitability: string;
  terms: string[];
  packaging: { name: string; dimensionsMm: [number, number, number] };
  assemblyMode: "assembled" | "separate";
  components: Array<{ productKey: string; variantIndex?: number; units?: number }>;
  branding: string[];
  image: { id: string; alt: string };
  priceRupees: number;
  moqKits: number;
}

export const DEMO_KITS: DemoKit[] = [
  { slug: "new-joiner-essentials-kit", name: "New Joiner Essentials Kit", summary: "Insulated bottle, A5 notebook, rollerball and a stoneware mug in a kraft mailer — day-one desks, sorted.",
    description: "A four-piece welcome kit: the 750 ml matte insulated bottle, the hardcover A5 notebook, the brushed steel rollerball and the matte black stoneware mug, packed in a kraft mailer box with a welcome-card slot. Assembled and dispatched together under a single branding brief.",
    benefits: ["Four everyday items", "Assembled together", "Single branding brief across components"], suitability: "New joiners in office and hybrid teams.",
    terms: ["new-joiners", "onboarding"], packaging: { name: "Kraft mailer box", dimensionsMm: [320, 240, 120] }, assemblyMode: "assembled",
    components: [{ productKey: "bottle-matte" }, { productKey: "notebook-a5" }, { productKey: "pen-rollerball" }, { productKey: "mug-stoneware" }], branding: ["laser_engraving", "debossing", "ceramic_transfer"],
    image: { id: "photo-1595246135406-803418233494", alt: "Kraft mailer box with tissue paper, lid set aside" }, priceRupees: 1690, moqKits: 50 },
  { slug: "remote-work-kit", name: "Remote Work Kit", summary: "Tech organiser, 10,000 mAh power bank, wired headset and a desk succulent for teams that work from anywhere.",
    description: "A remote-team kit: the tech organiser pouch, the slim 10,000 mAh power bank, the USB-C wired headset and a desk succulent, packed in a printed mailer. Plants are dispatched separately from nurseries; the rest ships assembled.",
    benefits: ["Practical for home offices", "Plant adds a personal touch", "Ships to individual addresses"], suitability: "Remote and hybrid teams; onboarding at a distance.",
    terms: ["remote-teams", "onboarding", "employees"], packaging: { name: "Printed mailer box", dimensionsMm: [300, 220, 100] }, assemblyMode: "separate",
    components: [{ productKey: "organiser-tech" }, { productKey: "powerbank-10k" }, { productKey: "headphones-wired" }, { productKey: "succulent-teal" }], branding: ["laser_engraving", "woven_label", "pad_print"],
    image: { id: "photo-1710846529592-270f9784ad72", alt: "Cardboard box filled with assorted items" }, priceRupees: 3190, moqKits: 25 },
  { slug: "festive-indulgence-hamper", name: "Festive Indulgence Hamper", summary: "Dry fruit box, 25-piece chocolates, loose-leaf tea set and an amber candle in a rigid gift box.",
    description: "A festive hamper: the four-compartment dry fruit box, the 25-piece chocolate box, the loose-leaf tea discovery box and a soy candle in amber glass, arranged in a rigid two-piece gift box with tissue and a printed card. Assembled to order; insulated dispatch for chocolates in warm months.",
    benefits: ["Four premium consumables", "Rigid gift box with tissue", "Printed greeting card included"], suitability: "Diwali and year-end gifting for clients and employees.",
    terms: ["festive-gifting", "clients", "employees"], packaging: { name: "Rigid two-piece gift box", dimensionsMm: [400, 300, 150] }, assemblyMode: "assembled",
    components: [{ productKey: "dryfruit-box" }, { productKey: "chocolate-25" }, { productKey: "tea-box" }, { productKey: "candle-amber" }], branding: ["sleeve_print", "box_print", "label_print"],
    image: { id: "photo-1764764138587-189f22804ec4", alt: "Kraft gift parcel tied with string and a wax seal" }, priceRupees: 4290, moqKits: 25 },
  { slug: "conference-delegate-kit", name: "Conference Delegate Kit", summary: "Canvas tote, spiral notebook, stylus pen and a 500 ml colour-pop bottle — everything a delegate carries.",
    description: "A delegate kit: the heavy canvas tote, the kraft spiral notebook, the twist ballpoint with stylus tip and the 500 ml colour-pop bottle. Packed into the tote itself, so there is no extra box. Colours can be split by event track.",
    benefits: ["Packed into the tote", "Colour-coding by track", "Low unit cost at volume"], suitability: "Conferences, summits and offsites.",
    terms: ["event-attendees", "conferences"], packaging: { name: "Packed in tote", dimensionsMm: [380, 420, 100] }, assemblyMode: "assembled",
    components: [{ productKey: "tote-canvas" }, { productKey: "notebook-spiral" }, { productKey: "pen-metal-blue" }, { productKey: "bottle-pastel" }], branding: ["screen_print", "laser_engraving"],
    image: { id: "photo-1574365569389-a10d488ca3fb", alt: "Natural canvas tote bag" }, priceRupees: 1090, moqKits: 250 },
  { slug: "executive-appreciation-set", name: "Executive Appreciation Set", summary: "Linen journal, black lacquer fountain pen and a ceramic-coated bottle in a hinged presentation box.",
    description: "An executive set: the linen-bound A5 journal, the black lacquer fountain pen and the 600 ml ceramic-coated bottle, presented in a hinged rigid box with a foam insert and a foil-stamped card. Assembled to order.",
    benefits: ["Three considered pieces", "Foil-stamped card", "Hinged presentation box"], suitability: "Client appreciation, board gifts and long-service awards.",
    terms: ["executives", "clients", "client-appreciation", "work-anniversaries"], packaging: { name: "Hinged rigid box", dimensionsMm: [360, 260, 110] }, assemblyMode: "assembled",
    components: [{ productKey: "journal-linen" }, { productKey: "pen-fountain" }, { productKey: "bottle-white" }], branding: ["foil_stamping", "laser_engraving"],
    image: { id: "photo-1620080207549-60efab274c16", alt: "Black and gold fountain pen" }, priceRupees: 3990, moqKits: 20 },
];
