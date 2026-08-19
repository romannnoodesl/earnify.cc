import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const INDEXNOW_KEY = "5dc532e98f46c3ddcbd4f5df7c71e9c4";
const SITE = "https://earnify.cc";

async function pingIndexNow(slug) {
  try {
    const url = `${SITE}/blog/${slug}.html`;
    const payload = {
      host: "earnify.cc",
      key: INDEXNOW_KEY,
      keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`,
      urlList: [url, `${SITE}/`, `${SITE}/sitemap.xml`],
    };
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });
    console.log(`IndexNow ping: HTTP ${res.status}`, res.ok ? "" : await res.text().catch(() => ""));
  } catch (err) {
    console.warn("IndexNow ping failed (non-fatal):", err.message);
  }
}

function loadMeta() {
  const raw = readFileSync(join(__dirname, "last-generated.json"), "utf-8");
  return JSON.parse(raw);
}

function updateRSS(meta) {
  const rssPath = join(ROOT, "rss.xml");
  let rss = readFileSync(rssPath, "utf-8");

  const guid = `https://earnify.cc/blog/${meta.slug}.html`;
  if (rss.includes(`>${guid}</guid>`)) {
    console.log("rss.xml already contains this post — skipping");
    return false;
  }

  const newItem = `    <item>
      <title>${escapeXML(meta.title)}</title>
      <link>${guid}</link>
      <guid isPermaLink="true">${guid}</guid>
      <pubDate>${meta.rssDate}</pubDate>
      <description><![CDATA[${meta.description}]]></description>
    </item>`;

  rss = rss.replace(
    /<lastBuildDate>.*?<\/lastBuildDate>/,
    `<lastBuildDate>${meta.rssDate}</lastBuildDate>`
  );

  const firstItemIndex = rss.indexOf("<item>");
  if (firstItemIndex !== -1) {
    rss = rss.slice(0, firstItemIndex) + newItem + "\n" + rss.slice(firstItemIndex);
  }

  writeFileSync(rssPath, rss);
  console.log("Updated rss.xml");
  return true;
}

function updateSitemap(meta) {
  const sitemapPath = join(ROOT, "sitemap.xml");
  let sitemap = readFileSync(sitemapPath, "utf-8");

  const loc = `https://earnify.cc/blog/${meta.slug}.html`;
  if (sitemap.includes(`<loc>${loc}</loc>`)) {
    console.log("sitemap.xml already contains this post — skipping");
    return false;
  }

  const today = meta.date;
  const newUrl = `
  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    <image:image>
      <image:loc>https://earnify.cc/og-image.png</image:loc>
      <image:title>${escapeXML(meta.title)}</image:title>
      <image:caption>${escapeXML(meta.description)}</image:caption>
    </image:image>
  </url>`;

  const insertBefore = "  <!-- XML / TEXT RESOURCES -->";
  if (sitemap.includes(insertBefore)) {
    sitemap = sitemap.replace(insertBefore, newUrl + "\n\n" + insertBefore);
  } else {
    const closingTag = "</urlset>";
    sitemap = sitemap.replace(closingTag, newUrl + "\n\n" + closingTag);
  }

  const refreshLastmod = [
    "<loc>https://earnify.cc/</loc>",
    "<loc>https://earnify.cc/demo/</loc>",
    "<loc>https://earnify.cc/llms.txt</loc>",
    "<loc>https://earnify.cc/rss.xml</loc>",
    "<loc>https://earnify.cc/opensearch.xml</loc>",
  ];
  for (const refreshLoc of refreshLastmod) {
    const escaped = refreshLoc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    sitemap = sitemap.replace(
      new RegExp(`(${escaped}\\s*<lastmod>)[^<]*(</lastmod>)`),
      `$1${today}$2`
    );
  }

  writeFileSync(sitemapPath, sitemap);
  console.log("Updated sitemap.xml");
  return true;
}

function updateBlogIndex(meta) {
  const indexPath = join(ROOT, "blog", "index.html");
  let html = readFileSync(indexPath, "utf-8");
  let insertedCard = false;

  const cardHref = `href="/blog/${meta.slug}.html"`;
  if (!html.includes(cardHref)) {
    const newCard = `
      <!-- Card: ${escapeHTML(meta.title)} -->
      <a href="/blog/${meta.slug}.html" class="article-card" style="display:flex;flex-direction:column;padding:1.75rem;text-decoration:none;">
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
          <span class="ac-tag" style="background:#dfe104;color:#09090b;font-size:0.625rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;padding:0.2rem 0.6rem;">${escapeHTML(meta.category)}</span>
          <span class="ac-meta" style="font-size:0.6875rem;color:#a1a1aa;">${escapeHTML(meta.readTime)}</span>
        </div>
        <h3 class="ac-title" style="font-size:1.25rem;font-weight:700;text-transform:uppercase;letter-spacing:-0.02em;margin-bottom:0.5rem;color:#FAFAFA;">${escapeHTML(meta.title)}</h3>
        <p class="ac-desc" style="font-size:0.8125rem;color:#a1a1aa;line-height:1.5;flex:1;">${escapeHTML(meta.description)}</p>
        <span class="ac-meta" style="font-size:0.6875rem;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.08em;margin-top:1rem;">${formatDisplayDate(meta.date)}</span>
      </a>`;

    const firstCardComment = "<!-- Card: Case Study 3x Revenue -->";
    if (!html.includes(firstCardComment)) {
      console.warn(`Anchor "${firstCardComment}" not found in blog/index.html — skipping card insertion`);
    } else {
      html = html.replace(firstCardComment, newCard + "\n\n      " + firstCardComment);
      insertedCard = true;
    }

    const newSchemaEntry = `{
        "@type": "BlogPosting",
        "headline": "${escapeJSON(meta.title)}",
        "url": "https://earnify.cc/blog/${meta.slug}.html",
        "datePublished": "${meta.date}",
        "description": "${escapeJSON(meta.description)}"
      }`;

    const blogPostIndex = html.indexOf('"blogPost": [');
    if (blogPostIndex !== -1) {
      const closeBracket = html.indexOf('\n    ]', blogPostIndex);
      if (closeBracket !== -1) {
        html =
          html.slice(0, closeBracket) +
          ",\n      " +
          newSchemaEntry +
          "\n" +
          html.slice(closeBracket);
      }
    }
  } else {
    console.log("blog/index.html already contains this post — skipping card");
  }

  const cardCount = (html.match(/<!-- Card: /g) || []).length;
  html = html.replace(
    /<div style="font-size:2rem;font-weight:700;letter-spacing:-0\.02em;color:#dfe104;">\d+<\/div>\s*<div style="font-size:0\.6875rem;text-transform:uppercase;letter-spacing:0\.1em;color:#a1a1aa;margin-top:0\.25rem;">Articles Published<\/div>/,
    `<div style="font-size:2rem;font-weight:700;letter-spacing:-0.02em;color:#dfe104;">${cardCount}</div>\n        <div style="font-size:0.6875rem;text-transform:uppercase;letter-spacing:0.1em;color:#a1a1aa;margin-top:0.25rem;">Articles Published</div>`
  );

  writeFileSync(indexPath, html);
  console.log(`blog/index.html processed (${insertedCard ? "card inserted" : "card already present"}, articles: ${cardCount})`);
  return insertedCard;
}

function formatDisplayDate(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function escapeXML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeJSON(str) {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");
}

function main() {
  const meta = loadMeta();
  console.log(`Updating feeds for: "${meta.title}"`);

  const rssChanged = updateRSS(meta);
  const sitemapChanged = updateSitemap(meta);
  const indexChanged = updateBlogIndex(meta);

  if (!rssChanged && !sitemapChanged && !indexChanged) {
    console.log("Post already present in all feeds — nothing to do");
    return;
  }

  pingIndexNow(meta.slug);
  console.log("All feeds updated successfully");
}

main();