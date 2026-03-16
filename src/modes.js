/**
 * Visual Modes — switches post-processing shaders
 */
import { createNVGStage } from './shaders/nightVision.js';
import { createFLIRStage } from './shaders/flir.js';
import { createCRTStage } from './shaders/crt.js';

let viewer = null;
let currentMode = 'normal';
let stages = {};

export function initModes(cesiumViewer) {
    viewer = cesiumViewer;

    // Pre-create shader stages
    stages.nvg = createNVGStage();
    stages.flir = createFLIRStage();
    stages.crt = createCRTStage();

    // Add all stages (disabled)
    for (const [name, stage] of Object.entries(stages)) {
        stage.enabled = false;
        viewer.scene.postProcessStages.add(stage);
    }

    // Bind mode buttons
    const buttons = document.querySelectorAll('.mode-btn');
    buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            setMode(mode);
            buttons.forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

export function setMode(mode) {
    // Disable all
    for (const stage of Object.values(stages)) {
        stage.enabled = false;
    }

    // Enable selected
    if (mode !== 'normal' && stages[mode]) {
        stages[mode].enabled = true;
    }

    currentMode = mode;
}

export function getCurrentMode() {
    return currentMode;
}
