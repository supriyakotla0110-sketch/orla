const dishes = [
  { name: "Market plate", note: "Avocado, tomato, chickpea, and a cold herb cream.", price: "18" },
  { name: "Garden bowl", note: "Tomato, carrot, cucumber, and radish.", price: "16" },
  { name: "Herb farfalle", note: "Basil pasta, torn tomato, and a bright leaf.", price: "17" },
  { name: "Chickpea bowl", note: "Fig, olive, pepper, and yogurt.", price: "19" },
  { name: "Roasted plate", note: "Carrot, sprout, zucchini, and quinoa.", price: "14" },
];

const handKeys = [
  { t: 0.0, v: 1 },
  { t: 0.7, v: 2 },
  { t: 1.0, v: 3 },
  { t: 1.35, v: 5 },
  { t: 3.15, v: 5.4 },
  { t: 3.7, v: 6 },
  { t: 5.15, v: 6.6 },
  { t: 5.7, v: 2.2 },
  { t: 6.55, v: 5 },
  { t: 7.15, v: 1.2 },
];

const dishKeys = [
  { t: 0.0, v: 0 },
  { t: 0.7, v: 1 },
  { t: 1.0, v: 4 },
  { t: 1.35, v: 2 },
  { t: 3.55, v: 3 },
  { t: 5.45, v: 1 },
  { t: 6.45, v: 2 },
  { t: 7.05, v: 0 },
];

const LOOP = 7.6;

const stage = document.getElementById("stage");
const hand = document.getElementById("hand");
const menu = document.getElementById("menu");
const rows = [...menu.querySelectorAll("li")];
const pickable = rows.filter((row) => row.dataset.dish != null);
const plates = [...document.querySelectorAll(".plate")];
const live = document.getElementById("live");
const playToggle = document.getElementById("playToggle");
const replay = document.getElementById("replay");
const scrubber = document.getElementById("scrubber");
const scrubFill = document.getElementById("scrubFill");
const sheet = document.getElementById("sheet");
const note = document.getElementById("note");

let time = 0;
let playing = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let scrubbing = false;
let last = performance.now();
let shown = -1;

function ease(u) {
  return u * u * (3 - 2 * u);
}

function sample(keys, t) {
  const ext = keys.map((k) => ({ ...k }));
  ext.push({ t: keys[0].t + LOOP, v: keys[0].v });
  let i = 0;
  for (let k = 0; k < ext.length - 1; k += 1) {
    if (ext[k].t <= t) i = k;
  }
  const a = ext[i];
  const b = ext[i + 1];
  const span = b.t - a.t || 1;
  const u = Math.min(1, Math.max(0, (t - a.t) / span));
  return a.v + (b.v - a.v) * ease(u);
}

function dishAt(t) {
  let current = dishKeys[0].v;
  dishKeys.forEach((key) => {
    if (key.t <= t + 0.001) current = key.v;
  });
  return current;
}

function held(keys, t) {
  const ext = keys.concat([{ t: keys[0].t + LOOP, v: keys[0].v }]);
  let i = 0;
  for (let k = 0; k < ext.length - 1; k += 1) {
    if (ext[k].t <= t) i = k;
  }
  const a = ext[i];
  const b = ext[i + 1];
  const span = b.t - a.t || 1;
  const local = t - a.t;
  const glide = Math.min(0.32, span * 0.45);
  if (local < span - glide) return a.v;
  const u = (local - (span - glide)) / glide;
  return a.v + (b.v - a.v) * ease(u);
}

function placeHand(rowFloat) {
  const max = rows.length - 1;
  const clamped = Math.min(max, Math.max(0, rowFloat));
  const index = Math.floor(clamped);
  const frac = clamped - index;
  const a = rows[index];
  const b = rows[Math.min(max, index + 1)];
  const y = a.offsetTop + (b.offsetTop - a.offsetTop) * frac + a.offsetHeight * 0.5;
  const tip = hand.getBoundingClientRect().height * 0.406;
  hand.style.transform = `translate3d(0, ${y - tip}px, 0)`;
  rows.forEach((row) => row.classList.remove("on"));
  const marked = rows[Math.round(clamped)] || a;
  if (marked && marked.dataset.dish != null) marked.classList.add("on");
  else if (a.dataset.dish != null) a.classList.add("on");
}

const nowName = document.getElementById("nowName");
const nowNote = document.getElementById("nowNote");
const nowPrice = document.getElementById("nowPrice");
const thumbs = [...document.querySelectorAll(".thumb")];

function showDish(id) {
  plates.forEach((plate) => {
    plate.classList.toggle("show", Number(plate.dataset.plate) === id);
  });
  const dish = dishes[id];
  if (!dish || id === shown) return;
  shown = id;
  live.textContent = dish.name;
  if (nowName) nowName.textContent = dish.name;
  if (nowNote) nowNote.textContent = dish.note;
  if (nowPrice) nowPrice.textContent = dish.price;
  thumbs.forEach((thumb) => thumb.classList.toggle("on", Number(thumb.dataset.dish) === id));
  if (typeof paintOrder === "function") paintOrder();
}

function render(t) {
  placeHand(held(handKeys, t));
  showDish(dishAt(t));
  const pct = (t / LOOP) * 100;
  scrubFill.style.width = `${pct}%`;
  if (!scrubbing) scrubber.value = String(Math.round((t / LOOP) * 1000));
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (playing && !scrubbing) time = (time + dt) % LOOP;
  render(time);
  requestAnimationFrame(frame);
}

function setPlaying(next) {
  playing = next;
  document.body.classList.toggle("is-paused", !playing);
  const label = playing ? "Pause" : "Play";
  playToggle.setAttribute("aria-label", label);
  const playLabel = document.getElementById("playLabel");
  if (playLabel) playLabel.textContent = label;
  replay.hidden = true;
}

playToggle.addEventListener("click", (event) => {
  event.stopPropagation();
  setPlaying(!playing);
});

replay.addEventListener("click", (event) => {
  event.stopPropagation();
  setPlaying(true);
});

stage.addEventListener("click", (event) => {
  if (event.target.closest(".menu, .reel-head, .scrub, .replay")) return;
  setPlaying(!playing);
});

function jumpToDish(dish) {
  const hit = dishKeys.find((key) => key.v === dish);
  time = hit ? hit.t : 0;
  render(time);
  setPlaying(false);
}

pickable.forEach((row) => {
  row.addEventListener("click", (event) => {
    event.stopPropagation();
    jumpToDish(Number(row.dataset.dish));
  });
});

thumbs.forEach((thumb) => {
  thumb.addEventListener("click", () => jumpToDish(Number(thumb.dataset.dish)));
});

scrubber.addEventListener("pointerdown", () => {
  scrubbing = true;
});

function seekFromInput() {
  time = (Number(scrubber.value) / 1000) * LOOP;
  render(time);
}

scrubber.addEventListener("input", seekFromInput);
window.addEventListener("pointerup", () => {
  scrubbing = false;
});

window.addEventListener("keydown", (event) => {
  if (event.target.matches("input, select")) return;
  if (event.code === "Space") {
    event.preventDefault();
    setPlaying(!playing);
  }
  if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
    const dir = event.key === "ArrowRight" ? 1 : -1;
    const order = [0, 1, 2, 3];
    const current = dishAt(time);
    const next = order[(order.indexOf(current) + dir + order.length) % order.length];
    const hit = dishKeys.find((key) => key.v === next);
    time = hit ? hit.t : 0;
    render(time);
  }
});

document.getElementById("reserveOpen").addEventListener("click", (event) => {
  event.stopPropagation();
  note.textContent = "";
  setPlaying(false);
  sheet.showModal();
});

document.getElementById("sheetClose").addEventListener("click", () => {
  sheet.close();
});

sheet.addEventListener("click", (event) => {
  if (event.target === sheet) sheet.close();
});

document.getElementById("reserveForm").addEventListener("submit", (event) => {
  if (event.submitter && event.submitter.value === "cancel") return;
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const hold = {
    name: data.get("name"),
    when: data.get("when"),
    guests: data.get("guests"),
  };
  localStorage.setItem("orla-hold", JSON.stringify(hold));
  paintHold(hold);
  note.textContent = `Held for ${hold.name} · ${hold.when} · ${hold.guests} guests.`;
  setTimeout(() => sheet.close(), 900);
});

const orderList = document.getElementById("order");
const orderEmpty = document.getElementById("orderEmpty");
const orderTotal = document.getElementById("orderTotal");
const keepPlate = document.getElementById("keepPlate");
const holdBox = document.getElementById("hold");
let order = [];
try {
  order = JSON.parse(localStorage.getItem("orla-order") || "[]");
} catch (error) {
  order = [];
}

function paintOrder() {
  orderList.innerHTML = "";
  orderEmpty.hidden = order.length > 0;
  let sum = 0;
  order.forEach((item, index) => {
    sum += Number(item.price);
    const row = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = `${item.name} · ${item.price}`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => {
      order.splice(index, 1);
      localStorage.setItem("orla-order", JSON.stringify(order));
      paintOrder();
    });
    row.append(name, remove);
    orderList.append(row);
  });
  orderTotal.textContent = order.length ? `Table total ${sum}` : "";
  const current = dishes[shown];
  const kept = current && order.some((item) => item.name === current.name);
  keepPlate.textContent = kept ? "On the table" : "Keep this plate";
}

function paintHold(hold) {
  if (!hold) {
    holdBox.hidden = true;
    return;
  }
  holdBox.hidden = false;
  holdBox.textContent = `Table held for ${hold.name} · ${hold.when} · ${hold.guests} guests.`;
}

keepPlate.addEventListener("click", () => {
  const dish = dishes[shown];
  if (!dish || order.some((item) => item.name === dish.name)) return;
  order.push({ name: dish.name, price: dish.price });
  localStorage.setItem("orla-order", JSON.stringify(order));
  paintOrder();
});

paintOrder();
try {
  paintHold(JSON.parse(localStorage.getItem("orla-hold") || "null"));
} catch (error) {
  paintHold(null);
}

sheet.addEventListener("close", () => {
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(true);
});

setPlaying(playing);
render(0);
requestAnimationFrame(frame);
