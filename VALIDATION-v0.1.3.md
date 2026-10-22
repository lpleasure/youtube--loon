# 0.1.3 verification — 2026-10-23 (Asia/Tokyo)

Base: lpleasure/youtube-loon-deepseek main be51944271a111212c88740df29296268e7b8ff9 (0.1.2).
The local baseline Git tree matched remote tree 0499f34306cc7b56c794acd1e80752f713487ee5 before edits.

- node tools/build.cjs: passed; both bundles and all eight local/remote plugin files generated.
- node --test tests/subtitles.test.cjs: 118 tests passed, 0 failed (Node sandbox with synthetic subtitles and mocked HTTP).
- node --check dist/yt-translate.js and dist/yt-probe.js: passed.
- git diff --check: passed.
- Bundle/source correspondence and all four remote subscription script URLs checked by tests.
- Two consecutive builds compared by SHA-256: identical.

Regression coverage: four subtitle formats and timing/layout preservation, strict JSON and ID validation, malformed/empty/length replies splitting once, successful sibling preservation, single-cue delayed retry, parallel failures, auth stopping queued recovery, deadline and call budget enforcement, cache replay/expiration/capacity, log privacy, late callbacks and unavailable clearTimeout.

Long-video simulations: manual start_seconds=100 prioritizes cues 100–149 in a 150-cue response; cached translations remain reusable when start resets to zero. A repeated original response skips the first 96 cached cues and processes cues 96–149. This repeated-request behavior already existed in 0.1.2; the new capability is the explicit manual time filter across JSON3/SRV1/SRV3/VTT. No automatic player-position integration or real-device coverage is claimed.

Not performed: real paid DeepSeek calls, iPhone/Loon plugin import, certificate interception, actual YouTube playback, remote script-cache refresh, visual alignment or long-video end-to-end observation. No API key was read. A browser was unnecessary; Chrome remains the preferred choice if later device/browser investigation needs one.

Device acceptance: update the branch subscription and script; confirm version=0.1.3 in logs; enable only one subtitle rewrite plugin; test a short track, then set manual start_seconds to a known later timestamp and request subtitles again. Record only fixed diagnostic fields. Verify Chinese/original display and seek behavior on the actual device, then reset start_seconds to 0. A new request and relevant cues must actually reach Loon; full-track coverage is not guaranteed.
