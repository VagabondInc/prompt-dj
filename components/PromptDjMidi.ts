/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

import { throttle } from '../utils/throttle';

import './PromptController';
import './PlayPauseButton';
import type { PlaybackState, Prompt } from '../types';
import { MidiDispatcher } from '../utils/MidiDispatcher';

/** The grid of prompt inputs. */
@customElement('prompt-dj-midi')
export class PromptDjMidi extends LitElement {
  static override styles = css`
    :host {
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      box-sizing: border-box;
      position: relative;
      padding: clamp(24px, 6vmin, 56px);
      gap: clamp(24px, 4vmin, 48px);
      color: var(--text-primary);
    }
    #background {
      will-change: background-image;
      position: absolute;
      height: 100%;
      width: 100%;
      z-index: -1;
      border-radius: clamp(18px, 4vmin, 36px);
      overflow: hidden;
      background: radial-gradient(circle at top left, rgba(143, 107, 255, 0.22), transparent 60%),
        radial-gradient(circle at bottom right, rgba(254, 109, 77, 0.18), transparent 60%),
        rgba(12, 14, 21, 0.93);
      box-shadow: var(--shadow-soft);
      backdrop-filter: blur(28px);
    }
    #background::after {
      content: '';
      position: absolute;
      inset: 0;
      border: 1px solid rgba(118, 126, 162, 0.22);
      border-radius: inherit;
      mix-blend-mode: lighten;
      opacity: 0.7;
    }
    #grid {
      width: min(1200px, 82vw);
      aspect-ratio: 1;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--grid-gap);
      padding: clamp(18px, 2.8vmin, 36px);
    }
    prompt-controller {
      width: 100%;
      min-height: 0;
    }
    play-pause-button {
      position: relative;
      width: clamp(120px, 14vmin, 160px);
    }
    #buttons {
      position: absolute;
      top: clamp(16px, 4vmin, 40px);
      left: clamp(18px, 4vmin, 44px);
      padding: 10px 12px;
      border-radius: 999px;
      display: flex;
      gap: 12px;
      align-items: center;
      background: rgba(20, 24, 34, 0.78);
      border: 1px solid rgba(118, 126, 162, 0.28);
      box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(18px);
    }
    button {
      font: inherit;
      font-weight: 600;
      cursor: pointer;
      color: var(--text-primary);
      background: linear-gradient(140deg, rgba(254, 109, 77, 0.16), rgba(254, 77, 146, 0.18));
      -webkit-font-smoothing: antialiased;
      border: 1px solid rgba(254, 109, 77, 0.45);
      border-radius: 999px;
      user-select: none;
      padding: 6px 16px;
      transition: transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
      &.active {
        background: linear-gradient(150deg, var(--accent-orange), var(--accent-pink));
        color: #0f0f15;
        box-shadow: 0 12px 24px rgba(254, 109, 77, 0.35);
      }
      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 14px 22px rgba(254, 109, 77, 0.24);
      }
    }
    select {
      font: inherit;
      padding: 6px 36px 6px 14px;
      background: rgba(20, 24, 34, 0.92);
      color: var(--text-primary);
      border-radius: 999px;
      border: 1px solid rgba(118, 126, 162, 0.28);
      outline: none;
      cursor: pointer;
      appearance: none;
      background-image: linear-gradient(45deg, transparent 40%, rgba(254, 77, 146, 0.9) 40%),
        linear-gradient(135deg, rgba(254, 109, 77, 0.9) 60%, transparent 60%);
      background-position: calc(100% - 22px) center, calc(100% - 14px) center;
      background-size: 8px 8px, 8px 8px;
      background-repeat: no-repeat;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
      &:focus {
        border-color: rgba(254, 109, 77, 0.6);
        box-shadow: 0 0 0 3px rgba(254, 109, 77, 0.2);
      }
    }
    @media (max-width: 1024px) {
      #grid {
        grid-template-columns: repeat(2, 1fr);
        width: min(90vw, 700px);
        aspect-ratio: unset;
      }
    }
    @media (max-width: 640px) {
      :host {
        padding: 24px;
      }
      #grid {
        grid-template-columns: 1fr;
      }
      #buttons {
        position: static;
        align-self: flex-start;
        margin-top: 0;
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

  /** Generates radial gradients for each prompt based on weight and color. */
  private readonly makeBackground = throttle(
    () => {
      const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

      const MAX_WEIGHT = 0.5;
      const MAX_ALPHA = 0.6;

      const bg: string[] = [];

      [...this.prompts.values()].forEach((p, i) => {
        const alphaPct = clamp01(p.weight / MAX_WEIGHT) * MAX_ALPHA;
        const alpha = Math.round(alphaPct * 0xff)
          .toString(16)
          .padStart(2, '0');

        const stop = p.weight / 2;
        const x = (i % 4) / 3;
        const y = Math.floor(i / 4) / 3;
        const s = `radial-gradient(circle at ${x * 100}% ${y * 100}%, ${p.color}${alpha} 0px, ${p.color}00 ${stop * 100}%)`;

        bg.push(s);
      });

      return bg.join(', ');
    },
    30, // don't re-render more than once every XXms
  );

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
    const bg = styleMap({
      backgroundImage: this.makeBackground(),
    });
    return html`<div id="background" style=${bg}></div>
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
      <div id="grid">${this.renderPrompts()}</div>
      <play-pause-button .playbackState=${this.playbackState} @click=${this.playPause}></play-pause-button>`;
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
