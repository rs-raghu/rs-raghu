const GITHUB_USER   = "rs-raghu";
const LEETCODE_USER = "rs-raghu";
const BANNER_URL    = "https://raw.githubusercontent.com/rs-raghu/rs-raghu/main/assets/banner.gif";

// ─── Banner cache (module-level, survives warm lambda invocations) ────────────
let _bannerCache = null;

async function fetchBannerBase64() {
  if (_bannerCache) return _bannerCache;
  try {
    const res = await fetch(BANNER_URL);
    if (!res.ok) return null;
    const buf  = await res.arrayBuffer();
    const b64  = Buffer.from(buf).toString("base64");
    const mime = res.headers.get("content-type") || "image/gif";
    _bannerCache = `data:${mime};base64,${b64}`;
    return _bannerCache;
  } catch {
    return null;
  }
}

// ─── GitHub: REST (public_repos, stars, topLang) + GraphQL (commits, calendar) ──
async function fetchGitHub() {
  const token   = process.env.GITHUB_TOKEN;           // set in Vercel env vars
  const headers = {
    Accept: "application/vnd.github+json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  // ── REST: repos ──────────────────────────────────────────────────────────────
  let public_repos = 0, stars = 0, topLang = "Python";
  try {
    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${GITHUB_USER}`,                              { headers }),
      fetch(`https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&type=owner`, { headers }),
    ]);

    if (userRes.ok) {
      const user = await userRes.json();
      public_repos = user.public_repos || 0;
    }

    if (reposRes.ok) {
      const repos = await reposRes.json();
      if (Array.isArray(repos)) {
        stars = repos.reduce((s, r) => s + (r.stargazers_count || 0), 0);
        const langs = {};
        repos.forEach(r => { if (r.language) langs[r.language] = (langs[r.language] || 0) + 1; });
        topLang = Object.entries(langs).sort((a, b) => b[1] - a[1])[0]?.[0] || "Python";
      }
    }
  } catch { /* fall through with defaults */ }

  // ── GraphQL: total commits + contribution calendar ───────────────────────────
  let totalCommits = 0;
  let calendarWeeks = [];

  if (token) {
    try {
      const gqlRes = await fetch("https://api.github.com/graphql", {
        method:  "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `query($login: String!) {
            user(login: $login) {
              contributionsCollection {
                totalCommitContributions
                contributionCalendar {
                  weeks {
                    contributionDays {
                      contributionCount
                    }
                  }
                }
              }
            }
          }`,
          variables: { login: GITHUB_USER },
        }),
      });

      if (gqlRes.ok) {
        const gql  = await gqlRes.json();
        const col  = gql?.data?.user?.contributionsCollection;
        totalCommits  = col?.totalCommitContributions || 0;
        calendarWeeks = col?.contributionCalendar?.weeks || [];
      }
    } catch { /* fall through */ }
  }

  return { public_repos, stars, topLang, totalCommits, calendarWeeks };
}

// ─── LeetCode: unofficial proxy (avoids direct leetcode.com CORS block) ───────
// Uses https://leetcode-stats-api.herokuapp.com  (free, no auth needed)
async function fetchLeetCode() {
  try {
    const res  = await fetch(`https://leetcode-stats-api.herokuapp.com/${LEETCODE_USER}`);
    if (!res.ok) throw new Error(`LC proxy ${res.status}`);
    const json = await res.json();

    if (json.status === "error") throw new Error(json.message);

    return {
      easy:    json.easySolved    || 0,
      medium:  json.mediumSolved  || 0,
      hard:    json.hardSolved    || 0,
      total:   json.totalSolved   || 0,
      ranking: json.ranking       || 0,
    };
  } catch {
    // Fallback: try alfa-leetcode-api
    try {
      const res  = await fetch(`https://alfa-leetcode-api.onrender.com/${LEETCODE_USER}/solved`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      return {
        easy:    json.easySolved   || 0,
        medium:  json.mediumSolved || 0,
        hard:    json.hardSolved   || 0,
        total:   json.solvedProblem|| 0,
        ranking: 0,
      };
    } catch {
      return { easy: 0, medium: 0, hard: 0, total: 0, ranking: 0 };
    }
  }
}

// ─── Derive contribution bar heights + current streak from calendar ───────────
function processCalendar(calendarWeeks) {
  // Flatten to last 48 days (matches 48 bars in the SVG)
  const days = calendarWeeks.flatMap(w => w.contributionDays).slice(-48);

  // Bar heights: scale each day's count to 4–36px range
  const counts = days.map(d => d.contributionCount || 0);
  const maxC   = Math.max(...counts, 1);
  const BH     = counts.map(c => Math.round(4 + (c / maxC) * 32));

  // Current streak: count consecutive days (from today backward) with count > 0
  const allDays   = calendarWeeks.flatMap(w => w.contributionDays);
  let streak      = 0;
  for (let i = allDays.length - 1; i >= 0; i--) {
    if (allDays[i].contributionCount > 0) streak++;
    else break;
  }

  return { BH, streak };
}

// ─── SVG Builder ─────────────────────────────────────────────────────────────
function buildSVG(gh, lc, bannerData) {
  const W = 680, H = 560;

  const r = 30, circ = 2 * Math.PI * r;
  const ef = lc.total > 0 ? lc.easy   / lc.total : 0;
  const mf = lc.total > 0 ? lc.medium / lc.total : 0;
  const hf = lc.total > 0 ? lc.hard   / lc.total : 0;
  const eL = ef * circ, mL = mf * circ, hL = hf * circ;

  const MAIN_RED  = "#e84040";
  const DARK_RED  = "#8b0000";
  const LIGHT_RED = "#ff6b6b";

  // ── Contribution bars (real data or static fallback) ──────────────────────
  const { BH, streak } = gh.calendarWeeks.length
    ? processCalendar(gh.calendarWeeks)
    : {
        BH:     [8,14,6,18,22,10,28,16,8,32,20,12,26,18,30,14,8,24,36,18,10,28,22,16,32,12,20,28,10,36,24,18,8,26,20,14,30,16,24,12,28,18,36,10,22,16,28,20],
        streak: 0,
      };

  const BC = BH.map(h => h > 28 ? MAIN_RED : h > 18 ? "#cc2200" : h > 10 ? DARK_RED : "#2a0a0a");

  // ── Formatted values ──────────────────────────────────────────────────────
  const rankStr    = lc.ranking > 0  ? `#${lc.ranking.toLocaleString()}`       : "N/A";
  const starsStr   = gh.stars >= 1000 ? `${(gh.stars / 1000).toFixed(1)}k`     : String(gh.stars);
  const commitsStr = gh.totalCommits  >= 1000
    ? `${(gh.totalCommits / 1000).toFixed(1)}k`
    : String(gh.totalCommits);
  const streakStr  = streak > 0 ? `${streak}d 🔥` : "0d";

  // ── Progress bar widths (capped at 128px) ─────────────────────────────────
  const starsBar  = Math.min(Math.round((gh.stars        / Math.max(gh.stars,        500)) * 128), 128);
  const reposBar  = Math.min(Math.round((gh.public_repos / Math.max(gh.public_repos, 80))  * 128), 128);
  const commitBar = Math.min(Math.round((gh.totalCommits / Math.max(gh.totalCommits, 2000)) * 128), 128);

  // ── Banner element ────────────────────────────────────────────────────────
  const bannerEl = bannerData
    ? `<image href="${bannerData}" x="0" y="0" width="${W}" height="150" preserveAspectRatio="xMidYMid slice" clip-path="url(#bannerClip)"/>`
    : `<rect x="0" y="0" width="${W}" height="150" fill="#1a0000"/>`;

  // ── Tech pills (with overflow guard: stop rendering if x > 628) ───────────
  function buildPillRow(items, y, textY, bgFill, stroke, textFill) {
    let x = 30;
    const pills = [];
    for (const t of items) {
      const w = Math.round(t.length * 7.5 + 14);
      if (x + w > 648) break; // prevent overflow
      pills.push(`
        <rect x="${x}" y="${y}" width="${w}" height="18" rx="9" fill="${bgFill}" stroke="${stroke}" stroke-width="1" opacity="0.85"/>
        <text x="${x + w / 2}" y="${textY}" font-size="9" fill="${textFill}" text-anchor="middle" font-family="'Courier New',monospace">${t}</text>
      `);
      x += w + 8;
    }
    return pills.join("\n");
  }

  const techRow1 = buildPillRow(
    ["Python", "Java", "JavaScript", "React", "HTML/CSS", "SQL"],
    488, 500, "#0f1114", "#1e2328", "#8b949e"
  );
  const techRow2 = buildPillRow(
    ["TensorFlow", "PyTorch", "Scikit", "NumPy", "Pandas"],
    512, 524, "#2a0808", "#cc2200", "#ff6b6b"
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <style>@import url('https://fonts.cdnfonts.com/css/edo');</style>
  <clipPath id="bannerClip"><rect x="0" y="0" width="${W}" height="150" rx="12" ry="12"/></clipPath>
  <clipPath id="cardClip"><rect x="0" y="0" width="${W}" height="${H}" rx="12" ry="12"/></clipPath>
  <linearGradient id="redLine" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%"   stop-color="#050505"/>
    <stop offset="50%"  stop-color="#e84040"/>
    <stop offset="100%" stop-color="#050505"/>
  </linearGradient>
  <linearGradient id="leftVig" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%"  stop-color="#ffffff" stop-opacity="0.85"/>
    <stop offset="45%" stop-color="#ffffff" stop-opacity="0"/>
  </linearGradient>
</defs>

<rect width="${W}" height="${H}" rx="12" fill="#050505" clip-path="url(#cardClip)"/>

${bannerEl}
<rect x="0" y="0" width="${W}" height="150" fill="url(#leftVig)"/>
<rect x="0" y="0" width="${W}" height="2" rx="1" fill="url(#redLine)"/>

<text x="36" y="80"  font-size="46" fill="#000000" font-family="'Edo', sans-serif" letter-spacing="3">Raghu</text>
<text x="38" y="110" font-size="13" font-weight="600" fill="#cc2200" font-family="'Courier New',monospace" letter-spacing="1">AI / ML Enthusiast</text>

<text x="16" y="174" font-size="9" fill="#484f58" letter-spacing="1.5" font-weight="600" font-family="'Courier New',monospace">ABOUT</text>

<rect x="16"  y="182" width="206" height="52" rx="8" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
<rect x="16"  y="182" width="3"   height="52" rx="1" fill="${DARK_RED}"/>
<text x="28"  y="198" font-size="8"  fill="#484f58" font-family="'Courier New',monospace">role</text>
<text x="28"  y="213" font-size="14" font-weight="600" fill="#e6edf3" font-family="'Courier New',monospace">AI / ML Dev</text>
<text x="28"  y="226" font-size="9"  fill="#6e7681" font-family="'Courier New',monospace">Python · TensorFlow</text>

<rect x="232" y="182" width="206" height="52" rx="8" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
<rect x="232" y="182" width="3"   height="52" rx="1" fill="${MAIN_RED}"/>
<text x="244" y="198" font-size="8"  fill="#484f58" font-family="'Courier New',monospace">building</text>
<text x="244" y="213" font-size="14" font-weight="600" fill="${MAIN_RED}" font-family="'Courier New',monospace">winsomegin</text>

<rect x="448" y="182" width="216" height="52" rx="8" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
<rect x="448" y="182" width="3"   height="52" rx="1" fill="${LIGHT_RED}"/>
<text x="460" y="198" font-size="8"  fill="#484f58" font-family="'Courier New',monospace">focusing on</text>
<text x="460" y="213" font-size="14" font-weight="600" fill="${LIGHT_RED}" font-family="'Courier New',monospace">ML Models &amp; DSA</text>
<text x="460" y="226" font-size="9"  fill="#6e7681" font-family="'Courier New',monospace">Algorithms · Training</text>

<text x="16"  y="254" font-size="9" fill="#484f58" letter-spacing="1.5" font-weight="600" font-family="'Courier New',monospace">GITHUB</text>
<text x="340" y="254" font-size="9" fill="#484f58" letter-spacing="1.5" font-weight="600" font-family="'Courier New',monospace">LEETCODE — RS-RAGHU</text>

<!-- Total Commits (dynamic) -->
<rect x="16"  y="262" width="148" height="52" rx="8" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
<text x="26"  y="279" font-size="9"  fill="#484f58" font-family="'Courier New',monospace">Total Commits</text>
<text x="26"  y="296" font-size="17" font-weight="700" fill="${MAIN_RED}" font-family="'Courier New',monospace">${commitsStr}</text>
<rect x="26"  y="301" width="128" height="3" rx="1.5" fill="#1e2328"/>
<rect x="26"  y="301" width="0"   height="3" rx="1.5" fill="${MAIN_RED}">
  <animate attributeName="width" from="0" to="${Math.max(commitBar, 4)}" dur="1.2s" begin="0.3s" fill="freeze"/>
</rect>

<!-- Stars Earned (dynamic) -->
<rect x="170" y="262" width="148" height="52" rx="8" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
<text x="180" y="279" font-size="9"  fill="#484f58" font-family="'Courier New',monospace">Stars Earned</text>
<text x="180" y="296" font-size="17" font-weight="700" fill="${MAIN_RED}" font-family="'Courier New',monospace">${starsStr}</text>
<rect x="180" y="301" width="128" height="3" rx="1.5" fill="#1e2328"/>
<rect x="180" y="301" width="0"   height="3" rx="1.5" fill="${MAIN_RED}">
  <animate attributeName="width" from="0" to="${Math.max(starsBar, 4)}" dur="1.2s" begin="0.5s" fill="freeze"/>
</rect>

<!-- Public Repos (dynamic) -->
<rect x="16"  y="320" width="148" height="52" rx="8" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
<text x="26"  y="337" font-size="9"  fill="#484f58" font-family="'Courier New',monospace">Public Repos</text>
<text x="26"  y="354" font-size="17" font-weight="700" fill="${MAIN_RED}" font-family="'Courier New',monospace">${gh.public_repos}</text>
<rect x="26"  y="359" width="128" height="3" rx="1.5" fill="#1e2328"/>
<rect x="26"  y="359" width="0"   height="3" rx="1.5" fill="${MAIN_RED}">
  <animate attributeName="width" from="0" to="${Math.max(reposBar, 4)}" dur="1.2s" begin="0.7s" fill="freeze"/>
</rect>

<!-- Top Language (dynamic) -->
<rect x="170" y="320" width="148" height="52" rx="8" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
<text x="180" y="337" font-size="9"  fill="#484f58" font-family="'Courier New',monospace">Top Language</text>
<text x="180" y="354" font-size="16" font-weight="700" fill="${MAIN_RED}" font-family="'Courier New',monospace">${gh.topLang}</text>
<rect x="180" y="359" width="128" height="3" rx="1.5" fill="#1e2328"/>
<rect x="180" y="359" width="0"   height="3" rx="1.5" fill="${MAIN_RED}">
  <animate attributeName="width" from="0" to="96" dur="1.2s" begin="0.9s" fill="freeze"/>
</rect>

<!-- LeetCode donut -->
<g transform="translate(356, 262)">
  <circle cx="38" cy="38" r="${r}" fill="none" stroke="#1e2328" stroke-width="9"/>
  <circle cx="38" cy="38" r="${r}" fill="none" stroke="${LIGHT_RED}" stroke-width="9"
    stroke-dasharray="${circ.toFixed(2)}" stroke-dashoffset="${(circ - eL).toFixed(2)}" transform="rotate(-90 38 38)">
    <animate attributeName="stroke-dashoffset" from="${circ.toFixed(2)}" to="${(circ-eL).toFixed(2)}" dur="1.2s" begin="0.4s" fill="freeze"/>
  </circle>
  <circle cx="38" cy="38" r="${r}" fill="none" stroke="${MAIN_RED}" stroke-width="9"
    stroke-dasharray="${circ.toFixed(2)}" stroke-dashoffset="${(circ - mL).toFixed(2)}" transform="rotate(${(-90 + ef*360).toFixed(1)} 38 38)">
    <animate attributeName="stroke-dashoffset" from="${circ.toFixed(2)}" to="${(circ-mL).toFixed(2)}" dur="1.2s" begin="0.6s" fill="freeze"/>
  </circle>
  <circle cx="38" cy="38" r="${r}" fill="none" stroke="${DARK_RED}" stroke-width="9"
    stroke-dasharray="${circ.toFixed(2)}" stroke-dashoffset="${(circ - hL).toFixed(2)}" transform="rotate(${(-90 + (ef+mf)*360).toFixed(1)} 38 38)">
    <animate attributeName="stroke-dashoffset" from="${circ.toFixed(2)}" to="${(circ-hL).toFixed(2)}" dur="1.2s" begin="0.8s" fill="freeze"/>
  </circle>
  <text x="38" y="34" text-anchor="middle" font-size="15" font-weight="700" fill="#e6edf3" font-family="'Courier New',monospace">${lc.total}</text>
  <text x="38" y="47" text-anchor="middle" font-size="8"  fill="#484f58" font-family="'Courier New',monospace">solved</text>
</g>

<rect x="446" y="262" width="68" height="42" rx="6" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
<text x="480" y="279" font-size="8"  fill="#484f58" text-anchor="middle" font-family="'Courier New',monospace">Easy</text>
<text x="480" y="295" font-size="15" font-weight="700" fill="${LIGHT_RED}" text-anchor="middle" font-family="'Courier New',monospace">${lc.easy}</text>

<rect x="520" y="262" width="68" height="42" rx="6" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
<text x="554" y="279" font-size="8"  fill="#484f58" text-anchor="middle" font-family="'Courier New',monospace">Medium</text>
<text x="554" y="295" font-size="15" font-weight="700" fill="${MAIN_RED}" text-anchor="middle" font-family="'Courier New',monospace">${lc.medium}</text>

<rect x="594" y="262" width="68" height="42" rx="6" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
<text x="628" y="279" font-size="8"  fill="#484f58" text-anchor="middle" font-family="'Courier New',monospace">Hard</text>
<text x="628" y="295" font-size="15" font-weight="700" fill="${DARK_RED}" text-anchor="middle" font-family="'Courier New',monospace">${lc.hard}</text>

<!-- Streak (real) -->
<rect x="446" y="310" width="106" height="62" rx="6" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
<text x="499" y="327" font-size="8"  fill="#484f58" text-anchor="middle" font-family="'Courier New',monospace">Streak</text>
<text x="499" y="348" font-size="16" font-weight="700" fill="${MAIN_RED}" text-anchor="middle" font-family="'Courier New',monospace">${streakStr}</text>
<text x="499" y="362" font-size="8"  fill="#484f58" text-anchor="middle" font-family="'Courier New',monospace">github</text>

<rect x="558" y="310" width="104" height="62" rx="6" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
<text x="610" y="327" font-size="8"  fill="#484f58" text-anchor="middle" font-family="'Courier New',monospace">Global Rank</text>
<text x="610" y="346" font-size="14" font-weight="700" fill="${MAIN_RED}" text-anchor="middle" font-family="'Courier New',monospace">${rankStr}</text>
<text x="610" y="362" font-size="8"  fill="#484f58" text-anchor="middle" font-family="'Courier New',monospace">leetcode.com</text>

<!-- Contribution bars (real data) -->
<text x="16"  y="392" font-size="9" fill="#484f58" letter-spacing="1.5" font-weight="600" font-family="'Courier New',monospace">CONTRIBUTION ACTIVITY</text>
<rect x="16"  y="400" width="648" height="52" rx="8" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
<g transform="translate(24, 404)">
  ${BH.map((h, i) => `<rect x="${i * 13}" y="${40 - h}" width="8" height="${h}" rx="2" fill="${BC[i]}" opacity="0.9"/>`).join("")}
</g>

<!-- Tech stack -->
<text x="16" y="474" font-size="9" fill="#484f58" letter-spacing="1.5" font-weight="600" font-family="'Courier New',monospace">TECH STACK</text>
<rect x="16" y="480" width="648" height="58" rx="8" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
${techRow1}
${techRow2}

<rect x="0" y="${H - 2}" width="${W}" height="2" rx="1" fill="url(#redLine)"/>
</svg>`;
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  try {
    const [gh, lc, bannerData] = await Promise.all([
      fetchGitHub(),
      fetchLeetCode(),
      fetchBannerBase64(),
    ]);

    const svg = buildSVG(gh, lc, bannerData);

    res.setHeader("Content-Type",  "image/svg+xml");
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=7200");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).send(svg);
  } catch (err) {
    const errSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="680" height="80">
      <rect width="680" height="80" fill="#050505"/>
      <text x="20" y="30" font-size="12" fill="#e84040" font-family="monospace">ERROR: ${err.message}</text>
      <text x="20" y="52" font-size="10" fill="#cc2200" font-family="monospace">${(err.stack || "").split("\n")[1] || ""}</text>
    </svg>`;
    res.setHeader("Content-Type", "image/svg+xml");
    res.status(500).send(errSvg);
  }
}