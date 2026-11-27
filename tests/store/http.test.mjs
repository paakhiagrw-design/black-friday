import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
const base = process.env.STORE_TEST_URL;
// Run only against an isolated disposable seeded app: this test intentionally creates demo records.
test(
  "HTTP demo: photo return, ownership, duplicates, checkout and history",
  { skip: !base },
  async () => {
    const request = async (url, options = {}) => fetch(base + url, options);
    const select = async (id) => {
      const response = await request("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: id }),
      });
      assert.equal(response.status, 200);
      return response.headers.get("set-cookie").split(";")[0];
    };
    const a = await select(1),
      b = await select(2);
    const history = await (
      await request("/api/orders", { headers: { cookie: a } })
    ).json();
    const order = history.orders.find(
      (o) =>
        o.fulfillment_status === "delivered" &&
        o.payment_status === "paid" &&
        !o.return_id,
    );
    assert.ok(order);
    const photo = await sharp({
      create: { width: 64, height: 64, channels: 3, background: "#8a956f" },
    })
      .png()
      .toBuffer();
    function form(bytes = photo) {
      const data = new FormData();
      data.set("order_id", String(order.id));
      data.set("reason", "This item was a duplicate gift.");
      data.set("condition", "unopened");
      data.set("photo", new Blob([bytes], { type: "image/png" }), "item.png");
      return data;
    }
    assert.equal(
      (
        await request("/api/returns", {
          method: "POST",
          headers: { cookie: b },
          body: form(),
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await request("/api/returns", {
          method: "POST",
          headers: { cookie: a },
          body: form(Buffer.from("invalid image")),
        })
      ).status,
      400,
    );
    const submitted = await request("/api/returns", {
      method: "POST",
      headers: { cookie: a },
      body: form(),
    });
    assert.equal(submitted.status, 201);
    const result = await submitted.json();
    assert.equal(result.verification_status, "pending");
    assert.equal(
      (
        await request("/api/returns", {
          method: "POST",
          headers: { cookie: a },
          body: form(),
        })
      ).status,
      409,
    );
    const returns = await (
      await request("/api/returns", { headers: { cookie: a } })
    ).json();
    const saved = returns.returns.find((r) => r.id === result.id);
    const image = await request(saved.image_url);
    assert.equal(image.status, 200);
    assert.equal(image.headers.get("content-type"), "image/webp");
    assert.ok((await image.arrayBuffer()).byteLength > 0);
    const checkout = await request("/api/checkout", {
      method: "POST",
      headers: { cookie: b, "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ product_id: order.product_id, quantity: 2 }],
        consent: true,
      }),
    });
    assert.equal(checkout.status, 201);
    const placed = await checkout.json();
    assert.equal(placed.order_ids.length, 2);
    const orders = await (
      await request("/api/orders", { headers: { cookie: b } })
    ).json();
    for (const id of placed.order_ids) {
      const o = orders.orders.find((o) => o.id === id);
      assert.equal(o.product_id, order.product_id);
      assert.equal(o.reroute_consent, 1);
      assert.equal(o.payment_status, "paid");
      assert.equal(o.fulfillment_status, "unfulfilled");
      assert.equal(o.quantity, 1);
    }
    assert.equal((await request("/api/orders")).status, 401);
    console.log(
      `Verified Customer A #1 return #${result.id} with retrievable photo; Customer B #2 orders ${placed.order_ids.join(", ")} for ${order.sku}.`,
    );
  },
);
