# LUMA V1 — Project Instructions for Claude

## Project Overview
LUMA is a premium compatibility-based dating app with a **LOCKED** V1 architecture:
- **19 Main Categories, 48 Subsystems**
- **45 Questions** (20 core + 25 premium)
- **3 Intention Tags**: Serious Relationship, Exploring, Not Sure
- **4 Packages**: Free, Gold, Pro, Reserved
- **5 Menu Tabs**, **2 Match Animations**, **2 Compatibility Levels**

## Tech Stack
- **Mobile**: React Native + TypeScript (apps/mobile/)
- **Backend**: Node.js + NestJS + TypeScript (apps/backend/)
- **Database**: PostgreSQL + Redis + Elasticsearch
- **Shared Types**: @luma/shared (packages/shared/)
- **Infrastructure**: AWS (Terraform in infrastructure/)
- **CI/CD**: GitHub Actions (.github/workflows/)

## Language Rules
- All code, comments, and technical documentation: **English**
- All user-facing strings and responses to the founder: **Turkish**
- Agent prompts are in English, output always in Turkish

## Code Standards
- TypeScript strict mode everywhere
- No `any` types
- All API endpoints must have input validation
- All business logic must have unit tests
- Follow NestJS module pattern for backend
- Follow React Navigation + Zustand for mobile
- Use Prisma ORM for database operations

## Architecture Rules
- **DO NOT** add new categories beyond the 19 locked ones
- **DO NOT** change locked numbers (45 questions, 3 tags, 4 packages, etc.)
- All shared types go in `packages/shared/`
- All API routes defined in `packages/shared/src/constants/api.ts`
- All WebSocket events defined in `packages/shared/src/constants/api.ts`

## Available Agents
See `.claude/agents/` for 20 department-specific agents.

## Available Skills
See `.claude/skills/` for 10 quick-action slash commands.
