# ☕ CoffeeBeans — Journal + Admin

A personal journal web app with a reader sign-up/sign-in gate and a protected admin dashboard.  
Built with **Node.js + Express + SQLite**.

---

## 📁 Project Structure

```
coffeebeans/
├── server.js          ← Backend API + server
├── package.json       ← Dependencies
├── coffeebeans.db     ← SQLite database (auto-created on first run)
├── README.md
└── public/
    ├── journal.html   ← Public journal (requires reader account)
    └── admin.html     ← Admin dashboard (password protected)
```

---

## 🚀 Setup & Run

### 1. Install Node.js
Download from https://nodejs.org (v18 or newer)

### 2. Install dependencies
```bash
cd coffeebeans
npm install
```

### 3. Start the server
```bash
npm start
```

### 4. Open in browser
| Page    | URL |
|---------|-----|
| Journal | http://localhost:3000/journal.html |
| Admin   | http://localhost:3000/admin.html |

---

## 👤 Reader Accounts (Journal)

Readers must **create a free account** before accessing the journal.

- Go to `journal.html` → click **"Create Account"**
- Enter your **Full Name**, **Username**, and **Password**
- Usernames: 3–20 characters, letters/numbers/underscores only
- Passwords: minimum 6 characters
- Accounts are stored locally in the browser (`localStorage`)
- Sessions persist per browser tab (`sessionStorage`)

> **Note:** Reader accounts are stored client-side. Clearing browser data will remove them.

---

## 🔑 Admin Password

Default password: **`coffeebeans2024`**

To change it, open `server.js` and edit:
```js
const ADMIN_PASSWORD = 'coffeebeans2024';
```

---

## 📡 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/login` | — | Admin login, returns session token |
| POST | `/api/logout` | ✓ | Logout, destroys session |
| GET | `/api/entries` | — | Get all entries (public) |
| GET | `/api/entries?type=Tula` | — | Filter by type |
| GET | `/api/stats` | — | Entry counts & latest date |
| POST | `/api/entries` | ✓ | Create new entry (admin) |
| DELETE | `/api/entries/:id` | ✓ | Delete entry (admin) |

Entry types: `Tula`, `Saloobin`, `Pagninilay`, `Kuwento`

---

## 🗄️ Database

Uses **SQLite** via `better-sqlite3`. The file `coffeebeans.db` is created automatically.

Tables:
- `entries` — journal entries (id, type, title, body, created_at)
- `admin_sessions` — admin session tokens (cleared on logout)

Demo entries are seeded automatically on first run.