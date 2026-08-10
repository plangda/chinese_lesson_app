/**
 * Garden Module
 * Handles rendering the interactive visual garden plot layout, visual states, and decay logic
 */

import { eventBus } from './event-bus.js';

export class GardenRenderer {
  constructor() {
    this.containerId = 'srs-arena-container'; // Default fallback, will target main dashboard container in Phase 2
    this.plants = [];
  }

  /**
   * Determine the visual state of a plant based on SRS parameters
   * @param {Object} plant 
   * @returns {Object} { status: string, emoji: string, badgeClass: string, label: string }
   */
  getPlantState(plant) {
    const stage = plant.mastery_stage || 1;
    const interval = plant.interval_days || 1;
    const nextReview = new Date(plant.next_review_date);
    const today = new Date();
    
    // Check if overdue (thirsty/wilting)
    const isOverdue = nextReview <= today;
    const isWilting = plant.times_forgotten >= 3;

    if (isWilting && isOverdue) {
      return {
        status: 'wilting',
        emoji: '🥀',
        badgeClass: 'badge-error',
        label: 'Wilting (Needs Care)'
      };
    } else if (isOverdue) {
      return {
        status: 'thirsty',
        emoji: '🍂',
        badgeClass: 'badge-warning',
        label: 'Thirsty (Due)'
      };
    }

    if (interval >= 30) {
      return {
        status: 'evergreen',
        emoji: '🌳',
        badgeClass: 'badge-success',
        label: 'Golden Evergreen'
      };
    }

    if (stage === 4) {
      return {
        status: 'harvest',
        emoji: '🧺',
        badgeClass: 'badge-accent',
        label: 'Ready to Harvest'
      };
    }

    const stages = {
      1: { status: 'seed', emoji: '🌱', badgeClass: 'badge-primary', label: 'Seed' },
      2: { status: 'sprout', emoji: '🌿', badgeClass: 'badge-secondary', label: 'Sprout' },
      3: { status: 'flower', emoji: '🌻', badgeClass: 'badge-info', label: 'Blooming' }
    };

    return stages[stage] || stages[1];
  }

  /**
   * Renders the interactive garden summary dashboard
   * @param {string} containerId DOM element ID of the container
   * @param {Array} plants Array of SRS plant records from /api/srs/garden
   */
  render(containerId, plants) {
    this.containerId = containerId;
    this.plants = plants;
    const container = document.getElementById(containerId);
    if (!container) return;

    // Empty state — user has no planted words yet
    if (!plants || plants.length === 0) {
      container.innerHTML = this.getEmptyGardenStateHTML();
      return;
    }

    // Count plants by visual stage
    const counts = { seed: 0, sprout: 0, flower: 0, tree: 0, thirsty: 0, wilting: 0 };
    plants.forEach(p => {
      const s = this.getPlantState(p);
      if (s.status === 'wilting') counts.wilting++;
      else if (s.status === 'thirsty') counts.thirsty++;
      else if (s.status === 'evergreen') counts.tree++;
      else if (s.status === 'harvest' || s.status === 'flower') counts.flower++;
      else if (s.status === 'sprout') counts.sprout++;
      else counts.seed++;
    });

    const dueCount = counts.thirsty + counts.wilting;
    const plotPlants = plants.slice(0, 30); // cap at 30 tiles to avoid scroll exhaustion

    // Build the emoji tile grid (each tile = one planted word, shows emoji by growth stage)
    const tilesHtml = plotPlants.map(plant => {
      const s = this.getPlantState(plant);
      const meaning = plant.meaning || '';
      return `
        <div class="garden-tile"
             title="${plant.character} (${plant.pinyin || ''}) — ${meaning}"
             style="font-size: 1.9rem; cursor: default; user-select: none; transition: transform 0.2s; line-height: 1;"
             onmouseover="this.style.transform='scale(1.3)'"
             onmouseout="this.style.transform='scale(1)'">
          ${s.emoji}
        </div>`;
    }).join('');

    const overflowMsg = plants.length > 30
      ? `<div style="color:var(--text-secondary);font-size:0.8rem;text-align:center;margin-top:0.5rem;">
           +${plants.length - 30} more words in your garden
         </div>`
      : '';

    // Helper: safely call window.t() — falls back to English if i18n not loaded yet
    const tx = (key, fallback) => (window.t ? window.t(key) : fallback);

    container.innerHTML = `
      <!-- Stage count badges row -->
      <div class="garden-stage-badges" style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1rem;">
        <span style="background:rgba(0,245,212,0.12);color:var(--success);border:1px solid var(--success);border-radius:20px;padding:4px 12px;font-size:0.8rem;font-weight:bold;">
          🌱 ${counts.seed} ${tx('stage_seeds','Seeds')}
        </span>
        <span style="background:rgba(100,200,100,0.12);color:#6bc96b;border:1px solid #6bc96b;border-radius:20px;padding:4px 12px;font-size:0.8rem;font-weight:bold;">
          🌿 ${counts.sprout} ${tx('stage_sprouts','Sprouts')}
        </span>
        <span style="background:rgba(255,200,0,0.12);color:#ffd700;border:1px solid #ffd700;border-radius:20px;padding:4px 12px;font-size:0.8rem;font-weight:bold;">
          🌻 ${counts.flower} ${tx('stage_flowers','Flowers')}
        </span>
        <span style="background:rgba(46,196,182,0.12);color:var(--accent);border:1px solid var(--accent);border-radius:20px;padding:4px 12px;font-size:0.8rem;font-weight:bold;">
          🌳 ${counts.tree} ${tx('stage_trees','Trees')}
        </span>
      </div>

      <!-- Emoji tile grid -->
      <div class="garden-tile-grid"
           style="display:flex;flex-wrap:wrap;gap:0.6rem;min-height:80px;padding:0.75rem;background:rgba(0,0,0,0.08);border-radius:12px;margin-bottom:0.5rem;">
        ${tilesHtml}
      </div>
      ${overflowMsg}

      <!-- Due status label -->
      <div style="margin:1rem 0 0.5rem;font-size:0.85rem;">
        ${dueCount > 0
          ? `<span style="color:var(--accent);font-weight:bold;">💧 ${dueCount} ${tx('thirsty_plants_count','words due for watering')}</span>`
          : `<span style="color:var(--success);">✅ ${tx('srs_empty_due','All plants watered today!')}</span>`}
      </div>

      <!-- CTA Buttons -->
      <div style="display:flex;flex-direction:column;gap:0.6rem;">
        ${dueCount > 0 ? `
        <button id="garden-water-due-btn" class="btn btn-primary"
                style="padding:0.75rem;font-weight:bold;border-radius:24px;box-shadow:0 4px 15px rgba(0,245,212,0.25);"
                onclick="window.startSrsSession('normal')">
          💧 ${tx('btn_water_plants','Water Thirsty Plants (3-Min Review)')}
        </button>` : ''}
        <button id="garden-full-review-btn" class="btn btn-secondary"
                style="padding:0.65rem;border-radius:24px;"
                onclick="window.startSrsSession('full')">
          ${tx('btn_full_review','⚔️ Full Garden Review')}
        </button>
      </div>
    `;
  }

  /**
   * Generates HTML for empty onboarding state
   */
  getEmptyGardenStateHTML() {
    return `
      <div class="empty-garden-onboarding glass-panel" style="text-align: center; padding: 3rem 2rem; border-radius: 20px; max-width: 500px; margin: 2rem auto; border: 1px dashed rgba(255,255,255,0.15); background: rgba(0,0,0,0.1);">
        <div style="font-size: 4rem; margin-bottom: 1.5rem; animation: bounce 2s infinite;">🏜️</div>
        <h3 style="font-family: var(--font-serif); margin-bottom: 0.75rem; color: var(--primary);" data-i18n="garden_empty_title">Your Garden is Empty</h3>
        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 2rem;" data-i18n="garden_empty_desc">You haven't planted any vocabulary seeds yet! Complete lessons or take a placement test to populate your garden plots.</p>
        <div style="display: flex; flex-direction: column; gap: 0.75rem; align-items: center;">
          <button id="garden-onboard-lesson-btn" class="btn btn-primary" style="padding: 0.75rem 2rem; width: 80%; font-weight: bold;" onclick="window.startOnboardingLesson()">
            ▶️ Start Day 1 Lesson
          </button>
          <button id="garden-onboard-pretest-btn" class="btn btn-secondary" style="padding: 0.75rem 2rem; width: 80%;" onclick="window.startPlacementTest()">
            📝 Take Placement Test
          </button>
        </div>
      </div>
    `;
  }
}

export const gardenRenderer = new GardenRenderer();
