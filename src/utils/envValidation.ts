// ============================================================
// FOX AI AGENCY — Startup Environment Validation
// ============================================================
// Centralized validation of required/staged environment variables.
// Fails closed in production when truly required variables are missing.
// Never logs secret values — only reports which variable NAME is missing.
// ============================================================

export type EnvVarClassification = {
  name: string;
  required: boolean;
  scope: "production" | "staging" | "development" | "universal";
  description: string;
};

export const ENV_VAR_CATALOG: EnvVarClassification[] = [
  // APP
  { name: "NODE_ENV", required: true, scope: "universal", description: "Node environment" },
  { name: "PORT", required: false, scope: "universal", description: "Internal app port" },
  { name: "FOX_INTERNAL_PORT", required: false, scope: "universal", description: "Internal listen port (VPS staging)" },
  { name: "FOX_LISTEN_HOST", required: false, scope: "universal", description: "Bind address for Node server" },

  // FIREBASE
  { name: "GOOGLE_CLOUD_PROJECT", required: true, scope: "production", description: "GCP project ID" },
  { name: "FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON", required: false, scope: "production", description: "Firebase Admin service account JSON (preferred)" },
  { name: "GOOGLE_APPLICATION_CREDENTIALS", required: false, scope: "production", description: "Path to ADC credentials file" },

  // SECURITY
  { name: "FOX_SECRET_KEY", required: true, scope: "universal", description: "AES-256-GCM encryption key for workspace secret vault" },

  // AI PROVIDERS
  { name: "GEMINI_API_KEY", required: false, scope: "universal", description: "Google Gemini API key" },
  { name: "OPENROUTER_API_KEY", required: false, scope: "universal", description: "OpenRouter API key" },

  // TELEGRAM
  { name: "TELEGRAM_BOT_TOKEN", required: false, scope: "staging", description: "FOX Agency main Telegram bot token" },
  { name: "ENABLE_TELEGRAM", required: false, scope: "universal", description: "Feature flag to enable Telegram polling" },

  // META
  { name: "META_PAGE_ACCESS_TOKEN", required: false, scope: "staging", description: "Meta page access token" },
  { name: "META_WEBHOOK_VERIFY_TOKEN", required: false, scope: "universal", description: "Meta webhook verification token" },
  { name: "ENABLE_META", required: false, scope: "universal", description: "Feature flag to enable Meta integration" },

  // SMTP
  { name: "SMTP_HOST", required: false, scope: "staging", description: "SMTP server host" },
  { name: "SMTP_PORT", required: false, scope: "staging", description: "SMTP server port" },
  { name: "SMTP_USER", required: false, scope: "staging", description: "SMTP authentication user" },
  { name: "SMTP_PASS", required: false, scope: "staging", description: "SMTP authentication password" },
  { name: "ENABLE_SMTP", required: false, scope: "universal", description: "Feature flag to enable SMTP" },

  // EXTERNAL INTEGRATIONS
  { name: "ENABLE_EXTERNAL_CRM", required: false, scope: "universal", description: "Feature flag to enable external CRM webhooks" },

  // N8N
  { name: "ENABLE_N8N", required: false, scope: "universal", description: "Feature flag to enable n8n webhook proxy" },

  // PUBLIC URL
  { name: "FOX_PUBLIC_BASE_URL", required: false, scope: "production", description: "Public HTTPS URL for webhook callbacks" },
  { name: "PUBLIC_BASE_URL", required: false, scope: "production", description: "Legacy public URL alias" },
  { name: "APP_URL", required: false, scope: "production", description: "Legacy public URL alias" },
];

export type EnvValidationResult = {
  valid: boolean;
  isProduction: boolean;
  isStaging: boolean;
  isDevelopment: boolean;
  missing: string[];
  warnings: { name: string; detail: string }[];
};

export function validateEnvironment(): EnvValidationResult {
  const env = process.env.NODE_ENV || "development";
  const isProduction = env === "production";
  const isStaging = env === "staging";
  const isDevelopment = !isProduction && !isStaging;

  const missing: string[] = [];
  const warnings: { name: string; detail: string }[] = [];

  for (const entry of ENV_VAR_CATALOG) {
    const isSet = Boolean(process.env[entry.name]?.trim());

    // Universal required vars are always checked
    if (entry.required && entry.scope === "universal" && !isSet) {
      missing.push(entry.name);
    }

    // Production-only required vars
    if (entry.required && entry.scope === "production" && isProduction && !isSet) {
      missing.push(entry.name);
    }

    // Staging required vars
    if (entry.required && entry.scope === "staging" && (isProduction || isStaging) && !isSet) {
      missing.push(entry.name);
    }
  }

  // Additional cross-variable validations
  // Firebase Admin: need either service account JSON or ADC path
  const hasServiceAccount = Boolean(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON?.trim());
  const hasAdcPath = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim());
  const hasProjectId = Boolean(process.env.GOOGLE_CLOUD_PROJECT?.trim());

  if (isProduction && !hasServiceAccount && !hasAdcPath) {
    missing.push("FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS");
  }

  // Public URL required in production for webhook callbacks
  const hasPublicUrl = Boolean(
    process.env.FOX_PUBLIC_BASE_URL?.trim() ||
    process.env.PUBLIC_BASE_URL?.trim() ||
    process.env.APP_URL?.trim()
  );
  if (isProduction && !hasPublicUrl) {
    missing.push("FOX_PUBLIC_BASE_URL (or PUBLIC_BASE_URL / APP_URL)");
  }

  // Meta runtime secrets: required when ENABLE_META=true. Never exposed to frontend/Vite.
  if (process.env.ENABLE_META === "true") {
    if (!process.env.META_APP_SECRET?.trim()) {
      missing.push("META_APP_SECRET");
    }
    if (!process.env.META_WEBHOOK_VERIFY_TOKEN?.trim()) {
      missing.push("META_WEBHOOK_VERIFY_TOKEN");
    }
  }

  // Warnings for optional but recommended staging integrations
  if (isStaging || isProduction) {
    if (process.env.ENABLE_TELEGRAM === "true" && !process.env.TELEGRAM_BOT_TOKEN?.trim()) {
      warnings.push({
        name: "TELEGRAM_BOT_TOKEN",
        detail: "ENABLE_TELEGRAM=true but TELEGRAM_BOT_TOKEN is not set",
      });
    }
    if (process.env.ENABLE_SMTP === "true" && !process.env.SMTP_HOST?.trim()) {
      warnings.push({
        name: "SMTP_HOST",
        detail: "ENABLE_SMTP=true but SMTP_HOST is not set",
      });
    }
  }

  return {
    valid: missing.length === 0,
    isProduction,
    isStaging,
    isDevelopment,
    missing,
    warnings,
  };
}

// Print validation results to console (never logs values, only names)
export function printEnvValidation(): EnvValidationResult {
  const result = validateEnvironment();

  if (result.valid) {
    console.log("✅ [FOX Env] All required environment variables are configured.");
  } else {
    console.error("❌ [FOX Env] Missing required environment variables:");
    for (const name of result.missing) {
      console.error(`   - ${name}`);
    }
  }

  for (const warning of result.warnings) {
    console.warn(`⚠️ [FOX Env] ${warning.name}: ${warning.detail}`);
  }

  return result;
}
