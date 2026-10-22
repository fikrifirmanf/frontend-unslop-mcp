const esc = (s) => s.replace(/[<>&"]/g, "");

function svgPlaceholder(label, i, w, h) {
  const hues = [215, 160, 28, 275, 340, 190];
  const hue = hues[i % hues.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 30% 22%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360} 35% 36%)"/></linearGradient></defs>` +
    `<rect width="100%" height="100%" fill="url(#g)"/>` +
    `<text x="50%" y="50%" fill="hsl(${hue} 20% 88%)" font-family="system-ui,sans-serif" font-size="${Math.round(h / 14)}" text-anchor="middle" dominant-baseline="middle">${esc(label)}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export async function getVerifiedImages(args) {
  const query = String(args.query || "").trim();
  if (!query) return { status: "FAIL", message: "query is required, e.g. 'clean water village'.", _failed: true };
  const count = Math.min(Math.max(Number(args.count) || 4, 1), 12);
  const orientation = ["landscape", "portrait", "squarish"].includes(args.orientation) ? args.orientation : "landscape";
  const [w, h] = orientation === "portrait" ? [800, 1000] : orientation === "squarish" ? [800, 800] : [1200, 800];

  try {
    if (process.env.UNSPLASH_ACCESS_KEY) {
      const u = new URL("https://api.unsplash.com/search/photos");
      u.search = new URLSearchParams({ query, per_page: String(count), orientation, content_filter: "high" });
      const r = await fetch(u, { headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` }, signal: AbortSignal.timeout(10_000) });
      if (!r.ok) throw new Error(`Unsplash HTTP ${r.status}`);
      const j = await r.json();
      const images = j.results.map((p) => ({ url: p.urls.regular, alt: p.alt_description || p.description || query, credit: `Photo by ${p.user.name} on Unsplash`, creditUrl: p.user.links.html, width: p.width, height: p.height }));
      if (images.length) return { status: "OK", source: "unsplash", query, images, instruction: "Use these URLs verbatim with their alt text, and render the credit. Do not substitute remembered Unsplash IDs." };
    } else if (process.env.PEXELS_API_KEY) {
      const u = new URL("https://api.pexels.com/v1/search");
      u.search = new URLSearchParams({ query, per_page: String(count), orientation });
      const r = await fetch(u, { headers: { Authorization: process.env.PEXELS_API_KEY }, signal: AbortSignal.timeout(10_000) });
      if (!r.ok) throw new Error(`Pexels HTTP ${r.status}`);
      const j = await r.json();
      const images = j.photos.map((p) => ({ url: p.src.large2x, alt: p.alt || query, credit: `Photo by ${p.photographer} on Pexels`, creditUrl: p.photographer_url, width: p.width, height: p.height }));
      if (images.length) return { status: "OK", source: "pexels", query, images, instruction: "Use these URLs verbatim with their alt text, and render the credit." };
    }
  } catch (err) {
    return fallback(query, count, w, h, `Image API failed: ${err.message}`);
  }
  return fallback(query, count, w, h, process.env.UNSPLASH_ACCESS_KEY || process.env.PEXELS_API_KEY ? "No results for this query." : "No UNSPLASH_ACCESS_KEY or PEXELS_API_KEY set for the MCP server.");
}

function fallback(query, count, w, h, reason) {
  const images = Array.from({ length: count }, (_, i) => ({ url: svgPlaceholder(query, i, w, h), alt: query, placeholder: true, width: w, height: h }));
  return {
    status: "PLACEHOLDER",
    source: "local-svg",
    query,
    reason,
    images,
    instruction: "These are deterministic editorial SVG placeholders, safe to render. NEVER substitute guessed images.unsplash.com photo IDs. For real photos, set UNSPLASH_ACCESS_KEY or PEXELS_API_KEY in the MCP server env, or ask the user for assets.",
  };
}
