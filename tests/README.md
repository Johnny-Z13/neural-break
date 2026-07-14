# Tests

Neural Break uses Playwright for automated browser regression coverage.

```bash
npm test
```

The suite covers:

- boot, menu navigation, pause, and resume
- leaderboard populated and empty states
- game-over name submission by keyboard and pointer
- first-use and post-reset enemy death particles
- stable enemy identity and scoring under production minification
- objective reachability and advancement across Levels 1-99
- scheduled Fizzer spawning for objective-based levels
- the live Level 1 completion transition into Level 2

`test_highscore.html` is a legacy localStorage utility. It does not exercise the
production Neon-backed leaderboard path.
