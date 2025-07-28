#!/usr/bin/env python3
import re

# Test the parsing logic
content = open('/Users/jeffaxelrod/Documents/Sightline/test-gumloop-output.md').read()

# Extract markdown content
markdownContent = content
markdownStart = content.find('```markdown')
if markdownStart != -1:
    start = markdownStart + len('```markdown')
    markdownEnd = content.find('```', start)
    if markdownEnd != -1:
        markdownContent = content[start:markdownEnd]

# Find all headers
sectionRegex = r'^#{2,3}\s+(.+)$'
matches = list(re.finditer(sectionRegex, markdownContent, re.MULTILINE))

print("Found headers:")
for match in matches:
    print(f"  - {match.group(1)} at position {match.start()}")

# Test extracting specific sections
sections = {}
for i in range(len(matches)):
    match = matches[i]
    sectionName = match.group(1).strip().lower()
    startIndex = match.end()
    
    # Find end
    endIndex = len(markdownContent)
    
    # Check for --- delimiter
    delimiterIndex = markdownContent.find('\n---', startIndex)
    if delimiterIndex != -1 and delimiterIndex < endIndex:
        endIndex = delimiterIndex
    
    # Check for next header
    if i + 1 < len(matches):
        nextHeaderIndex = matches[i + 1].start()
        if nextHeaderIndex < endIndex:
            endIndex = nextHeaderIndex
    
    sectionContent = markdownContent[startIndex:endIndex].strip()
    sections[sectionName] = sectionContent

print("\nExtracted sections:")
for name, content in sections.items():
    print(f"\n[{name}]")
    print(content[:100] + "..." if len(content) > 100 else content)
    
print("\n\nChecking specific sections:")
print(f"Playbooks & Heuristics: {'playbooks & heuristics' in sections}")
print(f"Feynman Flashcards: {'feynman flashcards' in sections}")

if 'playbooks & heuristics' in sections:
    print("\nPlaybooks content:")
    print(sections['playbooks & heuristics'])
    
if 'feynman flashcards' in sections:
    print("\nFlashcards content:")
    print(sections['feynman flashcards'])