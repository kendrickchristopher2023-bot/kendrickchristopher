insert into public.changelog (title, body, category, published, published_at, created_by)
values (
 'Automatic sign-out and "sign out of all devices"',
 'Two changes to keep your account safer on shared or borrowed computers.

- If you leave the app open and don''t touch it for 8 hours, you''re now signed out automatically and taken back to the sign-in page with a short note explaining why. Active work is never interrupted — any click, key press or scroll resets the clock.
- Settings now has a Security section with a "Sign out of all devices" button. Use it if you think you may have left yourself signed in somewhere; it ends every session for your account everywhere, on every browser and device.

Signing out from the account menu in the top right also now clears your session more thoroughly. Nothing about your data changed — this is a precaution, not a response to any problem.',
 'improved', true, now(), '37d308dc-56ad-4597-a3d7-b24847c466d4');