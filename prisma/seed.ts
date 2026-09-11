/**
 * البيانات الأولية (Seed) — تُنشئ نظامًا جاهزًا للتجربة فورًا:
 * حساب أدمن، حساب وكيل تدريب، 3 رؤساء أقسام مرتبطين بتخصصات مختلفة،
 * وطلبات تجريبية تغطي كل الحالات بما فيها طلب مُصعّد لوكيل التدريب.
 *
 * التشغيل: npm run db:seed
 */
import { PrismaClient, type RequestStatus, type SenderRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/** كلمات المرور التجريبية — موثّقة في README */
const PASSWORDS = {
  admin: "Admin@123",
  deputy: "Deputy@123",
  head: "Head@123",
};

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY);

async function main() {
  console.log("⏳ تهيئة البيانات الأولية...");

  // تنظيف البيانات السابقة (بالترتيب الصحيح لاحترام المفاتيح الأجنبية)
  await prisma.requestEvent.deleteMany();
  await prisma.message.deleteMany();
  await prisma.request.deleteMany();
  await prisma.specialty.deleteMany();
  await prisma.user.deleteMany();

  // ---------- الحسابات ----------
  const admin = await prisma.user.create({
    data: {
      name: "أحمد المسؤول",
      email: "admin@tvtc.local",
      role: "ADMIN",
      passwordHash: await bcrypt.hash(PASSWORDS.admin, 10),
    },
  });

  const deputy = await prisma.user.create({
    data: {
      name: "سعيد الوكيل",
      email: "deputy@tvtc.local",
      role: "DEPUTY",
      passwordHash: await bcrypt.hash(PASSWORDS.deputy, 10),
    },
  });

  const headIT = await prisma.user.create({
    data: {
      name: "خالد الشمري",
      email: "it.head@tvtc.local",
      role: "DEPT_HEAD",
      passwordHash: await bcrypt.hash(PASSWORDS.head, 10),
    },
  });

  const headElectricity = await prisma.user.create({
    data: {
      name: "ماجد العتيبي",
      email: "electricity.head@tvtc.local",
      role: "DEPT_HEAD",
      passwordHash: await bcrypt.hash(PASSWORDS.head, 10),
    },
  });

  const headElectronics = await prisma.user.create({
    data: {
      name: "فهد القحطاني",
      email: "electronics.head@tvtc.local",
      role: "DEPT_HEAD",
      passwordHash: await bcrypt.hash(PASSWORDS.head, 10),
    },
  });

  // ---------- التخصصات وربطها برؤساء الأقسام ----------
  const it = await prisma.specialty.create({ data: { name: "تقنية معلومات", headId: headIT.id } });
  const electricity = await prisma.specialty.create({
    data: { name: "كهرباء", headId: headElectricity.id },
  });
  const electronics = await prisma.specialty.create({
    data: { name: "إلكترونيات", headId: headElectronics.id },
  });
  const mechanics = await prisma.specialty.create({ data: { name: "ميكانيك" } });
  const business = await prisma.specialty.create({ data: { name: "إدارة أعمال" } });

  console.log(
    `✅ التخصصات: ${[it, electricity, electronics, mechanics, business].map((s) => s.name).join("، ")}`
  );

  // مساعد لإنشاء طلب كامل مع رسائله وسجل حالته
  async function createRequest(input: {
    traineeName: string;
    traineeNumber: string;
    specialtyId: string;
    type: "REQUEST" | "COMPLAINT" | "INQUIRY";
    body: string;
    status: RequestStatus;
    createdAt: Date;
    assignedHeadId?: string;
    approvedAt?: Date;
    lastHeadReplyAt?: Date;
    escalatedAt?: Date;
    escalationReason?: string;
    rejectedAt?: Date;
    rejectionReason?: string;
    completedAt?: Date;
    messages: { role: SenderRole; name: string; body: string; at: Date }[];
    events: { from?: RequestStatus; to: RequestStatus; role: SenderRole; name: string; note?: string; at: Date }[];
  }) {
    const request = await prisma.request.create({
      data: {
        traineeName: input.traineeName,
        traineeNumber: input.traineeNumber,
        specialtyId: input.specialtyId,
        type: input.type,
        body: input.body,
        status: input.status,
        createdAt: input.createdAt,
        assignedHeadId: input.assignedHeadId,
        approvedAt: input.approvedAt,
        lastHeadReplyAt: input.lastHeadReplyAt,
        escalatedAt: input.escalatedAt,
        escalationReason: input.escalationReason,
        rejectedAt: input.rejectedAt,
        rejectionReason: input.rejectionReason,
        completedAt: input.completedAt,
      },
    });

    for (const message of input.messages) {
      await prisma.message.create({
        data: {
          requestId: request.id,
          senderRole: message.role,
          senderName: message.name,
          body: message.body,
          createdAt: message.at,
        },
      });
    }

    for (const event of input.events) {
      await prisma.requestEvent.create({
        data: {
          requestId: request.id,
          fromStatus: event.from,
          toStatus: event.to,
          actorRole: event.role,
          actorName: event.name,
          note: event.note,
          createdAt: event.at,
        },
      });
    }

    return request;
  }

  // ---------- 1) طلب جديد بحالة «قيد المراجعة» (يُظهر عدّاد الأدمن) ----------
  await createRequest({
    traineeName: "عبدالله الزهراني",
    traineeNumber: "4412001",
    specialtyId: it.id,
    type: "REQUEST",
    body: "أرغب في تحويل شعبتي من الفترة المسائية إلى الفترة الصباحية بسبب ظروف العمل.",
    status: "PENDING_REVIEW",
    createdAt: daysAgo(1),
    messages: [
      {
        role: "TRAINEE",
        name: "عبدالله الزهراني",
        body: "أرغب في تحويل شعبتي من الفترة المسائية إلى الفترة الصباحية بسبب ظروف العمل.",
        at: daysAgo(1),
      },
    ],
    events: [
      { to: "PENDING_REVIEW", role: "TRAINEE", name: "عبدالله الزهراني", note: "تم تقديم الطلب", at: daysAgo(1) },
    ],
  });

  // ---------- 2) طلب «قيد المعالجة» بمحادثة متبادلة جارية ----------
  await createRequest({
    traineeName: "نورة السالم",
    traineeNumber: "4412002",
    specialtyId: it.id,
    type: "INQUIRY",
    body: "متى يبدأ التسجيل في مادة قواعد البيانات المتقدمة؟ ولا أجد الشعبة في النظام.",
    status: "IN_PROGRESS",
    createdAt: daysAgo(5),
    assignedHeadId: headIT.id,
    approvedAt: daysAgo(4),
    lastHeadReplyAt: daysAgo(1), // ردّ رئيس القسم أمس → لن يُصعَّد
    messages: [
      {
        role: "TRAINEE",
        name: "نورة السالم",
        body: "متى يبدأ التسجيل في مادة قواعد البيانات المتقدمة؟ ولا أجد الشعبة في النظام.",
        at: daysAgo(5),
      },
      {
        role: "SYSTEM",
        name: "النظام",
        body: "تمت الموافقة على الطلب وتحويله إلى رئيس قسم تقنية معلومات: خالد الشمري.",
        at: daysAgo(4),
      },
      {
        role: "DEPT_HEAD",
        name: "خالد الشمري",
        body: "أهلًا بك. التسجيل يبدأ الأسبوع القادم، والشعبة ستُفتح بعد اكتمال جدول المدربين.",
        at: daysAgo(3),
      },
      {
        role: "TRAINEE",
        name: "نورة السالم",
        body: "شكرًا لك. هل أحتاج إلى إجراء إضافي من طرفي؟",
        at: daysAgo(2),
      },
      {
        role: "DEPT_HEAD",
        name: "خالد الشمري",
        body: "لا حاجة لأي إجراء، سيصلك إشعار عند فتح التسجيل.",
        at: daysAgo(1),
      },
    ],
    events: [
      { to: "PENDING_REVIEW", role: "TRAINEE", name: "نورة السالم", note: "تم تقديم الطلب", at: daysAgo(5) },
      {
        from: "PENDING_REVIEW",
        to: "IN_PROGRESS",
        role: "ADMIN",
        name: admin.name,
        note: "تحويل إلى رئيس القسم: خالد الشمري",
        at: daysAgo(4),
      },
    ],
  });

  // ---------- 3) طلب «مُصعّد لوكيل التدريب» (لتجربة سيناريو الوكيل مباشرة) ----------
  await createRequest({
    traineeName: "محمد العمري",
    traineeNumber: "4412003",
    specialtyId: electricity.id,
    type: "COMPLAINT",
    body: "أجهزة القياس في معمل الكهرباء معطّلة منذ أسبوعين ولم يتم إصلاحها، مما أثّر على التطبيق العملي.",
    status: "ESCALATED",
    createdAt: daysAgo(12),
    assignedHeadId: headElectricity.id,
    approvedAt: daysAgo(11),
    lastHeadReplyAt: daysAgo(8),
    escalatedAt: daysAgo(5),
    escalationReason: "مرور 3 أيام دون رد من رئيس القسم",
    messages: [
      {
        role: "TRAINEE",
        name: "محمد العمري",
        body: "أجهزة القياس في معمل الكهرباء معطّلة منذ أسبوعين ولم يتم إصلاحها، مما أثّر على التطبيق العملي.",
        at: daysAgo(12),
      },
      {
        role: "SYSTEM",
        name: "النظام",
        body: "تمت الموافقة على الطلب وتحويله إلى رئيس قسم كهرباء: ماجد العتيبي.",
        at: daysAgo(11),
      },
      {
        role: "DEPT_HEAD",
        name: "ماجد العتيبي",
        body: "تم استلام الشكوى وسنرفع طلب صيانة.",
        at: daysAgo(8),
      },
      {
        role: "TRAINEE",
        name: "محمد العمري",
        body: "مرّ أسبوع ولم يتغيّر شيء، والمعمل ما زال متوقفًا.",
        at: daysAgo(6),
      },
      {
        role: "SYSTEM",
        name: "النظام",
        body: "تم تصعيد الطلب تلقائيًا إلى وكيل التدريب بسبب مرور 3 أيام دون رد من رئيس القسم. سيتولّى وكيل التدريب متابعة الطلب من الآن.",
        at: daysAgo(5),
      },
      {
        role: "DEPUTY",
        name: "سعيد الوكيل",
        body: "تم التواصل مع إدارة الصيانة مباشرة، وسيتم استبدال الأجهزة خلال ثلاثة أيام عمل.",
        at: daysAgo(4),
      },
    ],
    events: [
      { to: "PENDING_REVIEW", role: "TRAINEE", name: "محمد العمري", note: "تم تقديم الطلب", at: daysAgo(12) },
      {
        from: "PENDING_REVIEW",
        to: "IN_PROGRESS",
        role: "ADMIN",
        name: admin.name,
        note: "تحويل إلى رئيس القسم: ماجد العتيبي",
        at: daysAgo(11),
      },
      {
        from: "IN_PROGRESS",
        to: "ESCALATED",
        role: "SYSTEM",
        name: "النظام (تصعيد تلقائي)",
        note: "مرور 3 أيام دون رد من رئيس القسم",
        at: daysAgo(5),
      },
    ],
  });

  // ---------- 4) طلب «مرفوض» بسبب مكتوب ----------
  await createRequest({
    traineeName: "ريم الحربي",
    traineeNumber: "4412004",
    specialtyId: business.id,
    type: "REQUEST",
    body: "أطلب إعفائي من حضور التدريب الميداني هذا الفصل.",
    status: "REJECTED",
    createdAt: daysAgo(9),
    rejectedAt: daysAgo(8),
    rejectionReason:
      "التدريب الميداني متطلب إجباري للتخرج ولا يمكن الإعفاء منه. يمكنك التقدّم بطلب تأجيله للفصل القادم.",
    messages: [
      {
        role: "TRAINEE",
        name: "ريم الحربي",
        body: "أطلب إعفائي من حضور التدريب الميداني هذا الفصل.",
        at: daysAgo(9),
      },
      {
        role: "ADMIN",
        name: admin.name,
        body: "التدريب الميداني متطلب إجباري للتخرج ولا يمكن الإعفاء منه. يمكنك التقدّم بطلب تأجيله للفصل القادم.",
        at: daysAgo(8),
      },
    ],
    events: [
      { to: "PENDING_REVIEW", role: "TRAINEE", name: "ريم الحربي", note: "تم تقديم الطلب", at: daysAgo(9) },
      {
        from: "PENDING_REVIEW",
        to: "REJECTED",
        role: "ADMIN",
        name: admin.name,
        note: "التدريب الميداني متطلب إجباري للتخرج ولا يمكن الإعفاء منه.",
        at: daysAgo(8),
      },
    ],
  });

  // ---------- 5) طلب متأخر جاهز للتصعيد (لتجربة الـ cron حيًّا) ----------
  await createRequest({
    traineeName: "سلطان الدوسري",
    traineeNumber: "4412005",
    specialtyId: electronics.id,
    type: "REQUEST",
    body: "أحتاج إعادة جدولة اختبار عملي فاتني بسبب ظرف صحي، مع إرفاق التقرير الطبي.",
    status: "IN_PROGRESS",
    createdAt: daysAgo(7),
    assignedHeadId: headElectronics.id,
    approvedAt: daysAgo(6),
    // آخر رد من رئيس القسم قبل 4 أيام → تجاوز مهلة الـ 3 أيام، سيُصعَّد عند تشغيل الـ cron
    lastHeadReplyAt: daysAgo(4),
    messages: [
      {
        role: "TRAINEE",
        name: "سلطان الدوسري",
        body: "أحتاج إعادة جدولة اختبار عملي فاتني بسبب ظرف صحي، مع إرفاق التقرير الطبي.",
        at: daysAgo(7),
      },
      {
        role: "SYSTEM",
        name: "النظام",
        body: "تمت الموافقة على الطلب وتحويله إلى رئيس قسم إلكترونيات: فهد القحطاني.",
        at: daysAgo(6),
      },
      {
        role: "DEPT_HEAD",
        name: "فهد القحطاني",
        body: "أرسل لي التقرير الطبي لمراجعته.",
        at: daysAgo(4),
      },
      {
        role: "TRAINEE",
        name: "سلطان الدوسري",
        body: "تم تسليم التقرير لمكتب القسم. بانتظار ردكم.",
        at: daysAgo(3),
      },
    ],
    events: [
      { to: "PENDING_REVIEW", role: "TRAINEE", name: "سلطان الدوسري", note: "تم تقديم الطلب", at: daysAgo(7) },
      {
        from: "PENDING_REVIEW",
        to: "IN_PROGRESS",
        role: "ADMIN",
        name: admin.name,
        note: "تحويل إلى رئيس القسم: فهد القحطاني",
        at: daysAgo(6),
      },
    ],
  });

  console.log(`
✅ تمت التهيئة بنجاح.

بيانات الدخول التجريبية:
  مسؤول النظام   : ${admin.email}               / ${PASSWORDS.admin}
  وكيل التدريب   : ${deputy.email}              / ${PASSWORDS.deputy}
  رئيس قسم (تقنية معلومات) : ${headIT.email}    / ${PASSWORDS.head}
  رئيس قسم (كهرباء)        : ${headElectricity.email} / ${PASSWORDS.head}
  رئيس قسم (إلكترونيات)    : ${headElectronics.email} / ${PASSWORDS.head}

أرقام تدريبية للتجربة في /track :
  4412001 (قيد المراجعة) · 4412002 (قيد المعالجة) · 4412003 (مُصعّد) · 4412004 (مرفوض) · 4412005 (متأخر، جاهز للتصعيد)
`);
}

main()
  .catch((error) => {
    console.error("❌ فشلت التهيئة:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
