// Keep the established internal ID so existing saved configurations and
// enquiry records continue to resolve after the public product rename.
export const sofaModels = Object.freeze([
  Object.freeze({
    id: "the-mercer",
    name: "Butterfly",
    legacyNames: Object.freeze(["The Mercer"]),
    category: "3 Seater",
    price: 40000,
    description: "Soft button-tufted back cushions, slim wraparound arms and elegant matte-black blade legs.",
    image: "/images/butterfly/butterfly-studio-front.png",
    gallery: Object.freeze([
      Object.freeze({ src: "/images/butterfly/butterfly-studio-front.png", alt: "Butterfly sofa front three-quarter view" }),
      Object.freeze({ src: "/images/butterfly/butterfly-studio-alternate.png", alt: "Butterfly sofa alternate front three-quarter view" }),
      Object.freeze({ src: "/images/butterfly/butterfly-studio-side.png", alt: "Butterfly sofa curved arm and side profile" }),
      Object.freeze({ src: "/images/butterfly/butterfly-studio-opposite-side.png", alt: "Butterfly sofa opposite arm and side profile" }),
      Object.freeze({ src: "/images/butterfly/butterfly-studio-rear.png", alt: "Butterfly sofa upholstered rear shell" }),
    ]),
    sizes: Object.freeze(["220 × 95 cm", "260 × 95 cm", "300 × 105 cm"]),
    dimensions: "220 × 95 cm",
    configuratorReady: true,
  }),
  Object.freeze({
    id: "nova",
    name: "Nova",
    category: "Sofa Cum Bed",
    price: 47999,
    description: "A refined three-fold sofa-cum-bed with softly curved upholstered arms and a generous sleep surface for overnight comfort.",
    image: "/images/nova/edited/nova-front-studio.jpg",
    gallery: Object.freeze([
      Object.freeze({ src: "/images/nova/edited/nova-front-studio.jpg", alt: "Nova sofa-cum-bed in its closed sofa position" }),
      Object.freeze({ src: "/images/nova/edited/nova-open-studio.jpg", alt: "Nova three-fold sofa-cum-bed fully opened" }),
      Object.freeze({ src: "/images/nova/edited/nova-closed-angle-studio.jpg", alt: "Nova closed sofa form viewed from above" }),
      Object.freeze({ src: "/images/nova/edited/nova-rear-studio.jpg", alt: "Nova sofa-cum-bed rear view" }),
      Object.freeze({ src: "/images/nova/edited/nova-cushions-studio.jpg", alt: "Nova sofa-cum-bed with patterned back cushions" }),
    ]),
    sizes: Object.freeze(["183 × 94 × 83 cm"]),
    dimensions: "183 × 94 × 83 cm",
    openDimensions: "183 × 188 cm",
    configuratorReady: false,
  }),
  Object.freeze({
    id: "aston",
    name: "Aston",
    category: "Sofa Cum Bed",
    price: 37999,
    description: "A feature-rich three-seater sofa-cum-bed with adjustable headrests, twin cup holders, refined gold accents and a generous pull-out sleep surface.",
    image: "/images/aston/edited/aston-front-studio.jpg",
    gallery: Object.freeze([
      Object.freeze({ src: "/images/aston/edited/aston-front-studio.jpg", alt: "Aston three-seater sofa-cum-bed in its closed position" }),
      Object.freeze({ src: "/images/aston/edited/aston-open-angle-studio.jpg", alt: "Aston sofa-cum-bed opened from a high side angle" }),
      Object.freeze({ src: "/images/aston/edited/aston-open-rear-studio.jpg", alt: "Aston sofa-cum-bed opened with its rear support system visible" }),
      Object.freeze({ src: "/images/aston/edited/aston-cushion-detail-studio.jpg", alt: "Aston geometric cushion stitching and gold accent detail" }),
      Object.freeze({ src: "/images/aston/edited/aston-cupholder-detail-studio.jpg", alt: "Aston integrated black cup holder detail" }),
    ]),
    sizes: Object.freeze(["220 × 95 cm"]),
    dimensions: "220 × 95 cm",
    openDimensions: "220 × 188 cm",
    configuratorReady: false,
  }),
  Object.freeze({
    id: "aspen",
    name: "Aspen",
    category: "4 Seater Lounge",
    price: 59999,
    description: "A generous four-seater lounge sofa with supportive high-back cushioning, tailored tufting and a relaxed chaise for everyday comfort.",
    image: "/images/aspen/edited/aspen-three-quarter-studio.jpg",
    gallery: Object.freeze([
      Object.freeze({ src: "/images/aspen/edited/aspen-three-quarter-studio.jpg", alt: "Aspen four-seater lounge sofa in a front three-quarter view" }),
      Object.freeze({ src: "/images/aspen/edited/aspen-front-studio.jpg", alt: "Aspen four-seater lounge sofa viewed from the front" }),
      Object.freeze({ src: "/images/aspen/edited/aspen-side-studio.jpg", alt: "Aspen lounge sofa from the side showing its high-back cushioning" }),
    ]),
    sizes: Object.freeze(["Custom sizes available"]),
    dimensions: "Custom sizes available",
    configuratorReady: false,
     }),

    


Object.freeze({
    id: "regalia",

    name: "Regalia",

    category: "3 Seater",

    price: 49999, // Change this to whatever selling price you want


    description:
        "A luxurious three-seater sofa featuring premium velvet upholstery, signature lion accents, elegant gold detailing, adjustable headrests and handcrafted comfort.",

    image: "/images/regalia/regalia-three-seater.png",

    gallery: Object.freeze([
        Object.freeze({
            src: "/images/regalia/regalia-three-seater.png",
            alt: "Regalia three-seater sofa"
        }),
        Object.freeze({
            src: "/images/regalia/regalia-full-set.png",
            alt: "Regalia complete sofa set"
        }),
        Object.freeze({
            src: "/images/regalia/regalia-single-chair.png",
            alt: "Regalia lounge chair"
        }),
        Object.freeze({
            src: "/images/regalia/regalia-ottoman.png",
            alt: "Regalia ottoman"
        })
    ]),

    sizes: Object.freeze([
        "Customised Sizes Available"
    ]),

    dimensions: "Customised Sizes Available",

    configuratorReady: false,
}),
]);

// Only verified products with real photography and confirmed pricing belong
// in the public collection.
export const categories = Object.freeze(["All", "3 Seater", "Sofa Cum Bed", "4 Seater Lounge"]);
