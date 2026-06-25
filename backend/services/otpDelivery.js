const nodemailer = require('nodemailer');

const isDevOtpMode = () =>
  process.env.NODE_ENV !== 'production' && process.env.OTP_DEV_MODE === 'true';

const sendEmailOtp = async ({ email, name, otp }) => {
  if (isDevOtpMode()) {
    console.log(`[DEV OTP] Email OTP for ${email}: ${otp}`);
    return;
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error('Email OTP delivery is not configured');
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || SMTP_USER,
    to: email,
    subject: 'Your Batra Computers verification code',
    text: `Hello ${name}, your Batra Computers email verification code is ${otp}. It expires in 10 minutes.`,
    html: `<p>Hello ${name},</p><p>Your Batra Computers email verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${otp}</p><p>This code expires in 10 minutes. Do not share it with anyone.</p>`
  });
};

const sendWhatsAppOtp = async ({ phone, otp }) => {
  if (isDevOtpMode()) {
    console.log(`[DEV OTP] WhatsApp OTP for ${phone}: ${otp}`);
    return;
  }

  const {
    WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID,
    WHATSAPP_TEMPLATE_NAME,
    WHATSAPP_TEMPLATE_LANGUAGE
  } = process.env;

  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_TEMPLATE_NAME) {
    throw new Error('WhatsApp OTP delivery is not configured');
  }

  const apiVersion = process.env.WHATSAPP_API_VERSION || 'v23.0';
  const response = await fetch(
    `https://graph.facebook.com/${apiVersion}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone.replace(/\D/g, ''),
        type: 'template',
        template: {
          name: WHATSAPP_TEMPLATE_NAME,
          language: { code: WHATSAPP_TEMPLATE_LANGUAGE || 'en_US' },
          components: [{
            type: 'body',
            parameters: [{ type: 'text', text: otp }]
          }]
        }
      })
    }
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`WhatsApp OTP failed (${response.status}): ${details}`);
  }
};

module.exports = { isDevOtpMode, sendEmailOtp, sendWhatsAppOtp };
