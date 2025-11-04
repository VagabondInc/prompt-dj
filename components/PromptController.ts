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
      padding: clamp(20px, 2.8vmin, 28px);
      border-radius: clamp(20px, 3.2vmin, 28px);
      position: relative;
      overflow: hidden;
      border: 1px solid rgba(80, 90, 130, 0.25);
      background: linear-gradient(160deg, rgba(33, 38, 56, 0.95) 0%, rgba(18, 20, 32, 0.98) 64%, rgba(14, 18, 30, 1) 100%);
      box-shadow:
        inset 0 0 0 1px rgba(255, 255, 255, 0.04),
        0 40px 80px rgba(4, 6, 12, 0.65);
      gap: clamp(14px, 2.2vmin, 20px);
      isolation: isolate;
    }
    .prompt::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 20%, rgba(122, 140, 255, 0.22), transparent 55%);
      mix-blend-mode: screen;
      pointer-events: none;
      z-index: -1;
    }
    weight-knob {
      width: clamp(120px, 52%, 176px);
      max-width: 176px;
      flex-shrink: 0;
    }
    #midi {
      position: absolute;
      top: clamp(12px, 1.8vmin, 16px);
      left: clamp(16px, 2.6vmin, 22px);
      font-family: 'Inter', var(--font-family);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      font-size: clamp(10px, 1.2vmin, 11px);
      border-radius: 999px;
      padding: 6px 14px;
      color: rgba(223, 226, 255, 0.72);
      background: linear-gradient(120deg, rgba(94, 66, 146, 0.48), rgba(56, 25, 82, 0.68));
      cursor: pointer;
      visibility: hidden;
      user-select: none;
      transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease,
        box-shadow 0.2s ease;
      border: 1px solid rgba(147, 117, 231, 0.4);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
      .learn-mode & {
        color: #ffe0c2;
        border-color: rgba(255, 182, 117, 0.6);
        background: linear-gradient(120deg, rgba(255, 146, 86, 0.45), rgba(255, 102, 129, 0.55));
        box-shadow: 0 0 0 3px rgba(255, 155, 100, 0.24);
      }
      .show-cc & {
        visibility: visible;
      }
    }
    #text {
      font-weight: 600;
      font-size: clamp(14px, 1.6vmin, 18px);
      max-width: clamp(156px, 17vmin, 200px);
      min-width: 2vmin;
      padding: 8px 18px;
      flex-shrink: 0;
      border-radius: 999px;
      text-align: center;
      white-space: pre;
      overflow: hidden;
      border: none;
      outline: none;
      -webkit-font-smoothing: antialiased;
      background: linear-gradient(160deg, rgba(17, 19, 30, 0.85), rgba(36, 40, 58, 0.9));
      color: var(--text-primary);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.07),
        0 14px 26px rgba(4, 6, 12, 0.45);
      &:not(:focus) {
        text-overflow: ellipsis;
      }
      &:focus {
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
