import { Ranked } from '@/components/session/ranked';
import { RequireSession, SessionPage } from '@/components/session/session-page';
export default function RankedPage() {
  return (
    <SessionPage context="arena" width="reading">
      <RequireSession>
        <Ranked />
      </RequireSession>
    </SessionPage>
  );
}
