/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { css, html, LitElement } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

import './WeightKnob';
import type { WeightKnob } from './WeightKnob';

import type { MidiDispatcher } from '../utils/MidiDispatcher';
import type { Prompt, ControlChange } from '../types';

/** A single prompt input associated with a MIDI CC. */
@customElement('prompt-controller')
export class PromptController extends LitElement {
  static override styles = css`
    .prompt {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: clamp(16px, 2.6vmin, 24px);
      border-radius: clamp(18px, 2.8vmin, 24px);
      background: linear-gradient(160deg, rgba(34, 39, 56, 0.85), rgba(22, 25, 36, 0.94));
      position: relative;
      border: 1px solid rgba(118, 126, 162, 0.22);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04),
        0 22px 45px rgba(8, 10, 20, 0.65);
      gap: clamp(12px, 2vmin, 18px);
    }
    weight-knob {
      width: clamp(140px, 64%, 220px);
      flex-shrink: 0;
    }
    #midi {
      font-family: monospace;
      text-align: center;
      font-size: clamp(11px, 1.4vmin, 14px);
      border: 1px solid rgba(118, 126, 162, 0.4);
      border-radius: 999px;
      padding: 6px 14px;
      color: var(--text-secondary);
      background: rgba(16, 20, 30, 0.85);
      cursor: pointer;
      visibility: hidden;
      user-select: none;
      margin-top: 0;
      transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease,
        box-shadow 0.2s ease;
      .learn-mode & {
        color: var(--accent-orange);
        border-color: rgba(255, 107, 61, 0.6);
        background: rgba(255, 107, 61, 0.08);
        box-shadow: 0 0 0 3px rgba(255, 107, 61, 0.18);
      }
      .show-cc & {
        visibility: visible;
      }
    }
    #text {
      font-weight: 600;
      font-size: clamp(16px, 1.9vmin, 22px);
      max-width: clamp(180px, 18vmin, 220px);
      min-width: 2vmin;
      padding: 6px 16px;
      flex-shrink: 0;
      border-radius: 14px;
      text-align: center;
      white-space: pre;
      overflow: hidden;
      border: 1px solid rgba(118, 126, 162, 0.24);
      outline: none;
      -webkit-font-smoothing: antialiased;
      background: rgba(15, 18, 26, 0.9);
      color: var(--text-primary);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02),
        0 12px 24px rgba(0, 0, 0, 0.45);
      &:not(:focus) {
        text-overflow: ellipsis;
      }
      &:focus {
        border-color: rgba(255, 77, 146, 0.7);
        box-shadow: 0 0 0 3px rgba(255, 77, 146, 0.25);
      }
    }
    :host([filtered]) {
      weight-knob { 
        opacity: 0.5;
      }
      #text {
        background: rgba(255, 78, 78, 0.2);
        border-color: rgba(255, 92, 67, 0.7);
        z-index: 1;
        color: #ff9f8f;
      }
    }
    @media only screen and (max-width: 600px) {
      #text {
        font-size: clamp(16px, 2.7vmin, 20px);
      }
      weight-knob {
        width: min(65%, 200px);
      }
    }
  `;

  @property({ type: String }) promptId = '';
  @property({ type: String }) text = '';
  @property({ type: Number }) weight = 0;
  @property({ type: String }) color = '';
  @property({ type: Boolean, reflect: true }) filtered = false;

  @property({ type: Number }) cc = 0;
  @property({ type: Number }) channel = 0; // Not currently used

  @property({ type: Boolean }) learnMode = false;
  @property({ type: Boolean }) showCC = false;

  @query('weight-knob') private weightInput!: WeightKnob;
  @query('#text') private textInput!: HTMLInputElement;

  @property({ type: Object })
  midiDispatcher: MidiDispatcher | null = null;

  @property({ type: Number }) audioLevel = 0;

  private lastValidText!: string;

  override connectedCallback() {
    super.connectedCallback();
    this.midiDispatcher?.addEventListener('cc-message', (e: Event) => {
      const customEvent = e as CustomEvent<ControlChange>;
      const { channel, cc, value } = customEvent.detail;
      if (this.learnMode) {
        this.cc = cc;
        this.channel = channel;
        this.learnMode = false;
        this.dispatchPromptChange();
      } else if (cc === this.cc) {
        this.weight = (value / 127) * 2;
        this.dispatchPromptChange();
      }
    });
  }

  override firstUpdated() {
    // contenteditable is applied to textInput so we can "shrink-wrap" to text width
    // It's set here and not render() because Lit doesn't believe it's a valid attribute.
    this.textInput.setAttribute('contenteditable', 'plaintext-only');

    // contenteditable will do weird things if this is part of the template.
    this.textInput.textContent = this.text;
    this.lastValidText = this.text;
  }

  update(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('showCC') && !this.showCC) {
      this.learnMode = false;
    }
    if (changedProperties.has('text') && this.textInput) {
      this.textInput.textContent = this.text;
    }
    super.update(changedProperties);
  }

  private dispatchPromptChange() {
    this.dispatchEvent(
      new CustomEvent<Prompt>('prompt-changed', {
        detail: {
          promptId: this.promptId,
          text: this.text,
          weight: this.weight,
          cc: this.cc,
          color: this.color,
        },
      }),
    );
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.textInput.blur();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      this.resetText();
      this.textInput.blur();
    }
  }

  private resetText() {
    this.text = this.lastValidText;
    this.textInput.textContent = this.lastValidText;
  }

  private async updateText() {
    const newText = this.textInput.textContent?.trim();
    if (!newText) {
      this.resetText();
    } else {
      this.text = newText;
      this.lastValidText = newText;
    }
    this.dispatchPromptChange();
    // Show the prompt from the beginning if it's cropped
    this.textInput.scrollLeft = 0;
  }

  private onFocus() {
    // .select() for contenteditable doesn't work.
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(this.textInput);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  private updateWeight() {
    this.weight = this.weightInput.value;
    this.dispatchPromptChange();
  }

  private toggleLearnMode() {
    this.learnMode = !this.learnMode;
  }

  override render() {
    const classes = classMap({
      'prompt': true,
      'learn-mode': this.learnMode,
      'show-cc': this.showCC,
    });
    return html`<div class=${classes}>
      <weight-knob
        id="weight"
        value=${this.weight}
        color=${this.filtered ? '#888' : this.color}
        audioLevel=${this.filtered ? 0 : this.audioLevel}
        @input=${this.updateWeight}></weight-knob>
      <span
        id="text"
        spellcheck="false"
        @focus=${this.onFocus}
        @keydown=${this.onKeyDown}
        @blur=${this.updateText}></span>
      <div id="midi" @click=${this.toggleLearnMode}>
        ${this.learnMode ? 'Learn' : `CC:${this.cc}`}
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'prompt-controller': PromptController;
  }
} 
