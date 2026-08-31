/* ==========================================================
   app.js — panel etkilesimleri, onizleme ve PDF cikti
   ========================================================== */

const $  = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

const pageEl = $("#page");
const wrapEl = $("#pageWrap");
const DEFAULT_ZOOM = 1.1;   /* acilistaki onizleme olcegi */
let zoom = DEFAULT_ZOOM;
let autoFit = false;
let saveTimer = null;


/* ==========================================================
   Ortak yardimcilar
   ========================================================== */
function toast(msg, undoLabel, undoFn, ms) {
  const el = $("#toast");
  el.textContent = msg;
  if (undoFn) {
    const b = document.createElement("button");
    b.className = "undo";
    b.textContent = undoLabel || "Geri al";
    b.addEventListener("click", () => {
      el.classList.remove("show");
      clearTimeout(el._t);
      undoFn();
    });
    el.appendChild(b);
  }
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), ms || 1900);
}

function setStatus(txt) { $("#status").textContent = txt; }

function persist() {
  clearTimeout(saveTimer);
  setStatus("Kaydediliyor…");
  saveTimer = setTimeout(() => Store.save(), 350);
}

/* Store yazma sonucunu buraya bildirir */
function handleSaved(ok) {
  const where = Store.mode === "server" ? "storage.json" : "tarayıcı belleği";
  setStatus(ok ? "Kaydedildi · " + where : "KAYDEDİLEMEDİ · " + where);
  $("#status").classList.toggle("err", !ok);
  if (!ok) {
    toast(Store.mode === "server"
      ? "storage.json yazılamadı! Sunucu penceresi kapanmış olabilir."
      : "Kaydedilemedi! Tarayıcı deposu dolu olabilir — Kayıtlı → Dışa Aktar ile yedek alın.",
      null, null, 7000);
  }
}

/* Verilerin nerede tutuldugunu panelde gosterir */
function renderStorageInfo() {
  const el = $("#storageInfo");
  if (!el) return;
  if (Store.mode === "server") {
    el.className = "hint";
    el.innerHTML = "Veriler dosyaya yazılıyor:<br><code>" + escapeHtml(Store.file) + "</code><br>" +
                   "Her gün otomatik yedek alınır (<code>data/backups/</code>).";
  } else {
    el.className = "hint warn";
    el.innerHTML = "<b>Dikkat:</b> veriler yalnızca tarayıcı belleğinde tutuluyor. " +
                   "Dosyaya kaydetmek için uygulamayı <code>baslat.bat</code> / " +
                   "<code>baslat.command</code> ile açın.";
  }
}

function touch() {
  const q = Store.current();
  if (q) q.updatedAt = Date.now();
}

/* Degisiklik -> onizleme + kayit */
function changed(alsoList) {
  touch();
  /* Teklif artik bos degilse numarasi burada kesinlesir */
  if (commitQuoteNo(Store.state, Store.current())) {
    $("#q_no").value = Store.current().no;
    renderNextNoHint();
  }
  renderPreview();
  persist();
  if (alsoList) renderQuoteList();
}

/* ==========================================================
   Sekmeler
   ========================================================== */
function bindTabs() {
  $("#tabs").addEventListener("click", e => {
    const btn = e.target.closest(".tab");
    if (!btn) return;
    $$(".tab").forEach(t => t.classList.toggle("is-active", t === btn));
    $$(".pane").forEach(p => p.classList.toggle("is-active", p.dataset.pane === btn.dataset.pane));
  });
}

/* ==========================================================
   FIRMA (statik alanlar)
   ========================================================== */
const COMPANY_FIELDS = {
  c_headline:  "headline",
  c_doctitle:  "docTitle",
  c_taglines:  "taglines",
  c_phone:     "phone",
  c_address:   "address",
  c_email:     "email",
  c_website:   "website",
  c_thanks1:   "thanks1",
  c_thanks2:   "thanks2",
  c_regards:   "regards",
  c_signature: "signature",
  c_currency:  "currency"
};

function fillCompanyForm() {
  const c = Store.state.company;
  Object.keys(COMPANY_FIELDS).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = c[COMPANY_FIELDS[id]] || "";
  });
  $("#c_accent").value    = c.accent || "#1b5c9c";
  $("#c_accentHex").value = c.accent || "#1b5c9c";
  $("#c_logoSize").value  = num(c.logoSize) || 34;
  $("#c_logoSizeVal").textContent = ($("#c_logoSize").value) + " mm";
  updateLogoPreview();
}

function updateLogoPreview() {
  const img = $("#c_logoPreview");
  const logo = Store.state.company.logo;
  if (logo) { img.src = logo; img.style.visibility = "visible"; }
  else { img.removeAttribute("src"); img.style.visibility = "hidden"; }
}

function bindCompany() {
  Object.keys(COMPANY_FIELDS).forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", () => {
      Store.state.company[COMPANY_FIELDS[id]] = el.value;
      renderPreview();
      persist();
    });
  });

  const applyAccent = val => {
    if (!/^#[0-9a-fA-F]{6}$/.test(val)) return;
    Store.state.company.accent = val;
    $("#c_accent").value = val;
    $("#c_accentHex").value = val;
    renderPreview();
    persist();
  };
  $("#c_accent").addEventListener("input", e => applyAccent(e.target.value));
  $("#c_accentHex").addEventListener("input", e => applyAccent(e.target.value.trim()));

  $("#c_logoSize").addEventListener("input", e => {
    Store.state.company.logoSize = num(e.target.value) || 34;
    $("#c_logoSizeVal").textContent = e.target.value + " mm";
    renderPreview();
    persist();
  });

  $("#c_logo").addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      Store.state.company.logo = await readImageResized(file, 520);
      updateLogoPreview();
      renderPreview();
      persist();
      toast("Logo güncellendi");
    } catch (err) { toast("Görsel okunamadı"); }
    e.target.value = "";
  });

  $("#c_logoClear").addEventListener("click", () => {
    Store.state.company.logo = "";
    updateLogoPreview();
    renderPreview();
    persist();
  });

  $("#addSocial").addEventListener("click", () => {
    Store.state.company.socials.push({ platform: "facebook", url: "" });
    renderSocialList();
    renderPreview();
    persist();
  });
}

function renderSocialList() {
  const wrap = $("#socialList");
  const socials = Store.state.company.socials;
  if (!socials.length) {
    wrap.innerHTML = '<p class="empty-note">Henüz hesap eklenmedi.</p>';
    return;
  }
  wrap.innerHTML = socials.map((s, i) => {
    const opts = Object.keys(SOCIALS).map(k =>
      '<option value="' + k + '"' + (s.platform === k ? " selected" : "") + ">" + SOCIALS[k].label + "</option>"
    ).join("");
    return '<div class="social-row" data-i="' + i + '">' +
        "<select data-role=\"platform\">" + opts + "</select>" +
        '<input data-role="url" type="text" placeholder="https://..." value="' + escapeHtml(s.url) + '">' +
        '<button class="row-del" data-role="del" title="Sil">×</button>' +
      "</div>";
  }).join("");

  wrap.querySelectorAll(".social-row").forEach(row => {
    const i = +row.dataset.i;
    row.querySelector('[data-role="platform"]').addEventListener("change", e => {
      socials[i].platform = e.target.value;
      renderPreview(); persist();
    });
    row.querySelector('[data-role="url"]').addEventListener("input", e => {
      socials[i].url = e.target.value;
      renderPreview(); persist();
    });
    row.querySelector('[data-role="del"]').addEventListener("click", () => {
      socials.splice(i, 1);
      renderSocialList(); renderPreview(); persist();
    });
  });
}

/* ==========================================================
   REFERANSLAR
   ========================================================== */
function fillRefsForm() {
  const r = Store.state.refs;
  $("#r_title").value = r.title || "";
  $("#r_cols").value  = r.cols;
  $("#r_size").value  = r.size;
  $("#r_show").checked = !!r.show;
}

function bindRefs() {
  const r = () => Store.state.refs;
  $("#r_title").addEventListener("input", e => { r().title = e.target.value; renderPreview(); persist(); });
  $("#r_cols").addEventListener("input",  e => { r().cols  = +e.target.value || 4; renderPreview(); persist(); });
  $("#r_size").addEventListener("input",  e => { r().size  = +e.target.value || 26; renderPreview(); persist(); });
  $("#r_show").addEventListener("change", e => { r().show  = e.target.checked; renderPreview(); persist(); });

  $("#addRefs").addEventListener("change", async e => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      try {
        const img = await readImageResized(f, 320);
        r().items.push({ id: uid(), img: img });
      } catch (err) { /* bozuk dosyayi atla */ }
    }
    renderRefList(); renderPreview(); persist();
    if (files.length) toast(files.length + " logo eklendi");
    e.target.value = "";
  });
}

function renderRefList() {
  const wrap = $("#refList");
  const items = Store.state.refs.items;
  if (!items.length) {
    wrap.innerHTML = '<div class="ref-empty">Henüz referans logosu yok.</div>';
    return;
  }
  wrap.innerHTML = items.map((it, i) =>
    '<div class="ref-cell" data-i="' + i + '">' +
      '<img src="' + it.img + '" alt="">' +
      '<div class="ref-tools">' +
        '<button data-role="up" title="Sola">◀</button>' +
        '<button data-role="down" title="Sağa">▶</button>' +
        '<button data-role="del" class="del" title="Sil">×</button>' +
      "</div>" +
    "</div>"
  ).join("");

  wrap.querySelectorAll(".ref-cell").forEach(cell => {
    const i = +cell.dataset.i;
    cell.querySelector('[data-role="up"]').addEventListener("click", () => moveRef(i, -1));
    cell.querySelector('[data-role="down"]').addEventListener("click", () => moveRef(i, 1));
    cell.querySelector('[data-role="del"]').addEventListener("click", () => {
      items.splice(i, 1);
      renderRefList(); renderPreview(); persist();
    });
  });
}

function moveRef(i, dir) {
  const items = Store.state.refs.items;
  const j = i + dir;
  if (j < 0 || j >= items.length) return;
  const tmp = items[i]; items[i] = items[j]; items[j] = tmp;
  renderRefList(); renderPreview(); persist();
}

/* ==========================================================
   TEKLIF (dinamik alanlar)
   ========================================================== */
const QUOTE_FIELDS = {
  q_no:              "no",
  q_date:            "date",
  q_valid:           "validUntil",
  q_to:              "to",
  q_subject:         "subject",
  q_customerCompany: "customerCompany",
  q_projectTitle:    "projectTitle",
  q_projectDesc:     "projectDesc",
  q_note:            "note"
};

function fillQuoteForm() {
  const q = Store.current();
  renderNextNoHint();
  Object.keys(QUOTE_FIELDS).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = q[QUOTE_FIELDS[id]] || "";
  });
  $("#q_no").value = displayQuoteNo(Store.state, q);
  $("#q_discount").value      = q.discount;
  $("#q_vat").value           = q.vatRate;
  $("#q_vatOn").checked       = !!q.vatOn;
  $("#q_showEmptyRows").checked = !!q.showEmptyRows;
}

function bindQuote() {
  Object.keys(QUOTE_FIELDS).forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", () => {
      Store.current()[QUOTE_FIELDS[id]] = el.value;
      changed(id === "q_to" || id === "q_no");
    });
  });

  $("#q_no").addEventListener("change", () => {
    syncCounterFromNo(Store.state, $("#q_no").value);
    renderNextNoHint();
    persist();
  });

  $("#q_discount").addEventListener("input", e => { Store.current().discount = num(e.target.value); changed(true); });
  $("#q_vat").addEventListener("input",      e => { Store.current().vatRate  = num(e.target.value); changed(true); });
  $("#q_vatOn").addEventListener("change",   e => { Store.current().vatOn    = e.target.checked;    changed(true); });
  $("#q_showEmptyRows").addEventListener("change", e => { Store.current().showEmptyRows = e.target.checked; changed(); });

  $("#addItem").addEventListener("click", () => {
    Store.current().items.push(newItem());
    renderItemRows();
    changed(true);
    const rows = $("#itemList").querySelectorAll(".items-row input");
    if (rows.length) rows[rows.length - 4].focus();
  });

  $("#saveQuote").addEventListener("click", () => {
    touch();
    Store.save();
    renderQuoteList();
    setStatus("Tüm değişiklikler kaydedildi");
    toast("Teklif kaydedildi");
  });

  $("#newQuote").addEventListener("click", () => {
    const r = Store.addQuote();
    fillQuoteForm();
    renderItemRows();
    renderQuoteList();
    renderPreview();
    toast(r.created
      ? "Yeni teklif açıldı"
      : "Zaten boş bir teklifteydiniz — numara harcanmadı");
  });

  $("#fixCounter").addEventListener("click", () => {
    const sirada = peekQuoteNo(Store.state);
    const girilen = prompt(
      "Bir sonraki teklif numarası kaç olsun?\n" +
      "Sadece sıra numarasını yazın (örn. 2 → " + new Date().getFullYear() + "-002).\n\n" +
      "Şu an sırada: " + sirada,
      String(num(sirada.split("-")[1])));
    if (girilen === null) return;
    const istenen = parseInt(girilen, 10);
    if (!istenen || istenen < 1) { toast("Geçersiz numara"); return; }

    const gercek = setNextQuoteNo(Store.state, istenen);
    fillQuoteForm();
    renderQuoteList();
    renderPreview();
    persist();
    toast(gercek === formatQuoteNo(new Date().getFullYear(), istenen)
      ? "Sıradaki numara: " + gercek
      : "İstenen numara kullanımda — sıradaki: " + gercek, null, null, 4500);
  });

  $("#searchQuotes").addEventListener("input", renderQuoteList);
  $("#exportBtn").addEventListener("click", exportBackup);
  $("#importFile").addEventListener("change", importBackup);
}

/* Sirada bekleyen teklif numarasini panelde gosterir */
function renderNextNoHint() {
  const el = $("#noHint");
  if (!el) return;
  const q = Store.current();
  el.innerHTML = q.no
    ? "Numara ayrıldı. Bir sonraki teklif: <b>" + escapeHtml(peekQuoteNo(Store.state)) + "</b>."
    : "Bu numara <b>henüz ayrılmadı</b> — teklife ilk bilgiyi girdiğinizde " +
      "kesinleşir. Boş teklifte \"Yeni\"ye basmak numara yakmaz.";
}

/* ---------- Panel toplam ozeti ---------- */
function renderSummary() {
  const box = $("#sumBox");
  if (!box) return;
  const q   = Store.current();
  const cur = Store.state.company.currency;
  const t   = totals(q);
  const rows = [];

  rows.push('<div class="sum-row"><span>Alt Toplam</span><b>' + money(t.sub, cur) + "</b></div>");
  if (num(q.discount) > 0) {
    rows.push('<div class="sum-row"><span>İndirim (%' + num(q.discount) + ")</span><b>-" + money(t.discount, cur) + "</b></div>");
  }
  rows.push(q.vatOn
    ? '<div class="sum-row"><span>KDV (%' + num(q.vatRate) + ")</span><b>" + money(t.vat, cur) + "</b></div>"
    : '<div class="sum-row off"><span>KDV eklenmiyor</span><b>—</b></div>');
  rows.push('<div class="sum-row grand"><span>Toplam</span><b>' + money(t.grand, cur) + "</b></div>");

  box.innerHTML = rows.join("");
}

/* ---------- Kalem satirlari ---------- */
function renderItemRows() {
  const wrap = $("#itemList");
  const items = Store.current().items;
  wrap.innerHTML = items.map((it, i) =>
    '<div class="items-row" data-i="' + i + '">' +
      '<input data-role="desc"  type="text" value="' + escapeHtml(it.desc) + '" placeholder="Açıklama">' +
      '<input data-role="qty"   type="text" value="' + escapeHtml(it.qty) + '">' +
      '<input data-role="unit"  type="text" value="' + escapeHtml(it.unit) + '" placeholder="ad.">' +
      '<input data-role="price" type="text" value="' + escapeHtml(it.price) + '">' +
      '<button class="row-del" data-role="del" title="Satırı sil">×</button>' +
    "</div>"
  ).join("");

  wrap.querySelectorAll(".items-row").forEach(row => {
    const i = +row.dataset.i;
    ["desc", "unit"].forEach(k => {
      row.querySelector('[data-role="' + k + '"]').addEventListener("input", e => {
        items[i][k] = e.target.value; changed(true);
      });
    });
    ["qty", "price"].forEach(k => {
      row.querySelector('[data-role="' + k + '"]').addEventListener("input", e => {
        items[i][k] = e.target.value; changed(true);
      });
    });
    row.querySelector('[data-role="del"]').addEventListener("click", () => {
      items.splice(i, 1);
      if (!items.length) items.push(newItem());
      renderItemRows(); changed(true);
    });
  });
}

/* ---------- Kayitli teklifler ---------- */
function renderQuoteList() {
  const wrap = $("#quoteList");
  const term = ($("#searchQuotes").value || "").toLowerCase().trim();
  const cur  = Store.state.currentId;
  const cCur = Store.state.company.currency;

  const list = Store.state.quotes
    .slice()
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .filter(q => {
      if (!term) return true;
      return (q.to + " " + q.no + " " + q.projectTitle + " " + q.customerCompany).toLowerCase().includes(term);
    });

  if (!list.length) {
    wrap.innerHTML = '<p class="empty-note">Eşleşen teklif yok.</p>';
    return;
  }

  wrap.innerHTML = list.map(q =>
    '<div class="quote-item' + (q.id === cur ? " is-current" : "") + '" data-id="' + q.id + '">' +
      '<div class="qi-main">' +
        '<div class="qi-title">' + escapeHtml(q.to || q.projectTitle || "(isimsiz teklif)") +
          (q.id === cur ? '<span class="qi-badge">düzenleniyor</span>' : "") + "</div>" +
        '<div class="qi-sub">' + escapeHtml(q.no || "—") + " · " + escapeHtml(trDate(q.date)) + "</div>" +
      "</div>" +
      '<div class="qi-amount">' + money(totals(q).grand, cCur) + "</div>" +
      '<button class="qi-del" data-role="dup" title="Kopyala">⧉</button>' +
      '<button class="qi-del" data-role="del" title="Sil">×</button>' +
    "</div>"
  ).join("");

  wrap.querySelectorAll(".quote-item").forEach(item => {
    const id = item.dataset.id;
    item.addEventListener("click", e => {
      if (e.target.closest("button")) return;
      Store.setCurrent(id);
      fillQuoteForm(); renderItemRows(); renderQuoteList(); renderPreview();
    });
    item.querySelector('[data-role="dup"]').addEventListener("click", () => {
      Store.duplicateQuote(id);
      fillQuoteForm(); renderItemRows(); renderQuoteList(); renderPreview();
      toast("Teklif kopyalandı");
    });
    item.querySelector('[data-role="del"]').addEventListener("click", () => {
      const q = Store.state.quotes.find(x => x.id === id);
      const name = (q && (q.to || q.no)) || "bu teklif";
      if (!confirm(name + " silinsin mi?")) return;
      Store.deleteQuote(id);
      fillQuoteForm(); renderItemRows(); renderQuoteList(); renderPreview();
      toast("Teklif silindi");
    });
  });
}

/* ---------- Yedekleme ---------- */
function exportBackup() {
  const blob = new Blob([JSON.stringify(Store.state, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "teklif-yedek-" + isoDate(new Date()) + ".json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Yedek indirildi");
}

function importBackup(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || typeof data !== "object") throw new Error("bicim");
      if (!confirm("Mevcut veriler yedekle değiştirilecek. Devam edilsin mi?")) return;
      Store.state = Store.migrate(data);
      Store.save();
      fillCompanyForm(); fillRefsForm(); fillQuoteForm();
      renderItemRows(); renderRefList(); renderSocialList(); renderQuoteList(); renderPreview();
      toast("Yedek geri yüklendi");
    } catch (err) {
      toast("Dosya okunamadı — geçerli bir yedek değil");
    }
  };
  reader.readAsText(file);
  e.target.value = "";
}

/* ==========================================================
   Onizleme ve yakinlastirma
   ========================================================== */
function renderPreview() {
  pageEl.style.setProperty("--acc", Store.state.company.accent || "#1b5c9c");
  pageEl.innerHTML = renderDocument(Store.state);
  renderSummary();
  applyZoom();
}

function applyZoom() {
  pageEl.style.transform = "scale(" + zoom + ")";
  const w = pageEl.offsetWidth  * zoom;
  const h = pageEl.offsetHeight * zoom;
  wrapEl.style.width  = w + "px";
  wrapEl.style.height = h + "px";
  $("#zoomVal").textContent = Math.round(zoom * 100) + "%";
}

function setZoom(z, manual) {
  zoom = Math.max(0.25, Math.min(2, z));
  if (manual) autoFit = false;
  applyZoom();
}

/* Sayfanin tamami gorunecek sekilde olcekler (hem en hem boy) */
function fitZoom() {
  const box    = $("#scroll");
  const availW = box.clientWidth  - 64;
  const availH = box.clientHeight - 78;
  const w = pageEl.offsetWidth  || 794;
  const h = pageEl.offsetHeight || 1123;
  setZoom(Math.min(1, availW / w, availH / h));
  autoFit = true;
  box.scrollTop = 0;
}

function bindToolbar() {
  $("#zoomIn").addEventListener("click",  () => setZoom(zoom + 0.1, true));
  $("#zoomOut").addEventListener("click", () => setZoom(zoom - 0.1, true));
  $("#zoomFit").addEventListener("click", fitZoom);
  $("#printBtn").addEventListener("click", doPrint);

  document.addEventListener("keydown", e => {
    const meta = e.ctrlKey || e.metaKey;
    if (meta && e.key.toLowerCase() === "p") { e.preventDefault(); doPrint(); }
    if (meta && e.key.toLowerCase() === "s") { e.preventDefault(); Store.save(); toast("Kaydedildi"); }
  });
}

let printPending = false;
let zoomBeforePrint = DEFAULT_ZOOM;
let titleBeforePrint = document.title;
let printTitleActive = false;

/* Tarayici "PDF olarak kaydet" penceresinde varsayilan dosya adini
   sayfa basligindan alir. Cikti aninda basligi teklif numarasi yapip
   yazdirma bitince eski haline dondururuz.                          */
function pdfFileName(q) {
  const no = q.no || peekQuoteNo(Store.state);
  return String(no).replace(/[\\/:*?"<>|]+/g, "-").trim() || "teklif";
}

/* Yazdirma oncesi hazirlik; olusan dosya adini dondurur */
function preparePrint() {
  /* Uygulama gece yarisini acik gecmis olabilir: dokunulmamis teklif
     bayat tarihle basilmasin. */
  const tazelendi = refreshBlankQuote(Store.state, Store.current());
  const numaraVerildi = commitQuoteNo(Store.state, Store.current());
  if (tazelendi || numaraVerildi) {
    fillQuoteForm();
    renderPreview();
    persist();
  }
  if (!printTitleActive) {
    titleBeforePrint = document.title;
    printTitleActive = true;
  }
  document.title = pdfFileName(Store.current());
  return document.title;
}

function doPrint() {
  preparePrint();
  printPending = true;
  zoomBeforePrint = zoom;      /* beforeprint tetiklenmese de olcek geri gelsin */
  window.print();
}

/* Yazdirma sirasinda olcek 1:1 olmali */
window.addEventListener("beforeprint", () => {
  if (!printTitleActive) preparePrint();   // menuden yazdirma yolu
  zoomBeforePrint = zoom;
  pageEl.style.transform = "none";
  wrapEl.style.width = "";
  wrapEl.style.height = "";
});

window.addEventListener("afterprint", () => {
  zoom = zoomBeforePrint;
  applyZoom();
  document.title = titleBeforePrint;   // sekme basligini geri al
  printTitleActive = false;
  if (printPending) {
    printPending = false;
    const q = Store.current();
    if (q.exportedAt) {
      /* Daha once dosyalanmis bir teklifin yeniden basimi:
         sayac, siralama ve kayitlar oldugu gibi kalir. */
      toast(displayQuoteNo(Store.state, q) + " yeniden yazdırıldı · sayaç ve kayıtlar değişmedi",
            null, null, 3500);
    } else {
      archiveAndReset();
    }
  }
});

/* PDF alindiktan sonra: teklifi arsivle, sirali yeni teklife gec */
function archiveAndReset() {
  const doneId = Store.state.currentId;
  const done   = Store.current();
  done.updatedAt  = Date.now();
  done.exportedAt = Date.now();     // artik dosyalandi; tekrar basimlar sifirlamaz
  if (!done.no) done.no = issueQuoteNo(Store.state);

  const fresh = Store.addQuote().quote;
  fillQuoteForm();
  renderItemRows();
  renderQuoteList();
  renderPreview();

  const name = done.to || done.no || "Teklif";
  toast(name + " kaydedildi · sıradaki: " + displayQuoteNo(Store.state, fresh), "Geri al", () => {
    Store.deleteQuote(fresh.id);
    Store.setCurrent(doneId);
    Store.current().exportedAt = 0;     // cikti geri alindi, dosyalanmis sayilmaz
    fillQuoteForm();
    renderItemRows();
    renderQuoteList();
    renderPreview();
    toast("Geri alındı");
  }, 9000);
}

/* ==========================================================
   Baslangic — tum tanimlar yuklendikten sonra calisir
   ========================================================== */
async function init() {
  await Store.load();
  Store.onSaved = handleSaved;
  bindTabs();
  bindCompany();
  bindRefs();
  bindQuote();
  bindToolbar();
  fillCompanyForm();
  fillRefsForm();
  fillQuoteForm();
  renderItemRows();
  renderRefList();
  renderSocialList();
  renderQuoteList();
  renderStorageInfo();
  renderPreview();
  setZoom(DEFAULT_ZOOM, true);
  setStatus(Store.mode === "server" ? "Hazır · storage.json" : "Hazır · tarayıcı belleği");
  window.addEventListener("resize", () => { if (autoFit) fitZoom(); });
}

init();
