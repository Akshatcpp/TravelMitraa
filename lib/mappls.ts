// It will Handle Mappls token retrieval and Static Map Polyline request

const MAPPLS_CLIENT_ID = process.env.MAPPLS_CLIENT_ID as string;
const MAPPLS_CLIENT_SECRET = process.env.MAPPLS_CLIENT_SECRET as string;

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

async function getMapplsToken(): Promise<string> {
  if (!MAPPLS_CLIENT_ID || !MAPPLS_CLIENT_SECRET) {
    throw new Error("Missing MAPPLS_CLIENT_ID or MAPPLS_CLIENT_SECRET in environment variables");
  }

  const res = await fetch("https://outpost.mappls.com/api/security/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: MAPPLS_CLIENT_ID,
      client_secret: MAPPLS_CLIENT_SECRET,
    }),
    
  });

  if (!res.ok) {
    throw new Error(`Token request failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as TokenResponse;

  if (!data.access_token) {
    throw new Error("No access_token in response");
  }

  return data.access_token;
}

export async function getStaticMapPolyline(
  polyline: string,
  width = 400,
  height = 400
): Promise<Buffer> {
  const token = await getMapplsToken();

  const res = await fetch(
    `https://tile.mappls.com/map/raster_tile/still_image_polyline?access_token=${token}`,
    {
      method: "POST",
      headers: { Accept: "image/png" },
      body: new URLSearchParams({
        height: height.toString(),
        width: width.toString(),
        polyline,
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Map image request failed: ${res.status} ${res.statusText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
