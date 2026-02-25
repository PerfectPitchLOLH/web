import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.API_URL}/auth/verify?token=${token}`

  try {
    await resend.emails.send({
      from: 'Notavex <onboarding@resend.dev>',
      to: email,
      subject: 'Verify your email address',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: system-ui, -apple-system, sans-serif; background-color: #f9fafb; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
              <h1 style="color: #111827; font-size: 24px; margin-bottom: 20px;">Verify your email</h1>
              <p style="color: #374151; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
                Thank you for signing up for Notavex. Please click the button below to verify your email address.
              </p>
              <a href="${verificationUrl}" style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">
                Verify Email
              </a>
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px; line-height: 1.5;">
                If you didn't create an account, you can safely ignore this email.
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
                This link will expire in 24 hours.
              </p>
            </div>
          </body>
        </html>
      `,
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to send verification email:', error)
    throw new Error('Failed to send verification email')
  }
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.API_URL}/auth/reset-password?token=${token}`

  try {
    await resend.emails.send({
      from: 'Notavex <onboarding@resend.dev>',
      to: email,
      subject: 'Reset your password',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: system-ui, -apple-system, sans-serif; background-color: #f9fafb; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
              <h1 style="color: #111827; font-size: 24px; margin-bottom: 20px;">Reset your password</h1>
              <p style="color: #374151; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
                We received a request to reset your password. Click the button below to create a new password.
              </p>
              <a href="${resetUrl}" style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">
                Reset Password
              </a>
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px; line-height: 1.5;">
                If you didn't request a password reset, you can safely ignore this email.
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
                This link will expire in 1 hour.
              </p>
            </div>
          </body>
        </html>
      `,
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to send password reset email:', error)
    throw new Error('Failed to send password reset email')
  }
}
