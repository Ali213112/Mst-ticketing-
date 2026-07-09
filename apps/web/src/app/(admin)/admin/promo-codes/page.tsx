import { Suspense } from 'react';
import RedirectToOrganisation from '../_redirectOrganisation';

export default function PromoRedirectPage() {
  return (
    <Suspense fallback={null}>
      <RedirectToOrganisation tab="promo-codes" />
    </Suspense>
  );
}
