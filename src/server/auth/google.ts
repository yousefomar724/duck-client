import { OAuth2Client } from 'google-auth-library';

export interface GoogleProfile {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
}

let client: OAuth2Client | null = null;

function getClient(): OAuth2Client {
  if (!client) {
    const audience = process.env.GOOGLE_CLIENT_ID;
    if (!audience) throw new Error('GOOGLE_CLIENT_ID is not set');
    client = new OAuth2Client(audience);
  }
  return client;
}

/** Verifies a Google ID token, mirroring the Go API's idtoken.Validate call. */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  const audience = process.env.GOOGLE_CLIENT_ID;
  const ticket = await getClient().verifyIdToken({ idToken, audience });
  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    throw new Error('invalid Google token');
  }
  return {
    googleId: payload.sub,
    email: payload.email,
    firstName: payload.given_name ?? '',
    lastName: payload.family_name ?? '',
  };
}
