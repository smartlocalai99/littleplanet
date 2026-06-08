import {
  Env,
  PrefillUserLoginDetails,
  StandardCheckoutClient,
  StandardCheckoutPayRequest,
} from "@phonepe-pg/pg-sdk-node";

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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const invalid = [];

  if (isPlaceholder(clientId)) invalid.push("PHONEPE_CLIENT_ID");
  if (isPlaceholder(clientSecret)) invalid.push("PHONEPE_CLIENT_SECRET");
  if (!Number.isInteger(clientVersion) || clientVersion <= 0) {
    invalid.push("PHONEPE_CLIENT_VERSION");
  }
  if (!["SANDBOX", "PRODUCTION"].includes(environmentName)) {
    invalid.push("PHONEPE_ENV");
  }
  if (isPlaceholder(appUrl)) invalid.push("NEXT_PUBLIC_APP_URL");

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

  return {
    appUrl: appUrl.replace(/\/+$/, ""),
    client: global.phonePeStandardCheckoutClient,
  };
}

function sanitizeInvoiceNo(invoiceNo) {
  return invoiceNo
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 35);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const invoiceNo = String(req.body?.invoiceNo || "").trim();
  const customerName = String(req.body?.customerName || "").trim();
  const mobile = String(req.body?.mobile || "").replace(/\D/g, "");
  const amountInRupees = Number(req.body?.amount);
  const description = String(req.body?.description || "").trim();

  if (!invoiceNo || !customerName || !mobile || req.body?.amount === "") {
    return res.status(400).json({
      success: false,
      error: "invoiceNo, customerName, mobile, and amount are required",
    });
  }

  if (!/^\d{10,15}$/.test(mobile)) {
    return res.status(400).json({
      success: false,
      error: "Mobile number must contain 10 to 15 digits",
    });
  }

  if (!Number.isFinite(amountInRupees) || amountInRupees <= 0) {
    return res.status(400).json({
      success: false,
      error: "Amount must be a number greater than zero",
    });
  }

  try {
    const { appUrl, client } = getPhonePeClient();
    const merchantOrderId = `SB-${sanitizeInvoiceNo(invoiceNo)}-${Date.now()}`;
    const redirectUrl = `${appUrl}/phonepe-status?merchantOrderId=${encodeURIComponent(
      merchantOrderId
    )}`;
    const prefillDetails = PrefillUserLoginDetails.builder()
      .phoneNumber(mobile)
      .build();
    const paymentRequest = StandardCheckoutPayRequest.builder()
      .merchantOrderId(merchantOrderId)
      .amount(Math.round(amountInRupees * 100))
      .message(description || `School Fee - ${customerName}`)
      .redirectUrl(redirectUrl)
      .prefillUserLoginDetails(prefillDetails)
      .build();
    const response = await client.pay(paymentRequest);
    const checkoutUrl = response?.redirectUrl || null;

    if (!checkoutUrl) {
      return res.status(502).json({
        success: false,
        merchantOrderId,
        error: "PhonePe did not return a checkout URL",
        raw: response,
      });
    }

    return res.status(200).json({
      success: true,
      merchantOrderId,
      checkoutUrl,
      state: response?.state || "PENDING",
      raw: response,
    });
  } catch (error) {
    console.error("PhonePe create payment error:", error);

    return res.status(error?.httpStatusCode || 500).json({
      success: false,
      error: error?.message || "Unable to create PhonePe payment link",
      code: error?.code || null,
      details: error?.data || null,
    });
  }
}
