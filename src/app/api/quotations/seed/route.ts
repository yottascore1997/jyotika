import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST() {
  try {
    const count = await prisma.quotation.count();
    if (count > 0) {
      return NextResponse.json({ message: "Quotations already exist", count });
    }

    const today = new Date();
    const pastDate = (daysAgo: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() - daysAgo);
      return d;
    };
    const futureDate = (daysAhead: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + daysAhead);
      return d;
    };

    const samples = [
      {
        quotationNumber: "QT-2024-001",
        quotationDate: pastDate(25),
        customerName: "Tata Motors Ltd",
        customerContact: "Rajesh Sharma (+91 98201 12345, r.sharma@tatamotors.com)",
        salesEngineer: "Amit Verma",
        productModel: "Videoscope VT-4000 (4-Way Articulation)",
        quotationAmount: 850000,
        region: "West",
        location: "Pune, Maharashtra",
        quotationMadeBy: "Jyotika Sharma",
        orderStatus: "Won",
        followUpStatus: "Customer Contacted",
        lastFollowUpDate: pastDate(3),
        nextFollowUpDate: null,
        nextAction: "PO received, proceed to material dispatch",
        followUpRemarks: "Customer agreed on commercial terms. PO released.",
        followUps: {
          create: [
            {
              followUpDate: pastDate(20),
              followUpStatus: "Customer Contacted",
              orderStatus: "Open",
              nextFollowUpDate: pastDate(12),
              nextAction: "Arrange on-site product demo",
              remarks: "Initial quotation shared via email. Demo requested.",
              updatedBy: "Amit Verma",
            },
            {
              followUpDate: pastDate(12),
              followUpStatus: "Commercial Negotiation",
              orderStatus: "Open",
              nextFollowUpDate: pastDate(3),
              nextAction: "Final price discount confirmation",
              remarks: "Demo completed successfully. Negotiating 5% discount.",
              updatedBy: "Amit Verma",
            },
            {
              followUpDate: pastDate(3),
              followUpStatus: "Customer Contacted",
              orderStatus: "Won",
              nextFollowUpDate: null,
              nextAction: "PO received, proceed to dispatch",
              remarks: "Final PO received. Order Won!",
              updatedBy: "Amit Verma",
            },
          ],
        },
      },
      {
        quotationNumber: "QT-2024-002",
        quotationDate: pastDate(14),
        customerName: "Bharat Heavy Electricals Ltd (BHEL)",
        customerContact: "Vikram Malhotra (+91 94123 45678, v.malhotra@bhel.in)",
        salesEngineer: "Suresh Patil",
        productModel: "Ultrasonic Flaw Detector UFD-800",
        quotationAmount: 1420000,
        region: "North",
        location: "Haridwar, Uttarakhand",
        quotationMadeBy: "Pooja Mehta",
        orderStatus: "Open",
        followUpStatus: "Technical Clarification Required",
        lastFollowUpDate: pastDate(5),
        nextFollowUpDate: pastDate(1), // OVERDUE
        nextAction: "Submit technical compliance sheet for probe frequency",
        followUpRemarks: "Chief Engineer requested probe calibration certificate and compliance sheet.",
        followUps: {
          create: [
            {
              followUpDate: pastDate(10),
              followUpStatus: "Awaiting Customer Response",
              orderStatus: "Open",
              nextFollowUpDate: pastDate(5),
              nextAction: "Follow up with technical evaluation committee",
              remarks: "Quotation submitted against technical enquiry.",
              updatedBy: "Suresh Patil",
            },
            {
              followUpDate: pastDate(5),
              followUpStatus: "Technical Clarification Required",
              orderStatus: "Open",
              nextFollowUpDate: pastDate(1),
              nextAction: "Submit technical compliance sheet",
              remarks: "Technical team had questions on high-temp probe options.",
              updatedBy: "Suresh Patil",
            },
          ],
        },
      },
      {
        quotationNumber: "QT-2024-003",
        quotationDate: pastDate(8),
        customerName: "Larsen & Toubro Heavy Engineering",
        customerContact: "Dinesh Kulkarni (+91 97654 32109, dinesh.k@lnt.com)",
        salesEngineer: "Amit Verma",
        productModel: "Industrial Borescope Set - Dual Camera",
        quotationAmount: 620000,
        region: "West",
        location: "Hazira, Gujarat",
        quotationMadeBy: "Jyotika Sharma",
        orderStatus: "Open",
        followUpStatus: "Commercial Negotiation",
        lastFollowUpDate: pastDate(2),
        nextFollowUpDate: today, // DUE TODAY
        nextAction: "Discuss payment terms and 30-day credit period",
        followUpRemarks: "Finance head requested 60-day credit; counter-offered 30-day credit.",
        followUps: {
          create: [
            {
              followUpDate: pastDate(2),
              followUpStatus: "Commercial Negotiation",
              orderStatus: "Open",
              nextFollowUpDate: today,
              nextAction: "Discuss credit terms",
              remarks: "Budget approved from technical side, negotiating commercial credit terms.",
              updatedBy: "Amit Verma",
            },
          ],
        },
      },
      {
        quotationNumber: "QT-2024-004",
        quotationDate: pastDate(30),
        customerName: "Mahindra Aerospace",
        customerContact: "Kavita Rao (+91 99887 76655, rao.k@mahindra-aero.com)",
        salesEngineer: "Rohan Nair",
        productModel: "High-Resolution Eddy Current Tester EC-90",
        quotationAmount: 2150000,
        region: "South",
        location: "Bengaluru, Karnataka",
        quotationMadeBy: "Mayur Khotele",
        orderStatus: "Lost",
        followUpStatus: "Revised Quotation Required",
        lastFollowUpDate: pastDate(8),
        nextFollowUpDate: null,
        nextAction: "Competitor chosen due to lower price tier",
        followUpRemarks: "Client selected an alternative OEM offering 20% lower price. Order Lost.",
        followUps: {
          create: [
            {
              followUpDate: pastDate(20),
              followUpStatus: "Customer Contacted",
              orderStatus: "Open",
              nextFollowUpDate: pastDate(15),
              nextAction: "Send revised commercial offer",
              remarks: "Competitor pricing pressure discussed.",
              updatedBy: "Rohan Nair",
            },
            {
              followUpDate: pastDate(8),
              followUpStatus: "Revised Quotation Required",
              orderStatus: "Lost",
              nextFollowUpDate: null,
              nextAction: "Case closed as lost",
              remarks: "Management decided not to match below-cost competitor price.",
              updatedBy: "Rohan Nair",
            },
          ],
        },
      },
      {
        quotationNumber: "QT-2024-005",
        quotationDate: pastDate(4),
        customerName: "Jindal Steel & Power Ltd",
        customerContact: "Sunil Agarwal (+91 93312 98765, s.agarwal@jspl.com)",
        salesEngineer: "Suresh Patil",
        productModel: "Digital Thickness Gauge TG-500",
        quotationAmount: 380000,
        region: "East",
        location: "Raigarh, Chhattisgarh",
        quotationMadeBy: "Pooja Mehta",
        orderStatus: "Open",
        followUpStatus: "Follow-up Pending",
        lastFollowUpDate: pastDate(4),
        nextFollowUpDate: futureDate(3),
        nextAction: "Call procurement officer to confirm receipt of quote",
        followUpRemarks: "Quotation sent by email. Awaiting confirmation of receipt.",
        followUps: {
          create: [
            {
              followUpDate: pastDate(4),
              followUpStatus: "Follow-up Pending",
              orderStatus: "Open",
              nextFollowUpDate: futureDate(3),
              nextAction: "Call procurement officer",
              remarks: "Quotation sent with standard warranty of 1 year.",
              updatedBy: "Suresh Patil",
            },
          ],
        },
      },
      {
        quotationNumber: "QT-2024-006",
        quotationDate: pastDate(2),
        customerName: "Reliance Industries Ltd",
        customerContact: "Anand Joshi (+91 98210 54321, anand.joshi@ril.com)",
        salesEngineer: "Amit Verma",
        productModel: "Articulated Endoscope 6mm x 3m",
        quotationAmount: 975000,
        region: "West",
        location: "Jamnagar, Gujarat",
        quotationMadeBy: "Jyotika Sharma",
        orderStatus: "Open",
        followUpStatus: "Customer Contacted",
        lastFollowUpDate: pastDate(1),
        nextFollowUpDate: futureDate(5),
        nextAction: "Schedule online demonstration for maintenance team",
        followUpRemarks: "Spoke with Maintenance Manager Mr. Joshi. Requested web demo next Tuesday.",
        followUps: {
          create: [
            {
              followUpDate: pastDate(1),
              followUpStatus: "Customer Contacted",
              orderStatus: "Open",
              nextFollowUpDate: futureDate(5),
              nextAction: "Schedule online demonstration",
              remarks: "Customer positive about specs. Preparing presentation.",
              updatedBy: "Amit Verma",
            },
          ],
        },
      },
    ];

    for (const s of samples) {
      await prisma.quotation.create({ data: s });
    }

    return NextResponse.json({ message: "Seeded initial sample quotations", count: samples.length });
  } catch (error) {
    console.error("POST /api/quotations/seed:", error);
    return NextResponse.json({ error: "Failed to seed sample quotations" }, { status: 500 });
  }
}
