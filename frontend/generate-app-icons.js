const fs = require('fs');
const path = require('path');

// SVG template with black background and white icon
const createSVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Black background -->
  <rect width="${size}" height="${size}" fill="#000000"/>
  
  <!-- White logo centered and scaled appropriately -->
  <g transform="translate(${size * 0.2}, ${size * 0.2}) scale(${size / 48 * 0.6})">
    <path 
      fillRule="evenodd" 
      clipRule="evenodd" 
      d="M24 4H42V17.3333V30.6667H24V44H6V30.6667V17.3333H24V4Z" 
      fill="#ffffff"
    />
  </g>
</svg>
`.trim();

// Create icons for different sizes
const sizes = [16, 32, 192, 512];
const publicDir = path.join(__dirname, 'public');

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('🎨 Generating PWA icons with black background...\n');

sizes.forEach(size => {
  const svg = createSVG(size);
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(publicDir, filename);
  
  fs.writeFileSync(filepath, svg);
  console.log(`✅ Created ${filename}`);
});

// Create apple-touch-icon (180x180 is standard for iOS)
const appleTouchIconSVG = createSVG(180);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.svg'), appleTouchIconSVG);
console.log(`✅ Created apple-touch-icon.svg`);

console.log('\n📱 Icons generated successfully!');
console.log('\n⚠️  Note: SVG files created. For best compatibility, convert to PNG:');
console.log('   You can use an online tool like https://svgtopng.com');
console.log('   Or install sharp: npm install sharp');
console.log('   Then run: node convert-icons-to-png.js');
