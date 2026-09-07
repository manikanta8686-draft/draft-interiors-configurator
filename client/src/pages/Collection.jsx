import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight } from "../components/Icons";
import { categories, sofaModels } from "../data/sofas";
import { collectionFabricIds, getFabricById } from "../data/fabrics";
import { revealTransition } from "../motion/premiumMotion";

const collectionFabricNames = collectionFabricIds.map((id) =>
  getFabricById(id).name
);

export default function Collection() {
  const [filter, setFilter] = useState("All");

  const [selectedImages, setSelectedImages] = useState({});
  const [lightboxImage, setLightboxImage] = useState(null);

  const visible = useMemo(
    () =>
      filter === "All"
        ? sofaModels
        : sofaModels.filter((sofa) => sofa.category === filter),
    [filter]
  );

  return (
    <main className="collection-page mood-product">
      <div className="page-intro">
        <p className="eyebrow">THE SOFA COLLECTION</p>
        <h1>
          Made for the way
          <br />
          <em>you live.</em>
        </h1>
        <p>
          Verified Draft Interiors designs, photographed in our showroom with
          confirmed dimensions. Contact us for current pricing.
        </p>
      </div>

      <div
        className="collection-filters"
        aria-label="Filter sofas by category"
      >
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            aria-pressed={filter === category}
            className={filter === category ? "selected" : ""}
            onClick={() => setFilter(category)}
          >
            {category}
          </button>
        ))}
      </div>

      <section className="collection-grid single-product" aria-live="polite">
        {visible.map((sofa, index) => {
          const currentImage =
            selectedImages[sofa.id] || sofa.gallery[0];

          return (
            <motion.article
              className="sofa-product"
              key={sofa.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={revealTransition(Math.min(index * 0.04, 0.32))}
            >
              <div className="product-gallery">
                <img
                  className="product-gallery-main"
                  src={currentImage.src}
                  alt={currentImage.alt}
                  onClick={() => setLightboxImage(currentImage.src)}
                />

                <div className="product-gallery-secondary">
                  {sofa.gallery.map((photo) => (
                    <img
                      key={photo.src}
                      src={photo.src}
                      alt={photo.alt}
                      className={
                        currentImage.src === photo.src
                          ? "gallery-thumb active"
                          : "gallery-thumb"
                      }
                      onClick={() =>
                        setSelectedImages((prev) => ({
                          ...prev,
                          [sofa.id]: photo,
                        }))
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="product-copy">
                <p className="eyebrow">{sofa.category}</p>

                <h2>{sofa.name}</h2>

                <p>{sofa.description}</p>

                <dl>
                  <div>
                    <dt>Pricing</dt>
                    <dd>Contact for pricing</dd>
                  </div>

                  <div>
                    <dt>
                      {sofa.openDimensions
                        ? "Closed dimensions"
                        : "Dimensions"}
                    </dt>
                    <dd>{sofa.dimensions}</dd>
                  </div>

                  {sofa.openDimensions && (
                    <div>
                      <dt>Open-bed dimensions</dt>
                      <dd>{sofa.openDimensions}</dd>
                    </div>
                  )}
                </dl>

                <p className="fabric-note">
                  {collectionFabricNames.join(" · ")}
                </p>

                {sofa.configuratorReady ? (
                  <Link
                    className="configure-link"
                    to={`/configurator?model=${sofa.id}`}
                  >
                    Configure <ArrowUpRight />
                  </Link>
                ) : (
                  <Link className="configure-link" to="/contact">
                    Enquire about {sofa.name} <ArrowUpRight />
                  </Link>
                )}
              </div>
            </motion.article>
          );
        })}
      </section>

      {lightboxImage && (
        <div
          className="lightbox"
          onClick={() => setLightboxImage(null)}
        >
          <img src={lightboxImage} alt="" />
        </div>
      )}
    </main>
  );
}
