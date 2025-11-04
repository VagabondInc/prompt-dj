/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

/** Maps prompt weight to halo size. */
const MIN_HALO_SCALE = 1;
const MAX_HALO_SCALE = 2;

/** The amount of scale to add to the halo based on audio level. */
const HALO_LEVEL_MODIFIER = 1;

/** A knob for adjusting and visualizing prompt weight. */
@customElement('weight-knob')
export class WeightKnob extends LitElement {
  static override styles = css`
    :host {
      cursor: grab;
      position: relative;
      width: 100%;
      aspect-ratio: 1;
      flex-shrink: 0;
      touch-action: none;
      border-radius: 50%;
      background: radial-gradient(circle at 50% 25%, rgba(255, 255, 255, 0.25) 0%, rgba(70, 94, 108, 0.55) 35%, rgba(10, 20, 28, 0.92) 80%);
      box-shadow:
        inset 0 2px 4px rgba(255, 255, 255, 0.35),
        inset 0 -10px 22px rgba(0, 0, 0, 0.55),
        0 12px 26px rgba(0, 10, 16, 0.45);
    }
    svg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
    #halo {
      position: absolute;
      z-index: -1;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      filter: blur(18px);
      opacity: 0.75;
      mix-blend-mode: screen;
      transform: scale(1.8);
      will-change: transform;
    }
  `;

  @property({ type: Number }) value = 0;
  @property({ type: String }) color = '#000';
  @property({ type: Number }) audioLevel = 0;

  private dragStartPos = 0;
  private dragStartValue = 0;

  constructor() {
    super();
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
  }

  private handlePointerDown(e: PointerEvent) {
    e.preventDefault();
    this.dragStartPos = e.clientY;
    this.dragStartValue = this.value;
    document.body.classList.add('dragging');
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
  }

  private handlePointerMove(e: PointerEvent) {
    const delta = this.dragStartPos - e.clientY;
    this.value = this.dragStartValue + delta * 0.01;
    this.value = Math.max(0, Math.min(2, this.value));
    this.dispatchEvent(new CustomEvent<number>('input', { detail: this.value }));
  }

  private handlePointerUp() {
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    document.body.classList.remove('dragging');
  }

  private handleWheel(e: WheelEvent) {
    const delta = e.deltaY;
    this.value = this.value + delta * -0.0025;
    this.value = Math.max(0, Math.min(2, this.value));
    this.dispatchEvent(new CustomEvent<number>('input', { detail: this.value }));
  }

  private describeArc(
    centerX: number,
    centerY: number,
    startAngle: number,
    endAngle: number,
    radius: number,
  ): string {
    const startX = centerX + radius * Math.cos(startAngle);
    const startY = centerY + radius * Math.sin(startAngle);
    const endX = centerX + radius * Math.cos(endAngle);
    const endY = centerY + radius * Math.sin(endAngle);

    const largeArcFlag = endAngle - startAngle <= Math.PI ? '0' : '1';

    return (
      `M ${startX} ${startY}` +
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`
    );
  }

  override render() {
    const rotationRange = Math.PI * 2 * 0.75;
    const minRot = -rotationRange / 2 - Math.PI / 2;
    const maxRot = rotationRange / 2 - Math.PI / 2;
    const rot = minRot + (this.value / 2) * (maxRot - minRot);
    const dotStyle = styleMap({
      transform: `translate(40px, 40px) rotate(${rot}rad)`,
    });

    let scale = (this.value / 2) * (MAX_HALO_SCALE - MIN_HALO_SCALE);
    scale += MIN_HALO_SCALE;
    scale += this.audioLevel * HALO_LEVEL_MODIFIER;

    const haloStyle = styleMap({
      display: this.value > 0 ? 'block' : 'none',
      background: `radial-gradient(circle, ${this.color} 0%, transparent 68%)`,
      transform: `scale(${scale})`,
    });

    const idleStroke = 'rgba(70, 108, 138, 0.32)';
    const innerStroke = 'rgba(118, 152, 178, 0.18)';
    const activeStroke = this.color || '#f0d87d';

    return html`
      <div id="halo" style=${haloStyle}></div>
      ${this.renderStaticSvg(idleStroke, innerStroke)}
      <svg
        viewBox="0 0 80 80"
        @pointerdown=${this.handlePointerDown}
        @wheel=${this.handleWheel}>
        <defs>
          <linearGradient id="progressStroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color=${activeStroke} stop-opacity="0.25" />
              <stop offset="35%" stop-color=${activeStroke} stop-opacity="1" />
              <stop offset="100%" stop-color=${activeStroke} stop-opacity="0.6" />
            </linearGradient>
          </defs>
        <g style=${dotStyle}>
          <circle cx="12" cy="0" r="4" fill=${activeStroke} />
          <circle cx="12" cy="0" r="6.5" fill="rgba(10, 12, 18, 0.9)" stroke=${activeStroke} stroke-width="1.2" />
        </g>
        <path
          d=${this.describeArc(40, 40, minRot, maxRot, 30)}
          fill="none"
          stroke=${idleStroke}
          stroke-width="4"
          stroke-linecap="round" />
        <path
          d=${this.describeArc(40, 40, minRot, rot, 30)}
          fill="none"
          stroke="url(#progressStroke)"
          stroke-width="4"
          stroke-linecap="round"
          stroke-linejoin="round" />
      </svg>
    `;
  }
  
  private renderStaticSvg(rimStroke: string, innerStroke: string) { 
    return html`<svg viewBox="0 0 80 80" aria-hidden="true">
      <defs>
        <radialGradient id="knob-base" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.85)" />
          <stop offset="55%" stop-color="rgba(166, 176, 188, 0.9)" />
          <stop offset="72%" stop-color="rgba(74, 92, 108, 0.8)" />
          <stop offset="100%" stop-color="rgba(26, 40, 52, 0.9)" />
        </radialGradient>
        <radialGradient id="knob-highlight" cx="35%" cy="25%" r="65%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.35)" />
          <stop offset="45%" stop-color="rgba(255,255,255,0.08)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <circle cx="40" cy="40" r="38.5" fill="rgba(21, 36, 48, 0.95)" stroke=${rimStroke} stroke-width="1.2" />
      <circle cx="40" cy="40" r="34" fill="url(#knob-base)" stroke=${rimStroke} stroke-width="1.1" />
      ${[0, 30, 60, 90, 120, 150].map(
        (deg) =>
          html`<line
            x1="40"
            y1="10"
            x2="40"
            y2="16"
            stroke="rgba(50,65,78,0.85)"
            stroke-width="1.5"
            transform="rotate(${deg} 40 40)" />`,
      )}
      <circle cx="40" cy="40" r="26" fill="rgba(34, 49, 60, 0.88)" stroke=${innerStroke} stroke-width="1.2" />
      <circle cx="40" cy="40" r="20.5" fill="rgba(17, 26, 34, 0.95)" stroke="rgba(165, 188, 204, 0.18)" stroke-width="1" />
      <circle cx="40" cy="32" r="14" fill="url(#knob-highlight)" />
      <circle cx="40" cy="40" r="9.5" fill="rgba(12, 18, 24, 0.95)" stroke="rgba(180, 192, 205, 0.22)" stroke-width="0.8" />
    </svg>`
  }

}

declare global {
  interface HTMLElementTagNameMap {
    'weight-knob': WeightKnob;
  }
}
