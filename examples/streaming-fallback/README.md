# Streaming fallback example

Scope: only the streaming-fallback item in
[ARGI #372](https://github.com/agentic-ai-java/argi/issues/372).
See the Chinese and English `model-fallback` website guides for the contract.
This fixture is intentionally not a reusable provider adapter.

## Reproduce

Use JDK 17+ and Maven 3.9.1+. Build Core commit
`c6e453f20fcb1c7837d92b321aa18ec5a46ccab6` first, not an arbitrary artifact with
the same `2.1.0-RC2-SNAPSHOT` version:

```bash
./mvnw -B -pl :argi-agent-framework -am install -DskipTests
```

Then, from the website repository:

```bash
mvn -B -f examples/streaming-fallback/pom.xml compile exec:java
```

After dependencies/plugins are cached, the same command works with `-o`.
`ModelFallbackInterceptor` and `ModelRetryInterceptor` ship in `argi-agent-framework`,
so this example depends on that module even though it drives the independent
`ReActAgent`. No credentials, provider adapters or Extensions artifacts are used.

Scenarios 5 and 6 call `ModelFallbackInterceptor#interceptModel` directly with a
handler that returns a streaming `ModelResponse`, which is the shape the graph-based
engine passes. Scenarios 7 to 9 run the independent `ReActAgent` with
`streamModel(true)` and record the observed delta and snapshot views; they assert the
current behaviour, including the concatenated delta view after a mid-stream failure.

## Validation record

Checked 2026-11-25 on macOS arm64 using Eclipse Temurin JDK 21.0.13, Java release
target 17 and Maven 3.9.9. JDK 17 runtime execution was not tested.
Website base: `041a2c3561c5614511a9654efeff832a900fe8e6` (this PR's base).
Core base: `c6e453f20fcb1c7837d92b321aa18ec5a46ccab6` (Core `main` at the time of checking).

- Core dependency installation passed using
  `mvn -B -pl :argi-agent-framework -am install -DskipTests -Dcheckstyle.skip -Dspring-javaformat.skip`.
- This targeted Core check passed:

  ```bash
  mvn -B -pl :argi-agent-framework test \
    -Dtest='ModelFallback*Test,ModelRetry*Test' -Dsurefire.failIfNoSpecifiedTests=false
  ```

  Result: 62 tests, zero failures/errors/skips. This is a targeted test run, not a
  full Core test-suite claim.
- The example's `compile exec:java` passed, then passed again with Maven `-o`.
- The checks behind CI's `make lint` passed: markdownlint, yamllint, `npm run lint`
  and codespell, using the repository's linter configs. Website `npm run typecheck`,
  `npm run verify:contract` and `npm run build` passed. The build includes both `zh-Hans` and `en`, with broken
  Markdown links treated as errors, followed by search indexing.

No live-provider or end-to-end graph-based `ReactAgent` validation is claimed.
Other #372 capabilities and the site-wide onboarding migration remain out of scope.
