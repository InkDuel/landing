// Universal links: inkduel.com/w/... opens the InkDuel app when installed.
// Apple fetches this through its CDN; it must be JSON at this exact path,
// over HTTPS, without redirects. Team YK7A5SU6GP, bundle com.inkduel.app.
// Only /w/ paths (public obras): everything else stays on the web.

const APP_ID = 'YK7A5SU6GP.com.inkduel.app';

export const dynamic = 'force-static';

export function GET() {
  return Response.json(
    {
      applinks: {
        // iOS 13+ (components) and iOS 12 (paths) formats together.
        details: [
          {
            appIDs: [APP_ID],
            components: [{ '/': '/w/*', comment: 'Obras públicas' }],
            appID: APP_ID,
            paths: ['/w/*'],
          },
        ],
      },
    },
    { headers: { 'Cache-Control': 'public, max-age=3600' } },
  );
}
