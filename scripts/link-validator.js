#!/usr/bin/env node

/**
 * Link Validator for Sightline.ai Documentation
 * Systematically validates all markdown links in the project
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class LinkValidator {
  constructor() {
    this.results = {
      totalFiles: 0,
      totalLinks: 0,
      internalLinks: [],
      externalLinks: [],
      anchorLinks: [],
      frontmatterRefs: [],
      broken: [],
      warnings: []
    };
    
    this.projectRoot = process.cwd();
    this.markdownFiles = [];
  }

  // Find all markdown files excluding certain directories
  findMarkdownFiles() {
    try {
      const cmd = `find . -name "*.md" -not -path "*/venv/*" -not -path "*/node_modules/*" -not -path "*/playwright-report/*" -not -path "*/.cursor/*" -not -path "*/.claude/*"`;
      const output = execSync(cmd, { encoding: 'utf8' });
      this.markdownFiles = output.trim().split('\n').filter(f => f.length > 0);
      this.results.totalFiles = this.markdownFiles.length;
      console.log(`📁 Found ${this.results.totalFiles} markdown files`);
    } catch (error) {
      console.error('Error finding markdown files:', error.message);
    }
  }

  // Extract all links from a file
  extractLinks(filePath, content) {
    const links = {
      internal: [],
      external: [],
      anchor: [],
      frontmatter: []
    };

    // Extract frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      
      // Extract related_docs
      const relatedDocsMatch = frontmatter.match(/related_docs:\s*\[([^\]]+)\]/);
      if (relatedDocsMatch) {
        const docs = relatedDocsMatch[1].split(',').map(d => d.trim().replace(/['"]/g, ''));
        links.frontmatter.push(...docs.map(doc => ({
          type: 'related_docs',
          url: doc,
          line: 'frontmatter'
        })));
      }

      // Extract canonical_url
      const canonicalMatch = frontmatter.match(/canonical_url:\s*["']([^"']+)["']/);
      if (canonicalMatch) {
        links.frontmatter.push({
          type: 'canonical_url',
          url: canonicalMatch[1],
          line: 'frontmatter'
        });
      }
    }

    // Extract markdown links
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    const lines = content.split('\n');
    
    while ((match = linkRegex.exec(content)) !== null) {
      const [fullMatch, text, url] = match;
      const lineNum = content.substring(0, match.index).split('\n').length;
      
      const linkObj = {
        text: text,
        url: url,
        line: lineNum,
        file: filePath
      };

      if (url.startsWith('http://') || url.startsWith('https://')) {
        links.external.push(linkObj);
      } else if (url.startsWith('#')) {
        links.anchor.push(linkObj);
      } else if (url.startsWith('./') || url.startsWith('../') || url.includes('/')) {
        links.internal.push(linkObj);
      }
    }

    return links;
  }

  // Validate internal links
  validateInternalLink(link) {
    const { url, file } = link;
    const baseDir = path.dirname(file);
    
    try {
      let targetPath;
      
      if (url.startsWith('./')) {
        targetPath = path.resolve(baseDir, url);
      } else if (url.startsWith('../')) {
        targetPath = path.resolve(baseDir, url);
      } else if (url.startsWith('/')) {
        targetPath = path.resolve(this.projectRoot, url.substring(1));
      } else {
        targetPath = path.resolve(baseDir, url);
      }

      // Remove anchor if present
      const [filePath, anchor] = targetPath.split('#');
      
      if (fs.existsSync(filePath)) {
        return { valid: true, resolvedPath: filePath };
      } else {
        return { valid: false, error: `File not found: ${filePath}` };
      }
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  // Validate external links (basic HTTP check)
  async validateExternalLink(link) {
    const { url } = link;
    
    try {
      // Skip certain URLs that are known to block automated requests
      if (url.includes('shields.io') || url.includes('badge')) {
        return { valid: true, note: 'Badge URL - assumed valid' };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LinkChecker/1.0)'
        }
      });

      clearTimeout(timeout);
      
      if (response.status >= 200 && response.status < 400) {
        return { valid: true, status: response.status };
      } else {
        return { valid: false, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        return { valid: false, error: 'Timeout' };
      }
      return { valid: false, error: error.message };
    }
  }

  // Process all files and validate links
  async processAllFiles() {
    console.log('🔍 Processing all markdown files...');
    
    for (const filePath of this.markdownFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const links = this.extractLinks(filePath, content);
        
        // Store links by category
        this.results.internalLinks.push(...links.internal);
        this.results.externalLinks.push(...links.external);
        this.results.anchorLinks.push(...links.anchor);
        this.results.frontmatterRefs.push(...links.frontmatter);
        
        this.results.totalLinks += links.internal.length + links.external.length + 
                                    links.anchor.length + links.frontmatter.length;
      } catch (error) {
        console.warn(`⚠️  Error processing ${filePath}: ${error.message}`);
      }
    }

    console.log(`🔗 Found ${this.results.totalLinks} total links`);
    console.log(`   - Internal: ${this.results.internalLinks.length}`);
    console.log(`   - External: ${this.results.externalLinks.length}`);
    console.log(`   - Anchors: ${this.results.anchorLinks.length}`);
    console.log(`   - Frontmatter: ${this.results.frontmatterRefs.length}`);
  }

  // Validate internal links
  async validateInternalLinks() {
    console.log('\n📁 Validating internal links...');
    
    for (const link of this.results.internalLinks) {
      const validation = this.validateInternalLink(link);
      if (!validation.valid) {
        this.results.broken.push({
          ...link,
          type: 'internal',
          error: validation.error
        });
      }
    }
  }

  // Validate a sample of external links (to avoid being rate limited)
  async validateExternalLinks() {
    console.log('\n🌐 Validating external links...');
    
    // Get unique external links to avoid duplicate checks
    const uniqueUrls = [...new Set(this.results.externalLinks.map(link => link.url))];
    const sampleSize = Math.min(uniqueUrls.length, 20); // Limit to avoid rate limiting
    const sample = uniqueUrls.slice(0, sampleSize);
    
    console.log(`   Testing ${sample.length} unique URLs (sample of ${uniqueUrls.length})...`);
    
    for (const url of sample) {
      const linkExamples = this.results.externalLinks.filter(l => l.url === url);
      const validation = await this.validateExternalLink(linkExamples[0]);
      
      if (!validation.valid) {
        // Mark all instances of this URL as broken
        linkExamples.forEach(link => {
          this.results.broken.push({
            ...link,
            type: 'external',
            error: validation.error
          });
        });
      }
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Generate comprehensive report
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: this.results.totalFiles,
        totalLinks: this.results.totalLinks,
        brokenLinks: this.results.broken.length,
        healthScore: ((this.results.totalLinks - this.results.broken.length) / this.results.totalLinks * 100).toFixed(1)
      },
      breakdown: {
        internal: {
          total: this.results.internalLinks.length,
          broken: this.results.broken.filter(b => b.type === 'internal').length
        },
        external: {
          total: this.results.externalLinks.length,
          broken: this.results.broken.filter(b => b.type === 'external').length
        },
        anchors: {
          total: this.results.anchorLinks.length,
          broken: this.results.broken.filter(b => b.type === 'anchor').length
        },
        frontmatter: {
          total: this.results.frontmatterRefs.length,
          broken: this.results.broken.filter(b => b.type === 'frontmatter').length
        }
      },
      issues: this.results.broken,
      warnings: this.results.warnings
    };

    return report;
  }

  // Run complete validation
  async run() {
    console.log('🚀 Starting Link Validation for Sightline.ai Documentation\n');
    
    this.findMarkdownFiles();
    await this.processAllFiles();
    await this.validateInternalLinks();
    await this.validateExternalLinks();
    
    const report = this.generateReport();
    
    // Save report to file
    const reportPath = './link-validation-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n📊 VALIDATION COMPLETE');
    console.log('='.repeat(50));
    console.log(`📁 Files processed: ${report.summary.totalFiles}`);
    console.log(`🔗 Links analyzed: ${report.summary.totalLinks}`);
    console.log(`❌ Broken links: ${report.summary.brokenLinks}`);
    console.log(`✅ Health score: ${report.summary.healthScore}%`);
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
    if (report.summary.brokenLinks > 0) {
      console.log('\n🔧 TOP ISSUES TO FIX:');
      report.issues.slice(0, 10).forEach((issue, i) => {
        console.log(`${i + 1}. ${issue.file}:${issue.line} - ${issue.url}`);
        console.log(`   Error: ${issue.error}`);
      });
    }
    
    return report;
  }
}

// Run if called directly
if (require.main === module) {
  const validator = new LinkValidator();
  validator.run().catch(console.error);
}

module.exports = LinkValidator;