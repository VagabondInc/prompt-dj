/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { svg, css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { PlaybackState } from '../types';

@customElement('play-pause-button')
export class PlayPauseButton extends LitElement {

  @property({ type: String }) playbackState: PlaybackState = 'stopped';

  static override styles = css`
    :host {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      filter: drop-shadow(0 28px 38px rgba(0, 0, 0, 0.55));
    }
    :host(:hover) svg {
      transform: scale(1.2);
    }
    svg {
      width: 100%;
      height: 100%;
      transition: transform 0.4s cubic-bezier(0.25, 1.56, 0.32, 0.99);
    }
    .hitbox {
      pointer-events: all;
      position: absolute;
      width: 70%;
      aspect-ratio: 1;
      top: 12%;
      border-radius: 50%;
      cursor: pointer;
    }
    .loader {
      stroke: var(--text-primary, #f5f7ff);
      stroke-width: 4;
      stroke-linecap: round;
      stroke-dasharray: 140;
      stroke-dashoffset: 100;
      animation: spin linear 1s infinite;
      transform-origin: center;
      transform-box: fill-box;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(359deg); }
    }
  `;

  private renderSvg() {
    return html` <svg
      width="160"
      height="160"
      viewBox="0 0 160 160"
      xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="outerGlow" cx="50%" cy="20%" r="70%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.25)" />
          <stop offset="70%" stop-color="rgba(255,255,255,0)" />
        </radialGradient>
        <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="var(--accent-orange, #ff6b3d)" />
          <stop offset="100%" stop-color="var(--accent-pink, #fe4d92)" />
        </linearGradient>
      </defs>
      <g transform="translate(12, 10)">
        <circle
          cx="68"
          cy="70"
          r="67"
          fill="rgba(12, 15, 22, 0.9)"
          stroke="rgba(94, 103, 140, 0.35)"
          stroke-width="1.5" />
        <circle cx="68" cy="64" r="56" fill="url(#outerGlow)" opacity="0.45" />
        <circle
          cx="68"
          cy="70"
          r="50"
          fill="rgba(16, 20, 30, 0.95)"
          stroke="rgba(122, 130, 160, 0.3)"
          stroke-width="1.2" />
        <circle cx="68" cy="70" r="40" fill="url(#accentGradient)" />
        <circle
          cx="68"
          cy="70"
          r="34"
          fill="rgba(12, 14, 22, 0.88)"
          stroke="rgba(255, 255, 255, 0.06)"
          stroke-width="2" />
      </g>
      ${this.renderIcon()}
    </svg>`;
  }

  private renderPause() {
    return svg`<g transform="translate(80 80)">
      <rect x="-18" y="-24" width="12" height="48" rx="4" fill="#0f1118" opacity="0.9" />
      <rect x="6" y="-24" width="12" height="48" rx="4" fill="#0f1118" opacity="0.9" />
    </g>`;
  }

  private renderPlay() {
    return svg`<g transform="translate(80 80)">
      <polygon points="-18,-26 22,0 -18,26" fill="#0f1118" opacity="0.9" />
    </g>`;
  }

  private renderLoading() {
    return svg`<g transform="translate(80 80)">
      <circle class="loader" cx="0" cy="0" r="28" fill="none" />
    </g>`;
  }

  private renderIcon() {
    if (this.playbackState === 'playing') {
      return this.renderPause();
    } else if (this.playbackState === 'loading') {
      return this.renderLoading();
    } else {
      return this.renderPlay();
    }
  }

  override render() {
    return html`${this.renderSvg()}<div class="hitbox"></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'play-pause-button': PlayPauseButton
  }
}
