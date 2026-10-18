---
sidebar_position: 2
title: Versions and source compatibility
sidebar_label: Versions
description: Match ARGI coordinates, source revisions and optional integration dependencies.
---

# Versions and source compatibility

Reviewed on **2026-10-18** against Core main
`5ec935b384d5379324ee60277ddcd3a6683a861f`.
The current main development version is **`2.1.0-RC2-SNAPSHOT`**.
A snapshot coordinate does not freeze its contents. Build the pinned revision locally
before using APIs added after RC1; this is not a claim of publication to Maven Central.

| Contract | Value |
| --- | --- |
| Maven group | `io.github.agentic-ai-java` |
| Core BOM | `argi-bom` |
| Agent runtime | `argi-agent-framework` |
| Graph runtime | `argi-graph-core` |
| Neutral contracts | `argi-api` |
| Java packages | `io.github.agentic.ai.*` |
| Configuration prefix | `argi.*` |
| Java baseline | 17 |

The historical `io.github.agentic-ai` group and `2.1.0-dev` version do not identify
this baseline. The `argi-api-base` directory publishes the artifact `argi-api`.

## Core dependencies

```xml
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>io.github.agentic-ai-java</groupId>
      <artifactId>argi-bom</artifactId>
      <version>2.1.0-RC2-SNAPSHOT</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>
<dependencies>
  <dependency>
    <groupId>io.github.agentic-ai-java</groupId>
    <artifactId>argi-agent-framework</artifactId>
  </dependency>
</dependencies>
```

Use `argi-graph-core` instead for a graph-only application. The neutral runtime does
not require every provider SDK or a Spring AI BOM. Add the selected optional adapter;
see [current runtime contracts](./frameworks/agent-framework/runtime-contracts.md).

The reviewed source uses Spring AI `2.0.1` in its Spring AI adapter and Spring Boot
`4.1.1` for optional starters and Studio. These are integration dependencies, not
the model contract of Core.

## Extensions dependencies

Extensions are versioned separately. Its reviewed source uses `2.1.0-RC2-SNAPSHOT`,
while its default Core dependency still points to RC1. The example bootstrap sets
`-Dargi.version=2.1.0-RC2-SNAPSHOT` when building matching Extensions source.

Add the following entry to `dependencyManagement` alongside the Core BOM when using
optional integrations:

```xml
<dependency>
  <groupId>io.github.agentic-ai-java</groupId>
  <artifactId>argi-extensions-bom</artifactId>
  <version>2.1.0-RC2-SNAPSHOT</version>
  <type>pom</type>
  <scope>import</scope>
</dependency>
```

Core does not import the Extensions BOM. Build compatible source revisions rather
than assuming all equally named snapshots work together.

## Example validation baseline

The [example repository](https://github.com/agentic-ai-java/argi-example) records
source pins, staged compatibility corrections and actual results in
`docs/compatibility.md`. Its live-provider results from 2026-10-15 are historical
evidence, not verification of the newly pinned source.

New guides cover features already on the pinned main revision. Unmerged proposals
are excluded. Runtime policies are opt-in; no application data migration is performed.
