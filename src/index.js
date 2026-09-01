const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS
  });
}

function id() {
  return crypto.randomUUID();
}

function slugify(value) {
  return String(value || 'page')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60) || `page-${Date.now()}`;
}

async function uniqueSlug(db, requested) {
  const base = slugify(requested);
  let slug = base;

  for (let i = 1; i < 100; i++) {
    const row = await db
      .prepare('SELECT id FROM pages WHERE slug = ?')
      .bind(slug)
      .first();

    if (!row) return slug;
    slug = `${base}-${i + 1}`;
  }

  return `${base}-${Date.now()}`;
}

const defaultPage = {
  theme: {
    background: '#6B21A8',
    heading: '#FFFFFF',
    text: '#EDEDED',
    accent: '#FFD700',
    font: 'Hind Siliguri'
  },

  title:
    'ভিজিটরকে ক্রেতায় পরিণত করার জন্য তৈরি করুন হাই-কনভার্টিং Professional Landing Page—আপনার প্রোডাক্ট বা সার্ভিসকে দিন প্রিমিয়াম উপস্থাপনা!',

  description:
    'আকর্ষণীয় ডিজাইন, শক্তিশালী কপি এবং স্মুথ ইউজার এক্সপেরিয়েন্স—সবকিছু একসাথে পেতে যান, যা আপনার সেলস বাড়াবে বহুগুণ!',

  price: '',
  cta: 'এখনই অর্ডার করুন',

  sections: [
    'hero',
    'features',
    'pricing',
    'testimonial',
    'faq',
    'cta',
    'footer'
  ]
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path.startsWith('/api/')) {
      if (!env.DB) {
        return json(
          { error: 'D1 binding is not configured.' },
          500
        );
      }

      const parts = path.split('/').filter(Boolean);
      const action = parts[1];
      const pageId = parts[2];

      if (request.method === 'GET' && action === 'pages') {
        const { results } = await env.DB
          .prepare(
            'SELECT id, slug, title, published, created_at, updated_at FROM pages ORDER BY updated_at DESC'
          )
          .all();

        return json({ pages: results });
      }

      if (
        request.method === 'GET' &&
        action === 'page' &&
        pageId
      ) {
        const row = await env.DB
          .prepare(
            'SELECT * FROM pages WHERE id = ? OR slug = ? LIMIT 1'
          )
          .bind(pageId, pageId)
          .first();

        if (!row) {
          return json({ error: 'Page not found' }, 404);
        }

        return json({
          ...row,
          data: JSON.parse(row.data)
        });
      }

      if (
        request.method === 'POST' &&
        action === 'pages'
      ) {
        const body = await request.json();

        const pageData = {
          ...defaultPage,
          ...(body.data || {})
        };

        const pageIdNew = id();

        const slug = await uniqueSlug(
          env.DB,
          body.slug ||
            pageData.name ||
            pageData.title
        );

        await env.DB
          .prepare(
            'INSERT INTO pages (id, slug, title, data, published) VALUES (?, ?, ?, ?, ?)'
          )
          .bind(
            pageIdNew,
            slug,
            body.title ||
              pageData.title ||
              'Untitled Landing Page',
            JSON.stringify(pageData),
            body.published === false ? 0 : 1
          )
          .run();

        return json(
          {
            id: pageIdNew,
            slug,
            url: `${url.origin}/p/${slug}`
          },
          201
        );
      }

      if (
        request.method === 'PUT' &&
        action === 'pages' &&
        pageId
      ) {
        const body = await request.json();

        const current = await env.DB
          .prepare(
            'SELECT * FROM pages WHERE id = ? OR slug = ? LIMIT 1'
          )
          .bind(pageId, pageId)
          .first();

        if (!current) {
          return json(
            { error: 'Page not found' },
            404
          );
        }

        const data = body.data
          ? {
              ...defaultPage,
              ...body.data
            }
          : JSON.parse(current.data);

        const title =
          body.title ||
          data.title ||
          current.title;

        await env.DB
          .prepare(
            'UPDATE pages SET title = ?, data = ?, published = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
          )
          .bind(
            title,
            JSON.stringify(data),
            body.published === undefined
              ? current.published
              : body.published
              ? 1
              : 0,
            current.id
          )
          .run();

        return json({
          ok: true,
          id: current.id,
          slug: current.slug,
          url: `${url.origin}/p/${current.slug}`
        });
      }

      if (
        request.method === 'DELETE' &&
        action === 'pages' &&
        pageId
      ) {
        await env.DB
          .prepare(
            'DELETE FROM pages WHERE id = ? OR slug = ?'
          )
          .bind(pageId, pageId)
          .run();

        return json({ ok: true });
      }

      return json(
        { error: 'Not found' },
        404
      );
    }

    if (path.startsWith('/p/')) {
      const slug = decodeURIComponent(
        path.slice(3)
      ).split('/')[0];

      if (!env.DB) {
        return new Response(
          'D1 binding is not configured.',
          { status: 500 }
        );
      }

      const row = await env.DB
        .prepare(
          'SELECT * FROM pages WHERE slug = ? AND published = 1 LIMIT 1'
        )
        .bind(slug)
        .first();

      if (!row) {
        return new Response(
          'Landing page not found',
          { status: 404 }
        );
      }

      const data = JSON.parse(row.data);
      const html = renderLanding(data);

      return new Response(html, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store'
        }
      });
    }

    return env.ASSETS.fetch(request);
  }
};

function esc(v) {
  return String(v ?? '').replace(
    /[&<>"']/g,
    c =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[c]
  );
}

function renderLanding(d) {
  const t = d.theme || {};

  return `<!doctype html>
<html lang="bn">
<head>
<meta charset="utf-8">
<meta name="viewport"
content="width=device-width,initial-scale=1">

<title>${esc(d.title)}</title>

<meta name="description"
content="${esc(d.description)}">

<style>

:root{
--bg:${esc(t.background || '#6B21A8')};
--heading:${esc(t.heading || '#fff')};
--text:${esc(t.text || '#eee')};
--accent:${esc(t.accent || '#ffd700')}
}

*{
box-sizing:border-box
}

body{
margin:0;
background:var(--bg);
color:var(--text);
font-family:${esc(t.font || 'system-ui')},
system-ui,sans-serif
}

.wrap{
max-width:820px;
margin:auto;
padding:28px 18px 60px
}

.hero{
text-align:center;
padding:50px 10px 30px
}

.badge{
display:inline-block;
padding:8px 14px;
border:1px solid #ffffff33;
border-radius:999px;
background:#ffffff12
}

.hero h1{
font-size:clamp(34px,7vw,64px);
line-height:1.18;
color:var(--heading);
margin:22px 0 18px
}

.hero p{
font-size:19px;
line-height:1.8
}

.btn{
display:inline-block;
background:var(--accent);
color:#111;
text-decoration:none;
font-weight:800;
padding:16px 28px;
border-radius:14px;
margin-top:20px
}

.card{
background:#ffffff12;
border:1px solid #ffffff22;
border-radius:22px;
padding:24px;
margin:18px 0;
backdrop-filter:blur(10px)
}

.grid{
display:grid;
grid-template-columns:
repeat(auto-fit,minmax(180px,1fr));
gap:14px
}

.stat{
text-align:center
}

.price{
font-size:40px;
color:var(--accent);
font-weight:900
}

.footer{
text-align:center;
opacity:.8;
margin-top:45px
}

</style>
</head>

<body>

<main class="wrap">

<section class="hero">

<span class="badge">
🔥 High-Converting Landing Page
</span>

<h1>
${esc(d.title)}
</h1>

<p>
${esc(d.description)}
</p>

${
  d.price
    ? `<div class="price">${esc(d.price)}</div>`
    : ''
}

<a class="btn" href="#order">
${esc(d.cta || 'এখনই অর্ডার করুন')}
</a>

</section>

<section class="card">

<div class="grid">

<div class="stat">
<strong>হাই কনভার্টিং</strong>
<br>
ডিজাইন
</div>

<div class="stat">
<strong>দ্রুত ও</strong>
<br>
রেসপন্সিভ
</div>

<div class="stat">
<strong>বিশ্বাসযোগ্য</strong>
<br>
প্রেজেন্টেশন
</div>

</div>

</section>

<section id="order" class="card">

<h2>
অর্ডার করতে প্রস্তুত?
</h2>

<p>
আপনার অর্ডার/কন্টাক্ট ফর্ম এখানে যুক্ত করা যাবে।
</p>

<a class="btn" href="#">
${esc(d.cta || 'এখনই অর্ডার করুন')}
</a>

</section>

<div class="footer">
Cloudfloor Store
</div>

</main>

</body>
</html>`;
}
