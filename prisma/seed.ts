import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type SeedTest = {
  name: string;
  status: "pending" | "awaiting" | "complete";
  result?: string;
  unit: string;
  spec: string;
};

type SeedSample = {
  id: string;
  type: string;
  source: string;
  status: string;
  collectedBy: string;
  collectedDate: Date;
  receivedDate: Date;
  container: string;
  tests: SeedTest[];
};

const day = (s: string) => new Date(s);

const samples: SeedSample[] = [
  {
    id: "LAB-24-0142",
    type: "Total Plate Count",
    source: "Production Line 2",
    status: "In Testing",
    collectedBy: "B. Santoso",
    collectedDate: day("2026-08-19T08:10:00"),
    receivedDate: day("2026-08-19T10:40:00"),
    container: "Sterile bag, 200g",
    tests: [
      { name: "Total Plate Count (TPC)", status: "pending", unit: "CFU/g", spec: "≤10,000 CFU/g" },
    ],
  },
  {
    id: "LAB-24-0141",
    type: "Coliform / E. coli",
    source: "Utility Water Loop",
    status: "Awaiting Approval",
    collectedBy: "A. Wijaya",
    collectedDate: day("2026-08-18T14:00:00"),
    receivedDate: day("2026-08-18T15:20:00"),
    container: "Sterile bottle, 250mL",
    tests: [
      { name: "Coliform Count", status: "awaiting", result: "<10", unit: "MPN/g", spec: "≤10 MPN/g" },
      { name: "E. coli Confirmation", status: "awaiting", result: "Negative", unit: "", spec: "Negative" },
    ],
  },
  {
    id: "LAB-24-0140",
    type: "Yeast & Mold",
    source: "Raw Material — Batch RM-2291",
    status: "Complete",
    collectedBy: "B. Santoso",
    collectedDate: day("2026-08-15T09:30:00"),
    receivedDate: day("2026-08-15T11:00:00"),
    container: "Sterile bag, 100g",
    tests: [
      { name: "Yeast & Mold Count", status: "complete", result: "85", unit: "CFU/g", spec: "≤100 CFU/g" },
    ],
  },
  {
    id: "LAB-24-0139",
    type: "Sterility Test",
    source: "Finished Goods — FG-1187",
    status: "Complete",
    collectedBy: "D. Prasetyo",
    collectedDate: day("2026-08-04T13:00:00"),
    receivedDate: day("2026-08-04T13:45:00"),
    container: "Sealed vial ×3",
    tests: [
      { name: "Sterility Test (14-day)", status: "complete", result: "No Growth", unit: "", spec: "No Growth" },
    ],
  },
  {
    id: "LAB-24-0138",
    type: "Environmental Swab",
    source: "Cleanroom Grade B — Point 4",
    status: "Rejected",
    collectedBy: "A. Wijaya",
    collectedDate: day("2026-08-12T07:50:00"),
    receivedDate: day("2026-08-12T09:00:00"),
    container: "Contact plate",
    tests: [
      {
        name: "Aerobic Plate Count — Surface Swab",
        status: "complete",
        result: "220",
        unit: "CFU/plate",
        spec: "≤50 CFU/plate",
      },
    ],
  },
  {
    id: "LAB-24-0143",
    type: "Water Activity",
    source: "Incoming QC — Batch IQ-3342",
    status: "Pending Login",
    collectedBy: "D. Prasetyo",
    collectedDate: day("2026-08-20T16:15:00"),
    receivedDate: day("2026-08-20T16:15:00"),
    container: "Sample cup, 20g",
    tests: [{ name: "Water Activity (aw)", status: "pending", unit: "aw", spec: "≤0.85 aw" }],
  },
  {
    id: "LAB-24-0137",
    type: "Endotoxin (LAL)",
    source: "Finished Goods — FG-1180",
    status: "Complete",
    collectedBy: "B. Santoso",
    collectedDate: day("2026-07-30T10:00:00"),
    receivedDate: day("2026-07-30T10:30:00"),
    container: "Depyrogenated vial",
    tests: [
      { name: "Bacterial Endotoxin (LAL)", status: "complete", result: "0.08", unit: "EU/mL", spec: "≤0.5 EU/mL" },
    ],
  },
  {
    id: "LAB-24-0144",
    type: "Bioburden",
    source: "Raw Material — Batch RM-2295",
    status: "In Testing",
    collectedBy: "A. Wijaya",
    collectedDate: day("2026-08-20T11:20:00"),
    receivedDate: day("2026-08-20T13:00:00"),
    container: "Sterile bottle, 100mL",
    tests: [{ name: "Bioburden Count", status: "pending", unit: "CFU/mL", spec: "≤100 CFU/mL" }],
  },
];

function buildCustody(sample: SeedSample) {
  const steps: { label: string; time: Date }[] = [
    { label: "Collected", time: sample.collectedDate },
    { label: "Received at Lab", time: sample.receivedDate },
    { label: "Logged In", time: sample.receivedDate },
  ];
  if (sample.status !== "Pending Login") steps.push({ label: "Testing Started", time: sample.receivedDate });
  if (["Awaiting Approval", "Complete", "Rejected"].includes(sample.status)) {
    steps.push({ label: "Result Submitted", time: sample.receivedDate });
  }
  if (sample.status === "Complete") steps.push({ label: "QA Approved", time: sample.receivedDate });
  if (sample.status === "Rejected") steps.push({ label: "QA Rejected", time: sample.receivedDate });
  return steps;
}

async function main() {
  await prisma.notification.deleteMany();
  await prisma.custodyEvent.deleteMany();
  await prisma.test.deleteMany();
  await prisma.sample.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("lab1234", 10);

  const wijaya = await prisma.user.create({
    data: {
      employeeId: "EMP-2087",
      email: "a.wijaya@lab.local",
      passwordHash,
      name: "Andi Wijaya",
      initials: "AW",
      role: "Lab Technician",
      section: "Microbiology",
    },
  });

  for (const s of samples) {
    await prisma.sample.create({
      data: {
        id: s.id,
        type: s.type,
        source: s.source,
        status: s.status,
        collectedBy: s.collectedBy,
        collectedDate: s.collectedDate,
        receivedDate: s.receivedDate,
        container: s.container,
        approvedBy: s.status === "Complete" ? "Dr. R. Kusuma, QA Manager" : null,
        approvedAt: s.status === "Complete" ? s.receivedDate : null,
        tests: {
          create: s.tests.map((t, i) => ({
            name: t.name,
            status: t.status,
            result: t.result ?? null,
            unit: t.unit,
            spec: t.spec,
            order: i,
          })),
        },
        custodyEvents: {
          create: buildCustody(s).map((c, i) => ({ label: c.label, time: c.time, order: i })),
        },
      },
    });
  }

  await prisma.notification.createMany({
    data: [
      {
        userId: wijaya.id,
        title: "QA rejected LAB-24-0138",
        body: "Environmental swab exceeded spec (220 CFU/plate vs ≤50). Recollection requested.",
        sampleId: "LAB-24-0138",
        unread: true,
        createdAt: new Date(Date.now() - 2 * 3600 * 1000),
      },
      {
        userId: wijaya.id,
        title: "Result approved — LAB-24-0140",
        body: "Yeast & Mold Count passed QA review and is ready for release.",
        sampleId: "LAB-24-0140",
        unread: true,
        createdAt: new Date(Date.now() - 5 * 3600 * 1000),
      },
      {
        userId: wijaya.id,
        title: "New sample assigned",
        body: "LAB-24-0144 (Bioburden) was logged in and assigned to your queue.",
        sampleId: "LAB-24-0144",
        unread: false,
        createdAt: new Date(Date.now() - 24 * 3600 * 1000),
      },
      {
        userId: wijaya.id,
        title: "Reminder: pending login",
        body: "LAB-24-0143 (Water Activity) has been waiting for login for 4 hours.",
        sampleId: "LAB-24-0143",
        unread: false,
        createdAt: new Date(Date.now() - 26 * 3600 * 1000),
      },
    ],
  });

  console.log("Seeded database.");
  console.log("Login with: a.wijaya@lab.local / lab1234 (or Employee ID EMP-2087 / lab1234)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
