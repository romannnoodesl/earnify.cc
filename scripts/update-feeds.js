import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function loadMeta() {
  const raw = readFileSync(join(__dirname, "last-generated.json"), "utf-8");
  return JSON.parse(raw);
}

function updateRSS(meta) {
  const rssPath = join(ROOT, "rss.xml");
  let rss = readFileSync(rssPath, "utf-8");

  const newItem = `
    <item>
      <title>${escapeXML(meta.title)}</title>
      <link>https://earnify.cc/blog/${meta.slug}.html</link>
      <guid isPermaLink="true">https://earnify.cc/blog/${meta.slug}.html</guid>
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
}

function updateSitemap(meta) {
  const sitemapPath = join(ROOT, "sitemap.xml");
  let sitemap = readFileSync(sitemapPath, "utf-8");

  const today = meta.date;
  const newUrl = `
  <url>
    <loc>https://earnify.cc/blog/${meta.slug}.html</loc>
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

  sitemap = sitemap.replace(
    /<lastmod>2026-06-19<\/lastmod>/g,
    `<lastmod>${today}</lastmod>`
  );

  writeFileSync(sitemapPath, sitemap);
  console.log("Updated sitemap.xml");
}

function updateBlogIndex(meta) {
  const indexPath = join(ROOT, "blog", "index.html");
  let html = readFileSync(indexPath, "utf-8");

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
  if (html.includes(firstCardComment)) {
    html = html.replace(firstCardComment, newCard + "\n\n      " + firstCardComment);
  }

  const newSchemaEntry = `{
        "@type": "BlogPosting",
        "headline": "${escapeJSON(meta.title)}",
        "url": "https://earnify.cc/blog/${meta.slug}.html",
        "datePublished": "${meta.date}",
        "description": "${escapeJSON(meta.description)}"
      }`;

  const lastBlogPost = html.lastIndexOf('"@type": "BlogPosting"');
  if (lastBlogPost !== -1) {
    const afterLastPost = html.indexOf("}", lastBlogPost) + 1;
    const nextLine = html.indexOf("\n", afterLastPost);
    const trimmedLine = html.indexOf("\n", nextLine + 1);
    html =
      html.slice(0, trimmedLine + 1) +
      "      " +
      newSchemaEntry +
      ",\n" +
      html.slice(trimmedLine + 1);
  }

  html = html.replace(
    /<div style="font-size:2rem;font-weight:700;letter-spacing:-0.02em;color:#dfe104;">\d+<\/div>\s*<div style="font-size:0\.6875rem[^"]*">Articles Published<\/div>/,
    (match) => {
      const currentCount = parseInt(match.match(/>(\d+)</)[1]);
      return match.replace(
        new RegExp(`>${currentCount}<`),
        `>${currentCount + 1}<`
      );
    }
  );

  writeFileSync(indexPath, html);
  console.log("Updated blog/index.html");
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

  updateRSS(meta);
  updateSitemap(meta);
  updateBlogIndex(meta);

  console.log("All feeds updated successfully");
}

main();
