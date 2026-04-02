function $(sel) {
  return document.querySelector(sel);
}

async function loadSchema() {
  const res = await fetch("/api/schema");
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.detail || "Schema alınamadı");
  }
  return data;
}

function groupBy(arr, keyFn) {
  const out = new Map();
  for (const item of arr) {
    const k = keyFn(item) || "Diğer";
    if (!out.has(k)) out.set(k, []);
    out.get(k).push(item);
  }
  return out;
}

function makeHelp(text) {
  if (!text) return null;
  const div = document.createElement("div");
  div.className = "help";
  div.textContent = text;
  return div;
}

function mountFields(features) {
  const mount = $("#fieldsMount");
  mount.innerHTML = "";

  const groups = groupBy(features, (f) => f.group);
  const groupOrder = ["Donanım", "Ekran", "Kamera", "Bağlantı", "Fiziksel", "Diğer"];
  const orderedGroups = [
    ...groupOrder.filter((g) => groups.has(g)).map((g) => [g, groups.get(g)]),
    ...[...groups.entries()].filter(([g]) => !groupOrder.includes(g)),
  ];

  for (const [groupName, items] of orderedGroups) {
    const section = document.createElement("section");
    section.className = "group";

    const header = document.createElement("div");
    header.className = "group-head";
    const h = document.createElement("div");
    h.className = "group-title";
    h.textContent = groupName;
    const sub = document.createElement("div");
    sub.className = "group-sub";
    sub.textContent = "Gerekli alanları doldurun.";
    header.appendChild(h);
    header.appendChild(sub);

    const grid = document.createElement("div");
    grid.className = "group-grid";

    for (const f of items) {
      const name = f.name;
      const labelText = f.label || name;

      const wrap = document.createElement("div");
      wrap.className = "field";

      const span = document.createElement("div");
      span.className = "label";
      span.textContent = labelText;

      let control = null;
      if (f.input === "checkbox") {
        const row = document.createElement("label");
        row.className = "check";

        const input = document.createElement("input");
        input.type = "checkbox";
        input.name = name;
        input.checked = false;

        const txt = document.createElement("span");
        txt.className = "check-text";
        txt.textContent = "Evet";

        row.appendChild(input);
        row.appendChild(txt);
        control = row;
      } else if (f.input === "select") {
        const sel = document.createElement("select");
        sel.className = "input select";
        sel.name = name;
        sel.required = true;
        for (const opt of f.options || []) {
          const o = document.createElement("option");
          o.value = String(opt.value);
          o.textContent = opt.label ?? String(opt.value);
          sel.appendChild(o);
        }
        control = sel;
      } else {
        const input = document.createElement("input");
        input.className = "input";
        input.name = name;
        input.inputMode = "decimal";
        input.type = "number";
        input.step = f.step ?? "any";
        input.placeholder = f.placeholder ?? "0";
        input.required = true;
        if (typeof f.min === "number") input.min = String(f.min);
        if (typeof f.max === "number") input.max = String(f.max);
        control = input;
      }

      wrap.appendChild(span);
      wrap.appendChild(control);
      const help = makeHelp(f.help);
      if (help) wrap.appendChild(help);
      grid.appendChild(wrap);
    }

    section.appendChild(header);
    section.appendChild(grid);
    mount.appendChild(section);
  }
}

function setStatus(kind, text) {
  const el = $("#status");
  el.className = `status ${kind}`;
  el.textContent = text;
}

function fmtPct(x) {
  return `${(x * 100).toFixed(1)}%`;
}

const PRICE_CLASS = {
  0: { short: "Ucuz", long: "Ucuz / Ekonomik" },
  1: { short: "Orta", long: "Orta Segment" },
  2: { short: "Pahalı", long: "Pahalı (Yüksek Segment)" },
  3: { short: "Amiral", long: "Çok Pahalı / Amiral Gemisi" },
};

function classLabel(cls) {
  const c = PRICE_CLASS[Number(cls)];
  return c ? c.long : `Sınıf ${cls}`;
}

function classShort(cls) {
  const c = PRICE_CLASS[Number(cls)];
  return c ? c.short : String(cls);
}

function renderBars(probabilities) {
  const root = $("#probBars");
  root.innerHTML = "";
  const entries = Object.entries(probabilities)
    .map(([k, v]) => [Number(k), Number(v)])
    .sort((a, b) => a[0] - b[0]);

  for (const [cls, p] of entries) {
    const row = document.createElement("div");
    row.className = "bar";

    const label = document.createElement("div");
    label.className = "bar-label";
    label.textContent = String(cls);

    const track = document.createElement("div");
    track.className = "bar-track";
    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.width = `${Math.max(0, Math.min(100, p * 100))}%`;
    track.appendChild(fill);

    const val = document.createElement("div");
    val.className = "bar-value";
    val.textContent = fmtPct(p);

    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(val);
    root.appendChild(row);

    const sub = document.createElement("div");
    sub.className = "bar-sub";
    sub.textContent = classLabel(cls);
    root.appendChild(sub);
  }
}

function getPayloadFromForm() {
  const form = $("#predictForm");
  const fd = new FormData(form);
  const payload = {};
  for (const key of window.__FEATURES__ || []) {
    const el = form.querySelector(`[name="${key}"]`);
    if (el && el.type === "checkbox") {
      payload[key] = el.checked ? 1 : 0;
      continue;
    }
    const raw = fd.get(key);
    payload[key] = raw === "" ? null : Number(raw);
  }
  return payload;
}

function fillExample() {
  const example = {
    battery_power: 1000,
    blue: 1,
    clock_speed: 1.8,
    dual_sim: 1,
    fc: 5,
    four_g: 1,
    int_memory: 32,
    m_dep: 0.6,
    mobile_wt: 160,
    n_cores: 4,
    pc: 12,
    px_height: 800,
    px_width: 1200,
    ram: 2048,
    sc_h: 14,
    sc_w: 7,
    talk_time: 10,
    three_g: 1,
    touch_screen: 1,
    wifi: 1,
  };

  for (const k of window.__FEATURES__ || []) {
    const el = document.querySelector(`[name="${k}"]`);
    if (!el) continue;
    if (el.type === "checkbox") {
      el.checked = Boolean(example[k] ?? 0);
    } else {
      el.value = example[k] ?? 0;
    }
  }
}

function clearForm() {
  for (const k of window.__FEATURES__ || []) {
    const el = document.querySelector(`[name="${k}"]`);
    if (!el) continue;
    if (el.type === "checkbox") el.checked = false;
    else el.value = "";
  }
  $("#predClass").textContent = "-";
  $("#topProb").textContent = "-";
  $("#probBars").innerHTML = "";
  setStatus("idle", "Hazır");
}

async function predict() {
  const payload = getPayloadFromForm();

  for (const k of window.__FEATURES__ || []) {
    if (payload[k] === null || Number.isNaN(payload[k])) {
      setStatus("err", `Eksik / hatalı alan: ${k}`);
      return;
    }
  }

  setStatus("loading", "Tahmin yapılıyor...");
  $("#predictBtn").disabled = true;

  try {
    const res = await fetch("/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.detail || "Sunucu hatası");
    }

    const probs = data.probabilities || {};
    const entries = Object.entries(probs).map(([k, v]) => [Number(k), Number(v)]);
    entries.sort((a, b) => b[1] - a[1]);

    const cls = Number(data.predicted_class);
    const predEl = $("#predClass");
    predEl.innerHTML = "";
    const main = document.createElement("div");
    main.className = "pred-main";
    main.textContent = classLabel(cls);
    const meta = document.createElement("div");
    meta.className = "pred-meta";
    meta.textContent = `Model sınıfı: ${cls}`;
    predEl.appendChild(main);
    predEl.appendChild(meta);

    $("#topProb").textContent = entries.length ? fmtPct(entries[0][1]) : "-";
    renderBars(probs);
    setStatus("ok", "Tamam");
  } catch (e) {
    setStatus("err", e?.message || "Hata");
  } finally {
    $("#predictBtn").disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  (async () => {
    try {
      setStatus("loading", "Model şeması yükleniyor...");
      const schema = await loadSchema();
      const feats = schema?.features || [];
      window.__FEATURES__ = feats.map((x) => x.name || x);
      mountFields(feats);
      setStatus("idle", "Hazır");

      $("#predictForm").addEventListener("submit", (e) => {
        e.preventDefault();
        predict();
      });
      $("#fillExampleBtn").addEventListener("click", () => fillExample());
      $("#clearBtn").addEventListener("click", () => clearForm());
    } catch (e) {
      setStatus("err", e?.message || "Başlatma hatası");
    }
  })();
});

