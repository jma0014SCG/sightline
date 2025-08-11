#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkActualContent() {
  try {
    console.log('🔍 Checking actual content in database...\n');
    
    const summaries = await prisma.summary.findMany({
      where: {
        AND: [
          { content: { not: '' } },
          { content: { not: null } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        id: true,
        videoTitle: true,
        content: true,
        videoId: true
      }
    });
    
    if (summaries.length === 0) {
      console.log('❌ No summaries found with content');
      return;
    }
    
    summaries.forEach((s, i) => {
      console.log(`\n=== Summary ${i + 1}: ${s.videoTitle} ===`);
      console.log(`ID: ${s.id}`);
      console.log(`VideoID: ${s.videoId}`);
      console.log(`Content length: ${s.content?.length || 0}`);
      
      if (s.content) {
        console.log(`\nFirst 500 chars:`);
        console.log(s.content.substring(0, 500) + '...');
        
        console.log(`\nMarkdown wrapper analysis:`);
        console.log(`Has '📄 MARKDOWN BLOCK': ${s.content.includes('📄 MARKDOWN BLOCK')}`);
        console.log(`Has '\`\`\`markdown': ${s.content.includes('```markdown')}`);
        console.log(`Has '## Video Context': ${s.content.includes('## Video Context')}`);
        console.log(`Has '## TL;DR': ${s.content.includes('## TL;DR')}`);
        console.log(`Has '# MARKDOWN Summary': ${s.content.includes('# MARKDOWN Summary')}`);
        
        // Try to parse sections like the frontend does
        let contentToParse = s.content;
        
        // Apply preprocessing
        const markdownStart = contentToParse.indexOf('```markdown');
        if (markdownStart !== -1) {
          const contentStart = markdownStart + '```markdown'.length;
          const markdownEnd = contentToParse.indexOf('```', contentStart);
          contentToParse = markdownEnd !== -1 
            ? contentToParse.slice(contentStart, markdownEnd)
            : contentToParse.slice(contentStart);
          console.log(`Stripped \`\`\`markdown wrapper`);
        }
        
        const markdownBlockStart = contentToParse.indexOf('📄 MARKDOWN BLOCK');
        if (markdownBlockStart !== -1) {
          contentToParse = contentToParse.slice(markdownBlockStart + '📄 MARKDOWN BLOCK'.length);
          console.log(`Stripped 📄 MARKDOWN BLOCK wrapper`);
        }
        
        // Count sections after preprocessing
        const lines = contentToParse.split("\\n");
        const sections = new Map();
        let currentSection = "";
        let currentContent = [];
        
        for (const line of lines) {
          const headerMatch = line.match(/^#+\\s*(.+)/);
          if (headerMatch) {
            if (currentSection && currentContent.length > 0) {
              sections.set(currentSection.toLowerCase(), currentContent.join("\\n").trim());
            }
            currentSection = headerMatch[1].trim();
            currentContent = [];
          } else if (currentSection) {
            currentContent.push(line);
          }
        }
        
        if (currentSection && currentContent.length > 0) {
          sections.set(currentSection.toLowerCase(), currentContent.join("\\n").trim());
        }
        
        console.log(`\nSections found after preprocessing (${sections.size}):`);
        Array.from(sections.keys()).forEach(key => {
          const content = sections.get(key);
          console.log(`  - "${key}" (${content?.length || 0} chars)`);
        });
        
        console.log(`\nKey sections check:`);
        console.log(`  TL;DR: ${sections.has('tl;dr (≤100 words)') || sections.has('tl;dr')}`);
        console.log(`  Key Moments: ${sections.has('key moments')}`);
        console.log(`  Frameworks: ${sections.has('strategic frameworks') || sections.has('frameworks')}`);
        console.log(`  Playbooks: ${sections.has('playbooks & heuristics') || sections.has('playbooks')}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkActualContent().catch(console.error);