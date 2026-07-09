import { Suspense } from 'react';
import RedirectToOrganisation from '../_redirectOrganisation';

export default function MembersRedirectPage() {
  return (
    <Suspense fallback={null}>
      <RedirectToOrganisation tab="members" />
    </Suspense>
  );
}
