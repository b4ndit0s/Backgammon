# Gammon Ledger — setup

Two parts: put the site on GitHub Pages (5 minutes), then switch on online
play with a free Firebase project (about 10 minutes). The first part alone
gives you the full game against the computer; the second adds playing
friends and chat.

---

## 1. Host it on GitHub Pages

1. On GitHub, create a new **public** repository (Pages is free for public repos), e.g. `gammon`.
2. **Add file → Upload files**, then drag in everything in this folder —
   `index.html`, `sw.js`, `manifest.webmanifest`, `firebase-config.js`,
   `backend-firebase.js`, `firestore.rules`, `.nojekyll`, and the `icons` and `vendor`
   folders. (Unzip first; don't upload the zip itself.) Commit.
3. **Settings → Pages → Build and deployment → Deploy from a branch**, choose
   `main` and `/ (root)`, **Save**.
4. After a minute or two it's live at `https://<your-username>.github.io/gammon/`.

To install on a phone: open the site, then Safari **Share → Add to Home Screen**,
or Chrome **⋮ → Install app**. It opens full-screen and the computer mode works offline.

---

## 2. Switch on online play (Firebase)

Firebase's free Spark plan needs no card. It allows 50,000 reads and 20,000
writes a day — a whole backgammon game uses a few hundred.

### a. Create the project
1. Go to <https://console.firebase.google.com> and **Create a project**.
   Any name, e.g. `gammon`. You can turn Google Analytics off.

### b. Register the web app and copy its settings
1. On the project overview, click the **Web** icon (`</>`), give it a nickname,
   and **Register app**. Skip "Firebase Hosting".
2. It shows a `firebaseConfig` block. Open `firebase-config.js` in this folder
   and copy four values across: `apiKey`, `authDomain`, `projectId`, `appId`.
   (These are safe to publish — the security rules below are what protect the data.)

### c. Turn on anonymous sign-in
1. **Build → Authentication → Get started**.
2. **Sign-in method → Anonymous → Enable → Save**.
3. **Settings → Authorized domains → Add domain** → `<your-username>.github.io`.

### d. Create the database and its rules
1. **Build → Firestore Database → Create database**.
2. Pick a location (`europe-west2 (London)` is closest for the UK) — this can't be changed later.
3. Start in **production mode**.
4. Open the **Rules** tab, replace everything with the contents of
   `firestore.rules` from this folder, and **Publish**.

### e. Upload the edited config
Upload your edited `firebase-config.js` to the GitHub repository (replacing the
old one). Reload the site; the **Online** tab now lets you create and join games.

---

## Playing

- **Online → your name → pick a match length → Create game.** Your friend can
  join from **Open games** on their Online tab with one tap, or from the link or
  six-character code. The game starts the moment they join.
- Untick **Show in Open games** when you create a game if you don't want anyone
  else who visits the site to see it; then only the link or code gets them in.
- Either of you can close the page. The game waits under **Online → Your games**
  and picks up exactly where it was — live if you're both on, or a move at a time.
- A green dot next to your friend's name means they have the game open now.
- **Chat** sits under the board. Only the two players can see it. Tap the
  smiley for emoji, the picture button to send a photo (it's shrunk to a few
  hundred KB first), or a photo of the board if you want to argue about a move.
- **Vanish** (top of the chat) makes the messages and photos you send disappear
  10 seconds after your opponent has them on screen — from both screens and
  from the database. If they're not looking, it waits until they are. It can't
  stop a screenshot.
- Anyone else with the link can **watch**, but can't move or read the chat.

## Things to know

- **Your seat lives in your browser.** Firebase signs you in anonymously, so a
  game belongs to the browser you created or joined it from. Clearing that
  browser's site data, or switching phone to laptop, loses the seat and the
  dice key for games in progress. Finish games on the device you started them.
- **The dice are fair between you.** Each browser commits to a private chain of
  random values at the start of each game; every roll combines both, and each
  revealed value is checked against the one before it. Neither player can pick
  or re-roll dice or see the other's upcoming rolls. If a roll ever fails the
  check, a warning appears above the board. One small gap: someone who digs
  into their browser's developer tools could work out their *own* next roll
  just before deciding whether to double.
- **Moves are checked too.** If an opponent's move isn't legal for their dice,
  you get a warning, though it's still shown as played.
- **Your ledger and reviews** record online games alongside computer games,
  in each player's own browser.

## Updating to a new version
1. **Publish the new rules first.** If an update includes `firestore.rules`,
   copy its contents into Firestore → Rules → Publish before anything else.
2. Upload the new files to GitHub, replacing the old ones. **Don't replace your
   edited `firebase-config.js`.**
3. Reload the site. If you still see the old version, close the tab and reopen it.

## Updating later
Replace the files on GitHub with the new ones — but **keep your edited
`firebase-config.js`**. Installed copies update themselves on their next launch.
