import dotenv from "dotenv";
import { ethers } from "ethers";
import { addDoc, collection } from "firebase/firestore";
import { config } from "./config";
import { db } from "./firebase";
dotenv.config();

interface UserOperationEvent {
  userOpHash: string;
  sender: string;
  paymaster: string;
  nonce: bigint;
  success: boolean;
  actualGasCost: bigint;
  actualGasUsed: bigint;
  blockNumber: number;
  transactionHash: string;
}

class UserOpIndexer {
  private provider: ethers.Provider;
  private entryPoint: ethers.Contract;
  private lastProcessedBlock: number;
  private isSubscribed: boolean;
  private readonly RETRY_INTERVAL = 30000;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.ethereum.rpcUrl);
    this.entryPoint = new ethers.Contract(
      config.ethereum.entryPointAddress,
      [
        "event UserOperationEvent(bytes32 indexed userOpHash, address indexed sender, address indexed paymaster, uint256 nonce, bool success, uint256 actualGasCost, uint256 actualGasUsed)",
      ],
      this.provider
    );
    this.lastProcessedBlock = config.ethereum.startBlock;
    this.isSubscribed = false;
  }

  async start() {
    try {
      await this.setupSubscription();

      if (config.ethereum.startBlock > 0) {
        await this.processHistoricalEvents();
      }
    } catch (error) {
      console.error("Error starting indexer:", error);
      throw error;
    }
  }

  private async setupSubscription() {
    if (this.isSubscribed) {
      return;
    }

    try {
      await this.subscribeToNewEvents();
      this.isSubscribed = true;

      setInterval(async () => {
        try {
          if (!this.isSubscribed) {
            console.log("Attempting to reconnect...");
            // Recreate the provider and contract to establish fresh connections
            this.provider = new ethers.JsonRpcProvider(config.ethereum.rpcUrl);
            this.entryPoint = new ethers.Contract(
              config.ethereum.entryPointAddress,
              [
                "event UserOperationEvent(bytes32 indexed userOpHash, address indexed sender, address indexed paymaster, uint256 nonce, bool success, uint256 actualGasCost, uint256 actualGasUsed)",
              ],
              this.provider
            );
            await this.subscribeToNewEvents();
            this.isSubscribed = true;
          }
        } catch (error) {
          console.error("Error in subscription check:", error);
          this.isSubscribed = false;
        }
      }, this.RETRY_INTERVAL);
    } catch (error) {
      console.error("Error setting up subscription:", error);
      this.isSubscribed = false;

      setTimeout(() => this.setupSubscription(), this.RETRY_INTERVAL);
    }
  }

  private async subscribeToNewEvents() {
    this.entryPoint.removeAllListeners("UserOperationEvent");

    this.entryPoint.on(
      "UserOperationEvent",
      async (
        userOpHash,
        sender,
        paymaster,
        nonce,
        success,
        actualGasCost,
        actualGasUsed,
        event
      ) => {
        try {
          const userOpEvent = {
            userOpHash,
            sender,
            paymaster,
            nonce,
            success,
            actualGasCost,
            actualGasUsed,
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
          };
          await this.saveUserOpEvent(userOpEvent);
          console.info(
            `Processed UserOperationEvent: ${userOpEvent.userOpHash}`
          );
        } catch (error) {
          console.error("Error processing event:", error);
        }
      }
    );

    this.provider.on("error", (error) => {
      console.error("Provider error:", error);
      this.isSubscribed = false;
    });
  }

  private async processHistoricalEvents() {
    const currentBlock = await this.provider.getBlockNumber();
    const batchSize = 1000;

    for (
      let fromBlock = this.lastProcessedBlock;
      fromBlock < currentBlock;
      fromBlock += batchSize
    ) {
      const toBlock = Math.min(fromBlock + batchSize, currentBlock);

      const events = await this.entryPoint.queryFilter(
        "UserOperationEvent",
        fromBlock,
        toBlock
      );

      for (const event of events) {
        if ("args" in event) {
          const {
            userOpHash,
            sender,
            paymaster,
            nonce,
            success,
            actualGasCost,
            actualGasUsed,
          } = event.args;
          const userOpEvent = {
            userOpHash,
            sender,
            paymaster,
            nonce,
            success,
            actualGasCost,
            actualGasUsed,
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
          };
          await this.saveUserOpEvent(userOpEvent);
        }
      }

      this.lastProcessedBlock = toBlock;
      console.info(`Processed blocks ${fromBlock} to ${toBlock}`);
    }
  }

  private async saveUserOpEvent(event: UserOperationEvent) {
    try {
      const data = {
        userOpHash: event.userOpHash,
        sender: event.sender,
        paymaster: event.paymaster,
        nonce: event.nonce.toString(),
        success: event.success,
        actualGasCost: event.actualGasCost.toString(),
        actualGasUsed: event.actualGasUsed.toString(),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        timestamp: new Date().toISOString(),
      };

      const userOpsCollection = collection(db, "userOperations");
      await addDoc(userOpsCollection, data);

      console.info(`Saved UserOperationEvent to Firebase: ${event.userOpHash}`);
    } catch (error: unknown) {
      console.error("Error saving UserOperationEvent to Firebase:", error);
      throw error;
    }
  }
}

const indexer = new UserOpIndexer();
indexer.start().catch((error) => {
  console.error("Failed to start indexer:", error);
  process.exit(1);
});
