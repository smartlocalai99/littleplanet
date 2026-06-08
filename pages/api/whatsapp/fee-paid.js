export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        error: "Method not allowed",
      });
    }

    const {
      student_name,
      class_name,
      parent_mobile,
      amount_collected,
      payment_mode,
      payment_date,
      utr,
    } = req.body;

    if (!student_name || !parent_mobile || !amount_collected) {
      return res.status(400).json({
        success: false,
        error: "Student name, parent mobile, and amount are required",
      });
    }

    const workerUrl = process.env.WHATSAPP_WORKER_URL;
    const workerApiKey = process.env.WHATSAPP_WORKER_API_KEY;

    if (!workerUrl || !workerApiKey) {
      return res.status(500).json({
        success: false,
        error: "WhatsApp worker env variables missing",
      });
    }

    const amount = Number(amount_collected || 0).toLocaleString("en-IN");

    const message = `Dear Parent, we have received the school fee payment of ₹${amount} for ${student_name}.

Class: ${class_name || "-"}
Payment Mode: ${payment_mode || "Cash"}
Payment Date: ${payment_date || "-"}

${utr ? `Transaction ID / UTR: ${utr}\n\n` : ""}Thank you.
- SmartBooks AI`;

    const response = await fetch(`${workerUrl}/api/messages/enqueue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": workerApiKey,
      },
      body: JSON.stringify({
        recipient_name: student_name,
        recipient_phone: parent_mobile,
        message_type: "FEE_PAYMENT_RECEIPT",
        message_text: message,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      return res.status(500).json({
        success: false,
        error: data.error || "Failed to queue WhatsApp message",
      });
    }

    return res.status(200).json({
      success: true,
      message: "WhatsApp payment receipt queued successfully",
      workerResponse: data,
    });
  } catch (error) {
    console.error("Fee paid WhatsApp API Error:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Failed to send WhatsApp message",
    });
  }
}