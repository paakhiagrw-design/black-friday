import { openDatabase } from './open.mjs';
import { prepareDemo } from './demo.mjs';
const database = openDatabase();


const customers = [
  ['Aoife Byrne', 'aoife.byrne@example.test', 53.3498, -6.2603, '12 Cedar Lane, Dublin 2'],
  ['Cian Murphy', 'cian.murphy@example.test', 53.3438, -6.2546, '8 Mercer Street, Dublin 2'],
  ['Niamh Kelly', 'niamh.kelly@example.test', 53.3561, -6.2644, '41 North Circular Road, Dublin 7'],
  ['Finn O’Connor', 'finn.oconnor@example.test', 53.3339, -6.2489, '27 Sandymount Avenue, Dublin 4'],
  ['Saoirse Walsh', 'saoirse.walsh@example.test', 53.3617, -6.2824, '6 Phibsborough Road, Dublin 7'],
  ['Eoin Doyle', 'eoin.doyle@example.test', 53.3285, -6.2675, '19 Rathmines Road, Dublin 6'],
  ['Clodagh Ryan', 'clodagh.ryan@example.test', 53.3722, -6.2754, '15 Drumcondra Road, Dublin 9'],
  ['Ronan Gallagher', 'ronan.gallagher@example.test', 53.3194, -6.2308, '3 Blackrock Park, Blackrock, Dublin'],
  ['Mairead Nolan', 'mairead.nolan@example.test', 53.2921, -6.1348, '22 Main Street, Dún Laoghaire, Dublin'],
  ['Tadhg Brennan', 'tadhg.brennan@example.test', 53.3903, -6.2356, '9 Malahide Road, Dublin 17'],
  ['Orla Fitzgerald', 'orla.fitzgerald@example.test', 53.3047, -6.2223, '18 Dundrum Road, Dublin 14'],
  ['Dara McCarthy', 'dara.mccarthy@example.test', 53.3472, -6.2891, '50 James Street, Dublin 8'],
  ['Gráinne Quinn', 'grainne.quinn@example.test', 53.3801, -6.3058, '7 Ballymun Road, Dublin 11'],
  ['Oisín Kennedy', 'oisin.kennedy@example.test', 53.3263, -6.2981, '24 Harold’s Cross Road, Dublin 6W'],
  ['Éabha Murray', 'eabha.murray@example.test', 53.3572, -6.2238, '14 Clontarf Road, Dublin 3'],
  ['Luca Hayes', 'luca.hayes@example.test', 53.4014, -6.1761, '5 Sutton Cross, Dublin 13'],
  ['Róisín Burke', 'roisin.burke@example.test', 53.2868, -6.3621, '31 Main Street, Tallaght, Dublin 24'],
  ['Fionn O’Shea', 'fionn.oshea@example.test', 53.2945, -6.2467, '10 Stillorgan Road, Dublin 18'],
  ['Aisling Ward', 'aisling.ward@example.test', 53.3658, -6.3372, '16 Blanchardstown Road, Dublin 15'],
  ['Conor Healy', 'conor.healy@example.test', 53.4352, -6.2194, '2 Main Street, Swords, County Dublin'],
];

const products = [
  ['RR-AUD-001', 'Wireless Noise-Cancelling Headphones', 'Over-ear Bluetooth headphones with 30-hour battery life.', 12999, 'https://images.example.test/headphones.jpg'],
  ['RR-HOM-002', 'Ceramic Pour-Over Set', 'Stoneware dripper and matching 600 ml carafe.', 4599, 'https://images.example.test/pourover.jpg'],
  ['RR-TEC-003', 'Compact USB-C Hub', 'Seven-port aluminium hub with HDMI and card reader.', 6999, 'https://images.example.test/hub.jpg'],
  ['RR-BAG-004', 'Everyday Canvas Backpack', 'Water-resistant 18-litre backpack with laptop sleeve.', 7499, 'https://images.example.test/backpack.jpg'],
  ['RR-KIT-005', 'Stainless Steel Cookware Set', 'Three-piece induction-ready stainless steel pan set.', 15999, 'https://images.example.test/cookware.jpg'],
  ['RR-LGT-006', 'Adjustable Desk Lamp', 'Dimmable LED lamp with a weighted metal base.', 5299, 'https://images.example.test/lamp.jpg'],
  ['RR-FIT-007', 'Yoga Mat', 'Non-slip 5 mm natural rubber exercise mat.', 3999, 'https://images.example.test/yogamat.jpg'],
  ['RR-OUT-008', 'Insulated Water Bottle', '750 ml stainless steel bottle with leakproof lid.', 2799, 'https://images.example.test/bottle.jpg'],
  ['RR-BOO-009', 'Mechanical Keyboard', 'Tenkeyless hot-swappable keyboard with tactile switches.', 10999, 'https://images.example.test/keyboard.jpg'],
  ['RR-HOM-010', 'Wool Blend Throw', 'Soft, responsibly sourced wool blend throw blanket.', 8999, 'https://images.example.test/throw.jpg'],
];

// id, customer_id, product_id, payment, fulfilment, consent; one-item MVP orders
const orders = [
  [1, 1, 1, 'paid', 'delivered', 0], [2, 2, 1, 'paid', 'unfulfilled', 1],
  [3, 3, 2, 'paid', 'delivered', 0], [4, 4, 3, 'paid', 'unfulfilled', 0],
  [5, 5, 4, 'paid', 'delivered', 1], [6, 6, 5, 'paid', 'unfulfilled', 1],
  [7, 7, 6, 'paid', 'delivered', 0], [8, 8, 7, 'paid', 'unfulfilled', 1],
  [9, 9, 8, 'paid', 'delivered', 0], [10, 10, 9, 'paid', 'unfulfilled', 1],
  [11, 11, 10, 'paid', 'delivered', 0], [12, 12, 1, 'paid', 'unfulfilled', 1],
  [13, 13, 2, 'paid', 'delivered', 0], [14, 14, 3, 'paid', 'unfulfilled', 1],
  [15, 15, 4, 'paid', 'delivered', 0], [16, 16, 5, 'paid', 'unfulfilled', 1],
  [17, 17, 6, 'paid', 'delivered', 0], [18, 18, 7, 'paid', 'unfulfilled', 1],
  [19, 19, 8, 'paid', 'delivered', 0], [20, 20, 9, 'paid', 'unfulfilled', 1],
  [21, 1, 10, 'paid', 'delivered', 0], [22, 2, 10, 'paid', 'unfulfilled', 1],
  [23, 3, 3, 'paid', 'delivered', 0], [24, 4, 4, 'paid', 'unfulfilled', 1],
  [25, 5, 5, 'paid', 'delivered', 0], [26, 6, 6, 'pending', 'unfulfilled', 1],
  [27, 7, 6, 'paid', 'unfulfilled', 0], [28, 8, 7, 'paid', 'unfulfilled', 1],
  [29, 9, 9, 'paid', 'delivered', 0], [30, 10, 10, 'paid', 'unfulfilled', 1],
];

const returns = [
  [1, 1, 'Ordered the wrong colour', 'like_new', 'verified', 'Packaging opened; product complete and in excellent condition.', 'matched', 'approved', 500],
  [2, 3, 'No longer needed', 'unopened', 'verified', 'Seal intact; the nearby unfulfilled order is a different SKU.', 'requested', 'pending', 0],
  [3, 5, 'Arrived with a cracked buckle', 'damaged', 'failed', 'Photo confirms damage outside the eligible resale condition.', 'rejected', 'denied', 0],
  [4, 7, 'Colour differs from room lighting', 'good', 'verified', 'Product is saleable; nearest same-SKU order has not consented.', 'requested', 'pending', 0],
  [5, 9, 'Duplicate gift', 'unopened', 'verified', 'Unopened item; no matching buyer within the local radius.', 'approved', 'pending', 300],
];

const seed = database.transaction(() => {
  const insertCustomer = database.prepare(`INSERT OR IGNORE INTO customers (id,name,email,latitude,longitude,address) VALUES (?,?,?,?,?,?)`);
  customers.forEach((row, index) => insertCustomer.run(index + 1, ...row));

  const insertProduct = database.prepare(`INSERT OR IGNORE INTO products (id,sku,name,description,price,image_url) VALUES (?,?,?,?,?,?)`);
  products.forEach((row, index) => insertProduct.run(index + 1, ...row));

  const insertOrder = database.prepare(`INSERT OR IGNORE INTO orders (id,customer_id,product_id,quantity,payment_status,fulfillment_status,reroute_consent,created_at) VALUES (?,?,?,1,?,?,?,datetime('now', ?))`);
  orders.forEach(([id, customerId, productId, payment, fulfillment, consent], index) =>
    insertOrder.run(id, customerId, productId, payment, fulfillment, consent, `-${30 - index} days`));

  const insertReturn = database.prepare(`INSERT OR IGNORE INTO returns (id,order_id,reason,condition,verification_status,verification_notes,return_status,refund_status,reward_amount,created_at) VALUES (?,?,?,?,?,?,?,?,?,datetime('now', ?))`);
  returns.forEach(([id, orderId, reason, condition, verification, notes, status, refund, reward], index) =>
    insertReturn.run(id, orderId, reason, condition, verification, notes, status, refund, reward, `-${5 - index} days`));

  // Same SKU, paid and unfulfilled, consented, and about 0.7 km from return #1.
  database.prepare(`INSERT OR IGNORE INTO matches (id,return_id,buyer_order_id,distance_km,traditional_cost,reroute_cost,savings,match_status,created_at) VALUES (1,1,2,0.7,1200,450,750,'proposed',datetime('now'))`).run();
  database.prepare(`INSERT OR IGNORE INTO deliveries (id,match_id,tracking_code,delivery_status) VALUES (1,1,'RR-DEMO-0001','pending')`).run();
});

try {
  seed.immediate();
  prepareDemo(database);
  console.log('Demo data seeded (existing records preserved).');
} finally {
  database.close();
}
