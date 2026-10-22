import { matchBracket } from "unslop-core";

const TS = /\.[cm]?tsx?$/;
const MARKUP = /\.(?:[jt]sx|html?|vue|svelte|astro|mdx)$/;

function effectFetchWithoutAbort(src) {
  const out = [];
  for (const m of src.matchAll(/\buseEffect\s*\(/g)) {
    const open = m.index + m[0].length - 1;
    const body = src.slice(open, matchBracket(src, open, "()"));
    if (/(?<![.\w$])fetch\s*\(|\baxios\.\w+\s*\(/.test(body) && !/AbortController|\bsignal\b|\bignore\b|\bcancelled\b/.test(body)) out.push({ index: m.index });
  }
  return out;
}

export const rules = [
  {
    id: "NO_TYPE_ESCAPE",
    severity: "ERROR",
    files: TS,
    regex: /:\s*any\b|\bas\s+any\b|\bas\s+unknown\s+as\b/,
    message: "Type escape (': any', 'as any', 'as unknown as'). Define explicit types and fix the root cause.",
    examples: [{ file: "a.tsx", bad: ["function Card(props: any) {}", "const x = y as unknown as Z"], good: ["function Card({ title }: CardProps) {}", "// props: any is banned"] }],
  },
  {
    id: "NO_CHECKER_SUPPRESSION",
    severity: "ERROR",
    scope: "raw",
    regex: /@ts-ignore|@ts-expect-error|eslint-disable/,
    message: "Type-checker/linter suppression. Fix the underlying error.",
    examples: [{ file: "a.tsx", bad: ["// @ts-ignore\n<X />", "{/* eslint-disable-next-line */}"], good: ["<X />"] }],
  },
  {
    id: "NO_SILENT_CATCH",
    severity: "ERROR",
    regex: /catch\s*(?:\([^)]*\))?\s*\{\s*(?:console\.(?:log|error|warn)\([^)]*\);?\s*)?\}|\.catch\(\s*\(\)\s*=>\s*(?:\{\s*\}|null|undefined)\s*\)/,
    message: "Silent or console-only catch. Surface an error state the user can see and retry.",
    examples: [{ file: "a.tsx", bad: ["try { await save() } catch (e) { console.log(e) }", "load().catch(() => {})"], good: ["try { await save() } catch (e) { setError(toMessage(e)) }"] }],
  },
  {
    id: "NO_AI_PURPLE_GRADIENT",
    severity: "ERROR",
    regex: /from-(?:indigo|purple|violet|blue)-[3-6]00[\s\S]{0,60}?to-(?:purple|pink|indigo|fuchsia|violet)-[3-6]00/,
    message: "Default 'AI SaaS purple' gradient. Use the project's design tokens.",
    examples: [{ file: "a.tsx", bad: ['<div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">'], good: ['<div className="bg-primary">'] }],
  },
  {
    id: "NO_PLACEHOLDER",
    severity: "ERROR",
    scope: "raw",
    regex: /via\.placeholder\.com|placehold\.co|placekitten|picsum\.photos|Lorem ipsum|(?:\/\/|\{\/\*|\/\*)\s*(?:TODO|FIXME)\b|John Doe|jane@example\.com|acme (?:inc|corp)/i,
    message: "Placeholder content, stock filler or TODO left in the UI. Use real copy, real data or get_verified_images.",
    examples: [{ file: "a.tsx", bad: ["<p>Lorem ipsum dolor</p>", '<img src="https://via.placeholder.com/150" />', "// TODO wire up", "<span>John Doe</span>"], good: ["<p>{user.name}</p>", "const todos = useTodos()"] }],
  },
  {
    id: "NO_GUESSED_UNSPLASH_ID",
    severity: "ERROR",
    regex: /images\.unsplash\.com\/photo-[\w-]+(?![\w-]*\?[^"'`\s]*ixid=)(?![\w-]*\?[^"'`\s]*ixlib=)/,
    message: "Unsplash photo URL not from get_verified_images (guessed IDs show wrong or broken photos). Call get_verified_images or use its placeholders.",
    examples: [{ file: "a.tsx", bad: ['src="https://images.unsplash.com/photo-1501004318641-b39e6451bec6?w=800"'], good: ['src="https://images.unsplash.com/photo-1501004318641-b39e6451bec6?ixid=M3w1&ixlib=rb-4.0.3"'] }],
  },
  {
    id: "NO_AMBIENT_BLUR_BLOB",
    severity: "ERROR",
    regex: /\bblur-(?:2xl|3xl)\b|\bblur-\[(?:[4-9]\d|\d{3,})px\]/,
    message: "Ambient blurred corner blob. Use flat, full-bleed contrast bands instead.",
    examples: [{ file: "a.tsx", bad: ['<div className="absolute -top-20 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />', '<div className="blur-[120px]" />'], good: ['<div className="backdrop-blur-sm" />', '<div className="blur-sm" />'] }],
  },
  {
    id: "DYNAMIC_TAILWIND_CLASS",
    severity: "ERROR",
    regex: /\b(?:bg|text|border|from|via|to|ring|fill|stroke|shadow|outline|decoration|divide|grid-cols|col-span|gap|p[xytrbl]?|m[xytrbl]?|w|h)-\$\{/,
    message: "Interpolated Tailwind class (e.g. `bg-${color}-500`) is never generated. Map values to complete literal class strings.",
    examples: [{ file: "a.tsx", bad: ["className={`bg-${tone}-500 p-4`}", "className={`grid-cols-${n}`}"], good: ["className={toneClass[tone]}", "className={`p-4 ${active ? 'bg-primary' : 'bg-muted'}`}"] }],
  },
  {
    id: "FROZEN_COUNTER_STATE",
    severity: "ERROR",
    regex: /const\s*\[\s*\w*(?:animated|display(?:ed)?|countUp|counted)\w*\s*,\s*set\w+\s*\]\s*=\s*useState\(\s*0\s*\)/i,
    message: "Count-up state initialised at 0 renders partial nonsense (e.g. '23%') in SSR/screenshots. Render the final value and animate with CSS, or initialise with the target.",
    examples: [{ file: "a.tsx", bad: ["const [animatedValue, setAnimatedValue] = useState(0)", "const [displayCount, setDisplayCount] = useState(0)"], good: ["const [count, setCount] = useState(0)", "const [animatedValue, setAnimatedValue] = useState(target)"] }],
  },
  {
    id: "HYDRATION_TRAP",
    severity: "ERROR",
    files: MARKUP,
    regex: /\{\s*(?:new\s+Date\([^)]*\)\.to\w+\(|Date\.now\(\)|Math\.random\(\))/,
    message: "Non-deterministic value rendered in JSX causes a hydration mismatch. Compute it in an effect or pass it from the server.",
    examples: [{ file: "a.tsx", bad: ["<p>{new Date().toLocaleDateString()}</p>", "<p>{Math.random()}</p>"], good: ["<p>{formatDate(post.publishedAt)}</p>"] }],
  },
  {
    id: "INDEX_AS_KEY",
    severity: "ERROR",
    files: MARKUP,
    regex: /\bkey=\{\s*(?:i|idx|index|_?i)\s*\}|\bkey=\{`[^`]*\$\{\s*(?:i|idx|index)\s*\}`\}/,
    message: "Array index used as React key: reordering/filtering reuses the wrong component state. Use a stable id.",
    examples: [{ file: "a.tsx", bad: ["items.map((it, i) => <Row key={i} />)", "<Row key={`row-${index}`} />"], good: ["<Row key={it.id} />"] }],
  },
  {
    id: "DEAD_LINK",
    severity: "ERROR",
    files: MARKUP,
    regex: /\bhref=(?:"#"|'#'|""|\{["']#["']\})|\bhref=["']javascript:/,
    message: "Dead link (href=\"#\"/empty/javascript:). Link to a real route, or use a <button> for actions.",
    examples: [{ file: "a.tsx", bad: ['<a href="#">Pricing</a>', '<a href="javascript:void(0)">x</a>'], good: ['<a href="/pricing">Pricing</a>', '<a href="#faq">FAQ</a>'] }],
  },
  {
    id: "INVISIBLE_INITIAL_OPACITY",
    severity: "WARN",
    regex: /initial=\{\{\s*opacity:\s*0\b/,
    message: "initial opacity 0 leaves sections invisible in SSR/full-page captures. Keep content visible by default; animate a small y-translate.",
    examples: [{ file: "a.tsx", bad: ["<motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1 }}>"], good: ["<motion.div initial={{ y: 12 }} whileInView={{ y: 0 }}>"] }],
  },
  {
    id: "HEADING_WITHOUT_TEXT_BALANCE",
    severity: "WARN",
    regex: /<h[1-3]\b[^>]*className=(?:"(?![^"]*text-balance)[^"]*"|\{`(?![^`]*text-balance)[^`]*`\})/,
    message: "Heading lacks text-balance; single words will dangle on the last line. Add `text-balance` (and `text-pretty` on paragraphs).",
    examples: [{ file: "a.tsx", bad: ['<h1 className="text-4xl font-bold">'], good: ['<h1 className="text-4xl font-bold text-balance">'] }],
  },
  {
    id: "NO_HARDCODED_HEX_CLASS",
    severity: "WARN",
    regex: /\b(?:bg|text|border|from|to|via|ring|fill|stroke)-\[#[0-9a-fA-F]{3,8}\]/,
    message: "Arbitrary hex in a Tailwind class. Prefer semantic tokens (bg-background, text-foreground).",
    examples: [{ file: "a.tsx", bad: ['<div className="bg-[#0f172a]">'], good: ['<div className="bg-background">'] }],
  },
  {
    id: "DERIVED_STATE_USEEFFECT",
    severity: "WARN",
    regex: /useEffect\(\s*\(\)\s*=>\s*\{\s*set[A-Z]\w*\((?!\s*true\s*\))/,
    message: "setState directly inside useEffect. Compute derived state during render or with useMemo.",
    examples: [{ file: "a.tsx", bad: ["useEffect(() => { setTotal(items.length) }, [items])"], good: ["const total = items.length", "useEffect(() => { setMounted(true) }, [])"] }],
  },
  {
    id: "EFFECT_FETCH_WITHOUT_ABORT",
    severity: "WARN",
    check: effectFetchWithoutAbort,
    message: "fetch inside useEffect without AbortController/ignore flag races on fast re-renders. Abort in the cleanup, or use the framework's data loader.",
    examples: [{ file: "a.tsx", bad: ["useEffect(() => { fetch(url).then(r => r.json()).then(setData) }, [url])"], good: ["useEffect(() => {\n  const ac = new AbortController();\n  fetch(url, { signal: ac.signal }).then(r => r.json()).then(setData);\n  return () => ac.abort();\n}, [url])"] }],
  },
  {
    id: "DANGEROUS_HTML",
    severity: "WARN",
    regex: /dangerouslySetInnerHTML(?!=\{\{\s*__html:\s*JSON\.stringify\()|\bv-html=|\{@html\s/,
    message: "Raw HTML injection. Sanitize with DOMPurify (or render structured content) to avoid XSS.",
    examples: [{ file: "a.tsx", bad: ["<div dangerouslySetInnerHTML={{ __html: body }} />"], good: ["<Markdown>{body}</Markdown>", '<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />'] }],
  },
];
