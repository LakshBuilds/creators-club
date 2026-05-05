import "server-only";
import { createSign } from "node:crypto";

type ServiceAccount = {
  client_email: string;
  private_key: string;
};

let cachedToken: { value: string; exp: number } | null = null;

function getCreds(): ServiceAccount {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set");
  // Support either raw JSON or base64-encoded JSON (env vars choke on newlines).
  let json = raw;
  if (!raw.trim().startsWith("{")) {
    json = Buffer.from(raw, "base64").toString("utf8");
  }
  const obj = JSON.parse(json) as ServiceAccount;
  if (!obj.client_email || !obj.private_key) {
    throw new Error("Service account JSON missing client_email or private_key");
  }
  return { ...obj, private_key: obj.private_key.replace(/\\n/g, "\n") };
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.value;

  const sa = getCreds();
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/drive.file",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600
    })
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const signature = b64url(signer.sign(sa.private_key));
  const jwt = `${header}.${claim}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });
  if (!res.ok) {
    throw new Error(`Drive token exchange failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, exp: now + json.expires_in };
  return json.access_token;
}

export type UploadedFile = {
  id: string;
  name: string;
  webViewLink: string;
  webContentLink?: string | null;
  /** Embeddable URL — works in an iframe with controls. */
  previewUrl: string;
};

/**
 * Multipart-upload a video to a Drive folder. Returns the new file's ID and a
 * preview URL that admin pages can drop straight into an <iframe>.
 * The destination folder must be shared with the service account as Editor.
 */
export async function uploadVideoToDrive(opts: {
  bytes: Uint8Array;
  filename: string;
  mimeType: string;
  folderId?: string;
  /** Optional Drive description — we use it to stash the application id. */
  description?: string;
}): Promise<UploadedFile> {
  const folderId = opts.folderId ?? process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) throw new Error("GOOGLE_DRIVE_FOLDER_ID is not set");

  const token = await getAccessToken();
  const boundary = `boundary-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

  const metadata = {
    name: opts.filename,
    parents: [folderId],
    mimeType: opts.mimeType,
    description: opts.description ?? undefined
  };

  const head = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${opts.mimeType}\r\n\r\n`
  );
  const tail = Buffer.from(`\r\n--${boundary}--`);
  const body = Buffer.concat([head, Buffer.from(opts.bytes), tail]);

  const res = await fetch(
    // supportsAllDrives lets us upload into a Shared Drive — required because
    // service accounts have no personal-Drive quota and must write into a
    // Shared Drive (or be granted user-OAuth domain delegation).
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink,webContentLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`
      },
      body
    }
  );
  if (!res.ok) {
    throw new Error(`Drive upload failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as {
    id: string;
    name: string;
    webViewLink: string;
    webContentLink?: string;
  };

  // Make it readable by anyone with the link so the admin <iframe> can play
  // without a Google login. The folder may already grant this; we still set
  // it on the file to be explicit.
  await fetch(
    `https://www.googleapis.com/drive/v3/files/${data.id}/permissions?supportsAllDrives=true`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ role: "reader", type: "anyone" })
    }
  ).catch(() => undefined);

  return {
    id: data.id,
    name: data.name,
    webViewLink: data.webViewLink,
    webContentLink: data.webContentLink ?? null,
    previewUrl: `https://drive.google.com/file/d/${data.id}/preview`
  };
}
