"use client";
import { useState } from "react";
import type { Assessment, ReturnView } from "@/lib/operations/types";
import {
  Badge,
  Empty,
  EvidenceImage,
  Icon,
  Loading,
  Notice,
  Shell,
  Stat,
  human,
  money,
  post,
  s,
  stamp,
  useFeed,
} from "./ui";

export default function VerificationWorkspace() {
  const feed = useFeed<{ returns: ReturnView[] }>("/api/verification");
  const [selected, setSelected] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const returns = feed.data?.returns ?? [];
  const filtered = returns.filter(
    (r) =>
      (filter === "all" ||
        (filter === "review"
          ? r.verification_status === "pending"
          : r.return_status === filter)) &&
      `${r.id} ${r.sku} ${r.product_name} ${r.customer_name} ${r.reason}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const current = filtered.find((r) => r.id === selected) ?? filtered[0];
  return (
    <Shell
      active="verification"
      title="Verification workspace"
      subtitle="Every return deserves a closer look. Make the next move with confidence."
      onRefresh={feed.refresh}
      loading={feed.loading}
    >
      <div className={s.stats}>
        <Stat
          label="Awaiting decision"
          value={returns.filter((r) => r.return_status === "requested").length}
          detail="Incoming return requests"
          icon="clock"
        />
        <Stat
          label="Approved for rerouting"
          value={
            returns.filter((r) =>
              ["approved", "matched", "in_transit", "completed"].includes(
                r.return_status,
              ),
            ).length
          }
          detail="Seller-approved returns"
          icon="shield"
        />
        <Stat
          label="Needs review"
          value={
            returns.filter((r) => r.verification_status === "pending").length
          }
          detail="Verification pending"
          icon="scan"
        />
        <Stat
          label="Return requests"
          value={returns.length}
          detail="Across your workspace"
          icon="box"
        />
      </div>
      {feed.error && <Notice error>{feed.error}</Notice>}
      {feed.loading ? (
        <Loading />
      ) : (
        <div className={s.verificationGrid}>
          <section
            className={`${s.panel} ${s.queue}`}
            aria-label="Return queue"
          >
            <div className={s.panelHead}>
              <h2>
                Return queue <span className={s.count}>{filtered.length}</span>
              </h2>
              <span className={s.smallLabel}>10s sync</span>
            </div>
            <div className={s.queueTools}>
              <label className={s.search}>
                <Icon name="search" size={17} />
                <input
                  aria-label="Search returns"
                  placeholder="Search returns or SKU…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <div className={s.filters}>
                {[
                  ["all", "All returns"],
                  ["requested", "Incoming"],
                  ["review", "Review"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    aria-pressed={filter === key}
                    className={filter === key ? s.filterActive : ""}
                    onClick={() => setFilter(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className={s.queueList}>
              {filtered.map((r) => (
                <button
                  key={r.id}
                  className={`${s.queueItem} ${current?.id === r.id ? s.queueSelected : ""}`}
                  onClick={() => setSelected(r.id)}
                  aria-pressed={current?.id === r.id}
                >
                  <div className={s.queueProduct}>
                    <EvidenceImage
                      key={r.catalogue_image}
                      url={r.catalogue_image}
                      label="Catalogue image"
                      small
                    />
                    <div>
                      <span className={s.mono}>
                        RET-{String(r.id).padStart(4, "0")}
                      </span>
                      <strong>{r.product_name}</strong>
                    </div>
                  </div>
                  <div className={s.queueMeta}>
                    <span>{r.customer_name}</span>
                    <span>{money(r.price)}</span>
                  </div>
                  <p>{r.reason}</p>
                  <div className={s.queueMeta}>
                    <span className={s.mono}>{r.sku}</span>
                    <Badge value={r.verification_status} />
                  </div>
                </button>
              ))}
              {!filtered.length && (
                <Empty
                  title="Queue is clear"
                  detail="Try a different search or filter. New returns appear automatically."
                />
              )}
            </div>
          </section>
          {current ? (
            <VerificationDetail
              key={current.id}
              item={current}
              refresh={feed.refresh}
            />
          ) : (
            <section className={s.panel}>
              <Empty
                title="No return selected"
                detail="Choose a return from the queue to review its evidence."
              />
            </section>
          )}
        </div>
      )}
    </Shell>
  );
}
function VerificationDetail({
  item: r,
  refresh,
}: {
  item: ReturnView;
  refresh: () => Promise<void>;
}) {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [busy, setBusy] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [scanRun, setScanRun] = useState(0);
  const editable =
    ["requested", "approved"].includes(r.return_status) && !r.active_match;
  async function act(action: string) {
    if (busy) return;
    setBusy(action);
    setError("");
    setMessage("");
    try {
      if (action === "scan") {
        setScanRun((v) => v + 1);
        const result = await post<{ assessment: Assessment }>(
          "/api/verification",
          { returnId: r.id, action },
        );
        setAssessment(result.assessment);
      } else {
        await post("/api/verification", { returnId: r.id, action, notes });
        setMessage(
          action === "approve"
            ? "Approved. This return is ready for the matching team."
            : action === "reject"
              ? "Excluded from local rerouting. Refund eligibility was not changed."
              : "Further inspection requested. This return is pending review.",
        );
        await refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed.");
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <section className={`${s.panel} ${s.detail}`}>
        <div className={s.panelHead}>
          <h2>Product evidence</h2>
          <span className={s.mono}>RET-{String(r.id).padStart(4, "0")}</span>
        </div>
        <div className={s.detailBody}>
          <div className={s.productHeading}>
            <span className={s.eyebrow}>{r.sku}</span>
            <h2>{r.product_name}</h2>
            <div className={s.row}>
              <Badge value={r.return_status} />
              <span className={s.muted}>{money(r.price)} original value</span>
            </div>
          </div>
          <div className={s.comparison}>
            <EvidenceImage
              key={`catalogue-${r.id}`}
              url={r.catalogue_image}
              label="Catalogue image"
            />
            <EvidenceImage
              key={`return-${r.id}`}
              url={r.image_url}
              label="Return evidence"
              scan={busy === "scan"}
              scanRun={scanRun}
            />
          </div>
          <div className={s.evidenceCaption}>
            <Icon name="image" size={16} />
            <span>
              Compare visible details. Photographs cannot confirm internal
              condition or authenticity.
            </span>
          </div>
          <div className={s.detailSection}>
            <h3>Return details</h3>
            <dl className={s.detailList}>
              <div>
                <dt>Customer</dt>
                <dd>{r.customer_name}</dd>
              </div>
              <div>
                <dt>Reported condition</dt>
                <dd>{human(r.condition)}</dd>
              </div>
              <div>
                <dt>Order reference</dt>
                <dd className={s.mono}>
                  ORD-{String(r.order_id).padStart(4, "0")}
                </dd>
              </div>
              <div>
                <dt>Requested</dt>
                <dd>{stamp(r.created_at)}</dd>
              </div>
            </dl>
            <div className={s.quote}>
              <span>Reason for return</span>
              <p>“{r.reason}”</p>
            </div>
          </div>
          <details className={s.disclosure}>
            <summary>Catalogue description & previous notes</summary>
            <p>{r.description}</p>
            <span className={s.smallLabel}>Previous verification note</span>
            <p>{r.verification_notes || "No notes recorded."}</p>
            <small>
              Imported notes are historical seller records; they are not
              findings from this scan.
            </small>
          </details>
        </div>
      </section>
      <aside className={`${s.panel} ${s.assessment}`}>
        <div className={s.panelHead}>
          <h2>
            <Icon name="sparkle" />
            Vision Scan
          </h2>
          <span className={`${s.badge} ${s.blue}`}>DEMO</span>
        </div>
        <div className={s.assessmentBody}>
          <div className={`${s.scanOrb} ${busy === "scan" ? s.orbBusy : ""}`}>
            <Icon name="scan" size={36} />
          </div>
          <h3>Clarity before the next step.</h3>
          <p className={s.muted}>
            Check evidence readiness and review the return before making a
            decision.
          </p>
          <button
            className={s.scanButton}
            onClick={() => void act("scan")}
            disabled={!!busy}
          >
            <Icon name={busy === "scan" ? "refresh" : "scan"} />
            {busy === "scan"
              ? "Checking supplied records…"
              : assessment
                ? "Run verification again"
                : "Run verification"}
          </button>
          <p className={s.finePrint}>
            Deterministic demo · No vision model connected.
            <br />
            No visual analysis or confidence score is generated.
          </p>
          {assessment && (
            <div className={s.findings} aria-live="polite">
              <div className={s.eyebrow}>ASSESSMENT FINDINGS</div>
              {assessment.findings.map((f, i) => (
                <div
                  key={f.label}
                  className={s.finding}
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <Icon
                    name={f.tone === "warning" ? "alert" : "scan"}
                    size={17}
                  />
                  <div>
                    <strong>{f.label}</strong>
                    <p>{f.detail}</p>
                  </div>
                </div>
              ))}
              <div className={s.recommendation}>
                <strong>Recommended next step</strong>
                <p>{assessment.recommendation}</p>
              </div>
            </div>
          )}
          <div className={s.decision}>
            <div className={s.eyebrow}>SELLER DECISION</div>
            {editable ? (
              <>
                <label className={s.field}>
                  Decision notes
                  <textarea
                    value={notes}
                    maxLength={2000}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Record your review and reason for this decision…"
                    rows={3}
                  />
                </label>
                <button
                  className={s.primary}
                  disabled={
                    !!busy ||
                    notes.trim().length < 3 ||
                    r.condition === "damaged"
                  }
                  onClick={() => void act("approve")}
                >
                  <Icon name="check" />
                  {busy === "approve" ? "Approving…" : "Approve for rerouting"}
                </button>
                <div className={s.buttonPair}>
                  <button
                    className={s.secondary}
                    disabled={!!busy || notes.trim().length < 3}
                    onClick={() => void act("review")}
                  >
                    Further inspection
                  </button>
                  <button
                    className={s.danger}
                    disabled={!!busy || notes.trim().length < 3}
                    onClick={() => void act("reject")}
                  >
                    Exclude
                  </button>
                </div>
                <p className={s.finePrint}>
                  Exclusion affects local rerouting only. It does not deny a
                  refund.
                </p>
              </>
            ) : (
              <div className={s.recommendation}>
                <strong>Decision recorded</strong>
                <p>
                  {r.active_match
                    ? "This return has an active match. Continue in Delivery to view its progress."
                    : "This return is closed for verification."}
                </p>
              </div>
            )}
          </div>
          {error && <Notice error>{error}</Notice>}
          {message && <Notice>{message}</Notice>}
        </div>
      </aside>
    </>
  );
}
