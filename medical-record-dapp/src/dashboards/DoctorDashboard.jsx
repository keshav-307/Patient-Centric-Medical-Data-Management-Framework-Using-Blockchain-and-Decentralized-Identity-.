// src/dashboards/DoctorDashboard.jsx
import React, { useEffect, useState } from "react";

export default function DoctorDashboard({ account, contracts }) {
  const { med, patient } = contracts;

  const [patients, setPatients] = useState([]);
  const [selected, setSelected] = useState("");
  const [recordId, setRecordId] = useState("");
  const [status, setStatus] = useState("");

  const fetchPatients = async () => {
    const total = await patient.getTotalPatients();
    const list = [];
    for (let i = 0; i < Number(total); i++) {
      list.push(await patient.patientAddresses(i));
    }
    setPatients(list);
  };

  const reqAccess = async () => {
    try {
      setStatus("Sending request...");
      const tx = await med.requestAccess(selected, recordId, "DApp request");
      await tx.wait();
      setStatus("Request sent");
    } catch (err) {
      console.error(err);
      setStatus(err.message);
    }
  };

  useEffect(() => {
    if (patient) fetchPatients();
  }, [patient]);

  return (
    <div style={{ marginTop: 30 }}>
      <h2>Doctor Dashboard</h2>

      <select onChange={(e) => setSelected(e.target.value)}>
        <option value="">Select Patient</option>
        {patients.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>

      <input placeholder="Record ID"
        onChange={(e) => setRecordId(e.target.value)} /><br />

      <button onClick={reqAccess}>Request Access</button>
      <p>{status}</p>
    </div>
  );
}
