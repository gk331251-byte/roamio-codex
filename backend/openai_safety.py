# openai_safety.py - Comprehensive OpenAI Integration with Safety Measures

import os
import json
import time
import asyncio
import re
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, asdict
import logging

logger = logging.getLogger(__name__)


@dataclass
class OpenAIUsageStats:
    """Track OpenAI API usage statistics"""

    requests_today: int = 0
    tokens_used_today: int = 0
    failures_today: int = 0
    last_reset: str = ""
    circuit_breaker_failures: int = 0
    circuit_breaker_reset_time: Optional[str] = None


@dataclass
class ContentFilterResult:
    """Result of content filtering"""

    is_safe: bool
    filtered_content: str
    issues_found: List[str]


class OpenAICircuitBreaker:
    """Circuit breaker pattern for OpenAI API calls"""

    def __init__(self, failure_threshold: int = 5, reset_timeout: int = 300):
        self.failure_threshold = failure_threshold
        self.reset_timeout = reset_timeout  # 5 minutes
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN

    def can_execute(self) -> bool:
        """Check if request can be executed"""
        if self.state == "CLOSED":
            return True

        if self.state == "OPEN":
            if (
                self.last_failure_time
                and time.time() - self.last_failure_time >= self.reset_timeout
            ):
                self.state = "HALF_OPEN"
                return True
            return False

        if self.state == "HALF_OPEN":
            return True

        return False

    def record_success(self):
        """Record successful execution"""
        self.failure_count = 0
        self.state = "CLOSED"
        self.last_failure_time = None

    def record_failure(self):
        """Record failed execution"""
        self.failure_count += 1
        self.last_failure_time = time.time()

        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"
            logger.warning(
                f"OpenAI Circuit breaker OPENED after {self.failure_count} failures"
            )


class OpenAIRateLimiter:
    """Rate limiter for OpenAI API calls"""

    def __init__(self, requests_per_minute: int = 20, tokens_per_minute: int = 40000):
        self.requests_per_minute = requests_per_minute
        self.tokens_per_minute = tokens_per_minute
        self.request_times = []
        self.token_usage = []

    def can_make_request(self, estimated_tokens: int = 500) -> bool:
        """Check if request can be made within rate limits"""
        now = time.time()
        minute_ago = now - 60

        # Clean old entries
        self.request_times = [t for t in self.request_times if t > minute_ago]
        self.token_usage = [
            (t, tokens) for t, tokens in self.token_usage if t > minute_ago
        ]

        # Check request rate limit
        if len(self.request_times) >= self.requests_per_minute:
            return False

        # Check token rate limit
        current_tokens = sum(tokens for _, tokens in self.token_usage)
        if current_tokens + estimated_tokens > self.tokens_per_minute:
            return False

        return True

    def record_request(self, tokens_used: int):
        """Record a request"""
        now = time.time()
        self.request_times.append(now)
        self.token_usage.append((now, tokens_used))


class ContentFilter:
    """Filter content for family-friendly output"""

    # Inappropriate content patterns
    INAPPROPRIATE_PATTERNS = [
        r"\b(?:damn|hell|crap|shit|fuck|ass|bitch|bastard)\b",
        r"\b(?:sex|sexual|nude|naked|porn|xxx)\b",
        r"\b(?:drug|cocaine|heroin|weed|marijuana|alcohol|beer|wine|whiskey|vodka)\b",
        r"\b(?:kill|murder|death|suicide|violence|weapon|gun|knife|bomb)\b",
        r"\b(?:hate|racist|discrimination)\b",
    ]

    # Replacement words for cleaned content
    REPLACEMENTS = {
        "damn": "darn",
        "hell": "heck",
        "crap": "nonsense",
        "ass": "butt",
        "drug": "medicine",
        "alcohol": "drink",
        "beer": "soda",
        "wine": "juice",
        "kill": "defeat",
        "murder": "defeat",
        "death": "end",
        "weapon": "tool",
        "gun": "water gun",
        "hate": "dislike",
    }

    def filter_content(self, content: str) -> ContentFilterResult:
        """Filter content and return safe version"""
        issues_found = []
        filtered_content = content

        for pattern in self.INAPPROPRIATE_PATTERNS:
            matches = re.findall(pattern, content, re.IGNORECASE)
            if matches:
                issues_found.extend(matches)

                # Apply replacements
                for match in matches:
                    replacement = self.REPLACEMENTS.get(match.lower(), "***")
                    filtered_content = re.sub(
                        r"\b" + re.escape(match) + r"\b",
                        replacement,
                        filtered_content,
                        flags=re.IGNORECASE,
                    )

        # Additional safety checks
        if len(content) > 2000:  # Suspiciously long content
            issues_found.append("content_too_long")
            filtered_content = filtered_content[:1500] + "..."

        is_safe = len(issues_found) == 0 or all(
            issue in ["content_too_long"] for issue in issues_found
        )

        return ContentFilterResult(is_safe, filtered_content, issues_found)


class OpenAISafetyManager:
    """Comprehensive OpenAI safety management"""

    def __init__(self, usage_file: str = "/tmp/openai_usage.json"):
        self.usage_file = usage_file
        self.circuit_breaker = OpenAICircuitBreaker()
        self.rate_limiter = OpenAIRateLimiter()
        self.content_filter = ContentFilter()
        self.daily_request_limit = 100  # Max requests per day
        self.daily_token_limit = 100000  # Max tokens per day

        # Load existing usage stats
        self.usage_stats = self._load_usage_stats()

    def _load_usage_stats(self) -> OpenAIUsageStats:
        """Load usage statistics from file"""
        try:
            if os.path.exists(self.usage_file):
                with open(self.usage_file, "r") as f:
                    data = json.load(f)
                    stats = OpenAIUsageStats(**data)

                    # Reset daily counters if it's a new day
                    if stats.last_reset != datetime.now().strftime("%Y-%m-%d"):
                        stats.requests_today = 0
                        stats.tokens_used_today = 0
                        stats.failures_today = 0
                        stats.last_reset = datetime.now().strftime("%Y-%m-%d")
                        self._save_usage_stats(stats)

                    return stats
        except Exception as e:
            logger.error(f"Error loading usage stats: {e}")

        return OpenAIUsageStats(last_reset=datetime.now().strftime("%Y-%m-%d"))

    def _save_usage_stats(self, stats: OpenAIUsageStats):
        """Save usage statistics to file"""
        try:
            with open(self.usage_file, "w") as f:
                json.dump(asdict(stats), f)
        except Exception as e:
            logger.error(f"Error saving usage stats: {e}")

    def can_make_request(self) -> tuple[bool, str]:
        """Check if OpenAI request can be made"""
        # Check circuit breaker
        if not self.circuit_breaker.can_execute():
            return False, "Circuit breaker is OPEN - OpenAI temporarily disabled"

        # Check daily limits
        if self.usage_stats.requests_today >= self.daily_request_limit:
            return False, f"Daily request limit exceeded ({self.daily_request_limit})"

        if self.usage_stats.tokens_used_today >= self.daily_token_limit:
            return False, f"Daily token limit exceeded ({self.daily_token_limit})"

        # Check rate limits (use lower token estimate for shorter prompts)
        if not self.rate_limiter.can_make_request(estimated_tokens=200):
            return False, "Rate limit exceeded - too many requests per minute"

        return True, "OK"

    async def generate_quest_narrative(
        self, place_names: List[str], moods: List[str], request_id: str
    ) -> tuple[str, str]:  # Returns (quest_text, generation_method)
        """Generate quest narrative with safety measures"""

        # Check if we can make the request
        can_proceed, reason = self.can_make_request()
        if not can_proceed:
            logger.warning(f"[{request_id}] OpenAI request blocked: {reason}")
            return self._get_fallback_text(place_names, moods), "template_safety_block"

        try:
            # Import OpenAI and handle both old and new API versions
            import openai

            # Create safe prompt
            safe_moods = [self._sanitize_input(mood) for mood in moods]
            safe_places = [
                self._sanitize_input(place) for place in place_names[:5]
            ]  # Limit places

            prompt = self._create_safe_prompt(safe_places, safe_moods)

            logger.info(
                f"[{request_id}] Generating quest narrative with OpenAI (safe mode)"
            )

            # Set API key
            openai.api_key = os.getenv("OPENAI_API_KEY")
            if not openai.api_key:
                raise ValueError("OpenAI API key not configured")

            # Check OpenAI version and use appropriate API
            try:
                # Try new API format (v1.x)
                from openai import OpenAI

                client = OpenAI(api_key=openai.api_key, timeout=15.0)
                completion = await asyncio.to_thread(
                    client.chat.completions.create,
                    model="gpt-4",
                    messages=[
                        {
                            "role": "system",
                            "content": "Write brief, family-friendly quest stories.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    max_tokens=150,  # Reduced for shorter responses
                    temperature=0.9,  # Higher for more variety and freshness
                    timeout=15,
                )
                raw_content = completion.choices[0].message.content.strip()
                tokens_used = completion.usage.total_tokens if completion.usage else 400

            except ImportError:
                # Fall back to old API format (v0.x)
                logger.info(f"[{request_id}] Using legacy OpenAI API format")
                completion = await asyncio.to_thread(
                    openai.ChatCompletion.create,
                    model="gpt-4",
                    messages=[
                        {
                            "role": "system",
                            "content": "Write brief, family-friendly quest stories.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    max_tokens=150,  # Reduced for shorter responses
                    temperature=0.9,  # Higher for more variety and freshness
                    request_timeout=15,
                )
                raw_content = completion.choices[0].message.content.strip()
                tokens_used = completion.usage.total_tokens if completion.usage else 400

            # Filter content for safety
            filter_result = self.content_filter.filter_content(raw_content)

            if not filter_result.is_safe:
                logger.warning(
                    f"[{request_id}] Content filter flagged issues: {filter_result.issues_found}"
                )
                self._record_content_filter_issue(filter_result.issues_found)

                # Use filtered content if issues are minor, fallback if serious
                if any(
                    issue in ["violence", "inappropriate", "hate"]
                    for issue in filter_result.issues_found
                ):
                    return (
                        self._get_fallback_text(place_names, moods),
                        "template_content_filtered",
                    )

            # Record successful request
            self.usage_stats.requests_today += 1
            self.usage_stats.tokens_used_today += tokens_used
            self.rate_limiter.record_request(tokens_used)
            self.circuit_breaker.record_success()
            self._save_usage_stats(self.usage_stats)

            logger.info(
                f"[{request_id}] Successfully generated safe quest narrative ({tokens_used} tokens)"
            )
            return filter_result.filtered_content, "gpt_safe"

        except asyncio.TimeoutError:
            logger.error(f"[{request_id}] OpenAI request timeout")
            self._record_failure()
            return self._get_fallback_text(place_names, moods), "template_timeout"

        except Exception as e:
            logger.error(f"[{request_id}] OpenAI error: {str(e)}")
            self._record_failure()
            return self._get_fallback_text(place_names, moods), "template_error"

    def _create_safe_prompt(self, places: List[str], moods: List[str]) -> str:
        """Create a safe, family-friendly prompt (2 sentences max)"""
        mood_str = ", ".join(moods) if moods else "adventurous"
        places_str = ", ".join(places[:3])  # Limit to 3 places for brevity

        # Add timestamp to prevent caching and ensure fresh responses
        timestamp = datetime.now().strftime("%H:%M")
        return f"Write a {mood_str} quest story visiting {places_str} at {timestamp}. Keep it under 150 words and family-friendly."

    def _sanitize_input(self, text: str) -> str:
        """Sanitize input text"""
        if not text:
            return ""
        # Remove potentially problematic characters
        sanitized = re.sub(r'[<>"\'\\/]', "", text)
        # Limit length
        return sanitized[:100].strip()

    def _record_failure(self):
        """Record a failure"""
        self.usage_stats.failures_today += 1
        self.circuit_breaker.record_failure()
        self._save_usage_stats(self.usage_stats)

    def _record_content_filter_issue(self, issues: List[str]):
        """Log content filter issues for monitoring"""
        logger.warning(f"Content filter issues detected: {issues}")
        # You could send this to monitoring system

    def _get_fallback_text(self, place_names: List[str], moods: List[str]) -> str:
        """Generate fallback text when OpenAI is unavailable"""
        if not place_names:
            return "Embark on an exciting local adventure and discover hidden gems in your area!"

        mood_descriptions = {
            "adventurous": "thrilling",
            "chill": "relaxing",
            "romantic": "enchanting",
            "mystery": "intriguing",
            "cozy": "delightful",
            "historic": "fascinating",
            "spiritual": "peaceful",
            "creative": "inspiring",
            "outdoorsy": "refreshing",
            "quirky": "unique",
            "weird": "unusual",
            "foodie": "delicious",
            "cultural": "enriching",
            "nature": "beautiful",
        }

        primary_mood = moods[0] if moods else "adventurous"
        mood_adj = mood_descriptions.get(primary_mood.lower(), "exciting")

        if len(place_names) == 1:
            return f"Discover the {mood_adj} secrets of {place_names[0]}! This location offers a perfect opportunity for exploration and learning. Take your time to appreciate its unique character and maybe uncover something you never knew existed right in your neighborhood."

        start_place = place_names[0]
        end_place = place_names[-1]

        templates = [
            f"Your {mood_adj} journey begins at {start_place}, where adventure awaits! Follow the path that leads you through the local highlights and conclude your quest at {end_place}. Each stop offers its own unique story and character.",
            f"Set out on a {mood_adj} exploration starting from {start_place}! This carefully crafted route will take you through some wonderful local spots, ending at the memorable {end_place}. Enjoy discovering what makes each place special.",
            f"Begin your {mood_adj} adventure at {start_place} and let curiosity be your guide! This journey connects meaningful locations in your area, culminating at {end_place} where you can reflect on all you've discovered.",
        ]

        import random

        return random.choice(templates)

    def get_usage_stats(self) -> Dict[str, Any]:
        """Get current usage statistics"""
        return {
            "requests_today": self.usage_stats.requests_today,
            "tokens_used_today": self.usage_stats.tokens_used_today,
            "failures_today": self.usage_stats.failures_today,
            "daily_request_limit": self.daily_request_limit,
            "daily_token_limit": self.daily_token_limit,
            "circuit_breaker_state": self.circuit_breaker.state,
            "circuit_breaker_failures": self.circuit_breaker.failure_count,
            "last_reset": self.usage_stats.last_reset,
        }


# Global instance
openai_safety_manager = OpenAISafetyManager()
