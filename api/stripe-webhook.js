import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

// Disable Vercel's default body parser so we get the raw body
// required for Stripe signature verification
export const config = {
  api: { bodyParser: false },
};

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sig = req.headers["stripe-signature"];
  if (!sig) return res.status(400).json({ error: "Missing stripe-signature header" });

  const rawBody = await getRawBody(req);

  let event;
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const uid = session.metadata?.supabase_uid;
    const credits = parseInt(session.metadata?.credits, 10) || 0;

    if (uid && credits > 0) {
      const { error } = await supabase.rpc("increment_seminars", {
        user_id: uid,
        amount: credits,
      });

      if (error) {
        console.error("RPC increment_seminars failed, using fallback:", error.message);
        const { data: profile } = await supabase
          .from("profiles")
          .select("seminars_remaining")
          .eq("id", uid)
          .maybeSingle();

        const current = profile?.seminars_remaining || 0;
        await supabase
          .from("profiles")
          .upsert(
            { id: uid, seminars_remaining: current + credits },
            { onConflict: "id" }
          );
      }
    }

    const language = session.metadata?.language || "Italiano";
    await sendPurchaseEmail(session, supabase, credits, language);
  }

  return res.status(200).json({ received: true });
}

async function sendPurchaseEmail(session, supabase, credits, language) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;

  const uid = session.metadata?.supabase_uid;
  if (!uid || !credits) return;

  const { data: authUser } = await supabase.auth.admin.getUserById(uid);
  const email = authUser?.user?.email;
  if (!email) return;

  const meta = authUser.user.user_metadata || {};
  const name = [meta.first_name, meta.last_name].filter(Boolean).join(" ") || "there";

  const isIt = (language || "Italiano").toLowerCase() !== "english";
  const subject = isIt
    ? `✅ Acquisto confermato – ${credits} Masterclass PNL`
    : `✅ Purchase confirmed – ${credits} PNL Masterclass`;

  const body = isIt
    ? `<p>Ciao ${name},</p>
       <p>Il tuo acquisto è stato completato con successo. Hai ricevuto <strong>${credits} Masterclass</strong> aggiuntive sul tuo account PNL.</p>
       <p>Puoi generare le tue Masterclass accedendo a <a href="https://eleviai.vercel.app/prova.html">eleviai.vercel.app</a>.</p>
       <p>Grazie per aver scelto PNL!</p>
       <p style="color:#888; font-size:12px;">PNL – Masterclass AI personalizzate</p>`
    : `<p>Hi ${name},</p>
       <p>Your purchase was completed successfully. You received <strong>${credits} Masterclass</strong> on your PNL account.</p>
       <p>You can generate your Masterclass at <a href="https://eleviai.vercel.app/prova.html">eleviai.vercel.app</a>.</p>
       <p>Thank you for choosing PNL!</p>
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
      html: body,
    });
  } catch (err) {
    console.error("Failed to send purchase confirmation email:", err.message);
  }
}
