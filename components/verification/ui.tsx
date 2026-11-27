"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import "./workspace.css";
// Explicitly namespaced classes keep the shared Turbopack CSS rule untouched.
export const s: Record<string, string> = Object.fromEntries(
  "app sidebar brand brandMark brandDot workspaceLabel profile workspaceAvatar chevron navLabel navItem navActive activeDot sidebarBottom network liveDot main topbar demoPill topMeta content pageHeading eyebrow primary secondary danger scanButton iconButton stats stat verificationGrid panel panelHead count smallLabel queueTools search filters filterActive queueList queueItem queueSelected queueProduct mono queueMeta badge green amber red blue detailBody productHeading row muted comparison evidenceImage imageMissing imageLabel corners thumb zoomButton scanLine scanning evidenceCaption detailSection detailList quote disclosure assessmentBody scanOrb orbBusy finePrint findings finding recommendation decision field select buttonPair notice noticeError empty skeleton footer modal modalHeader modalImage zoomed twoColumn stack deliveryCard deliveryTop metricRow routeCanvas routeHeader routeCaption routeLine participants methodChoices methodSelected fullWidth trackingRef progressTrack inspectionCheck panelPadding heroStatus timeline timelineItem timelineDone timelineNode timelineActive simulation refundAmount refundBreakdown successCheck receiptRef successPanel emptyStateLink operationalNote events alertBanner assessment detail queue"
    .split(" ")
    .map((key) => [key, `rip-${key}`]),
);
export const money = (value: number) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(
    value / 100,
  );
export const human = (value: string) => value.replaceAll("_", " ");
export const stamp = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-IE", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Europe/Dublin",
      }).format(
        new Date(value.includes("T") ? value : value.replace(" ", "T") + "Z"),
      )
    : "Not recorded";
export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    scan: (
      <>
        <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M4 12h16" />
        <path d="M8 8h8v8H8z" opacity=".35" />
      </>
    ),
    box: (
      <>
        <path d="m12 3 9 5-9 5-9-5 9-5Zm-9 5v9l9 5 9-5V8M12 13v9M7 5.8l9 5" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    shield: (
      <>
        <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    truck: (
      <>
        <path d="M3 5h12v12H3zM15 9h4l3 4v4h-7" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
      </>
    ),
    route: (
      <>
        <circle cx="5" cy="5" r="2" />
        <circle cx="19" cy="19" r="2" />
        <path d="M5 7v8a4 4 0 0 0 8 0V9a4 4 0 0 1 8 0v4" />
      </>
    ),
    search: (
      <>
        <circle cx="10" cy="10" r="6" />
        <path d="m15 15 5 5" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5" />
      </>
    ),
    expand: <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    copy: (
      <>
        <rect x="8" y="8" width="12" height="13" rx="2" />
        <path d="M16 8V3H3v13h5" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    sparkle: (
      <>
        <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" />
      </>
    ),
    image: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="8" cy="8" r="1" />
        <path d="m3 17 5-5 4 4 4-6 5 7" />
      </>
    ),
    alert: (
      <>
        <path d="m12 3 10 18H2L12 3Z" />
        <path d="M12 9v5m0 3h.01" />
      </>
    ),
    wallet: (
      <>
        <rect x="3" y="5" width="18" height="15" rx="3" />
        <path d="M3 9h18m-5 5h5" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.box}
    </svg>
  );
}
const nav = [
  ["verification", "scan", "Verification"],
  ["inspection", "shield", "Inspection"],
  ["delivery", "truck", "Delivery"],
  ["tracking", "route", "Tracking"],
];
export function Shell({
  active,
  title,
  subtitle,
  children,
  onRefresh,
  loading = false,
}: {
  active: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  onRefresh?: () => void;
  loading?: boolean;
}) {
  return (
    <div className={s.app}>
      <aside className={s.sidebar}>
        <Link
          href="/verification"
          className={s.brand}
          aria-label="RIP — Return In Proximity"
        >
          <span className={s.brandMark}>
            <Icon name="route" size={25} />
          </span>
          RIP<span className={s.brandDot}>®</span>
        </Link>
        <div className={s.workspaceLabel}>
          <span className={s.workspaceAvatar}>R</span>
          <div>
            Retail operations<small>Dublin workspace</small>
          </div>
        </div>
        <div className={s.navLabel}>OPERATIONS</div>
        <nav aria-label="Operations">
          {nav.map(([path, icon, label]) => (
            <Link
              key={path}
              href={`/${path}`}
              aria-current={active === path ? "page" : undefined}
              className={`${s.navItem} ${active === path ? s.navActive : ""}`}
            >
              <Icon name={icon} />
              {label}
              {active === path && <span className={s.activeDot} />}
            </Link>
          ))}
        </nav>
        <div className={s.sidebarBottom}>
          <div className={s.network}>
            <span className={s.liveDot} />
            Local demo environment
          </div>
          <p>
            The end of
            <br />
            unnecessary returns.
          </p>
          <div className={s.profile}>
            <span>OP</span>
            <div>
              Operations team<small>Seller workspace</small>
            </div>
          </div>
        </div>
      </aside>
      <div className={s.main}>
        <header className={s.topbar}>
          <div>
            Workspace <span>/</span> <strong>{title}</strong>
          </div>
          <div className={s.topMeta}>
            <span className={s.demoPill}>HACKATHON DEMO</span>
            <span>Dublin, IE</span>
          </div>
        </header>
        <main className={s.content}>
          <div className={s.pageHeading}>
            <div>
              <div className={s.eyebrow}>REVERSE LOGISTICS, REIMAGINED</div>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
            {onRefresh && (
              <button
                className={s.secondary}
                onClick={onRefresh}
                disabled={loading}
              >
                <Icon name="refresh" />
                Refresh
              </button>
            )}
          </div>
          {children}
        </main>
        <footer className={s.footer}>
          <span>RIP — Return In Proximity</span>
          <span>Courier and financial operations are simulated.</span>
        </footer>
      </div>
    </div>
  );
}
export function Badge({ value, tone }: { value: string; tone?: string }) {
  const kind =
    tone ??
    ([
      "verified",
      "approved",
      "passed",
      "delivered",
      "completed",
      "refunded",
      "accepted",
    ].includes(value)
      ? "green"
      : ["failed", "rejected", "denied"].includes(value)
        ? "red"
        : ["pending", "requested", "proposed", "collected"].includes(value)
          ? "amber"
          : "blue");
  return <span className={`${s.badge} ${s[kind]}`}>{human(value)}</span>;
}
export function Stat({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: number;
  detail: string;
  icon: string;
}) {
  const [shown, setShown] = useState(value);
  const previous = useRef(value);
  useEffect(() => {
    const start = previous.current;
    previous.current = value;
    let frame = 0;
    const time = performance.now();
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tick = (now: number) => {
      const progress = reduce ? 1 : Math.min((now - time) / 400, 1);
      setShown(Math.round(start + (value - start) * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return (
    <div className={s.stat}>
      <div>
        <span>{label}</span>
        <Icon name={icon} />
      </div>
      <strong>{shown.toString().padStart(2, "0")}</strong>
      <small>{detail}</small>
    </div>
  );
}
export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      role={error ? "alert" : "status"}
      className={`${s.notice} ${error ? s.noticeError : ""}`}
    >
      <Icon name={error ? "alert" : "check"} size={18} />
      <span>{children}</span>
    </div>
  );
}
export function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className={s.empty}>
      <Icon name="box" size={36} />
      <h3>{title}</h3>
      <p>{detail}</p>
    </div>
  );
}
export function Loading() {
  return (
    <div className={s.skeleton} role="status" aria-label="Loading workspace">
      <div />
      <div />
      <div />
    </div>
  );
}
export function useFeed<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const ticket = ++sequence.current;
    try {
      const r = await fetch(url, { cache: "no-store" });
      const result = await r.json();
      if (!r.ok)
        throw new Error(result.error ?? "Could not load this workspace.");
      if (mounted.current && ticket === sequence.current) {
        setData(result);
        setError("");
      }
    } catch (e) {
      if (mounted.current && ticket === sequence.current)
        setError(e instanceof Error ? e.message : "Connection failed.");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [url]);
  // This effect subscribes to network results; every state write in refresh follows an awaited fetch.
  useEffect(() => {
    mounted.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const timer = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 10000);
    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, [refresh]);
  return { data, error, loading, refresh };
}
export class OperationError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}
export async function post<T>(
  url: string,
  data: unknown,
  headers?: Record<string, string>,
): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok)
    throw new OperationError(result.error ?? "Operation failed.", response.status);
  return result;
}

export function EvidenceImage({
  url,
  label,
  scan = false,
  small = false,
}: {
  url: string;
  label: string;
  scan?: boolean;
  small?: boolean;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const available =
    !!url &&
    !url.includes(".example.test") &&
    failedUrl !== url &&
    /^(https?:\/\/|\/(?!\/))/.test(url);
  // Arbitrary customer evidence is rendered directly, with no server-side image proxy or host allowlist changes.
  const picture = available ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={label}
      onError={() => setFailedUrl(url)}
      referrerPolicy="no-referrer"
    />
  ) : (
    <div className={s.imageMissing}>
      <Icon name={small ? "box" : "image"} size={small ? 25 : 44} />
      {!small && (
        <>
          <strong>
            {label === "Catalogue image"
              ? "Catalogue image unavailable"
              : url ? "Return image unavailable" : "No return image supplied"}
          </strong>
          <span>
            {label === "Catalogue image"
              ? "A valid catalogue image will appear here."
              : "Evidence must be provided by the customer."}
          </span>
        </>
      )}
    </div>
  );
  return (
    <>
      <div
        className={`${s.evidenceImage} ${small ? s.thumb : ""} ${scan ? s.scanning : ""}`}
      >
        {picture}
        {!small && (
          <>
            <span className={s.imageLabel}>{label}</span>
            <div className={s.corners} />
            {available && (
              <button
                className={s.zoomButton}
                aria-label={`Inspect ${label}`}
                onClick={() => dialog.current?.showModal()}
              >
                <Icon name="expand" size={17} />
              </button>
            )}
            {scan && (
              <div className="rip-scanPreview" aria-hidden="true">
                <div className={s.scanLine} />
                <span>COMPARING IMAGES</span>
              </div>
            )}
          </>
        )}
      </div>
      {!small && (
      <dialog
        aria-label={`${label} inspection`}
          ref={dialog}
          className={s.modal}
          onClick={(e) => {
            if (e.target === e.currentTarget) dialog.current?.close();
          }}
        >
          <div className={s.modalHeader}>
            <h2>{label}</h2>
            <div className={s.row}>
              <button
                className={s.secondary}
                onClick={() => setZoom((v) => !v)}
              >
                {zoom ? "Fit image" : "Zoom 2×"}
              </button>
              <button
                className={s.iconButton}
                aria-label="Close image inspection"
                onClick={() => dialog.current?.close()}
              >
                <Icon name="close" />
              </button>
            </div>
          </div>
          <div className={`${s.modalImage} ${zoom ? s.zoomed : ""}`}>
            {picture}
          </div>
        </dialog>
      )}
    </>
  );
}
