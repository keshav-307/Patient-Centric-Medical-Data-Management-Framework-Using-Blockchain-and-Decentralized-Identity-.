import { ethers } from "ethers";

import MedicalRecordManagerABI from '../contracts/MedicalRecordManagerABI.json';
import PatientRegistryABI from '../contracts/PatientRegistryABI.json';
import ProviderRegistryABI from '../contracts/ProviderRegistryABI.json';
import AuditLogABI from '../contracts/AuditLogABI.json';

import {
  MedicalRecordManagerAddress,
  PatientRegistryAddress,
  ProviderRegistryAddress,
  AuditLogAddress
} from '../contracts/contractAddresses';

// Each function returns an ethers Contract instance connected to signer/provider
export const getMedicalRecordManagerContract = (signerOrProvider) => {
  return new ethers.Contract(MedicalRecordManagerAddress, MedicalRecordManagerABI, signerOrProvider);
};

export const getPatientRegistryContract = (signerOrProvider) => {
  return new ethers.Contract(PatientRegistryAddress, PatientRegistryABI, signerOrProvider);
};

export const getProviderRegistryContract = (signerOrProvider) => {
  return new ethers.Contract(ProviderRegistryAddress, ProviderRegistryABI, signerOrProvider);
};

export const getAuditLogContract = (signerOrProvider) => {
  return new ethers.Contract(AuditLogAddress, AuditLogABI, signerOrProvider);
};
