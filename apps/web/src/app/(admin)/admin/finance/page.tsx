import { Suspense } from 'react';
import RedirectToOrganisation from '../_redirectOrganisation';

export default function FinanceRedirectPage() {
  return (
    <Suspense fallback={null}>
      <RedirectToOrganisation tab="finance" />
    </Suspense>
  );
}
