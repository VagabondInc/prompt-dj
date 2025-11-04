/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';


import './PromptController';
import './PlayPauseButton';
import type { PlaybackState, Prompt } from '../types';
import { MidiDispatcher } from '../utils/MidiDispatcher';

/** The grid of prompt inputs. */
@customElement('prompt-dj-midi')
export class PromptDjMidi extends LitElement {
  static override styles = css`
    :host {
      min-height: 100%;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      box-sizing: border-box;
      position: relative;
      padding: clamp(48px, 7vmin, 96px) clamp(24px, 8vw, 96px);
      gap: clamp(32px, 4.2vmin, 56px);
      color: var(--text-primary);
    }
    h1 {
      font-family: var(--font-heading);
      font-size: clamp(32px, 5vw, 58px);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin: 0;
      text-align: center;
      color: var(--accent-cyan);
      text-shadow: 0 10px 40px rgba(14, 62, 91, 0.9);
    }
    .subheading {
      font-family: var(--font-heading);
      font-size: clamp(16px, 2.2vw, 22px);
      letter-spacing: 0.04em;
      text-align: center;
      color: var(--text-secondary);
      max-width: clamp(360px, 70vw, 600px);
    }
    #console {
      width: clamp(340px, 94vw, 1360px);
      border-radius: clamp(26px, 4vmin, 42px);
      background: var(--case-bg);
      box-shadow: var(--shadow-soft), inset 0 0 0 1px rgba(99, 165, 198, 0.05);
      border: 2px solid var(--case-border);
      padding: clamp(28px, 3.6vmin, 48px);
      position: relative;
      overflow: hidden;
    }
    #console::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: radial-gradient(circle at 18% 22%, rgba(111, 232, 255, 0.18), transparent 55%),
        radial-gradient(circle at 82% 80%, rgba(250, 197, 96, 0.16), transparent 65%);
      pointer-events: none;
      mix-blend-mode: screen;
    }
    #grid {
      position: relative;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      grid-auto-rows: minmax(240px, 1fr);
      gap: var(--grid-gap);
      padding: clamp(12px, 2vmin, 28px);
    }
    prompt-controller {
      width: 100%;
      min-height: 0;
    }
    play-pause-button {
      position: relative;
      width: clamp(112px, 12vmin, 140px);
    }
    #controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      padding-inline: clamp(12px, 2vmin, 18px);
    }
    #buttons {
      display: flex;
      gap: 12px;
      align-items: center;
      padding: 8px 12px;
      border-radius: 999px;
      background: linear-gradient(145deg, rgba(17, 54, 78, 0.85), rgba(10, 36, 53, 0.9));
      border: 1px solid rgba(104, 173, 211, 0.35);
      box-shadow: inset 0 0 0 1px rgba(152, 220, 246, 0.08), 0 14px 34px rgba(0, 12, 20, 0.45);
    }
    button {
      font: inherit;
      font-weight: 600;
      cursor: pointer;
      letter-spacing: 0.08em;
      color: var(--accent-amber);
      background: linear-gradient(140deg, rgba(60, 176, 220, 0.12), rgba(247, 125, 221, 0.1));
      -webkit-font-smoothing: antialiased;
      border: 1px solid rgba(141, 213, 241, 0.35);
      border-radius: 999px;
      user-select: none;
      padding: 6px 18px;
      transition: transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
      &.active {
        background: linear-gradient(150deg, var(--accent-amber), var(--accent-cyan));
        color: #021017;
        box-shadow: 0 12px 24px rgba(111, 232, 255, 0.35);
      }
      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 14px 22px rgba(111, 232, 255, 0.24);
      }
    }
    select {
      font: inherit;
      padding: 6px 36px 6px 14px;
      background: rgba(9, 32, 48, 0.92);
      color: var(--text-primary);
      border-radius: 999px;
      border: 1px solid rgba(97, 164, 198, 0.3);
      outline: none;
      cursor: pointer;
      appearance: none;
      background-image: linear-gradient(45deg, transparent 40%, rgba(111, 232, 255, 0.8) 40%),
        linear-gradient(135deg, rgba(250, 197, 96, 0.9) 60%, transparent 60%);
      background-position: calc(100% - 22px) center, calc(100% - 14px) center;
      background-size: 8px 8px, 8px 8px;
      background-repeat: no-repeat;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
      &:focus {
        border-color: rgba(111, 232, 255, 0.6);
        box-shadow: 0 0 0 3px rgba(111, 232, 255, 0.2);
      }
    }
    @media (max-width: 1024px) {
      :host {
        padding: clamp(32px, 9vmin, 72px);
      }
      #console {
        padding: clamp(22px, 4.6vmin, 36px);
      }
    }
    @media (max-width: 720px) {
      #controls {
        justify-content: center;
        gap: 16px;
      }
      play-pause-button {
        margin-top: 8px;
      }
    }
  `;

  private prompts: Map<string, Prompt>;
  private midiDispatcher: MidiDispatcher;

  @property({ type: Boolean }) private showMidi = false;
  @property({ type: String }) public playbackState: PlaybackState = 'stopped';
  @state() public audioLevel = 0;
  @state() private midiInputIds: string[] = [];
  @state() private activeMidiInputId: string | null = null;

  @property({ type: Object })
  private filteredPrompts = new Set<string>();

  constructor(
    initialPrompts: Map<string, Prompt>,
  ) {
    super();
    this.prompts = initialPrompts;
    this.midiDispatcher = new MidiDispatcher();
  }

  private handlePromptChanged(e: CustomEvent<Prompt>) {
    const { promptId, text, weight, cc } = e.detail;
    const prompt = this.prompts.get(promptId);

    if (!prompt) {
      console.error('prompt not found', promptId);
      return;
    }

    prompt.text = text;
    prompt.weight = weight;
    prompt.cc = cc;

    const newPrompts = new Map(this.prompts);
    newPrompts.set(promptId, prompt);

    this.prompts = newPrompts;
    this.requestUpdate();

    this.dispatchEvent(
      new CustomEvent('prompts-changed', { detail: this.prompts }),
    );
  }

  private toggleShowMidi() {
    return this.setShowMidi(!this.showMidi);
  }

  public async setShowMidi(show: boolean) {
    this.showMidi = show;
    if (!this.showMidi) return;
    try {
      const inputIds = await this.midiDispatcher.getMidiAccess();
      this.midiInputIds = inputIds;
      this.activeMidiInputId = this.midiDispatcher.activeMidiInputId;
    } catch (e) {
      this.showMidi = false;
      this.dispatchEvent(new CustomEvent('error', {detail: e.message}));
    }
  }

  private handleMidiInputChange(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const newMidiId = selectElement.value;
    this.activeMidiInputId = newMidiId;
    this.midiDispatcher.activeMidiInputId = newMidiId;
  }

  private playPause() {
    this.dispatchEvent(new CustomEvent('play-pause'));
  }

  public addFilteredPrompt(prompt: string) {
    this.filteredPrompts = new Set([...this.filteredPrompts, prompt]);
  }

  override render() {
    return html`<h1>The Oscilloscope Deck</h1>
      <p class="subheading">
        Route your prompts through a retro waveform console. Dial the gain, trigger the mix, and jam.
      </p>
      <div id="console">
        <div id="controls">
          <div id="buttons">
            <button
              @click=${this.toggleShowMidi}
              class=${this.showMidi ? 'active' : ''}
              >MIDI</button
            >
            <select
              @change=${this.handleMidiInputChange}
              .value=${this.activeMidiInputId || ''}
              style=${this.showMidi ? '' : 'visibility: hidden'}>
              ${this.midiInputIds.length > 0
        ? this.midiInputIds.map(
          (id) =>
            html`<option value=${id}>
                    ${this.midiDispatcher.getDeviceName(id)}
                  </option>`,
        )
        : html`<option value="">No devices found</option>`}
            </select>
          </div>
          <play-pause-button .playbackState=${this.playbackState} @click=${this.playPause}></play-pause-button>
        </div>
        <div id="grid">${this.renderPrompts()}</div>
      </div>`;
  }

  private renderPrompts() {
    return [...this.prompts.values()].map((prompt) => {
      return html`<prompt-controller
        promptId=${prompt.promptId}
        ?filtered=${this.filteredPrompts.has(prompt.text)}
        cc=${prompt.cc}
        text=${prompt.text}
        weight=${prompt.weight}
        color=${prompt.color}
        .midiDispatcher=${this.midiDispatcher}
        .showCC=${this.showMidi}
        audioLevel=${this.audioLevel}
        @prompt-changed=${this.handlePromptChanged}>
      </prompt-controller>`;
    });
  }
}
