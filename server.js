const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const DATA = path.join(__dirname, 'data');
app.use(express.json());

const readJson = (file, fallback) => {
  try { return JSON.parse(fs.readFileSync(path.join(DATA, file), 'utf8')); }
  catch { return fallback; }
};

// GET /api/fragrances?family=Woody&q=oud
app.get('/api/fragrances', (req, res) => {
  let list = readJson('fragrances.json', []);
  const { family, q } = req.query;
  if (family && family !== 'All') list = list.filter(p => p.family === family);
  if (q) {
    const term = String(q).toLowerCase();
    list = list.filter(p => (p.name + ' ' + p.notes.join(' ')).toLowerCase().includes(term));
  }
  res.json(list);
});

app.get('/api/fragrances/:id', (req, res) => {
  const item = readJson('fragrances.json', []).find(p => p.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Fragrance not found.' });
  res.json(item);
});

// POST /api/orders  { customer: {name, phone, city, address}, items: [{id, qty}] }
app.post('/api/orders', (req, res) => {
  const { customer, items } = req.body || {};
  if (!customer || !customer.name || !customer.phone || !customer.city || !customer.address)
    return res.status(400).json({ error: 'Please fill in name, phone, city and address.' });
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: 'Your cart is empty.' });

  const catalog = readJson('fragrances.json', []);
  let total = 0;
  const lines = [];
  for (const it of items) {
    const p = catalog.find(x => x.id === it.id);
    const qty = Math.min(Math.max(parseInt(it.qty, 10) || 0, 1), 20);
    if (!p) return res.status(400).json({ error: 'Unknown item in cart.' });
    total += p.price * qty; // price always comes from the server
    lines.push({ id: p.id, name: p.name, qty, price: p.price });
  }
  const orders = readJson('orders.json', []);
  const order = { id: 'ORD-' + Date.now(), createdAt: new Date().toISOString(), customer, items: lines, total };
  orders.push(order);
  fs.writeFileSync(path.join(DATA, 'orders.json'), JSON.stringify(orders, null, 2));
  res.status(201).json({ id: order.id, total });
});

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Perfume store running at http://localhost:${PORT}`));
