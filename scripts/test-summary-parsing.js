#!/usr/bin/env node

// Test script to verify the markdown parsing fix works
const testContent1 = `📄 MARKDOWN BLOCK

## Video Context
**Title**: Test Video
**Speakers**: Test Speaker

## TL;DR (≤100 words)
This is a test summary.

## Key Moments
- 00:30 Introduction
- 05:00 Main content

## Strategic Frameworks
Framework 1: Test framework
Framework 2: Another framework

## Playbooks & Heuristics
**TRIGGER**: When X happens
**ACTION**: Do Y

## In Practice
- Practical example 1
- Practical example 2`;

const testContent2 = `\`\`\`markdown
## Video Context
**Title**: Another Test Video
**Speakers**: Another Speaker

## TL;DR (≤100 words)
Another test summary.

## Key Moments
- 01:00 Start
- 10:00 End
\`\`\``;

function parseSections(content) {
  const sections = new Map();

  // Apply the same preprocessing logic as in SummaryViewer
  let contentToParse = content;
  
  // Strip ```markdown wrapper
  const markdownStart = contentToParse.indexOf('```markdown');
  if (markdownStart !== -1) {
    const contentStart = markdownStart + '```markdown'.length;
    const markdownEnd = contentToParse.indexOf('```', contentStart);
    contentToParse = markdownEnd !== -1 
      ? contentToParse.slice(contentStart, markdownEnd)
      : contentToParse.slice(contentStart);
  }
  
  // Strip 📄 MARKDOWN BLOCK wrapper  
  const markdownBlockStart = contentToParse.indexOf('📄 MARKDOWN BLOCK');
  if (markdownBlockStart !== -1) {
    contentToParse = contentToParse.slice(markdownBlockStart + '📄 MARKDOWN BLOCK'.length);
  }

  const lines = contentToParse.split("\n");
  let currentSection = "";
  let currentContent = [];

  for (const line of lines) {
    const headerMatch = line.match(/^#+\s*(.+)/);
    if (headerMatch) {
      // Save previous section
      if (currentSection && currentContent.length > 0) {
        sections.set(
          currentSection.toLowerCase(),
          currentContent.join("\n").trim()
        );
      }
      // Start new section
      currentSection = headerMatch[1].trim();
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }

  // Save the last section
  if (currentSection && currentContent.length > 0) {
    sections.set(
      currentSection.toLowerCase(),
      currentContent.join("\n").trim()
    );
  }

  return sections;
}

console.log('🔍 Testing Summary Parsing Fix...\n');

console.log('Test 1: 📄 MARKDOWN BLOCK format');
console.log('=====================================');
const sections1 = parseSections(testContent1);
console.log('Sections found:', Array.from(sections1.keys()));
console.log('\nTL;DR content:', sections1.get('tl;dr (≤100 words)'));
console.log('Key Moments content:', sections1.get('key moments'));
console.log('Frameworks content:', sections1.get('strategic frameworks'));
console.log('Playbooks content:', sections1.get('playbooks & heuristics'));

console.log('\n\nTest 2: ```markdown format');
console.log('=====================================');
const sections2 = parseSections(testContent2);
console.log('Sections found:', Array.from(sections2.keys()));
console.log('\nTL;DR content:', sections2.get('tl;dr (≤100 words)'));
console.log('Key Moments content:', sections2.get('key moments'));

console.log('\n✅ Test complete!');