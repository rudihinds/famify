Technology Stack
Use React Native with Expo for the mobile app, Supabase for backend authentication and database, Redux Toolkit with RTK Query for state management, and Redux Persist for offline support. Store sensitive data using Expo SecureStore. Handle navigation with React Navigation. Implement QR code scanning using appropriate Expo camera libraries and QR generation libraries. For social authentication, use Expo's auth session capabilities.
Database Requirements
Create the following tables:

Profiles table - Stores parent account information linked to Supabase auth users
Children table - Stores child profiles linked to parent accounts, including PIN hashes and device IDs
Connection tokens table - Manages temporary QR codes for linking child devices
Child sessions table - Tracks active child sessions with 2-hour expiry

Include appropriate indexes for performance, especially on token fields and foreign keys.
Authentication Flows to Implement
Parent Authentication Flow

Registration Options

Email and password registration with first name, last name
Google OAuth registration
Facebook OAuth registration
Auto-create profile record after successful registration


Login Options

Email and password login
Google OAuth login
Facebook OAuth login
Remember login state across app launches


Session Management

Maintain persistent parent sessions
Handle token refresh automatically
Logout functionality that clears all stored data



Child Device Connection Flow

QR Code Generation (Parent Side)

Parent enters child's name
Generate unique connection token
Display QR code with 10-minute expiry
Show countdown timer on screen
Prevent reuse of expired or used tokens


QR Code Scanning (Child Side)

Request camera permissions
Scan parent's QR code
Validate token hasn't expired
Verify token with backend
Handle camera permission denial gracefully


Child Profile Setup

Collect child's name (pre-filled from QR data)
Collect child's age
Avatar selection from predefined grid
Focus areas selection (categories like Health, Education, Chores)
Store device ID for future logins


PIN Creation

4-digit PIN entry with visual feedback
Validation rules:

Must be exactly 4 digits
Cannot be sequential (1234, 4321, etc.)
Cannot be all same digit (1111, 2222, etc.)


Confirm PIN entry
Hash PIN before storage
Store PIN hash locally for offline validation



Daily Child Login Flow

PIN Login Screen

Numeric keypad interface
4 dots showing input progress
Clear error messages for invalid attempts
Show remaining attempts (max 3)
5-minute lockout after 3 failed attempts


Offline PIN Validation

Check PIN against locally stored hash when offline
Create offline session if valid
Queue sync when connection restored


Session Management

Create 2-hour session on successful login
Monitor user activity
Auto-logout after 2 hours of inactivity
Update last activity timestamp on user interactions
Show warning before session expires



Parent Child Management Features

View Linked Children

List all children connected to parent account
Show device connection status
Display last login time


PIN Reset Functionality

Parent can reset any child's PIN from settings
Validate new PIN with same rules
Invalidate all active sessions for that child
Force child to login with new PIN


Remove Child Device

Unlink child device from parent account
Clear all child data from that device



Error Handling Requirements
Implement user-friendly error messages for:

Network Errors

No internet connection
Server unreachable
Request timeout


Authentication Errors

Invalid credentials
Account already exists
Social login failures
Expired sessions


QR Code Errors

Expired QR code
Already used QR code
Invalid QR format
Camera permission denied


PIN Errors

Invalid PIN format
Too many attempts
Account locked



State Management Requirements

Persist These Values

Device type (parent/child/unlinked)
Parent authentication tokens
Child profile and session data
PIN attempt count and lock status
Last activity timestamp


Handle State Transitions

Unlinked → Parent (after parent login)
Unlinked → Child (after QR scan and setup)
Active → Locked (after failed PIN attempts)
Active → Expired (after 2-hour timeout)



Navigation Structure

Initial Launch

Show role selection if device unlinked
Route to appropriate login based on device type
Handle deep linking for QR connections


Parent Navigation

Unauthenticated: Login/Register screens
Authenticated: Parent tab navigation


Child Navigation

Unlinked: QR scanner screen
Linked but logged out: PIN login
Authenticated: Child tab navigation



Screen Requirements
Create these screens:
Shared Screens:

Welcome/Role Selection (I'm a Parent / I'm a Child)
Loading states for all async operations

Parent Screens:

Login (email/password + social buttons)
Registration (name, email, password fields)
Parent Dashboard (main interface)
QR Code Generator (with child name input)
Settings (manage children, reset PINs)

Child Screens:

QR Scanner (full screen camera view)
Child Profile Setup (name, age, avatar, categories)
PIN Creation (numeric pad with validation)
PIN Login (daily login interface)
Child Dashboard (task interface)

Security Requirements

Basic Security Measures

Hash all PINs before storage
Use secure storage for sensitive data
Clear sensitive data on logout
Validate all inputs on backend
Prevent QR code replay attacks
Sanitize user inputs


Session Security

Generate secure random tokens
Implement proper token expiry
Clear expired sessions
Prevent session hijacking



Success Criteria

 Parents can register and login using email/password
 Parents can register and login using Google OAuth
 Parents can register and login using Facebook OAuth
 Parents can generate QR codes with child names
 QR codes expire after 10 minutes
 Children can scan QR codes to connect to parent accounts
 Child profile setup collects name, age, avatar, and focus areas
 PIN creation enforces validation rules
 PIN login works with 3-attempt limit and 5-minute lockout
 Offline PIN validation works without internet
 Child sessions expire after 2 hours of inactivity
 Parents can reset child PINs from settings
 Parents can view all linked children
 Appropriate error messages display for all failure scenarios
 Navigation adapts based on device type and auth state
 All auth states persist across app restarts

Focus on creating a smooth, intuitive authentication experience that works reliably both online and offline. Prioritize clear error messaging and graceful handling of edge cases.