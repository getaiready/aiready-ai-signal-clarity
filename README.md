# @aiready/ai-signal-clarity

> AIReady Spoke: Identifies code patterns, naming ambiguities, and logic traps that frequently cause AI model hallucinations.

[![npm version](https://img.shields.io/npm/v/@aiready/ai-signal-clarity.svg)](https://npmjs.com/package/@aiready/ai-signal-clarity)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

AI models often generate incorrect code when they encounter ambiguous signals in the codebase. The **AI Signal Clarity** analyzer (formerly `hallucination-risk`) scans for high-entropy patterns that undermine AI reasoning.

### Language Support

- **Full Support:** TypeScript, JavaScript, Python, Java, Go, C#
- **Capabilities:** Boolean trap detection, naming entropy, ambiguous API signals.

## 🏛️ Architecture

```
                    🎯 USER
                      │
                      ▼
         🎛️  @aiready/cli (orchestrator)
          │     │     │     │     │     │     │     │     │     │
          ▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼
        [PAT] [CTX] [CON] [AMP] [DEP] [DOC] [SIG] [AGT] [TST] [CTR]
          │     │     │     │     │     │     │     │     │     │
          └─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘
                               │
                               ▼
                      🏢 @aiready/core

Legend:
  PAT = pattern-detect        CTX = context-analyzer
  CON = consistency           AMP = change-amplification
  DEP = deps-health           DOC = doc-drift
  SIG = ai-signal-clarity ★   AGT = agent-grounding
  TST = testability           CTR = contract-enforcement
  ★   = YOU ARE HERE
```

## Features

- **Boolean Trap Detection**: Flags multi-boolean parameter patterns where AI often flips intent.
- **Magic Literal Detection**: Identifies unnamed constants that AI struggles to interpret.
- **Naming Entropy**: Detects variable names with multiple semantic interpretations in the same context.
- **Ambiguous API**: Surfaces untyped exports that prevent AI from inferring interface contracts.

## Installation

```bash
pnpm add @aiready/ai-signal-clarity
```

## Usage

This tool is designed to be run through the unified AIReady CLI.

```bash
# Scan for AI signal clarity issues
aiready scan . --tools ai-signal-clarity

# Alias for backwards compatibility
aiready scan . --tools hallucination-risk
```

## License

MIT
