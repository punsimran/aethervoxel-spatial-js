# 🧊 AetherVoxel

AetherVoxel is a real-time, browser-based spatial computing workspace that allows you to build 3D voxel structures using nothing but your hands. By combining **Three.js** for high-performance 3D rendering and **MediaPipe** for AI-driven hand tracking, it turns your webcam into a spatial controller.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Technology](https://img.shields.io/badge/tech-Three.js%20%7C%20MediaPipe-00f2ff)

## ✨ Features

- **Zero Hardware Required**: Build in 3D using a standard webcam (no VR headset needed).
- **Gesture-Based Construction**: 
  - **Pinch (Thumb + Index)**: Place holographic blocks on the grid.
  - **Fist**: Clear the entire workspace instantly.
  - **Palm Distance**: Move your hand closer or further from the camera to Zoom.
- **Dynamic Camera**: The cursor stays locked to a 3D grid, moving relative to your perspective.
- **Holographic HUD**: A sci-fi inspired user interface providing real-time feedback on hand gestures and system status.

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome recommended).
- A webcam.
- A local development server (like VS Code Live Server).

### Installation
1. **Clone the repository:**
   ```bash
   git clone https://github.com/punsimran/aethervoxel-spatial-js
   cd AetherVoxel
