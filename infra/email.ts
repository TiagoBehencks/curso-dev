import nodemailer, { type SendMailOptions } from 'nodemailer'
import { env } from 'env'

const transporter = nodemailer.createTransport({
  host: env.EMAIL_SMTP_HOST,
  port: env.EMAIL_SMTP_PORT,
  auth: {
    user: env.EMAIL_SMTP_USER,
    pass: env.EMAIL_SMTP_PASSWORD,
  },
  secure: process.env.NODE_ENV === 'production' ? true : false,
})

async function send({ from, to, subject, text }: SendMailOptions) {
  await transporter.sendMail({
    from,
    to,
    subject,
    text,
  })
}

export { send }
