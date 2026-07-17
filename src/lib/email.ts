export async function sendVerificationEmail(email: string, token: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const verificationLink = `${appUrl}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

  console.log('\n==================================================');
  console.log('📬 [EMAIL MOCK] Verification Email Sent');
  console.log(`To: ${email}`);
  console.log(`Link: ${verificationLink}`);
  console.log('==================================================\n');

  return { success: true };
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const resetLink = `${appUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

  console.log('\n==================================================');
  console.log('📬 [EMAIL MOCK] Password Reset Email Sent');
  console.log(`To: ${email}`);
  console.log(`Link: ${resetLink}`);
  console.log('==================================================\n');

  return { success: true };
}

export async function sendInviteEmail(email: string, projectName: string, inviterName: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const signUpLink = `${appUrl}/signup?email=${encodeURIComponent(email)}`;
  const loginLink = `${appUrl}/login`;

  console.log('\n==================================================');
  console.log('📬 [EMAIL MOCK] Project Invitation Email Sent');
  console.log(`To: ${email}`);
  console.log(`From: ${inviterName}`);
  console.log(`Project: ${projectName}`);
  console.log(`Sign Up Link: ${signUpLink}`);
  console.log(`Google/Email Login: ${loginLink}`);
  console.log('==================================================\n');

  return { success: true };
}

