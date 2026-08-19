# Project Rules & Coding Guidelines

## 1. Directory Conventions
* **Pages Separation:** Group view containers by user role inside `src/Pages/` (e.g. `Pages/admin/`, `Pages/counter/`, `Pages/delivery/`).
* **Shared Components:** Put reusable widgets (tables, headers, modals, stats indicators) directly in `src/Components/`. Do not duplicate code for listings or modal frames.
* **Layouts:** Use structural wrapping components (e.g. `AdminLayout.jsx`, `CounterLayout.jsx`, `DeliveryLayout.jsx`) in the route tree in `App.js` to manage sidebar rendering, navigation header displays, and viewport boundaries.

---

## 2. State & Data Mutations
* **Nonglobal State:** Localized form inputs, toggle status flags, search queries, and open/close flags must be managed locally via standard React hooks (`useState`, `useRef`).
* **Global State Mutators:** All modifications on active business models (customers, orders, services, payments, staff status) must pass through the functional helpers exposed by `AdminStateContext.js` (e.g. `addCustomer()`, `addOrder()`, `updateOrderStatus()`, `addStaff()`, etc.).
* **State Immutability:** Never modify context arrays directly. Always clone structures using spread syntax (`...`) or array mapping maps when updating context state variables.

---

## 3. Styling & Theme Conventions
* **Tailwind Utility First:** Apply Tailwind utility styles directly in the React JSX markup for grid setups, padding, sizing, font sizing, and borders.
* **Component-specific Overrides:** Limit CSS definitions in `src/styles/admin.css` to global variables, root theme definitions, complex visual keyframe animations, glassmorphism backdrop configurations, and specialized table scroll overlays.
* **Theme Styling Compliance:** Support dark and light theme variations on all pages. Utilize dark-prefix properties (`dark:bg-slate-800`, `dark:text-slate-100`) to guarantee UI readability under either setting.

---

## 4. Multi-Language and Translation Rules
* **No Hardcoded UI Text:** Plain user-facing string literals in templates must be registered inside `src/context/translations.js`.
* **Dynamic Translation Usage:** Use the translation mapper hook inside components:
  ```javascript
  import { useLanguage } from '../context/LanguageContext';
  const { t } = useLanguage();
  
  // Usage in JSX
  <h2>{t('dashboard')}</h2>
  ```
* **Translation Keys consistency:** Ensure any new UI label is appended to both the English (`en`) and Spanish (`es`) property categories in the localization translation sheet to avoid translation mismatch.

---

## 5. UI Feedback & Alerting
* **Alert Notifications:** Inform the user when operations conclude (e.g., adding staff, deleting services, updating delivery statuses, completing payments) using the toast helper `react-toastify`.
  - Use `toast.success()`, `toast.warning()`, or `toast.error()` dynamically based on operation outcomes.
* **Loading State Feedbacks:** Always disable action buttons and display a spinner icon (e.g. `FiLoader` with a `spinner` class) during submission processes. Use skeletal mock skeletons for lazy list retrievals.

---

## 6. Project Memory Synchronization Protocol
* **Task Closure Rule:** Every time a task or feature implementation finishes, the developer or agent **must** review and update relevant files in the `Project Memory/` directory.
* **Core Documentation Updates:**
  - **Development Progress (`08-Development-Progress.md`):** Check off completed components, items, and tasks; update next-up backlog items.
  - **Database Memory (`03-Database-Schema.md`):** Update any schema modifications, table definitions, or collections changes.
  - **API Memory (`04-API-Architecture.md`):** Log added API route endpoints, payloads, HTTP verbs, and parameters.
  - **UI Memory (`06-UI-Design-System.md`):** Add details for new components, colors, themes, layout models, or CSS definitions.
  - **Bug Tracker (`09-Bug-Tracker.md`):** Move resolved bugs to history, modify status labels, and log new bug reports.
* **Objective:** Ensure project context remains persistent, clean, and self-documenting across sessions.

