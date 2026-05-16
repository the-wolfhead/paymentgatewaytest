import express from "express";
import axios from "axios";
import cors from "cors";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// =======================
// CONFIG
// =======================
const PALMPAY_URL =
  "https://open-gw-daily.palmpay-inc.com/api/v2/payment/merchant/createorder";

const MERCHANT_TOKEN = process.env.PALMPAY_AUTH_TOKEN;
const SECRET_KEY = process.env.PALMPAY_MERCHANT_PRIVATE_KEY;

// =======================
// SIGNATURE GENERATOR
// =======================
function generateSignature(payload) {
  console.log("🔐 [SIGNATURE] Generating signature...");

  const sortedKeys = Object.keys(payload).sort();
  console.log("🔐 [SIGNATURE] Sorted keys:", sortedKeys);

  let stringToSign = "";

  sortedKeys.forEach((key) => {
    if (payload[key] !== undefined && payload[key] !== null) {
      stringToSign += `${key}=${payload[key]}&`;
    }
  });

  stringToSign = stringToSign.slice(0, -1);

  console.log("🔐 [SIGNATURE] String to sign:", stringToSign);

  const signature = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(stringToSign)
    .digest("hex")
    .toUpperCase();

  console.log("🔐 [SIGNATURE] Generated signature:", signature);

  return signature;
}

// =======================
// CREATE ORDER ROUTE
// =======================
app.post("/api/create-order", async (req, res) => {
  console.log("\n==============================");
  console.log("🚀 [CREATE ORDER] Request received");
  console.log("==============================");

  try {
    const {
      amount,
      title,
      description,
      userId,
      userMobileNo,
      currency = "NGN",
    } = req.body;

    console.log("📦 [REQUEST BODY]", req.body);

    const orderId =
      "ORD_" + Date.now() + Math.floor(Math.random() * 1000);

    console.log("🧾 [ORDER ID GENERATED]", orderId);

    const payload = {
      requestTime: Date.now(),
      version: "V1.1",
      nonceStr: crypto.randomBytes(16).toString("hex"),

      orderId,
      amount,
      title,
      description,
      userId,
      userMobileNo,
      currency,
      notifyUrl: "https://yourdomain.com/api/palmpay/webhook",
      callBackUrl: "myapp://payment-success",
      productType: "bank_transfer",
    };

    console.log("📤 [PAYLOAD TO PALMPAY]", payload);

    const signature = generateSignature(payload);

    console.log("📡 [API CALL] Sending request to PalmPay...");
    console.log("🔑 [HEADERS] Authorization + Signature attached");

    const response = await axios.post(PALMPAY_URL, payload, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${MERCHANT_TOKEN}`,
        Signature: signature,
        CountryCode: "NG",
      },
    });

    console.log("📥 [PALMPAY RESPONSE RECEIVED]");
console.log(JSON.stringify(response.data, null, 2));

const palmpayData = response.data;

if (palmpayData?.respCode !== "00000000") {
  console.log("❌ [PALMPAY REJECTED REQUEST]");
  console.log("Code:", palmpayData?.respCode);
  console.log("Message:", palmpayData?.respMsg);

  return res.status(400).json({
    success: false,
    message: palmpayData?.respMsg || "PalmPay error",
    code: palmpayData?.respCode,
    raw: palmpayData,
  });
}

console.log("✅ [PALMPAY SUCCESS] Order created");

return res.json({
  success: true,
  data: palmpayData.data,
});

    return res.json(response.data);
  } catch (error) {
    console.log("❌ [ERROR] Payment creation failed");

    if (error?.response?.data) {
      console.log("📛 [PALMPAY ERROR RESPONSE]");
      console.log(error.response.data);
    } else {
      console.log("📛 [ERROR MESSAGE]", error.message);
    }

    return res.status(500).json({
      message: "Payment initialization failed",
      error: error?.response?.data || error.message,
    });
  }
});

// =======================
// WEBHOOK (PAYMENT RESULT)
// =======================
app.post("/api/palmpay/webhook", (req, res) => {
  console.log("\n==============================");
  console.log("📩 [WEBHOOK RECEIVED]");
  console.log("==============================");

  console.log("📦 Payload:", req.body);

  // TODO:
  // 1. verify signature (IMPORTANT)
  // 2. update DB payment status
  // 3. mark appointment as PAID

  console.log("🔍 [WEBHOOK] Processing payment status...");

  res.send("success");

  console.log("✅ [WEBHOOK] Response sent to PalmPay");
});

// =======================
// START SERVER
// =======================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("\n==============================");
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("==============================\n");
});
