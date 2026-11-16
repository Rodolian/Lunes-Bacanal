import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";

export function getMailTransporter() {
  const senderEmail = process.env.EMAIL_USER || "lunesbacanal@gmail.com";
  const appPassword = (process.env.EMAIL_APP_PASSWORD || "wsyz rctr ykww vrih").replace(/\s+/g, "");

  if (appPassword) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: senderEmail,
        pass: appPassword,
      },
    } as SMTPTransport.Options);
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: senderEmail,
      clientId: process.env.OAUTH_CLIENT_ID,
      clientSecret: process.env.OAUTH_CLIENT_SECRET,
      refreshToken: process.env.OAUTH_REFRESH_TOKEN,
    },
  } as SMTPTransport.Options);
}
