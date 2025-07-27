#!/usr/bin/env python3
"""
Test script for Gumloop integration with summarize API
"""

import sys
import os
import asyncio
import json
from typing import Optional

# Add the api directory to the path
sys.path.append(os.path.dirname(__file__))

from services.gumloop_parser import is_gumloop_summary, parse_gumloop_summary, extract_key_points_from_gumloop

# Sample Gumloop output format based on expected structure
SAMPLE_GUMLOOP_OUTPUT = """## Video Context

**Title**: The Future of AI and Machine Learning

**Speakers**: Dr. Jane Smith, Prof. John Doe

**Duration**: 45:30

**Channel**: TechTalks

**Synopsis**: A comprehensive discussion about the current state and future prospects of artificial intelligence and machine learning technologies.

## 00:00 Rapid TL;DR (≤100 words)

This video explores cutting-edge AI developments, discussing how machine learning models are becoming increasingly sophisticated. The speakers highlight key breakthroughs in natural language processing, computer vision, and reinforcement learning. They address ethical considerations, potential societal impacts, and the importance of responsible AI development. The conversation covers practical applications across industries, from healthcare to finance, and predicts significant advances in AI capabilities over the next decade while emphasizing the need for proper governance and human oversight.

## Key Moments (Timestamp → Insight)

– **03:21** Introduction to transformer architectures revolutionizing NLP
– **07:45** Discussion on GPT models and their capabilities
– **12:30** Ethical considerations in AI deployment
– **18:15** Real-world applications in healthcare diagnostics
– **23:50** Future predictions for AGI development
– **28:40** Importance of AI safety and alignment research
– **35:20** Q&A session addressing common misconceptions
– **42:10** Closing thoughts on responsible AI development

## Key Concepts & Insights

### Transformer Architecture Revolution
The speakers explain how transformer models have fundamentally changed the landscape of natural language processing. These models use self-attention mechanisms to process sequences more efficiently than previous architectures.

### Ethical AI Framework
A significant portion discusses the need for comprehensive ethical frameworks in AI development. This includes bias mitigation, transparency, and accountability measures.

### Healthcare Applications
Several concrete examples demonstrate AI's transformative potential in medical diagnostics, drug discovery, and personalized treatment plans.

## Data, Tools & Resources

**Tools Mentioned:**
• TensorFlow and PyTorch for model development
• Hugging Face Transformers library
• OpenAI API for GPT integration
• Weights & Biases for experiment tracking

**Key Resources:**
• "Attention Is All You Need" paper
• AI Safety research from Anthropic
• Stanford CS224N course materials
• DeepMind's AlphaFold documentation

## Summary & Calls-to-Action

The discussion emphasizes that while AI presents tremendous opportunities, responsible development requires collaboration between technologists, ethicists, and policymakers. Viewers are encouraged to stay informed about AI developments and participate in discussions about its societal impact.

### Insight Enrichment

Each key insight connects to broader themes in AI development, from technical innovations to societal implications. The speakers provide balanced perspectives on both opportunities and challenges.

### Knowledge Cards

The presentation includes visual aids explaining complex concepts like attention mechanisms, making technical content accessible to a broader audience.

### Accelerated-Learning Pack

– **TL;DR-100**: Comprehensive AI discussion covering technical advances, ethical considerations, and future predictions with emphasis on responsible development.

– **Feynman Flashcards** (≤10)
  - Q: What is a transformer architecture? / A: A neural network design using self-attention to process sequences efficiently
  - Q: Why is AI safety important? / A: To ensure AI systems remain beneficial and aligned with human values as they become more powerful
  - Q: What is bias in AI? / A: Systematic errors in AI outputs that unfairly discriminate against certain groups

– **Glossary** (≤15 terms)
  - Transformer: Neural network architecture using attention mechanisms
  - GPT: Generative Pre-trained Transformer
  - AGI: Artificial General Intelligence
  - Alignment: Ensuring AI goals match human values
  - Fine-tuning: Adapting pre-trained models for specific tasks

– **Quick Quiz** (3 Q&A)
  - Q: What makes transformers more efficient than RNNs? / A: Parallel processing through self-attention
  - Q: Name three industries benefiting from AI / A: Healthcare, finance, and education
  - Q: What is the main ethical concern with large language models? / A: Potential for generating biased or harmful content

– **Novel-Idea Meter** (score each insight 1-5)
  - Transformer architecture explanation: 3/5 (well-known but clearly explained)
  - Healthcare AI applications: 4/5 (innovative use cases presented)
  - AI safety considerations: 5/5 (forward-thinking perspectives)
"""

async def test_gumloop_parsing():
    """Test the Gumloop parser with sample content"""
    
    print("🧪 Testing Gumloop Integration")
    print("=" * 50)
    
    # Test 1: Detection
    print("\n1️⃣ Testing Gumloop content detection...")
    is_gumloop = is_gumloop_summary(SAMPLE_GUMLOOP_OUTPUT)
    print(f"   Is Gumloop format: {is_gumloop} {'✅' if is_gumloop else '❌'}")
    
    # Test 2: Parsing
    print("\n2️⃣ Testing Gumloop parsing...")
    parsed_data = parse_gumloop_summary(SAMPLE_GUMLOOP_OUTPUT)
    
    if parsed_data:
        print("   ✅ Successfully parsed Gumloop content")
        print(f"   📌 Title: {parsed_data.title}")
        print(f"   👥 Speakers: {', '.join(parsed_data.speakers)}")
        print(f"   ⏱️  Duration: {parsed_data.duration}")
        print(f"   📺 Channel: {parsed_data.channel}")
        print(f"   📝 Synopsis: {parsed_data.synopsis[:100]}...")
        print(f"   💡 TL;DR: {parsed_data.tldr[:100]}...")
        print(f"   🎯 Key Moments: {len(parsed_data.key_moments)} found")
        if parsed_data.key_moments:
            print(f"      First moment: {parsed_data.key_moments[0].timestamp} - {parsed_data.key_moments[0].insight[:50]}...")
        print(f"   🛠️  Tools: {len(parsed_data.tools)} found")
        if parsed_data.tools:
            print(f"      Examples: {', '.join(parsed_data.tools[:2])}")
        print(f"   📚 Resources: {len(parsed_data.resources)} found")
        print(f"   🃏 Flashcards: {len(parsed_data.flashcards)} found")
        print(f"   📖 Glossary: {len(parsed_data.glossary)} terms")
        print(f"   ❓ Quiz Questions: {len(parsed_data.quiz_questions)} found")
    else:
        print("   ❌ Failed to parse Gumloop content")
    
    # Test 3: Key Points Extraction
    print("\n3️⃣ Testing key points extraction...")
    if parsed_data:
        key_points = extract_key_points_from_gumloop(parsed_data)
        print(f"   📍 Extracted {len(key_points)} key points:")
        for i, point in enumerate(key_points, 1):
            print(f"      {i}. {point[:80]}...")
    
    # Test 4: Test with non-Gumloop content
    print("\n4️⃣ Testing with non-Gumloop content...")
    regular_transcript = "This is just a regular transcript without any special formatting."
    is_regular_gumloop = is_gumloop_summary(regular_transcript)
    print(f"   Regular transcript detected as Gumloop: {is_regular_gumloop} {'❌' if not is_regular_gumloop else '✅ (ERROR!)'}")
    
    print("\n✅ All tests completed!")
    
    # Return parsed data for further testing
    return parsed_data

async def test_api_integration():
    """Test the full API integration"""
    print("\n\n🔗 Testing API Integration")
    print("=" * 50)
    
    try:
        # Import the summarize router components
        from routers.summarize import is_gumloop_summary, parse_gumloop_summary, extract_key_points_from_gumloop
        
        print("✅ Successfully imported summarize router components")
        
        # Simulate the API flow
        print("\n🔄 Simulating API flow with Gumloop content...")
        
        # This would be returned by youtube_service.get_transcript()
        transcript = SAMPLE_GUMLOOP_OUTPUT
        is_gumloop = True  # Flag from youtube_service
        
        if is_gumloop or is_gumloop_summary(transcript):
            print("   ✅ Detected as Gumloop content")
            gumloop_data = parse_gumloop_summary(transcript)
            
            if gumloop_data:
                print("   ✅ Successfully parsed for API response")
                summary_content = gumloop_data.full_content
                key_points = extract_key_points_from_gumloop(gumloop_data)
                
                print(f"   📄 Summary content length: {len(summary_content)} chars")
                print(f"   📍 Key points: {len(key_points)} extracted")
                
                # Simulate API response structure
                api_response = {
                    "video_id": "test123",
                    "video_url": "https://youtube.com/watch?v=test123",
                    "video_title": gumloop_data.title,
                    "channel_name": gumloop_data.channel,
                    "duration": 2730,  # Would be parsed from duration string
                    "summary": summary_content,
                    "key_points": key_points
                }
                
                print("\n   📦 Simulated API Response:")
                print(f"      Title: {api_response['video_title']}")
                print(f"      Channel: {api_response['channel_name']}")
                print(f"      Key Points: {len(api_response['key_points'])}")
                
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("   Note: Run this script from the api directory")

if __name__ == "__main__":
    print("🚀 Starting Gumloop Integration Tests\n")
    
    # Run parsing tests
    parsed_data = asyncio.run(test_gumloop_parsing())
    
    # Run API integration tests
    asyncio.run(test_api_integration())
    
    print("\n\n✨ Testing complete!")