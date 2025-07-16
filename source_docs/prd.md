# Famify - Final PRD (Updated)

## 1. Product Vision

Famify helps parents and children under 18 establish healthy habits and responsibilities through a fun, engaging mobile app that combines task tracking, gamified rewards, and parental oversight. The app uses sequences of tasks organised into contextual groups, with a FAMCOIN reward system tied to real-world allowances.

## 2. Target Audience

- **Primary**: Children aged 8–12
- **Secondary**: Parents aiming to instil discipline and consistency in their children
- **Tertiary**: Older or younger children (under 18)

## 3. Platform and Technology

- **Mobile Platform**: React Native (Expo)
    - **Initially optimised for**: iOS
    - **Future**: Android support post-MVP
- **Authentication**: Supabase Auth with JWT
- **Backend**: Supabase (PostgreSQL database, Storage, Edge Functions)
- **Payments**: Stripe integration for subscriptions
- **State Management**: Redux Toolkit with Redux Persist
- **Notifications**: Expo Notifications
- **Offline Support**: Redux Persist with optimistic updates and automatic sync

## 4. Core Entities and Relationships

### 4.1 User Hierarchy

- **Parent Account**: Primary account holder with full administrative control
- **Child Profiles**: Multiple children can be linked to one parent account
- **Authentication**: Children access via mandatory 4-digit PIN (parent-managed)

### 4.2 Sequence Structure

- **Sequence**: Individual collection of tasks for a specific child over a defined time period
- **One active sequence per child** at any time
- **Sequence Types**: Weekly, Fortnightly, Monthly. Each sequence has option to set 'Ongoing' which enables auto-restart
- **Auto-restart**: If selected, application automatically creates new sequence instances when period ends for each child
- **Manual Ending**: Parents can manually end sequences, triggering notification to create new sequence
- **Individual budgets**: Parent can set different budgets for each child. Therefore each child has their own FAMCOIN budget per sequence

### 4.3 Task Organisation

- **Task Templates**: Reusable task definitions (e.g., "Wash Dishes", "Make Bed")
- **Task Instances**: Specific tasks within a sequence/group with custom context
- **Groups**: Custom collections of tasks within a sequence (e.g., "Morning Routine", "After School")
- **Group Scheduling**: Each group has active days (Monday-Sunday selection)
- **Task Context**: Task instances can have custom descriptions for clarity
- **Auto-Template Creation**: When parents customise task instances, system automatically creates new templates for future reuse

### 4.4 Categories (Focus Areas)

- **System Categories**: Preset categories like Health, Education, Chores, Personal Growth
- **Custom Categories**: Parents cannot create additional categories; this is done at product level
- **Onboarding Selection**: Parents choose focus areas during child setup to prioritise category display

## 5. Core Features & Functional Requirements

### 5.1 Authentication & User Management

- **Parent Registration**: Email or social login (Google, Facebook)
- **Child Account Connection**: QR code system for linking child accounts to parent
  - Parent generates QR code from their account
  - Child scans QR code to automatically connect to parent account
  - QR codes expire after 10 minutes for security
  - Alternative manual connection via parent email/code if QR scanning unavailable
- **Child Profile Creation**: Name, age, avatar, focus area selection
- **PIN Authentication**: Mandatory 4-digit PIN for all child accounts
- **PIN Validation Rules**: 
  - Must be exactly 4 digits
  - Cannot be sequential (1234, 4321)
  - Cannot be all same digit (1111)
  - Validated on both client and server
- **PIN Management**: Parents can reset/change child PINs at any time
- **Session Management**: Secure JWT tokens with automatic refresh, 2-hour timeout for child sessions

### 5.2 Sequence Management

- **Sequence Creation**:
    - Select child
    - Choose time period (Weekly/Fortnightly/Monthly)
    - Set start date
    - Ongoing true/false
    - Define budget in local currency (£/$/€)
    - Create groups with day-specific scheduling
    - Add tasks to groups from templates or custom creation
- **Sequence Lifecycle**:
    - Auto-restart creates new sequence instance when current sequence ends
    - Parent notification sent 24 hours before auto-restart
    - Manual ending triggers notification for parent to create new sequence
    - Historical sequences preserved indefinitely for reporting
- **Cross-Child Sequence Copying**: 
    - Parents can copy existing sequence configuration from one child to another
    - System clones sequence structure (groups, tasks, settings)
    - Parent redirected to edit view to adjust dates/budget for target child
    - New sequence created with fresh task completions

### 5.3 Task System

### 5.3.1 Task Templates

- **Properties**: Name, description, default category, photo proof requirement
- **Reusability**: Templates can be used across multiple sequences and groups
- **Library**: Growing library of preset task templates organised by category
- **Custom Templates**: When parents modify task instances, new templates automatically created for future reuse
- **Template Management**: System templates readable by all, user templates only by creator

### 5.3.2 Task Instances

- **Properties**:
    - Links to task template
    - Associated group and sequence
    - Custom description for context (optional)
    - FAMCOIN value (auto-calculated)
    - Photo proof requirement (inherited from template, can be overridden)
    - Effort score (optional field for future use)
- **States**:
    - `pending` - Not yet attempted by child
    - `child_completed` - Child marked as done, awaiting parent approval
    - `parent_approved` - Parent confirmed completion, FAMCOINS awarded
    - `parent_rejected` - Parent rejected completion (with optional reason)
    - `excused` - Marked excused due to unavailable day

### 5.3.3 Photo Proof System

- **Optional Requirement**: Can be enabled per task template or instance
- **Technical Requirements**: 2MB maximum file size, 80% JPEG compression, free crop aspect ratio
- **Submission**: Children can submit photos before or after marking task complete
- **Review Process**: Parents see photo submissions during approval process
- **Flexibility**: Children can mark tasks complete without photos, but parents can reject for missing photo evidence
- **Visual Indicators**: Tasks with photo submissions show camera icon badges

### 5.3.4 Task Approval Workflow

- Child marks task as complete (with or without photo)
- Parent receives notification of pending approval
- Parent reviews task completion (including photo if provided)
- Parent can:
    - Approve: Child receives FAMCOINS, task marked as approved
    - Reject: Task returns to pending state, optional rejection reason provided
    - Complete on behalf: Parent can approve and complete tasks directly for child, moving task to `parent_approved` state with FAMCOINS awarded

### 5.4 Groups System

- **Purpose**: Contextual organisation of tasks within sequences
- **Properties**:
    - Name (e.g., "Morning Routine", "Weekend Chores", "Extra Curricular")
    - Active days selection (Monday-Sunday checkboxes)
    - Collection of task instances
- **Task Assignment**: Same task template can exist in multiple groups with different contexts
    - e.g., "Wash dishes" may appear in "morning" group as well as "after dinner" group. Parent can add description which adds context for child
    - Group name should appear on task card for child, as well as task description for context
- **Scheduling**: Groups determine when constituent tasks appear in daily views
- **No Budget Impact**: Groups are organisational only; FAMCOIN distribution remains at sequence level

### 5.5 FAMCOIN System

### 5.5.1 Currency Conversion

- **Global Rate**: Fixed conversion rate across app (default: 10 FAMCOINS = £1)
- **Configurable**: Parents can adjust conversion rate in settings
- **Display**: Parent view - All prices show both currency and FAMCOIN equivalents. Child view - Only see FAMCOIN currency

### 5.5.2 Budget & Distribution

- **Budget Setting**: Parents set budget in local currency per child per sequence
- **Equal Distribution**: FAMCOINS distributed equally across all non-bonus tasks in sequence
- **Calculation**: Each task worth (Total Budget ÷ Number of Tasks), rounded down to whole numbers
- **Remainder Handling**: Remainder coins distributed to first tasks in sequence until exhausted
- **Multi-Group - Same Task Name**: Tasks appearing in multiple groups earn FAMCOINS once each per completion/no merging
- **Bonus Tasks**: Additional one-off tasks that add FAMCOINS above base budget for current sequence and are not carried over, i.e., not part of the sequence template that auto-renews

### 5.5.3 FAMCOIN Management

- **Earning**: Children earn FAMCOINS through approved task completions
- **Balance**: FAMCOINS accumulate across sequences (not reset with new sequences)
- **Spending**: FAMCOINS spent on approved wishlist items
- **Adjustments**: Parents can manually add or deduct FAMCOINS with mandatory reason codes
- **Transaction Logging**: All FAMCOIN transactions logged with type, amount, reason, and timestamp
- **No Negative Balances**: System prevents children from having negative balances

### 5.6 Unavailable Days & Excused Tasks

- **Unavailable Day Marking**: Parents can mark specific dates as unavailable (holidays, sick days, etc.)
- **Automatic Excusal**: All tasks for marked unavailable days automatically set to 'excused' status
- **Completion Calculation**: Excused tasks excluded from completion percentage calculations
- **Reporting Impact**: Completion percentage calculated as approved / (total - excused)
- **Calendar Display**: Unavailable days shown differently in calendar views
- **No FAMCOIN Impact**: No redistribution of FAMCOINS when tasks excused

### 5.7 Wishlist & Rewards

- **Item Creation**: Children add desired items with name, description, price, category, optional image/URL
- **Status Flow**: `pending` → `approved/denied` by parent → `requested` by child → `redeemed`
- **Categories**: Preset categories (experiences, toys, clothing, gadgets, games) plus custom options
- **Parent Editing**: Parents can modify item details after child submission
- **Redemption**: Children can request redemption when sufficient FAMCOINS accumulated
- **Price Display**: Items show both real currency price and FAMCOIN cost
- **Balance Validation**: Redemption requires sufficient FAMCOIN balance

### 5.8 Calendar Integration

- **Monthly View**: Full calendar showing task completion status across all children
- **Daily View**: Detailed task list for selected day and child accessed via Tasks tab
- **Completion Indicators**: Colour-coded days showing completion status (complete/partial/incomplete)
- **Unavailable Days**: Special indication for excused days
- **Navigation**: Tapping calendar dates navigates to Tasks tab filtered to selected day
- **Task Management**: Parents can mark individual task instances complete/incomplete from daily task view

### 5.9 Home Screens

### 5.9.1 Parent Home Screen

- **Design Inspiration**: Flo app-style layout with cards and smooth scrolling
- **Top Section**: Daily statistics across all children
    - Tasks completed today (x/y format)
    - Completion percentage
    - FAMCOIN balances (with currency equivalent in small text)
- **Calendar Ribbon**: 7-day strip with completion rings (Apple Fitness style)
- **Child Progress Cards**: Individual cards per child showing daily progress
- **Pending Actions**: Section for tasks awaiting approval, wishlist items needing review, redemption requests, horizontal scrolling
- **Navigation**: Calendar icon top-right, profile icon top-left, bottom tab navigation

### 5.9.2 Child Home Screen

- **Layout**: Similar structure to parent screen, optimised for child interaction
- **Top Section**: Personal task status and motivational messaging
- **Completion Ring**: Visual progress indicator with contextual text ("Let's get started", "Nearly there", "Oh so close")
- **FAMCOIN Balance**: Prominent display in dedicated panel
- **Daily Tasks**: List of today's tasks with point values and completion status
- **Quick Actions**: Easy access to mark tasks complete, view wishlist

### 5.10 Navigation Structure

### 5.10.1 Bottom Navigation (Both Parent & Child)

- **Home**: Dashboard and daily overview
- **Tasks**: Task management with date navigation (swipe left/right between days)
- **Rewards**: Wishlist management and redemption
- **Budget**: Budget setting / FAMCOIN management (parent). FAMCOIN history (child)
- **Settings**: Account settings, preferences, subscription management

### 5.10.2 Cross-Tab Navigation

- **Calendar to Tasks**: Tapping dates in Calendar tab navigates to Tasks tab for selected day
- **Home to Tasks**: Tapping child cards navigates to Tasks tab for current day
- **Budget Deep-linking**: Tasks tab budget display links to Budget tab for editing

### 5.10.3 Task Management

- **Date Navigation**: Tasks tab includes left/right swipe between days with arrow navigation
- **Edit in Place**: All task editing accessible from main Tasks view
- **Bulk Actions**: "Select Tasks" mode for multi-delete functionality

### 5.11 Offline Support & Real-time Features

### 5.11.1 Offline Capabilities

- **Local Storage**: Critical data stored locally using Redux Persist
- **Optimistic Updates**: Immediate UI feedback for user actions with background sync
- **Offline Queue**: Actions queued when disconnected, synced when connection restored
- **Conflict Resolution**: Last-writer-wins with timestamp-based resolution
- **Connection Status**: Visual indicators for connection status and sync state

### 5.11.2 Real-time Updates

- **Live Notifications**: Badge updates for pending approvals and new wishlist items
- **Task Completion Updates**: Real-time updates for active children
- **Wishlist Status Changes**: Instant updates for approval/denial status
- **Sequence Lifecycle Notifications**: Real-time notifications for sequence events
- **FAMCOIN Balance Updates**: Immediate balance updates across devices

### 5.12 Error Handling & User Experience

### 5.12.1 Error Handling Patterns

- **Photo Upload Failures**: "Upload failed. Tap to retry" with retry button
- **PIN Failures**: 3 attempts, then "Too many attempts. Ask parent to reset PIN"
- **Network Errors**: "Connection lost. Pull down to refresh"
- **Insufficient FAMCOINS**: "Not enough FAMCOINS. You need X more" with disabled button
- **Validation Errors**: Clear, specific error messages with correction guidance

### 5.12.2 Loading States

- **Photo Uploads**: Spinner overlay on photo thumbnail
- **Sequence Creation**: Loading spinner on "Create Sequence" button
- **Task Approval**: Optimistic update (instant), rollback on failure
- **PIN Verification**: Instant local validation (no loading state)
- **Data Sync**: Clear indicators for background synchronisation

### 5.13 QR Code Account Connection

### 5.13.1 Parent QR Code Generation

- **Purpose**: Streamline child account connection process
- **Flow**:
    1. Parent accesses QR code generator from settings or onboarding
    2. System generates unique, time-limited QR code containing connection token
    3. Parent shows QR code to child device
    4. QR code expires after 10 minutes for security
- **Security**: Single-use tokens tied to parent account with encryption

### 5.13.2 Child QR Code Scanning

- **Purpose**: Easy account linking without manual data entry
- **Flow**:
    1. Child opens app on their device
    2. Selects "Connect to Parent" option
    3. Camera opens for QR code scanning
    4. Successful scan automatically links child device to parent account
    5. Child proceeds to profile setup and PIN creation
- **Fallback**: Manual connection option via parent email/code for devices without camera

### 5.13.3 Connection Management

- **One Parent Per Child**: Each child device can only be linked to one parent account
- **Multiple Children**: Parents can generate multiple QR codes for different children
- **Re-linking**: Process available if child needs to connect to different parent account
- **Verification**: Parent receives notification when child device successfully connects

### 5.14 Notifications

- **Task Reminders**: Configurable reminders for pending tasks
- **Approval Alerts**: Parents notified of completed tasks awaiting approval
- **Wishlist Updates**: Status changes on wishlist items
- **Sequence Lifecycle**: 24-hour notice before sequence auto-restart, manual end notifications
- **Achievement Celebrations**: Completion milestones and success animations
- **FAMCOIN Transactions**: Balance updates and spending confirmations
- **Connection Alerts**: Parent notified when child device successfully connects via QR code

## 6. User Interface Specifications

### 6.1 Navigation Architecture

### 6.1.1 Bottom Navigation (5 Tabs)

- **Home**: Family overview and daily progress dashboard
- **Tasks**: Task management with date navigation and sequence editing
- **Rewards**: Wishlist management and redemption
- **Budget**: FAMCOIN budgets, balances, and financial controls
- **Settings**: Account preferences, child profiles, and app configuration

### 6.1.2 Top Navigation Elements

- **Calendar Icon**: Access to full calendar view (top-right)
- **Profile Icon**: User profile and quick settings access (top-left)
- **Notifications Badge**: Alert indicator for pending actions

### 6.2 Core Screen Specifications

### 6.2.1 Home Tab (3 screens)

1. **Parent Dashboard**: Family overview with child progress cards, daily statistics, and pending actions
2. **Authentication**: Login/registration with email and social login options
3. **QR Code Generator**: Generate connection QR codes for linking child devices

### 6.2.2 Tasks Tab (7 screens)

1. **Task Management**: Current sequence view with date navigation (swipe left/right between days)
2. **Sequence Creation**: Multi-step wizard for creating new sequences with groups and tasks
3. **Sequence Copy**: Interface for copying existing sequences between children
4. **Task Selection**: Full-screen task picker with category browsing and search
5. **Task Edit**: Modal for editing individual task instances (name, description, photo proof)
6. **Group Edit**: Modal for editing group settings (name, active days)
7. **Sequence Edit**: Modal for editing sequence settings (budget display links to Budget tab)

### 6.2.3 Calendar Tab (1 screen)

1. **Calendar View**: Monthly calendar with completion indicators and unavailable day markers (tapping dates navigates to Tasks tab for selected day)

### 6.2.4 Rewards Tab (4 screens)

1. **Wishlist Management**: Parent approval interface for child wishlist items
2. **Wishlist Detail**: Individual item review with photo and description
3. **Child Wishlist**: Child's personal wishlist with redemption capabilities
4. **Add Wishlist Item**: Child item creation with photo upload

### 6.2.5 Budget Tab (3 screens)

1. **Budget Overview**: Financial dashboard with child budgets and FAMCOIN balances
2. **Budget Management**: Sequence budget adjustment interface
3. **FAMCOIN Adjustment**: Manual points addition/deduction with reason codes

### 6.2.6 Settings Tab (6 screens)

1. **Settings Dashboard**: Account overview and configuration options
2. **Child Profile Management**: Individual child settings (PIN, avatar, focus areas)
3. **Unavailable Days**: Interface for marking and managing unavailable days
4. **Notification Preferences**: Alert and reminder configuration
5. **Subscription Management**: Billing and plan management
6. **App Preferences**: Global settings (conversion rates, themes)

### 6.3 Child Interface (9 screens)

1. **Account Connection**: QR code scanner to connect to parent account with manual backup option
2. **PIN Login**: 4-digit authentication with numeric keypad
3. **Child Dashboard**: Personal progress with task overview and FAMCOIN balance
4. **Task List**: Daily tasks with completion actions and photo submission
5. **Task Detail**: Individual task information with completion interface
6. **Wishlist**: Personal reward gallery with status indicators
7. **Add Wishlist Item**: Item creation with photo capture and price input
8. **FAMCOIN History**: Transaction log and balance tracking
9. **Celebration**: Achievement animations and milestone recognition

### 6.4 Onboarding Flow (10 screens)

1. **Welcome**: App introduction and value proposition
2. **Parent Registration**: Account creation with email verification
3. **Child Connection Setup**: Instructions for connecting child devices via QR code
4. **QR Code Generation**: Generate connection codes for child devices
5. **Child Setup**: Profile creation with avatar and basic information (after QR connection)
6. **Focus Areas**: Category selection for task prioritisation
7. **First Sequence**: Initial sequence creation with budget setting
8. **Group Configuration**: Task organisation and scheduling setup
9. **PIN Creation**: Child authentication setup
10. **Tutorial Completion**: Success confirmation with next steps

### 6.5 Modal and Overlay Patterns

### 6.5.1 Edit Modals

- **Slide-up from bottom** for all editing interfaces
- **Consistent structure**: Header with Cancel/Save, form content, action buttons
- **Smart defaults**: Pre-populated fields with current values

### 6.5.2 Selection Interfaces

- **Full-screen overlays** for complex selection (task picker, category browser)
- **Grid layout** for visual selection (avatars, icons, templates)
- **Search capability** for large lists

### 6.5.3 Confirmation Dialogues

- **Centre-screen modals** for destructive actions (delete tasks, end sequence)
- **Clear action hierarchy**: Primary and secondary button styling
- **Contextual messaging**: Specific consequences explained

### 6.6 Navigation Flow Patterns

### 6.6.1 Single Source of Truth

- **Budget editing**: Only available in Budget tab (Tasks tab links to Budget)
- **Task management**: Unified in Tasks tab with date navigation
- **Calendar overview**: Calendar tab for date selection, Tasks tab for interaction

### 6.6.2 Cross-Tab Navigation

- **Calendar → Tasks**: Tap date navigates to Tasks tab filtered to selected day
- **Home → Tasks**: Tap child card navigates to Tasks tab for today
- **Budget link**: Tasks tab budget display deep-links to Budget tab

### 6.6.3 Date Navigation

- **Horizontal scrolling**: Swipe left/right between days in Tasks tab
- **Arrow navigation**: Header arrows for accessibility
- **Infinite scroll**: No date range limitations

### 6.7 Bulk Action Patterns

- **Selection mode**: "Select Tasks" button activates multi-select with checkboxes
- **Contextual actions**: Action buttons appear when items selected
- **Clear exit**: "Cancel" or "Done" to exit selection mode
- **Visual feedback**: Selected count displayed in header

### 6.8 Real-time Updates

- **Live notifications**: Badge updates for pending approvals and new wishlist items
- **Optimistic UI**: Immediate feedback for user actions with background sync
- **Status indicators**: Visual cues for connection status and sync state

## 7. Business Rules & Constraints

### 7.1 Sequence Rules

- Only one active sequence per child at any time
- Sequences automatically restart unless manually ended by parent
- Manual ending triggers notification for new sequence creation
- Historical sequences preserved indefinitely for reporting
- Sequence budgets cannot be negative

### 7.2 Task Rules

- Tasks can only be approved by parents, never auto-approved
- FAMCOINS only awarded upon parent approval
- Same task template can exist multiple times in same sequence if in different groups
- Photo proof is optional but enforceable through parent rejection
- Parents can complete tasks on behalf of children

### 7.3 FAMCOIN Rules

- FAMCOIN balances persist across sequence boundaries
- Negative balances not permitted for children
- Parents can manually adjust balances with mandatory reason codes
- Redemption requests require sufficient FAMCOIN balance
- All transactions logged with type, reason, and timestamp
- FAMCOIN calculations always round down to whole numbers

### 7.4 Unavailable Days Rules

- Parents can mark any date as unavailable for any child
- All tasks for unavailable days automatically set to 'excused'
- Excused tasks excluded from completion percentage calculations
- No FAMCOIN redistribution when tasks are excused

### 7.5 Security Rules

- Child PINs managed exclusively by parents
- PIN validation prevents common patterns (sequential, repeated digits)
- Parent approval required for all wishlist redemptions
- Photo submissions stored securely with restricted access
- All child data scoped to parent account with row-level security
- **QR Code Security**: Connection QR codes expire after 10 minutes and are single-use only
- **Account Linking**: Child devices can only be linked to one parent account at a time

### 7.6 Technical Constraints

- Photo uploads limited to 2MB maximum file size
- Photos automatically compressed to 80% JPEG quality
- Child sessions timeout after 2 hours of inactivity
- Offline actions queued and synced when connection restored
- Real-time updates use optimistic UI with rollback on failure
- **QR Code Scanning**: Requires camera permissions and QR code scanning library
- **QR Code Expiry**: Connection tokens expire after 10 minutes to prevent security issues