import { db, sanitizeForFirestore } from "./firebase";
import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  where,
} from "firebase/firestore";

export interface CouponValidationResult {
  valid: boolean;
  reason?: string;
  coupon?: any;
  originalAmount?: number;
  discountAmount?: number;
  finalAmount?: number;
}

const normalizeCode = (value: string) =>
  String(value || "").trim().toUpperCase();

const makeId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

export const couponService = {
  async findCoupon(workspaceId: string, code: string) {
    const normalizedCode = normalizeCode(code);

    if (!workspaceId || !normalizedCode) {
      return null;
    }

    const ref = collection(db, "coupons");

    const q = query(
      ref,
      where("workspaceId", "==", workspaceId),
      where("code", "==", normalizedCode)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data(),
    };
  },

  async validateCoupon(
    workspaceId: string,
    code: string,
    amount?: number
  ): Promise<CouponValidationResult> {
    const coupon: any =
      await this.findCoupon(workspaceId, code);

    if (!coupon) {
      return {
        valid: false,
        reason: "COUPON_NOT_FOUND",
      };
    }

    if (coupon.isActive === false) {
      return {
        valid: false,
        reason: "COUPON_INACTIVE",
        coupon,
      };
    }

    const now = new Date();

    if (coupon.validFrom) {
      const validFrom = new Date(coupon.validFrom);

      if (!Number.isNaN(validFrom.getTime()) && now < validFrom) {
        return {
          valid: false,
          reason: "COUPON_NOT_STARTED",
          coupon,
        };
      }
    }

    if (coupon.validUntil) {
      const validUntil = new Date(coupon.validUntil);

      if (!Number.isNaN(validUntil.getTime())) {
        validUntil.setHours(23, 59, 59, 999);

        if (now > validUntil) {
          return {
            valid: false,
            reason: "COUPON_EXPIRED",
            coupon,
          };
        }
      }
    }

    const usageLimit =
      Number(coupon.usageLimit || 0);

    const usageCount =
      Number(coupon.usageCount || 0);

    if (
      usageLimit > 0 &&
      usageCount >= usageLimit
    ) {
      return {
        valid: false,
        reason: "COUPON_USAGE_LIMIT_REACHED",
        coupon,
      };
    }

    if (
      amount !== undefined &&
      Number.isFinite(amount)
    ) {
      const originalAmount =
        Math.max(0, Number(amount));

      let discountAmount = 0;

      if (coupon.discountType === "percentage") {
        const percentage =
          Math.min(
            100,
            Math.max(
              0,
              Number(coupon.discountValue || 0)
            )
          );

        discountAmount =
          originalAmount * (percentage / 100);
      } else {
        discountAmount =
          Math.max(
            0,
            Number(coupon.discountValue || 0)
          );
      }

      discountAmount =
        Math.min(
          originalAmount,
          discountAmount
        );

      discountAmount =
        Math.round(discountAmount * 100) / 100;

      const finalAmount =
        Math.round(
          (originalAmount - discountAmount) * 100
        ) / 100;

      return {
        valid: true,
        coupon,
        originalAmount,
        discountAmount,
        finalAmount,
      };
    }

    return {
      valid: true,
      coupon,
    };
  },

  async redeemCoupon(input: {
    workspaceId: string;
    code: string;
    customerName?: string;
    customerPhone?: string;
    channel?: string;
    sessionId?: string;
    transactionType:
      | "appointment"
      | "product_order"
      | "service"
      | "manual";
    transactionId?: string;
    originalAmount: number;
  }) {
    const validation =
      await this.validateCoupon(
        input.workspaceId,
        input.code,
        input.originalAmount
      );

    if (
      !validation.valid ||
      !validation.coupon
    ) {
      return validation;
    }

    const coupon: any = validation.coupon;

    const couponRef =
      doc(db, "coupons", coupon.id);

    const redemptionId =
      makeId("red");

    const redemptionRef =
      doc(
        db,
        "workspaces",
        input.workspaceId,
        "couponRedemptions",
        redemptionId
      );

    await runTransaction(
      db,
      async (transaction) => {
        const couponSnapshot =
          await transaction.get(couponRef);

        if (!couponSnapshot.exists()) {
          throw new Error("COUPON_NOT_FOUND");
        }

        const fresh: any =
          couponSnapshot.data();

        if (fresh.workspaceId !== input.workspaceId) {
          throw new Error("COUPON_WORKSPACE_MISMATCH");
        }

        if (fresh.isActive === false) {
          throw new Error("COUPON_INACTIVE");
        }

        const usageLimit =
          Number(fresh.usageLimit || 0);

        const usageCount =
          Number(fresh.usageCount || 0);

        if (
          usageLimit > 0 &&
          usageCount >= usageLimit
        ) {
          throw new Error(
            "COUPON_USAGE_LIMIT_REACHED"
          );
        }

        const now = new Date();

        if (fresh.validFrom) {
          const validFrom =
            new Date(fresh.validFrom);

          if (
            !Number.isNaN(validFrom.getTime()) &&
            now < validFrom
          ) {
            throw new Error(
              "COUPON_NOT_STARTED"
            );
          }
        }

        if (fresh.validUntil) {
          const validUntil =
            new Date(fresh.validUntil);

          if (
            !Number.isNaN(validUntil.getTime())
          ) {
            validUntil.setHours(
              23,
              59,
              59,
              999
            );

            if (now > validUntil) {
              throw new Error(
                "COUPON_EXPIRED"
              );
            }
          }
        }

        transaction.update(
          couponRef,
          {
            usageCount: usageCount + 1,
            lastUsedAt:
              new Date().toISOString(),
          }
        );

        transaction.set(
          redemptionRef,
          sanitizeForFirestore({
            id: redemptionId,
            workspaceId:
              input.workspaceId,
            couponId: coupon.id,
            code: normalizeCode(
              input.code
            ),
            discountType:
              coupon.discountType,
            discountValue:
              coupon.discountValue,

            customerName:
              input.customerName,
            customerPhone:
              input.customerPhone,
            channel:
              input.channel,
            sessionId:
              input.sessionId,

            transactionType:
              input.transactionType,
            transactionId:
              input.transactionId,

            originalAmount:
              validation.originalAmount,
            discountAmount:
              validation.discountAmount,
            finalAmount:
              validation.finalAmount,

            redeemedAt:
              new Date().toISOString(),
          })
        );
      }
    );

    // Global compatibility collection for dashboards/reporting.
    await setDoc(
      doc(
        db,
        "couponRedemptions",
        redemptionId
      ),
      sanitizeForFirestore({
        id: redemptionId,
        workspaceId:
          input.workspaceId,
        couponId: coupon.id,
        code: normalizeCode(input.code),
        customerName:
          input.customerName,
        customerPhone:
          input.customerPhone,
        transactionType:
          input.transactionType,
        transactionId:
          input.transactionId,
        originalAmount:
          validation.originalAmount,
        discountAmount:
          validation.discountAmount,
        finalAmount:
          validation.finalAmount,
        redeemedAt:
          new Date().toISOString(),
      })
    );

    console.log(
      `🎟️ [FOX Coupon] Redeemed | Workspace=${input.workspaceId} | Code=${normalizeCode(
        input.code
      )} | Discount=${validation.discountAmount} | Final=${validation.finalAmount}`
    );

    return {
      ...validation,
      redemptionId,
      redeemed: true,
    };
  },
};
