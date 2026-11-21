# Meeting Room Booking System

A full-stack meeting room booking application built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **SQLite (`better-sqlite3`)**. The system allows employees to explore rooms, book conference slots with strict business rule validation and concurrency protection (no double-booking races), cancel bookings, and search for available rooms matching required capacities.

---

## 1. Quick Start & Prerequisites

### Prerequisites
- **Node.js**: `v18.18+` or `v20+` / `v24+`
- **npm**: `v9+` or `v10+`

### Installation & Setup

From the root directory or inside `workspace-sheduler`:

```bash
# From workspace-sheduler:
cd workspace-sheduler
npm install --legacy-peer-deps
npm run dev

# Or from root:
npm install --legacy-peer-deps
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

To run the full test suite (45 tests across unit, integration, and concurrency):
```bash
npm test
```

For full architecture details, concurrency discussion, API reference, and declaration, see [workspace-sheduler/README.md](./workspace-sheduler/README.md).
