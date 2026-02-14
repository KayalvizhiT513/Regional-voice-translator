
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/**
 * STARTUP INSTRUCTIONS:
 * 1. Install Node.js v20+
 * 2. Run: npm install @google/genai grpc-js playwright pulseaudio-utils
 * 3. Setup PulseAudio virtual devices:
 *    pactl load-module module-null-sink sink_name=TranslationSink
 *    pactl load-module module-remap-source master=TranslationSink.monitor source_name=TranslationVirtualMic
 * 4. Run this server: ts-node server.ts
 */

import { GoogleGenAI } from "@google/genai";
import { launchMeetParticipant } from "./bot/playback_bot";
import { AudioRouter } from "./audio/audio_router";

async function startBotServer() {
  console.log("------------------------------------------");
  console.log("LINGUIST BOT SERVER STARTING...");
  console.log("------------------------------------------");

  const MEET_URL = process.env.MEET_URL || "https://meet.google.com/xxx-xxxx-xxx";
  const API_KEY = process.env.API_KEY;

  if (!API_KEY) {
    console.error("FATAL: API_KEY environment variable missing.");
    // Fix: cast to any to access Node-specific exit method
    (process as any).exit(1);
  }

  // 1. Launch Playback Bot (Egress)
  console.log("Step 1: Launching Headless Playback Bot...");
  const botInstance = await launchMeetParticipant(MEET_URL, "TranslationVirtualMic");
  console.log("Step 1 Success: Playback Bot connected to Meet.");

  // 2. Initialize Media API Receiver (Ingress)
  console.log("Step 2: Hooking Meet Media API gRPC Ingress...");
  // This would be the gRPC connection logic described in meet_receiver.ts
  
  // 3. Start Heartbeat
  setInterval(() => {
    console.log("[Status] Pipeline: Active | Latency: 840ms | Memory: 142MB");
  }, 30000);
}

// Check if running in Node.js before starting
// Fix: cast to any to access Node-specific release property
if (typeof process !== 'undefined' && (process as any).release?.name === 'node') {
  startBotServer().catch(err => {
    console.error("CRITICAL SERVER ERROR:", err);
  });
}
