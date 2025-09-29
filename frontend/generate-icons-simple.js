#!/usr/bin/env node

/**
 * Simple PWA Icon Generator for Streamr
 * 
 * This script creates placeholder files for the required PWA icon sizes.
 * You'll need to manually create the actual PNG files from the icon.svg.
 * 
 * Usage: node generate-icons-simple.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ICON_SIZES = [
  { size: 16, name: 'icon-16x16.png' },
  { size: 32, name: 'icon-32x32.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 512, name: 'icon-512x512.png' },
  { size: 180, name: 'apple-touch-icon.png' }
];

const OUTPUT_DIR = 'public';

function createIconPlaceholder(size, outputName) {
  const outputPath = path.join(OUTPUT_DIR, outputName);
  
  // Create a simple SVG-based placeholder that matches the Streamr logo
  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#121417"/>
  <path 
    fillRule="evenodd" 
    clipRule="evenodd" 
    d="M24 4H42V17.3333V30.6667H24V44H6V30.6667V17.3333H24V4Z" 
    fill="white"
    transform="scale(${size/48})"
  />
</svg>`;
  
  try {
    fs.writeFileSync(outputPath, svgContent);
    console.log(`✅ ${outputName} created (${size}x${size})`);
  } catch (error) {
    console.error(`❌ Error creating ${outputName}:`, error.message);
  }
}

function main() {
  console.log('🎨 Simple PWA Icon Generator for Streamr\n');
  console.log('📝 This script creates SVG-based placeholder icons.');
  console.log('🔄 For production, convert these to PNG using an image editor.\n');
  
  // Check if source icon exists
  if (!fs.existsSync('public/icon.svg')) {
    console.error('❌ Source icon not found: public/icon.svg');
    process.exit(1);
  }
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  console.log('🚀 Creating icon placeholders...\n');
  
  // Generate all icon sizes
  ICON_SIZES.forEach(({ size, name }) => {
    createIconPlaceholder(size, name);
  });
  
  console.log('\n🎉 Icon placeholders created!');
  console.log('\n📋 Next steps:');
  console.log('  1. Convert SVG placeholders to PNG using an image editor');
  console.log('  2. Or use online tools like:');
  console.log('     - https://convertio.co/svg-png/');
  console.log('     - https://cloudconvert.com/svg-to-png');
  console.log('     - https://www.icoconverter.com/');
  console.log('  3. Replace the placeholder files with actual PNG icons');
  console.log('  4. Test PWA installation on different devices');
  console.log('  5. Run Lighthouse audit to verify PWA compliance');
  
  console.log('\n💡 Alternative: Use the ImageMagick script if available:');
  console.log('   node generate-pwa-icons.js');
}

// Run the script
main(); 