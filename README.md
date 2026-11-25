# Token Tracker

A lightweight, offline-first account and token reset tracker built with HTML, CSS, and vanilla JavaScript.

## Run
1. Extract `token-tracker.zip`.
2. Open `index.html` in a modern browser.
3. Add email accounts and provider profiles.

No Node.js, build step, backend, or installation is required.

## Features
- Group email accounts with independent provider profiles.
- Track remaining and calculated used percentages.
- Track reset date and time.
- Automatically restore a profile to 100% when its reset date has passed and show an in-app notification.
- Manually enter the next reset date after a reset.
- Mark profiles active and receive a smart recommendation.
- Dark and light themes.
- Search and manage accounts and provider profiles.
- Import JSON with merge or replace behavior.
- Export a JSON backup.
- Optional project-folder backup integration: select the project directory once, then JSON exports are written to its `backup/` subfolder and imports start there.
- Topbar notification center with unread count, recent alerts, and viewed/unviewed controls.
- In-app notifications and periodic backup reminders.

## Backup folder setup
1. Open Settings → Data & backups → Choose folder.
2. Select the Token Tracker project directory (the folder containing `index.html`).
3. The app creates and remembers the `backup/` subfolder. Export saves timestamped JSON files there; Import opens the file picker in that folder.
4. Folder access requires a browser that supports the File System Access API (typically Chromium-based browsers) and a secure context such as `http://localhost` or HTTPS. The browser asks for permission. If folder access is unavailable, the app falls back to the regular JSON download and file picker.

The browser sandbox does not allow the app to silently access the project directory. The folder must be selected and authorized by the user.

## Data and limitations
- Data is stored in browser LocalStorage for the current browser profile and device.
- Export JSON backups regularly. Clearing browser data, using private browsing, or changing browsers may make locally stored data unavailable.
- Reset processing runs when the app opens or returns to the foreground. It does not run while the browser is closed.
- Notifications are shown inside the application; this static app does not send background push notifications.
- Active status is a manual tracker only. It does not switch Codex CLI, Antigravity CLI, or any provider login session.
- Recommendation ranking is a lightweight heuristic based on remaining percentage and time until reset, not a connection to provider usage APIs.

## JSON format
The app exports a versioned JSON object with `accounts`, `providers`, `notifications`, and `preferences`. Provider records contain `name`, `remainingPercentage`, `resetDate`, and `isActive`.

## Privacy
No analytics, remote database, or external API is used. The stylesheet includes a Google Fonts import for typography; if offline, the browser falls back to local system fonts.
