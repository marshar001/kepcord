# Kepcord

Sales, stock, menu recipes and requisitions for a restaurant. Money is in naira (₦).
Management and employees sign in separately, and every order and stock change is saved with the employee's name.

## Run it

    npm install
    npm run dev

Open the address it prints. Right now data is saved in the browser, so no database is needed to try it.

## Layout

    src/
      App.jsx          sign-in state and which screen shows
      pages/           one file per screen
      components/      Shell (menu bar), Chart
      lib/             money formatting, toasts, data-loading hook
      data/
        api.js         the ONE place screens get data from
        local.js       browser-only stand-in for the database

## Going live

Screens only call `api.*`. To use Supabase, write `src/data/supabase.js` exporting the same `api` object
(same function names and return shapes as `local.js`), then change `src/data/api.js` to
`export { api } from "./supabase.js";`.

`api.orders.place` must become a single server function that checks stock, deducts every ingredient,
saves the order with the employee's name, logs it and raises requisitions in one step.
