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
  console.log('Preparing to send email...')
  console.log('EMAIL_SMTP_HOST', env.EMAIL_SMTP_HOST)
  console.log('EMAIL_SMTP_PORT', env.EMAIL_SMTP_PORT)
  console.log('EMAIL_SMTP_USER', env.EMAIL_SMTP_USER)
  console.log(
    'EMAIL_SMTP_PASSWORD',
    env.EMAIL_SMTP_PASSWORD ? '***' : 'Not set'
  )
  console.log('>>>', process.env.NODE_ENV === 'production' ? true : false)
  console.log('Sending email with the following details:')
  console.log(`From: ${from}`)
  console.log(`To: ${to}`)
  console.log(`Subject: ${subject}`)
  console.log(`Text: ${text}`)
  await transporter.sendMail({
    from,
    to,
    subject,
    text,
  })
}

export { send }
