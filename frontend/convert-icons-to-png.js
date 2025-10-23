import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SVG template with black background and white icon
const createIconSVG = (size) => {
  const padding = size * 0.2; // 20% padding
  const logoSize = size * 0.6; // Logo takes 60% of canvas
  const logoStart = padding;
  
  return Buffer.from(`
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Black background -->
  <rect width="${size}" height="${size}" fill="#000000"/>
  
  <!-- White logo centered -->
  <g transform="translate(${logoStart}, ${logoStart}) scale(${logoSize / 48})">
    <path 
      fillRule="evenodd" 
      clipRule="evenodd" 
      d="M24 4H42V17.3333V30.6667H24V44H6V30.6667V17.3333H24V4Z" 
      fill="#ffffff"
    />
  </g>
</svg>
  `.trim());
};

async function generateIcons() {
  const publicDir = path.join(__dirname, 'public');
  
  // Ensure public directory exists
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  console.log('🎨 Generating PWA icons with black background...\n');

  const icons = [
    { size: 16, name: 'icon-16x16.png' },
    { size: 32, name: 'icon-32x32.png' },
    { size: 192, name: 'icon-192x192.png' },
    { size: 512, name: 'icon-512x512.png' },
    { size: 180, name: 'apple-touch-icon.png' }, // iOS home screen
  ];

  for (const icon of icons) {
    try {
      const svgBuffer = createIconSVG(icon.size);
      const outputPath = path.join(publicDir, icon.name);
      
      await sharp(svgBuffer)
        .resize(icon.size, icon.size)
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Created ${icon.name} (${icon.size}x${icon.size})`);
    } catch (error) {
      console.error(`❌ Error creating ${icon.name}:`, error.message);
    }
  }

  console.log('\n📱 All icons generated successfully!');
  console.log('🏠 Your PWA icons now have a black background with white logo');
}

generateIcons().catch(console.error);
