# Bharat Sevak

MERN implementation of the supplied Bharat Sevak customer/provider/admin flow.

## Roles
- Customer: browse approved products/services, place orders, view order/payment status.
- Provider: register for verification, add products/services for admin approval, accept/reject/process/complete customer orders, see customer/revenue metrics.
- Admin: verify providers, approve/reject listings, manage categories, inspect customers/orders and system metrics.

## Stack
React + Vite + Tailwind CSS / Node.js + Express / MongoDB + Mongoose / JWT + bcryptjs.

## Run
Backend: `cd web-backend && npm install && cp .env.example .env && npm run seed && npm run dev`
Frontend: `cd web-frontend && npm install && npm run dev`

Seed admin: phone `9999999999`, password `admin123`.
