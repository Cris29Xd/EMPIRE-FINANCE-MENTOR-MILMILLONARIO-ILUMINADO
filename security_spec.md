# Security Spec: Empire Finance

## Data Invariants
- A user can only access their own profile.
- Accounts must belong to the logged-in user (`ownerId == auth.uid`).
- Transactions must belong to the logged-in user and reference a valid category.
- Mentor sessions are private to the user.
- Users cannot elevate themselves to 'admin' (if we had admins).

## The Dirty Dozen (Payloads to Block)
1. **Unauthorized Profile Read**: User A tries to read User B's profile.
2. **Identity Spoofing (Create)**: User A tries to create an account with `ownerId: UserB_ID`.
3. **Identity Spoofing (Update)**: User A tries to change the `ownerId` of their existing account to User B.
4. **Shadow Field Injection**: Adding `isPremium: true` to a profile during a regular update.
5. **Resource Exhaustion**: Sending a 1MB string in the `name` field of an Account.
6. **Negative Amount**: Creating a transaction with `amount: -1000000` to trick balance calculations (handled in UI, but rule should check if applicable).
7. **Orphaned Transaction**: Creating a transaction without an `ownerId`.
8. **PII Leakage**: Authenticated but unauthorized user trying to list all emails in the `users` collection.
9. **Chat Tampering**: Trying to edit existing messages in a `MentorSession` (only appending should be allowed, or specific controlled updates).
10. **ID Poisoning**: Using a document ID like `/../secrets` as an account ID.
11. **Future Dating**: Setting `createdAt` to a future timestamp (should be `request.time`).
12. **Metadata Bypass**: Trying to update `email` of a user profile (immutable after setup).

## Firestore Rules Plan
- Default deny.
- Helpers: `isSignedIn()`, `isOwner(userId)`, `isValidId(id)`, `isValidUser(data)`, `isValidAccount(data)`, `isValidTransaction(data)`.
- Strict key matching for all entities.
