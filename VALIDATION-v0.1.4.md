# 0.1.4 verification (2026-10-23 Asia/Tokyo)

Based on merged 0.1.3 main 8c6967599499957ce0b5ef1024d775e777f7acf5.

123 Node VM tests pass. Existing retry/budget tests explicitly use the configurable constrained profile (concurrency=2, max_calls=4); new long-track tests use production defaults (concurrency=8, no fixed cost cap). Tests validate actual generated bundles. Synthetic data and mocked HTTP only; no real API key or paid calls.

- 2400 distinct cues, fast HTTP callbacks: 100 requests, final cue translated, all 2400 cached.
- 2400 cues, 8-second waves: response exits at 22s preserving partial cache; manual prewarm completes missing cues within 270s; replay translates all 2400 cues from cache with zero API calls.
- Missing/expired prewarm task makes no API calls; partial checkpoints survive unfinished work and resume past cached cues.
- Manual prewarm resets start_seconds to zero, uses captured source/model/target; auth failure stops new work.
- Existing strict output validation, split recovery, rate-limit handling, deadlines, duplicate callbacks and privacy regressions continue passing.
- Build and syntax checks for translate/probe/prewarm; generated remote prewarm URL and 300s Generic runtime are tested.

Still unverified: actual iPhone/Loon Generic import/run, OS background execution, persistent-store capacity on device, live DeepSeek latency/rate limits and YouTube re-request behavior. No claim that an already delivered subtitle track is updated, or that playback position is observable. More API spending cannot fix missing/interception-incompatible tracks or prevent client timeouts. Default Response waiting time remains 22s to limit client-facing stalls.

References: https://nsloon.app/en/docs/Script/script_v2/ documents manually invoked Generic scripts and configurable timeout; https://nsloon.app/docs/Script/script_api/ documents response contexts and release of runtime resources after $done. Prewarm runs as its own explicit invocation, never as background work after $done.
