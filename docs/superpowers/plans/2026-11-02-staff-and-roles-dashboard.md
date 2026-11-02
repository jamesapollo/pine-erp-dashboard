# Staff and Roles (Dashboard) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Staff, Staff detail, Roles and Role detail screens, plus a public accept-invite page, on top of
the staff API.

**Architecture:** This follows the existing screens. Self-contained React Query hooks live under
`hooks/api/{queries,mutations}/staff/`. Store-scoped keys start with `['stores', storeId, …]`. Pages live in
`pages/store/` and components in `components/store/`. React Hook Form with Zod handles the forms. Every screen sits
under `RequirePermission slug="staff.view"`, and `staff.manage` gates the actions inside the screens.

**Tech Stack:** React 19, React Router 6, TanStack Query 5, React Hook Form 7 with Zod 3, Tailwind 3, Vitest, MSW 2.

**Spec:** `../commerce-erp-api/docs/superpowers/specs/2026-11-02-staff-and-roles-design.md`. **Prerequisite:** the
API plan `../commerce-erp-api/docs/superpowers/plans/2026-11-02-staff-and-roles-api.md` is merged. Its Interfaces
blocks give the exact response shapes; mirror them in the types.

**Designs:** the Commerce ERP design system's `ui_kits/admin/Staff.jsx`, `StaffDetail.jsx` and `Roles.jsx`. Open
them with **DesignSync** (project `45d60803-0b17-44d5-abe4-afe6f29b1d79`, `get_file`). Build from the designs, with
the copy changes this plan lists.

## Global Constraints

- Follow `CLAUDE.md`:
  - No inline paths or query keys.
  - `storePath(store.id, …)` for store-scoped requests.
  - `getActionErrorMessage` for failed actions.
  - `FormErrorMessage` for field errors.
  - Full-word identifiers.
  - Import order.
- The role-change copy reads **"Takes effect straight away"**, not the design's "next time they sign in".
- System roles are read-only. The editor says: "Built-in roles can't be changed. Create a custom role to choose
  permissions."
- The role editor never shows `store.view`, `staff.view` or `staff.manage`. "n of N" counts only the permissions
  the editor shows, and the Owner role shows "All".
- Permission dependencies in the editor:
  - Ticking `X.manage` also ticks `X.view` (catalogue, pricing, inventory, orders), and ticking `fulfilment.manage`
    also ticks `orders.view`.
  - Unticking a view permission unticks every manage permission that needs it.
- For the Owner member, the name stays editable; the role card, the status actions and the remove card are hidden.
- Run `npm run typecheck && npm run lint && npm test` before each commit. Commit messages end with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Work on branch `feature/staff-screens`, merge it into `main` locally when everything passes, run the tests and
  delete the branch. Never push.

## Review Focus

1. **A role change saved while someone else changed the role list.** After Save, the member detail and the roles
   list both refetch (invalidate `staff(storeId)` and `roles(storeId)`), so member counts are never stale. Task 3
   covers this.
2. **The accept-invite page opened while signed in as the invited person.** The page shows the one-button accept,
   not the sign-in prompt. After accepting, the `me` query is invalidated so the shell loads the new store. Task 6
   covers this.
3. **Reloading `/accept-invite` after a successful accept.** The token is now used, so the page shows "This invite
   link no longer works", not a crash. Task 6 covers this.
4. **An invite dialog submitted with an email already on the team.** The API's 422 message shows under the email
   field, and the dialog stays open. Task 2 covers this.
5. **Leaving the role editor with unsaved ticks.** `useBlocker` asks "Discard changes?", the same as
   `ProductDetailForm`. Task 5 covers this.

---

## File Structure

```
src/types/staff.ts                       # StaffMember, StaffRole, Role, RoleDetail, PermissionItem, InvitationPreview
src/constants/routes.ts                  # STAFF, STAFF_MEMBER, ROLES, ROLE_DETAIL, ACCEPT_INVITE + builders
src/constants/permissions.ts             # PERMISSION_GROUPS, HIDDEN_PERMISSION_SLUGS, PERMISSION_DEPENDENCIES
src/utils/rolePermissions.ts (+ .spec.ts)  # togglePermission, countVisiblePermissions
src/hooks/api/queryKeys.ts               # staff, staffList, staffMember, roles, roleList, role, permissions
src/hooks/api/queries/staff/             # useStaffQuery, useStaffMemberQuery, useRolesQuery, useRoleQuery,
                                         # usePermissionsQuery, useInvitationQuery
src/hooks/api/mutations/staff/           # useInviteStaffMutation, useResendInvitationMutation,
                                         # useRevokeInvitationMutation, useUpdateStaffMemberMutation,
                                         # useStaffStatusMutation, useSendStaffPasswordResetMutation,
                                         # useRemoveStaffMemberMutation, useSaveRoleMutation,
                                         # useDeleteRoleMutation, useAcceptInvitationMutation
src/components/store/                    # StaffTable, InviteStaffDialog (+ inviteStaffSchema), StaffHeaderActions,
                                         # StaffProfileCard, StaffRoleCard, RolePermissionsList, RemoveStaffCard,
                                         # RolesTable, NewRoleDialog (+ roleSchema), RoleEditorForm, DeleteRoleDialog
src/components/auth/AcceptInviteForm.tsx
src/pages/store/StaffPage.tsx, StaffMemberPage.tsx, StaffMemberRoute.tsx, RolesPage.tsx, RoleDetailPage.tsx,
                RoleDetailRoute.tsx
src/pages/AcceptInvitePage.tsx
src/tests/fixtures/staff.ts              # buildStaffMemberFixture, buildRoleFixture, buildRoleDetailFixture,
                                         # buildPermissionListFixture
src/tests/mocks/endpoints.ts             # staff, staffMember, staffInvitations, staffInvitation, staffStatus,
                                         # roles, role, permissions, invitation, acceptInvitation
src/tests/features/Staff/*.spec.tsx, Roles/*.spec.tsx, AcceptInvite/AcceptInvite.spec.tsx
```

---

### Task 1: Types, routes, keys, permissions and the shell

**Files:**
- Create: `src/types/staff.ts`, `src/constants/permissions.ts`, `src/utils/rolePermissions.ts` and its spec,
  `src/tests/fixtures/staff.ts`.
- Modify: `src/constants/routes.ts`, `src/hooks/api/queryKeys.ts`, `src/types/routeHandle.ts`
  (`trailingCrumb` adds `'staffMemberName' | 'roleName'`), `src/components/layout/Sidebar.tsx`,
  `src/components/layout/Topbar.tsx`, `src/Router.tsx`, `src/tests/mocks/endpoints.ts`,
  `src/tests/fixtures/user.ts` (add `staff.view` and `staff.manage` to the default permissions),
  `src/tests/features/Orders/OrdersList.spec.tsx` (sidebar order).

**Interfaces:**
- Produces:
  - `ROUTES.STAFF = '/staff'`, `STAFF_MEMBER = '/staff/:memberId'`, `ROLES = '/roles'`,
    `ROLE_DETAIL = '/roles/:roleId'` and `ACCEPT_INVITE = '/accept-invite'`.
  - `buildStaffMemberPath(memberId)` and `buildRolePath(roleId)`.
  - `PERMISSION_GROUPS: { label: string; slugs: string[] }[]`:
    - Catalogue: `catalogue.view`, `catalogue.manage`.
    - Pricing: `pricing.view`, `pricing.manage`.
    - Inventory: `inventory.view`, `inventory.manage`.
    - Orders: `orders.view`, `orders.manage`, `fulfilment.manage`.
  - `HIDDEN_PERMISSION_SLUGS` is `['store.view', 'staff.view', 'staff.manage']`.
  - `PERMISSION_DEPENDENCIES: Record<string, string>` maps each manage permission to the view permission it needs.
  - `togglePermission(selected: string[], slug: string, isChecked: boolean): string[]` adds or removes the slug
    and keeps the dependencies valid. The result is in `PERMISSION_GROUPS` order.
  - `countVisiblePermissions(slugs: string[]): number`.
  - Sidebar: the Store group shows when the user has `orders.view` or `staff.view`. It lists Staff (Users icon) and
    Roles (ShieldCheck icon), each with `staff.view`, then Delivery zones, with `orders.view`.
  - Routes `STAFF`, `STAFF_MEMBER`, `ROLES` and `ROLE_DETAIL` sit under
    `<RequirePermission slug="staff.view" message="You don't have access to staff." />`, with crumbs
    `['Store','Staff']` and `['Store','Roles']`. `ACCEPT_INVITE` sits next to `RESET_PASSWORD`, outside both
    `GuestRoute` and `ProtectedRoute`.

- [ ] **Step 1: Write the failing tests**

  In `rolePermissions.spec.ts`:
  - Ticking `catalogue.manage` on `[]` gives `['catalogue.view','catalogue.manage']`.
  - Ticking `fulfilment.manage` gives `['orders.view','fulfilment.manage']`.
  - Unticking `orders.view` from `['orders.view','orders.manage','fulfilment.manage']` gives `[]`.
  - Unticking `catalogue.manage` keeps `catalogue.view`.
  - `countVisiblePermissions(['store.view','orders.view'])` is 1.

  In `OrdersList.spec.tsx`, the sidebar link order includes Staff and Roles before Delivery zones.

- [ ] **Step 2: Run them and watch them fail**

  Run `npx vitest run src/utils/rolePermissions.spec.ts src/tests/features/Orders/OrdersList.spec.tsx`.

- [ ] **Step 3: Implement**

  The pages Task 1 routes to can be placeholder pages that render their `PageHeader`; later tasks fill them in.

- [ ] **Step 4: Run them and watch them pass**

  Run the same command, then `npm run typecheck`.

- [ ] **Step 5: Commit** as `feat(staff): routes, types and permission rules`.

---

### Task 2: Staff list and invite

**Files:**
- Create: `useStaffQuery.ts`, `useRolesQuery.ts`, `useInviteStaffMutation.ts`, `StaffTable.tsx`,
  `InviteStaffDialog.tsx`, `inviteStaffSchema.ts`, `StaffPage.tsx` (replacing the placeholder).
- Test: `src/tests/features/Staff/StaffList.spec.tsx`.

**Interfaces:**
- Produces:
  - `useStaffQuery()` calls `GET staff` and returns `StaffMember[]`. It uses `refetchOnMount: 'always'`.
  - `useRolesQuery()` calls `GET roles` and returns `Role[]`.
  - `useInviteStaffMutation()` takes `{ email, roleId }`.
    - On success it toasts "Invite sent to {email}" and invalidates `staff(storeId)` and `roles(storeId)`.
    - On error it shows nothing itself; the dialog maps errors with `getFieldError`.
  - `StaffTable` columns: avatar and name, email, role badge (with a "Built-in" tone for system roles), status
    (Invited / Active / Deactivated), and last active.
    - Last active is relative, like "5 min ago", with "Never" when null.
    - For an invited member it reads "Invited · expires {date}".
    - Each row links to `buildStaffMemberPath(id)`.
  - The header holds "Manage roles" (a link to `ROUTES.ROLES`) and "Invite staff". Both need `staff.manage`.
  - The invite dialog's role picker lists every role except the Owner. Its hint reads
    "{n} permissions", using `countVisiblePermissions`.

- [ ] **Step 1: Write the failing tests**
  - `it('lists the team with roles, statuses and last active')`: the rows show the names, "Owner", "Invited" and
    "Never".
  - `it('invites someone and refreshes the list')`: fill in the email, pick "Staff", and click "Send invite". The
    POST body is `{ email, role_id }`, the toast "Invite sent to ama@example.com" shows, and the list refetches.
  - `it('shows the APIs message under the email')`: a 422 `{ errors: { email: ['This person is already on the team.'] } }`
    shows under the field, and the dialog stays open.
  - `it('hides invite and manage roles without staff.manage')`.
  - `it('shows no access without staff.view')`: the text "You don't have access to staff." appears.

- [ ] **Step 2: Run them and watch them fail**

  Run `npx vitest run src/tests/features/Staff/StaffList.spec.tsx`.

- [ ] **Step 3: Implement from `Staff.jsx`**

- [ ] **Step 4: Run them and watch them pass**

- [ ] **Step 5: Commit** as `feat(staff): staff list and invite dialog`.

---

### Task 3: Staff member detail

**Files:**
- Create: `useStaffMemberQuery.ts`, `useResendInvitationMutation.ts`, `useRevokeInvitationMutation.ts`,
  `useUpdateStaffMemberMutation.ts`, `useStaffStatusMutation.ts`, `useSendStaffPasswordResetMutation.ts`,
  `useRemoveStaffMemberMutation.ts`, `StaffHeaderActions.tsx`, `StaffProfileCard.tsx`, `StaffRoleCard.tsx`,
  `RolePermissionsList.tsx`, `RemoveStaffCard.tsx`, `StaffMemberPage.tsx`, `StaffMemberRoute.tsx`.
- Modify: `Topbar.tsx` (the `staffMemberName` crumb).
- Test: `src/tests/features/Staff/StaffMember.spec.tsx`.

**Interfaces:**
- Consumes: `useRolesQuery`, from Task 2.
- Produces:
  - Every member mutation writes the returned member into `staffMember(storeId, id)` (the 204 ones refetch it
    instead) and invalidates `staff(storeId)` and `roles(storeId)`.
  - Toasts:
    - "Invite resent"
    - "Invite revoked" (then navigate to `ROUTES.STAFF`)
    - "Name saved"
    - "Role changed"
    - "{name} deactivated" and "{name} reactivated"
    - "Reset link sent to {email}"
    - "{name} removed" (then navigate to `ROUTES.STAFF`)
  - `useStaffStatusMutation()` takes `{ memberId, action: 'deactivate' | 'reactivate' }`.
  - Header actions by status:
    - invited: Revoke invite, Resend invite.
    - active: Send reset link, Deactivate.
    - suspended: Reactivate. (The API sends reset links to active members only.)
  - Deactivate, Revoke and Remove each confirm in a `Dialog` first.
  - The role card is a `Select` of the roles that aren't Owner. Save and Discard stay disabled until the role
    changes. The hint reads "Takes effect straight away".
  - `RolePermissionsList` renders "What {role} can do" from the role's permissions, grouped by `PERMISSION_GROUPS`
    and leaving out hidden slugs.
  - `StaffMemberRoute` renders `NotFoundPage` for a non-numeric `:memberId`. A 404 from the API also shows
    `NotFoundPage`, the same as `StockVariantPage`.

- [ ] **Step 1: Write the failing tests**
  - `it('shows an invited member with resend and revoke')`: resend toasts "Invite resent".
  - `it('changes the role and refreshes the list')`: pick Manager and Save. The PATCH body is `{ role_id }`, the
    toast "Role changed" shows, and "Takes effect straight away" is visible.
  - `it('deactivates after confirming, then offers reactivate')`.
  - `it('removes after confirming and returns to the list')`: `router.state.location.pathname` is `/staff`.
  - `it('lets the owner rename themselves but hides the rest')`: the owner fixture (`is_owner: true`) has a name
    field, and no role card, Deactivate or Remove.
  - `it('shows action errors in place')`: a 409 on deactivate shows "Something went wrong. Try again." in the
    dialog.
  - `it('is read-only without staff.manage')`.

- [ ] **Step 2: Run them and watch them fail**

  Run `npx vitest run src/tests/features/Staff/StaffMember.spec.tsx`.

- [ ] **Step 3: Implement from `StaffDetail.jsx`**

- [ ] **Step 4: Run them and watch them pass**

- [ ] **Step 5: Commit** as `feat(staff): staff member detail`.

---

### Task 4: Roles list and new role

**Files:**
- Create: `RolesTable.tsx`, `NewRoleDialog.tsx`, `roleSchema.ts` and its spec, `useSaveRoleMutation.ts`,
  `RolesPage.tsx`.
- Test: `src/tests/features/Roles/RolesList.spec.tsx`.

**Interfaces:**
- Produces:
  - `roleSchema` validates `{ name: string trimmed, 1–60 characters; description: max 255 }`. The messages are
    "Enter a role name." and "Keep the name to 60 characters."
  - `useSaveRoleMutation()` takes `{ roleId?, body: { name?, description?, permissions? } }`. It POSTs when there's
    no `roleId` and PATCHes otherwise, writes the result into `role(storeId, id)`, invalidates `roles(storeId)` and
    `staff(storeId)`, and toasts "Role created" or "Role saved".
  - `RolesTable` columns: name with a "Built-in" badge, description, permissions ("All" for Owner, otherwise
    "{n} of {N}" from `countVisiblePermissions` and the length of the visible catalogue), and members as up to 4
    avatars plus "+n".
  - The New role dialog creates the role with `permissions: []` and navigates to `buildRolePath(newId)`.

- [ ] **Step 1: Write the failing tests**
  - `it('lists built-in and custom roles with counts')`: "All", "6 of 9" and "Built-in" are visible.
  - `it('creates a role and opens it')`: the pathname becomes `/roles/7`.
  - `it('shows the APIs name clash under the name')`: a 422 on `name` shows "A role with this name already exists."
  - `it('hides New role without staff.manage')`.

- [ ] **Step 2: Run them and watch them fail**

  Run `npx vitest run src/tests/features/Roles/RolesList.spec.tsx src/components/store/roleSchema.spec.ts`.

- [ ] **Step 3: Implement from `Roles.jsx`**

- [ ] **Step 4: Run them and watch them pass**

- [ ] **Step 5: Commit** as `feat(roles): roles list and new role`.

---

### Task 5: Role editor

**Files:**
- Create: `useRoleQuery.ts`, `usePermissionsQuery.ts`, `useDeleteRoleMutation.ts`, `RoleEditorForm.tsx`,
  `DeleteRoleDialog.tsx`, `RoleDetailPage.tsx`, `RoleDetailRoute.tsx`.
- Modify: `Topbar.tsx` (the `roleName` crumb).
- Test: `src/tests/features/Roles/RoleDetail.spec.tsx`.

**Interfaces:**
- Consumes: `togglePermission` and `PERMISSION_GROUPS` from Task 1, and `useSaveRoleMutation` and `roleSchema`
  from Task 4.
- Produces:
  - The form holds `{ name, description, permissions: string[] }`. Checkboxes are driven by `useWatch` plus
    `setValue('permissions', togglePermission(…), { shouldDirty: true })`.
  - Each group has a "Select all" or "Clear all" toggle, which goes through `togglePermission` slug by slug.
  - Labels come from `usePermissionsQuery` descriptions.
  - The members table lists name, email and status, and links to each member.
  - Delete role opens a confirmation dialog; on success it toasts "Role deleted" and navigates to `ROUTES.ROLES`.
    The API's 422 ("Move this role's members to another role before deleting it.") shows in the dialog.
  - System roles render every input disabled, with no Save or Delete, and the built-in copy from Global
    Constraints.
  - `useBlocker` asks "Discard changes?" when the form is dirty.

- [ ] **Step 1: Write the failing tests**
  - `it('ticks the view permission when a manage one is ticked')`: tick "Manage the catalogue", and "View the
    catalogue" becomes checked.
  - `it('saves the chosen permissions')`: the PATCH body's `permissions` is `['catalogue.view','catalogue.manage']`,
    and the toast "Role saved" shows.
  - `it('shows a built-in role read-only')`: the checkboxes are disabled and the copy is visible.
  - `it('refuses to delete a role people hold')`: the API message shows in the dialog.
  - `it('asks before leaving with unsaved changes')`: "Discard changes?" appears.

- [ ] **Step 2: Run them and watch them fail**

  Run `npx vitest run src/tests/features/Roles/RoleDetail.spec.tsx`.

- [ ] **Step 3: Implement from `Roles.jsx`**

  Use the role detail part of that file.

- [ ] **Step 4: Run them and watch them pass**

- [ ] **Step 5: Commit** as `feat(roles): role editor`.

---

### Task 6: Accept invite

**Files:**
- Create: `useInvitationQuery.ts`, `useAcceptInvitationMutation.ts`, `AcceptInviteForm.tsx` and its schema,
  `AcceptInvitePage.tsx`.
- Modify: `src/utils/safeRedirect.ts`, only if it rejects `/accept-invite?token=…`.
- Test: `src/tests/features/AcceptInvite/AcceptInvite.spec.tsx`.

**Interfaces:**
- Produces:
  - `useInvitationQuery(token)` calls `GET /api/v1/invitations/{token}` and resolves a 404 to `null`, the way
    `getMe` handles a 401.
  - `useAcceptInvitationMutation()` runs `ensureCsrfCookie()` and then the POST. On success it invalidates `me`
    and navigates to `ROUTES.ROOT`.
  - The page, in the `AuthLayout`, reads `token` from the search params. It shows one of these states:
    - Missing token, or a `null` preview: "This invite link no longer works", with a link to sign in.
    - `has_password: false`: the form, with a name and a password plus its confirmation (same rules and messages
      as `ResetPasswordForm`). The button reads "Join {store}".
    - `has_password: true` and signed out (`useSession` is `anon`): "Sign in as {email} to join {store}", which
      links to `ROUTES.LOGIN?redirect=/accept-invite?token=…`.
    - `has_password: true` and signed in: a "Join {store}" button. A 403 from it shows the API's message, plus a
      Sign out button using `useSignOut`.

- [ ] **Step 1: Write the failing tests**
  - `it('lets a new person join')`: fill in the name and both passwords, then submit. The POST body has `name`,
    `password` and `password_confirmation`, and the pathname becomes `/`.
  - `it('sends someone with a password to sign in and back')`: the sign-in link's `href` contains
    `redirect=%2Faccept-invite%3Ftoken%3D`.
  - `it('accepts with one button when signed in')`.
  - `it('says when the link no longer works')`: a 404 preview, a missing token, and a reload after a successful
    accept, which now gets a 404.
  - `it('shows a signed-in-as-someone-else message with sign out')`: the 403 message is visible.

- [ ] **Step 2: Run them and watch them fail**

  Run `npx vitest run src/tests/features/AcceptInvite/AcceptInvite.spec.tsx`.

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run them and watch them pass**

- [ ] **Step 5: Commit** as `feat(staff): accept invite page`.

---

### Task 7: Conventions doc, then finish

**Files:**
- Modify: `CLAUDE.md`:
  - §1 and §2 trees: `store/` now holds the staff and roles screens.
  - §6 hooks tree: add `staff/`.
  - §8: the routes, the `staff.view` gate and its copy, the `staffMemberName`/`roleName` crumbs, and the public
    `ACCEPT_INVITE`. Also remove "There is no sign-up route: staff accounts are created by an administrator" and
    replace it with the invite flow.
  - §10 types.
  - §13 fixtures.

- [ ] **Step 1: Update `CLAUDE.md`**

- [ ] **Step 2: Verify**

  Run `npm run typecheck && npm run lint && npm test && npm run build`. Expect all of it to pass.

- [ ] **Step 3: Check it against the real API**

  With the API on `:8000` and Vite on `:5173`, use Playwright to invite a test email and open the link from the
  queued mail (`MAIL_MAILER=log`, so read `storage/logs/laravel.log`). Accept the invite, then change the person's
  role and deactivate them. Screenshots go under `.playwright-mcp/`.

- [ ] **Step 4: Commit, merge and delete the branch**

  Commit as `docs: staff and roles conventions`. Then run `git checkout main && git merge feature/staff-screens`,
  then `npm test`, then `git branch -d feature/staff-screens`.
