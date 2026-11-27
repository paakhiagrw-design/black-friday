"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useStore } from "./store-context";
import { ProductImage } from "./product-image";
function ProductStory() {
  const { products } = useStore();
  const product = products.find((p) => p.sku === "RR-AUD-001") || products[0];
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = section.current;
    if (!element) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = matchMedia("(min-width: 900px)");
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = element.getBoundingClientRect();
      const progress = Math.max(
        0,
        Math.min(1, -rect.top / Math.max(1, rect.height - innerHeight)),
      );
      element.style.setProperty("--story-progress", String(progress));
      element.dataset.step = String(Math.min(2, Math.floor(progress * 3)));
    };
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const configure = () => {
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", scroll);
      cancelAnimationFrame(frame);
      frame = 0;
      if (!motion.matches && desktop.matches) {
        window.addEventListener("scroll", scroll, { passive: true });
        window.addEventListener("resize", scroll);
        update();
      } else {
        element.style.setProperty("--story-progress", "0");
        delete element.dataset.step;
      }
    };
    configure();
    motion.addEventListener("change", configure);
    desktop.addEventListener("change", configure);
    return () => {
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", scroll);
      motion.removeEventListener("change", configure);
      desktop.removeEventListener("change", configure);
      cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <section className="rip-story" ref={section} aria-labelledby="story-title">
      <div className="rip-story-visual">
        <div className="rip-story-image">
          {product ? (
            <ProductImage
              sku={product.sku}
              name={product.name}
              url={product.image_url}
              hero
            />
          ) : (
            <div className="rip-story-placeholder">
              Every object has a next chapter.
            </div>
          )}
        </div>
        <div className="rip-story-label">
          <span>{product?.name || "The everyday collection"}</span>
          <span>
            {product
              ? new Intl.NumberFormat("en-IE", {
                  style: "currency",
                  currency: "EUR",
                }).format(product.price / 100)
              : "RIP"}
          </span>
        </div>
      </div>
      <div className="rip-story-copy">
        <article>
          <span className="rr-store-eyebrow">ONE ITEM. MORE POSSIBILITY.</span>
          <h2 id="story-title">
            Still plenty
            <br />
            to give.
          </h2>
          <p>
            {product?.description ||
              "A useful item deserves another chance to be used."}
          </p>
          <p>A return doesn’t have to be the end of its story.</p>
        </article>
        <article>
          <span className="rr-store-eyebrow">VERIFIED BEFORE IT MOVES</span>
          <h2>
            Same item.
            <br />A new beginning.
          </h2>
          <p>
            The customer requests a return and shares a photo. Once the item is
            verified, RIP looks for someone nearby who ordered the same product
            and opted in.
          </p>
        </article>
        <article>
          <span className="rr-store-eyebrow">A SHORTER WAY FORWARD</span>
          <h2>
            Next stop:
            <br />a nearby home.
          </h2>
          <p>
            If there’s a suitable match, the item can go directly to its next
            buyer instead of travelling back to the warehouse.
          </p>
          <Link href="/store" className="rr-store-button">
            Find your everyday essential
          </Link>
        </article>
      </div>
    </section>
  );
}
export function IntroPage() {
  return (
    <div className="rip-intro-page">
      <section className="rip-opening">
        <div className="rip-opening-kicker">
          <span>RETURN. IN PROXIMITY.</span>
          <span>A NEW DIRECTION FOR EVERYDAY GOODS</span>
        </div>
        <h1>
          A return could be
          <br />
          someone else’s
          <br />
          <em>next order.</em>
        </h1>
        <div className="rip-opening-bottom">
          <Link className="rr-store-button" href="/store">
            Shop the collection
          </Link>
          <p>
            Good products. Shorter journeys.
            <br />A little closer to where they belong.
          </p>
        </div>
        <div className="rip-wordmark" aria-hidden="true">
          RIP<span>↻</span>
        </div>
      </section>
      <section className="rip-mission" aria-labelledby="mission-title">
        <span className="rr-store-eyebrow">THE IDEA IS SIMPLE</span>
        <div>
          <h2 id="mission-title">
            Keep the product.
            <br />
            Rethink the journey.
          </h2>
          <p>
            We want to reduce unnecessary shipping and keep perfectly good
            products moving. When a return is verified, RIP looks for a nearby
            buyer who ordered the same item and chose to receive a verified
            return. A suitable match gives that item a more direct route to its
            next home.
          </p>
        </div>
      </section>
      <section className="rip-journey" aria-label="How RIP works">
        <article>
          <span aria-hidden="true">↶</span>
          <h3>Request a return</h3>
          <p>
            Choose a delivered purchase, tell us why it’s coming back, and
            upload a photo.
          </p>
        </article>
        <span className="rip-journey-connector" aria-hidden="true">
          →
        </span>
        <article>
          <span aria-hidden="true">✓</span>
          <h3>Verify the item</h3>
          <p>
            Our team reviews the item’s condition before it can be considered
            for a new home.
          </p>
        </article>
        <span className="rip-journey-connector" aria-hidden="true">
          →
        </span>
        <article>
          <span aria-hidden="true">⌁</span>
          <h3>Match it nearby</h3>
          <p>
            RIP looks for a nearby, opted-in buyer waiting for the same product.
          </p>
        </article>
      </section>
      <ProductStory />
      <section className="rip-ending">
        <span className="rr-store-eyebrow">
          GOOD THINGS DESERVE TO KEEP GOING
        </span>
        <h2>
          Your next order.
          <br />A different kind of journey.
        </h2>
        <p>
          Explore the collection. At checkout, you can choose to receive a
          verified returned item if a suitable match is available.
        </p>
        <Link href="/store" className="rr-store-button">
          Shop the collection
        </Link>
        <Link href="/returns" className="rip-secondary-link">
          Already have something to return?
        </Link>
      </section>
    </div>
  );
}
