# Stock & Service Management

Full-stack inventory and service management dashboard built with **Next.js**, **MySQL**, and **Prisma** — matching the reference design with KPI cards, donut chart, and full CRUD modules.

## Modules

| Menu | Features |
|------|----------|
| **Dashboard** | Total Items, Low Stock, Stock Value, Services + Chart + Tables |
| **Inventory** | Items with SKU, Category, Stock, Min Level, Price, Status |
| **Categories** | Product category management |
| **Suppliers** | Supplier contact management |
| **Purchase** | Purchase Orders with line items |
| **Sales** | Sales records with line items |
| **Service** | Service records (ID, Customer, Type, Status, Date) |
| **Customers** | Customer management |
| **Reports** | Summary reports |
| **Settings** | App configuration |

## Business Logic

**Inventory Status** (auto-calculated):
- `Inactive` — item is deactivated
- `Out of Stock` — stock = 0
- `Low Stock` — stock ≤ min stock level
- `In Stock` — stock > min level

**Service Status:** Pending, In Progress, Completed, Cancelled

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure MySQL in .env
DATABASE_URL="mysql://root:password@localhost:3306/margitech_inventory"

# 3. Create database
CREATE DATABASE margitech_inventory;

# 4. Push schema & seed demo data
npm run db:generate
npm run db:push
npm run db:seed

# 5. Run dev server
npm run dev
```

Open **http://localhost:3000**
