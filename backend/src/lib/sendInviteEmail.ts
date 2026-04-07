type SendInviteEmailInput = {
  toEmail: string;
  toName?: string | null;
  projectTitle: string;
  inviterName?: string | null;
  registerUrl?: string;
};

function normalizeRegisterUrl(value?: string | null) {
  const raw = (value || "").trim();

  if (!raw) return "";

  if (
    raw.includes("localhost:3000") ||
    raw.includes("127.0.0.1") ||
    raw.startsWith("http://localhost")
  ) {
    return "";
  }

  return raw;
}

export async function sendInviteEmail({
  toEmail,
  toName,
  projectTitle,
  inviterName,
  registerUrl,
}: SendInviteEmailInput) {
  console.log("[invite-email] sendInviteEmail iniciado");

  const apiKey = (process.env.BREVO_API_KEY || "")
    .trim()
    .replace(/\r/g, "")
    .replace(/\n/g, "");

  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not configured");
  }

  const senderEmail = (process.env.BREVO_SENDER_EMAIL || "comunidad@wezet.org").trim();
  const senderName = (process.env.BREVO_SENDER_NAME || "Equipo de WEZET").trim();

  const safeRegisterUrlFromArg = normalizeRegisterUrl(registerUrl);
  const safeRegisterUrlFromEnv = normalizeRegisterUrl(process.env.BREVO_REGISTER_URL);

  const finalRegisterUrl =
    safeRegisterUrlFromArg ||
    safeRegisterUrlFromEnv ||
    "https://wezet-frontend-staging-499942741847.us-central1.run.app/register";

  const safeName = (toName || toEmail.split("@")[0] || "usuario").trim();
  const safeInviter = (inviterName || "Equipo de WEZET").trim();

  console.log("[invite-email] toEmail:", toEmail);
  console.log("[invite-email] apiKey length:", apiKey.length);
  console.log("[invite-email] senderEmail:", senderEmail);
  console.log("[invite-email] registerUrl:", finalRegisterUrl);

  const subject = `Has sido agregado al proyecto "${projectTitle}" en WEZET`;

  const htmlContent = `
    <div style="font-family: Arial, Helvetica, sans-serif; background:#f8fafc; padding:32px; color:#0f172a;">
      <div style="max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden;">
        <div style="background:#0b1220; padding:24px 32px;">
          <h1 style="margin:0; font-size:24px; color:#ffffff;">WEZET</h1>
          <p style="margin:8px 0 0; color:#cbd5e1; font-size:14px;">
            Invitación a proyecto
          </p>
        </div>

        <div style="padding:32px;">
          <p style="margin:0 0 16px; font-size:16px;">
            Hola <strong>${escapeHtml(safeName)}</strong>,
          </p>

          <p style="margin:0 0 16px; font-size:15px; line-height:1.6;">
            Te informamos que has sido agregado al proyecto
            <strong>"${escapeHtml(projectTitle)}"</strong> en WEZET.
          </p>

          <p style="margin:0 0 16px; font-size:15px; line-height:1.6;">
            Invitado por: <strong>${escapeHtml(safeInviter)}</strong>
          </p>

          <p style="margin:0 0 24px; font-size:15px; line-height:1.6;">
            Para poder ver los detalles del proyecto, revisar tu NDA y continuar con el flujo,
            debes estar registrado en nuestra plataforma.
          </p>

          <div style="margin:0 0 24px;">
            <a
              href="${escapeAttribute(finalRegisterUrl)}"
              style="display:inline-block; background:#f2c94c; color:#111827; text-decoration:none; font-weight:700; padding:14px 22px; border-radius:12px;"
            >
              Registrarme gratis en WEZET
            </a>
          </div>

          <p style="margin:0 0 8px; font-size:14px; line-height:1.6; color:#475569;">
            Si ya tienes cuenta, puedes ingresar con tu correo y revisar si el proyecto ya está disponible.
          </p>

          <p style="margin:0; font-size:14px; line-height:1.6; color:#475569;">
            Si el botón no funciona, copia y pega este enlace en tu navegador:
          </p>

          <p style="margin:12px 0 0; font-size:13px; line-height:1.6; color:#0f172a; word-break:break-all;">
            ${escapeHtml(finalRegisterUrl)}
          </p>
        </div>
      </div>
    </div>
  `;

  const textContent = [
    `Hola ${safeName},`,
    ``,
    `Has sido agregado al proyecto "${projectTitle}" en WEZET.`,
    `Invitado por: ${safeInviter}.`,
    ``,
    `Para ver los detalles del proyecto, revisar tu NDA y continuar con el flujo, debes registrarte en la plataforma.`,
    ``,
    `Regístrate aquí: ${finalRegisterUrl}`,
  ].join("\n");

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: {
        email: senderEmail,
        name: senderName,
      },
      to: [
        {
          email: toEmail,
          name: safeName,
        },
      ],
      subject,
      htmlContent,
      textContent,
    }),
  });

  console.log("[invite-email] response status:", response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[invite-email] brevo error raw:", errorText);
    throw new Error(`Brevo send failed: ${response.status} ${errorText}`);
  }

  console.log("[invite-email] Brevo aceptó el correo para:", toEmail);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value: string) {
  return value.replace(/"/g, "&quot;");
}