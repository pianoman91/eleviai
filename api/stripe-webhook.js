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

async function setSubscriptionStatus(supabase, customerId, status) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (profile?.id) {
    await supabase
      .from("profiles")
      .update({ subscription_status: status })
      .eq("id", profile.id);
  }
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

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const uid = session.metadata?.supabase_uid;
      if (uid) {
        await supabase
          .from("profiles")
          .upsert({ id: uid, subscription_status: "active" }, { onConflict: "id" });
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object;
      const mapped =
        sub.status === "active" ? "active" :
        sub.status === "past_due" ? "past_due" :
        sub.status === "canceled" ? "canceled" : "free";
      await setSubscriptionStatus(supabase, sub.customer, mapped);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      await setSubscriptionStatus(supabase, sub.customer, "canceled");
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      await setSubscriptionStatus(supabase, invoice.customer, "past_due");
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object;
      if (invoice.billing_reason !== "subscription_create") {
        // Renewal payment succeeded — make sure status is active
        await setSubscriptionStatus(supabase, invoice.customer, "active");
      }
      break;
    }

    default:
      // Unhandled event — return 200 so Stripe doesn't retry
      break;
  }

  return res.status(200).json({ received: true });
}
