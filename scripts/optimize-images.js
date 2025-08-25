#!/usr/bin/env node

/**
 * Image Optimization Script using Sharp
 * Reduces image sizes by ~70% through format conversion and resizing
 */

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  IMAGE_DIR: 'public/images',
  OUTPUT_DIR: 'public/images/optimized',
  QUALITY_WEBP: 85,
  QUALITY_JPEG: 85,
  MAX_WIDTH_LOGO: 400,
  MAX_WIDTH_PODCAST: 200,
  MAX_WIDTH_PREVIEW: 800,
  MAX_WIDTH_DEFAULT: 1200,
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Logging helpers
const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.magenta}=== ${msg} ===${colors.reset}\n`),
};

// Get file size in KB
async function getFileSize(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return Math.round(stats.size / 1024);
  } catch {
    return 0;
  }
}

// Get directory size in KB
async function getDirSize(dirPath) {
  let totalSize = 0;
  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    for (const file of files) {
      const filePath = path.join(dirPath, file.name);
      if (file.isDirectory()) {
        totalSize += await getDirSize(filePath);
      } else {
        totalSize += await getFileSize(filePath);
      }
    }
  } catch {
    // Directory doesn't exist
  }
  return totalSize;
}

// Ensure directory exists
async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    log.error(`Failed to create directory: ${dirPath}`);
  }
}

// Optimize a single image
async function optimizeImage(inputPath, outputDir, maxWidth) {
  const filename = path.basename(inputPath);
  const name = path.parse(filename).name;
  
  try {
    // Ensure output directory exists
    await ensureDir(outputDir);
    
    // Get original size
    const sizeBefore = await getFileSize(inputPath);
    
    // Read image metadata
    const metadata = await sharp(inputPath).metadata();
    
    // Calculate resize width (don't upscale)
    const targetWidth = Math.min(maxWidth, metadata.width || maxWidth);
    
    // Create WebP version
    const webpPath = path.join(outputDir, `${name}.webp`);
    await sharp(inputPath)
      .resize(targetWidth, null, {
        withoutEnlargement: true,
        fit: 'inside',
      })
      .webp({ quality: CONFIG.QUALITY_WEBP })
      .toFile(webpPath);
    
    // Create optimized original format
    const ext = path.extname(inputPath).toLowerCase();
    const optimizedPath = path.join(outputDir, filename);
    
    if (ext === '.png') {
      await sharp(inputPath)
        .resize(targetWidth, null, {
          withoutEnlargement: true,
          fit: 'inside',
        })
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toFile(optimizedPath);
    } else if (ext === '.jpg' || ext === '.jpeg') {
      await sharp(inputPath)
        .resize(targetWidth, null, {
          withoutEnlargement: true,
          fit: 'inside',
        })
        .jpeg({ quality: CONFIG.QUALITY_JPEG, progressive: true })
        .toFile(optimizedPath);
    }
    
    // Calculate size after
    const sizeAfter = await getFileSize(webpPath);
    const reduction = Math.round(((sizeBefore - sizeAfter) / sizeBefore) * 100);
    
    log.success(`Optimized ${filename}: ${sizeBefore}KB → ${sizeAfter}KB (${reduction}% reduction)`);
    return { success: true, sizeBefore, sizeAfter };
  } catch (err) {
    log.error(`Failed to optimize ${filename}: ${err.message}`);
    return { success: false, sizeBefore: 0, sizeAfter: 0 };
  }
}

// Generate responsive sizes
async function generateResponsiveSizes(inputPath, outputDir, baseName) {
  const sizes = [320, 640, 768, 1024, 1440, 1920];
  
  for (const size of sizes) {
    try {
      const outputPath = path.join(outputDir, `${baseName}-${size}w.webp`);
      await sharp(inputPath)
        .resize(size, null, {
          withoutEnlargement: true,
          fit: 'inside',
        })
        .webp({ quality: CONFIG.QUALITY_WEBP })
        .toFile(outputPath);
    } catch (err) {
      // Skip if size is larger than original
    }
  }
}

// Find all images in a directory
async function findImages(dir, extensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg']) {
  const images = [];
  
  try {
    const files = await fs.readdir(dir, { withFileTypes: true });
    
    for (const file of files) {
      const filePath = path.join(dir, file.name);
      
      if (file.isDirectory()) {
        // Recursively search subdirectories
        const subImages = await findImages(filePath, extensions);
        images.push(...subImages);
      } else if (file.isFile()) {
        const ext = path.extname(file.name).toLowerCase();
        if (extensions.includes(ext)) {
          images.push(filePath);
        }
      }
    }
  } catch (err) {
    log.warning(`Cannot read directory ${dir}: ${err.message}`);
  }
  
  return images;
}

// Main optimization process
async function main() {
  log.section('Image Optimization Pipeline');
  console.log(`${colors.cyan}${'━'.repeat(50)}${colors.reset}\n`);
  
  // Check if sharp is available
  try {
    require.resolve('sharp');
  } catch {
    log.error('Sharp is not installed. Installing...');
    const { execSync } = require('child_process');
    execSync('npm install sharp', { stdio: 'inherit' });
  }
  
  // Calculate initial size
  const sizeBefore = await getDirSize(CONFIG.IMAGE_DIR);
  log.info(`Original image directory size: ${sizeBefore.toLocaleString()}KB`);
  
  // Create backup
  const backupDir = `${CONFIG.IMAGE_DIR}.backup-${new Date().toISOString().slice(0, 19).replace(/:/g, '')}`;
  try {
    const { execSync } = require('child_process');
    execSync(`cp -r "${CONFIG.IMAGE_DIR}" "${backupDir}"`, { stdio: 'ignore' });
    log.success(`Backup created at: ${backupDir}`);
  } catch {
    log.warning('Could not create backup');
  }
  
  // Statistics
  let totalProcessed = 0;
  let totalFailed = 0;
  let totalSizeBefore = 0;
  let totalSizeAfter = 0;
  
  // Phase 1: Optimize Logo Images
  log.section('Phase 1: Optimizing Logo Images');
  const logoImages = await findImages(path.join(CONFIG.IMAGE_DIR, 'logo'));
  for (const img of logoImages) {
    const result = await optimizeImage(img, path.join(CONFIG.OUTPUT_DIR, 'logo'), CONFIG.MAX_WIDTH_LOGO);
    if (result.success) {
      totalProcessed++;
      totalSizeBefore += result.sizeBefore;
      totalSizeAfter += result.sizeAfter;
    } else {
      totalFailed++;
    }
  }
  
  // Also check root for logo files
  const rootImages = await findImages(CONFIG.IMAGE_DIR, ['.png', '.jpg', '.jpeg']);
  for (const img of rootImages) {
    if (path.basename(img).toLowerCase().includes('logo')) {
      const result = await optimizeImage(img, path.join(CONFIG.OUTPUT_DIR, 'logo'), CONFIG.MAX_WIDTH_LOGO);
      if (result.success) {
        totalProcessed++;
        totalSizeBefore += result.sizeBefore;
        totalSizeAfter += result.sizeAfter;
      } else {
        totalFailed++;
      }
    }
  }
  
  // Phase 2: Optimize Podcast Images
  log.section('Phase 2: Optimizing Podcast Images');
  const podcastImages = await findImages(path.join(CONFIG.IMAGE_DIR, 'podcasts'));
  for (const img of podcastImages) {
    const result = await optimizeImage(img, path.join(CONFIG.OUTPUT_DIR, 'podcasts'), CONFIG.MAX_WIDTH_PODCAST);
    if (result.success) {
      totalProcessed++;
      totalSizeBefore += result.sizeBefore;
      totalSizeAfter += result.sizeAfter;
    } else {
      totalFailed++;
    }
  }
  
  // Phase 3: Optimize Preview Images
  log.section('Phase 3: Optimizing Preview Images');
  for (const img of rootImages) {
    if (path.basename(img).toLowerCase().includes('preview')) {
      const result = await optimizeImage(img, path.join(CONFIG.OUTPUT_DIR, 'previews'), CONFIG.MAX_WIDTH_PREVIEW);
      if (result.success) {
        totalProcessed++;
        totalSizeBefore += result.sizeBefore;
        totalSizeAfter += result.sizeAfter;
        
        // Generate responsive sizes
        await generateResponsiveSizes(
          img,
          path.join(CONFIG.OUTPUT_DIR, 'responsive'),
          path.parse(path.basename(img)).name
        );
      } else {
        totalFailed++;
      }
    }
  }
  
  // Phase 4: Optimize Remaining Images
  log.section('Phase 4: Optimizing Remaining Images');
  for (const img of rootImages) {
    const basename = path.basename(img).toLowerCase();
    if (!basename.includes('logo') && !basename.includes('preview')) {
      const result = await optimizeImage(img, CONFIG.OUTPUT_DIR, CONFIG.MAX_WIDTH_DEFAULT);
      if (result.success) {
        totalProcessed++;
        totalSizeBefore += result.sizeBefore;
        totalSizeAfter += result.sizeAfter;
      } else {
        totalFailed++;
      }
    }
  }
  
  // Generate image manifest
  log.section('Phase 5: Generating Image Manifest');
  const manifest = {
    images: {
      logos: {},
      podcasts: {},
      previews: {},
      responsive: {
        sizes: [320, 640, 768, 1024, 1440, 1920],
        formats: ['webp', 'jpg', 'png'],
        quality: CONFIG.QUALITY_WEBP,
      },
    },
    generated: new Date().toISOString(),
    stats: {
      processed: totalProcessed,
      failed: totalFailed,
      sizeBefore: totalSizeBefore,
      sizeAfter: totalSizeAfter,
      reduction: totalSizeBefore > 0 ? Math.round(((totalSizeBefore - totalSizeAfter) / totalSizeBefore) * 100) : 0,
    },
  };
  
  await fs.writeFile(
    path.join(CONFIG.OUTPUT_DIR, 'image-manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  
  // Final report
  log.section('Optimization Complete - Summary Report');
  console.log(`${colors.cyan}${'━'.repeat(50)}${colors.reset}`);
  console.log(`${colors.green}Image Optimization Results:${colors.reset}`);
  console.log(`${colors.cyan}${'━'.repeat(50)}${colors.reset}`);
  console.log(`Size before:            ${colors.yellow}${totalSizeBefore.toLocaleString()} KB${colors.reset}`);
  console.log(`Size after:             ${colors.green}${totalSizeAfter.toLocaleString()} KB${colors.reset}`);
  
  const reduction = totalSizeBefore > 0 
    ? Math.round(((totalSizeBefore - totalSizeAfter) / totalSizeBefore) * 100)
    : 0;
  console.log(`Space saved:            ${colors.green}${(totalSizeBefore - totalSizeAfter).toLocaleString()} KB (${reduction}%)${colors.reset}`);
  console.log(`Files processed:        ${colors.green}${totalProcessed}${colors.reset}`);
  
  if (totalFailed > 0) {
    console.log(`Files failed:           ${colors.red}${totalFailed}${colors.reset}`);
  }
  
  console.log(`${colors.cyan}${'━'.repeat(50)}${colors.reset}\n`);
  
  // Implementation steps
  log.section('Implementation Steps');
  console.log('1. ✅ Review optimized images in: ' + CONFIG.OUTPUT_DIR);
  console.log('2. ✅ Test images in development: pnpm dev');
  console.log('3. ✅ Update image imports to use optimized versions');
  console.log('4. ✅ Replace original images: mv ' + CONFIG.OUTPUT_DIR + '/* ' + CONFIG.IMAGE_DIR + '/');
  console.log('5. ✅ Remove backup after verification: rm -rf ' + backupDir);
  
  if (totalFailed > 0) {
    log.warning('Some images failed to optimize. Please review manually.');
    process.exit(1);
  } else {
    log.success('All images successfully optimized!');
    process.exit(0);
  }
}

// Run the script
if (require.main === module) {
  main().catch((err) => {
    log.error(`Script failed: ${err.message}`);
    process.exit(1);
  });
}