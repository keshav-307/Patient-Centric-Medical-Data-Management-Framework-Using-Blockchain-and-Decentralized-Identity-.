import React, { useEffect, useMemo, useState } from "react";
import { BrowserProvider, Contract, ethers } from "ethers";
import { create as ipfsHttpClient } from "ipfs-http-client";

import MedicalRecordManagerABI from "./contracts/MedicalRecordManagerABI.json";
import PatientRegistryABI from "./contracts/PatientRegistryABI.json";
import ProviderRegistryABI from "./contracts/ProviderRegistryABI.json";
import AuditLogABI from "./contracts/AuditLogABI.json";

import {
  MedicalRecordManagerAddress,
  PatientRegistryAddress,
  ProviderRegistryAddress,
  AuditLogAddress,
} from "./contracts/contractAddresses";

// ---------- IPFS ----------
const ipfs = ipfsHttpClient({ url: "http://localhost:5001/api/v0" });

// ---------- UI Helpers ----------
const Box = ({ children }) => (
  <section
    style={{
      background: "#fff",
      padding: 20,
      borderRadius: 8,
      marginBottom: 20,
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    }}
  >
    {children}
  </section>
);

export default function App() {
  // ---------- EVM / Contracts ----------
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);

  const [medRec, setMedRec] = useState(null);
  const [patientReg, setPatientReg] = useState(null);
  const [providerReg, setProviderReg] = useState(null);
  const [audit, setAudit] = useState(null);

  const [error, setError] = useState(null);
  const [role, setRole] = useState(""); // "", "patient", "doctor", "provider", "admin"

  // ---------- Patient state ----------
  const [did, setDid] = useState("");
  const [userName, setUserName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [medicalProfile, setMedicalProfile] = useState("");
  const [registerStatus, setRegisterStatus] = useState("");

  const [allPatients, setAllPatients] = useState([]);
  const [selectedPatientAddress, setSelectedPatientAddress] = useState("");
  const [selectedPatientInfo, setSelectedPatientInfo] = useState(null);

  // Upload & My Records
  const [file, setFile] = useState(null);
  const [txStatus, setTxStatus] = useState("");
  const [useAutoRecordId, setUseAutoRecordId] = useState(true);
  const [recordId, setRecordId] = useState("");
  const [recordIdsMine, setRecordIdsMine] = useState([]); // string[]
  const [myRecords, setMyRecords] = useState([]); // [{recordId, ipfsHash}]

  // Access requests (patient view)
  const [requests, setRequests] = useState([]);
  const [grantDuration, setGrantDuration] = useState(1);

  // Doctor view
  const [accessRecordId, setAccessRecordId] = useState("");
  const [requestStatus, setRequestStatus] = useState("");

  // Provider registration
  const [providerDid, setProviderDid] = useState("");
  const [providerName, setProviderName] = useState("");
  const [providerRole, setProviderRole] = useState("");
  const [providerLicenseId, setProviderLicenseId] = useState("");
  const [providerHospitalName, setProviderHospitalName] = useState("");
  const [registrationStatus, setRegistrationStatus] = useState("");

  // Admin
  const [adminVerificationAddress, setAdminVerificationAddress] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("");

  // ---------- utils ----------
  const safeNum = (v) => (typeof v === "bigint" ? Number(v) : Number(v));
  const safeStr = (v) => (typeof v === "bigint" ? v.toString() : String(v));

  const connected = useMemo(() => !!account, [account]);

  // ---------- connect ----------
  const connectWallet = async () => {
    if (!window.ethereum) {
      setError("Please install MetaMask.");
      return;
    }
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const prov = new BrowserProvider(window.ethereum);
      const sign = await prov.getSigner();
      const addr = await sign.getAddress();

      setProvider(prov);
      setSigner(sign);
      setAccount(addr);

      setMedRec(new Contract(MedicalRecordManagerAddress, MedicalRecordManagerABI, sign));
      setPatientReg(new Contract(PatientRegistryAddress, PatientRegistryABI, sign));
      setProviderReg(new Contract(ProviderRegistryAddress, ProviderRegistryABI, sign));
      setAudit(new Contract(AuditLogAddress, AuditLogABI, sign));

      setError(null);
    } catch (e) {
      setError(e.code === 4001 ? "Connection denied" : e.message);
    }
  };

  const logout = () => {
    setRole("");
    setDid("");
    setUserName("");
    setDateOfBirth("");
    setMedicalProfile("");
    setRegisterStatus("");
    setSelectedPatientAddress("");
    setSelectedPatientInfo(null);
    setFile(null);
    setTxStatus("");
    setUseAutoRecordId(true);
    setRecordId("");
    setRecordIdsMine([]);
    setMyRecords([]);
    setRequests([]);
    setGrantDuration(1);
    setAccessRecordId("");
    setRequestStatus("");
    setProviderDid("");
    setProviderName("");
    setProviderRole("");
    setProviderLicenseId("");
    setProviderHospitalName("");
    setRegistrationStatus("");
    setAdminVerificationAddress("");
    setVerificationStatus("");

    setAccount(null);
    setProvider(null);
    setSigner(null);
    setMedRec(null);
    setPatientReg(null);
    setProviderReg(null);
    setAudit(null);
  };

  // ---------- Patient: registry ----------
  const fetchAllPatients = async () => {
    if (!patientReg) return;
    try {
      const total = safeNum(await patientReg.getTotalPatients());
      const addrs = [];
      for (let i = 0; i < total; i++) addrs.push(await patientReg.patientAddresses(i));
      setAllPatients(addrs);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPatientDetails = async (address) => {
    if (!patientReg || !address) return;
    try {
      const p = await patientReg.getPatient(address);
      setSelectedPatientInfo({
        did: p.did ?? p[0],
        name: p.name ?? p[1],
        dateOfBirth: safeNum(p.dateOfBirth ?? p[2]),
        medicalProfile: p.medicalProfile ?? p[3],
      });
    } catch (e) {
      console.error(e);
      setSelectedPatientInfo(null);
    }
  };

  const registerPatient = async () => {
    if (!patientReg) return alert("Patient registry contract not ready");
    if (!did || !userName || !dateOfBirth || !medicalProfile) return alert("Please fill all fields");
    try {
      setRegisterStatus("Registering...");
      const dobTs = Math.floor(new Date(dateOfBirth).getTime() / 1000);
      const tx = await patientReg.registerPatient(did, userName, dobTs, medicalProfile);
      await tx.wait();
      setRegisterStatus("Patient registered successfully!");
      await fetchAllPatients();
      // after register, refresh my stuff
      await refreshMyRecords();
    } catch (e) {
      setRegisterStatus("Registration failed: " + e.message);
    }
  };

  const onSelectPatient = (address) => {
    setSelectedPatientAddress(address);
    fetchPatientDetails(address);
  };

  // ---------- Records ----------
  const onFileChange = (e) => {
    if (e.target.files?.length) setFile(e.target.files[0]);
  };

  // compute next record id from my current record IDs
  const computeNextRecordId = (ids) => {
    if (!ids || ids.length === 0) return "1";
    const nums = ids
      .map((s) => String(s))
      .map((s) => (s.match(/^\d+$/) ? Number(s) : NaN))
      .filter((n) => !Number.isNaN(n));
    if (nums.length === ids.length) {
      return String(Math.max(...nums) + 1);
    }
    // fallback: timestamp based
    return String(Date.now());
  };

  const suggestNewRecordId = async () => {
    if (!medRec) return;
    try {
      const ids = await medRec.getMyRecords(); // string[]
      const idsStr = ids.map(safeStr);
      setRecordIdsMine(idsStr);
      const nextId = computeNextRecordId(idsStr);
      if (useAutoRecordId) setRecordId(nextId);
    } catch (e) {
      setTxStatus("Fetch records failed: " + (e?.shortMessage || e.message));
    }
  };

  // Fetch my record IDs, then resolve each to ipfs hash concurrently and handle inaccessible records
  const refreshMyRecords = async () => {
    if (!medRec) return;
    try {
      const ids = await medRec.getMyRecords();
      console.log("Fetched record IDs:", ids);
      const idsStr = ids.map(safeStr);
      setRecordIdsMine(idsStr);

      const recordsDetails = await Promise.all(
        idsStr.map(async (id) => {
          try {
            const rec = await medRec.getRecord(id);
            const ipfsHash = rec.ipfsHash ?? rec[2];
            const exists = rec.exists ?? rec[5];
            if (exists && ipfsHash) {
              return { recordId: id, ipfsHash };
            }
            return null;
          } catch (err) {
            console.warn(`Access denied or error fetching record ID ${id}. Skipping.`);
            return null;
          }
        })
      );

      const accessibleRecords = recordsDetails.filter((rec) => rec !== null);
      setMyRecords(accessibleRecords);

      if (useAutoRecordId) setRecordId(computeNextRecordId(idsStr));
      setTxStatus("");
    } catch (e) {
      setTxStatus("Fetch records failed: " + (e?.shortMessage || e.message));
      setMyRecords([]);
    }
  };

  // Correct AuditLog call based on ABI
  const addAuditLog = async ({ action, recordId = "", targetAddress = ethers.ZeroAddress, info = "" }) => {
    if (!audit) return;
    try {
      // createLog(address _actor, string _action, string _recordId, address _targetAddress, string _additionalInfo)
      const tx = await audit.createLog(account, action, String(recordId || ""), targetAddress, info);
      await tx.wait();
    } catch (e) {
      // non-blocking
      console.warn("Audit log failed:", e?.shortMessage || e.message);
    }
  };

  const uploadRecord = async () => {
    if (!file) return alert("Please select a file");
    if (!recordId) return alert("Please enter a record ID");
    if (!medRec) return alert("Medical Record Manager not ready");

    try {
      setTxStatus("Uploading to IPFS...");
      const added = await ipfs.add(file);
      const ipfsHash = (added?.cid ? added.cid.toString() : added?.path) || "";
      if (!ipfsHash) throw new Error("IPFS upload did not return a CID");

      setTxStatus("Submitting record to blockchain...");
      const tx = await medRec.uploadMedicalRecord(String(recordId), ipfsHash, "general");
      await tx.wait();

      setTxStatus("Upload successful!");
      await addAuditLog({
        action: "RecordUploaded",
        recordId: String(recordId),
        targetAddress: account,
        info: ipfsHash,
      });

      await refreshMyRecords();
    } catch (e) {
      setTxStatus("Upload failed: " + (e?.shortMessage || e.message));
    }
  };

  // ---------- Access requests (patient) ----------
  const fetchRequests = async () => {
    if (!medRec) return;
    try {
      const ids = await medRec.getMyAccessRequests(); // uint256[]
      const out = [];
      for (const id of ids) {
        const r = await medRec.accessRequests(safeNum(id));
        out.push({
          requestId: safeNum(r.requestId ?? r[0]),
          provider: r.providerAddress ?? r[1],
          patient: r.patientAddress ?? r[2],
          purpose: r.purpose ?? r[3],
          recordId: r.recordId ?? r[4],
          requestDate: safeNum(r.requestDate ?? r[5]),
          isApproved: Boolean(r.isApproved ?? r[6]),
          isRejected: Boolean(r.isRejected ?? r[7]),
          expiryDate: safeNum(r.expiryDate ?? r[8]),
        });
      }
      setRequests(out);
    } catch (e) {
      setTxStatus("Fetch requests failed: " + (e?.shortMessage || e.message));
      setRequests([]);
    }
  };

  const grantAccess = async (requestId) => {
    if (!medRec) return;
    try {
      setTxStatus("Granting access...");
      const tx = await medRec.grantAccess(Number(requestId), Number(grantDuration || 1));
      await tx.wait();
      setTxStatus("Access granted.");
      await addAuditLog({ action: "AccessGranted", recordId: String(requestId) });
      fetchRequests();
    } catch (e) {
      setTxStatus("Grant access failed: " + (e?.shortMessage || e.message));
    }
  };

  const denyAccess = async (requestId) => {
    if (!medRec) return;
    try {
      setTxStatus("Denying access...");
      const tx = await medRec.denyAccess(Number(requestId));
      await tx.wait();
      setTxStatus("Access denied.");
      await addAuditLog({ action: "AccessDenied", recordId: String(requestId) });
      fetchRequests();
    } catch (e) {
      setTxStatus("Deny access failed: " + (e?.shortMessage || e.message));
    }
  };

  // ---------- Doctor ----------
  const requestAccess = async () => {
    if (!medRec) return alert("Medical Record Manager not ready");
    if (!selectedPatientAddress || !accessRecordId) return alert("Select patient & enter record ID");
    setRequestStatus("Requesting access...");
    try {
      const tx = await medRec.requestAccess(selectedPatientAddress, String(accessRecordId), "Requested via DApp");
      await tx.wait();
      setRequestStatus("Request submitted.");
      await addAuditLog({
        action: "AccessRequested",
        recordId: String(accessRecordId),
        targetAddress: selectedPatientAddress,
        info: "Requested via DApp",
      });
      // patient will see it under their account; nothing to fetch here for doctor
    } catch (e) {
      setRequestStatus("Request failed: " + (e?.shortMessage || e.message));
    }
  };

  // ---------- Provider registration / Admin ----------
  const registerProvider = async () => {
    if (!providerReg) return alert("Provider Registry not ready");
    if (!providerDid || !providerName || !providerRole) return alert("Fill required fields");
    try {
      setRegistrationStatus("Registering provider...");
      const tx = await providerReg.registerProvider(
        providerDid,
        providerName,
        providerRole,
        providerLicenseId || "",
        providerHospitalName || ""
      );
      await tx.wait();
      setRegistrationStatus("Provider registration submitted. Await admin verification.");
    } catch (e) {
      setRegistrationStatus("Provider registration failed: " + (e?.shortMessage || e.message));
    }
  };

  const verifyProvider = async () => {
    if (!providerReg) return alert("Provider Registry not ready");
    if (!adminVerificationAddress) return alert("Enter provider address");
    try {
      setVerificationStatus("Verifying provider...");
      const tx = await providerReg.verifyProvider(adminVerificationAddress);
      await tx.wait();
      setVerificationStatus("Provider verified successfully.");
    } catch (e) {
      setVerificationStatus("Verification failed: " + (e?.shortMessage || e.message));
    }
  };

  // ---------- Effects ----------
  useEffect(() => {
    connectWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load patient list whenever registry ready
  useEffect(() => {
    if (patientReg) fetchAllPatients();
  }, [patientReg]);

  // When switching to patient role or when contract available, keep records & requests fresh
  useEffect(() => {
    if (role === "patient" && medRec) {
      refreshMyRecords();
      fetchRequests();
      suggestNewRecordId();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, medRec]);

  // ---------- UI ----------
  return (
    <div
      style={{
        maxWidth: 1000,
        margin: "auto",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        padding: 20,
        backgroundColor: "#f5f7fb",
        borderRadius: 8,
      }}
    >
      <header style={{ textAlign: "center", marginBottom: 20 }}>
        <h1 style={{ color: "#003366", marginBottom: 10 }}>Medical Record DApp</h1>
        {!connected ? (
          <button onClick={connectWallet} style={{ padding: "10px 20px" }}>
            Connect MetaMask
          </button>
        ) : (
          <>
            <p>
              <b>Connected:</b> <span style={{ color: "#006699" }}>{account}</span>
            </p>
            <button onClick={logout} style={{ padding: "6px 10px", fontSize: 14 }}>
              Logout
            </button>
          </>
        )}
        {error && <p style={{ color: "red", fontWeight: "bold" }}>{error}</p>}
      </header>

      {!role && connected && (
        <Box>
          <h2>Select your role</h2>
          <label style={{ marginRight: 20 }}>
            <input type="radio" name="role" value="patient" onChange={(e) => setRole(e.target.value)} /> Patient
          </label>
          <label style={{ marginRight: 20 }}>
            <input type="radio" name="role" value="doctor" onChange={(e) => setRole(e.target.value)} /> Doctor
          </label>
          <label style={{ marginRight: 20 }}>
            <input type="radio" name="role" value="provider" onChange={(e) => setRole(e.target.value)} /> Provider (Register)
          </label>
          <label>
            <input type="radio" name="role" value="admin" onChange={(e) => setRole(e.target.value)} /> Admin (Verify Provider)
          </label>
        </Box>
      )}

      {/* Patient */}
      {role === "patient" && (
        <>
          <Box>
            <h2>Register New Patient</h2>
            <input
              type="text"
              placeholder="DID"
              value={did}
              onChange={(e) => setDid(e.target.value)}
              style={{ width: "100%", padding: 10, marginBottom: 10 }}
            />
            <input
              type="text"
              placeholder="Name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              style={{ width: "100%", padding: 10, marginBottom: 10 }}
            />
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              style={{ width: "100%", padding: 10, marginBottom: 10 }}
            />
            <input
              type="text"
              placeholder="Medical Profile"
              value={medicalProfile}
              onChange={(e) => setMedicalProfile(e.target.value)}
              style={{ width: "100%", padding: 10, marginBottom: 10 }}
            />
            <button onClick={registerPatient} style={{ padding: "8px 16px" }}>
              Register Patient
            </button>
            <p>{registerStatus}</p>
          </Box>

          <Box>
            <h2>Select Registered Patient</h2>
            <select
              value={selectedPatientAddress}
              onChange={(e) => onSelectPatient(e.target.value)}
              style={{ width: "100%", padding: 10, marginBottom: 10 }}
            >
              <option value="">-- Select Patient --</option>
              {allPatients.map((addr) => (
                <option key={addr} value={addr}>
                  {addr}
                </option>
              ))}
            </select>
            {selectedPatientInfo && (
              <div>
                <p>
                  <b>DID:</b> {selectedPatientInfo.did}
                </p>
                <p>
                  <b>Name:</b> {selectedPatientInfo.name}
                </p>
                <p>
                  <b>Date of Birth:</b> {new Date(selectedPatientInfo.dateOfBirth * 1000).toLocaleDateString()}
                </p>
                <p>
                  <b>Medical Profile:</b> {selectedPatientInfo.medicalProfile}
                </p>
              </div>
            )}
          </Box>

          <Box>
            <h2>Upload Medical Record</h2>
            <label style={{ display: "block", marginBottom: 10 }}>
              <input
                type="checkbox"
                checked={useAutoRecordId}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setUseAutoRecordId(checked);
                  if (checked) {
                    setRecordId(computeNextRecordId(recordIdsMine));
                  } else {
                    setRecordId("");
                  }
                }}
              />{" "}
              Use auto-generated Record ID: <b>{useAutoRecordId ? recordId || "…" : "off"}</b>{" "}
              <button
                style={{ marginLeft: 8, padding: "4px 10px" }}
                onClick={() => suggestNewRecordId()}
                title="Refresh"
              >
                ↻ Refresh
              </button>
            </label>

            {!useAutoRecordId && (
              <input
                type="text"
                placeholder="Record ID"
                value={recordId}
                onChange={(e) => setRecordId(e.target.value)}
                style={{ width: "100%", padding: 10, marginBottom: 10 }}
              />
            )}

            <input type="file" onChange={onFileChange} style={{ marginBottom: 10 }} />
            <button onClick={uploadRecord} style={{ padding: "8px 16px" }}>
              Upload
            </button>
            <p>{txStatus}</p>
          </Box>

          <Box>
            <h2>My Medical Records</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#007bff", color: "#fff" }}>
                  <th style={{ padding: 10, border: "1px solid #ddd" }}>Record ID</th>
                  <th style={{ padding: 10, border: "1px solid #ddd" }}>IPFS Hash</th>
                  <th style={{ padding: 10, border: "1px solid #ddd" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {myRecords.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ padding: 10, textAlign: "center" }}>
                      No records found
                    </td>
                  </tr>
                ) : (
                  myRecords.map((r) => (
                    <tr key={r.recordId}>
                      <td style={{ padding: 10, border: "1px solid #ddd" }}>{r.recordId}</td>
                      <td style={{ padding: 10, border: "1px solid #ddd", fontFamily: "monospace" }}>
                        {r.ipfsHash}
                      </td>
                      <td style={{ padding: 10, border: "1px solid #ddd" }}>
                        <a href={`https://ipfs.io/ipfs/${r.ipfsHash}`} target="_blank" rel="noopener noreferrer">
                          View
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Box>

          <Box>
            <h2>Access Requests</h2>
            {requests.length === 0 ? (
              <p>No access requests</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#007bff", color: "#fff" }}>
                    <th style={{ padding: 10, border: "1px solid #ddd" }}>Request ID</th>
                    <th style={{ padding: 10, border: "1px solid #ddd" }}>Provider</th>
                    <th style={{ padding: 10, border: "1px solid #ddd" }}>Record ID</th>
                    <th style={{ padding: 10, border: "1px solid #ddd" }}>Purpose</th>
                    <th style={{ padding: 10, border: "1px solid #ddd" }}>Status</th>
                    <th style={{ padding: 10, border: "1px solid #ddd" }}>Duration (days)</th>
                    <th style={{ padding: 10, border: "1px solid #ddd" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr key={safeStr(req.requestId)}>
                      <td style={{ padding: 10, border: "1px solid #ddd" }}>{safeStr(req.requestId)}</td>
                      <td style={{ padding: 10, border: "1px solid #ddd" }}>{req.provider}</td>
                      <td style={{ padding: 10, border: "1px solid #ddd" }}>{req.recordId}</td>
                      <td style={{ padding: 10, border: "1px solid #ddd" }}>{req.purpose}</td>
                      <td style={{ padding: 10, border: "1px solid #ddd" }}>
                        {req.isApproved ? "Approved" : req.isRejected ? "Rejected" : "Pending"}
                      </td>
                      <td style={{ padding: 10, border: "1px solid #ddd" }}>
                        <input
                          type="number"
                          min="1"
                          value={grantDuration}
                          onChange={(e) => setGrantDuration(Number(e.target.value))}
                          style={{ padding: 5, width: 70 }}
                        />
                      </td>
                      <td style={{ padding: 10, border: "1px solid #ddd" }}>
                        <button onClick={() => grantAccess(req.requestId)} style={{ marginRight: 10 }}>
                          Grant
                        </button>
                        <button onClick={() => denyAccess(req.requestId)}>Deny</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Box>
        </>
      )}

      {/* Doctor */}
      {role === "doctor" && (
        <Box>
          <h2>Request Access to Patient Record</h2>
          <select
            value={selectedPatientAddress}
            onChange={(e) => setSelectedPatientAddress(e.target.value)}
            style={{ width: "100%", padding: 10, marginBottom: 10 }}
          >
            <option value="">-- Select Patient --</option>
            {allPatients.map((addr) => (
              <option key={addr} value={addr}>
                {addr}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Enter Record ID"
            value={accessRecordId}
            onChange={(e) => setAccessRecordId(e.target.value)}
            style={{ width: "100%", padding: 10, marginBottom: 10 }}
          />
          <button onClick={requestAccess} style={{ padding: "8px 16px" }}>
            Request Access
          </button>
          <p>{requestStatus}</p>
        </Box>
      )}

      {/* Provider */}
      {role === "provider" && (
        <Box>
          <h2>Register as Provider</h2>
          <input
            type="text"
            placeholder="DID"
            value={providerDid}
            onChange={(e) => setProviderDid(e.target.value)}
            style={{ width: "100%", padding: 10, marginBottom: 10 }}
          />
          <input
            type="text"
            placeholder="Name"
            value={providerName}
            onChange={(e) => setProviderName(e.target.value)}
            style={{ width: "100%", padding: 10, marginBottom: 10 }}
          />
          <input
            type="text"
            placeholder="Role"
            value={providerRole}
            onChange={(e) => setProviderRole(e.target.value)}
            style={{ width: "100%", padding: 10, marginBottom: 10 }}
          />
          <input
            type="text"
            placeholder="License ID (optional)"
            value={providerLicenseId}
            onChange={(e) => setProviderLicenseId(e.target.value)}
            style={{ width: "100%", padding: 10, marginBottom: 10 }}
          />
          <input
            type="text"
            placeholder="Hospital Name (optional)"
            value={providerHospitalName}
            onChange={(e) => setProviderHospitalName(e.target.value)}
            style={{ width: "100%", padding: 10, marginBottom: 10 }}
          />
          <button onClick={registerProvider} style={{ padding: "8px 16px" }}>
            Register Provider
          </button>
          <p>{registrationStatus}</p>
        </Box>
      )}

      {/* Admin */}
      {role === "admin" && (
        <Box>
          <h2>Verify Provider (Admin)</h2>
          <input
            type="text"
            placeholder="Provider Address to Verify"
            value={adminVerificationAddress}
            onChange={(e) => setAdminVerificationAddress(e.target.value)}
            style={{ width: "100%", padding: 10, marginBottom: 10 }}
          />
          <button onClick={verifyProvider} style={{ padding: "8px 16px" }}>
            Verify Provider
          </button>
          <p>{verificationStatus}</p>
        </Box>
      )}
    </div>
  );
}
