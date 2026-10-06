# Technical Requirements

## Stack
| Layer | Choice | Reason |
|-------|--------|--------|
| Frontend | Vanilla HTML5, CSS3, JavaScript (ES modules) | No build step, light on bandwidth |
| Backend | Node.js 18+ with Express | Same language across the stack |
| Database | SQLite via `better-sqlite3` (dev), PostgreSQL optional later | Zero setup; schema is portable |
| Auth | JWT + bcryptjs | Stateless, simple |
| Hosting | Render / Vercel (optional) | Free tiers |

## Dependencies
`express`, `better-sqlite3`, `bcryptjs`, `jsonwebtoken`, `cors`, `dotenv`.

## Environment
Node >= 18. `.env` keys: `PORT`, `JWT_SECRET`.

## API Conventions
REST + JSON under `/api`. Header: `Authorization: Bearer <token>`. Errors: `{ "error": "message" }` with proper HTTP status.

## Security
bcrypt hashing, parameterized SQL only, role-check middleware, never return password hashes, reject negative readings or readings lower than the previous one.

## Tariff Logic (in `server/tariff.js`)
Illustrative tiers - **replace with the official WASAC rates before submission**:
| Usage (m3) | Rate (RWF/m3) |
|-----------|---------------|
| 0-5 | 340 |
| 6-20 | 720 |
| 21-50 | 850 |
| 50+ | 900 |
Plus a fixed monthly service fee (500 RWF).

## Testing
Manual test cases per feature plus Node assertions for tariff calculation (`npm test`).
