# @aiready/change-amplification

> AIReady Spoke: Analyzes architectural coupling and graph metrics to predict how code changes "explode" across the codebase.

[![npm version](https://img.shields.io/npm/v/@aiready/change-amplification.svg)](https://npmjs.com/package/@aiready/change-amplification)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

High architectural coupling is one of the leading causes of AI agent failure. When an agent modifies a "bottleneck" file with dozens of dependents, the resulting cascade of breakages often exceeds the agent's context window or reasoning capacity. 

The **Change Amplification** analyzer computes graph metrics (fan-in, fan-out, and centrality) to identify these high-risk areas before they cause an "edit explosion."

## 🏛️ Architecture

```
                    🎯 USER
                      │
                      ▼
         🎛️  @aiready/cli (orchestrator)
           │   │   │   │   │   │   │   │   │   │   │   │
           ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼
         ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐
         │A│ │B│ │C│ │D│ │E│ │F│ │G│ │H│ │I│ │J│ │K│ │L│
         └─┘ └─┘ └─┘ └─┘ └─┘ └─┘ └─┘ └─┘ └─┘ └─┘ └─┘ └─┘
         ALL SPOKES — flat peers, no hierarchy:
         A=pattern-detect    B=context-analyzer  C=consistency
         D=change-amp ★      E=deps-health        F=doc-drift
         G=ai-signal-clarity H=agent-grounding    I=testability
         J=visualizer        K=skills             L=components
           │   │   │   │   │   │   │   │   │   │   │   │
           └───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘
                               │
                               ▼
                      🏢 @aiready/core
```

## Features

- **Fan-Out Analysis**: Measures how many dependencies a file has (impact of external changes on this file).
- **Fan-In Analysis**: Measures how many files depend on this one (impact of changes in this file on the system).
- **Amplification Factor**: A weighted metric predicting the "blast radius" of a single line change.
- **Hotspot Detection**: Automatically flags files that should be refactored to reduce system-wide fragility.

## Installation

```bash
pnpm add @aiready/change-amplification
```

## Usage

This tool is designed to be run through the unified AIReady CLI.

```bash
# Scan for change amplification hotspots
aiready scan . --tools change-amplification

# Get specific results for a directory
aiready change-amplification ./src
```

## License

MIT
