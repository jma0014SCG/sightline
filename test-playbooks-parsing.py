#!/usr/bin/env python3
import re

playbooksText = """- **If** you can't see a control panel → View ▶ User Interface→toggle Project Browser/Properties.  
- **When** placing doors → Tab through wall layers before clicking for precision control."""

lines = playbooksText.split('\n')

print("Testing playbooks parsing:")
for line in lines:
    trimmed = line.strip()
    print(f"\nLine: {trimmed}")
    
    if trimmed.startswith('-') or trimmed.startswith('•'):
        content = re.sub(r'^[-•]\s*', '', trimmed)
        print(f"After removing bullet: {content}")
        
        # Remove bold formatting
        content = re.sub(r'\*\*([^*]+)\*\*/g', r'\1', content)
        print(f"After removing bold: {content}")
        
        # Test different arrow patterns
        patterns = [
            r'^(.+?)\s*[→→-]>\s*(.+)$',
            r'^(.+?)\s*→\s*(.+)$',
            r'^(.+?)\s*->\s*(.+)$',
        ]
        
        for pattern in patterns:
            match = re.match(pattern, content)
            if match:
                print(f"Matched with pattern {pattern}")
                print(f"  Trigger: {match.group(1)}")
                print(f"  Action: {match.group(2)}")
                break