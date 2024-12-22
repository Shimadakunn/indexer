import express from "express";
import {
  collection,
  DocumentData,
  getDocs,
  query,
  Query,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

const router = express.Router();

interface QueryParams {
  userOpHash?: string;
  sender?: string;
  paymaster?: string;
  success?: boolean | string;
  blockNumber?: number | string;
  nonce?: string;
  actualGasCost?: string;
  actualGasUsed?: string;
  timestamp?: string;
  transactionHash?: string;
}

interface FirebaseError {
  code?: string;
  message?: string;
}

const isValidEthereumAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

router.get("/userops", async (req, res) => {
  try {
    if (!db) {
      throw new Error("Firebase database connection not established");
    }

    const userOpsCollection = collection(db, "userOperations");

    const params: QueryParams = req.query as Partial<QueryParams>;

    if (params.sender && !isValidEthereumAddress(params.sender)) {
      return res.status(400).json({
        success: false,
        error: "Invalid sender address format",
      });
    }

    if (params.paymaster && !isValidEthereumAddress(params.paymaster)) {
      return res.status(400).json({
        success: false,
        error: "Invalid paymaster address format",
      });
    }

    let q: Query<DocumentData> = query(userOpsCollection);

    if (params.userOpHash) {
      q = query(q, where("userOpHash", "==", params.userOpHash));
    }

    if (params.sender) {
      q = query(q, where("sender", "==", params.sender));
    }

    if (params.paymaster) {
      q = query(q, where("paymaster", "==", params.paymaster));
    }

    if (params.success !== undefined) {
      const successValue = params.success === true || params.success === "true";
      q = query(q, where("success", "==", successValue));
    }

    if (params.blockNumber) {
      q = query(
        q,
        where("blockNumber", "==", parseInt(params.blockNumber.toString()))
      );
    }

    if (params.nonce) {
      q = query(q, where("nonce", "==", params.nonce));
    }

    if (params.actualGasCost) {
      q = query(q, where("actualGasCost", "==", params.actualGasCost));
    }

    if (params.actualGasUsed) {
      q = query(q, where("actualGasUsed", "==", params.actualGasUsed));
    }

    if (params.transactionHash) {
      if (!/^0x[a-fA-F0-9]{64}$/.test(params.transactionHash)) {
        return res.status(400).json({
          success: false,
          error: "Invalid transaction hash format",
        });
      }
      q = query(q, where("transactionHash", "==", params.transactionHash));
    }

    if (params.timestamp) {
      q = query(q, where("timestamp", "==", params.timestamp));
    }

    const querySnapshot = await getDocs(q);
    console.log(
      "Query results:",
      querySnapshot.docs.map((doc) => doc.data())
    );

    console.log(`Found ${querySnapshot.size} documents`);

    const userOps = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({
      success: true,
      count: userOps.length,
      data: userOps,
    });
  } catch (error: unknown) {
    console.error("Detailed error:", error);

    const firebaseError = error as FirebaseError;

    if (firebaseError.code === "permission-denied") {
      return res.status(403).json({
        success: false,
        error:
          "Firebase permission denied. Check your security rules and authentication.",
      });
    }

    if (firebaseError.code === "invalid-argument") {
      return res.status(400).json({
        success: false,
        error: "Invalid query parameters or Firebase configuration.",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details:
        process.env.NODE_ENV === "development"
          ? firebaseError.message
          : undefined,
    });
  }
});

export default router;
