# Context window budget example

Scope: only the context window budgets item in
[ARGI #372](https://github.com/agentic-ai-java/argi/issues/372).
The Chinese and English `context-window-budget` website guides describe the contract.
This fixture is a deterministic check, not a tokenizer or provider adapter.

## Reproduce

Use JDK 17+ and Maven 3.9.1+. Install the pinned Core commit first:

```bash
# In a separate Core checkout: https://github.com/agentic-ai-java/argi.git
git checkout --detach c6e453f20fcb1c7837d92b321aa18ec5a46ccab6
mvn -B -pl :argi-agent-framework -am install -DskipTests   -Dcheckstyle.skip -Dspring-javaformat.skip

# In the website checkout
mvn -B -f examples/context-window-budget/pom.xml compile exec:java
mvn -B -o -f examples/context-window-budget/pom.xml compile exec:java
```

The POM depends on `argi-agent-core` for independent `ReActAgent`; budget contracts
arrive through `argi-agent-api`. The broader framework installation above also
prepares `SummarizationRequestCompactor` and its targeted tests, but the executable
uses a deterministic compactor rather than invoking a summary model.

The source version `2.1.0-RC2-SNAPSHOT` does **not** prove Maven Central publication
or pin artifact contents. Reinstall from the exact SHA above into the local Maven
repository before running. An existing artifact with the same version could come
from other source. After the first successful dependency/plugin resolution, `-o`
uses the local cache and the fixture itself performs no network/provider calls.
`clean` is not part of that cached command; an uncached clean plugin also needs to
be resolved before it can run offline. To force javac without that plugin, delete
only this example target directory, then repeat `-o ... compile exec:java`.

## Assertions

- The real approximate estimator counts system, messages, disclosed tool schemas,
  and reserved output; checks sums, `APPROXIMATE`, static-name precedence,
  explicit selection including empty selection, and the maxTokens reserve floor.
- Real independent `ReActAgent.invoke` permits total == window, refuses total ==
  window + 1, and calls the fake provider zero times on rejection.
- Through the same Agent, compaction causes a second estimate; a small replacement
  succeeds with one provider call and is actually forwarded to the fake. A no-op
  compactor still fails with zero calls.
- A direct gate check removes a paired tool result. It must throw
  `PairingException(MISSING_TOOL_RESULT)` before the second estimate and before
  dispatch. Structured overflow diagnostics report TOTAL, excess, and dominant part.

Fake estimator `EXACT` values are fixed fixture units, not actual provider tokens.
There is no external provider, credential, Extensions artifact, or summary call.

## Validation record

Validated on 2026-11-25 entirely inside an Ubuntu cloud computer with OpenJDK
17.0.21.1, Maven 3.9.9, Node 24.21.0, npm 11.19.0. Java compilation target is 17.
Website base: `041a2c3561c5614511a9654efeff832a900fe8e6`.
Core base: `c6e453f20fcb1c7837d92b321aa18ec5a46ccab6`.

- Core framework installation with dependencies passed using the command above.
  Formatting and Checkstyle were skipped for dependency preparation, not claimed as
  upstream style validation.
- Targeted Core tests passed using:

  ```bash
  mvn -B -pl :argi-agent-framework -am test     -Dtest=ContextBudgetInterceptorTest,ToolCallPairingValidatorTest,SummarizationRequestCompactorTest     -Dsurefire.failIfNoSpecifiedTests=false     -Dcheckstyle.skip -Dspring-javaformat.skip
  ```

  `ContextBudgetInterceptorTest`: 14; `ToolCallPairingValidatorTest`: 5;
  `SummarizationRequestCompactorTest`: 3. Total 22 tests, zero failures/errors/skips.
  Other reactor modules may report no matching tests; this is not a full-suite claim.
- The executable passed online dependency resolution and Maven `-o` execution,
  including recompilation after deleting its target directory.
- Website `npm ci`, `npm run typecheck`, `npm run lint`, `npm run verify:contract`,
  and `npm run build` passed. Build covers `zh-Hans` and `en` plus Pagefind indexing.
  The pre-existing contract checker contains older API literal checks; a pass is not
  Java compatibility evidence. The compiled fixture is.

The npm install reported 74 dependency audit findings (5 low, 15 moderate, 34 high,
20 critical). No audit fix, lockfile refresh, or unrelated upgrade was made.
Browserslist data was old, and Pagefind warned about unsupported Chinese stemming;
these were non-fatal existing toolchain warnings, not missing locale builds.

## Explicit limitations

No live-provider tokenizer accuracy, multimodal token guarantee, graph-based
ReactAgent, streaming, cancellation, retry/fallback composition, or end-to-end
summary-model budget is verified. The actual gate overrides only `interceptModel`;
it is opt-in and must sit after request-rewriting interceptors. It is not terminal
runtime enforcement or a cumulative run/cost budget. Pairing is checked only after
a compactor is invoked on an oversized request, not on the already-fitting fast path.
The summary adapter itself is covered by the three upstream tests above, not by a
real summary provider in this fixture.
