import { send } from 'infra/email'
import { User } from './user'

async function sendEmailToUser({
  email,
  username,
}: Pick<User, 'email' | 'username'>) {
  await send({
    from: 'Test <test@test.com.br>',
    to: email,
    subject: 'Activate your registration',
    text: `${username}, click on the link below to activate your registration:

    `,
  })
}

export const activation = {
  sendEmailToUser,
}
