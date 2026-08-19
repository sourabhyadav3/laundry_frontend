# UI Design System Document

## 1. Core Styling Philosophy
SpinClean PRO is built on a hybrid design architecture using **TailwindCSS utility classes** for responsive layouts, spacing, and sizing, combined with **custom-tailored CSS variables** in `admin.css` and `Login.css` to govern complex aesthetics (glassmorphism, radial glow gradients, dark mode overrides, custom scrollbars, and floating keyframe animations).

---

## 2. Color Palette & Dark Mode Support
The interface supports a deep contrast dark theme and a clean light theme. Colors are managed via CSS variables that adapt dynamically depending on the presence of the `.dark` class on the root element.

| Layer | Light Mode | Dark Mode |
| :--- | :--- | :--- |
| **Page Background** | `#f8fafc` (Slate 50) | `#0f172a` (Slate 900) |
| **Surface Card** | `#ffffff` (White) | `#1e293b` (Slate 800) |
| **Primary Borders** | `#e2e8f0` (Slate 200) | `#334155` (Slate 700) |
| **Text Primary** | `#0f172a` (Slate 900) | `#f8fafc` (Slate 50) |
| **Text Secondary** | `#475569` (Slate 600) | `#94a3b8` (Slate 400) |
| **Accent Primary** | `#0ea5e9` (Cyan 500) | `#22d3ee` (Cyan 400) |
| **Accent Secondary**| `#4f46e5` (Indigo 600) | `#6366f1` (Indigo 500) |

---

## 3. Component Status Pill Badges
Visual indicators represent the current lifecycle of orders, payments, and dispatch jobs. They use low-opacity tinted backgrounds with high-contrast colored text for accessibility compliance:

### 3.1 Order Lifecycle Badges
* **Received:** Blue tint (`bg-sky-500/10 text-sky-600`) - Intake completed.
* **Washing:** Indigo tint (`bg-indigo-500/10 text-indigo-600`) - Garments in cleaning drum.
* **Drying:** Violet tint (`bg-violet-500/10 text-violet-600`) - Moisture removal cycle.
* **Ironing:** Amber tint (`bg-amber-500/10 text-amber-600`) - Steam pressing and fold finishing.
* **Ready:** Emerald tint (`bg-emerald-500/10 text-emerald-600`) - Wrapped and staged for pickup.
* **Delivered:** Forest green tint (`bg-emerald-700/10 text-emerald-700`) - Order closed.

### 3.2 Payment State Badges
* **Paid:** Green tint (`bg-emerald-500/10 text-emerald-600`) - Full amount settled.
* **Partial:** Sky Blue tint (`bg-sky-500/10 text-sky-600`) - Partial deposit paid.
* **Pending:** Yellow tint (`bg-amber-500/10 text-amber-600`) - Payment outstanding.

### 3.3 Dispatch Logistics Badges (Pickups & Deliveries)
* **Assigned:** Cyan tint (`bg-sky-500/10 text-sky-600`) - Allocated to a rider.
* **In Progress / Out For Delivery:** Indigo tint (`bg-indigo-500/10 text-indigo-600`) - Active transit.
* **Picked Up / Delivered:** Violet or Emerald tint - Collection/Dropoff verified.
* **Failed:** Red tint (`bg-rose-500/10 text-rose-600`) - Unsuccessful delivery attempt.

---

## 4. Typography Hierarchy
* **Primary Font Family:** `Inter`, `system-ui`, `-apple-system`, `sans-serif`.
* **Scale:**
  - `Hero Heading (Login):` `3xl` / `4xl` (Bold, 700)
  - `Section Header:` `xl` / `2xl` (Semi-Bold, 600)
  - `Card Title:` `lg` (Medium, 500)
  - `Body Text:` `sm` / `base` (Regular, 400)
  - `Sub-caption / Labels:` `xs` (Medium/Regular, 500/400)

---

## 5. Visual Accents & Micro-Animations
The application features interactive details:
1. **Glassmorphism Panels:** Forms and sidebar components leverage semi-transparent panels with backdrop filters (`backdrop-blur-md bg-white/80` or `bg-slate-800/80`) to achieve depth.
2. **Glowing Background Blobs:** Dynamic radial blur-blobs in cyan and indigo slowly drift in the background of the Login page to catch the user's eye.
3. **Floating Bubbles:** Animated SVG structures floating from bottom to top simulate soap bubbles, enhancing the laundry thematic branding.
4. **Transition Durations:** All clickable buttons, row hover effects, and sidebar route triggers use ease-in-out transition states (`transition-all duration-200`).
5. **Toast Configurations:** Alert cards leverage `react-toastify` to pop messages over active views in a dark color pattern, providing confirmation feedback.
