🧺 Tuhama PRO — Complete System Workflow
System Overview
Tuhama PRO ek commercial laundry management system hai jo teen tarah ke users ko handle karta hai:

Role	Login	Dashboard
Admin	admin@tuhama.com / admin123	/admin/dashboard
Counter Staff	counter@tuhama.com / counter123	/counter/dashboard
Delivery Staff	delivery@tuhama.com / delivery123	/delivery/dashboard
🔐 Step 1 — Login & Role-Based Routing

User → Login Page (/)
         │
         ├─ email contains "admin"     → /admin/dashboard    (Admin Role)
         ├─ email contains "counter"   → /counter/dashboard  (Counter Staff Role)
         ├─ email contains "delivery"  → /delivery/dashboard (Delivery Staff Role)
         └─ any other email            → /admin/dashboard    (Default Admin)
User ka data localStorage me store hota hai (user key)
Har page pe role check hoti hai — wrong role ko access nahi milta
🧭 COMPLETE ORDER LIFECYCLE

CUSTOMER AATA HAI
       │
       ▼
[1] COUNTER STAFF → Make Invoice (Order Create)
       │
       ▼
[2] ORDER STATUS: Waiting → In Store → In Workshop → Ready
       │
       ▼
[3] ADMIN → Orders Page (status track & update)
       │
       ▼
[4] PICKUP/DELIVERY Schedule
       │
       ▼
[5] DELIVERY STAFF → Pickup/Deliver
       │
       ▼
[6] ORDER STATUS: Delivered
       │
       ▼
[7] PAYMENT → Mark as Paid (Cash / Card / UPI)
       │
       ▼
[8] INVOICE generated & Print/Download
👔 ROLE 1 — COUNTER STAFF (/counter/*)
Counter staff ka kaam customer se seedha deal karna hai.

Counter Dashboard (/counter/dashboard)
Today's orders summary
Recent orders list
Quick stats: Total Orders, Revenue, Pending
Make Invoice (/counter/orders/new) ← Main Kaam
Flow:


1. Customer search by phone number
   ├── Found    → Customer select karo
   └── Not Found → New customer add karo (name + phone)
2. Service Mode select karo:
   ├── Normal / Wash & Iron  (Blue)
   ├── Iron Only             (Amber)
   ├── Dry Cleaning          (Purple)
   └── Urgent / Express      (Red) ← priority order
3. Items add karo (garment catalog se):
   ├── Garment select karo (Shirt, Pant, Dishdasha, etc.)
   ├── Quantity set karo
   ├── Price auto-fill hoti hai
   └── Custom item bhi add kar sakte hain
4. Details fill karo:
   ├── Expected Delivery Date
   ├── Paper Invoice Number (optional)
   ├── Special Notes
   └── Discount (percentage ya fixed amount)
5. Save options:
   ├── Save & Print Invoice (PDF generate hoti hai)
   ├── Save & New (next order)
   └── Save as Draft
6. Order create hota hai:
   └── Status: "Waiting" → shows in Admin → Orders
Order List (/counter/orders)
Apne branch ke orders dekhna
Status update karna
Order details view karna
Order Tracking (/counter/tracking)
Customer ko real-time status batana
Timeline view (Waiting → In Store → In Workshop → Ready → Delivered)
Customers (/counter/customers)
Customer list
Customer history dekhna
New customer add karna
Invoices (/counter/invoices)
Saved invoices list
Print/Download invoice
Payments (/counter/payments)
Payment status dekhna
Mark payment as received
👑 ROLE 2 — ADMIN (/admin/*)
Admin ka poora system control karna hai.

Dashboard (/admin/dashboard)
Live Stats: Total Revenue, Total Customers, Ready Orders, Delivered Orders
Live Update Filter (Navbar): All Orders / Express — filter globally
Branch Filter (Navbar): Specific branch ya All Branches
Charts:
Daily Revenue Graph
Monthly Revenue Chart
Orders Trend Chart
Service-wise Revenue Pie Chart
Recent Orders Feed (real-time scroll)
LCD Display link → Customer-facing screen
Orders (/admin/orders)
Order Status Flow:


Waiting → In Store → In Workshop → Ready → Delivered
                                         ↘ Cancelled
Har order ka status change kar sakte hain
Search, filter by status, filter by payment
Order view — full details + timeline
New order create karna (same as Make Invoice)
Export CSV / PDF
Make Invoice (/admin/make-invoice)
Same as Counter Make Invoice
Admin bhi directly order bana sakta hai
Customers (/admin/customers)
Poori customer list (all branches)
Customer details: Order history, Total spent, Loyalty points
Customer add/edit/delete
Export customers CSV/PDF
Customer ko SMS reminder send karna (simulated)
Invoices (/admin/invoices)
All invoices list
Filter by status, date, payment
View invoice detail
Print/Download PDF
Payment status update
Payments (/admin/payments)
Payment Flow:


Order Complete → Invoice Generated → Payment Pending
                                          │
                              ┌───────────┴───────────┐
                              │                       │
                         View Details           Mark as Paid
                              │                       │
                         Edit Payment         Choose Method:
                                              ├── Cash
                                              ├── Card
                                              └── UPI
All payments list with status
Filter by method (Cash/Card/UPI/Pending)
Edit payment details
Mark as Paid with payment method selection
Pickup & Delivery (/admin/pickups)
Pickup Flow:


Order "Ready" → Schedule Pickup Request
                      │
               Assign Driver/Staff
                      │
               Status: Scheduled → Assigned → Picked Up → Completed
Delivery Flow:


Items Picked Up → Schedule Delivery
                      │
               Assign Driver/Staff
                      │
               Status: Scheduled → Out for Delivery → Delivered
                                                    ↘ Failed
Workshop Print List — Print carpet/blanket workshop list with date filter
Print Workshop Button — print dialog opens (not direct download)
Pickup/Delivery assign to specific driver
Drivers (/admin/drivers)
Driver list (Name, Mobile, Area, Car Number, Status)
Add/Edit/Delete driver
Driver status: بالتوصيل (On Delivery) / موقف (Parked)
Export driver list (CSV/PDF)
Staff (/admin/staff)
All staff members list
Roles: Admin / Counter Staff / Delivery Staff
Status: Active / Inactive / Suspended
Add new staff → /admin/staff/add
Edit staff → /admin/staff/:id/edit
View staff details → /admin/staff/:id
Reset Password (from Staff page)
Delete/Remove staff
Roles & Permissions (/admin/staff/roles)
Role-wise permission matrix
Toggle permissions per role
Roles: Admin, Counter Staff, Delivery Staff
Services (/admin/services)
Laundry service catalog
Name, Category, Price, Estimated Time, Status
Add/Edit/Delete services
These prices use hoti hain Make Invoice me
Branches (/admin/branches)
All branch locations
Add/Edit/Delete branch
Branch-wise filtering across entire system
Reports (/admin/reports)
Report Types:

Revenue Report (daily/monthly/custom range)
Orders Report (by status, service type)
Customer Report
Staff Performance
Service-wise breakdown
Charts: Bar, Line, Pie
Export: CSV / PDF
Settings (/admin/settings)
Business name, logo, contact
Currency settings
Tax rate
Default turnaround time
Language (Arabic / English)
Theme (Light / Dark)
Notification preferences
🚗 ROLE 3 — DELIVERY STAFF (/delivery/*)
Delivery staff ka kaam pickup aur delivery complete karna hai.

Delivery Dashboard (/delivery/dashboard)
Today's assigned pickups count
Today's assigned deliveries count
Completed jobs today
Quick action buttons
Assigned Pickups (/delivery/pickups)
Jo pickups unhe assign ki gayi hain
Customer address, time, items
Mark as Picked Up
Assigned Deliveries (/delivery/deliveries)
Jo deliveries unhe assign ki gayi hain
Customer address, order details
Mark as Delivered / Failed
Completed Jobs (/delivery/completed)
History of completed pickups & deliveries
📺 LCD Display (/admin/lcd-display)
Customer-facing TV screen:

Active orders status show karta hai
Auto-refreshes
Express orders highlight hote hain
Arabic/English support
Customer apna order status dekh sakta hai
🔄 Global Features (Navbar)
Feature	Kya karta hai
Live Update: ALL ORDERS / EXPRESS	Pure system me Express/Urgent orders filter karta hai
Branch Selector	Selected branch ke orders show karta hai
Enter Focus Mode	Sidebar hide karta hai, full workspace
Theme Toggle	Dark / Light mode
Language Switcher	English / Arabic (RTL support)
Notifications	Bell icon
Profile Dropdown	User name, role, Logout
🗄️ Data Architecture

AdminStateContext (Global State)
├── customers[]      → All customers
├── orders[]         → All orders (localStorage persisted)
├── services[]       → Laundry services
├── staff[]          → Staff members
├── payments[]       → Payment records
├── pickups[]        → Pickup requests
├── deliveries[]     → Delivery records
├── drivers[]        → Delivery drivers
├── branches[]       → Branch locations
├── catalog[]        → Garment catalog (items)
├── selectedBranch   → Active branch filter
└── liveUpdateFilter → All Orders / Express
Sab data localStorage me save hota hai (browser refresh pe bhi remain karta hai)
Mock data se start hota hai, phir user changes persist hote hain
🖨️ Print/Export System
Action	Result
Print Invoice	Browser Print Dialog opens (PDF)
Export CSV	CSV file download
Export PDF	PDF file download
Print Workshop List	Print dialog opens (carpet/blanket list)
📋 Order Status Reference
Status	Matlab
Waiting	Order create hua, kaam shuru nahi
In Store	Items store pe aa gayi
In Workshop	Washing/Cleaning chal rahi hai
Ready	Order ready, delivery ke liye
Delivered	Customer ko deliver ho gaya
Cancelled	Order cancel ho gaya
💳 Payment Status Reference
Status	Matlab
Pending	Payment abhi baki hai
Paid	Payment complete — Cash/Card/UPI
Partial	Kuch payment aayi hai
Overdue	Due date nikal gayi, payment nahi