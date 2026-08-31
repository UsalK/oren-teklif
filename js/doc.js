/* ==========================================================
   doc.js — A4 teklif belgesinin HTML ciktisi
   ========================================================== */

/* Sosyal medya platformlari: renk + simge */
const SOCIALS = {
  facebook: {
    label: "Facebook", color: "#1877F2",
    path: "M13.5 21v-7h2.3l.4-2.8h-2.7V9.4c0-.8.2-1.4 1.4-1.4h1.4V5.5c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2H8v2.8h2.4V21h3.1z"
  },
  instagram: {
    label: "Instagram", color: "#E1306C",
    path: "M8 3h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H8zm4 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm4.6-3.1a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"
  },
  whatsapp: {
    label: "WhatsApp", color: "#25D366",
    path: "M12 3a9 9 0 0 0-7.7 13.6L3 21l4.6-1.3A9 9 0 1 0 12 3zm0 2a7 7 0 1 1-3.6 13l-.3-.2-2.2.6.6-2.2-.2-.3A7 7 0 0 1 12 5zM9.6 8.3c-.2 0-.5.1-.7.4-.2.3-.8.8-.8 1.9s.8 2.2.9 2.4c.1.2 1.6 2.6 4 3.5 1.9.7 2.3.6 2.7.6.4-.1 1.3-.5 1.5-1.1.2-.6.2-1 .1-1.1l-.5-.3-1.5-.7c-.2-.1-.4-.1-.5.1l-.6.8c-.1.2-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.3.1-.4l.4-.5.2-.4v-.4l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.4z"
  },
  youtube: {
    label: "YouTube", color: "#FF0000",
    path: "M21.6 7.2c-.2-.9-.9-1.6-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4c-.9.2-1.6.9-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8c.2.9.9 1.6 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8zM10 15V9l5.2 3L10 15z"
  },
  x: {
    label: "X", color: "#111111",
    path: "M17.5 3h3l-6.6 7.5L21.8 21h-6l-4.7-6.1L5.7 21h-3l7-8L2.5 3h6.2l4.2 5.6L17.5 3zm-1 16h1.7L7.6 4.7H5.8L16.5 19z"
  },
  linkedin: {
    label: "LinkedIn", color: "#0A66C2",
    path: "M6.9 8.6H3.6V21h3.3V8.6zM5.2 3a1.9 1.9 0 1 0 0 3.9 1.9 1.9 0 0 0 0-3.9zM21 14.1c0-3.5-1.9-5.2-4.4-5.2-2 0-2.9 1.1-3.4 1.9V8.6H9.9V21h3.3v-6.9c0-1.5.6-2.5 2-2.5 1.3 0 1.9.9 1.9 2.5V21H21v-6.9z"
  },
  web: {
    label: "Web", color: "#5f6b7a",
    path: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm6.9 8h-2.8a14 14 0 0 0-1-4.6A7 7 0 0 1 18.9 11zM12 5c.7 1 1.5 2.9 1.7 6h-3.4C10.5 7.9 11.3 6 12 5zM7.9 6.4A14 14 0 0 0 6.9 11H4.1a7 7 0 0 1 3.8-4.6zM4.1 13h2.8c.1 1.7.4 3.3 1 4.6A7 7 0 0 1 4.1 13zM12 19c-.7-1-1.5-2.9-1.7-6h3.4c-.2 3.1-1 5-1.7 6zm4.1-1.4c.6-1.3.9-2.9 1-4.6h2.8a7 7 0 0 1-3.8 4.6z"
  }
};

const MIN_TABLE_ROWS = 14;   /* Sayfayi dolduran en az satir sayisi */

/* Satirlari <br> ile coklu satira cevirir */
function lines(text) {
  return escapeHtml(text).split(/\r?\n/).filter(Boolean);
}

/* PDF icinde tiklanabilir olmasi icin adres mutlak olmali */
function absoluteUrl(url) {
  const s = String(url || "").trim();
  if (!s) return "";
  if (/^(https?:|mailto:|tel:)/i.test(s)) return s;
  return "https://" + s.replace(/^\/+/, "");
}

/* "instagram.com/falan-filan" -> "falan-filan" */
function socialHandle(url) {
  let s = String(url || "").trim();
  if (!s) return "";
  s = s.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  const parts = s.split(/[?#]/)[0].split("/").filter(Boolean);
  if (parts.length <= 1) return parts[0] || "";
  return decodeURIComponent(parts[parts.length - 1]);
}

/* Ikon + kullanici adi, tiklanabilir tek satir */
function socialItem(s) {
  const meta = SOCIALS[s.platform] || SOCIALS.web;
  const href = absoluteUrl(s.url);
  const text = socialHandle(s.url) || meta.label;
  const inner =
    '<span class="s-icon" style="background:' + meta.color + '">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + meta.path + '"/></svg>' +
    "</span>" +
    '<span class="s-text">' + escapeHtml(text) + "</span>";
  return href
    ? '<a class="s-item" href="' + escapeHtml(href) + '" title="' + escapeHtml(meta.label) + '">' + inner + "</a>"
    : '<span class="s-item">' + inner + "</span>";
}

/* ---------- Sol ray ---------- */
function renderRail(c, refs, q) {
  const link = (href, text, cls) =>
    '<div><a class="' + (cls || "") + '" href="' + escapeHtml(href) + '">' + escapeHtml(text) + "</a></div>";

  const contact = [];
  if (c.phone)   contact.push(link("tel:" + c.phone.replace(/[^\d+]/g, ""), c.phone));
  if (c.address) contact.push('<div class="plain">' + lines(c.address).join("<br>") + "</div>");
  if (c.email)   contact.push(link("mailto:" + c.email, c.email));
  if (c.website) contact.push(link(absoluteUrl(c.website), c.website));

  const socials = (c.socials || []).filter(s => s.platform);

  let refsHtml = "";
  if (refs.show && refs.items.length) {
    const cols = Math.max(1, Math.min(6, parseInt(refs.cols, 10) || 4));
    const size = Math.max(10, Math.min(80, parseInt(refs.size, 10) || 26));
    refsHtml =
      '<div class="d-refs">' +
        (refs.title ? '<div class="d-refs-title">' + escapeHtml(refs.title) + "</div>" : "") +
        '<div class="d-refs-grid" style="grid-template-columns:repeat(' + cols + ',1fr)">' +
          refs.items.map(r =>
            '<img src="' + r.img + '" alt="" style="height:' + size + 'px">'
          ).join("") +
        "</div>" +
      "</div>";
  }

  return '<div class="d-rail">' +
      '<div class="d-title">' + escapeHtml(c.docTitle || "FİYAT TEKLİFİ") + "</div>" +
      '<div class="d-meta">' +
        '<div><b>TEKLİF SIRA NO:</b> <span class="val">' +
          escapeHtml(displayQuoteNo(Store.state, q)) + "</span></div>" +
        "<div><b>Teklif son geçerlilik tarihi:</b></div>" +
        '<div class="val">' + escapeHtml(trDate(q.validUntil) || "—") + "</div>" +
      "</div>" +
      '<div class="d-contact">' + contact.join("") + "</div>" +
      (socials.length ? '<div class="d-social">' + socials.map(socialItem).join("") + "</div>" : "") +
      '<div class="d-rail-spacer"></div>' +
      refsHtml +
    "</div>";
}

/* ---------- Musteri / proje / logo ---------- */
function renderTop(c, q) {
  const info = [];
  info.push('<div><span class="lbl">Kime:</span> <span class="txt">' + escapeHtml(q.to) + "</span></div>");
  info.push('<div><span class="lbl">Başlık:</span> <span class="txt">' + escapeHtml(q.subject) + "</span></div>");
  info.push('<div><span class="lbl">Şirket Adı:</span> <span class="txt">' + escapeHtml(q.customerCompany) + "</span></div>");
  info.push('<div><span class="lbl">Tarih:</span> <span class="txt">' + escapeHtml(trDate(q.date)) + "</span></div>");
  info.push('<div class="block"><span class="lbl">Proje Başlığı:</span> <span class="txt">' + escapeHtml(q.projectTitle) + "</span></div>");
  info.push('<div><span class="lbl">Proje Açıklaması:</span></div>');
  if (q.projectDesc) info.push('<div class="desc">' + escapeHtml(q.projectDesc) + "</div>");

  const tags = lines(c.taglines);
  const size = Math.max(12, Math.min(70, num(c.logoSize) || 34));

  return '<div class="d-top" style="grid-template-columns:1fr ' + size + "mm\">" +
      '<div class="d-info">' + info.join("") + "</div>" +
      '<div class="d-logo">' +
        (c.logo ? '<img src="' + c.logo + '" alt="" style="max-width:' + size + "mm;max-height:" + Math.round(size * 0.9) + 'mm">' : "") +
        (tags.length ? '<div class="d-taglines">' + tags.join("<br>") + "</div>" : "") +
      "</div>" +
    "</div>";
}

/* ---------- Kalem tablosu + toplamlar ---------- */
function renderTable(c, q) {
  const cur = c.currency || "₺";
  const t   = totals(q);

  const rows = q.items.map(it => {
    const qty   = num(it.qty);
    const price = num(it.price);
    const cost  = qty * price;
    const hasAny = it.desc || price;
    if (!hasAny) return '<tr class="empty"><td></td><td></td><td></td><td></td></tr>';
    return "<tr>" +
        '<td class="desc-cell">' + escapeHtml(it.desc) + "</td>" +
        '<td class="c-qty">' + (qty ? trNumber.format(qty).replace(/,00$/, "") + " " + escapeHtml(it.unit || "") : "") + "</td>" +
        '<td class="c-price">' + (price ? money(price, cur) : "") + "</td>" +
        '<td class="c-cost">' + (cost ? money(cost, cur) : "") + "</td>" +
      "</tr>";
  });

  if (q.showEmptyRows) {
    const fill = Math.max(0, MIN_TABLE_ROWS - rows.length);
    for (let i = 0; i < fill; i++) {
      rows.push('<tr class="empty"><td></td><td></td><td></td><td></td></tr>');
    }
  }

  const totalRow = (label, value, cls) =>
    '<tr class="' + (cls || "") + '">' +
      '<td class="t-blank"></td><td class="t-blank"></td>' +
      '<td class="t-label">' + label + "</td>" +
      '<td class="t-value">' + value + "</td>" +
    "</tr>";

  const tRows = [];
  tRows.push(totalRow("Alt Toplam", money(t.sub, cur)));
  if (num(q.discount) > 0) {
    tRows.push(totalRow("İndirim (%" + num(q.discount) + ")", "-" + money(t.discount, cur)));
  }
  if (q.vatOn) {
    tRows.push(totalRow("KDV (%" + num(q.vatRate) + ")", money(t.vat, cur)));
  }
  tRows.push(totalRow("Toplam", money(t.grand, cur), "grand"));

  return '<table class="d-table">' +
      "<colgroup>" +
        "<col><col style='width:24mm'><col style='width:27mm'><col style='width:29mm'>" +
      "</colgroup>" +
      "<thead><tr>" +
        "<th>Açıklama</th>" +
        '<th class="c-qty">Miktar</th>' +
        '<th class="c-price">Birim Fiyat</th>' +
        '<th class="c-cost">Maliyet</th>' +
      "</tr></thead>" +
      "<tbody>" + rows.join("") + tRows.join("") + "</tbody>" +
    "</table>";
}

/* ---------- Kapanis ---------- */
function renderClosing(c, q) {
  const parts = [];
  if (q.note)    parts.push('<div class="d-note">' + escapeHtml(q.note) + "</div>");
  const close = [];
  if (c.thanks1)   close.push("<div>" + escapeHtml(c.thanks1) + "</div>");
  if (c.thanks2)   close.push("<div>" + escapeHtml(c.thanks2) + "</div>");
  if (c.regards)   close.push("<div>" + escapeHtml(c.regards) + "</div>");
  if (c.signature) close.push('<div class="sign">' + escapeHtml(c.signature) + "</div>");
  parts.push('<div class="d-closing">' + close.join("") + "</div>");
  return parts.join("");
}

/* ---------- Belgenin tamami ---------- */
function renderDocument(state) {
  const c = state.company;
  const q = Store.current();
  const refs = state.refs;

  return '<div class="d-headline">' + escapeHtml(c.headline) + "</div>" +
    '<div class="d-rule"></div>' +
    '<div class="d-body">' +
      renderRail(c, refs, q) +
      '<div class="d-main">' +
        renderTop(c, q) +
        renderTable(c, q) +
        renderClosing(c, q) +
        '<div class="d-foot"><div class="d-foot-rule">1</div></div>' +
      "</div>" +
    "</div>";
}
