declare module '@mstblockchain/mst-sdk' {
  export class Client {
    constructor(rpcUrl: string, privateKey?: string);
    static createRandom(rpcUrl: string): Client;
    provider: {
      getBlockNumber(): Promise<number>;
      getBalance(address: string): Promise<bigint>;
      waitForTransaction(hash: string): Promise<unknown>;
    };
    signer?: {
      address: string;
      sendNative(to: string, amount: string): Promise<string>;
      deploy(abi: unknown[], bytecode: string, args?: unknown[]): Promise<string>;
    };
  }
}
