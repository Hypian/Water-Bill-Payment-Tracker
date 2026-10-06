# Implementation Plan

| Phase | Weeks | Deliverables |
|-------|-------|--------------|
| 1. Analysis | 1 | Collect real tariff, interview 3-5 users, finalise PRD |
| 2. Design | 2 | Wireframes, palette, schema finalised |
| 3. Backend core | 3-4 | Auth, meters, readings, tariff, bills (tested in Postman) |
| 4. Payments & history | 5 | Simulated MoMo payment, receipts, filters |
| 5. Frontend | 6-8 | Login, dashboard, bills, pay, history, admin |
| 6. Charts & polish | 9 | Consumption chart, responsive fixes, error handling |
| 7. Testing | 10 | Test cases, bug fixes, user testing |
| 8. Deployment & report | 11-12 | Deploy, final report, demo |

## Milestones
M1 auth + schema - M2 correct billing - M3 payments + history - M4 full UI - M5 deployed.

## Risks
| Risk | Mitigation |
|------|------------|
| No real MoMo API access | Simulate; document integration path |
| Tariff inaccuracies | Single config file |
| Time overrun | Drop F7-F9 first |

## Next Steps
1. `cd server && npm install && npm run seed && npm start`
2. Open http://localhost:3000
3. Add remaining pages (meters, history, admin) using `public/js/api.js`
