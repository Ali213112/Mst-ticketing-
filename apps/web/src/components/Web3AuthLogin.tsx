'use client';

import { useCallback, useEffect, useState } from 'react';
import { CHAIN_NAMESPACES, WALLET_ADAPTERS, WEB3AUTH_NETWORK } from '@web3auth/base';
import { AuthAdapter } from '@web3auth/auth-adapter';
import { EthereumPrivateKeyProvider } from '@web3auth/ethereum-provider';
import { Web3AuthNoModal } from '@web3auth/no-modal';
import { verifySession } from '@/lib/api';

const clientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID ?? '';
const chainIdDecimal = Number(process.env.NEXT_PUBLIC_MST_CHAIN_ID ?? 4545);
const rpcUrl = process.env.NEXT_PUBLIC_MST_RPC_URL ?? 'https://testnetrpc.mstblockchain.com';
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: `0x${chainIdDecimal.toString(16)}`,
  rpcTarget: rpcUrl,
  displayName: 'MST Testnet',
  blockExplorerUrl: 'https://testnet.mstscan.com',
  ticker: 'tMSTC',
  tickerName: 'tMSTC',
};

let web3authInstance: Web3AuthNoModal | null = null;

async function getWeb3Auth(): Promise<Web3AuthNoModal> {
  if (web3authInstance) return web3authInstance;

  const privateKeyProvider = new EthereumPrivateKeyProvider({
    config: { chainConfig },
  });

  const authAdapter = new AuthAdapter({
    clientId,
    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
    privateKeyProvider,
    chainConfig,
    adapterSettings: {
      uxMode: 'popup',
    },
  });

  web3authInstance = new Web3AuthNoModal({
    clientId,
    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
    privateKeyProvider,
    chainConfig,
  });

  web3authInstance.configureAdapter(authAdapter);
  await web3authInstance.init();
  return web3authInstance;
}

async function connectAuthProvider(
  web3auth: Web3AuthNoModal,
  loginProvider: string,
  loginHint: string
) {
  if (web3auth.connected) {
    await web3auth.logout();
  }

  const provider = await web3auth.connectTo(WALLET_ADAPTERS.AUTH, {
    loginProvider,
    extraLoginOptions: { login_hint: loginHint },
  });

  if (!provider) throw new Error('Web3Auth provider unavailable');
  return provider;
}

const LOGIN = {
  EMAIL_PASSWORDLESS: 'email_passwordless',
  SMS_PASSWORDLESS: 'sms_passwordless',
} as const;

type LoginMethod = 'email' | 'sms';

export function Web3AuthLogin() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState<LoginMethod>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ email: string; walletAddress: string } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const me = await fetch(`${apiUrl}/api/auth/me`, { credentials: 'include' });
        if (me.ok) {
          const json = await me.json();
          if (json.success && json.data) {
            setUser({ email: json.data.email, walletAddress: json.data.walletAddress });
          }
        }
      } catch {
        // not logged in
      }
    })();
  }, []);

  const login = useCallback(async (loginProvider: string, loginHint: string) => {
    if (!clientId) {
      setError('NEXT_PUBLIC_WEB3AUTH_CLIENT_ID is not configured');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const web3auth = await getWeb3Auth();
      const provider = await connectAuthProvider(web3auth, loginProvider, loginHint);

      const { idToken } = await web3auth.authenticateUser();
      const accounts = (await provider.request({ method: 'eth_accounts' })) as string[];
      const walletAddress = accounts[0];

      if (!idToken || !walletAddress) {
        throw new Error('Missing idToken or wallet address from Web3Auth');
      }

      const sessionUser = await verifySession(idToken, walletAddress);
      setUser({ email: sessionUser.email, walletAddress: sessionUser.walletAddress });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleEmailLogin = () => {
    if (!email.trim()) {
      setError('Enter your email address');
      return;
    }
    void login(LOGIN.EMAIL_PASSWORDLESS, email.trim());
  };

  const handleSmsLogin = () => {
    if (!phone.trim()) {
      setError('Enter your phone number with country code (e.g. +91...)');
      return;
    }
    void login(LOGIN.SMS_PASSWORDLESS, phone.trim());
  };

  const handleLogout = async () => {
    await fetch(`${apiUrl}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    setUser(null);
    if (web3authInstance) {
      await web3authInstance.logout();
      web3authInstance = null;
    }
  };

  if (user) {
    return (
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        <p>
          Signed in as <strong>{user.email}</strong>
        </p>
        <p style={{ fontSize: '0.875rem', wordBreak: 'break-all' }}>Wallet: {user.walletAddress}</p>
        <button type="button" onClick={() => void handleLogout()}>
          Log out
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '1rem', maxWidth: 420 }}>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="button" onClick={() => setMethod('email')} disabled={method === 'email'}>
          Email
        </button>
        <button type="button" onClick={() => setMethod('sms')} disabled={method === 'sms'}>
          Phone (SMS)
        </button>
      </div>

      {method === 'email' ? (
        <label style={{ display: 'grid', gap: '0.5rem' }}>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={loading}
          />
        </label>
      ) : (
        <label style={{ display: 'grid', gap: '0.5rem' }}>
          Phone
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+919876543210"
            disabled={loading}
          />
        </label>
      )}

      <button
        type="button"
        disabled={loading}
        onClick={() => (method === 'email' ? handleEmailLogin() : handleSmsLogin())}
      >
        {loading ? 'Signing in…' : method === 'email' ? 'Continue with Email' : 'Continue with SMS'}
      </button>

      {error && <p style={{ color: '#c00', fontSize: '0.875rem' }}>{error}</p>}
    </div>
  );
}
