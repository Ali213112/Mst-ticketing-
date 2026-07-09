import { Suspense } from 'react';
import RedirectToOrganisation from '../_redirectOrganisation';

export default function SettingsRedirectPage() {
  return (
    <Suspense fallback={null}>
      <RedirectToOrganisation tab="settings" />
    </Suspense>
  );
}
