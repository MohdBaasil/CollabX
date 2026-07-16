import { SignJWT, jwtVerify } from 'jose';

const SECRET_KEY = process.env.JWT_SECRET || 'collabspace_super_secret_session_token_key_for_jwt_auth_12345';
const encodedSecret = new TextEncoder().encode(SECRET_KEY);

export async function signToken(payload: { userId: string; email: string }, expiresIn = '7d') {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(encodedSecret);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, encodedSecret);
    return payload as { userId: string; email: string };
  } catch (error) {
    return null;
  }
}
