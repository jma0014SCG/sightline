#!/usr/bin/env node

/**
 * Archive Link Fixer for Sightline.ai Documentation
 * Batch fixes relative path references in archive files
 */

const fs = require('fs');
const path = require('path');

class ArchiveLinkFixer {
  constructor() {
    this.fixes = [
      // Fix Bug_tracking.md references
      {
        pattern: /Docs\/Bug_tracking\.md/g,
        replacement: '../../../Docs/development/bug-tracking.md',
        description: 'Fix Bug_tracking.md path references'
      },
      // Fix architecture references
      {
        pattern: /Docs\/architecture\/project-structure\.md/g,
        replacement: '../../../Docs/architecture/project-structure.md',
        description: 'Fix project-structure.md path references'
      },
      {
        pattern: /Docs\/architecture\/platform-overview\.md/g,
        replacement: '../../../Docs/architecture/platform-overview.md',
        description: 'Fix platform-overview.md path references (note: file was deleted)'
      },
      {
        pattern: /Docs\/architecture\/ui-ux-guidelines\.md/g,
        replacement: '../../../Docs/architecture/ui-ux-guidelines.md',
        description: 'Fix ui-ux-guidelines.md path references'
      },
      // Fix development references
      {
        pattern: /Docs\/development\/testing-strategy\.md/g,
        replacement: '../../../Docs/development/testing-strategy.md',
        description: 'Fix testing-strategy.md path references'
      },
      {
        pattern: /Docs\/development\/bug-tracking\.md/g,
        replacement: '../../../Docs/development/bug-tracking.md',
        description: 'Fix development bug-tracking.md path references'
      },
      {
        pattern: /Docs\/development\/quick-reference\.md/g,
        replacement: '../../../Docs/development/quick-reference.md',
        description: 'Fix quick-reference.md path references (note: file may not exist)'
      },
      // Fix operations references
      {
        pattern: /Docs\/operations\/monitoring\.md/g,
        replacement: '../../../Docs/operations/monitoring.md',
        description: 'Fix monitoring.md path references'
      },
      {
        pattern: /Docs\/operations\/legacy-deployment\.md/g,
        replacement: '../../../Docs/operations/legacy-deployment.md',
        description: 'Fix legacy-deployment.md path references'
      },
      {
        pattern: /Docs\/operations\/rate-limits\.md/g,
        replacement: '../../../Docs/operations/rate-limits.md',
        description: 'Fix rate-limits.md path references'
      },
      // Fix reports directory references
      {
        pattern: /Docs\/reports\//g,
        replacement: '../../../Docs/reports/',
        description: 'Fix reports directory path references'
      },
      // Fix Bug_tracking.md anchor references
      {
        pattern: /Docs\/Bug_tracking\.md#/g,
        replacement: '../../../Docs/development/bug-tracking.md#',
        description: 'Fix Bug_tracking.md anchor path references'
      }
    ];
    
    this.archiveFiles = [
      './Docs/archive/obsolete-root-docs/API_DOCUMENTATION.md',
      './Docs/archive/obsolete-root-docs/DOCUMENTATION_INDEX.md',
      './Docs/archive/obsolete-root-docs/README.md'
    ];
    
    this.results = {
      filesProcessed: 0,
      fixesApplied: 0,
      errors: []
    };
  }

  // Apply fixes to a single file
  fixFile(filePath) {
    try {
      console.log(`📁 Processing: ${filePath}`);
      
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️  File not found: ${filePath}`);
        this.results.errors.push(`File not found: ${filePath}`);
        return false;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      let modifiedContent = content;
      let fileFixCount = 0;

      // Apply each fix pattern
      this.fixes.forEach(fix => {
        const matches = modifiedContent.match(fix.pattern);
        if (matches) {
          const fixCount = matches.length;
          modifiedContent = modifiedContent.replace(fix.pattern, fix.replacement);
          fileFixCount += fixCount;
          console.log(`   ✅ ${fix.description}: ${fixCount} fixes`);
        }
      });

      // Only write if changes were made
      if (fileFixCount > 0) {
        fs.writeFileSync(filePath, modifiedContent, 'utf8');
        console.log(`   💾 Saved ${fileFixCount} fixes to ${filePath}`);
        this.results.fixesApplied += fileFixCount;
      } else {
        console.log(`   ℹ️  No fixes needed for ${filePath}`);
      }

      this.results.filesProcessed++;
      return true;

    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
      this.results.errors.push(`${filePath}: ${error.message}`);
      return false;
    }
  }

  // Process all archive files
  processAllFiles() {
    console.log('🚀 Starting Archive Link Fixing\n');

    this.archiveFiles.forEach(filePath => {
      this.fixFile(filePath);
      console.log(''); // Add space between files
    });
  }

  // Generate summary report
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        filesProcessed: this.results.filesProcessed,
        fixesApplied: this.results.fixesApplied,
        errors: this.results.errors.length
      },
      fixPatterns: this.fixes.map(f => f.description),
      targetFiles: this.archiveFiles,
      errors: this.results.errors
    };

    return report;
  }

  // Main execution
  async run() {
    this.processAllFiles();
    
    const report = this.generateReport();
    
    // Save report
    const reportPath = './archive-links-fix-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('📊 ARCHIVE LINK FIXING COMPLETE');
    console.log('='.repeat(50));
    console.log(`📁 Files processed: ${report.summary.filesProcessed}`);
    console.log(`🔧 Fixes applied: ${report.summary.fixesApplied}`);
    console.log(`❌ Errors: ${report.summary.errors}`);
    console.log(`📄 Report saved to: ${reportPath}`);
    
    if (report.summary.errors > 0) {
      console.log('\n⚠️  ERRORS ENCOUNTERED:');
      report.errors.forEach((error, i) => {
        console.log(`${i + 1}. ${error}`);
      });
    }
    
    return report;
  }
}

// Run if called directly
if (require.main === module) {
  const fixer = new ArchiveLinkFixer();
  fixer.run().catch(console.error);
}

module.exports = ArchiveLinkFixer;