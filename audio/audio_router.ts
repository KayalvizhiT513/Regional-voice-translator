
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { SupportedLanguage } from '../App';

export interface ParticipantMetadata {
  id: string;
  name: string;
  language: SupportedLanguage;
}

export class AudioRouter {
  private static botParticipantId: string = "LINGUIST_BOT_01";
  private static participants: Map<string, ParticipantMetadata> = new Map();

  /**
   * Registers a participant detected in the Google Meet Media API stream.
   */
  public static registerParticipant(id: string, name: string, language: SupportedLanguage) {
    this.participants.set(id, { id, name, language });
    console.log(`[Router] Registered participant ${name} (${language})`);
  }

  /**
   * Main logic loop for handling incoming audio packets.
   * @param participantId The ID of the speaker from gRPC
   * @param pcmData Raw PCM audio bytes
   */
  public static routeAudio(participantId: string, pcmData: Uint8Array) {
    // 1. Feedback Loop Prevention
    // If the audio source is our own playback bot, ignore it!
    if (participantId === this.botParticipantId) {
      return;
    }

    const speaker = this.participants.get(participantId);
    if (!speaker) return;

    // 2. Identify Target Language
    // Simple logic: Find the other primary language in the meeting.
    // In an MVP call between English and Hindi speakers:
    // If speaker is English -> Translate to Hindi.
    // If speaker is Hindi -> Translate to English.
    const targets = Array.from(this.participants.values())
      .filter(p => p.id !== participantId && p.id !== this.botParticipantId);

    const targetLanguage = targets[0]?.language || 'English';

    // 3. Dispatch to VAD -> STT -> Translate -> TTS Pipeline
    this.dispatchToPipeline(speaker, targetLanguage, pcmData);
  }

  private static dispatchToPipeline(speaker: ParticipantMetadata, target: SupportedLanguage, data: Uint8Array) {
    // console.log(`[Router] Sending audio from ${speaker.name} to ${target} pipeline.`);
    // Here we would call the Node.js gRPC or Gemini Live API sessions.
  }
}
