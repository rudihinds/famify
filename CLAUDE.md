# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm start` - Start Expo development server
- `npm run ios` - Start on iOS simulator
- `npm run android` - Start on Android emulator
- `npm run web` - Start on web browser

### Testing
- `npm test` - Run all tests in watch mode
- `npx jest __tests__/auth.test.tsx` - Run specific test file
- `npx jest --testNamePattern="Parent Registration"` - Run tests matching pattern
- `npx jest --watch __tests__/auth.test.tsx` - Watch mode for specific file

### Linting
- `npm run lint` - Run linting (currently not configured)

## Architecture Overview

### Tech Stack
- **Frontend**: React Native 0.79.3 with Expo SDK 53
- **Navigation**: Expo Router (file-based routing)
- **State**: Redux Toolkit with Redux Persist
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Testing**: Jest with React Native Testing Library

### Project Structure
- `/app` - Expo Router screens organized by user type (auth/, parent/, child/)
- `/components` - Reusable React Native components
- `/store` - Redux store configuration and slices
- `/lib` - Shared utilities (Supabase client)
- `/supabase/migrations` - Database schema migrations

### Key Architectural Patterns

#### Authentication Flow
1. **Parent Auth**: Email/password or OAuth via Supabase Auth
   - Auto-creates profile after registration
   - Sessions persist via Redux Persist
   - Tokens stored in Expo SecureStore

2. **Child Auth**: QR code device linking + PIN
   - Parent generates QR code with 10-minute expiry token
   - Child scans and creates profile with 4-digit PIN
   - 2-hour sessions with activity monitoring
   - Offline PIN validation capability

#### State Management
- Redux Toolkit with three main slices:
  - `authSlice`: Parent auth and device type
  - `childSlice`: Child profiles and sessions
  - `connectionSlice`: QR code tokens
- Only auth state persisted (web: localStorage, mobile: AsyncStorage)

#### Database Schema
PostgreSQL via Supabase with the following key tables:

**User Management:**
- `profiles`: Parent accounts (id, famcoin_conversion_rate)
- `children`: Child profiles (id, parent_id, name, age, pin_hash, device_id, famcoin_balance, avatar_url, focus_areas[])
- `child_sessions`: Active sessions (id, child_id, expires_at, last_activity)
- `connection_tokens`: QR linking (id, parent_id, token, child_name, expires_at, used)

**Task System:**
- `task_templates`: Reusable tasks (id, category_id, parent_id, photo_proof_required, effort_score, is_system, usage_count)
- `task_instances`: Scheduled tasks (id, template_id, group_id, sequence_id, famcoin_value, photo_proof_required, effort_score, is_bonus_task)
- `task_completions`: Completion tracking (id, task_instance_id, child_id, due_date, completed_at, approved_at, approved_by, famcoins_earned)
- `task_categories`: Task organization (id, is_system)

**Planning & Organization:**
- `sequences`: Task sequences (id, child_id, start_date, end_date, currency_code, budget_currency, budget_famcoins, status)
- `groups`: Task groups (id, sequence_id, active_days[])
- `unavailable_days`: Schedule blocks (id, child_id, date, created_by)

**Rewards & Currency:**
- `famcoin_transactions`: Transaction ledger (id, child_id, amount, task_completion_id, wishlist_item_id, created_by)
- `wishlist_items`: Reward goals (id, child_id, price_currency, price_famcoins)
- `subscriptions`: Parent subscriptions (id, parent_id, trial_start/end, current_period_start/end)

**IMPORTANT**: Row Level Security currently disabled in migrations - must be re-enabled for production

#### Development Patterns
- Environment variables use `EXPO_PUBLIC_` prefix
- Platform-specific code handled via Platform.OS checks
- Comprehensive error handling in auth flows
- Dev mode includes hardcoded test user (remove for production)

### Development Mode

The app uses a production-ready test user pattern for development:

**Environment Variables:**
- `EXPO_PUBLIC_DEV_MODE=true` - Enables dev mode features
- `EXPO_PUBLIC_TEST_EMAIL=test@famify.com` - Test user email
- `EXPO_PUBLIC_TEST_PASSWORD=testpass123` - Test user password

**Dev Mode Features:**
1. **Quick Login**: Yellow button on login screen auto-fills test credentials
2. **Dev Menu**: Code icon (🔧) shows development tools
3. **Test Data Creation**: One-click child profile creation
4. **Real Auth Flow**: Uses actual Supabase authentication
5. **Test Children**: Emma (PIN: 1234), Liam (PIN: 5678)

**Usage:**
1. Create a real test user in Supabase with the email/password
2. Set the credentials in your `.env` file
3. Use "Dev: Quick Login" button or enter credentials manually
4. All features work exactly as in production

**Key Benefits:**
- Zero code changes for production (just remove env vars)
- Real database relationships and RLS policies work correctly
- Same auth flow as production users
- No special code paths or mock data

### Critical Production Tasks
1. Re-enable Row Level Security (disabled in migrations 003-004)
2. Set `EXPO_PUBLIC_DEV_MODE=false` in production
3. Remove test credentials from environment variables
4. Implement proper PIN hashing (currently placeholder)
5. Configure OAuth redirect URLs

### Testing Strategy
- Jest with jest-expo preset
- Comprehensive mocks in jest-setup.js
- Test files in __tests__/ or *.test.* pattern
- Focus on authentication flows and state management

## Supabase MCP Documentation

Comprehensive Supabase development guidelines are available in `/docs/supabase/`:

- **[auth-nextjs.md](./docs/supabase/auth-nextjs.md)** - Next.js SSR authentication (critical: avoid deprecated patterns)
- **[edge-functions.md](./docs/supabase/edge-functions.md)** - Deno Edge Functions with proper imports
- **[schema-management.md](./docs/supabase/schema-management.md)** - Declarative schema approach (use schemas/ not migrations/)
- **[rls-policies.md](./docs/supabase/rls-policies.md)** - Row Level Security with performance optimizations
- **[database-functions.md](./docs/supabase/database-functions.md)** - PostgreSQL functions with security best practices
- **[migrations.md](./docs/supabase/migrations.md)** - Migration file naming and SQL guidelines
- **[sql-style-guide.md](./docs/supabase/sql-style-guide.md)** - Consistent SQL formatting standards

See [/docs/README.md](./docs/README.md) for complete documentation index.