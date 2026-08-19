# Roles and Permissions Specifications

## 1. System Role Definitions
SpinClean PRO implements a strict Role-Based Access Control (RBAC) mechanism. The application's pages, dashboards, sidebar routes, and operational actions are modified depending on the logged-in user's role.

---

## 2. Role Capabilities Mapping

### 2.1 Admin (System Administrator)
* **Goal:** Full system configuration, security, audit, and operational oversight.
* **Scope:** 
  - Manage and configure organizational staff accounts (CRUD staff profiles, edit status flags).
  - Configure roles and adjust underlying permission schemes.
  - CRUD operations on laundry services, standard base pricing, and duration policies.
  - Review deep analytics dashboards, finance reports, and export raw data sheets (XLS/PDF).
  - Modify system preferences (currency signs, tax brackets, business details).

### 2.2 Counter Staff (Front Desk Operator)
* **Goal:** Streamlined walk-in ticketing, customer intake, and transaction processing.
* **Scope:**
  - Create and manage customer profiles.
  - Create new laundry orders, detail garment counts, set custom weights, apply discounts, and configure care instructions.
  - Track order progression state within the store facility.
  - Process cash, card, and mobile payments; print invoices and payment receipts.
  - Monitor scheduled pickup and delivery requests assigned to dispatch riders.

### 2.3 Delivery Staff (Dispatch Rider / Logistics Specialist)
* **Goal:** On-the-road execution of pickup collections and doorstep deliveries.
* **Scope:**
  - View assigned pickups (client contact info, pickup address, scheduling notes).
  - Update pickup request state (Scheduled $\rightarrow$ Assigned $\rightarrow$ Picked Up).
  - View assigned deliveries (completed orders requiring customer delivery).
  - Update delivery job execution status (Out for Delivery $\rightarrow$ Delivered or Failed).
  - Review historical records of completed collection and delivery runs.
  - View routes and logistics navigation maps (visual helpers).

---

## 3. Permission Reference Matrix
The following permission codes are defined in the authentication state and validated to toggle UI components:

| Permission Code | UI Label Reference | Admin | Counter Staff | Delivery Staff |
| :--- | :--- | :---: | :---: | :---: |
| `view_dashboard` | View Dashboard | ✅ | ✅ | ✅ |
| `manage_customers` | Manage Customers | ✅ | ✅ | ❌ |
| `manage_orders` | Manage Orders (All) | ✅ | ❌ | ❌ |
| `create_orders` | Create Orders | ✅ | ✅ | ❌ |
| `view_orders` | View Orders (List) | ✅ | ✅ | ❌ |
| `track_orders` | Track Orders (Status) | ✅ | ✅ | ❌ |
| `manage_services` | Manage Laundry Services | ✅ | ❌ | ❌ |
| `manage_pricing` | Manage Pricing | ✅ | ❌ | ❌ |
| `manage_pickups` | Manage Pickups (All) | ✅ | ❌ | ❌ |
| `view_pickups` | View Pickups (List) | ✅ | ✅ | ❌ |
| `manage_deliveries` | Manage Deliveries (All) | ✅ | ❌ | ❌ |
| `view_deliveries` | View Deliveries (List) | ✅ | ✅ | ❌ |
| `manage_payments` | Manage Payments | ✅ | ✅ | ❌ |
| `manage_staff` | Manage Staff | ✅ | ❌ | ❌ |
| `manage_roles` | Manage Roles | ✅ | ❌ | ❌ |
| `manage_permissions` | Manage Permissions | ✅ | ❌ | ❌ |
| `view_reports` | View Reports | ✅ | ❌ | ❌ |
| `view_analytics` | View Analytics | ✅ | ❌ | ❌ |
| `export_data` | Export Data (PDF/XLS) | ✅ | ❌ | ❌ |
| `manage_settings` | Manage Settings | ✅ | ❌ | ❌ |
| `view_assigned_pickups` | View Assigned Pickups | ❌ | ❌ | ✅ |
| `update_pickup_status` | Update Pickup Status | ❌ | ❌ | ✅ |
| `view_assigned_deliveries`| View Assigned Deliveries | ❌ | ❌ | ✅ |
| `update_delivery_status` | Update Delivery Status | ❌ | ❌ | ✅ |
| `view_completed_jobs` | View Completed Jobs | ❌ | ❌ | ✅ |
| `view_route_map` | View Route Map | ❌ | ❌ | ✅ |
