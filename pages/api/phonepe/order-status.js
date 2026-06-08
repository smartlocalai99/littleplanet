import { Env, StandardCheckoutClient } from "@phonepe-pg/pg-sdk-node";

function isPlaceholder(value) {
  const normalized = String(value || "").trim().toLowerCase();

  return (
    !normalized ||
    normalized.includes("your_") ||
    normalized.includes("your-") ||
    normalized.includes("replace") ||
    normalized.includes("placeholder") ||
    normalized.startsWith("<")
  );
}

function getPhonePeClient() {
  const clientId = process.env.PHONEPE_CLIENT_ID;
  const clientSecret = process.env.PHONEPE_CLIENT_SECRET;
  const clientVersion = Number(process.env.PHONEPE_CLIENT_VERSION);
  const environmentName = String(process.env.PHONEPE_ENV || "").toUpperCase();
  const invalid = [];

  if (isPlaceholder(clientId)) invalid.push("PHONEPE_CLIENT_ID");
  if (isPlaceholder(clientSecret)) invalid.push("PHONEPE_CLIENT_SECRET");
  if (!Number.isInteger(clientVersion) || clientVersion <= 0) {
    invalid.push("PHONEPE_CLIENT_VERSION");
  }
  if (!["SANDBOX", "PRODUCTION"].includes(environmentName)) {
    invalid.push("PHONEPE_ENV");
  }

  if (invalid.length) {
    throw new Error(
      `Missing or placeholder PhonePe environment variables: ${invalid.join(", ")}`
    );
  }

  const env =
    environmentName === "PRODUCTION" ? Env.PRODUCTION : Env.SANDBOX;
  const configKey = `${clientId}:${clientSecret}:${clientVersion}:${env}`;

  if (
    global.phonePeStandardCheckoutClient &&
    global.phonePeStandardCheckoutConfigKey !== configKey
  ) {
    throw new Error(
      "PhonePe environment variables changed. Restart the Next.js server before retrying."
    );
  }

  if (!global.phonePeStandardCheckoutClient) {
    global.phonePeStandardCheckoutClient = StandardCheckoutClient.getInstance(
      clientId,
      clientSecret,
      clientVersion,
      env
    );
    global.phonePeStandardCheckoutConfigKey = configKey;
  }

  return global.phonePeStandardCheckoutClient;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const merchantOrderId = String(req.query?.merchantOrderId || "").trim();

  if (!merchantOrderId) {
    return res.status(400).json({
      success: false,
      error: "merchantOrderId is required",
    });
  }

  try {
    const client = getPhonePeClient();
    const response = await client.getOrderStatus(merchantOrderId, true);

    if (response?.state === "COMPLETED") {
      // Later: mark the matching invoice/fee as Paid in the database.
      // Later: create a SmartBooks payment-success notification.
    }

    return res.status(200).json({
      success: true,
      merchantOrderId: response?.merchantOrderId || merchantOrderId,
      state: response?.state || "UNKNOWN",
      amount: response?.amount ?? null,
      paymentDetails: response?.paymentDetails || [],
      raw: response,
    });
  } catch (error) {
    console.error("PhonePe order status error:", error);

    return res.status(error?.httpStatusCode || 500).json({
      success: false,
      merchantOrderId,
      error: error?.message || "Unable to check PhonePe payment status",
      code: error?.code || null,
      details: error?.data || null,
    });
  }
}
