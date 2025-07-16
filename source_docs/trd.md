
# echnical Requirements Document (TRD): Famify MVP

## 1. Technical Architecture

### 1.1 System Overview

Famify is built using a modern, scalable architecture optimized for React Native mobile development with real-time capabilities and offline support.

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer                             │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │   Parent App    │  │   Child App     │                  │
│  │  (Full Access)  │  │ (PIN Protected) │                  │
│  └─────────────────┘  └─────────────────┘                  │
│                          │                                  │
│              React Native + Redux Toolkit                   │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────────────┐
                    │   Supabase      │
                    │   Backend       │
                    ├─────────────────┤
                    │ • PostgreSQL    │
                    │ • Auth (JWT)    │
                    │ • Realtime      │
                    │ • Storage       │
                    │ • Edge Functions│
                    └─────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                Third-Party Services                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Stripe    │  │    Expo     │  │   Device    │        │
│  │ Payments    │  │Notifications│  │  Storage    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘

```

### 1.2 Technology Stack

### 1.2.1 Frontend

- **Framework**: React Native v0.72+ with Expo SDK 49+
- **Language**: TypeScript v5.0+
- **State Management**: Redux Toolkit v1.9+ with RTK Query
- **Navigation**: React Navigation v6+
- **Persistence**: Redux Persist with AsyncStorage
- **UI Components**: React Native Elements + Custom Components
- **Styling**: StyleSheet with Theme Provider

### 1.2.2 Backend

- **Platform**: Supabase (PostgreSQL v14+)
- **Authentication**: Supabase Auth with JWT
- **Real-time**: Supabase Realtime subscriptions
- **Storage**: Supabase Storage for images
- **Functions**: Supabase Edge Functions (Deno)

### 1.2.3 Third-Party Integrations

- **Payments**: Stripe SDK v0.35+
- **Notifications**: Expo Notifications
- **Image Handling**: Expo ImagePicker + ImageManipulator
- **Secure Storage**: Expo SecureStore

### 1.3 Data Flow Architecture

```
User Action → Redux Action → RTK Query → Supabase → Database
                    ↓
              Optimistic Update → UI Update → Background Sync
                    ↓
              Success/Error → Redux State → UI Feedback

```

### 1.3.1 Offline Strategy

- Redux Persist stores critical data locally
- Optimistic updates provide immediate UI feedback
- Offline queue stores actions when disconnected
- Background sync processes queue when connection restored
- Conflict resolution uses last-writer-wins with timestamps

## 2. Database Design

### 2.1 Complete Schema

### 2.1.1 Core Tables

```sql
-- User profiles
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  avatar_url TEXT,
  famcoin_conversion_rate INTEGER DEFAULT 10, -- FAMCOINS per £1
  subscription_status TEXT DEFAULT 'trial',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Children linked to parents
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  age INTEGER,
  avatar_url TEXT,
  pin_hash TEXT NOT NULL,
  famcoin_balance INTEGER DEFAULT 0,
  focus_areas TEXT[] DEFAULT '{}', -- Selected categories
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task categories (system-defined only)
CREATE TABLE task_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reusable task templates
CREATE TABLE task_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES task_categories(id) NOT NULL,
  photo_proof_required BOOLEAN DEFAULT false,
  effort_score INTEGER CHECK (effort_score BETWEEN 1 AND 5),
  is_system BOOLEAN DEFAULT true, -- false for user-created templates
  parent_id UUID REFERENCES profiles(id), -- null for system templates
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sequences for individual children
CREATE TABLE sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('weekly', 'fortnightly', 'monthly')) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  budget_currency DECIMAL(10,2) NOT NULL,
  budget_famcoins INTEGER NOT NULL,
  currency_code CHAR(3) NOT NULL DEFAULT 'GBP', -- ISO currency code
  status TEXT CHECK (status IN ('active', 'completed', 'archived')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT one_active_sequence_per_child UNIQUE (child_id, status)
    DEFERRABLE INITIALLY DEFERRED
);

-- Task groups within sequences
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id UUID REFERENCES sequences(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  active_days INTEGER[] DEFAULT '{1,2,3,4,5,6,7}', -- 1=Monday, 7=Sunday
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task instances within groups
CREATE TABLE task_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES task_templates(id) NOT NULL,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  sequence_id UUID REFERENCES sequences(id) ON DELETE CASCADE NOT NULL,
  custom_name TEXT, -- Override template name if needed
  custom_description TEXT, -- Add context for this instance
  famcoin_value INTEGER NOT NULL,
  photo_proof_required BOOLEAN NOT NULL,
  effort_score INTEGER CHECK (effort_score BETWEEN 1 AND 5),
  is_bonus_task BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily task completions
CREATE TABLE task_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_instance_id UUID REFERENCES task_instances(id) ON DELETE CASCADE NOT NULL,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'child_completed', 'parent_approved', 'parent_rejected', 'excused')) DEFAULT 'pending',
  photo_url TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES profiles(id),
  rejection_reason TEXT,
  famcoins_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_instance_id, due_date)
);

-- FAMCOIN transaction ledger
CREATE TABLE famcoin_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL, -- positive for earning, negative for spending
  type TEXT CHECK (type IN ('earned', 'spent', 'adjusted', 'bonus')) NOT NULL,
  task_completion_id UUID REFERENCES task_completions(id),
  wishlist_item_id UUID REFERENCES wishlist_items(id),
  reason TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Child wishlist items
CREATE TABLE wishlist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_currency DECIMAL(10,2) NOT NULL,
  price_famcoins INTEGER NOT NULL,
  currency_code CHAR(3) NOT NULL DEFAULT 'GBP', -- ISO currency code
  category TEXT NOT NULL,
  image_url TEXT,
  url TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'denied', 'requested', 'redeemed')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unavailable days (holidays, sick days, etc.)
CREATE TABLE unavailable_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(child_id, date)
);

-- Subscription management
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT CHECK (status IN ('trialing', 'active', 'canceled', 'incomplete', 'past_due')) NOT NULL,
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

```

### 2.2 Indexes for Performance

```sql
-- Query optimization indexes
CREATE INDEX idx_children_parent_id ON children(parent_id);
CREATE INDEX idx_sequences_child_id_status ON sequences(child_id, status);
CREATE INDEX idx_task_instances_sequence_id ON task_instances(sequence_id);
CREATE INDEX idx_task_instances_group_id ON task_instances(group_id);
CREATE INDEX idx_task_completions_child_id_due_date ON task_completions(child_id, due_date);
CREATE INDEX idx_task_completions_status ON task_completions(status);
CREATE INDEX idx_famcoin_transactions_child_id ON famcoin_transactions(child_id);
CREATE INDEX idx_wishlist_items_child_id_status ON wishlist_items(child_id, status);
CREATE INDEX idx_task_templates_category_id ON task_templates(category_id);
CREATE INDEX idx_task_templates_parent_id ON task_templates(parent_id);
CREATE INDEX idx_unavailable_days_child_date ON unavailable_days(child_id, date);

```

### 2.3 Row Level Security Policies

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE famcoin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE unavailable_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Parent can manage their own profile
CREATE POLICY parent_profile_policy ON profiles
  FOR ALL USING (auth.uid() = id);

-- Parent can manage their children
CREATE POLICY parent_children_policy ON children
  FOR ALL USING (auth.uid() = parent_id);

-- Parent can manage sequences for their children
CREATE POLICY parent_sequences_policy ON sequences
  FOR ALL USING (
    EXISTS (SELECT 1 FROM children WHERE children.id = sequences.child_id AND children.parent_id = auth.uid())
  );

-- Similar policies for all child-related tables
CREATE POLICY parent_groups_policy ON groups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sequences
      JOIN children ON children.id = sequences.child_id
      WHERE sequences.id = groups.sequence_id AND children.parent_id = auth.uid()
    )
  );

-- Task template access - system templates readable by all, user templates only by creator
CREATE POLICY task_templates_policy ON task_templates
  FOR SELECT USING (is_system = true OR parent_id = auth.uid());

CREATE POLICY task_templates_create_policy ON task_templates
  FOR INSERT WITH CHECK (parent_id = auth.uid());

CREATE POLICY task_templates_update_policy ON task_templates
  FOR UPDATE USING (parent_id = auth.uid());

```

### 2.4 Initial Data Seeding

```sql
-- Seed system task categories
INSERT INTO task_categories (name, icon, color, description) VALUES
  ('Chores', 'broom', '#4CAF50', 'Household tasks and responsibilities'),
  ('Health', 'heart', '#FF5252', 'Personal health and hygiene'),
  ('Education', 'book', '#2196F3', 'Learning and homework'),
  ('Personal Growth', 'star', '#FFC107', 'Self-improvement activities'),
  ('Family', 'people', '#9C27B0', 'Family time and relationships'),
  ('Outdoor', 'tree', '#00BCD4', 'Outdoor activities and exercise');

-- Seed initial task templates
INSERT INTO task_templates (name, description, category_id, photo_proof_required) VALUES
  ('Make Bed', 'Tidy bed with pillows arranged', (SELECT id FROM task_categories WHERE name = 'Chores'), false),
  ('Brush Teeth', 'Morning dental hygiene', (SELECT id FROM task_categories WHERE name = 'Health'), false),
  ('Do Homework', 'Complete school assignments', (SELECT id FROM task_categories WHERE name = 'Education'), true),
  ('Read for 20 Minutes', 'Daily reading practice', (SELECT id FROM task_categories WHERE name = 'Personal Growth'), false),
  ('Set Dinner Table', 'Prepare table for family meal', (SELECT id FROM task_categories WHERE name = 'Family'), false),
  ('Walk Dog', 'Take dog for daily walk', (SELECT id FROM task_categories WHERE name = 'Outdoor'), true);

```

### 2.5 Database Functions

```sql
-- Function to safely increment FAMCOIN balance
CREATE OR REPLACE FUNCTION increment_famcoin_balance(
  child_id UUID,
  amount INTEGER
) RETURNS VOID AS $$
BEGIN
  UPDATE children
  SET famcoin_balance = GREATEST(0, famcoin_balance + amount)
  WHERE id = child_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get completion statistics
CREATE OR REPLACE FUNCTION get_completion_stats(
  p_child_id UUID,
  p_date DATE
) RETURNS TABLE (
  total_tasks INTEGER,
  completed_tasks INTEGER,
  excused_tasks INTEGER,
  completion_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_tasks,
    COUNT(*) FILTER (WHERE status = 'parent_approved')::INTEGER as completed_tasks,
    COUNT(*) FILTER (WHERE status = 'excused')::INTEGER as excused_tasks,
    CASE
      WHEN COUNT(*) FILTER (WHERE status != 'excused') = 0 THEN 100
      ELSE ROUND(
        COUNT(*) FILTER (WHERE status = 'parent_approved')::NUMERIC /
        COUNT(*) FILTER (WHERE status != 'excused')::NUMERIC * 100, 2
      )
    END as completion_percentage
  FROM task_completions
  WHERE child_id = p_child_id
    AND due_date = p_date;
END;
$$ LANGUAGE plpgsql;

```

## 3. Authentication & Authorization

### 3.1 Parent Authentication

### 3.1.1 Supported Authentication Methods

- **Email/Password**: Traditional signup and signin
- **Google OAuth**: Social login via Google accounts
- **Facebook OAuth**: Social login via Facebook accounts
- **JWT Management**: Secure token handling with automatic refresh

### 3.1.2 Authentication Flow

1. Parent signs up/signs in via chosen method
2. Supabase returns JWT token
3. Profile record created/updated in database
4. Session stored in Redux with expiry tracking

### 3.2 Child Authentication

### 3.2.1 PIN System

- **4-digit PIN**: Mandatory for all child accounts
- **PIN Storage**: Hashed using bcrypt with salt
- **PIN Management**: Only parents can set/reset PINs
- **Session Duration**: 2-hour timeout for child sessions

### 3.2.2 PIN Validation Rules

- Must be exactly 4 digits
- Cannot be sequential (1234, 4321)
- Cannot be all same digit (1111)
- Validated on both client and server

## 4. Core Feature Specifications

### 4.1 Sequence Management

### 4.1.1 Sequence Creation

- Parent selects child and sequence type (weekly/fortnightly/monthly)
- Sets budget in local currency with automatic FAMCOIN conversion
- Creates groups with day-specific scheduling
- Adds tasks from templates or creates custom tasks
- System generates task_completions for entire sequence period

### 4.1.2 Cross-Child Sequence Copying

- **Purpose**: Allow parents to copy existing sequence configuration to another child
- **Flow**:
    1. Parent selects source child's sequence to copy
    2. System clones sequence structure (groups, tasks, settings)
    3. Parent redirected to edit view to adjust dates/budget
    4. New sequence created with fresh task_completions
- **Benefits**: Saves time for families with multiple children

### 4.1.3 Sequence Lifecycle

- Only one active sequence per child enforced by database constraint
- Manual ending creates notification for parent to start new sequence
- Historical sequences preserved for reporting

### 4.2 Task System

### 4.2.1 Task States

- `pending`: Initial state, awaiting child action
- `child_completed`: Child marked complete
- `parent_approved`: Parent approved, FAMCOINS awarded
- `parent_rejected`: Parent rejected with optional reason
- `excused`: Marked excused due to unavailable day

### 4.2.2 Parent Complete on Behalf

- **Purpose**: Allow parents to complete tasks for young children
- **Flow**:
    1. Parent views pending task
    2. Selects "Complete on behalf" option
    3. Task moves directly to `parent_approved` state
    4. FAMCOINS awarded to child
    5. System records parent as approver

### 4.2.3 Photo Proof System

- Optional per task template or instance
- Children can submit photos via camera or gallery
- Photos compressed and uploaded to Supabase Storage
- Parents see photo during approval process
- Tasks can be completed without photos if not required

### 4.3 Groups System

### 4.3.1 Group Properties

- Name (e.g., "Morning Routine", "After School")
- Active days (Monday-Sunday selection)
- Collection of task instances

### 4.3.2 Group Scheduling

- Tasks only appear on selected active days
- Same task can exist in multiple groups
- Group context displayed on task cards

### 4.4 FAMCOIN System

### 4.4.1 Budget Distribution

- Equal distribution across non-bonus tasks
- Remainder coins distributed to first tasks
- Bonus tasks have manually set values
- Multi-group tasks earn separately

### 4.4.2 FAMCOIN Transactions

- All transactions logged with type and reason
- Balance updates use database function for safety
- No negative balances allowed
- Manual adjustments require reason

### 4.5 Wishlist & Rewards

### 4.5.1 Wishlist Flow

1. Child creates item with price
2. Parent reviews and approves/denies
3. Child can request redemption when balance sufficient
4. Parent confirms redemption
5. FAMCOINS deducted from balance

### 4.5.2 Wishlist Categories

- Preset categories: experiences, toys, clothing, gadgets, games
- Items show both currency and FAMCOIN prices
- Parents can edit items after submission

### 4.6 Unavailable Days

### 4.6.1 Implementation

- Parent marks specific dates as unavailable
- All tasks for that day automatically set to 'excused'
- Excused tasks excluded from completion calculations
- No FAMCOIN redistribution - keeps system simple

### 4.6.2 Reporting Impact

- Completion percentage calculated as: approved / (total - excused)
- Calendar view shows excused days differently
- Historical reports account for excused tasks

## 5. State Management Architecture

### 5.1 Redux Store Structure

- **auth**: Parent/child authentication state
- **children**: Child profiles and settings
- **sequences**: Active and historical sequences
- **tasks**: Task completions and daily views
- **famcoins**: Balances and transactions
- **wishlist**: Items and redemption requests
- **ui**: Temporary UI state (not persisted)
- **offline**: Queue for offline actions

### 5.2 RTK Query APIs

- **childrenApi**: CRUD operations for children
- **sequencesApi**: Sequence management including copy functionality
- **tasksApi**: Task operations including complete-on-behalf
- **famcoinsApi**: Transaction management
- **wishlistApi**: Wishlist CRUD operations

### 5.3 Offline Support

- Redux Persist for local storage
- Optimistic updates for immediate feedback
- Offline queue for failed actions
- Automatic retry with exponential backoff
- Last-writer-wins conflict resolution

## 6. Real-time Features

### 6.1 Supabase Realtime Subscriptions

- Task completion updates for active children
- Wishlist status changes
- Sequence lifecycle notifications
- FAMCOIN balance updates

### 6.2 Push Notifications

- Task completion alerts for parents
- Wishlist approval/denial for children
- Sequence ended reminders
- Achievement celebrations

## 7. API Design Patterns

### 7.1 Base Query Structure

- Unified Supabase query builder
- Support for complex joins and filters
- Consistent error handling
- Automatic retry logic

### 7.2 Error Handling

- Standardized error codes and messages
- User-friendly error translations
- Network error detection
- Graceful degradation

## 8. Security Measures

### 8.1 Data Protection

- Row-level security on all tables
- JWT validation for all requests
- Child data scoped to parent
- PIN protection for child access

### 8.2 Input Validation

- Server-side validation for all inputs
- SQL injection prevention
- XSS protection
- Rate limiting considerations

## 9. Performance Optimization

### 9.1 Database Optimization

- Strategic indexes on common queries
- Materialized views for statistics
- Connection pooling
- Query result caching

### 9.2 Client Optimization

- Image compression before upload
- Lazy loading for large lists
- Memoization for expensive calculations
- Bundle size optimization

## 10. Deployment Configuration

### 10.1 Environment Variables

- Supabase URL and keys
- Stripe configuration
- Push notification settings
- Feature flags

### 10.2 Build Process

- Expo EAS Build for iOS
- Over-the-air updates
- Environment-specific builds
- Automated testing pipeline

## 11. Testing Strategy

### 11.1 Unit Testing

- Business logic validation
- FAMCOIN calculations
- State management
- Utility functions

### 11.2 Integration Testing

- API endpoint validation
- Database constraint testing
- Authentication flows
- Offline sync behavior

## Extra Stuff not core

## 12. Monitoring & Analytics

### 12.1 Error Tracking

- Sentry integration for crash reporting
- Custom error boundaries
- Performance monitoring
- User behavior analytics

### 12.2 Business Metrics

- Task completion rates
- FAMCOIN circulation
- User engagement
- Feature adoption

## 13. Future Considerations

### 13.1 Post-MVP Features

- Automatic sequence restart with scheduling
- Custom task categories
- Advanced reporting dashboard
- Social features and leaderboards
- AI-powered task suggestions
- Multi-language support
- Android platform support
- Web dashboard for parents

### 13.2 Technical Debt

- Implement comprehensive error boundaries
- Add request rate limiting
- Enhanced offline conflict resolution
- Data export for compliance
- Automated testing coverage
- Performance optimization pass

## 14. Summary

This Technical Requirements Document provides a complete specification for building the Famify MVP. The architecture prioritizes:

1. **Simplicity**: Manual processes where automation adds complexity
2. **Reliability**: Robust error handling and offline support
3. **Security**: Comprehensive data protection and validation
4. **Performance**: Optimized queries and client-side caching
5. **Maintainability**: Clear patterns and documentation

Key implementation priorities:

- Core sequence and task management
- FAMCOIN system with proper transaction logging
- Parent complete-on-behalf functionality
- Cross-child sequence copying
- Facebook authentication alongside Google
- Excused task handling for unavailable days

By focusing on these essentials while deferring complex features like automatic template creation and sequence auto-restart, the MVP can be delivered efficiently while providing full value to users.