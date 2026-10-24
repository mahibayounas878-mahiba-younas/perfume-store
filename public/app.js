const $ = s => document.querySelector(s);
const money = n => 'PKR ' + n.toLocaleString('en-PK');
const FAMILIES = ['All', 'Woody', 'Floral', 'Fresh', 'Oriental'];
let products = [];
let family = 'All';
let cart = JSON.parse(localStorage.getItem('cart') || '[]'); // [{id, qty}]

$('#year').textContent = new Date().getFullYear();

async function loadProducts() {
  const params = new URLSearchParams({ family, q: $('#search').value.trim() });
  const res = await fetch('/api/fragrances?' + params);
  products = await res.json();
  renderGrid();
}

function renderFilters() {
  $('#filters').innerHTML = FAMILIES.map(f =>
    `<button class="chip border border-[#cfc7e0] rounded-full px-4 py-1.5 text-sm font-medium bg-white" data-f="${f}" aria-pressed="${f === family}">${f}</button>`
  ).join('');
}

function renderGrid() {
  if (!products.length) {
    $('#grid').innerHTML = '<p class="col-span-full">No fragrances match your search. Try a different note or family.</p>';
    return;
  }
  $('#grid').innerHTML = products.map(p => `
    <article class="bg-white rounded-3xl overflow-hidden shadow-sm flex flex-col">
      <img src="${p.image}" alt="${p.name} perfume bottle" class="w-full aspect-[4/5] object-cover" loading="lazy" />
      <div class="p-5 flex-1 flex flex-col">
        <p class="text-sm text-[var(--rose)] font-bold">${p.family}</p>
        <h3 class="display text-2xl font-bold">${p.name}</h3>
        <p class="text-sm mt-1">${p.notes.join(', ')}</p>
        <p class="text-sm mt-2 opacity-80 flex-1">${p.description}</p>
        <div class="flex items-center justify-between mt-4">
          <span class="font-bold">${money(p.price)} <span class="font-normal text-sm opacity-70">/ ${p.size}</span></span>
          <button class="btn" data-add="${p.id}">Add to cart</button>
        </div>
      </div>
    </article>`).join('');
}

function saveCart() { localStorage.setItem('cart', JSON.stringify(cart)); renderCart(); }

async function renderCart() {
  const all = await (await fetch('/api/fragrances')).json();
  const rows = cart.map(c => ({ ...c, p: all.find(p => p.id === c.id) })).filter(r => r.p);
  $('#cart-count').textContent = rows.reduce((s, r) => s + r.qty, 0);
  $('#cart-total').textContent = money(rows.reduce((s, r) => s + r.qty * r.p.price, 0));
  $('#cart-items').innerHTML = rows.length ? rows.map(r => `
    <div class="flex gap-4 items-center">
      <img src="${r.p.image}" alt="" class="w-16 h-20 object-cover rounded-xl" />
      <div class="flex-1">
        <p class="font-bold">${r.p.name}</p>
        <p class="text-sm">${money(r.p.price)}</p>
        <div class="flex items-center gap-2 mt-1">
          <button class="btn-outline !py-0 !px-3" data-dec="${r.id}" aria-label="Decrease quantity">-</button>
          <span>${r.qty}</span>
          <button class="btn-outline !py-0 !px-3" data-inc="${r.id}" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <button class="text-sm underline" data-remove="${r.id}">Remove</button>
    </div>`).join('') : '<p>Your cart is empty. Add a fragrance to get started.</p>';
}

function change(id, delta) {
  const item = cart.find(c => c.id === id);
  if (!item) cart.push({ id, qty: 1 });
  else { item.qty += delta; if (item.qty <= 0) cart = cart.filter(c => c.id !== id); }
  saveCart();
}

const drawer = open => $('#cart').classList.toggle('translate-x-full', !open);
const modal = open => { $('#modal').classList.toggle('hidden', !open); $('#modal').classList.toggle('flex', open); };

document.addEventListener('click', e => {
  const t = e.target;
  if (t.dataset.f) { family = t.dataset.f; renderFilters(); loadProducts(); }
  if (t.dataset.add) { change(t.dataset.add, 1); drawer(true); }
  if (t.dataset.inc) change(t.dataset.inc, 1);
  if (t.dataset.dec) change(t.dataset.dec, -1);
  if (t.dataset.remove) { cart = cart.filter(c => c.id !== t.dataset.remove); saveCart(); }
});
$('#open-cart').onclick = () => drawer(true);
$('#close-cart').onclick = () => drawer(false);
$('#checkout').onclick = () => { if (cart.length) { drawer(false); modal(true); } };
$('#cancel-order').onclick = () => modal(false);

let timer;
$('#search').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(loadProducts, 250); });

$('#order-form').addEventListener('submit', async e => {
  e.preventDefault();
  const customer = Object.fromEntries(new FormData(e.target));
  const msg = $('#form-msg');
  msg.textContent = 'Placing your order...';
  try {
    const res = await fetch('/api/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer, items: cart })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    cart = []; saveCart(); e.target.reset();
    msg.textContent = `Order ${data.id} placed. Total ${money(data.total)}, pay on delivery.`;
    setTimeout(() => { modal(false); msg.textContent = ''; }, 3500);
  } catch (err) {
    msg.textContent = err.message || 'Something went wrong. Please try again.';
  }
});

renderFilters(); loadProducts(); renderCart();
