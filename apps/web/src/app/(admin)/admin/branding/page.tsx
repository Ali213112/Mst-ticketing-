import { Suspense } from 'react';
import RedirectToOrganisation from '../_redirectOrganisation';

export default function BrandingRedirectPage() {
  return (
    <Suspense fallback={null}>
      <RedirectToOrganisation tab="branding" />
    </Suspense>
  );
}
