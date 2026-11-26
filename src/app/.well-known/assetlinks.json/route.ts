// Android App Links: inkduel.com/w/... opens the InkDuel app when installed
// (the app's intent filter has autoVerify for /w/). Fingerprints: the two
// SHA-256 certificates registered for com.inkduel.app in Firebase (Play App
// Signing and upload key). Confirm against Play Console › App integrity.

const SHA256_FINGERPRINTS = [
  '36:DC:2D:94:F0:DA:1E:72:14:4F:31:5B:CE:D9:E7:FD:24:C3:9C:5A:52:EE:DC:B3:1E:71:57:74:7C:4E:23:21',
  '49:6B:29:45:E4:42:E7:1C:DC:7B:CE:49:47:C5:4C:33:3C:BD:B5:4E:BD:CB:EC:47:18:58:DC:37:A7:50:3D:2A',
];

export const dynamic = 'force-static';

export function GET() {
  return Response.json(
    [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: { namespace: 'android_app', package_name: 'com.inkduel.app', sha256_cert_fingerprints: SHA256_FINGERPRINTS },
      },
    ],
    { headers: { 'Cache-Control': 'public, max-age=3600' } },
  );
}
