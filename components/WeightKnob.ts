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
      background: radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.08), rgba(20, 24, 34, 0.95));
      box-shadow: inset 0 2px 6px rgba(255, 255, 255, 0.05), 0 18px 45px rgba(6, 8, 15, 0.6);
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
      filter: blur(20px);
      opacity: 0.9;
      mix-blend-mode: screen;
      transform: scale(2);
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
      background: `radial-gradient(circle, ${this.color} 0%, transparent 70%)`,
      transform: `scale(${scale})`,
    });

    const idleStroke = 'rgba(118, 126, 162, 0.35)';
    const activeStroke = this.color || 'var(--accent-purple, #8f6bff)';

    return html`
      <div id="halo" style=${haloStyle}></div>
      <!-- Static SVG elements -->
      ${this.renderStaticSvg()}
      <!-- SVG elements that move, separated to limit redraws -->
      <svg
        viewBox="0 0 80 80"
        @pointerdown=${this.handlePointerDown}
        @wheel=${this.handleWheel}>
        <g style=${dotStyle}>
          <circle cx="14" cy="0" r="3" fill=${activeStroke} />
          <circle cx="14" cy="0" r="6" fill="rgba(10, 12, 18, 0.85)" stroke=${activeStroke} stroke-width="1.2" />
        </g>
        <path
          d=${this.describeArc(40, 40, minRot, maxRot, 34.5)}
          fill="none"
          stroke=${idleStroke}
          stroke-width="3"
          stroke-linecap="round" />
        <path
          d=${this.describeArc(40, 40, minRot, rot, 34.5)}
          fill="none"
          stroke=${activeStroke}
          stroke-width="3"
          stroke-linecap="round" />
      </svg>
    `;
  }
  
  private renderStaticSvg() { 
    return html`<svg viewBox="0 0 80 80" aria-hidden="true">
      <defs>
        <radialGradient id="knob-base" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#2a3040" />
          <stop offset="70%" stop-color="#171c27" />
          <stop offset="100%" stop-color="#131722" />
        </radialGradient>
        <radialGradient id="knob-highlight" cx="30%" cy="25%" r="60%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.35)" />
          <stop offset="60%" stop-color="rgba(255,255,255,0.05)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <circle cx="40" cy="40" r="39" fill="rgba(14, 17, 24, 0.92)" stroke="rgba(118, 126, 162, 0.25)" stroke-width="1.4" />
      <circle cx="40" cy="40" r="31" fill="url(#knob-base)" stroke="rgba(75, 82, 112, 0.3)" stroke-width="1.2" />
      <circle cx="40" cy="40" r="24" fill="rgba(18, 21, 32, 0.85)" stroke="rgba(102, 111, 143, 0.4)" stroke-width="1" />
      <circle cx="40" cy="34" r="14" fill="url(#knob-highlight)" />
      <circle cx="40" cy="40" r="10" fill="rgba(12, 14, 22, 0.88)" stroke="rgba(122, 130, 160, 0.35)" stroke-width="1" />
    </svg>`
  }

}

declare global {
  interface HTMLElementTagNameMap {
    'weight-knob': WeightKnob;
  }
}
