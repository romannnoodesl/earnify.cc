import OpenAI from "openai";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const MODEL = process.env.OPENROUTER_MODEL || "deepseek/deepseek-v4-pro";

function loadTopics() {
  const raw = readFileSync(join(__dirname, "topics.json"), "utf-8");
  return JSON.parse(raw);
}

function saveTopics(data) {
  writeFileSync(join(__dirname, "topics.json"), JSON.stringify(data, null, 2) + "\n");
}

function formatDate(date) {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function formatDateISO(date) {
  return date.toISOString().split("T")[0];
}

function formatRSSDate(date) {
  return date.toUTCString();
}

function slugToTitle(slug) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function generateBlogPost(topic, retries = 3) {
  const systemPrompt = `You are an expert technical writer for Earnify (Earnify.cc), a browser-based cryptocurrency mining platform for website publishers. You write SEO-optimized blog posts about browser mining, website monetization, crypto, and publisher revenue strategies.

Your tone is authoritative, technical but accessible, and data-driven. You use real numbers, specific examples, and actionable advice. You never use hype or clickbait.

earnify is an open-source browser-based mining solution. Key facts:
- 10% platform fee, 90% to publisher
- Supports MinotaurX
- Zero-server architecture: all mining happens in the browser via Web Workers + WASM
- Uses WebSocket Stratum protocol to connect to mining pools
- Mines DOGE (Dogecoin) and other CPU-mineable coins
- GDPR compliant: zero data collection, no cookies, no tracking
- Single script tag deployment
- Works on desktop browsers (Chrome, Firefox, Edge); limited Safari support
- ~70% of native CPU speed via WebAssembly
- Reserves n-1 CPU cores for mining (1 for UI thread)

The blog targets website publishers, developers, freelancers, agencies, and crypto enthusiasts.`;

  const userPrompt = `Write a complete blog post about: "${topic.title}"

Requirements:
1. Write the blog content as HTML (not markdown). Use rich formatting with the available components listed below.
2. Every <h2> and <h3> must have an id attribute for the table of contents (use lowercase kebab-case).
3. Aim for 1200-1800 words (roughly 6-8 minute read).
4. Include 3-5 H2 sections and 2-3 H3 subsections.
5. Reference Earnify naturally where relevant (don't force it).
6. Include specific numbers, benchmarks, or data points where possible. When citing Earnify's own data, attribute it inline — e.g. "According to Earnify's 2026 hashrate benchmarks, a desktop visitor on MinotaurX averages 1,870 H/s" — so generative engines can quote the brand by name.
7. End with a clear call-to-action related to earnify.
8. Link to related Earnify blog posts where relevant using <a> tags with style="color:#dfe104;text-decoration:underline;" and href like "/blog/slug.html".
9. Do NOT include any <html>, <head>, <body>, <nav>, <style>, or <script> tags. Only output the article content that goes INSIDE the <article> tag.
10. Do NOT include the breadcrumb, table of contents, or related articles sections.
11. Include a "FAQs" section with 2-3 question/answer pairs and return them in the "faqs" field as [{"q": "...", "a": "one short paragraph"}] — these become FAQ structured data.

Available visual components (use these to make posts look professional and data-rich):
- TABLES: Use <table class="rev-table"> for revenue/data tables and <table class="cmp-table"> for comparison tables. Table cells can use class="highlight" (yellow bg), class="winner" (green), class="check" (green text), class="cross" (red text), or class="warn" (orange text).
- CALLOUT BOXES: Use <div class="perf-box"> for key statistics, definitions, and important takeaways.
- CODE BLOCKS: For multi-line code, use <div class="code-block">. For syntax highlighting inside code blocks, wrap keywords in <span class="kw">, function names in <span class="fn">, strings in <span class="str">, numbers in <span class="num">, and comments in <span class="cm">. For inline code, use <code>.
- FLOW DIAGRAMS: Use <div class="flow-diagram"> for ASCII-style architecture/flow diagrams (monospace text).
- SVG CHARTS: Include in-line SVG bar charts where data visualization adds value, wrapped in <div style="background:#0c0c0f;border:2px solid #27272a;padding:1.5rem;margin:1.5rem 0 2.5rem;"> with a caption <p style="font-size:0.6875rem;color:#3f3f46;text-align:center;margin-top:0.75rem;">.

12. The content, title, and description must be original. Do not reuse near-duplicate angles of previously published articles on similar topics — differentiate with a fresh angle, new data, or a specific use case.
13. Return ONLY a JSON object with this exact structure (no markdown fences):
{
  "title": "The blog post title",
  "description": "A 150-160 character meta description for SEO",
  "category": "${topic.category}",
  "readTime": "X min read",
  "content": "The full HTML article content including tables, code blocks, charts, and callout boxes",
  "toc": [{"id": "section-id", "label": "Section Label", "h3": false}],
  "faqs": [{"q": "Short question", "a": "Concise one-paragraph answer with a fact or number"}],
  "structuredData": {"headline": "...", "description": "..."}
}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 8000,
        response_format: { type: "json_object" },
      });

      const content = response?.choices?.[0]?.message?.content;
      if (!content || typeof content !== "string") {
        throw new Error("Empty or invalid API response content");
      }
      return JSON.parse(content);
    } catch (err) {
      if (attempt < retries) {
        const delay = Math.pow(2, attempt) * 2000 + Math.random() * 1000;
        console.warn(`API attempt ${attempt + 1} failed: ${err.message}. Retrying in ${Math.round(delay)}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
  throw new Error("Unexpected: retry loop exhausted");
}

function escapeJSON(str) {
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function validateLinks(content) {
  const blogDir = join(__dirname, "..", "blog");
  return content.replace(
    /(?:https:\/\/earnify\.cc)?(\/blog\/[a-z0-9-]+\.html)(?:#[^"]*)?/g,
    (match, path) => {
      const slug = path.replace("/blog/", "");
      if (!existsSync(join(blogDir, slug))) {
        console.warn(`Rewriting missing internal link: ${path} -> /blog/`);
        return match.replace(path, "/blog/");
      }
      return match;
    }
  );
}

function buildHTML(post, topic, date) {
  const dateStr = formatDate(date);
  const dateISO = formatDateISO(date);
  const rssDate = formatRSSDate(date);
  const content = validateLinks(post.content || "");

  const title = escapeHTML(post.title || topic.title);
  const description = escapeHTML(post.description || "");
  const readTime = escapeHTML(post.readTime || "");
  const postTitle = String(post.title || topic.title);
  const structuredData = post.structuredData || {};

  const wordCount = Math.round(
    content.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length
  );

  const faqs = (post.faqs || []).filter((f) => f && f.q && f.a).slice(0, 3);
  const faqSchema = faqs.length
    ? `<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      ${faqs
        .map(
          (f) => `{
        "@type": "Question",
        "name": "${escapeJSON(f.q)}",
        "acceptedAnswer": { "@type": "Answer", "text": "${escapeJSON(f.a)}" }
      }`
        )
        .join(",\n      ")}
    ]
  }
  </script>`
    : "";
  const faqSection = faqs.length
    ? `<h2 id="faq">Frequently Asked Questions</h2>
      <div style="display:grid;gap:1rem;margin:1.5rem 0 2.5rem;">
        ${faqs
          .map(
            (f) => `<details style="border:1px solid #27272a;background:#0c0c0f;padding:1rem 1.25rem;">
          <summary style="font-weight:700;text-transform:uppercase;letter-spacing:0.02em;cursor:pointer;color:#FAFAFA;">${escapeHTML(f.q)}</summary>
          <p style="margin-top:0.75rem;">${escapeHTML(f.a)}</p>
        </details>`
          )
          .join("\n        ")}
      </div>`
    : "";

  const tocHTML = post.toc
    .map(
      (t) =>
        `<a href="#${t.id}" class="toc-link${t.h3 ? " toc-h3" : ""}">${t.label}</a>`
    )
    .join("\n            ");

  return `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — Earnify Blog</title>
  <meta name="description" content="${description}" />
  <meta name="keywords" content="browser mining, ${escapeHTML(topic.category.toLowerCase())}, earnify, website monetization, cryptocurrency mining, ${escapeHTML(topic.slug.replace(/-/g, ", "))}" />
  <link rel="canonical" href="https://earnify.cc/blog/${topic.slug}.html" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="https://earnify.cc/blog/${topic.slug}.html" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="https://earnify.cc/og-image.png" />
  <meta property="og:image:width" content="1731" />
  <meta property="og:image:height" content="909" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:site_name" content="Earnify" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="https://earnify.cc/og-image.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="alternate" type="application/rss+xml" title="Earnify Blog" href="/rss.xml" />
  <link rel="search" type="application/opensearchdescription+xml" title="Earnify Search" href="/opensearch.xml" />
  <link rel="manifest" href="/manifest.json" />
  <meta name="theme-color" content="#09090B" />
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "${escapeJSON(structuredData.headline || postTitle)}",
    "description": "${escapeJSON(structuredData.description || postTitle)}",
    "author": { "@type": "Organization", "name": "Earnify", "url": "https://earnify.cc" },
    "publisher": { "@type": "Organization", "name": "Earnify", "logo": { "@type": "ImageObject", "url": "https://earnify.cc/favicon.svg" } },
    "mainEntityOfPage": { "@type": "WebPage", "@id": "https://earnify.cc/blog/${topic.slug}.html" },
    "datePublished": "${dateISO}",
    "dateModified": "${dateISO}",
    "image": "https://earnify.cc/og-image.png",
    "inLanguage": "en",
    "wordCount": ${wordCount},
    "articleSection": "${topic.category}"
  }
  </script>
  ${faqSchema}
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://earnify.cc/" },
      { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://earnify.cc/blog/" },
      { "@type": "ListItem", "position": 3, "name": "${escapeJSON(postTitle)}" }
    ]
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "SpeakableSpecification",
    "xpath": [
      "/html/head/title",
      "/html/head/meta[@name='description']/@content"
    ]
  }
  </script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #09090b; color: #FAFAFA; font-family: "Space Grotesk", sans-serif; line-height: 1.6; overflow-x: hidden; }
    ::selection { background: #dfe104; color: #000; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #09090b; }
    ::-webkit-scrollbar-thumb { background: #3f3f46; }
    .nav-link { text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.875rem; }
    .nav-link:hover { color: #dfe104; }
    .btn { display: inline-block; padding: 1rem 2rem; border: 2px solid #27272a; text-transform: uppercase; font-weight: 700; transition: all 0.2s; letter-spacing: -0.02em; }
    .btn:hover { background: #FAFAFA; color: #09090b; }
    .btn-accent { background: #dfe104; color: #09090b; border-color: #dfe104; }
    .btn-accent:hover { background: #c9cc04; border-color: #c9cc04; color: #09090b; }
    .toc-link { display: block; padding: 0.35rem 0; font-size: 0.8125rem; color: #a1a1aa; text-decoration: none; border-left: 2px solid transparent; padding-left: 1rem; transition: all 0.15s; }
    .toc-link:hover, .toc-link.active { color: #dfe104; border-left-color: #dfe104; }
    .toc-link.toc-h3 { padding-left: 2rem; font-size: 0.75rem; }
    article h2 { font-size: 1.75rem; text-transform: uppercase; font-weight: 700; margin: 3rem 0 1rem 0; letter-spacing: -0.02em; scroll-margin-top: 6rem; }
    article h3 { font-size: 1.25rem; text-transform: uppercase; font-weight: 600; margin: 2rem 0 0.75rem 0; letter-spacing: -0.02em; scroll-margin-top: 6rem; }
    article p { margin-bottom: 1.25rem; color: #d4d4d8; font-size: 1.0625rem; }
    article ul, article ol { margin-bottom: 1.25rem; padding-left: 1.5rem; color: #d4d4d8; }
    article li { margin-bottom: 0.5rem; }
    article strong { color: #FAFAFA; }
    article pre { background: #131316; border: 1px solid #27272a; padding: 1.25rem; overflow-x: auto; font-family: "Space Grotesk", monospace; font-size: 0.875rem; line-height: 1.7; margin-bottom: 1.5rem; color: #d4d4d8; }
    article code { font-family: "Space Grotesk", monospace; font-size: 0.875rem; background: #131316; padding: 0.1rem 0.35rem; border: 1px solid #27272a; }
    article pre code { background: none; padding: 0; border: none; }
    .rev-table { width: 100%; border-collapse: collapse; margin: 1.5rem 0 2.5rem; font-size: 0.9375rem; }
    .rev-table th { text-align: left; padding: 0.75rem 1rem; font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.1em; color: #a1a1aa; border-bottom: 2px solid #27272a; font-weight: 600; }
    .rev-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #1c1c1f; color: #d4d4d8; }
    .rev-table tr:last-child td { border-bottom: none; }
    .rev-table .highlight { background: rgba(223,225,4,0.06); color: #dfe104; font-weight: 700; }
    .cmp-table { width: 100%; border-collapse: collapse; margin: 1.5rem 0 2.5rem; font-size: 0.9375rem; }
    .cmp-table th { text-align: left; padding: 0.75rem 1rem; font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.1em; color: #a1a1aa; border-bottom: 2px solid #27272a; font-weight: 600; }
    .cmp-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #1c1c1f; color: #d4d4d8; }
    .cmp-table tr:last-child td { border-bottom: none; }
    .winner { color: #22c55e !important; font-weight: 700; }
    .check { color: #22c55e !important; }
    .cross { color: #ef4444 !important; }
    .warn { color: #f59e0b !important; }
    .code-block { background: #18181b; border: 2px solid #27272a; padding: 1.5rem; margin: 1.5rem 0; font-family: "SF Mono","Fira Code","Fira Mono",monospace; font-size: 0.8125rem; line-height: 1.8; color: #d4d4d8; overflow-x: auto; white-space: pre; }
    .code-block .kw { color: #dfe104; }
    .code-block .fn { color: #FAFAFA; }
    .code-block .cm { color: #52525b; }
    .code-block .str { color: #a1a1aa; }
    .code-block .num { color: #dfe104; }
    .flow-diagram { background: #18181b; border: 2px solid #27272a; padding: 2rem; margin: 1.5rem 0; font-family: "SF Mono","Fira Code","Fira Mono",monospace; font-size: 0.8125rem; line-height: 1.7; color: #d4d4d8; overflow-x: auto; white-space: pre; }
    .flow-diagram .node { color: #dfe104; font-weight: 700; }
    .flow-diagram .arrow { color: #52525b; }
    .flow-diagram .label { color: #a1a1aa; }
    .perf-box { background: #0c0c0f; border: 2px solid #27272a; padding: 1.5rem; margin: 1.5rem 0 2.5rem; }
    .perf-box p { font-size: 0.9375rem; margin-bottom: 0.75rem; }
    .card { border: 2px solid #27272a; transition: background-color 0.2s,border-color 0.2s; background: #09090b; }
    .card:hover { background: #dfe104; border-color: #dfe104; }
    .card:hover .card-title, .card:hover .card-desc, .card:hover .card-tag { color: #000 !important; }
    @media (max-width: 767px) { .toc-sidebar { position: static !important; width: 100% !important; margin-bottom: 2rem; } }
    @media (max-width: 640px) { .rev-table, .cmp-table { font-size: 0.8125rem; } .rev-table th, .rev-table td, .cmp-table th, .cmp-table td { padding: 0.5rem 0.5rem; } }
  </style>
</head>
<body>
  <nav role="navigation" style="position:fixed;top:0;width:100%;z-index:50;border-bottom:2px solid #27272a;background:rgba(9,9,11,0.95);backdrop-filter:blur(8px);">
    <div style="max-width:95vw;margin:0 auto;padding:0 1.5rem;height:4rem;display:flex;justify-content:space-between;align-items:center;">
      <a href="/" style="display:flex;align-items:center;gap:0.5rem;text-decoration:none;">
        <span style="font-size:1.5rem;font-weight:700;letter-spacing:-0.05em;text-transform:uppercase;color:#FAFAFA;">Earn<span style="color:#dfe104;">ify</span></span>
      </a>
      <div style="display:flex;align-items:center;gap:2rem;">
        <a href="/" class="nav-link" style="color:#a1a1aa;text-decoration:none;">Home</a>
        <a href="/blog/" class="nav-link" style="color:#dfe104;text-decoration:none;">Blog</a>
      </div>
    </div>
  </nav>

  <main style="max-width:1100px;margin:0 auto;padding:7rem 1.5rem 5rem 1.5rem;">
    <nav aria-label="Breadcrumb" style="margin-bottom:2.5rem;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;">
      <a href="/" style="color:#a1a1aa;text-decoration:none;">Home</a>
      <span style="color:#27272a;margin:0 0.5rem;">/</span>
      <a href="/blog/" style="color:#a1a1aa;text-decoration:none;">Blog</a>
      <span style="color:#27272a;margin:0 0.5rem;">/</span>
      <span style="color:#dfe104;">${title}</span>
    </nav>

    <div style="display:flex;gap:3rem;flex-wrap:wrap;">
      <article style="flex:1;min-width:0;max-width:750px;">
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:1rem;margin-bottom:1.5rem;">
          <span style="background:#dfe104;color:#09090b;font-size:0.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;padding:0.25rem 0.75rem;">${escapeHTML(topic.category)}</span>
          <span style="font-size:0.75rem;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.08em;">${dateStr}</span>
          <span style="font-size:0.75rem;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.08em;">${readTime}</span>
        </div>

        <h1 style="font-size:clamp(2rem,5vw,3.5rem);font-weight:700;line-height:1.05;text-transform:uppercase;letter-spacing:-0.02em;margin-bottom:1.5rem;">${title}</h1>
        <p style="font-size:1.25rem;color:#a1a1aa;margin-bottom:2.5rem;padding-bottom:2.5rem;border-bottom:2px solid #27272a;">${description}</p>

        ${content}

        ${faqSection}

        <div style="margin-top:3rem;padding:2.5rem;border:2px solid #dfe104;text-align:center;background:#09090b;">
          <h3 style="font-size:1.5rem;font-weight:700;text-transform:uppercase;letter-spacing:-0.02em;margin-bottom:1rem;">Deploy Browser Mining in 5 Minutes</h3>
          <p style="margin-bottom:1.5rem;color:#a1a1aa;">Workers, WASM, and Stratum — wired up and ready. Single script tag, open source, 10% fee.</p>
          <a href="https://earnify.cc/#deploy" class="btn btn-accent" style="text-decoration:none;color:#09090b;">Get Started with Earnify</a>
        </div>
      </article>

      <aside class="toc-sidebar" style="width:220px;flex-shrink:0;">
        <div style="position:sticky;top:6rem;">
          <h4 style="font-size:0.6875rem;text-transform:uppercase;letter-spacing:0.15em;color:#a1a1aa;margin-bottom:1rem;font-weight:600;">Contents</h4>
          <nav>
            ${tocHTML}
          </nav>
        </div>
      </aside>
    </div>
  </main>

  <script>
    const tocLinks = document.querySelectorAll('.toc-link');
    const headings = document.querySelectorAll('article h2[id], article h3[id]');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          tocLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id);
          });
        }
      });
    }, { rootMargin: '-80px 0px -70% 0px' });
    headings.forEach(h => observer.observe(h));
  </script>
  <script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
  </script>
</body>
</html>`;
}

async function main() {
  const topicsData = loadTopics();

  let topic = null;
  for (const candidate of topicsData.topics.filter((t) => !t.used)) {
    const outPath = join(ROOT, "blog", `${candidate.slug}.html`);
    if (existsSync(outPath)) {
      console.warn(`Skipping topic "${candidate.slug}" — blog file already exists; marking as used.`);
      candidate.used = true;
      saveTopics(topicsData);
      continue;
    }
    topic = candidate;
    break;
  }

  if (!topic) {
    console.error("No unused topics left. Add more topics to scripts/topics.json");
    process.exit(1);
  }

  console.log(`Generating blog post: "${topic.title}"`);

  const post = await generateBlogPost(topic);
  console.log(`AI generated content (${post.readTime})`);

  const now = new Date();
  const html = buildHTML(post, topic, now);

  topic.used = true;
  topicsData.nextTopicIndex++;
  saveTopics(topicsData);
  console.log("Topics file updated");

  const outPath = join(ROOT, "blog", `${topic.slug}.html`);
  writeFileSync(outPath, html);
  console.log(`Written to: blog/${topic.slug}.html`);

  const meta = {
    slug: topic.slug,
    title: post.title,
    description: post.description,
    category: topic.category,
    readTime: post.readTime,
    date: formatDateISO(now),
    rssDate: formatRSSDate(now),
  };
  const metaPath = join(__dirname, "last-generated.json");
  writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n");
  console.log("Metadata saved to scripts/last-generated.json");
}

main().catch((err) => {
  console.error("Blog generation failed:", err.message);
  process.exit(1);
});
