# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-05-04

### Added
- **Custom Hooks Architecture**: Implemented `useNotifications` and `useMatchDetail` to centralize business logic, real-time subscriptions, and state management.
- **Unified Notification Types**: Added `Notification` and `NotificationData` interfaces to `db.ts` for full type safety in messaging systems.
- **Conversation API**: New utility functions in `lib/chat/api.ts` for managing multi-entity chats (matches, bookings, etc.).

### Fixed
- **Type Safety**: Resolved all TypeScript errors across `AuthContext`, `FriendsPage`, and `MatchDetailPage` after schema updates.
- **Environment Stability**: Resolved "Native Binding" errors on macOS (ARM64) by updating `pnpm-workspace.yaml` overrides and restoring native Rollup/Tailwind binaries.
- **Notification Filtering**: Ensured notifications are correctly filtered by `user_id` and removed legacy test data from the production database.
- **Permissions Access**: Corrected navigation logic that was sending players to owner-only management pages, triggering permission errors.

### Changed
- **MatchDetailPage Refactor**: Extracted ~400 lines of logic into `useMatchDetail` hook, improving component maintainability and readability.
- **NotificationsPage Refactor**: Migrated to `useNotifications` hook, simplifying real-time event handling and redirection logic.
- **Improved Redirection**: Notifications now redirect players to `/mis-reservas` and owners to `/canchas/:id/agenda`.

---

## [0.1.0] - 2026-05-04
*Initial MVP State before major refactor.*
