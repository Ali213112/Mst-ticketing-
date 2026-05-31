import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const deployerKey = process.env.MST_DEPLOYER_PRIVATE_KEY ?? '';
const mstRpcUrl = process.env.MST_RPC_URL ?? 'https://testnetrpc.mstblockchain.com';
const mstChainId = Number(process.env.MST_CHAIN_ID ?? 4545);

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: 'cancun',
    },
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: 'http://127.0.0.1:8545',
      chainId: 31337,
    },
    mstTestnet: {
      url: mstRpcUrl,
      chainId: mstChainId,
      accounts: deployerKey ? [`0x${deployerKey.replace(/^0x/, '')}`] : [],
    },
  },
};

export default config;
