# CloudCrypt

**CloudCrypt** is a self-hosted, privacy-focused cloud storage platform designed for homelabs and personal servers. It provides a clean web interface, secure file storage, and client-side encryption so users retain full control over their data.

**Sample Instance:** (https://cloudcrypt.ca)  

![CloudCrypt Screenshot](https://github.com/user-attachments/assets/6f4da57d-7706-4c62-9a71-235928754ffd)

---

## Overview

CloudCrypt is built for people who want the convenience of services like Google Drive or Dropbox, while maintaining complete ownership of their infrastructure and data. It is especially suited for personal servers, family storage, and small trusted groups.

Unlike traditional self-hosted file servers, CloudCrypt is designed with a **zero-trust security model**, meaning files can be encrypted in a way that ensures only the intended user can access their contents.

This makes it ideal for scenarios where you want to provide storage for others while guaranteeing their privacy cryptographically, not just by policy.

---

## Features

-  **Zero-Trust Encryption**  
  Files can be encrypted client-side so only the owner holds the decryption key.

-  **Secure Shareable Links**  
  Generate links to share files safely and conveniently.

-  **Filesystem-Backed Storage**  
  Stored files map directly to the server’s filesystem for simplicity and transparency.

-  **Lightweight & Self-Hostable**  
  Designed to run efficiently on spare PCs, rasberry pi's, or low-power machines.

-  **Simple Web Interface**  
  Browse, upload, and manage files with an intuitive UI.

---

## Why CloudCrypt?

Many self-hosted storage tools assume the server operator is fully trusted. CloudCrypt instead assumes **infrastructure should not automatically imply access**. 
By separating storage from decryption capability, it allows hosts to provide storage services without needing access to user data.

This approach benefits:

- Homelab owners hosting storage for family or friends  
- Privacy-conscious users  
- Small teams needing lightweight infrastructure  
- Anyone wanting full control over their files  

---

## Upcoming Features

-  **Easier Dockerized Deployment**  
  Deployment currently has little documentation and would probably benefit from ready made docker images. 
  
-  **File Tags & Smart Organization**  
  Optional tagging system for easier file management.

-  **AI-Assisted Auto-Tagging (Optional)**  
  Automatically generate tags for images and PDFs. This feature is fully optional and can be disabled for privacy-focused deployments.

-  **Improved Compression & Upload Performance**  
  Optimizations to reduce transfer time and storage usage.

---

## Philosophy

CloudCrypt is built around three principles:

1. **Ownership** Your hardware, your data, your rules.  
2. **Privacy** Encryption should be enforced by design, not by trust.  
3. **Simplicity** Powerful storage shouldn’t require enterprise infrastructure.

---

## Status

CloudCrypt is actively in development. Features and APIs may evolve as the project matures.

---
