import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

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
      // Atomically increment seminars_remaining
      const { error } = await supabase.rpc("increment_seminars", {
        user_id: uid,
        amount: credits,
      });

      if (error) {
        // Fallback: read current value and update
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
  }

  return res.status(200).json({ received: true });
}
