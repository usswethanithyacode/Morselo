# Morselo 🍳✨

> **A Little Inspiration for Your Kitchen** — An intelligent, full-stack recipe creation and kitchen inventory platform powered by React, Node.js Express, MongoDB Atlas, and PostgreSQL (Neon).

---

## 🌟 Overview

Morselo helps home cooks discover delicious recipes tailored to the ingredients currently in their pantry. It combines a relational ingredient catalog taxonomy with document-based recipe storage and AI-powered recipe synthesis.

---

## 🛠️ Architecture & Tech Stack

- **Frontend**: React 19 + Vite + React Router + Modern Vanilla CSS (warm pastel aesthetics).
- **Backend**: Node.js + Express REST API.
- **Relational Database (SQL)**: PostgreSQL (Neon Cloud) managed via **Sequelize ORM** (Atomic transactions, Normalized 3NF Schema, `INNER JOIN` queries).
- **Document Database (NoSQL)**: MongoDB Atlas managed via **Mongoose ODM** (Referencing relationships, Aggregation pipelines, Compound performance indexes).
- **Security & Auth**: JWT-based authentication with bcrypt password hashing and Role-Based Access Control (RBAC).

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+ recommended)
- npm

### 1. Backend Setup
```bash
cd server
npm install
node server.js
```
The backend server runs on `http://localhost:5000`.

### 2. Frontend Setup
```bash
# In the repository root:
npm install
npm run dev
```
The client application runs on `http://localhost:5173`.

---

## 🌿 Git & Collaboration Workflow

Morselo adheres to structured Git branching standards:
- **`master`**: Production-ready, stable main branch.
- **`feature/<feature-name>`**: Dedicated short-lived branches created from `master` for isolated development and verification.
- **Testing & Verification**: Every branch is strictly validated with automated test suites before merging into `master`.
