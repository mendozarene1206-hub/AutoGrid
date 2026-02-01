# AutoGrid Kimi Configuration

This directory contains configuration and workflows for Kimi Code CLI following best practices from Boris Cherny (creator of Claude Code).

## Structure

```
.kimi/
├── skills/           # Reusable agent skills
│   ├── feature-spec.md       # Write PRDs and specs
│   ├── code-reviewer.md      # Review code quality
│   ├── debug-analyzer.md     # Debug issues
│   ├── refactor-planner.md   # Plan refactoring
│   ├── advanced-prompting.md # Advanced prompting techniques
│   └── learning-mode.md      # Learn while coding
├── templates/        # Plan mode templates
│   ├── feature-plan.md       # New feature planning
│   ├── bugfix-plan.md        # Bug fix planning
│   ├── refactor-plan.md      # Refactoring planning
│   ├── ascii-diagram.md      # ASCII art diagrams
│   └── html-presentation.md  # Interactive HTML slides
├── workflows/        # Standardized workflows
│   ├── feature-implementation.md
│   └── code-review.md
├── EXAMPLES.md       # Usage examples
└── README.md         # This file
```

## Usage

### Plan Mode
Before implementing any feature, create a plan:
```
/plan [description of what you want to build]
```

Use templates from `.kimi/templates/` as starting points.

### Skills
When Kimi needs to perform a specialized task, reference these skills:
- "Use feature-spec skill to write the spec"
- "Use code-reviewer skill to review this"
- "Use debug-analyzer skill to find the bug"
- "Use advanced-prompting skill for complex requests"
- "Use learning-mode skill to understand code"

### Workflows
Follow these workflows for standardized processes:
1. **Feature Implementation** - Use for all new features
2. **Code Review** - Use before committing

### Learning Mode
Use Kimi for learning, not just coding:
```
# Create visual presentation
"Create HTML presentation explaining [system]"

# Generate ASCII diagrams
"Draw ASCII diagram of [architecture]"

# Deep learning with spaced repetition
"Spaced repetition learning on [topic]"

# Learn through questions
"Use Socratic method to teach me [concept]"
```

Output goes to `docs/learning/` for future reference.

## Key Principles

1. **Plan First**: Never implement without a plan
2. **Subagent Pattern**: Use specialized skills for complex tasks
3. **Minimal Changes**: Only touch what's necessary
4. **Update KIMI.md**: Add lessons learned when Kimi makes mistakes
5. **Quality Gates**: Type checks, lint, tests must pass

## Updating

When Kimi makes a mistake:
1. Add entry to `KIMI.md` in root
2. Include date, mistake, and fix
3. Reference which skill/workflow could prevent it

## References

- [Boris Cherny on Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)
- [How Boris Cherny Uses Claude Code](https://dev.to/with_attitude/how-boris-cherny-builder-of-claude-code-uses-it-173g)
