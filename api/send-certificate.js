import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { imageBase64, courseTitle, language } = req.body || {};
  if (!imageBase64) return res.status(400).json({ error: "Missing imageBase64" });

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Missing token" });

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "Missing Supabase env vars" });
  }
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return res.status(500).json({ error: "Missing SMTP env vars" });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) return res.status(401).json({ error: "Invalid token" });

  const user = userData.user;
  const meta = user.user_metadata || {};
  const name = [meta.first_name, meta.last_name].filter(Boolean).join(" ") || "there";
  const email = user.email;

  const imgBuffer = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ""), "base64");
  const filename = `PNL-Certificate-${(courseTitle || "Masterclass").slice(0, 30).replace(/\s+/g, "-")}.png`;

  const isIt = (language || "Italiano").toLowerCase() !== "english";
  const subject = isIt
    ? `🎓 Il tuo Certificato PNL – ${courseTitle || "Masterclass"}`
    : `🎓 Your PNL Certificate – ${courseTitle || "Masterclass"}`;
  const html = isIt
    ? `<p>Ciao ${name},</p>
       <p>Congratulazioni! Hai completato con successo la Masterclass <strong>${courseTitle || ""}</strong> su PNL.</p>
       <p>In allegato trovi il tuo certificato di completamento in formato PNG.</p>
       <p>Puoi condividerlo su LinkedIn o conservarlo come prova del tuo apprendimento.</p>
       <br/>
       <p style="color:#888; font-size:12px;">PNL – Masterclass AI personalizzate</p>`
    : `<p>Hi ${name},</p>
       <p>Congratulations! You have successfully completed the Masterclass <strong>${courseTitle || ""}</strong> on PNL.</p>
       <p>Your completion certificate in PNG format is attached.</p>
       <p>Share it on LinkedIn or keep it as proof of your learning.</p>
       <br/>
       <p style="color:#888; font-size:12px;">PNL – Personalised AI Masterclass</p>`;

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: `"PNL" <${process.env.SMTP_USER}>`,
      to: email,
      subject,
      html,
      attachments: [{ filename, content: imgBuffer, contentType: "image/png" }],
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Certificate email failed:", err.message);
    return res.status(500).json({ error: "Failed to send email" });
  }
}
