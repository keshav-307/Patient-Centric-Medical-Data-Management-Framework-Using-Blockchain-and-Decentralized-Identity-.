// src/dashboards/ProviderDashboard.jsx
import React, { useState } from "react";

export default function ProviderDashboard({ account, contracts }) {
  const { provider } = contracts;

  const [did, setDid] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [licenseId, setLicense] = useState("");
  const [hospital, setHospital] = useState("");
  const [status, setStatus] = useState("");

  const register = async () => {
    try {
      setStatus("Submitting...");
      const tx = await provider.registerProvider(
        did,
        name,
        role,
        licenseId,
        hospital
      );
      await tx.wait();
      setStatus("Provider registered — pending verification");
    } catch (e) {
      setStatus(e.message);
    }
  };

  return (
    <div style={{ marginTop: 30 }}>
      <h2>Provider Registration</h2>

      <input placeholder="DID" onChange={(e) => setDid(e.target.value)} /><br />
      <input placeholder="Name" onChange={(e) => setName(e.target.value)} /><br />
      <input placeholder="Role" onChange={(e) => setRole(e.target.value)} /><br />
      <input placeholder="License ID" onChange={(e) => setLicense(e.target.value)} /><br />
      <input placeholder="Hospital" onChange={(e) => setHospital(e.target.value)} /><br />

      <button onClick={register}>Register</button>
      <p>{status}</p>
    </div>
  );
}
