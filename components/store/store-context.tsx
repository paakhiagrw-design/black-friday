"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Customer, Product } from "@/lib/types";
import styles from "./store-styles";
import { ThemeToggle, useCustomerTheme } from "./theme-toggle";
export type CartLine = { product_id: number; quantity: number };
export async function api(url: string, options?: RequestInit) {
  const response = await fetch(url, { ...options, cache: "no-store" });
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error || "Unable to complete your request.");
  return body;
}
const Context = createContext<null | {
  products: Product[];
  customer: Customer | undefined;
  cart: CartLine[];
  setCart: (cart: CartLine[]) => void;
  busy: boolean;
  setBusy: (busy: boolean) => void;
}>(null);
export function useStore() {
  const value = useContext(Context);
  if (!value) throw new Error("Store provider missing");
  return value;
}
export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]),
    [customers, setCustomers] = useState<Customer[]>([]),
    [id, setId] = useState<number | null>(null),
    [cart, setCartState] = useState<CartLine[]>([]),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const pathname = usePathname();
  const theme = useCustomerTheme();
  function loadCart(customerId: number | null) {
    try {
      const data = JSON.parse(
        localStorage.getItem(`reroute-cart-${customerId}`) || "[]",
      );
      setCartState(
        Array.isArray(data)
          ? data.filter(
              (l) =>
                Number.isInteger(l.product_id) &&
                Number.isInteger(l.quantity) &&
                l.quantity > 0 &&
                l.quantity <= 10,
            )
          : [],
      );
    } catch {
      setCartState([]);
    }
  }
  useEffect(() => {
    let active = true;
    api("/api/products")
      .then((data) => {
        if (!active) return;
        setProducts(data.products);
        setCustomers(data.customers);
        setId(data.customer_id);
        loadCart(data.customer_id);
        setReady(true);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  function setCart(next: CartLine[]) {
    setCartState(next);
    try {
      localStorage.setItem(`reroute-cart-${id}`, JSON.stringify(next));
    } catch {
      setError("Your browser could not save this cart. Keep this tab open.");
    }
  }
  async function select(value: string) {
    setBusy(true);
    setError("");
    try {
      const data = await api("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: Number(value) }),
      });
      setId(data.customer_id);
      loadCart(data.customer_id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.shell} data-theme={theme}>
      <a className={styles.skip} href="#main">
        Skip to content
      </a>
      <div className={styles.topbar}>
        Good things deserve a longer story.{" "}
        <span>Thoughtfully selected. Locally rerouted.</span>
      </div>
      <header className={styles.header}>
        <Link
          href="/"
          className={styles.logo}
          aria-label="RIP — Return In Proximity Home"
        >
          RIP<span>↻</span>
        </Link>
        <nav aria-label="Shop navigation">
          {[
            ["/", "Our story"],
            ["/store", "Shop"],
            ["/orders", "Your orders"],
            ["/returns", "Returns"],
            ["/dashboard", "Seller dashboard"],
            ["/cart", `Bag (${cart.reduce((n, l) => n + l.quantity, 0)})`],
          ].map(([url, label]) => (
            <Link
              key={url}
              href={url}
              prefetch={url === "/dashboard" ? false : undefined}
              aria-current={pathname === url ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <label className={styles.customer}>
          Demo customer
          <select
            aria-label="Demo customer"
            value={id ?? ""}
            disabled={!ready || busy}
            onChange={(e) => select(e.target.value)}
          >
            <option value="" disabled>
              Choose a customer
            </option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <ThemeToggle />
      </header>
      {error && (
        <div className={styles.alert} role="alert">
          {error}{" "}
          {!ready && (
            <button onClick={() => location.reload()}>Try again</button>
          )}
        </div>
      )}
      <Context.Provider
        value={{
          products,
          customer: customers.find((c) => c.id === id),
          cart,
          setCart,
          busy,
          setBusy,
        }}
      >
        <main id="main" className={styles.main}>
          {!ready && pathname !== "/" && (
            <div className={styles.empty} role="status">
              Opening the collection…
            </div>
          )}
          <div key={id} hidden={!ready && pathname !== "/"}>
            {children}
          </div>
        </main>
      </Context.Provider>
      <footer className={styles.footer}>
        <Link href="/" className="rip-footer-brand">
          RIP<span>Return In Proximity</span>
        </Link>
        <p>The end of unnecessary returns.</p>
        <span>Dublin, Ireland · Demo store</span>
        <a href="/PHOTO-CREDITS.txt">Photo credits</a>
      </footer>
    </div>
  );
}
