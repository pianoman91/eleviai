import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const PLANS = {
  single: { credits: 1, envKey: "STRIPE_PRICE_ID_SINGLE" },
  pack5:  { credits: 5, envKey: "STRIPE_PRICE_ID_PACK5" },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST method is allowed" });
  }

  const missing = [];
  if (!process.env.SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!process.env.STRIPE_SECRET_KEY) missing.push("STRIPE_SECRET_KEY");
  if (missing.length) {
    return res.status(500).json({ error: "Missing env vars: " + missing.join(", ") });
  }

  // Determine which plan was requested
  const { plan } = req.body || {};
  const planKey = plan === "pack5" ? "pack5" : "single";
  const planInfo = PLANS[planKey];

  const priceId = process.env[planInfo.envKey];
  if (!priceId) {
    return res.status(500).json({ error: `Missing env var: ${planInfo.envKey}` });
  }

  // Auth
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return res.status(401).json({ error: "Missing Authorization Bearer token" });
  }

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return res.status(401).json({ error: "Invalid session token" });
  }
  const user = userData.user;

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  // Get or create Stripe customer
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  let customerId = profile?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_uid: user.id },
    });
    customerId = customer.id;
    await supabaseAdmin
      .from("profiles")
      .upsert({ id: user.id, stripe_customer_id: customerId }, { onConflict: "id" });
  }

  // Determine the site origin for redirect URLs
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    req.headers.origin ||
    "https://eleviai.vercel.app";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/prova.html`,
    metadata: {
      supabase_uid: user.id,
      credits: String(planInfo.credits),
    },
  });

  return res.status(200).json({ url: session.url });
}
