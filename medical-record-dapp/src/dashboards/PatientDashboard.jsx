// src/dashboards/PatientDashboard.jsx
import React, { useState, useEffect } from "react";
import { create as ipfsHttpClient } from "ipfs-http-client";

const ipfs = ipfsHttpClient({ url: "http://127.0.0.1:5001/api/v0" });

export default function PatientDashboard({ account, contracts }) {
  const { med, patient, audit } = contracts;

  const [did, setDid] = useState("");
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [profile, setProfile] = useState("");
  const [status, setStatus] = useState("");

  const [file, setFile] = useState(null);
  const [recordId, setRecordId] = useState("");
  const [records, setRecords] = useState([]);

  const safe = (x) => (typeof x === "bigint" ? Number(x) : x);

  const registerPatient = async () => {
    try {
      const dobTs = Math.floor(new Date(dob).getTime() / 1000);
      const tx = await patient.registerPatient(did, name, dobTs, profile);
      await tx.wait();
      setStatus("Registered successfully");
    } catch (err) {
      console.error(err);
      setStatus(err.message);
    }
  };

  const onFile = (e) => setFile(e.target.files[0]);

  const fetchRecords = async () => {
    try {
      const ids = await med.getMyRecords();
      const list = [];
      for (const id of ids) {
        const full = await med.getRecord(id);
        list.push({
          id,
          ipfsHash: full.ipfsHash,
          recordType: full.recordType
        });
      }
      setRecords(list);
    } catch (e) {
      console.error(e);
    }
  };

  const upload = async () => {
    if (!file) return alert("Choose file");

    try {
      setStatus("Uploading to IPFS...");
      const added = await ipfs.add(file);
      const hash = added.cid.toString();

      setStatus("Writing to blockchain...");
      const tx = await med.uploadMedicalRecord(recordId, hash, "general");
      await tx.wait();

      await audit.createLog(
        account,
        "UPLOAD",
        recordId,
        account,
        `Uploaded: ${hash}`
      );

      setStatus("Upload successful");
      fetchRecords();
    } catch (err) {
      console.error(err);
      setStatus("Failed: " + err.message);
    }
  };

  useEffect(() => {
    if (med) fetchRecords();
  }, [med]);

  return (
    <div style={{ marginTop: 30 }}>
      <h2>Patient Dashboard</h2>

      <h3>Register Patient</h3>
      <input placeholder="DID" onChange={(e) => setDid(e.target.value)} /><br />
      <input placeholder="Name" onChange={(e) => setName(e.target.value)} /><br />
      <input type="date" onChange={(e) => setDob(e.target.value)} /><br />
      <input placeholder="Medical Profile" onChange={(e) => setProfile(e.target.value)} /><br />
      <button onClick={registerPatient}>Register</button>
      <p>{status}</p>

      <hr />

      <h3>Upload Medical Record</h3>
      <input placeholder="Record ID" onChange={(e) => setRecordId(e.target.value)} /><br />
      <input type="file" onChange={onFile} /><br />
      <button onClick={upload}>Upload</button>

      <h3>My Records</h3>

      <table border="1" cellPadding="8" width="100%">
        <thead>
          <tr><th>ID</th><th>Hash</th><th>Open</th></tr>
        </thead>

        <tbody>
          {records.map((r) => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>{r.ipfsHash}</td>
              <td>
                <a href={`https://ipfs.io/ipfs/${r.ipfsHash}`} target="_blank" rel="noreferrer">
                  View
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

    </div>
  );
}
