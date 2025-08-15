import nodemailer from "nodemailer";
import { Resend } from "resend";

const from = "TeachTape <no-reply@teachtape.local>";

export async function sendEmailSMTP(to: string, subject: string, html: string) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) throw new Error("SMTP credentials missing");
  const transporter = nodemailer.createTransport({ host, port, auth: { user, pass } });
  await transporter.sendMail({ from, to, subject, html });
}

export async function sendEmailResend(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY missing");
  const resend = new Resend(key);
  await resend.emails.send({ from, to, subject, html });
}
