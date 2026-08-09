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
   * Renders the visual garden plot grid
   * @param {string} containerId DOM element ID
   * @param {Array} plants Array of SRS records
   */
  render(containerId, plants) {
    this.containerId = containerId;
    this.plants = plants;
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!plants || plants.length === 0) {
      container.innerHTML = this.getEmptyGardenStateHTML();
      return;
    }

    let html = `<div class="garden-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 1.25rem; width: 100%; padding: 1rem;">`;

    plants.forEach(plant => {
      const stateInfo = this.getPlantState(plant);
      const isDue = plant.next_review_date <= new Date().toISOString().split('T')[0];
      
      html += `
        <div class="garden-plot-card glass-panel plant-state-${stateInfo.status} ${isDue ? 'plant-is-due' : ''}" 
             data-id="${plant.vocab_id}" 
             style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1.25rem; border-radius: 16px; cursor: pointer; position: relative; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: 1px solid rgba(255, 255, 255, 0.08); background: rgba(255,255,255,0.03);"
             onmouseover="this.style.transform='scale(1.05) translateY(-5px)'; this.style.borderColor='var(--primary)'; this.style.boxShadow='0 8px 24px rgba(0, 245, 212, 0.15)';"
             onmouseout="this.style.transform='scale(1) translateY(0)'; this.style.borderColor='rgba(255,255,255,0.08)'; this.style.boxShadow='none';">
          
          <!-- State Badge -->
          <span class="plant-badge ${stateInfo.badgeClass}" style="position: absolute; top: -8px; font-size: 0.65rem; font-weight: bold; padding: 2px 8px; border-radius: 20px; z-index: 2;">
            ${stateInfo.label}
          </span>
          
          <!-- Visual Plant representation -->
          <div class="plant-visual-wrapper" style="font-size: 3rem; margin-bottom: 0.5rem; transition: transform 0.3s ease; transform-origin: bottom center;">
            ${stateInfo.emoji}
          </div>
          
          <!-- Character Display -->
          <div class="plant-character" style="font-size: 1.5rem; font-weight: bold; margin-bottom: 0.15rem; color: #fff;">
            ${plant.character}
          </div>
          
          <!-- Pronunciation Hint -->
          <div class="plant-pinyin" style="font-size: 0.75rem; color: var(--text-secondary);">
            ${plant.pinyin || ''}
          </div>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;

    // Attach click listeners to cards
    const cards = container.querySelectorAll('.garden-plot-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const vocabId = parseInt(card.getAttribute('data-id'));
        const plant = this.plants.find(p => p.vocab_id === vocabId);
        if (plant) {
          eventBus.emit('garden:plant-clicked', plant);
        }
      });
    });
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
