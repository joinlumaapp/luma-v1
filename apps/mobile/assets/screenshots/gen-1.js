const sharp = require('sharp');

const W = 1080, H = 1920;

const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2A0E42"/>
      <stop offset="100%" stop-color="#5B2D8E"/>
    </linearGradient>
    <linearGradient id="compat" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#2ECC71"/>
      <stop offset="100%" stop-color="#27AE60"/>
    </linearGradient>
    <clipPath id="phoneClip">
      <rect x="190" y="520" width="700" height="1150" rx="40"/>
    </clipPath>
    <linearGradient id="cardGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#8E4BBD"/>
      <stop offset="100%" stop-color="#3D1B5B"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <!-- Decorative hearts -->
  <g opacity="0.15" fill="#F5B0C0">
    <path d="M120,200 C120,170 80,150 80,180 C80,210 120,240 120,240 C120,240 160,210 160,180 C160,150 120,170 120,200Z" transform="scale(1.2)"/>
    <path d="M120,200 C120,170 80,150 80,180 C80,210 120,240 120,240 C120,240 160,210 160,180 C160,150 120,170 120,200Z" transform="translate(780,100) scale(0.8)"/>
    <path d="M120,200 C120,170 80,150 80,180 C80,210 120,240 120,240 C120,240 160,210 160,180 C160,150 120,170 120,200Z" transform="translate(850,400) scale(0.6)"/>
    <path d="M120,200 C120,170 80,150 80,180 C80,210 120,240 120,240 C120,240 160,210 160,180 C160,150 120,170 120,200Z" transform="translate(30,450) scale(0.7)"/>
  </g>

  <!-- Decorative dots -->
  <g opacity="0.12" fill="#F5B0C0">
    <circle cx="80" cy="650" r="6"/>
    <circle cx="60" cy="700" r="4"/>
    <circle cx="100" cy="730" r="5"/>
    <circle cx="950" cy="800" r="5"/>
    <circle cx="980" cy="850" r="4"/>
    <circle cx="1000" cy="770" r="6"/>
    <circle cx="150" cy="1500" r="5"/>
    <circle cx="920" cy="1400" r="4"/>
  </g>

  <!-- Decorative curves -->
  <path d="M0,400 Q540,300 1080,450" stroke="#F5B0C0" stroke-width="1.5" fill="none" opacity="0.1"/>
  <path d="M0,1600 Q540,1500 1080,1650" stroke="#F5B0C0" stroke-width="1.5" fill="none" opacity="0.1"/>

  <!-- Headline -->
  <text x="540" y="180" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="bold" font-size="72" fill="white">Sana En Uygun</text>
  <text x="540" y="270" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="bold" font-size="72" fill="white">Ki&#351;ileri Ke&#351;fet</text>

  <!-- Subtitle -->
  <text x="540" y="350" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="32" fill="#F5B0C0" opacity="0.8">Ger&#231;ek uyumluluk, ger&#231;ek ba&#287;lant&#305;</text>

  <!-- Phone frame -->
  <rect x="180" y="510" width="720" height="1170" rx="45" fill="#1A0A2E" stroke="#4A2A6E" stroke-width="3"/>
  <!-- Screen area -->
  <rect x="200" y="540" width="680" height="1110" rx="35" fill="#2A1245"/>

  <!-- Status bar -->
  <text x="240" y="580" font-family="Arial,sans-serif" font-size="22" fill="#aaa">9:41</text>
  <circle cx="600" cy="572" r="6" fill="none" stroke="#aaa" stroke-width="1.5"/>
  <rect x="620" y="566" width="30" height="14" rx="3" fill="none" stroke="#aaa" stroke-width="1.5"/>
  <rect x="622" y="568" width="20" height="10" rx="2" fill="#aaa"/>

  <!-- Profile card -->
  <rect x="240" y="610" width="600" height="850" rx="25" fill="url(#cardGrad)"/>

  <!-- Silhouette area (photo placeholder) -->
  <rect x="260" y="630" width="560" height="550" rx="20" fill="#4A2570"/>
  <!-- Woman silhouette -->
  <circle cx="540" cy="800" r="80" fill="#5E3590"/>
  <ellipse cx="540" cy="970" rx="110" ry="100" fill="#5E3590"/>
  <!-- Hair -->
  <path d="M460,780 Q440,700 480,680 Q540,650 600,680 Q640,700 620,780 Q610,740 540,730 Q470,740 460,780Z" fill="#5E3590"/>

  <!-- Ciddi Iliski tag -->
  <rect x="380" y="1200" width="240" height="40" rx="20" fill="#F5B0C0" opacity="0.9"/>
  <text x="500" y="1227" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="20" fill="#3D1B5B">Ciddi &#304;li&#351;ki</text>

  <!-- Name and location -->
  <text x="280" y="1280" font-family="Arial,sans-serif" font-weight="bold" font-size="42" fill="white">Elif, 26</text>
  <text x="280" y="1320" font-family="Arial,sans-serif" font-size="26" fill="#ccc">&#304;stanbul</text>

  <!-- Compatibility score bar -->
  <rect x="260" y="1360" width="560" height="60" rx="30" fill="url(#compat)"/>
  <text x="540" y="1400" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="30" fill="white">%92 Uyum</text>

  <!-- Swipe buttons -->
  <circle cx="360" cy="1560" r="45" fill="none" stroke="#FF6B6B" stroke-width="3"/>
  <text x="360" y="1572" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="36" fill="#FF6B6B">&#10005;</text>

  <circle cx="540" cy="1560" r="38" fill="none" stroke="#5B9BD5" stroke-width="3"/>
  <text x="540" y="1570" text-anchor="middle" font-family="Arial,sans-serif" font-size="28" fill="#5B9BD5">&#9993;</text>

  <circle cx="720" cy="1560" r="45" fill="none" stroke="#2ECC71" stroke-width="3"/>
  <text x="720" y="1575" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="42" fill="#2ECC71">&#9829;</text>

  <!-- LUMA branding -->
  <text x="540" y="1830" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="bold" font-size="40" fill="white" opacity="0.6" letter-spacing="12">LUMA</text>
  <text x="540" y="1870" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" fill="#F5B0C0" opacity="0.5">Ger&#231;ek Uyum, Ger&#231;ek A&#351;k</text>
</svg>`;

sharp(Buffer.from(svg))
  .png()
  .toFile('/home/ubuntu-user/projects/luma-v1/apps/mobile/assets/screenshots/screenshot-1.png')
  .then(() => console.log('Screenshot 1 done'))
  .catch(e => console.error(e));
