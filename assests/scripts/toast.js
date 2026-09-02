/**
 * Dynamic Popover Toast Notification & Form Handler Module
 * Feature matrix: Native HTML Popover API, Hover Pause, FIFO Queue Capping,
 * Local Duplicate Blocking (with 24hr Cache Expiry), Offline Queue Caching, & Background Syncing.
 */

let toastCount = 0;
const MAX_TOASTS = 3;
const TOAST_GAP = 12;
const EXPIRATION_TIME_MS = 24 * 60 * 60 * 1000; // 24 Hours in Milliseconds

/**
 * 1. Global Toast Engine Object Component
 */
const Toast = {
  types: {
    success: { className: "toast-success" },
    error: { className: "toast-error" },
    warn: { className: "toast-warn" }
  },

  // Dynamic DOM query to guarantee container access across loading scripts
  getContainer() {
    return document.getElementById('toast-container');
  },

  // Calculates real-time vertical offsets for varied height text blocks from the bottom up
  updatePositions() {
    const container = this.getContainer();
    if (!container) return;

    const activeToasts = Array.from(container.querySelectorAll('.toast-item:not(.toast-exiting)'));
    let runningOffset = 0;

    activeToasts.reverse().forEach((toast) => {
      toast.style.setProperty('--toast-offset', `${runningOffset}px`);
      runningOffset += toast.getBoundingClientRect().height + TOAST_GAP;
    });
  },

  show(type, message) {
    const container = this.getContainer();
    if (!container) {
      console.error("Toast failed: #toast-container element was not found in the DOM.");
      return;
    }

    toastCount++;
    const config = this.types[type] || this.types.success;

    // Manage visible screen capacity limit cap (Graceful exit for the oldest toast)
    const activeToasts = Array.from(container.querySelectorAll('.toast-item:not(.toast-exiting)'));
    if (activeToasts.length >= MAX_TOASTS) {
      // FIXED: Added [0] index accessor to target the specific individual node instead of the array object
      const oldest = activeToasts[0];
      const currentOffset = parseInt(oldest.style.getPropertyValue('--toast-offset') || '0');
      const forcedExitOffset = currentOffset + oldest.getBoundingClientRect().height + TOAST_GAP;

      oldest.style.setProperty('--toast-offset', `${forcedExitOffset}px`);
      oldest.classList.add('toast-exiting');

      oldest.addEventListener('animationend', (e) => {
        if (e.animationName === 'toast-exit-forced') {
          oldest.hidePopover();
          oldest.remove();
        }
      });
    }

    // Construct native popover markup footprint nodes
    const toast = document.createElement('div');
    toast.setAttribute('popover', 'manual');
    toast.className = `toast-item ${config.className}`;
    const id = `toast-node-${toastCount}`;
    toast.id = id;

    toast.innerHTML = `
      <span class="toast-icon"></span>
      <span class="toast-message">${message}</span>
      <button popovertarget="${id}" popovertargetaction="hide" class="toast-close-btn">&times;</button>
      <div class="progress-bar"></div>
    `;

    container.appendChild(toast);
    toast.showPopover();
    this.updatePositions();

    // High-precision interaction duration & countdown timeline variables
    const duration = 4000;
    let startTime = Date.now();
    let remainingTime = duration;
    let dismissTimeout;

    const startTimer = () => {
      startTime = Date.now();
      dismissTimeout = setTimeout(() => toast.hidePopover(), remainingTime);
    };

    const pauseTimer = () => {
      clearTimeout(dismissTimeout);
      remainingTime -= Date.now() - startTime;
    };

    // Centralized single point of destruction for manual close buttons and auto-timeouts
    toast.addEventListener('toggle', (e) => {
      if (e.newState === 'closed') {
        clearTimeout(dismissTimeout);
        toast.remove();
        this.updatePositions();
      }
    });

    toast.addEventListener('mouseenter', () => {
      if (!toast.classList.contains('toast-exiting')) pauseTimer();
    });
    toast.addEventListener('mouseleave', () => {
      if (!toast.classList.contains('toast-exiting')) startTimer();
    });

    startTimer();
  }
};

/* ==========================================================================
   2. Form Controller & Data Pipeline Subsystems
   ========================================================================== */
window.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('sample-form');
  const offlineCheckbox = document.getElementById('simulate-offline');

  if (!form) return;

  // Generates a lightweight, deterministic fingerprint to distinguish form messages
  function generateFormHash(data) {
    const sourceString = `${data.name.trim()}|${data.email.trim()}|${data.message.trim()}`.toLowerCase();
    let hash = 0;
    for (let i = 0; i < sourceString.length; i++) {
      const chr = sourceString.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to a signed 32-bit integer
    }
    return `form_hash_${Math.abs(hash)}`;
  }

  // Garbage Collection Sweep Engine: Removes footprints older than 24 hours from localStorage
  function cleanExpiredDuplicateHashes() {
    const now = Date.now();
    const storageKeys = Object.keys(localStorage);
    let purgedCount = 0;

    storageKeys.forEach(key => {
      if (key.startsWith('form_hash_')) {
        try {
          const record = JSON.parse(localStorage.getItem(key));
          if (record && record.date && (now - record.date > EXPIRATION_TIME_MS)) {
            localStorage.removeItem(key);
            purgedCount++;
          }
        } catch (e) {
          localStorage.removeItem(key);
        }
      }
    });

    if (purgedCount > 0) {
      console.log(`Sync System: Automatically cleaned ${purgedCount} expired form fingerprints from localStorage.`);
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopPropagation();

    // STEP 1: VALIDITY CHECK FIRST (Triggers Red Error Alert if inputs fail constraints)
    if (!form.checkValidity()) {
      Toast.show('error', 'Form submission failed! Please review your entries and complete all mandatory fields correctly.');
      return;
    }

    // STEP 2: SAFE EXTRACTION (Inputs are now verified structurally healthy)
    const formData = {
      name: document.getElementById('username').value,
      email: document.getElementById('useremail').value,
      subject: document.getElementById('inquiry-subject').value,
      message: document.getElementById('user-message').value,
      timestamp: Date.now()
    };

    // STEP 3: DUPLICATE CHECK (Triggers Yellow Warning Style Toast)
    const submissionFingerprint = generateFormHash(formData);
    if (localStorage.getItem(submissionFingerprint)) {
      Toast.show('warn', 'You have already submitted this exact inquiry message! Duplicate submission blocked.');
      return;
    }

    // Placeholder server endpoint (Swap with live server URL string when ready)
    const SERVER_API_ENDPOINT = "https://example.com";

    try {
      // Intercept execution thread to mock offline developer checkboxes
      if (offlineCheckbox && offlineCheckbox.checked) {
        throw new TypeError("Failed to fetch");
      }

      // Simulate standard client-to-server request processing latency
      await new Promise(resolve => setTimeout(resolve, 350));

      // Persist success hash to local storage permanently to block upcoming duplicate clicks
      localStorage.setItem(submissionFingerprint, JSON.stringify({ status: 'sent', date: formData.timestamp }));

      // Green Success State
      Toast.show('success', `Thank you, ${formData.name}! Your contact inquiry has been sent to our team.`);
      form.reset();

    } catch (error) {
      // STEP 4: NETWORK FAILURE FALLBACK ROUTING (Triggers Yellow Warning Style Toast)
      const offlineQueue = JSON.parse(localStorage.getItem('offline_contact_queue') || '[]');
      const isAlreadyQueued = offlineQueue.some(item => generateFormHash(item) === submissionFingerprint);

      if (!isAlreadyQueued) {
        offlineQueue.push(formData);
        localStorage.setItem('offline_contact_queue', JSON.stringify(offlineQueue));
        // Flag local cache profile status index to block double submissions while sitting offline
        localStorage.setItem(submissionFingerprint, JSON.stringify({ status: 'queued', date: formData.timestamp }));
      }

      // Yellow Warning State for network dropouts
      Toast.show('warn', 'Connection failed! Your form data has been safely saved locally. We will automatically retry when online.');
      console.warn("Sync Pipeline updated offline queue record entries:", error);
    }
  });

  /* ==========================================================================
     3. Self-Healing Background Network Sync Engine
     ========================================================================== */
   async function processOfflineQueue() {
    // Avoid running automated sync polls if developer offline toggle is verified active
    if (offlineCheckbox && offlineCheckbox.checked) return;

    const offlineQueue = JSON.parse(localStorage.getItem('offline_contact_queue') || '[]');
    if (offlineQueue.length === 0) return;

    console.log(`Sync System: Processing ${offlineQueue.length} queued contact messages...`);

    // CORRECTED: Target the specific oldest entry element index instead of the whole array mapping
    const currentItem = offlineQueue[0];

    try {
      /*
      Uncomment when ready to link live production endpoint rules:
      const response = await fetch("https://example.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentItem)
      });
      if (!response.ok) return;
      */

      // Simulated background network processing wait step
      await new Promise(resolve => setTimeout(resolve, 100));

      // Successfully processed oldest element; pop array queues safely
      offlineQueue.shift();
      localStorage.setItem('offline_contact_queue', JSON.stringify(offlineQueue));

      // Transition mapping values flags from 'queued' to 'sent'
      const itemFingerprint = generateFormHash(currentItem);
      localStorage.setItem(itemFingerprint, JSON.stringify({ status: 'sent', date: Date.now() }));

      // Alert active user that background synchronization finished safely
      Toast.show('success', `Background Sync Complete! Queued message from ${currentItem.name} has been processed.`);

    } catch (err) {
      console.log("Background synchronization loop resting, destination host unreachable.", err);
    }
  }
})