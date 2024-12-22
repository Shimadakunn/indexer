import dotenv from "dotenv";

dotenv.config();

export const config = {
  ethereum: {
    rpcUrl:
      process.env.ETH_RPC_URL ||
      "https://eth-mainnet.g.alchemy.com/v2/your-api-key",
    entryPointAddress: "0x0000000071727de22e5e9d8baf0edac6f37da032",
    startBlock: parseInt(process.env.START_BLOCK || "0", 10),
    userOpEventTopic:
      "0x49628fd1471006c1482da88028e9ce4dbb080b815c9b0344d39e5a8e6ec1419f",
  },
  database: {
    url:
      process.env.DATABASE_URL ||
      "postgresql://user:password@localhost:5432/userop_db",
  },
  server: {
    port: parseInt(process.env.PORT || "3000", 10),
  },
};
