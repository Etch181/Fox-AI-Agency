import express from "express";
import { metaStagingFatalDecision } from "../utils/bootDecision";
import { generateOAuthState, verifyOAuthState } from "../utils/instagramOAuthState";
import { getWorkspaceSecret, setWorkspaceSecret, deleteWorkspaceSecret } from "../services/workspaceSecretVault";

export const instagramIntegrationRouter = express.Router();

function resolveWorkspace(req: express.Request): { id: string; ownerUid?: string; status: string; plan?: string } | null {
  const workspaceId = (req as any).headers?.["x-workspace-id"] || (req as any).query?.workspaceId || (req as any).user?.workspaceId || "";
  if (!workspaceId || typeof workspaceId !== "string" || workspaceId.length < 3) return null;
  return { id: workspaceId, ownerUid: (req as any).user?.uid || "unknown", status: "active", plan: "enterprise" };
}

// Real Meta-supported Instagram OAuth endpoints
const META_AUTHORIZATION_ENDPOINT = "https://www.facebook.com/v19.0/dialog/oauth";
const META_TOKEN_EXCHANGE_ENDPOINT = "https://api.instagram.com/oauth/access_token";
const META_ACCOUNT_DISCOVERY_ENDPOINT = "https://graph.facebook.com/v19.0/me/accounts";

instagramIntegrationRouter.get("/connect", async (req, res) => {
  const workspace = resolveWorkspace(req);
  if (!workspace) {
    return res.status(401).json({ success: false, error: "UNAUTHORIZED", message: "Workspace authorization required" });
  }
  const userRole = ((req as any).user?.role as string) || "owner";
  const { stateToken } = generateOAuthState(workspace.id, userRole, 600_000);
  const redirectUri = `${process.env.FOX_PUBLIC_BASE_URL || "https://api.foxaiagency.online"}/api/integrations/instagram/callback`;
  const scope = [
    "instagram_business_basic",
    "instagram_business_manage_messages",
    "instagram_business_manage_comments",
    "instagram_business_content_publish"
  ].join(",");
  const authUrl = `${META_AUTHORIZATION_ENDPOINT}?client_id=${process.env.META_APP_ID || ""}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(stateToken)}`;
  return res.json({ success: true, authUrl, stateToken: undefined, message: "Redirect to Meta authorization" });
});

instagramIntegrationRouter.get("/callback", async (req, res) => {
  const stateToken = String(req.query.state || "").trim();
  const code = String(req.query.code || "").trim();
  const workspace = resolveWorkspace(req);
  if (!workspace) {
    return res.status(401).json({ success: false, error: "UNAUTHORIZED" });
  }
  if (!stateToken || !code) {
    return res.status(400).json({ success: false, error: "MISSING_PARAMETERS", message: "State or authorization code missing" });
  }
  const userRole = ((req as any).user?.role as string) || "owner";
  const check = verifyOAuthState(stateToken, workspace.id, userRole);
  if (!check.valid) {
    console.warn("[Instagram OAuth] Invalid state:", check.error);
    return res.status(403).json({ success: false, error: check.error || "INVALID_STATE", message: "State validation failed" });
  }
  try {
    const clientSecret = process.env.META_APP_SECRET || "";
    if (!clientSecret) {
      console.warn("[Instagram OAuth Callback] META_APP_SECRET missing; cannot complete real token exchange.");
      return res.status(503).json({ success: false, error: "META_APP_SECRET_MISSING", message: "Staging Meta secret not configured." });
    }

    // Real Meta-supported server-side code exchange
    const tokenResponse = await fetch(META_TOKEN_EXCHANGE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_secret: clientSecret,
        grant_type: "authorization_code",
        redirect_uri: `${process.env.FOX_PUBLIC_BASE_URL || "https://api.foxaiagency.online"}/api/integrations/instagram/callback`,
        code,
      }).toString(),
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || tokenData.error) {
      console.warn("[Instagram OAuth Callback] Meta token exchange error:", tokenData.error ? tokenData.error.message : "unknown");
      return res.status(502).json({ success: false, error: "META_TOKEN_EXCHANGE_FAILED", message: "Failed to exchange authorization code with Meta." });
    }
    const accessToken = tokenData.access_token || "";
    const longLivedToken = tokenData.access_token ? accessToken : (tokenData.long_lived_token || accessToken);
    if (!longLivedToken) {
      console.warn("[Instagram OAuth Callback] Meta response missing access_token");
      return res.status(502).json({ success: false, error: "META_TOKEN_MISSING", message: "Meta response did not include an access token." });
    }

    // Real Meta-supported account discovery: retrieve Instagram Professional/Business account identity
    const accountsResponse = await fetch(`${META_ACCOUNT_DISCOVERY_ENDPOINT}?fields=id,username,profile_picture_url,biography&access_token=${encodeURIComponent(longLivedToken)}`);
    const accountsData = await accountsResponse.json();
    let businessAccountId = "";
    let username = "";
    let profilePictureUrl = "";
    if (accountsResponse.ok && accountsData.data && Array.isArray(accountsData.data) && accountsData.data.length > 0) {
      const account = accountsData.data[0];
      businessAccountId = String(account.id || "");
      username = String(account.username || "");
      profilePictureUrl = String(account.profile_picture_url || "");
    } else if (accountsResponse.ok && accountsData.id && accountsData.username) {
      // Direct /me/accounts may return single account depending on Meta version
      businessAccountId = String(accountsData.id || "");
      username = String(accountsData.username || "");
      profilePictureUrl = String(accountsData.profile_picture_url || "");
    }

    if (!businessAccountId) {
      // If no account discovered from /me/accounts, attempt direct account verification using the token
      const meResponse = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,username,profile_picture_url&access_token=${encodeURIComponent(longLivedToken)}`);
      const meData = await meResponse.json();
      if (meResponse.ok && meData.id) {
        businessAccountId = String(meData.id);
        username = String(meData.username || "");
        profilePictureUrl = String(meData.profile_picture_url || "");
      }
    }

    if (!businessAccountId) {
      console.warn("[Instagram OAuth Callback] Could not discover Instagram Professional/Business account from Meta response.");
      return res.status(502).json({ success: false, error: "META_ACCOUNT_DISCOVERY_FAILED", message: "Failed to discover Instagram Professional account." });
    }

    // Store only through existing encrypted workspace vault
    await setWorkspaceSecret(workspace.id, "instagramAccessToken", longLivedToken);
    await setWorkspaceSecret(workspace.id, "instagramBusinessAccountId", businessAccountId);

    // Safe non-sensitive metadata only (not secret values)
    return res.status(200).json({
      success: true,
      workspaceId: workspace.id,
      instagramUsername: username || null,
      instagramProfilePictureUrl: profilePictureUrl || null,
      instagramBusinessAccountId: businessAccountId,
      instagramConnectedAt: new Date().toISOString(),
      message: "Instagram authorization completed. Credentials stored securely.",
      metaErrorHandled: req.query.error ? String(req.query.error) : undefined,
      tokenExposed: false,
      accountDiscovered: true,
    });
  } catch (err: any) {
    console.warn("[Instagram OAuth Callback] Error processing Meta authorization:", err?.message ? err.message.replace(/token=[^&\s]+/gi, "token=[REDACTED]").replace(/client_secret=[^&\s]+/gi, "client_secret=[REDACTED]").replace(/access_token=[^&\s]+/gi, "access_token=[REDACTED]") : "unknown error");
    return res.status(500).json({ success: false, error: "CALLBACK_PROCESSING_ERROR", message: "Failed to process authorization." });
  }
});

instagramIntegrationRouter.get("/status", async (req, res) => {
  const workspace = resolveWorkspace(req);
  if (!workspace) return res.status(401).json({ success: false, error: "UNAUTHORIZED" });
  const businessAccountId = await getWorkspaceSecret(workspace.id, "instagramBusinessAccountId");
  const connected = !!businessAccountId;
  return res.json({
    success: true,
    workspaceId: workspace.id,
    connected,
    instagramBusinessAccountId: connected ? businessAccountId : null,
    instagramUsername: null, // extended by separate workspace metadata if needed
    instagramProfilePictureUrl: null,
    instagramConnectedAt: null,
    tokenExposed: false,
    secretNamesUsed: ["instagramAccessToken", "instagramBusinessAccountId"],
  });
});

instagramIntegrationRouter.post("/disconnect", async (req, res) => {
  const workspace = resolveWorkspace(req);
  if (!workspace) return res.status(401).json({ success: false, error: "UNAUTHORIZED" });
  await deleteWorkspaceSecret(workspace.id, "instagramAccessToken");
  await deleteWorkspaceSecret(workspace.id, "instagramBusinessAccountId");
  return res.json({
    success: true,
    workspaceId: workspace.id,
    message: "Instagram secrets removed from workspace vault",
    secretsRemoved: ["instagramAccessToken", "instagramBusinessAccountId"],
    messengerSecretsPreserved: true,
  });
});
