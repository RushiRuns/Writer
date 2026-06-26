# Quickstart & Verification Guide

This guide describes manual verification steps to validate that all Wrriter core features are working end-to-end.

## Environment Prerequisites
- Electron dev environment: `npm run start` launches the application.
- Test Vault directory: Create an empty directory on your disk (e.g., `C:\Temp\WrriterTestVault`).

---

## Verification Scenario 1: First Onboarding and Folder Initialization
1. Ensure `%APPDATA%/wrriter/config.json` does not exist or has `vaultPath` set to `null`.
2. Run `npm start`.
3. Verify that the **Onboarding Screen** appears, showing "Create New Vault" or "Open Existing Vault" options.
4. Click **Create New Vault** and select `C:\Temp\WrriterTestVault`.
5. Verify that:
   - The app transitions to the main Dashboard (with Inbox as default view).
   - Inside `C:\Temp\WrriterTestVault`, the following folders are automatically created:
     - `/Inbox`
     - `/Later`
     - `/Read`
     - `/Shop`
     - `/Watch`
     - `/Tasks`
     - `/Journal`
     - `/Archive`
     - `/Attachments`
   - `%APPDATA%/wrriter/config.json` is created containing the vault path.

---

## Verification Scenario 2: Quick-Capture and Inbox Processing
1. Navigate to the **Inbox** view.
2. Type `Read Refactoring by Martin Fowler` in the bottom input and press `Enter`.
3. Verify that:
   - The input clears.
   - The note title appears at the top of the Inbox list.
   - A file `C:\Temp\WrriterTestVault\Inbox\read refactoring by martin fowler.md` is created.
4. Select the note from the list. Verify the **Floating Toolbar** slides up.
5. Click the **📖 Read** icon in the floating toolbar.
6. Verify that:
   - The note row animates out (slides up and fades).
   - The file is physically moved to `C:\Temp\WrriterTestVault\Read\read refactoring by martin fowler.md`.
   - The Inbox count badge in Pane 1 decrements.

---

## Verification Scenario 3: Checklist View Completion
1. Click **Read** in the Pane 1 menu.
2. Verify that `read refactoring by martin fowler` is shown with an unchecked checkbox.
3. Click the checkbox.
4. Verify that:
   - The text gets a strikethrough and fades to 50% opacity.
   - After a 500ms delay, the item moves to the bottom of the list.
   - The file is updated on disk with the following frontmatter:
     ```yaml
     ---
     completed: true
     completed_at: 2026-06-26T...
     ---
     ```

---

## Verification Scenario 4: Drawing Pad Canvas PNG + JSON Save
1. Click **Drawing Pad** in Pane 1.
2. Click **[+ New Drawing]**.
3. Select the Pen tool, pick the **Amber** swatch, and draw a circle.
4. Click **Save**.
5. Check `C:\Temp\WrriterTestVault\Attachments\` and verify that two files exist:
   - `sketch-YYYY-MM-DD-HH-MM.png` (a rendered PNG image of the circle)
   - `sketch-YYYY-MM-DD-HH-MM.json` (a JSON array containing the drawn coordinates and pen strokes)
6. Clear the canvas or navigate away, then select the drawing from Pane 2 again.
7. Verify that the sketch loads and displays the circle, and clicking **Undo** removes the drawn stroke step-by-step.

---

## Verification Scenario 5: CodeMirror 6 Editor & Autocomplete WikiLinks
1. Go to **Notes**.
2. Click **[+ New Note]** inside any folder.
3. In the editor, type `This is a link to [[` and pause.
4. Verify that the autocomplete popup displays, listing available notes from the vault.
5. Use arrow keys to select a note and press `Enter`.
6. Verify the double-bracket syntax completes. Move the cursor away from the link and verify it renders as an amber underlined WikiLink pill.
