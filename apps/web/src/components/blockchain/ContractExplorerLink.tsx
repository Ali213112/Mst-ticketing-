'use client';

import { Info } from 'lucide-react';
import {
  getAddressExplorerUrl,
  getTxExplorerUrl,
  isExplorableAddress,
  isExplorableTxHash,
} from '@/lib/blockchain';

type ExplorerTarget = 'address' | 'tx';

interface ContractExplorerLinkProps {
  value: string;
  type?: ExplorerTarget;
  className?: string;
  iconClassName?: string;
  title?: string;
  /** Stop click from bubbling to parent handlers (e.g. ticket cards). Default true. */
  stopPropagation?: boolean;
}

export function ContractExplorerLink({
  value,
  type = 'address',
  className = '',
  iconClassName = 'w-3.5 h-3.5',
  title,
  stopPropagation = true,
}: ContractExplorerLinkProps) {
  const valid =
    type === 'tx' ? isExplorableTxHash(value) : isExplorableAddress(value);
  if (!valid) return null;

  const href = type === 'tx' ? getTxExplorerUrl(value) : getAddressExplorerUrl(value);
  const defaultTitle =
    type === 'tx'
      ? 'View transaction on block explorer'
      : 'View contract on block explorer';

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title ?? defaultTitle}
      aria-label={title ?? defaultTitle}
      className={`inline-flex shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:text-zinc-900 hover:bg-zinc-100 p-0.5 ${className}`}
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
    >
      <Info className={iconClassName} />
    </a>
  );
}

interface ContractAddressRowProps {
  address: string;
  label?: string;
  className?: string;
  addressClassName?: string;
}

/** Truncated contract address with explorer info icon. */
export function ContractAddressRow({
  address,
  label,
  className = '',
  addressClassName = '',
}: ContractAddressRowProps) {
  if (!address) return null;

  return (
    <span className={`inline-flex items-center gap-1 min-w-0 ${className}`}>
      {label && <span className="shrink-0">{label}</span>}
      <span className={`truncate select-all ${addressClassName}`}>{address}</span>
      <ContractExplorerLink value={address} />
    </span>
  );
}
