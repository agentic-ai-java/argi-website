# Streaming message identity example

Scope: only the streaming-message-identity item in
[ARGI #372](https://github.com/agentic-ai-java/argi/issues/372).
See the Chinese and English `stream-message-identity` website guides for the
consumer contract. This fixture is intentionally not a reusable provider adapter.

## Reproduce

Use JDK 17+ and Maven 3.9.1+. Build Core commit
`ef67b8e083746899da43c0a056b76b71db9e92ab` first, not an arbitrary artifact with
the same `2.1.0-RC2-SNAPSHOT` version:

```bash
./mvnw -B -pl :argi-agent-core -am install -DskipTests
```

Then, from the website repository:

```bash
mvn -B -f examples/stream-message-identity/pom.xml compile exec:java
```

After dependencies/plugins are cached, the same command works with `-o`.
The fixture's subscribers request unbounded demand; it is not a general-purpose
backpressure test. No credentials, provider adapters or Extensions artifacts are used.

## Validation record

Checked 2026-11-17 on macOS arm64 using JDK 21, Java release target 17 and Maven
3.10.1. JDK 17 runtime execution was not tested.
Website base: `7974c3b40392722557a4404210cfb6cb4a975a16`.
Core base: `ef67b8e083746899da43c0a056b76b71db9e92ab`.

- Core dependency installation passed using
  `./mvnw -B -pl :argi-agent-core -am install -DskipTests -Dcheckstyle.skip -Dspring-javaformat.skip`.
- The following separate Core check passed, without those skip flags:

  ```bash
  ./mvnw -B -pl :argi-agent-core -am test \
    -Dtest=ReActAgentStreamMessageIdTest -Dsurefire.failIfNoSpecifiedTests=false
  ```

  Result: 11 tests, zero failures/errors/skips. This is a targeted test run, not
  a full Core test-suite claim.
- The example's `compile exec:java` passed, then passed again with Maven `-o`.
  Assertions cover multi-turn/tool isolation, delta/snapshot replacement,
  fresh views across invocations, and partial text on stream failure.
- Website `npm run typecheck`, `npm run lint`, `npm run verify:contract` and
  `npm run build` passed. The build includes both `zh-Hans` and `en`, with
  broken Markdown links treated as errors, followed by search indexing.
  The pre-existing contract checker still contains old API literal checks;
  its pass is not used as proof of Java compatibility. The compiled example is.

No live-provider, browser-UI or network-cancellation validation is claimed.
Other #372 capabilities and the site-wide onboarding migration remain out of scope.
