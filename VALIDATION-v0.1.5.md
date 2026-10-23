# v0.1.5 reliability experiment

This branch improves long-track capacity and prewarm recovery. It does not establish faster cold-start bilingual display or a measured reduction in YouTube errors. No iPhone or live DeepSeek test was available.

126 automated tests passed on 2026-10-23. New tests cover a synthetic four-hour 14,400-cue track, fully bilingual cached replay with zero API calls, missing prewarm callbacks, late callbacks, and continued processing after repeated temporary server failures. Synthetic replies do not measure translation quality, real latency or device memory limits.

Changes: preserve existing key/settings/cache schema; raise cache ceiling from 6,000 entries/4 MiB to 20,000 entries/16 MiB; accept subtitle bodies up to four million JS characters; enlarge pending snapshot ceiling to 16 MiB; enforce prewarm request timeout locally; continue later prewarm batches after exhausted transient retries. Auth/rate limits still stop work. Larger storage needs device validation. No cue-count threshold returns English as a speed optimization.

Install: disable the older translation plugin; add https://raw.githubusercontent.com/lpleasure/youtube-loon-deepseek/fix/reliability-v015/plugins/YouTube-translate.plugin in Loon, update scripts and enable translation. Keep existing local key/cache. Optional prewarm plugin: https://raw.githubusercontent.com/lpleasure/youtube-loon-deepseek/fix/reliability-v015/plugins/YouTube-prewarm.plugin . Capture subtitles, run its Generic task manually, then trigger a fresh subtitle request. Check version=0.1.5 in logs. Repeat prewarm if incomplete. Never run multiple workers simultaneously.

Limits: the response still waits up to 22 seconds and may contain untranslated cues on timeout/failure. First-use full bilingual coverage is not guaranteed. Manual prewarm is a recovery option, not satisfaction of automatic cold-start acceptance. Loon cannot update an already delivered track, force YouTube to request again, infer playback position, or manufacture missing upstream cues. Signed timedtext URLs are not rewritten/refetched: expired signatures, missing tokens or unsupported/rolling formats remain upstream/platform issues.

Loon's current API documentation permits asynchronous HTTP before $done; $done releases execution resources. Thus background translation after response completion cannot be relied on. https://nsloon.app/docs/Script/script_api/
DeepSeek non-thinking and JSON parameters: https://api-docs.deepseek.com/api/create-chat-completion/

For guaranteed continuous cold-start translation of arbitrary long tracks, a persistent translation service and a playback integration that requests segments would be needed; increasing Loon concurrency alone cannot provide that guarantee. This branch must remain experimental pending real-device tests.
