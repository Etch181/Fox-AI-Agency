import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  answerTenantBusinessInquiry,
  type TenantBusinessInquiryContext,
} from "../src/services/tenantBusinessInquiry.ts";

const aiAgentSource = readFileSync(
  new URL("../src/services/aiAgentService.ts", import.meta.url),
  "utf8",
);
const couponServiceSource = readFileSync(
  new URL("../src/services/couponService.ts", import.meta.url),
  "utf8",
);
const serverSource = readFileSync(
  new URL("../server.ts", import.meta.url),
  "utf8",
);

const tenant: TenantBusinessInquiryContext = {
  businessName: "عيادة دكتور حسام",
  businessDescription: "عيادة متخصصة في الرعاية الطبية.",
  workingHours: "يومياً من 4 مساءً إلى 10 مساءً",
  clinicServices: [
    {
      name: "كشف عيادة",
      price: 350,
      durationMinutes: 30,
      available: true,
    },
    {
      name: "متابعة",
      price: 150,
      durationMinutes: 15,
      available: true,
    },
    {
      name: "خدمة متوقفة",
      price: 999,
      durationMinutes: 10,
      available: false,
    },
  ],
  doctors: [
    {
      name: "حسام",
      specialty: "باطنة",
      consultationFeeEGP: 350,
    },
  ],
  coupons: [
    {
      code: "CLINIC20",
      discountType: "percentage",
      discountValue: 20,
      condition: "على كشف العيادة",
      isActive: true,
      aiCanUse: true,
      validFrom: "2026-08-01",
      validUntil: "2026-09-30",
      usageLimit: 100,
      usageCount: 2,
    },
    {
      code: "HIDDEN",
      discountType: "fixed",
      discountValue: 500,
      condition: "غير متاح للوكيل",
      isActive: true,
      aiCanUse: false,
    },
  ],
  knowledgeBase: [
    {
      question: "ما مميزات العيادة؟",
      answer: "متابعة دقيقة وخدمة سريعة.",
      approved: true,
    },
  ],
};

const now = new Date("2026-08-30T12:00:00Z");

test("post-booking pricing is answered from configured tenant services without a welcome reset", () => {
  const result = answerTenantBusinessInquiry("سعر الكشف كام اصلا", tenant, now);
  assert.ok(result);
  assert.equal(result.intent, "pricing");
  assert.match(result.response, /كشف عيادة/);
  assert.match(result.response, /350/);
  assert.doesNotMatch(result.response, /أهلاً بك|كيف يمكنني مساعدتك اليوم/);
  assert.doesNotMatch(result.response, /999/);
});

test("post-booking services list only configured available clinic services", () => {
  const result = answerTenantBusinessInquiry("الخدمات", tenant, now);
  assert.ok(result);
  assert.equal(result.intent, "services");
  assert.match(result.response, /كشف عيادة/);
  assert.match(result.response, /متابعة/);
  assert.doesNotMatch(result.response, /خدمة متوقفة/);
});

test("non-clinic pricing and services use the selected tenant industry catalog", () => {
  const restaurant = answerTenantBusinessInquiry(
    "الأسعار والخدمات",
    {
      businessName: "مطعم",
      industry: "Restaurant",
      menu: [
        { name: "وجبة مشويات", price: 220, available: true },
        { name: "وجبة متوقفة", price: 999, available: false },
      ],
    },
    now,
  );
  assert.ok(restaurant);
  assert.match(restaurant.response, /وجبة مشويات/);
  assert.match(restaurant.response, /220/);
  assert.doesNotMatch(restaurant.response, /وجبة متوقفة/);

  const retail = answerTenantBusinessInquiry(
    "الخدمات",
    {
      industry: "Retail",
      products: [{ name: "منتج متاح", price: 75, available: true }],
    },
    now,
  );
  assert.ok(retail);
  assert.match(retail.response, /منتج متاح/);
  assert.match(retail.response, /75/);
});

test("post-booking offers use only active AI-visible tenant coupons", () => {
  const result = answerTenantBusinessInquiry("عندكم عروض؟", tenant, now);
  assert.ok(result);
  assert.equal(result.intent, "offers");
  assert.match(result.response, /CLINIC20/);
  assert.match(result.response, /20%/);
  assert.doesNotMatch(result.response, /HIDDEN/);
});

test("offers inquiry honestly reports none when no configured coupon is eligible", () => {
  const result = answerTenantBusinessInquiry(
    "عندكم عروض؟",
    { ...tenant, coupons: [] },
    now,
  );
  assert.ok(result);
  assert.match(result.response, /لا توجد عروض متاحة حالياً/);

  const legacyWithoutApproval = answerTenantBusinessInquiry(
    "عندكم عروض؟",
    {
      ...tenant,
      coupons: [{
        code: "DRAFT",
        discountType: "percentage",
        discountValue: 50,
      }],
    },
    now,
  );
  assert.ok(legacyWithoutApproval);
  assert.doesNotMatch(legacyWithoutApproval.response, /DRAFT/);
});

test("working hours and approved business facts answer fresh intents after booking", () => {
  const hours = answerTenantBusinessInquiry("مواعيدكم ايه؟", tenant, now);
  assert.ok(hours);
  assert.equal(hours.intent, "hours");
  assert.match(hours.response, /4 مساءً إلى 10 مساءً/);

  const features = answerTenantBusinessInquiry("طب ايه المميزات", tenant, now);
  assert.ok(features);
  assert.equal(features.intent, "business_info");
  assert.match(features.response, /متابعة دقيقة وخدمة سريعة/);

  const unapproved = answerTenantBusinessInquiry(
    "ايه المميزات",
    {
      knowledgeBase: [{
        question: "draft",
        answer: "لا يجب عرضه",
      }],
    },
    now,
  );
  assert.ok(unapproved);
  assert.doesNotMatch(unapproved.response, /لا يجب عرضه/);
});

test("thanks receives a natural reply while a fresh booking intent remains for the booking state machine", () => {
  const thanks = answerTenantBusinessInquiry("شكرا", tenant, now);
  assert.ok(thanks);
  assert.equal(thanks.intent, "thanks");
  assert.doesNotMatch(thanks.response, /أهلاً بك|الخدمات والأسعار أو طلب المواعيد/);

  assert.equal(
    answerTenantBusinessInquiry("عاوز احجز مرة تانية", tenant, now),
    null,
  );
  assert.equal(
    answerTenantBusinessInquiry("حجز موعد جديد", tenant, now),
    null,
  );
  assert.match(aiAgentSource, /حجز\\s\*موعد/);
  assert.match(aiAgentSource, /book\\s\+new\\s\+appointment/);
});

test("general agent context exposes only explicitly approved knowledge", () => {
  assert.match(
    aiAgentSource,
    /\.filter\(\(k\) => k\.approved === true\)/,
  );
});

test("AI coupon validation and redemption require explicit activation and AI approval", () => {
  assert.match(couponServiceSource, /coupon\.isActive !== true \|\| coupon\.aiCanUse !== true/);
  assert.match(couponServiceSource, /fresh\.isActive !== true \|\| fresh\.aiCanUse !== true/);
});

test("runtime hydration loads tenant-scoped business catalogs and booking completion is terminal", () => {
  assert.match(serverSource, /getClinicServices\(workspaceId\)/);
  assert.match(serverSource, /getDoctors\(workspaceId\)/);
  assert.match(serverSource, /getKnowledgeFacts\(workspaceId\)/);
  assert.match(serverSource, /getCoupons\(workspaceId\)/);
  assert.match(serverSource, /getMenuItems\(workspaceId\)/);
  assert.match(serverSource, /getMedicines\(workspaceId\)/);
  assert.match(serverSource, /getProducts\(workspaceId\)/);
  assert.match(serverSource, /getCourses\(workspaceId\)/);
  assert.match(aiAgentSource, /answerTenantBusinessInquiry/);
  assert.match(aiAgentSource, /BOOKING_STATE:COMPLETED/);
  assert.doesNotMatch(
    aiAgentSource,
    /responseText = `أهلاً بك في \$\{businessName\}/,
  );
});
