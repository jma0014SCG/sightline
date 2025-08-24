# AI & External Services Setup Guide

## Overview
Configuration guide for AI services and external APIs required for Sightline.ai production.

## Service Architecture

### Transcript Extraction Pipeline (Fallback Chain)
```
1. YouTube API (official, fastest)
   ↓ (on failure)
2. YT-DLP (open source, reliable) 
   ↓ (on failure)
3. Oxylabs (proxy service, robust)
   ↓ (on failure)
4. Gumloop (AI-enhanced, rich content)
```

### AI Processing Pipeline
```
Transcript → OpenAI GPT-4 → Summary + Smart Collections
                          ↓
                    Rich Content Fields
                    (Key Moments, Frameworks, etc.)
```

---

## OpenAI Setup (Required)

### Step 1: Create OpenAI Account
1. Sign up at [platform.openai.com](https://platform.openai.com)
2. Add payment method (required for API access)
3. Set up billing alerts

### Step 2: Generate API Key
1. Navigate to **API Keys**
2. Click **Create new secret key**
3. Name it: "Sightline Production"
4. Copy the key (format: `sk-...`)
5. Save as `OPENAI_API_KEY`

### Step 3: Configure Usage Limits
1. Go to **Settings** > **Limits**
2. Set monthly budget: $500 (adjust based on usage)
3. Set rate limits:
   - Requests per minute: 3000
   - Tokens per minute: 90000

### Step 4: Monitor Usage
- Check **Usage** tab regularly
- Set up usage alerts at 50%, 80%, 90%
- Review cost per summary (typically $0.02-0.05)

### Models Used
- **GPT-4**: Main summarization (high quality)
- **GPT-3.5-Turbo**: Fallback for rate limits
- **text-embedding-ada-002**: Smart Collections classification

---

## YouTube Data API Setup (Required)

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project: "Sightline Production"
3. Enable billing (required for API)

### Step 2: Enable YouTube Data API
1. Navigate to **APIs & Services** > **Library**
2. Search for "YouTube Data API v3"
3. Click **Enable**

### Step 3: Create API Key
1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **API Key**
3. Copy the key
4. Save as `YOUTUBE_API_KEY`

### Step 4: Restrict API Key
1. Click on your API key
2. Under **Application restrictions**:
   - Select "HTTP referrers"
   - Add: `https://YOUR_DOMAIN.com/*`
3. Under **API restrictions**:
   - Select "Restrict key"
   - Choose "YouTube Data API v3"

### Step 5: Set Quotas
- Default quota: 10,000 units/day
- Each video metadata fetch: ~3 units
- Monitor in **APIs & Services** > **Dashboard**

---

## Gumloop Setup (Recommended)

### Step 1: Create Account
1. Sign up at [gumloop.com](https://gumloop.com)
2. Choose appropriate plan for your volume

### Step 2: Generate API Key
1. Navigate to **Settings** > **API**
2. Generate new API key
3. Copy the key
4. Save as `GUMLOOP_API_KEY`

### Features Provided
- Enhanced transcript extraction
- Rich content extraction:
  - Key moments with timestamps
  - Frameworks and methodologies
  - Actionable playbooks
  - Learning materials
- Fallback when other services fail

### Rate Limits
- Check your plan for limits
- Typical: 1000 requests/day
- Each summary: 1 request

---

## Oxylabs Setup (Optional but Recommended)

### Step 1: Create Account
1. Sign up at [oxylabs.io](https://oxylabs.io)
2. Choose "Scraper API" product
3. Select appropriate plan

### Step 2: Get Credentials
1. Navigate to **Dashboard**
2. Find your credentials:
   - Username: `YOUR_USERNAME`
   - Password: `YOUR_PASSWORD`
3. Save as:
   - `OXYLABS_USERNAME`
   - `OXYLABS_PASSWORD`

### Features
- Proxy rotation for reliable access
- Handles rate limiting automatically
- Geographic distribution
- 99.9% uptime SLA

### Configuration
- Endpoint: Configured in code
- Timeout: 30 seconds
- Retries: 3 attempts
- Cost: ~$0.001 per request

---

## Service Configuration Summary

### Required Services
```env
# OpenAI - AI Processing
OPENAI_API_KEY=sk-...

# YouTube - Video Metadata
YOUTUBE_API_KEY=AIza...
```

### Recommended Services
```env
# Gumloop - Enhanced Transcripts
GUMLOOP_API_KEY=gum_...

# Oxylabs - Proxy Service
OXYLABS_USERNAME=your_username
OXYLABS_PASSWORD=your_password
```

---

## Cost Estimation

### Per Summary Costs
| Service | Cost per Summary | Notes |
|---------|-----------------|-------|
| OpenAI | $0.02-0.05 | Varies by video length |
| YouTube API | Free | Within quota limits |
| Gumloop | $0.01 | Based on plan |
| Oxylabs | $0.001 | Only when used |
| **Total** | **$0.03-0.06** | Average cost |

### Monthly Estimates
- 1,000 summaries: $30-60
- 5,000 summaries: $150-300
- 10,000 summaries: $300-600

---

## Monitoring and Alerts

### OpenAI Monitoring
1. Set up usage alerts in OpenAI dashboard
2. Monitor token usage per request
3. Track cost per user segment
4. Review model performance metrics

### YouTube API Monitoring
1. Check daily quota usage
2. Monitor error rates
3. Set up alerts for quota exhaustion

### Service Health Checks
```python
# api/health_check.py
async def check_services():
    return {
        "openai": check_openai_api(),
        "youtube": check_youtube_api(),
        "gumloop": check_gumloop_api(),
        "oxylabs": check_oxylabs_api()
    }
```

---

## Fallback Strategy

### Service Priority
1. **YouTube API**: Official, fastest, free
2. **YT-DLP**: Open source, no API needed
3. **Oxylabs**: Paid proxy, very reliable
4. **Gumloop**: AI-enhanced, best quality

### Error Handling
```python
try:
    # Try YouTube API first
    transcript = await youtube_service.get_transcript()
except:
    try:
        # Fallback to YT-DLP
        transcript = await ytdlp_service.get_transcript()
    except:
        try:
            # Fallback to Oxylabs
            transcript = await oxylabs_service.get_transcript()
        except:
            # Final fallback to Gumloop
            transcript = await gumloop_service.get_transcript()
```

---

## Security Best Practices

### API Key Management
1. **Never commit keys** to version control
2. **Use environment variables** exclusively
3. **Rotate keys** every 90 days
4. **Restrict key scope** where possible
5. **Monitor for leaks** using GitHub secret scanning

### Rate Limiting
1. Implement client-side rate limiting
2. Use exponential backoff for retries
3. Cache responses where appropriate
4. Queue requests during peak times

### Data Privacy
1. Don't store raw API responses unnecessarily
2. Anonymize user data in logs
3. Comply with service ToS
4. Implement data retention policies

---

## Troubleshooting

### OpenAI Issues
| Problem | Solution |
|---------|----------|
| Rate limit exceeded | Implement backoff, use GPT-3.5 fallback |
| High costs | Optimize prompts, reduce token usage |
| Timeout errors | Increase timeout, retry with smaller chunks |

### YouTube API Issues
| Problem | Solution |
|---------|----------|
| Quota exceeded | Wait for reset, use fallback services |
| Video not found | Check video availability, handle private videos |
| API key invalid | Verify key restrictions, regenerate if needed |

### Transcript Service Issues
| Problem | Solution |
|---------|----------|
| No captions available | Use audio transcription fallback |
| Service timeout | Increase timeout, try next service |
| Authentication failed | Verify credentials, check service status |

---

## Performance Optimization

### Caching Strategy
1. Cache video metadata (24 hours)
2. Cache transcripts (indefinite)
3. Cache summaries (indefinite)
4. Use Redis for hot data

### Parallel Processing
1. Fetch metadata while extracting transcript
2. Process chunks in parallel where possible
3. Use async/await throughout

### Cost Optimization
1. Use GPT-3.5 for simple videos
2. Implement smart prompt engineering
3. Cache aggressively
4. Monitor and optimize token usage

---

## Compliance and Legal

### Service Terms
- Review and comply with each service's ToS
- Respect rate limits and quotas
- Don't share API keys
- Follow data retention policies

### User Privacy
- Inform users about third-party services
- Include in privacy policy
- Allow opt-out where possible
- Handle data deletion requests

---

## Support Contacts

| Service | Support URL | Documentation |
|---------|------------|---------------|
| OpenAI | support.openai.com | platform.openai.com/docs |
| YouTube API | cloud.google.com/support | developers.google.com/youtube |
| Gumloop | support@gumloop.com | docs.gumloop.com |
| Oxylabs | support@oxylabs.io | oxylabs.io/docs |