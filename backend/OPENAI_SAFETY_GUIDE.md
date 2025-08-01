# OpenAI Safety Integration Guide

## Overview

The Roamio backend now includes a comprehensive OpenAI safety system that ensures reliable, family-friendly quest generation with robust fallback mechanisms. The system is designed to never break quest generation completely, even when OpenAI services are unavailable.

## Key Safety Features

### 1. Circuit Breaker Pattern
- **Failure Threshold**: Opens after 5 consecutive failures
- **Reset Timeout**: 5 minutes before attempting to close
- **States**: CLOSED (normal), OPEN (blocked), HALF_OPEN (testing)
- **Behavior**: Automatically switches to template fallback when open

### 2. Rate Limiting
- **Request Limits**: 20 requests per minute, 100 requests per day
- **Token Limits**: 40,000 tokens per minute, 100,000 tokens per day
- **Automatic Blocking**: Prevents quota exhaustion and API abuse

### 3. Content Filtering
- **Family-Friendly**: Filters inappropriate language, violence, adult content
- **Auto-Replacement**: Replaces problematic words with safe alternatives
- **Length Limits**: Truncates excessively long content
- **Safety Categories**: Violence, profanity, adult themes, hate speech

### 4. Usage Monitoring
- **Daily Tracking**: Requests, tokens, failures tracked per day
- **Statistics API**: `/openai-status` endpoint for monitoring
- **Automatic Reset**: Counters reset daily at midnight

### 5. Robust Fallback System
- **Template Generation**: High-quality fallback templates based on location and mood
- **Never Fails**: Quest generation always succeeds with meaningful content
- **Adaptive Content**: Templates adapt to location type (urban/suburban/rural)

## API Integration

### Quest Generation
The system integrates seamlessly with existing quest generation:

```python
# Automatic safety integration
quest_text, generation_method = await openai_safety_manager.generate_quest_narrative(
    place_names, moods, request_id
)
```

### Generation Methods
- `gpt_safe`: Successfully generated with OpenAI and passed content filtering
- `template_safety_block`: Blocked by safety checks (rate limits, circuit breaker)
- `template_content_filtered`: Content filtered due to inappropriate material
- `template_timeout`: OpenAI request timeout
- `template_error`: OpenAI API error or failure

### Monitoring Endpoint
Check system status via `/openai-status`:

```json
{
  "status": "operational",
  "usage_stats": {
    "requests_today": 5,
    "tokens_used_today": 2000,
    "failures_today": 0,
    "daily_request_limit": 100,
    "daily_token_limit": 100000,
    "circuit_breaker_state": "CLOSED",
    "circuit_breaker_failures": 0,
    "last_reset": "2025-08-01"
  },
  "timestamp": "2025-08-01T18:00:00.000000"
}
```

## Configuration

### Environment Variables
- `OPENAI_API_KEY`: Required for OpenAI integration
- Missing key automatically enables template-only mode

### Adjustable Limits
Current limits in `openai_safety.py`:
- Daily request limit: 100
- Daily token limit: 100,000
- Circuit breaker threshold: 5 failures
- Reset timeout: 300 seconds (5 minutes)
- Rate limits: 20 req/min, 40k tokens/min

## Content Safety

### Filtered Content Categories
1. **Profanity**: damn, hell, shit, etc. → darn, heck, nonsense
2. **Violence**: kill, murder, weapon → defeat, defeat, tool
3. **Adult Content**: sex, nude, porn → (blocked entirely)
4. **Substances**: drug, alcohol, beer → medicine, drink, soda
5. **Hate Speech**: hate, racist → dislike, (blocked entirely)

### Safety Prompts
All OpenAI requests include system-level safety instructions:
> "You are a family-friendly quest writer. Create fun, safe adventures suitable for all ages. Avoid any inappropriate content, violence, or adult themes."

## Fallback Templates

The system includes sophisticated template generation that adapts to:

### Location Types
- **Urban**: Focuses on cultural attractions, restaurants, museums
- **Suburban**: Emphasizes parks, local businesses, community spaces  
- **Rural**: Highlights nature, scenic views, outdoor activities

### Mood Adaptations
Templates automatically adapt tone based on selected moods:
- **Adventurous**: "thrilling journey", "exciting exploration"
- **Cozy**: "delightful discovery", "peaceful wandering"
- **Romantic**: "enchanting adventure", "intimate exploration"

### Dynamic Content
Templates include:
- Place-specific narratives
- Mood-appropriate language
- Encouragement and positive messaging
- Educational elements about local areas

## Error Handling

### Graceful Degradation
1. **OpenAI Unavailable**: Seamlessly switches to templates
2. **Content Filtered**: Uses cleaned version or fallback
3. **Rate Limited**: Blocks request with clear messaging
4. **Circuit Open**: Immediate fallback without delay

### Never-Fail Guarantee
The system is designed so that quest generation **never completely fails**:
- Always returns meaningful quest text
- Maintains consistent response format
- Provides user-friendly explanations via generation method

## Production Monitoring

### Health Checks
- Circuit breaker state monitoring
- Daily usage tracking
- Failure rate analysis
- Content filtering statistics

### Alerts and Thresholds
Monitor these metrics:
- Circuit breaker state changes
- Daily limit approaching (80% threshold)
- Unusual failure patterns
- Content filtering frequency

### Logs
All safety actions are logged with request IDs for debugging:
```
[req-123] OpenAI request blocked: Circuit breaker is OPEN
[req-124] Content filter flagged issues: ['violence', 'profanity']
[req-125] Successfully generated safe quest narrative (450 tokens)
```

## Security Considerations

### API Key Protection
- OpenAI API key stored in environment variables
- Never logged or exposed in responses
- Automatic fallback when missing

### Input Sanitization
- All user inputs sanitized before OpenAI requests
- Length limits prevent abuse
- Special character filtering

### Rate Limiting Benefits
- Prevents API quota exhaustion
- Protects against abuse and spam
- Controls operational costs
- Ensures service availability

## Troubleshooting

### Common Issues

**Circuit Breaker Stuck Open**
- Check OpenAI API key configuration
- Verify API quota and billing
- Review error logs for patterns
- Reset manually if needed (restart service)

**High Failure Rate**
- Check OpenAI service status
- Verify API key permissions
- Review request patterns
- Adjust timeout settings if needed

**Content Frequently Filtered**
- Review mood combinations
- Check place name inputs
- Monitor for unusual patterns
- Adjust filtering rules if appropriate

**Template Fallback Only**
- Verify OpenAI API key is set
- Check daily usage limits
- Confirm circuit breaker state
- Test API connectivity

## Future Enhancements

### Planned Improvements
1. **Machine Learning Content Filter**: More sophisticated content detection
2. **Dynamic Rate Limiting**: Adjust limits based on usage patterns
3. **A/B Testing**: Compare OpenAI vs template quality
4. **Advanced Templates**: More sophisticated fallback generation
5. **Regional Customization**: Locale-specific content filtering
6. **Sentiment Analysis**: Ensure positive, encouraging tone

This safety system ensures that Roamio's quest generation remains reliable, appropriate, and cost-effective while providing the best possible user experience.