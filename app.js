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

const MERCHANT_TOKEN = process.env.PALMPAY_TOKEN;
const SECRET_KEY = process.env.PALMPAY_SECRET;

// =======================
// SIGNATURE GENERATOR
// =======================
function generateSignature(payload) {
  const sortedKeys = Object.keys(payload).sort();

  let stringToSign = "";

  sortedKeys.forEach((key) => {
    if (payload[key] !== undefined && payload[key] !== null) {
      stringToSign += `${key}=${payload[key]}&`;
    }
  });

  stringToSign = stringToSign.slice(0, -1);

  return crypto
    .createHmac("sha256", SECRET_KEY)
    .update(stringToSign)
    .digest("hex")
    .toUpperCase();
}

// =======================
// CREATE ORDER ROUTE
// =======================
app.post("/api/create-order", async (req, res) => {
  try {
    const {
      amount,
      title,
      description,
      userId,
      userMobileNo,
      currency = "NGN",
    } = req.body;

    const orderId =
      "ORD_" + Date.now() + Math.floor(Math.random() * 1000);

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

    const signature = generateSignature(payload);

    const response = await axios.post(PALMPAY_URL, payload, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${MERCHANT_TOKEN}`,
        Signature: signature,
        CountryCode: "NG",
      },
    });

    return res.json(response.data);
  } catch (error) {
    console.error("PalmPay Error:", error?.response?.data || error.message);

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
  console.log("Webhook received:", req.body);

  // TODO:
  // 1. verify signature (VERY IMPORTANT)
  // 2. update payment status in DB
  // 3. mark appointment as PAID

  res.send("success");
});

// =======================
// START SERVER
// =======================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
