# Security Spec for THOR4TECH Studio

1. **Data Invariants:**
- A video must belong to a valid client.
- `clients` can only be created by admins.
- `videos` can be read by admins, or their specific editor (where `editor_id == request.auth.uid`), or viewers who have the `client_id` in their `client_ids` array.
- `comments` are readable by anyone who can read the associated video. Any authenticated user can create a comment if they can read the video. Only the author or an admin can delete their comment.
- `pipeline_logs` are read-only for non-admins (or only viewable by those who can read the video).
- `users` can only be modified by admins. `users` can read their own document.

2. **The "Dirty Dozen" Payloads:**
1. Create client as non-admin
2. Read client as non-admin/non-viewer
3. Create video missing client_id
4. Editor reading unassigned video
5. Fake editor assignment (changing editor_id as editor)
6. Comment on video without read access
7. Fake comment author (author_id != auth.uid)
8. Update video status skipping steps (e.g. state shortcut)
9. Delete review comment as non-author
10. Orphaned comment (missing video_id)
11. Inject 1MB string into video title
12. Modify user role as non-admin

3. **Firestore Test Runner:**
(To be implemented in tests)
