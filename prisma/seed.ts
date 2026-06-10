import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.stockMovement.deleteMany();
  await prisma.assetSale.deleteMany();
  await prisma.oEMReturn.deleteMany();
  await prisma.repairCase.deleteMany();
  await prisma.serviceRecord.deleteMany();
  await prisma.customerHandover.deleteMany();
  await prisma.demoTracking.deleteMany();
  await prisma.materialIssue.deleteMany();
  await prisma.materialReceipt.deleteMany();
  await prisma.stockMaster.deleteMany();

  const stocks = await Promise.all([
    prisma.stockMaster.create({
      data: {
        stockId: "STK-001001",
        materialType: "Equipment",
        oemSupplier: "Siemens Germany",
        make: "Siemens",
        modelNumber: "S7-1200 PLC",
        serialNumber: "SN-DE-2024-001",
        description: "Programmable Logic Controller",
        category: "Control System",
        receivedDate: new Date("2024-01-15"),
        warrantyStatus: "Active",
        poNumber: "PO-2024-001",
        purchaseCost: 85000,
        currentStatus: "Available",
        currentHolder: "Store",
        location: "Main Store",
      },
    }),
    prisma.stockMaster.create({
      data: {
        stockId: "STK-001002",
        materialType: "Demo Unit",
        oemSupplier: "Delta Taiwan",
        make: "Delta",
        modelNumber: "VFD-E Series",
        serialNumber: "SN-TW-2024-002",
        description: "Variable Frequency Drive",
        category: "Actuator",
        receivedDate: new Date("2024-02-10"),
        warrantyStatus: "Active",
        poNumber: "PO-2024-002",
        purchaseCost: 42000,
        currentStatus: "Demo",
        currentHolder: "Sales Person",
        location: "Sales Dept",
      },
    }),
    prisma.stockMaster.create({
      data: {
        stockId: "STK-001003",
        materialType: "Equipment",
        oemSupplier: "Omron China",
        make: "Omron",
        modelNumber: "E3Z-LS",
        serialNumber: "SN-CN-2024-003",
        description: "Photoelectric Sensor",
        category: "Sensor",
        receivedDate: new Date("2024-03-05"),
        warrantyStatus: "Active",
        purchaseCost: 8500,
        currentStatus: "Repair",
        currentHolder: "Service Department",
        location: "Service Center",
      },
    }),
  ]);

  for (const stock of stocks) {
    await prisma.materialReceipt.create({
      data: {
        grnNumber: `GRN-${stock.stockId}`,
        receivedDate: stock.receivedDate,
        supplierOem: stock.oemSupplier,
        materialDescription: stock.description || stock.modelNumber,
        modelNumber: stock.modelNumber,
        serialNumber: stock.serialNumber,
        quantity: 1,
        materialType: stock.materialType,
        receivedBy: "Admin",
        poNumber: stock.poNumber,
        stockMasterId: stock.id,
      },
    });
    await prisma.stockMovement.create({
      data: {
        movementId: `MOV-${stock.id}001`,
        serialNumber: stock.serialNumber,
        date: stock.receivedDate,
        fromLocation: "Supplier",
        toLocation: "Main Store",
        movementType: "Receipt",
        user: "Admin",
        stockMasterId: stock.id,
      },
    });
  }

  await prisma.demoTracking.create({
    data: {
      demoId: "DMO-001001",
      serialNumber: "SN-TW-2024-002",
      model: "VFD-E Series",
      salesPerson: "Rajesh Kumar",
      customer: "ABC Industries",
      issueDate: new Date("2024-04-01"),
      expectedReturnDate: new Date("2024-04-15"),
      status: "Overdue",
      stockMasterId: stocks[1].id,
    },
  });

  await prisma.repairCase.create({
    data: {
      repairId: "REP-001001",
      serialNumber: "SN-CN-2024-003",
      customerName: "XYZ Manufacturing",
      complaint: "Sensor not detecting objects consistently",
      receivedDate: new Date("2024-05-01"),
      repairStartDate: new Date("2024-05-03"),
      status: "Under Repair",
      stockMasterId: stocks[2].id,
    },
  });

  await prisma.serviceRecord.create({
    data: {
      serviceId: "SRV-001001",
      serialNumber: "SN-DE-2024-001",
      customerName: "ABC Industries",
      serviceType: "Maintenance",
      serviceDate: new Date("2024-06-01"),
      completionDate: new Date("2024-06-02"),
      status: "Completed",
      description: "Annual preventive maintenance check",
      stockMasterId: stocks[0].id,
    },
  });

  await prisma.serviceRecord.create({
    data: {
      serviceId: "SRV-001002",
      serialNumber: "SN-DE-2024-001",
      customerName: "ABC Industries",
      serviceType: "Inspection",
      serviceDate: new Date("2024-09-15"),
      status: "Pending",
      description: "Quarterly inspection scheduled",
      stockMasterId: stocks[0].id,
    },
  });

  console.log("Demo seed data created!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
