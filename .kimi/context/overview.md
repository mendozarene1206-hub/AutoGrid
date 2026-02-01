# AutoGrid - Trojan Architecture

## 🎯 Project Identity
**AutoGrid** is a construction estimation management system with AI-powered auditing, designed for the Mexican market with NOM-151 compliance (digital signatures and forensic traceability).

## 🏛️ Architecture Pattern: "Trojan"
The "Trojan" architecture emphasizes:
- **Stealth Processing**: Zero-server-RAM file handling via streaming
- **Modular Payloads**: Each service (frontend, server, worker, MCP) is independent
- **Secure Core**: Multiple security layers (JWT, RLS, rate limiting, SHA-256)
- **Adaptive Interface**: Univer Grid that handles massive Excel files chunk by chunk

## 🎯 Problem Statement
Construction project managers in Mexico waste weeks managing Excel estimates with frequent math errors and no legal traceability of approvals.

## ✅ Solution
A web platform where users upload Excel estimates, automatically audit with AI (Gemini), manage digital approval workflows, and sign documents with NOM-151 legal validity.
