const GITHUB_USER   = "rs-raghu";
const LEETCODE_USER = "rs-raghu";
const BANNER_URL    = "https://raw.githubusercontent.com/rs-raghu/rs-raghu/main/assets/banner.png";

// ─── Fetch & base64 encode banner image ──────────────
async function fetchBannerBase64() {
  try {
    const res = await fetch(BANNER_URL);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const b64 = Buffer.from(buf).toString('base64');
    const mime = res.headers.get("content-type") || "image/png";
    return `data:${mime};base64,${b64}`;
  } catch {
    return null;
  }
}

// ─── Fetch GitHub Data ────────────────────────────────
async function fetchGitHub() {
  try {
    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${GITHUB_USER}`, {
        headers: { Accept: "application/vnd.github+json" }
      }),
      fetch(`https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&type=owner`, {
        headers: { Accept: "application/vnd.github+json" }
      })
    ]);
    const user  = await userRes.json();
    const repos = await reposRes.json();

    const stars = Array.isArray(repos)
      ? repos.reduce((s, r) => s + (r.stargazers_count || 0), 0) : 0;

    const langs = {};
    if (Array.isArray(repos))
      repos.forEach(r => { if (r.language) langs[r.language] = (langs[r.language] || 0) + 1; });
    const topLang = Object.entries(langs).sort((a, b) => b[1] - a[1])[0]?.[0] || "Python";

    return {
      followers:    user.followers    || 0,
      public_repos: user.public_repos || 0,
      stars, topLang,
    };
  } catch {
    return { followers: 0, public_repos: 0, stars: 0, topLang: "Python" };
  }
}

// ─── Fetch LeetCode Data ──────────────────────────────
async function fetchLeetCode() {
  try {
    const res = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query userProfile($username: String!) {
          matchedUser(username: $username) {
            submitStats { acSubmissionNum { difficulty count } }
            profile { ranking }
          }
        }`,
        variables: { username: LEETCODE_USER }
      })
    });
    const json  = await res.json();
    const stats = json?.data?.matchedUser?.submitStats?.acSubmissionNum || [];
    const get   = d => stats.find(s => s.difficulty === d)?.count || 0;
    return {
      easy: get("Easy"), medium: get("Medium"), hard: get("Hard"),
      total: get("All"),
      ranking: json?.data?.matchedUser?.profile?.ranking || 0,
    };
  } catch {
    return { easy: 0, medium: 0, hard: 0, total: 0, ranking: 0 };
  }
}

// ─── SVG Builder ─────────────────────────────────────
function buildSVG(gh, lc, bannerData) {
  // Height reduced from 560 to 480 because we removed social links
  const W = 680, H = 480;

  const r = 30, circ = 2 * Math.PI * r;
  const ef = lc.total > 0 ? lc.easy   / lc.total : 0;
  const mf = lc.total > 0 ? lc.medium / lc.total : 0;
  const hf = lc.total > 0 ? lc.hard   / lc.total : 0;
  const eL = ef * circ, mL = mf * circ, hL = hf * circ;

  const BH = [8,14,6,18,22,10,28,16,8,32,20,12,26,18,30,14,8,24,36,18,10,28,22,16,32,12,20,28,10,36,24,18,8,26,20,14,30,16,24,12,28,18,36,10,22,16,28,20];
  const BC = BH.map(h => h > 28 ? '#e84040' : h > 18 ? '#cc2200' : h > 10 ? '#8b1a1a' : '#2a1010');

  const rankStr  = lc.ranking > 0 ? `#${lc.ranking.toLocaleString()}` : "N/A";
  const starsStr = gh.stars >= 1000 ? `${(gh.stars/1000).toFixed(1)}k` : String(gh.stars);
  const starsBar = Math.round((gh.stars / Math.max(gh.stars, 500)) * 128);
  const reposBar = Math.round((gh.public_repos / Math.max(gh.public_repos, 80)) * 128);

  const phrases = ["AI/ML Enthusiast","LeetCode Grinder","Open Source Contributor","Python Wrangler","Always Learning"];
  const dur     = 12; 
  const step    = dur / phrases.length; 

  const typingTexts = phrases.map((p, i) => {
    const start  = i * step;
    const fadeIn = start;
    const fadeOut= start + step - 0.3;
    const kTimes = `${(fadeIn/dur).toFixed(3)};${((fadeIn+0.2)/dur).toFixed(3)};${(fadeOut/dur).toFixed(3)};${((fadeOut+0.2)/dur).toFixed(3)};${((i+1 === phrases.length) ? 1 : ((i+1)*step/dur)).toFixed(3)}`;
    const kVals  = "0;1;1;0;0";
    return `<text x="116" y="112" font-size="12" fill="#8b949e" font-family="'Courier New',monospace" opacity="0">
      ${p}<animate attributeName="opacity" values="${kVals}" keyTimes="${kTimes}" dur="${dur}s" repeatCount="indefinite"/>
    </text>`;
  }).join('\n  ');

  const bannerEl = bannerData
    ? `<image href="${bannerData}" x="0" y="0" width="${W}" height="150"
        preserveAspectRatio="xMidYMid slice" clip-path="url(#bannerClip)"/>`
    : `<rect x="0" y="0" width="${W}" height="150" fill="#1a0505"/>`;

  // Dynamic width calculation for tech pills to prevent overlap
  let xOffset1 = 340;
  const techRow1 = ["Python", "Java", "JavaScript", "React", "SQL"].map((t) => {
    const w = t.length * 7 + 14;
    const res = `<rect x="${xOffset1}" y="408" width="${w}" height="18" rx="9" fill="#111519" stroke="#30363d" stroke-width="0.8"/>
    <text x="${xOffset1 + w/2}" y="420" font-size="9" fill="#8b949e" text-anchor="middle" font-family="'Courier New',monospace">${t}</text>`;
    xOffset1 += w + 6;
    return res;
  }).join('\n');

  let xOffset2 = 340;
  const techRow2 = ["TensorFlow", "PyTorch", "Scikit", "NumPy", "Pandas"].map((t) => {
    const w = t.length * 7 + 14;
    const res = `<rect x="${xOffset2}" y="432" width="${w}" height="18" rx="9" fill="#2a0808" stroke="#cc2200" stroke-width="0.8" opacity="0.85"/>
    <text x="${xOffset2 + w/2}" y="444" font-size="9" fill="#ff6b6b" text-anchor="middle" font-family="'Courier New',monospace">${t}</text>`;
    xOffset2 += w + 6;
    return res;
  }).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <clipPath id="bannerClip"><rect x="0" y="0" width="${W}" height="150" rx="12" ry="12"/></clipPath>
  <clipPath id="cardClip"><rect x="0" y="0" width="${W}" height="${H}" rx="12" ry="12"/></clipPath>
  <linearGradient id="redLine" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%"   stop-color="#0a0c0f"/>
    <stop offset="30%"  stop-color="#8b0000"/>
    <stop offset="50%"  stop-color="#cc2200"/>
    <stop offset="70%"  stop-color="#8b0000"/>
    <stop offset="100%" stop-color="#0a0c0f"/>
  </linearGradient>
  <linearGradient id="bannerFade" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%"   stop-color="#0a0c0f" stop-opacity="0.05"/>
    <stop offset="55%"  stop-color="#0a0c0f" stop-opacity="0.45"/>
    <stop offset="100%" stop-color="#0a0c0f" stop-opacity="1"/>
  </linearGradient>
  <linearGradient id="leftVig" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%"  stop-color="#0a0c0f" stop-opacity="0.75"/>
    <stop offset="55%" stop-color="#0a0c0f" stop-opacity="0"/>
  </linearGradient>
  <filter id="redGlow">
    <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="dimBanner" color-interpolation-filters="sRGB">
    <feColorMatrix type="saturateMatrix" values="1.2"/>
    <feComponentTransfer>
      <feFuncR type="linear" slope="0.42"/>
      <feFuncG type="linear" slope="0.42"/>
      <feFuncB type="linear" slope="0.42"/>
    </feComponentTransfer>
  </filter>
</defs>

<rect width="${W}" height="${H}" rx="12" fill="#0a0c0f" clip-path="url(#cardClip)"/>

<g filter="url(#dimBanner)">${bannerEl}</g>
<rect x="0" y="0" width="${W}" height="150" fill="url(#bannerFade)"/>
<rect x="0" y="0" width="${W}" height="150" fill="url(#leftVig)"/>
<rect x="0" y="0" width="${W}" height="2" rx="1" fill="url(#redLine)"/>

<g transform="translate(22, 38)">
  <circle cx="36" cy="36" r="36" fill="#0a0a0a" opacity="0.55"/>
  <circle cx="36" cy="36" r="34" fill="none" stroke="#cc2200" stroke-width="1.5" opacity="0.55"/>
  <circle cx="36" cy="27" r="18" fill="#cc2200" opacity="0.92" filter="url(#redGlow)">
    <animate attributeName="opacity" values="0.82;0.98;0.82" dur="3s" repeatCount="indefinite"/>
  </circle>
  <ellipse cx="36" cy="58" rx="26" ry="6" fill="#090b0e"/>
  <circle cx="36" cy="36" r="3.2" fill="#090b0e"/>
  <rect x="34.2" y="39" width="3.5" height="11" rx="1.2" fill="#090b0e"/>
  <rect x="29" y="41" width="6" height="2" rx="1" fill="#090b0e"/>
  <rect x="37" y="41" width="6" height="2" rx="1" fill="#090b0e" transform="rotate(10 37 41)"/>
  <rect x="32.5" y="49.5" width="2.5" height="7" rx="1.2" fill="#090b0e" transform="rotate(-5 32.5 49.5)"/>
  <rect x="36" y="49.5" width="2.5" height="7" rx="1.2" fill="#090b0e" transform="rotate(5 36 49.5)"/>
  <line x1="19" y1="30" x2="29" y2="40" stroke="#090b0e" stroke-width="1.4" opacity="0.7"/>
</g>

<text x="110" y="72" font-size="26" font-weight="700" fill="#e6edf3" font-family="'Courier New',monospace" letter-spacing="-0.5">Raghu</text>
<text x="215" y="70" font-size="13" font-weight="400" fill="#cc2200" font-family="'Courier New',monospace">/ rs-raghu</text>

${typingTexts}

<rect x="110" y="122" width="38" height="17" rx="8.5" fill="#2a0808" stroke="#cc2200" stroke-width="0.8" opacity="0.85"/>
<text x="129" y="134" font-size="9" fill="#ff6b6b" text-anchor="middle" font-family="'Courier New',monospace">India</text>
<rect x="154" y="122" width="68" height="17" rx="8.5" fill="#111519" stroke="#30363d" stroke-width="0.8"/>
<text x="188" y="134" font-size="9" fill="#8b949e" text-anchor="middle" font-family="'Courier New',monospace">Open to Work</text>
<rect x="228" y="122" width="42" height="17" rx="8.5" fill="#111519" stroke="#30363d" stroke-width="0.8"/>
<text x="249" y="134" font-size="9" fill="#8b949e" text-anchor="middle" font-family="'Courier New',monospace">AI / ML</text>

<text x="16" y="174" font-size="9" fill="#484f58" letter-spacing="1.5" font-weight="600" font-family="'Courier New',monospace">ABOUT</text>

<rect x="16" y="182" width="206" height="52" rx="8" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
<rect x="16" y="182" width="3" height="52" rx="1" fill="#cc2200"/>
<text x="26" y="198" font-size="8" fill="#484f58" font-family="'Courier New',monospace">role</text>
<text x="26" y="213" font-size="13" font-weight="600" fill="#e6edf3" font-family="'Courier New',monospace">AI / ML Dev</text>
<text x="26" y="226" font-size="9" fill="#6e7681" font-family="'Courier New',monospace">Python · TensorFlow</text>

<rect x="232" y="182" width="206" height="52" rx="8" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
<rect x="232" y="182" width="3" height="52" rx="1" fill="#e84040"/>
<text x="242" y="198" font-size="8" fill="#484f58" font-family="'Courier New',monospace">building</text>
<text x="242" y="213" font-size="13" font-weight="600" fill="#e84040" font-family="'Courier New',monospace">winsomegin</text>

<rect x="448" y="182" width="216" height="52" rx="8" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
<rect x="448" y="182" width="3" height="52" rx="1" fill="#ffa657"/>
<text x="458" y="198" font-size="8" fill="#484f58" font-family="'Courier New',monospace">learning</text>
<text x="458" y="213" font-size="13" font-weight="600" fill="#ffa657" font-family="'Courier New',monospace">ML Models</text>
<text x="458" y="226" font-size="9" fill="#6e7681" font-family="'Courier New',monospace">DSA · Data Structures</text>


<text x="16" y="254" font-size="9" fill="#484f58" letter-spacing="1.5" font-weight="600" font-family="'Courier New',monospace">GITHUB</text>
<text x="340" y="254" font-size="9" fill="#484f58" letter-spacing="1.5" font-weight="600" font-family="'Courier New',monospace">LEETCODE — RS-RAGHU</text>

<rect x="16"  y="262" width="148" height="52" rx="8" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
<text x="26"  y="279" font-size="9" fill="#484f58" font-family="'Courier New',monospace">Total Commits</text>
<text x="26"  y="296" font-size="17" font-weight="700" fill="#58a6ff" font-family="'Courier New',monospace">1,204</text>
<rect x="26"  y="301" width="128" height="3" rx="1.5" fill="#1e2328"/>
<rect x="26"  y="301" width="0"   height="3" rx="1.5" fill="#58a6ff"><animate attributeName="width" from="0" to="107" dur="1.2s" begin="0.3s" fill="freeze"/></rect>

<rect x="170" y="262" width="148" height="52" rx="8" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
<text x="180" y="279" font-size="9" fill="#484f58" font-family="'Courier New',monospace">Stars Earned</text>
<text x="180" y="296" font-size="17" font-weight="700" fill="#e84040" font-family="'Courier New',monospace">${starsStr}</text>
<rect x="180" y="301" width="128" height="3" rx="1.5" fill="#1e2328"/>
<rect x="180" y="301" width="0"   height="3" rx="1.5" fill="#e84040"><animate attributeName="width" from="0" to="${Math.max(starsBar,4)}" dur="1.2s" begin="0.5s" fill="freeze"/></rect>

<rect x="16"  y="320" width="148" height="52" rx="8" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
<text x="26"  y="337" font-size="9" fill="#484f58" font-family="'Courier New',monospace">Public Repos</text>
<text x="26"  y="354" font-size="17" font-weight="700" fill="#bc8cff" font-family="'Courier New',monospace">${gh.public_repos}</text>
<rect x="26"  y="359" width="128" height="3" rx="1.5" fill="#1e2328"/>
<rect x="26"  y="359" width="0"   height="3" rx="1.5" fill="#bc8cff"><animate attributeName="width" from="0" to="${Math.max(reposBar,4)}" dur="1.2s" begin="0.7s" fill="freeze"/></rect>

<rect x="170" y="320" width="148" height="52" rx="8" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
<text x="180" y="337" font-size="9" fill="#484f58" font-family="'Courier New',monospace">Top Language</text>
<text x="180" y="354" font-size="16" font-weight="700" fill="#3fb950" font-family="'Courier New',monospace">${gh.topLang}</text>
<rect x="180" y="359" width="128" height="3" rx="1.5" fill="#1e2328"/>
<rect x="180" y="359" width="0"   height="3" rx="1.5" fill="#3fb950"><animate attributeName="width" from="0" to="96" dur="1.2s" begin="0.9s" fill="freeze"/></rect>

<g transform="translate(356, 262)">
  <circle cx="38" cy="38" r="${r}" fill="none" stroke="#1e2328" stroke-width="9"/>
  <circle cx="38" cy="38" r="${r}" fill="none" stroke="#3fb950" stroke-width="9"
    stroke-dasharray="${circ.toFixed(2)}" stroke-dashoffset="${(circ - eL).toFixed(2)}" transform="rotate(-90 38 38)">
    <animate attributeName="stroke-dashoffset" from="${circ.toFixed(2)}" to="${(circ-eL).toFixed(2)}" dur="1.2s" begin="0.4s" fill="freeze"/>
  </circle>
  <circle cx="38" cy="38" r="${r}" fill="none" stroke="#ffa657" stroke-width="9"
    stroke-dasharray="${circ.toFixed(2)}" stroke-dashoffset="${(circ - mL).toFixed(2)}" transform="rotate(${(-90 + ef*360).toFixed(1)} 38 38)">
    <animate attributeName="stroke-dashoffset" from="${circ.toFixed(2)}" to="${(circ-mL).toFixed(2)}" dur="1.2s" begin="0.6s" fill="freeze"/>
  </circle>
  <circle cx="38" cy="38" r="${r}" fill="none" stroke="#e84040" stroke-width="9"
    stroke-dasharray="${circ.toFixed(2)}" stroke-dashoffset="${(circ - hL).toFixed(2)}" transform="rotate(${(-90 + (ef+mf)*360).toFixed(1)} 38 38)">
    <animate attributeName="stroke-dashoffset" from="${circ.toFixed(2)}" to="${(circ-hL).toFixed(2)}" dur="1.2s" begin="0.8s" fill="freeze"/>
  </circle>
  <text x="38" y="34" text-anchor="middle" font-size="15" font-weight="700" fill="#e6edf3" font-family="'Courier New',monospace">${lc.total}</text>
  <text x="38" y="47" text-anchor="middle" font-size="8" fill="#484f58" font-family="'Courier New',monospace">solved</text>
</g>

<rect x="446" y="262" width="68" height="42" rx="6" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
<text x="480" y="279" font-size="8" fill="#484f58" text-anchor="middle" font-family="'Courier New',monospace">Easy</text>
<text x="480" y="295" font-size="15" font-weight="700" fill="#3fb950" text-anchor="middle" font-family="'Courier New',monospace">${lc.easy}</text>

<rect x="520" y="262" width="68" height="42" rx="6" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
<text x="554" y="279" font-size="8" fill="#484f58" text-anchor="middle" font-family="'Courier New',monospace">Medium</text>
<text x="554" y="295" font-size="15" font-weight="700" fill="#ffa657" text-anchor="middle" font-family="'Courier New',monospace">${lc.medium}</text>

<rect x="594" y="262" width="68" height="42" rx="6" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
<text x="628" y="279" font-size="8" fill="#484f58" text-anchor="middle" font-family="'Courier New',monospace">Hard</text>
<text x="628" y="295" font-size="15" font-weight="700" fill="#e84040" text-anchor="middle" font-family="'Courier New',monospace">${lc.hard}</text>

<rect x="446" y="310" width="106" height="62" rx="6" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
<text x="499" y="327" font-size="8" fill="#484f58" text-anchor="middle" font-family="'Courier New',monospace">Streak</text>
<text x="499" y="346" font-size="18" font-weight="700" fill="#ffa657" text-anchor="middle" font-family="'Courier New',monospace">Live 🔥</text>
<text x="499" y="362" font-size="8" fill="#484f58" text-anchor="middle" font-family="'Courier New',monospace">via leetcode</text>

<rect x="558" y="310" width="104" height="62" rx="6" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
<text x="610" y="327" font-size="8" fill="#484f58" text-anchor="middle" font-family="'Courier New',monospace">Global Rank</text>
<text x="610" y="346" font-size="14" font-weight="700" fill="#ffd700" text-anchor="middle" font-family="'Courier New',monospace">${rankStr}</text>
<text x="610" y="362" font-size="8" fill="#484f58" text-anchor="middle" font-family="'Courier New',monospace">leetcode.com</text>

<text x="16" y="392" font-size="9" fill="#484f58" letter-spacing="1.5" font-weight="600" font-family="'Courier New',monospace">CONTRIBUTION ACTIVITY</text>
<rect x="16" y="400" width="302" height="52" rx="8" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
<g transform="translate(22, 404)">
  ${BH.map((h,i) => `<rect x="${i*6}" y="${40-h}" width="5" height="${h}" rx="1" fill="${BC[i]}" opacity="0.85"/>`).join('')}
</g>

<text x="330" y="392" font-size="9" fill="#484f58" letter-spacing="1.5" font-weight="600" font-family="'Courier New',monospace">TECH STACK</text>
<rect x="330" y="400" width="334" height="52" rx="8" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>

${techRow1}
${techRow2}

<rect x="0" y="${H-2}" width="${W}" height="2" rx="1" fill="url(#redLine)"/>
</svg>`;
}

// ─── Handler ─────────────────────────────────────────
export default async function handler(req, res) {
  try {
    const [gh, lc, bannerData] = await Promise.all([
      fetchGitHub(),
      fetchLeetCode(),
      fetchBannerBase64(),
    ]);

    const svg = buildSVG(gh, lc, bannerData);

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=7200");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).send(svg);
  } catch (err) {
    const errSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="680" height="80">
      <rect width="680" height="80" fill="#1a0000"/>
      <text x="20" y="30" font-size="12" fill="#ff4444" font-family="monospace">ERROR: ${err.message}</text>
      <text x="20" y="52" font-size="10" fill="#884444" font-family="monospace">${(err.stack||'').split('\n')[1]||''}</text>
    </svg>`;
    res.setHeader("Content-Type", "image/svg+xml");
    res.status(500).send(errSvg);
  }
}