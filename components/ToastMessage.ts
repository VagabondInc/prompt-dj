/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

@customElement('toast-message')
export class ToastMessage extends LitElement {
  static override styles = css`
    .toast {
      line-height: 1.6;
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(18, 22, 32, 0.92);
      color: var(--text-primary, #f5f7ff);
      padding: 18px 22px;
      border-radius: 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      width: min(480px, 82vw);
      transition: transform 0.5s cubic-bezier(0.19, 1, 0.22, 1);
      border: 1px solid rgba(118, 126, 162, 0.3);
      box-shadow: 0 28px 50px rgba(8, 10, 20, 0.55);
      backdrop-filter: blur(16px);
      text-wrap: pretty;
    }
    button {
      border-radius: 50%;
      aspect-ratio: 1;
      width: 32px;
      border: none;
      color: #0e1017;
      cursor: pointer;
      background: linear-gradient(140deg, var(--accent-orange, #ff6b3d), var(--accent-pink, #fe4d92));
      font-weight: 600;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      box-shadow: 0 12px 20px rgba(254, 77, 146, 0.25);
      display: grid;
      place-items: center;
    }
    button:hover {
      transform: translateY(-1px) scale(1.05);
    }
    button:active {
      transform: scale(0.95);
    }
    .toast:not(.showing) {
      transition-duration: 1s;
      transform: translate(-50%, -200%);
    }
    a {
      color: var(--accent-pink, #fe4d92);
      text-decoration: underline;
    }
  `;

  @property({ type: String }) message = '';
  @property({ type: Boolean }) showing = false;

  private renderMessageWithLinks() {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = this.message.split( urlRegex );
    return parts.map( ( part, i ) => {
      if ( i % 2 === 0 ) return part;
      return html`<a href=${part} target="_blank" rel="noopener">${part}</a>`;
    } );
  }

  override render() {
    return html`<div class=${classMap({ showing: this.showing, toast: true })}>
      <div class="message">${this.renderMessageWithLinks()}</div>
      <button @click=${this.hide}>✕</button>
    </div>`;
  }

  show(message: string) {
    this.showing = true;
    this.message = message;
  }

  hide() {
    this.showing = false;
  }

}

declare global {
  interface HTMLElementTagNameMap {
    'toast-message': ToastMessage
  }
}
