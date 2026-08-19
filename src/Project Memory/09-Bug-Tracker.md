# Bug Tracker Log

## 1. Active Issues
The following table details known bugs, usability defects, or architectural constraints currently identified:

| Bug ID | Description | Impacted Area | Severity | Status | Assigned To |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **BUG-001** | Counter Add Customer form validation blocks submission even when valid phone numbers are inputted. | `Pages/counter/Customers.jsx` | High | Investigating | Frontend Dev |
| **BUG-002** | Reports PDF export throws font clipping warnings on narrow viewport layouts. | `utils/exportUtils.js` | Medium | In Progress | Analytics Dev |
| **BUG-003** | Localization string missing: "Express Wash" service name displays placeholder tags in Spanish view. | `context/translations.js` | Low | Backlog | Localization Specialist |

---

## 2. Resolved Issues
Historical tracking of patched software bugs:

### BUG-000: Dark Mode Class Mismatch
- **Description:** Dark mode switch added class name toggling to `body` element while tailwind config expected class toggle on the `html` root element.
- **Impact:** Styling configurations prefixed with `dark:` did not activate.
- **Resolution:** Modified `ThemeContext.jsx` to toggle `.dark` class directly on the `document.documentElement` element, resolving styling issues.

### BUG-004: Customer Intake Double Click Submissions
- **Description:** Rapidly double-clicking the intake submit button resulted in duplicate customer registry records in context arrays.
- **Impact:** Duplicated entries in the customers roster.
- **Resolution:** Added `isLoading` state hooks that disable the submit button immediately upon the first trigger event.
