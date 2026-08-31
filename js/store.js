/* ==========================================================
   store.js — veri modeli, kalici saklama ve yardimcilar
   Veriler once data/storage.json dosyasina yazilir; sunucu yoksa
   tarayicinin localStorage alanina duser.
   ========================================================== */

const STORAGE_KEY = "fiyat-teklifi-app/v1";
const API_URL     = "/api/data";
const API_INFO    = "/api/info";

/* Yeni tekliflerde son gecerlilik tarihi: bugun + bu kadar gun */
const VALID_DAYS  = 5;

/* ---------- Tarayici bellegi (sunucu yokken yedek yol) ---------- */
function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn("Yerel veri okunamadi:", e);
    return null;
  }
}

function writeLocal(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.warn("Yerel veri yazilamadi:", e);
    return false;
  }
}

/* ---------- Varsayilan veri ---------- */
function defaultCompany() {
  return {
    headline:  "TEKİRDAĞ SU TESİSATÇISI",
    docTitle:  "FİYAT TEKLİFİ",
    logo:      "",
    logoSize:  34,
    taglines:  "Mekanik Tesisat Proje\nMalzeme ve İşçilik\nÇözüm Uzmanınız",
    phone:     "+90 (530) 893 39 89",
    address:   "Çınarlı mah. Erdinç Sok. No:1\nSÜLEYMANPAŞA / Tekirdağ",
    email:     "mucahitkaratastan@hotmail.com",
    website:   "www.tekirdagsutesisatcisi.com",
    socials:   [
      { platform: "facebook",  url: "" },
      { platform: "instagram", url: "" }
    ],
    thanks1:   "Bizimle çalıştığınız için teşekkür ederiz!",
    thanks2:   "Sizinle çalışmak bizim için zevkti.",
    regards:   "Saygılarımla,",
    signature: "Mücahit Karataştan",
    accent:    "#1b5c9c",
    currency:  "₺"
  };
}

function defaultRefs() {
  return {
    title: "Referanslarımız",
    cols:  4,
    size:  26,
    show:  true,
    items: []          // { id, img }
  };
}

function emptyQuote() {
  const today = new Date();
  const valid = new Date(today.getTime() + VALID_DAYS * 86400000);
  return {
    id:              uid(),
    no:              "",
    date:            isoDate(today),
    validUntil:      isoDate(valid),
    to:              "",
    subject:         "",
    customerCompany: "",
    projectTitle:    "",
    projectDesc:     "",
    items:           [ newItem() ],
    discount:        0,
    vatRate:         20,
    vatOn:           false,
    showEmptyRows:   true,
    note:            "",
    exportedAt:      0,          // ilk PDF ciktisinda damgalanir
    updatedAt:       Date.now()
  };
}

/* Hic dokunulmamis (bos) teklif mi? */
function isBlankQuote(q) {
  if (!q) return false;
  const bosMetin = !q.to && !q.subject && !q.customerCompany &&
                   !q.projectTitle && !q.projectDesc && !q.note;
  const bosKalem = (q.items || []).every(it => !it.desc && !num(it.price));
  return bosMetin && bosKalem;
}

/* Bos bekleyen teklif her zaman gunun tarihini ve gecerli yilin
   numarasini tasisin. Aksi halde aksam acilip sabah basilan teklif
   dunun tarihiyle -- yilbasinda ise gecen yilin numarasiyla -- cikar.
   Icine tek bir sey yazilmis teklife dokunulmaz.                    */
function refreshBlankQuote(state, q) {
  if (!isBlankQuote(q)) return false;
  const today = new Date();
  let degisti = false;

  const bugun = isoDate(today);
  if (q.date !== bugun) {
    q.date       = bugun;
    q.validUntil = isoDate(new Date(today.getTime() + VALID_DAYS * 86400000));
    degisti = true;
  }

  const m = String(q.no || "").match(/^(\d{4})-/);
  if (m && parseInt(m[1], 10) !== today.getFullYear()) {
    q.no = issueQuoteNo(state);      // gecen yildan kalan numarayi birak
    degisti = true;
  }
  return degisti;
}

function newItem() {
  return { id: uid(), desc: "", qty: 1, unit: "ad.", price: 0 };
}

function defaultCounter() {
  return { year: new Date().getFullYear(), seq: 0 };
}

function defaultState() {
  const st = {
    company:   defaultCompany(),
    refs:      defaultRefs(),
    counter:   defaultCounter(),
    quotes:    [],
    currentId: null
  };
  const q = emptyQuote();          // numara bos: ilk iceriginde ayrilacak
  st.quotes.push(q);
  st.currentId = q.id;
  return st;
}

/* ---------- Kalici saklama ---------- */
const Store = {
  state: null,

  /* "server" = data/storage.json, "local" = tarayici bellegi */
  mode: "local",
  file: "",
  onSaved: null,       // (ok, hata) geri cagrisi — app.js baglar

  _writing: false,
  _dirty:   false,

  /* Once sunucuyu dener, yoksa tarayici bellegine duser */
  async load() {
    try {
      const res = await fetch(API_URL, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        this.mode = "server";
        try {
          const info = await (await fetch(API_INFO, { cache: "no-store" })).json();
          this.file = info.file || "data/storage.json";
        } catch (e) { this.file = "data/storage.json"; }

        if (data && Array.isArray(data.quotes) && data.quotes.length) {
          this.state = this.migrate(data);
          return this.ready();
        }
        /* Sunucu dosyasi bos: daha once tarayiciya kaydedilmis veri varsa tasi */
        const local = readLocal();
        this.state = local ? this.migrate(local) : defaultState();
        this.save();
        return this.ready();
      }
    } catch (e) {
      /* Sunucu yok (dosya olarak veya duz statik sunucuyla acilmis) */
    }

    this.mode = "local";
    this.file = "tarayıcı belleği";
    const local = readLocal();
    this.state = local ? this.migrate(local) : defaultState();
    return this.ready();
  },

  /* Yukleme sonrasi son rotuslar */
  ready() {
    refreshBlankQuote(this.state, this.current());
    return this.state;
  },

  /* Eksik alanlari varsayilanlarla tamamlar (surum uyumlulugu) */
  migrate(data) {
    const base = defaultState();
    const s = {
      company:   Object.assign({}, base.company, data.company || {}),
      refs:      Object.assign({}, base.refs, data.refs || {}),
      counter:   Object.assign({}, defaultCounter(), data.counter || {}),
      quotes:    Array.isArray(data.quotes) && data.quotes.length ? data.quotes : base.quotes,
      currentId: data.currentId || null
    };
    s.quotes = s.quotes.map(q => {
      const merged = Object.assign(emptyQuote(), q);
      merged.items = (Array.isArray(q.items) && q.items.length ? q.items : [ newItem() ])
        .map(it => Object.assign(newItem(), it));
      return merged;
    });
    if (!s.quotes.some(q => q.id === s.currentId)) s.currentId = s.quotes[0].id;
    if (!Array.isArray(s.company.socials)) s.company.socials = [];
    if (!Array.isArray(s.refs.items))      s.refs.items = [];

    /* Eski surumlerden gelen kayitlar: uzerinde calisilan teklif disindaki
       her sey zaten dosyalanmis sayilir, boylece yeniden basmak arsivleme
       akisini tetiklemez. */
    s.quotes.forEach(q => {
      if (!q.exportedAt && q.id !== s.currentId) q.exportedAt = q.updatedAt || Date.now();
    });

    /* Icerigi olup numarasi eksik kalmis eski kayitlari tamamla.
       Bos teklifler numarasiz kalir; numaralari ilk icerikte ayrilir. */
    s.quotes
      .slice()
      .sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0))
      .forEach(q => { if (!q.no && !isBlankQuote(q)) q.no = issueQuoteNo(s); });

    return s;
  },

  /* Sunucu modunda yazma asenkron; sonuc onSaved ile bildirilir.
     Her durumda tarayici bellegine de sessiz bir kopya birakilir. */
  save() {
    if (this.mode === "server") {
      writeLocal(this.state);          // ikinci kopya, basarisiz olursa onemsiz
      this._dirty = true;
      this._flush();
      return true;
    }
    const ok = writeLocal(this.state);
    if (this.onSaved) this.onSaved(ok);
    return ok;
  },

  /* Ust uste gelen yazmalari tek siraya alir */
  async _flush() {
    if (this._writing) return;
    this._writing = true;
    while (this._dirty) {
      this._dirty = false;
      try {
        const res = await fetch(API_URL, {
          method:  "PUT",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(this.state)
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        if (this.onSaved) this.onSaved(true);
      } catch (e) {
        console.error("storage.json yazilamadi:", e);
        if (this.onSaved) this.onSaved(false, e);
      }
    }
    this._writing = false;
  },

  current() {
    return this.state.quotes.find(q => q.id === this.state.currentId) || this.state.quotes[0];
  },

  setCurrent(id) {
    if (this.state.quotes.some(q => q.id === id)) {
      this.state.currentId = id;
      this.save();
    }
  },

  /* Mevcut teklif zaten bossa yenisini acmaz; boylece art arda
     "Yeni" basmak numara yakmaz. Donen ikinci deger yeni mi acildi. */
  addQuote() {
    const simdiki = this.current();
    if (isBlankQuote(simdiki) && !simdiki.no) {
      this.state.currentId = simdiki.id;
      refreshBlankQuote(this.state, simdiki);
      this.save();
      return { quote: simdiki, created: false };
    }
    const q = emptyQuote();          // numara yok: icerik girilince ayrilir
    this.state.quotes.unshift(q);
    this.state.currentId = q.id;
    this.save();
    return { quote: q, created: true };
  },

  deleteQuote(id) {
    this.state.quotes = this.state.quotes.filter(q => q.id !== id);
    if (!this.state.quotes.length) {
      const blank = emptyQuote();
      blank.no = issueQuoteNo(this.state);
      this.state.quotes.push(blank);
    }
    if (!this.state.quotes.some(q => q.id === this.state.currentId)) {
      this.state.currentId = this.state.quotes[0].id;
    }
    this.save();
  },

  duplicateQuote(id) {
    const src = this.state.quotes.find(q => q.id === id);
    if (!src) return null;
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = uid();
    copy.no = issueQuoteNo(this.state);
    copy.date = isoDate(new Date());
    copy.updatedAt = Date.now();
    copy.items = copy.items.map(it => Object.assign({}, it, { id: uid() }));
    this.state.quotes.unshift(copy);
    this.state.currentId = copy.id;
    this.save();
    return copy;
  }
};

/* ---------- Yardimcilar ---------- */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function isoDate(d) {
  const p = n => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

/* ---------- Teklif numarasi sayaci ----------
   Sayac state.counter icinde durur ve storage.json ile birlikte diske
   yazilir; yil degisince sifirlanir. Mevcut tekliflerdeki en buyuk sira
   da hesaba katilir, boylece elle mudahale edilse veya yedek geri
   yuklense bile ayni numara iki kez verilmez.                        */

function counterState(state) {
  const year = new Date().getFullYear();
  if (!state.counter || state.counter.year !== year) {
    state.counter = { year: year, seq: 0 };
  }
  return state.counter;
}

/* Kayitli tekliflerde bu yila ait en buyuk sira numarasi */
function maxSeqInQuotes(state, year) {
  let max = 0;
  (state.quotes || []).forEach(q => {
    const m = String(q.no || "").match(/^(\d{4})-(\d+)$/);
    if (m && parseInt(m[1], 10) === year) max = Math.max(max, parseInt(m[2], 10));
  });
  return max;
}

function formatQuoteNo(year, seq) {
  return year + "-" + String(seq).padStart(3, "0");
}

/* Sayaci ilerletmeden sirada hangi numara oldugunu soyler */
function peekQuoteNo(state) {
  const c = counterState(state);
  return formatQuoteNo(c.year, Math.max(c.seq, maxSeqInQuotes(state, c.year)) + 1);
}

/* Sayaci ilerletir ve yeni numarayi dondurur */
function issueQuoteNo(state) {
  const c = counterState(state);
  c.seq = Math.max(c.seq, maxSeqInQuotes(state, c.year)) + 1;
  return formatQuoteNo(c.year, c.seq);
}

/* Numara elle yazildiysa sayac tam olarak oraya oturur (geri de alinabilir).
   Ayni numaranin iki kez verilmesini issueQuoteNo icindeki tarama onler. */
function syncCounterFromNo(state, no) {
  const m = String(no || "").match(/^(\d{4})-(\d+)$/);
  if (!m) return;
  const year = parseInt(m[1], 10);
  const seq  = parseInt(m[2], 10);
  if (year === counterState(state).year) state.counter.seq = seq;
}

/* Numarayi kesinlestirir (bir kez). Bos teklif numara yakmaz;
   ilk icerik girildiginde veya cikti alinirken burasi calisir. */
function commitQuoteNo(state, q) {
  if (!q || q.no) return false;
  q.no = issueQuoteNo(state);
  return true;
}

/* Ekranda ve belgede gosterilecek numara: kesinlesmediyse sirada bekleyen */
function displayQuoteNo(state, q) {
  return (q && q.no) || peekQuoteNo(state);
}

/* Sayaci elle ayarlar: "bir sonraki numara bu olsun".
   Gercekte verilecek numarayi dondurur (cakisma varsa farkli olabilir). */
function setNextQuoteNo(state, seq) {
  const c = counterState(state);
  c.seq = Math.max(0, (parseInt(seq, 10) || 1) - 1);
  return peekQuoteNo(state);
}

/* "1.234,56" / "1234.56" / "" -> sayi */
function num(v) {
  if (typeof v === "number") return isFinite(v) ? v : 0;
  if (v == null) return 0;
  let s = String(v).trim().replace(/[^\d.,-]/g, "");
  if (!s) return 0;
  const lastComma = s.lastIndexOf(",");
  const lastDot   = s.lastIndexOf(".");
  if (lastComma > -1 && lastComma > lastDot) {
    s = s.replace(/\./g, "").replace(",", ".");     // TR biciminde
  } else {
    s = s.replace(/,/g, "");                        // EN biciminde
  }
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}

const trNumber = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function money(v, currency) {
  return (currency || "₺") + trNumber.format(num(v));
}

function trDate(iso) {
  if (!iso) return "";
  const parts = String(iso).split("-");
  if (parts.length !== 3) return iso;
  return parts[2] + "." + parts[1] + "." + parts[0];
}

/* Teklif toplamlarini hesaplar */
function totals(q) {
  const sub = q.items.reduce((t, it) => t + num(it.qty) * num(it.price), 0);
  const discount = sub * (num(q.discount) / 100);
  const afterDiscount = sub - discount;
  const vat = q.vatOn ? afterDiscount * (num(q.vatRate) / 100) : 0;
  return {
    sub:      sub,
    discount: discount,
    net:      afterDiscount,
    vat:      vat,
    grand:    afterDiscount + vat
  };
}

/* Gorseli kucultup data URL olarak dondurur (localStorage dostu) */
function readImageResized(file, maxSide) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Dosya okunamadi"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Gecersiz gorsel"));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width  * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const cv = document.createElement("canvas");
        cv.width = w; cv.height = h;
        cv.getContext("2d").drawImage(img, 0, 0, w, h);
        try { resolve(cv.toDataURL("image/png")); }
        catch (e) { resolve(reader.result); }   // SVG vb. icin ham veriye don
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
