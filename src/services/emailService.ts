import nodemailer from "nodemailer";

export interface SendOtpParams {
  toEmail: string;
  ownerName: string;
  otpCode: string;
  workspaceName?: string;
}

export interface SendOtpResult {
  success: boolean;
  messageId?: string;
  error?: string;
  previewUrl?: string;
  mode: "smtp" | "ethereal" | "simulation";
}

class EmailService {
  private getTransporter() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const port = parseInt(process.env.SMTP_PORT || "587", 10);

    if (host && user && pass) {
      return {
        transporter: nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
          tls: {
            rejectUnauthorized: false,
          },
        }),
        mode: "smtp" as const,
      };
    }

    return null;
  }

  public async sendVerificationEmail({
    toEmail,
    ownerName,
    otpCode,
    workspaceName = "نشاطك التجاري",
  }: SendOtpParams): Promise<SendOtpResult> {
    const fromAddress =
      process.env.SMTP_FROM || '"FOX AI AGENCY 🦊" <noreply@foxaiagency.com>';

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>تأكيد تفعيل الحساب - FOX AI AGENCY</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #0f172a;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #f8fafc;
          direction: rtl;
        }
        .container {
          max-width: 600px;
          margin: 30px auto;
          background: #1e293b;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid #334155;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        }
        .header {
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
          padding: 30px 20px;
          text-align: center;
          border-bottom: 2px solid #10b981;
        }
        .logo {
          font-size: 26px;
          font-weight: 900;
          color: #ffffff;
          letter-spacing: 1px;
        }
        .logo span {
          color: #10b981;
        }
        .content {
          padding: 35px 30px;
          text-align: right;
        }
        .greeting {
          font-size: 20px;
          font-weight: bold;
          color: #ffffff;
          margin-bottom: 15px;
        }
        .text {
          font-size: 15px;
          line-height: 1.8;
          color: #cbd5e1;
          margin-bottom: 25px;
        }
        .otp-box {
          background: linear-gradient(135deg, #0284c7 0%, #0d9488 100%);
          border-radius: 16px;
          padding: 25px;
          text-align: center;
          margin: 25px 0;
          box-shadow: 0 10px 25px rgba(13, 148, 136, 0.3);
        }
        .otp-label {
          font-size: 13px;
          color: #e0f2fe;
          font-weight: bold;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .otp-code {
          font-size: 38px;
          font-weight: 900;
          letter-spacing: 10px;
          color: #ffffff;
          font-family: monospace;
        }
        .details-card {
          background: #0f172a;
          border-radius: 12px;
          padding: 18px;
          margin-bottom: 25px;
          border: 1px solid #334155;
        }
        .details-item {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 13px;
          border-bottom: 1px border #1e293b;
        }
        .details-label {
          color: #94a3b8;
        }
        .details-val {
          color: #38bdf8;
          font-weight: bold;
        }
        .footer {
          background: #0f172a;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #64748b;
          border-top: 1px solid #1e293b;
        }
        .badge {
          display: inline-block;
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">FOX <span>AI AGENCY</span> 🦊🤖</div>
          <div style="margin-top: 8px;">
            <span class="badge">تفعيل الحساب وإدارة اللوحة</span>
          </div>
        </div>

        <div class="content">
          <div class="greeting">أهلاً بك يا ${ownerName} 👋</div>
          
          <p class="text">
            شكراً لتسجيك معنا في منصة <strong>FOX AI AGENCY</strong> للوكلاء الذكاء الاصطناعي.
            لقد تم إنشاء طلب تفعيل لوحة التحكّم للنشاط التجاري: <strong style="color: #38bdf8;">"${workspaceName}"</strong>.
            <br>
            برجاء استخدام كود التفعيل المكون من 6 أرقام لتأكيد بريدك الإلكتروني والبدء في التحكم ببياناتك:
          </p>

          <div class="otp-box">
            <div class="otp-label">رمز التحقق والتفعيل (Activation OTP)</div>
            <div class="otp-code">${otpCode}</div>
          </div>

          <div class="details-card">
            <div class="details-item">
              <span class="details-label">البريد المستهدف:</span>
              <span class="details-val">${toEmail}</span>
            </div>
            <div class="details-item">
              <span class="details-label">صلاحية الرمز:</span>
              <span class="details-val">15 دقيقة</span>
            </div>
            <div class="details-item">
              <span class="details-label">حالة التثبيت:</span>
              <span class="details-val">جاهز للتفعيل اللحظي ⚡</span>
            </div>
          </div>

          <p class="text" style="font-size: 13px; color: #94a3b8;">
            ⚠️ إذا لم تقم بطلب هذا الرمز بنفسك، يمكنك تجاهل هذه الرسالة بأمان. لا تشارك هذا الرمز مع أي شخص.
          </p>
        </div>

        <div class="footer">
          &copy; ${new Date().getFullYear()} FOX AI AGENCY - منصة الذكاء الاصطناعي وإدارة خدمة العملاء المتقدمة.
        </div>
      </div>
    </body>
    </html>
    `;

    const mailOptions = {
      from: fromAddress,
      to: toEmail,
      subject: `🔑 رمز تفعيل حسابك [${otpCode}] - FOX AI AGENCY`,
      html: htmlContent,
      text: `أهلاً بك ${ownerName}، رمز التفعيل الخاص بك في FOX AI AGENCY هو: ${otpCode} (مكون من 6 أرقام) للنشاط: ${workspaceName}.`,
    };

    const smtpSetup = this.getTransporter();

    if (smtpSetup) {
      try {
        const info = await smtpSetup.transporter.sendMail(mailOptions);
        console.log(`[EmailService] OTP Mail sent via SMTP to ${toEmail}: ${info.messageId}`);
        return {
          success: true,
          messageId: info.messageId,
          mode: "smtp",
        };
      } catch (err: any) {
        console.error(`[EmailService] SMTP send error:`, err.message || err);
        // Fallback to ethereal / simulation
      }
    }

    // Fallback: Ethereal Test Account or Console Simulation
    try {
      const testAccount = await nodemailer.createTestAccount();
      const testTransporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      const info = await testTransporter.sendMail(mailOptions);
      const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
      console.log(`[EmailService] Ethereal OTP Email sent to ${toEmail}. Preview URL: ${previewUrl}`);

      return {
        success: true,
        messageId: info.messageId,
        previewUrl,
        mode: "ethereal",
      };
    } catch (fallbackErr: any) {
      console.log(
        `[EmailService Simulation] OTP for ${toEmail} (${ownerName}): [${otpCode}]`
      );
      return {
        success: true,
        mode: "simulation",
      };
    }
  }
}

export const emailService = new EmailService();
