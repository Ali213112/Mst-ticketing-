'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CHAIN_NAMESPACES, WALLET_ADAPTERS, WEB3AUTH_NETWORK } from '@web3auth/base';
import { AuthAdapter } from '@web3auth/auth-adapter';
import { EthereumPrivateKeyProvider } from '@web3auth/ethereum-provider';
import { Web3AuthNoModal } from '@web3auth/no-modal';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Phone, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { verifySession, getMe, getPostLoginPath } from '@/lib/api';

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
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState<LoginMethod>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const me = await getMe();
        if (me) {
          router.replace(getPostLoginPath(me.role));
        }
      } catch {
        // not logged in
      }
    })();
  }, [router]);

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
      router.replace(getPostLoginPath(sessionUser.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }, [router]);

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

  return (
    <div className="w-full bg-white border border-zinc-200 rounded-lg p-6 space-y-6">
      {/* Tabs */}
      <div className="flex bg-zinc-100 p-0.5 rounded-md">
        <button
          type="button"
          onClick={() => { setMethod('email'); setError(null); }}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${
            method === 'email' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Email</span>
        </button>
        <button
          type="button"
          onClick={() => { setMethod('sms'); setError(null); }}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${
            method === 'sms' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Phone</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {method === 'email' ? (
          <motion.div
            key="email"
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 5 }}
            className="space-y-2"
          >
            <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wide">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={loading}
                className="w-full px-3 py-2 border border-zinc-200 rounded text-sm focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 bg-white placeholder-zinc-400 disabled:bg-zinc-50"
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="sms"
            initial={{ opacity: 0, x: 5 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -5 }}
            className="space-y-2"
          >
            <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wide">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+919876543210"
              disabled={loading}
              className="w-full px-3 py-2 border border-zinc-200 rounded text-sm focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 bg-white placeholder-zinc-400 disabled:bg-zinc-50"
            />
            <p className="text-[10px] text-zinc-400">Include country code (e.g. +91 for India)</p>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        disabled={loading}
        onClick={() => (method === 'email' ? handleEmailLogin() : handleSmsLogin())}
        className="w-full flex items-center justify-center space-x-2 py-2.5 bg-zinc-900 text-white rounded hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 transition-colors text-sm font-semibold shadow-sm"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Signing in…</span>
          </>
        ) : (
          <>
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-2 bg-red-50 text-red-700 px-3 py-2 rounded text-xs border border-red-100"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-medium">{error}</span>
        </motion.div>
      )}
    </div>
  );
}
