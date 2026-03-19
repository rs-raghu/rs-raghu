// ╔══════════════════════════════════════════════════════╗
// ║   rs-raghu GitHub Profile Card — Vercel Serverless   ║
// ╚══════════════════════════════════════════════════════╝

const GITHUB_USER = "rs-raghu";
const LEETCODE_USER = "rs-raghu";

// ─── Fetch GitHub Data ────────────────────────────────
async function fetchGitHub() {
  try {
    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${GITHUB_USER}`, {
        headers: { "Accept": "application/vnd.github+json" }
      }),
      fetch(`https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&type=owner`, {
        headers: { "Accept": "application/vnd.github+json" }
      })
    ]);
    const user = await userRes.json();
    const repos = await reposRes.json();

    const stars = Array.isArray(repos)
      ? repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0)
      : 0;

    // Language frequency
    const langs = {};
    if (Array.isArray(repos)) {
      repos.forEach(r => { if (r.language) langs[r.language] = (langs[r.language] || 0) + 1; });
    }
    const topLang = Object.entries(langs).sort((a, b) => b[1] - a[1])[0]?.[0] || "Python";

    return {
      name: user.name || GITHUB_USER,
      followers: user.followers || 0,
      following: user.following || 0,
      public_repos: user.public_repos || 0,
      stars,
      topLang,
    };
  } catch {
    return { name: "Raghu", followers: 0, following: 0, public_repos: 0, stars: 0, topLang: "Python" };
  }
}

// ─── Fetch LeetCode Data ──────────────────────────────
async function fetchLeetCode() {
  try {
    const res = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          query userProfile($username: String!) {
            matchedUser(username: $username) {
              submitStats {
                acSubmissionNum {
                  difficulty
                  count
                }
              }
              profile {
                ranking
              }
            }
          }
        `,
        variables: { username: LEETCODE_USER }
      })
    });
    const json = await res.json();
    const stats = json?.data?.matchedUser?.submitStats?.acSubmissionNum || [];
    const get = (d) => stats.find(s => s.difficulty === d)?.count || 0;
    const ranking = json?.data?.matchedUser?.profile?.ranking || 0;

    return {
      easy: get("Easy"),
      medium: get("Medium"),
      hard: get("Hard"),
      total: get("All"),
      ranking,
    };
  } catch {
    return { easy: 0, medium: 0, hard: 0, total: 0, ranking: 0 };
  }
}

// ─── SVG Builder ─────────────────────────────────────
function buildSVG(gh, lc) {
  const W = 680, H = 480;

  // LeetCode donut math
  const totalProblems = 3000;
  const solved = lc.total;
  const pct = Math.min(solved / totalProblems, 1);
  const r = 30, circ = 2 * Math.PI * r;
  const easyFrac = lc.total > 0 ? lc.easy / lc.total : 0;
  const medFrac  = lc.total > 0 ? lc.medium / lc.total : 0;
  const hardFrac = lc.total > 0 ? lc.hard / lc.total : 0;

  const easyLen  = easyFrac * circ;
  const medLen   = medFrac * circ;
  const hardLen  = hardFrac * circ;

  const easyOff  = 0;
  const medOff   = circ - easyLen;
  const hardOff  = circ - easyLen - medLen;

  // Activity bars (will be static decorative since no API key for contributions)
  const barHeights = [8,14,6,18,22,10,28,16,8,32,20,12,26,18,30,14,8,24,36,18,10,28,22,16,32,12,20,28,10,36,24,18,8,26,20,14,30,16,24,12,28,18,36,10,22,16,28,20];
  const barColors  = barHeights.map(h => h > 28 ? '#e84040' : h > 18 ? '#cc2200' : h > 10 ? '#8b1a1a' : '#2a1010');

  const rankStr = lc.ranking > 0 ? `#${lc.ranking.toLocaleString()}` : "N/A";
  const starsStr = gh.stars >= 1000 ? `${(gh.stars/1000).toFixed(1)}k` : String(gh.stars);

  // Bar widths (percent of 120px)
  const maxVal = Math.max(gh.public_repos, gh.followers, gh.stars, 1);
  const commitBar = 84;
  const starsBar  = Math.round((gh.stars / Math.max(gh.stars, 500)) * 100);
  const reposBar  = Math.round((gh.public_repos / Math.max(gh.public_repos, 80)) * 100);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600;700&amp;display=swap');
      text { font-family: 'Fira Code', 'Courier New', monospace; }
    </style>

    <clipPath id="bannerClip">
      <rect x="0" y="0" width="${W}" height="165" rx="12" ry="12"/>
    </clipPath>
    <clipPath id="cardClip">
      <rect x="0" y="0" width="${W}" height="${H}" rx="12" ry="12"/>
    </clipPath>

    <linearGradient id="redLine" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#0a0c0f"/>
      <stop offset="30%"  stop-color="#8b0000"/>
      <stop offset="50%"  stop-color="#cc2200"/>
      <stop offset="70%"  stop-color="#8b0000"/>
      <stop offset="100%" stop-color="#0a0c0f"/>
    </linearGradient>
    <linearGradient id="bannerFade" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%"   stop-color="#0a0c0f" stop-opacity="0.1"/>
      <stop offset="60%"  stop-color="#0a0c0f" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#0a0c0f" stop-opacity="1"/>
    </linearGradient>
    <linearGradient id="leftVig" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#0a0c0f" stop-opacity="0.7"/>
      <stop offset="50%"  stop-color="#0a0c0f" stop-opacity="0"/>
    </linearGradient>

    <filter id="redGlow">
      <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" rx="12" fill="#0a0c0f" clip-path="url(#cardClip)"/>

  <image href="https://raw.githubusercontent.com/rs-raghu/rs-raghu/main/assets/banner.png"
    x="0" y="0" width="${W}" height="165"
    preserveAspectRatio="xMidYMid slice"
    clip-path="url(#bannerClip)"
    style="filter:brightness(0.42) saturate(1.2)"/>

  <rect x="0" y="0" width="${W}" height="165" fill="url(#bannerFade)"/>
  <rect x="0" y="0" width="${W}" height="165" fill="url(#leftVig)"/>

  <rect x="0" y="0" width="${W}" height="2" rx="1" fill="url(#redLine)"/>

  <g transform="translate(28, 46)">
    <circle cx="36" cy="36" r="36" fill="#0a0a0a" opacity="0.6"/>
    <circle cx="36" cy="36" r="34" fill="none" stroke="#cc2200" stroke-width="1.5" opacity="0.6"/>
    <circle cx="36" cy="28" r="18" fill="#cc2200" opacity="0.92" filter="url(#redGlow)">
      <animate attributeName="opacity" values="0.82;0.98;0.82" dur="3s" repeatCount="indefinite"/>
    </circle>
    <ellipse cx="36" cy="58" rx="26" ry="6" fill="#090b0e"/>
    <circle  cx="36" cy="36" r="3.2" fill="#090b0e"/>
    <rect    x="34.2" y="39" width="3.5" height="11" rx="1.2" fill="#090b0e"/>
    <rect    x="29"  y="41" width="6"  height="2" rx="1" fill="#090b0e"/>
    <rect    x="37"  y="41" width="6"  height="2" rx="1" fill="#090b0e" transform="rotate(10 37 41)"/>
    <rect    x="32.5" y="49.5" width="2.5" height="7" rx="1.2" fill="#090b0e" transform="rotate(-5 32.5 49.5)"/>
    <rect    x="36"   y="49.5" width="2.5" height="7" rx="1.2" fill="#090b0e" transform="rotate(5 36 49.5)"/>
    <line    x1="19" y1="30" x2="29" y2="40" stroke="#090b0e" stroke-width="1.4" opacity="0.7"/>
    <line    x1="22" y1="34" x2="19" y2="30" stroke="#090b0e" stroke-width="1" opacity="0.4"/>
  </g>

  <text x="116" y="76" font-size="26" font-weight="700" fill="#e6edf3" letter-spacing="-0.5">Raghu</text>
  <text x="200" y="74" font-size="13" font-weight="400" fill="#cc2200">/ rs-raghu</text>
  <text x="116" y="96" font-size="11" fill="#8b949e" font-style="italic">AI/ML Enthusiast · LeetCode Grinder · Open Source Contributor</text>

  <rect x="116" y="104" width="38" height="16" rx="8" fill="#2a0808" stroke="#cc2200" stroke-width="0.8" opacity="0.8"/>
  <text x="135"  y="116" font-size="9" fill="#ff6b6b" text-anchor="middle">India</text>

  <rect x="160" y="104" width="68" height="16" rx="8" fill="#111519" stroke="#30363d" stroke-width="0.8"/>
  <text x="194"  y="116" font-size="9" fill="#8b949e" text-anchor="middle">Open to Work</text>

  <rect x="234" y="104" width="42" height="16" rx="8" fill="#111519" stroke="#30363d" stroke-width="0.8"/>
  <text x="255"  y="116" font-size="9" fill="#8b949e" text-anchor="middle">AI / ML</text>

  <rect x="480" y="18" width="180" height="86" rx="8" fill="#00000090" stroke="#cc2200" stroke-width="0.8" stroke-opacity="0.4"/>
  <rect x="480" y="18" width="3"   height="86" rx="1" fill="#cc2200"/>
  <text x="490" y="36" font-size="10" fill="#484f58">role:</text>   <text x="520" y="36" font-size="10" fill="#e6edf3">AI/ML Dev</text>
  <text x="490" y="52" font-size="10" fill="#484f58">building:</text><text x="540" y="52" font-size="10" fill="#ff6b6b">winsomegin</text>
  <text x="490" y="68" font-size="10" fill="#484f58">learning:</text> <text x="540" y="68" font-size="10" fill="#ffa657">ML Models</text>
  <text x="490" y="84" font-size="10" fill="#484f58">status:</text>
  <circle cx="540" cy="80" r="3.5" fill="#3fb950">
    <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite"/>
  </circle>
  <text x="548" y="84" font-size="10" fill="#3fb950">active</text>

  <text x="20" y="196" font-size="9" fill="#484f58" letter-spacing="1.5" font-weight="600">GITHUB</text>

  <rect x="16"  y="204" width="148" height="52" rx="8" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
  <text x="26"  y="221" font-size="9"  fill="#484f58">Total Commits</text>
  <text x="26"  y="238" font-size="17" font-weight="700" fill="#58a6ff">1,204</text>
  <rect x="26"  y="243" width="128" height="3" rx="1.5" fill="#1e2328"/>
  <rect x="26"  y="243" width="107" height="3" rx="1.5" fill="#58a6ff">
    <animate attributeName="width" from="0" to="107" dur="1.2s" begin="0.3s" fill="freeze"/>
  </rect>

  <rect x="170" y="204" width="148" height="52" rx="8" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
  <text x="180" y="221" font-size="9"  fill="#484f58">Stars Earned</text>
  <text x="180" y="238" font-size="17" font-weight="700" fill="#e84040">${starsStr}</text>
  <rect x="180" y="243" width="128" height="3" rx="1.5" fill="#1e2328"/>
  <rect x="180" y="243" width="${Math.round(starsBar * 1.28)}" height="3" rx="1.5" fill="#e84040">
    <animate attributeName="width" from="0" to="${Math.round(starsBar * 1.28)}" dur="1.2s" begin="0.5s" fill="freeze"/>
  </rect>

  <rect x="16"  y="262" width="148" height="52" rx="8" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
  <text x="26"  y="279" font-size="9"  fill="#484f58">Public Repos</text>
  <text x="26"  y="296" font-size="17" font-weight="700" fill="#bc8cff">${gh.public_repos}</text>
  <rect x="26"  y="301" width="128" height="3" rx="1.5" fill="#1e2328"/>
  <rect x="26"  y="301" width="${Math.min(reposBar, 100) * 1.28}" height="3" rx="1.5" fill="#bc8cff">
    <animate attributeName="width" from="0" to="${Math.min(reposBar, 100) * 1.28}" dur="1.2s" begin="0.7s" fill="freeze"/>
  </rect>

  <rect x="170" y="262" width="148" height="52" rx="8" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
  <text x="180" y="279" font-size="9"  fill="#484f58">Top Language</text>
  <text x="180" y="296" font-size="16" font-weight="700" fill="#3fb950">${gh.topLang}</text>
  <rect x="180" y="301" width="128" height="3" rx="1.5" fill="#1e2328"/>
  <rect x="180" y="301" width="96"  height="3" rx="1.5" fill="#3fb950">
    <animate attributeName="width" from="0" to="96" dur="1.2s" begin="0.9s" fill="freeze"/>
  </rect>

  <text x="334" y="196" font-size="9" fill="#484f58" letter-spacing="1.5" font-weight="600">LEETCODE — RS-RAGHU</text>

  <g transform="translate(360, 225)">
    <circle cx="38" cy="38" r="${r}" fill="none" stroke="#1e2328" stroke-width="9"/>
    <circle cx="38" cy="38" r="${r}" fill="none" stroke="#3fb950" stroke-width="9"
      stroke-dasharray="${circ}" stroke-dashoffset="${circ - easyLen}"
      transform="rotate(-90 38 38)">
      <animate attributeName="stroke-dashoffset" from="${circ}" to="${circ - easyLen}" dur="1.2s" begin="0.4s" fill="freeze"/>
    </circle>
    <circle cx="38" cy="38" r="${r}" fill="none" stroke="#ffa657" stroke-width="9"
      stroke-dasharray="${circ}" stroke-dashoffset="${circ - medLen}"
      transform="rotate(${-90 + easyFrac*360} 38 38)">
      <animate attributeName="stroke-dashoffset" from="${circ}" to="${circ - medLen}" dur="1.2s" begin="0.6s" fill="freeze"/>
    </circle>
    <circle cx="38" cy="38" r="${r}" fill="none" stroke="#e84040" stroke-width="9"
      stroke-dasharray="${circ}" stroke-dashoffset="${circ - hardLen}"
      transform="rotate(${-90 + (easyFrac+medFrac)*360} 38 38)">
      <animate attributeName="stroke-dashoffset" from="${circ}" to="${circ - hardLen}" dur="1.2s" begin="0.8s" fill="freeze"/>
    </circle>
    <text x="38" y="34" text-anchor="middle" font-size="15" font-weight="700" fill="#e6edf3">${lc.total}</text>
    <text x="38" y="47" text-anchor="middle" font-size="8"  fill="#484f58">solved</text>
  </g>

  <rect x="448" y="204" width="72" height="42" rx="6" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
  <text x="484"  y="221" font-size="8"  fill="#484f58" text-anchor="middle">Easy</text>
  <text x="484"  y="236" font-size="15" font-weight="700" fill="#3fb950" text-anchor="middle">${lc.easy}</text>

  <rect x="526" y="204" width="72" height="42" rx="6" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
  <text x="562"  y="221" font-size="8"  fill="#484f58" text-anchor="middle">Medium</text>
  <text x="562"  y="236" font-size="15" font-weight="700" fill="#ffa657" text-anchor="middle">${lc.medium}</text>

  <rect x="604" y="204" width="60" height="42" rx="6" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
  <text x="634"  y="221" font-size="8"  fill="#484f58" text-anchor="middle">Hard</text>
  <text x="634"  y="236" font-size="15" font-weight="700" fill="#e84040" text-anchor="middle">${lc.hard}</text>

  <rect x="448" y="252" width="110" height="42" rx="6" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
  <text x="458"  y="268" font-size="8"  fill="#484f58">Streak</text>
  <text x="458"  y="284" font-size="16" font-weight="700" fill="#ffa657">Live</text>

  <rect x="564" y="252" width="100" height="42" rx="6" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
  <text x="574"  y="268" font-size="8"  fill="#484f58">Rank</text>
  <text x="574"  y="284" font-size="13" font-weight="700" fill="#ffd700">${rankStr}</text>

  <text x="20" y="334" font-size="9" fill="#484f58" letter-spacing="1.5" font-weight="600">CONTRIBUTION ACTIVITY</text>
  <rect x="16" y="342" width="302" height="52" rx="8" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
  <g transform="translate(22, 346)">
    ${barHeights.map((h, i) => `<rect x="${i * 6}" y="${40 - h}" width="5" height="${h}" rx="1" fill="${barColors[i]}" opacity="0.85"/>`).join('\n    ')}
  </g>

  <text x="334" y="334" font-size="9" fill="#484f58" letter-spacing="1.5" font-weight="600">TECH STACK</text>
  <rect x="330" y="342" width="334" height="52" rx="8" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>

  ${["Python","Java","JavaScript","React","HTML/CSS","MySQL"].map((t, i) => {
    const x = 340 + i * 52;
    const w = t.length * 6 + 12;
    return `<rect x="${340 + i*54}" y="350" width="${w}" height="16" rx="8" fill="#111519" stroke="#30363d" stroke-width="0.8"/>
  <text x="${340 + i*54 + w/2}" y="362" font-size="9" fill="#8b949e" text-anchor="middle">${t}</text>`;
  }).join('\n  ')}

  ${["TensorFlow","PyTorch","Scikit","NumPy","Pandas"].map((t, i) => {
    const w = t.length * 6 + 12;
    return `<rect x="${340 + i*62}" y="372" width="${w}" height="16" rx="8" fill="#2a0808" stroke="#cc2200" stroke-width="0.8" opacity="0.8"/>
  <text x="${340 + i*62 + w/2}" y="384" font-size="9" fill="#ff6b6b" text-anchor="middle">${t}</text>`;
  }).join('\n  ')}

  <rect x="16" y="406" width="200" height="42" rx="8" fill="#0f1114" stroke="#1e2328" stroke-width="1"/>
  <rect x="16" y="406" width="3"   height="42" rx="1" fill="#cc2200"/>
  <circle cx="31" cy="427" r="4" fill="#3fb950">
    <animate attributeName="opacity" values="1;0.3;1" dur="1.8s" repeatCount="indefinite"/>
  </circle>
  <text x="40"  y="421" font-size="8"  fill="#484f58" letter-spacing="1">CURRENTLY BUILDING</text>
  <text x="40"  y="437" font-size="15" font-weight="700" fill="#e84040">winsomegin</text>

  ${[
    {label:"LeetCode", x:226, col:"#ffa657"},
    {label:"Twitter",  x:306, col:"#1da1f2"},
    {label:"LinkedIn", x:386, col:"#0077b5"},
    {label:"Dev.to",   x:466, col:"#8b9cf8"},
    {label:"Gmail",    x:546, col:"#ea4335"},
  ].map(({label,x,col}) =>
    `<rect x="${x}" y="411" width="72" height="30" rx="6" fill="#111519" stroke="#1e2328" stroke-width="1"/>
  <text x="${x+36}" y="431" font-size="10" font-weight="600" fill="${col}" text-anchor="middle">${label}</text>`
  ).join('\n  ')}

  <rect x="0" y="${H-2}" width="${W}" height="2" rx="1" fill="url(#redLine)"/>

</svg>`;
}

// ─── Handler ─────────────────────────────────────────
export default async function handler(req, res) {
  const [gh, lc] = await Promise.all([fetchGitHub(), fetchLeetCode()]);
  const svg = buildSVG(gh, lc);

  res.setHeader("Content-Type", "image/svg+xml");
  // res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=7200");
  // res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).send(svg);
}