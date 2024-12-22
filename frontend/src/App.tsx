import axios from "axios";
import { useState } from "react";
import "./App.css";

interface UserOperation {
  userOpHash: string;
  sender: string;
  paymaster: string;
  nonce: string;
  success: boolean;
  actualGasCost: string;
  actualGasUsed: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: string;
}

function App() {
  const [searchParams, setSearchParams] = useState({
    userOpHash: "",
    sender: "",
    paymaster: "",
    success: "",
    blockNumber: "",
    transactionHash: "",
  });
  const [results, setResults] = useState<UserOperation[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const queryParams = new URLSearchParams();
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await axios.get(
        `http://localhost:3000/api/userops?${queryParams}`
      );
      console.log(response);
      setResults(response.data.data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch results";
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="content">
        <h1>UserOperation Explorer</h1>

        <form onSubmit={handleSearch} className="search-form">
          <div className="form-group">
            <label htmlFor="userOpHash">UserOp Hash</label>
            <input
              id="userOpHash"
              value={searchParams.userOpHash}
              onChange={(e) =>
                setSearchParams({
                  ...searchParams,
                  userOpHash: e.target.value,
                })
              }
              placeholder="0x..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="sender">Sender Address</label>
            <input
              id="sender"
              value={searchParams.sender}
              onChange={(e) =>
                setSearchParams({ ...searchParams, sender: e.target.value })
              }
              placeholder="0x..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="paymaster">Paymaster</label>
            <input
              id="paymaster"
              value={searchParams.paymaster}
              onChange={(e) =>
                setSearchParams({
                  ...searchParams,
                  paymaster: e.target.value,
                })
              }
              placeholder="0x..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="success">Success</label>
            <select
              id="success"
              value={searchParams.success}
              onChange={(e) =>
                setSearchParams({ ...searchParams, success: e.target.value })
              }
            >
              <option value="">All</option>
              <option value="true">Success</option>
              <option value="false">Failed</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="blockNumber">Block Number</label>
            <input
              id="blockNumber"
              value={searchParams.blockNumber}
              onChange={(e) =>
                setSearchParams({
                  ...searchParams,
                  blockNumber: e.target.value,
                })
              }
              type="number"
              placeholder="Enter block number"
            />
          </div>

          <div className="form-group">
            <label htmlFor="transactionHash">Transaction Hash</label>
            <input
              id="transactionHash"
              value={searchParams.transactionHash}
              onChange={(e) =>
                setSearchParams({
                  ...searchParams,
                  transactionHash: e.target.value,
                })
              }
              placeholder="0x..."
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        {results.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>UserOp Hash</th>
                  <th>Sender</th>
                  <th>Paymaster</th>
                  <th>Nonce</th>
                  <th>Success</th>
                  <th>Block Number</th>
                  <th>Gas Cost (Wei)</th>
                  <th>Gas Used</th>
                  <th>Transaction Hash</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {results.map((op) => (
                  <tr key={op.userOpHash}>
                    <td title={op.userOpHash}>
                      {op.userOpHash.slice(0, 6)}...{op.userOpHash.slice(-4)}
                    </td>
                    <td title={op.sender}>
                      <a
                        href={`https://holesky.etherscan.io/address/${op.sender}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {op.sender.slice(0, 6)}...{op.sender.slice(-4)}
                      </a>
                    </td>
                    <td title={op.paymaster}>
                      <a
                        href={`https://holesky.etherscan.io/address/${op.paymaster}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {op.paymaster.slice(0, 6)}...{op.paymaster.slice(-4)}
                      </a>
                    </td>
                    <td>{op.nonce}</td>
                    <td>{op.success ? "✅" : "❌"}</td>
                    <td>
                      <a
                        href={`https://holesky.etherscan.io/block/${op.blockNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {op.blockNumber}
                      </a>
                    </td>
                    <td>{Number(op.actualGasCost).toLocaleString()}</td>
                    <td>{Number(op.actualGasUsed).toLocaleString()}</td>
                    <td title={op.transactionHash}>
                      <a
                        href={`https://holesky.etherscan.io/tx/${op.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {op.transactionHash.slice(0, 6)}...
                        {op.transactionHash.slice(-4)}
                      </a>
                    </td>
                    <td>{new Date(op.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No results found</p>
        )}
      </div>
    </div>
  );
}

export default App;
