/* eslint-disable @next/next/no-img-element -- Local upload previews use object URLs. */
"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Order, ReturnRequest, Product } from "@/lib/types";
import { api, useStore } from "./store-context";
import { ProductImage } from "./product-image";
import s from "./store-styles";
const money = (cents: number) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
const label = (value: string) => value.replaceAll("_", " ");
type OrderView = Omit<Order, "reroute_consent"> &
  Pick<Product, "name" | "sku" | "price" | "image_url"> & {
    reroute_consent: 0 | 1;
    return_id: number | null;
    return_status: string | null;
    delivery_status: string | null;
    tracking_code: string | null;
  };
type ReturnView = ReturnRequest & { name: string; sku: string };
function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className={s.alert} role="status">
      {children}
    </div>
  );
}
function Intro({
  tag,
  title,
  text,
}: {
  tag: string;
  title: string;
  text: string;
}) {
  return (
    <div className={s.intro}>
      <span className={s.eyebrow}>{tag}</span>
      <h1>{title}</h1>
      <p>{text}</p>
    </div>
  );
}
export function Catalogue() {
  const { products, customer, cart, setCart } = useStore();
  const [query, setQuery] = useState(""),
    [notice, setNotice] = useState("");
  const [category, setCategory] = useState("All products");
  const [sort, setSort] = useState("featured");
  const categories = [
    "All products",
    "Home & living",
    "Tech & audio",
    "On the go",
  ];
  const group = (sku: string) =>
    /RR-(AUD|TEC|BOO)-/.test(sku)
      ? "Tech & audio"
      : /RR-(BAG|FIT|OUT)-/.test(sku)
        ? "On the go"
        : "Home & living";
  const featured = products[0];
  const filtered = products
    .filter(
      (p) =>
        (category === "All products" || group(p.sku) === category) &&
        `${p.name} ${p.sku}`.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "low"
        ? a.price - b.price
        : sort === "high"
          ? b.price - a.price
          : a.id - b.id,
    );
  function add(product: Product) {
    if (!customer) {
      setNotice("Choose a demo customer above to start your bag.");
      return;
    }
    const line = cart.find((l) => l.product_id === product.id);
    if (line && line.quantity >= 10) {
      setNotice("Maximum 10 units per product.");
      return;
    }
    setCart(
      line
        ? cart.map((l) =>
            l.product_id === product.id
              ? { ...l, quantity: l.quantity + 1 }
              : l,
          )
        : [...cart, { product_id: product.id, quantity: 1 }],
    );
    setNotice(`${product.name} added to your bag.`);
  }
  return (
    <>
      <section className={s.hero}>
        <div className={s.heroCopy}>
          <span className={s.eyebrow}>EVERYDAY ESSENTIALS, RECONSIDERED</span>
          <h1>
            Better everyday.
            <br />
            <em>Less waste.</em>
          </h1>
          <div className={s.heroBottom}>
            <p>
              Objects to make the everyday better.
              <br />
              Chosen with care. Made to stay in use.
            </p>
            <a className={s.button} href="#collection">
              Shop the collection
            </a>
          </div>
        </div>
        {featured && (
          <div className={s.heroImage}>
            <ProductImage
              sku={featured.sku}
              name={featured.name}
              url={featured.image_url}
              hero
            />
            <div className={s.caption}>
              <span>IN FOCUS / {featured.name}</span>
              <span>{money(featured.price)}</span>
            </div>
          </div>
        )}
      </section>
      <div className={s.manifesto}>
        <div>
          <strong>Thoughtfully selected</strong>
          <span>Useful things for everyday living</span>
        </div>
        <div>
          <strong>A second chance</strong>
          <span>Opt in to verified returned items</span>
        </div>
        <div>
          <strong>Simple returns</strong>
          <span>Request and track everything online</span>
        </div>
      </div>
      <section id="collection">
        <div className={s.sectionHeading}>
          <h2>
            Shop the collection<span> ({filtered.length} products)</span>
          </h2>
          <label className={s.search}>
            Find your everyday essential
            <input
              placeholder="Search products or SKU"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
        <div className="rr-store-toolbar">
          <div className="rr-store-categories" aria-label="Product categories">
            {categories.map((c) => (
              <button
                key={c}
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <label>
            Sort by{" "}
            <select
              aria-label="Sort products"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="featured">Featured</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
            </select>
          </label>
        </div>
        {notice && (
          <Notice>
            {notice} <Link href="/cart">View bag</Link>
          </Notice>
        )}
        <div className={s.grid}>
          {filtered.map((p) => (
            <article key={p.id} className={s.product}>
              <div className={s.productImage}>
                <ProductImage sku={p.sku} name={p.name} url={p.image_url} />
                <span className={s.productTag}>{group(p.sku)}</span>
              </div>
              <div className={s.productTitle}>
                <h3>{p.name}</h3>
                <span>{money(p.price)}</span>
              </div>
              <p>{p.description}</p>
              <button className={s.add} onClick={() => add(p)}>
                {cart.some((l) => l.product_id === p.id)
                  ? "Add another"
                  : "Add to bag"}{" "}
                <span>+</span>
              </button>
            </article>
          ))}
        </div>
        {!filtered.length && (
          <div className={s.empty}>
            No products found.{" "}
            <button
              onClick={() => {
                setQuery("");
                setCategory("All products");
              }}
            >
              Clear search
            </button>
          </div>
        )}
      </section>
    </>
  );
}
export function Cart() {
  const { products, customer, cart, setCart, busy, setBusy } = useStore();
  const [consent, setConsent] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState<{ order_ids: number[]; total: number } | null>(
      null,
    );
  const lines = cart.map((l) => ({
    ...l,
    product: products.find((p) => p.id === l.product_id),
  }));
  const total = lines.reduce(
    (n, l) => n + (l.product?.price || 0) * l.quantity,
    0,
  );
  const intent = useRef<{ cart: string; key: string } | null>(null);
  async function checkout() {
    setBusy(true);
    setError("");
    try {
      const body = JSON.stringify({ items: cart, consent });
      const storageKey = 'rip-checkout-' + customer?.id;
      try {
        const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
        if (saved?.cart === body && typeof saved.key === 'string') intent.current = saved;
      } catch { /* Storage can be disabled in a private window. */ }
      if (intent.current?.cart !== body) intent.current = {cart: body, key: crypto.randomUUID()};
      try { sessionStorage.setItem(storageKey, JSON.stringify(intent.current)); } catch {}
      const result = await api("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": intent.current.key },
        body,
      });
      intent.current = null;
      try { sessionStorage.removeItem(storageKey); } catch {}
      setDone(result);
      setCart([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (done)
    return (
      <>
        <Intro
          tag="THANK YOU"
          title="A good choice."
          text={`Your simulated checkout is complete. ${money(done.total)} · ${done.order_ids.length} item(s). No payment was taken.`}
        />
        <Notice>
          Order reference(s): {done.order_ids.map((id) => `#${id}`).join(", ")}.
          Your order is paid and awaiting fulfilment.
        </Notice>
        <Link className={s.button} href="/orders">
          View your orders
        </Link>
      </>
    );
  return (
    <>
      <Intro
        tag="YOUR SELECTION"
        title="Your shopping bag"
        text="A few considered additions to your everyday."
      />
      {!customer ? (
        <Notice>Choose a demo customer above to continue.</Notice>
      ) : !cart.length ? (
        <div className={s.empty}>
          <h2>Your bag is waiting.</h2>
          <p>Find something you’ll love using every day.</p>
          <Link className={s.button} href="/store">
            Browse the collection
          </Link>
        </div>
      ) : (
        <div className={s.split}>
          <div>
            {lines.map((l) => (
              <article className={s.line} key={l.product_id}>
                <div className={s.thumb}>
                  {l.product && (
                    <ProductImage
                      sku={l.product.sku}
                      name={l.product.name}
                      url={l.product.image_url}
                    />
                  )}
                </div>
                <div>
                  <h3>{l.product?.name || "Unavailable product"}</h3>
                  <p>{money(l.product?.price || 0)} each</p>
                  <label>
                    Quantity{" "}
                    <input
                      className={s.quantity}
                      type="number"
                      min="1"
                      max="10"
                      value={l.quantity}
                      disabled={busy}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (Number.isInteger(n) && n >= 1 && n <= 10)
                          setCart(
                            cart.map((c) =>
                              c.product_id === l.product_id
                                ? { ...c, quantity: n }
                                : c,
                            ),
                          );
                      }}
                    />
                  </label>
                  <button
                    className={s.textButton}
                    disabled={busy}
                    onClick={() =>
                      setCart(cart.filter((c) => c.product_id !== l.product_id))
                    }
                  >
                    Remove
                  </button>
                </div>
                <strong>{money((l.product?.price || 0) * l.quantity)}</strong>
              </article>
            ))}
          </div>
          <aside className={s.panel}>
            <span className={s.eyebrow}>ORDER SUMMARY</span>
            <h2>Ready for its next chapter.</h2>
            <p>
              For {customer.name}
              <br />
              {customer.address}
            </p>
            <div className={s.total}>
              <span>Total</span>
              <strong>{money(total)}</strong>
            </div>
            <label className={s.consent}>
              <input
                type="checkbox"
                checked={consent}
                disabled={busy}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>
                I’m happy to receive a verified returned item.
                <small>
                  Optional. If a suitable item is nearby, RIP can give it a new
                  home with you.
                </small>
              </span>
            </label>
            {error && (
              <div role="alert" className={s.error}>
                {error}
              </div>
            )}
            <button
              className={s.button}
              disabled={busy || lines.some((l) => !l.product)}
              onClick={checkout}
            >
              {busy ? "Placing your order…" : "Place demo order"}
            </button>
            <small>Simulated checkout. No card details or real payments.</small>
          </aside>
        </div>
      )}
    </>
  );
}
function useHistory() {
  const { customer } = useStore();
  const [orders, setOrders] = useState<OrderView[]>([]),
    [returns, setReturns] = useState<ReturnView[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    if (!customer) return;
    Promise.all([api("/api/orders"), api("/api/returns")])
      .then(([o, r]) => {
        if (active) {
          setOrders(o.orders);
          setReturns(r.returns);
          setLoading(false);
          setError("");
        }
      })
      .catch((e) => {
        if (active) {
          setLoading(false);
          setError(e.message);
        }
      });
    return () => {
      active = false;
    };
  }, [customer, revision]);
  return {
    orders,
    returns,
    loading: !!customer && loading,
    error,
    refresh: () => setRevision((n) => n + 1),
  };
}
export function Orders() {
  const { customer } = useStore();
  const { orders, loading, error, refresh } = useHistory();
  return (
    <>
      <Intro
        tag="YOUR ACCOUNT"
        title="Your orders"
        text="Follow your purchases, check delivery progress, or give an item a new direction."
      />
      {!customer ? (
        <Notice>Choose a demo customer above to see their orders.</Notice>
      ) : loading ? (
        <Notice>Loading your orders…</Notice>
      ) : error ? (
        <Notice>
          {error} <button onClick={refresh}>Try again</button>
        </Notice>
      ) : !orders.length ? (
        <div className={s.empty}>
          No orders yet. <Link href="/store">Shop the collection</Link>
        </div>
      ) : (
        orders.map((o) => (
          <article className={s.order} key={o.id}>
            <div className={s.orderMeta}>
              <span>
                ORDER #{o.id} · {o.created_at.slice(0, 10)}
              </span>
              <span className={s.badge}>{label(o.fulfillment_status)}</span>
            </div>
            <div className={s.line}>
              <div className={s.thumb}>
                <ProductImage sku={o.sku} name={o.name} url={o.image_url} />
              </div>
              <div>
                <h3>{o.name}</h3>
                <p>
                  {o.sku} · {money(o.price)} · {label(o.payment_status)}
                </p>
                <p>
                  {o.reroute_consent
                    ? "Open to a verified returned item"
                    : "Standard fulfilment"}
                </p>
                {o.delivery_status && (
                  <p>
                    Delivery: {label(o.delivery_status)}{" "}
                    {o.tracking_code && `· ${o.tracking_code}`}
                  </p>
                )}
              </div>
              {o.return_id ? (
                <Link className={s.outline} href="/returns">
                  Return {label(o.return_status || "requested")}
                </Link>
              ) : o.fulfillment_status === "delivered" &&
                o.payment_status === "paid" ? (
                <Link className={s.outline} href={`/returns?order=${o.id}`}>
                  Request a return
                </Link>
              ) : (
                <small>Returns available after delivery</small>
              )}
            </div>
          </article>
        ))
      )}
    </>
  );
}
export function Returns() {
  const { customer, busy, setBusy } = useStore();
  const { orders, returns, loading, error, refresh } = useHistory();
  const searchParams = useSearchParams();
  const [chosenOrder, setOrder] = useState<string | null>(null),
    [message, setMessage] = useState(""),
    [failure, setFailure] = useState(""),
    [preview, setPreview] = useState("");
  const order = chosenOrder ?? searchParams.get("order") ?? "";
  const eligible = orders.filter(
    (o) =>
      o.fulfillment_status === "delivered" &&
      o.payment_status === "paid" &&
      !o.return_id,
  );
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setFailure("");
    try {
      const result = await api("/api/returns", {
        method: "POST",
        body: new FormData(form),
      });
      setMessage(
        `Return #${result.id} received. Your photo is saved and verification is pending.`,
      );
      form.reset();
      setOrder("");
      setPreview("");
      refresh();
    } catch (e) {
      setFailure((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Intro
        tag="A NEW DIRECTION"
        title="Returns & requests"
        text="Tell us about your item. We’ll review its condition and keep you updated here."
      />
      {!customer ? (
        <Notice>Choose a demo customer above to manage returns.</Notice>
      ) : loading ? (
        <Notice>Loading your purchases…</Notice>
      ) : error ? (
        <Notice>
          {error} <button onClick={refresh}>Try again</button>
        </Notice>
      ) : (
        <>
          {message && <Notice>{message}</Notice>}
          <div className={s.split}>
            <section>
              <h2>Start a return</h2>
              {!eligible.length ? (
                <div className={s.empty}>
                  No eligible purchases. Returns are available for paid,
                  delivered orders without an existing request.{" "}
                  <Link href="/orders">View orders</Link>
                </div>
              ) : (
                <form className={s.form} onSubmit={submit}>
                  <label>
                    Your purchase
                    <select
                      name="order_id"
                      required
                      value={
                        eligible.some((o) => String(o.id) === order)
                          ? order
                          : ""
                      }
                      disabled={busy}
                      onChange={(e) => setOrder(e.target.value)}
                    >
                      <option value="">Select a delivered item</option>
                      {eligible.map((o) => (
                        <option key={o.id} value={o.id}>
                          #{o.id} · {o.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Reason for returning
                    <textarea
                      name="reason"
                      required
                      minLength={5}
                      maxLength={1000}
                      rows={4}
                      disabled={busy}
                      placeholder="Tell us why this item didn’t work out…"
                    />
                  </label>
                  <label>
                    Item condition
                    <select
                      name="condition"
                      required
                      defaultValue=""
                      disabled={busy}
                    >
                      <option value="" disabled>
                        Select a condition
                      </option>
                      {["unopened", "like_new", "good", "fair", "damaged"].map(
                        (c) => (
                          <option key={c} value={c}>
                            {label(c)}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  <label className={s.upload}>
                    A clear photo of your item
                    <small>JPG, PNG or WebP · maximum 5 MB</small>
                    <input
                      type="file"
                      name="photo"
                      accept="image/jpeg,image/png,image/webp"
                      required
                      disabled={busy}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        setPreview(file ? URL.createObjectURL(file) : "");
                      }}
                    />
                    {preview && (
                      <img src={preview} alt="Your selected return photo" />
                    )}
                  </label>
                  {failure && (
                    <div className={s.error} role="alert">
                      {failure}
                    </div>
                  )}
                  <button className={s.button} disabled={busy}>
                    {busy ? "Submitting your return…" : "Submit return request"}
                  </button>
                  <small>
                    We’ll review your request before confirming the next steps.
                  </small>
                </form>
              )}
            </section>
            <aside className={s.panel}>
              <span className={s.eyebrow}>WHAT HAPPENS NEXT</span>
              <h2>A better way back.</h2>
              <h3>Share your item</h3>
              <p>
                Choose your purchase and add a clear photo showing its
                condition.
              </p>
              <h3>We take a look</h3>
              <p>Your request goes to our verification team for review.</p>
              <h3>Find a new direction</h3>
              <p>
                Eligible items can be rerouted to a nearby buyer. Follow your
                progress below.
              </p>
            </aside>
          </div>
          <div className={s.sectionHeading}>
            <h2>Your return requests</h2>
            <button className={s.outline} onClick={refresh}>
              Refresh status
            </button>
          </div>
          {!returns.length ? (
            <p>No return requests yet.</p>
          ) : (
            returns.map((r) => (
              <article className={s.order} key={r.id}>
                <div className={s.orderMeta}>
                  <span>
                    RETURN #{r.id} / ORDER #{r.order_id}
                  </span>
                  <span className={s.badge}>{label(r.return_status)}</span>
                </div>
                <h3>{r.name}</h3>
                <p>{r.reason}</p>
                <p>
                  Condition: {label(r.condition)} · Verification:{" "}
                  {label(r.verification_status)} · Refund:{" "}
                  {label(r.refund_status)}
                </p>
                {r.verification_notes && <p>{r.verification_notes}</p>}
                {r.image_url && (
                  <a href={r.image_url} target="_blank" rel="noreferrer">
                    View submitted photo
                  </a>
                )}
              </article>
            ))
          )}
        </>
      )}
    </>
  );
}
