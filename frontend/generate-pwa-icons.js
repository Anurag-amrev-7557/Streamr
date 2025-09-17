#!/usr/bin/env node

/**
 * PWA Icon Generator Script
 * 
 * This script generates all the required PWA icon sizes from the existing icon.svg
 * You'll need to have ImageMagick installed: https://imagemagick.org/
 * 
 * Usage: node generate-pwa-icons.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ICON_SIZES = [
  { size: 16, name: 'icon-16x16.png' },
  { size: 32, name: 'icon-32x32.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 512, name: 'icon-512x512.png' },
  { size: 180, name: 'apple-touch-icon.png' }
];

const ICON_SOURCE = 'public/icon.svg';
const OUTPUT_DIR = 'public';

function checkImageMagick() {
  try {
    execSync('magick --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    try {
      execSync('convert --version', { stdio: 'ignore' });
      return true;
    } catch (error) {
      return false;
    }
  }
}

function generateIcon(size, outputName) {
  const outputPath = path.join(OUTPUT_DIR, outputName);
  const command = `magick convert "${ICON_SOURCE}" -resize ${size}x${size} "${outputPath}"`;
  
  try {
    console.log(`Generating ${outputName} (${size}x${size})...`);
    execSync(command, { stdio: 'pipe' });
    
    // Verify file was created
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      console.log(`✅ ${outputName} created (${stats.size} bytes)`);
    } else {
      console.error(`❌ Failed to create ${outputName}`);
    }
  } catch (error) {
    console.error(`❌ Error generating ${outputName}:`, error.message);
  }
}

function main() {
  console.log('🎨 PWA Icon Generator for Streamr\n');
  
  // Check if ImageMagick is available
  if (!checkImageMagick()) {
    console.error('❌ ImageMagick is not installed or not in PATH');
    console.log('\nPlease install ImageMagick:');
    console.log('  macOS: brew install imagemagick');
    console.log('  Ubuntu/Debian: sudo apt-get install imagemagick');
    console.log('  Windows: Download from https://imagemagick.org/\n');
    process.exit(1);
  }
  
  // Check if source icon exists
  if (!fs.existsSync(ICON_SOURCE)) {
    console.error(`❌ Source icon not found: ${ICON_SOURCE}`);
    process.exit(1);
  }
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  console.log('🚀 Starting icon generation...\n');
  
  // Generate all icon sizes
  ICON_SIZES.forEach(({ size, name }) => {
    generateIcon(size, name);
  });
  
  console.log('\n🎉 Icon generation complete!');
  console.log('\nGenerated files:');
  ICON_SIZES.forEach(({ name }) => {
    const filePath = path.join(OUTPUT_DIR, name);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`  📁 ${name} (${stats.size} bytes)`);
    }
  });
  
  console.log('\n📋 Next steps:');
  console.log('  1. Verify all icons are generated correctly');
  console.log('  2. Test PWA installation on different devices');
  console.log('  3. Run Lighthouse audit to verify PWA compliance');
  console.log('  4. Deploy and test offline functionality');
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { generateIcon, ICON_SIZES }; 