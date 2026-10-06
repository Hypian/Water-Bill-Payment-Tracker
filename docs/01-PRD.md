# Product Requirements Document (PRD)
**Project:** WaterBill Tracker – Water Bill Payment & History System (Rwanda)

## 1. Problem
Households and small businesses in Rwanda often lose track of water bills, pay late, and cannot easily prove past payments. Paper receipts get lost and there is no single view of consumption and payment history.

## 2. Goals
- Let a customer view bills, pay them, and see full payment history.
- Let an admin register meters, record readings and generate bills.
- Show consumption trends and outstanding balance.

## 3. Users
| Role | Description |
|------|-------------|
| Customer | Household/business owning one or more water meters |
| Admin / Billing Officer | Enters meter readings, generates bills, monitors payments |

## 4. Functional Requirements
| ID | Requirement | Priority |
|----|-------------|----------|
| F1 | Register / login (customer, admin) | Must |
| F2 | Customer manages meters (meter no., location) | Must |
| F3 | Admin records monthly meter reading | Must |
| F4 | System generates bill = tiered tariff x consumption + fixed fee | Must |
| F5 | Customer pays bill (Mobile Money simulated; real API later) | Must |
| F6 | Payment history with filters (date, status, meter) | Must |
| F7 | Printable receipt | Should |
| F8 | Monthly consumption chart | Should |
| F9 | Overdue reminders (in-app; SMS later) | Should |
| F10 | Admin dashboard: total billed, collected, overdue | Should |

## 5. Non-Functional Requirements
- Lightweight, works on low-end phones and slow connections.
- Hashed passwords, JWT auth, input validation.
- Currency RWF; dates in Africa/Kigali timezone.
- English first; Kinyarwanda labels as a stretch goal.

## 6. Out of Scope (v1)
Real MTN MoMo / Airtel integration, IoT smart meters, SMS gateway.

## 7. Success Metrics
- Customer can view a bill and pay in 4 steps or fewer.
- Every payment appears in history with a receipt number.
- Bill calculation matches the manual tariff example in tests.
