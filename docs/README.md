# Famify Documentation

## Overview

This directory contains development documentation for the Famify application, including guidelines, best practices, and reference materials for working with our tech stack.

## Documentation Structure

### [/supabase](./supabase/)
Comprehensive guidelines for working with Supabase in the Famify project:

- **[auth-nextjs.md](./supabase/auth-nextjs.md)** - Authentication patterns for Next.js SSR applications
- **[edge-functions.md](./supabase/edge-functions.md)** - Writing and deploying Supabase Edge Functions with Deno
- **[schema-management.md](./supabase/schema-management.md)** - Declarative database schema management practices
- **[rls-policies.md](./supabase/rls-policies.md)** - Row Level Security policy creation and optimization
- **[database-functions.md](./supabase/database-functions.md)** - PostgreSQL function writing best practices
- **[migrations.md](./supabase/migrations.md)** - Database migration file creation and naming conventions
- **[sql-style-guide.md](./supabase/sql-style-guide.md)** - PostgreSQL SQL formatting and style standards

## Quick Reference

### For AI Assistants (Claude, Cursor, etc.)
When working with Supabase MCP tools, refer to the specific documentation files above for:
- Proper authentication patterns (avoid deprecated methods)
- Database schema modifications using declarative approach
- RLS policy creation with performance optimizations
- Edge function development with proper imports
- SQL style consistency

### Key Principles
1. **Production-Ready Code**: All patterns and examples are designed for production use
2. **Security First**: RLS policies, secure functions, and proper authentication
3. **Performance**: Optimized queries, proper indexing, and efficient policies
4. **Maintainability**: Clear naming conventions, comprehensive comments, and consistent style

## Contributing

When adding new documentation:
1. Follow the existing file structure and naming conventions
2. Include practical examples and templates
3. Highlight critical warnings for AI assistants where applicable
4. Keep documentation focused and topic-specific