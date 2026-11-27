// Add the presentation orders only to the fictional Dublin fixture.
export function prepareDemo(db) {
  const people = ["aoife.byrne@example.test", "niamh.kelly@example.test"].map(
    (email) => db.prepare("SELECT id FROM customers WHERE email=?").get(email),
  );
  if (people.some((person) => !person)) return;
  db.transaction(() => {
    // Replace only the historical seed placeholders. Retailer-supplied references take precedence.
    const references = [
      "headphones",
      "pourover",
      "hub",
      "backpack",
      "cookware",
      "lamp",
      "yogamat",
      "bottle",
      "keyboard",
      "throw",
    ];
    const replace = db.prepare(
      "UPDATE products SET image_url=? WHERE image_url=?",
    );
    for (const slug of references)
      replace.run(
        "/catalogue/" + slug + ".webp",
        "https://images.example.test/" + slug + ".jpg",
      );
    const sku = "RR-TEC-PI4";
    db.prepare(
      `INSERT INTO products(sku,name,description,price,image_url)
      VALUES (?, 'Raspberry Pi 4 Model B', 'Single-board computer with dual micro-HDMI and USB ports.', 6500, '/demo/pi-top.webp')
      ON CONFLICT(sku) DO NOTHING`,
    ).run(sku);
    const product = db.prepare("SELECT id FROM products WHERE sku=?").get(sku);
    for (const person of people) {
      db.prepare(
        `INSERT INTO orders(customer_id, product_id, payment_status, fulfillment_status)
        SELECT ?, ?, 'paid', 'delivered' WHERE NOT EXISTS
        (SELECT 1 FROM orders WHERE customer_id=? AND product_id=?)`,
      ).run(person.id, product.id, person.id, product.id);
    }
  }).immediate();
}
