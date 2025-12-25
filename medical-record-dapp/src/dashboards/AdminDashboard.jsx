// src/dashboards/AdminDashboard.jsx
import React, { useState, useEffect } from "react";

export default function AdminDashboard({ account, contracts }) {
  const { provider } = contracts;

  const [admin, setAdmin] = useState("");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState("");

  const loadAdmin = async () => {
    setAdmin(await provider.admin());
  };

  const verify = async () => {
    if (account !== admin) {
      return setStatus("Only admin can verify providers");
    }
    try {
      setStatus("Verifying...");
      const tx = await provider.verifyProvider(address);
      await tx.wait();
      setStatus("Verified");
    } catch (e) {
      setStatus(e.message);
    }
  };

  useEffect(() => {
    if (provider) loadAdmin();
  }, [provider]);

  return (
    <div style={{ marginTop: 30 }}>
      <h2>Admin Dashboard</h2>
      <p>Admin Address: {admin}</p>

      <input
        placeholder="Provider address"
        onChange={(e) => setAddress(e.target.value)}
      /><br />

      <button onClick={verify}>Verify</button>
      <p>{status}</p>
    </div>
  );
}
