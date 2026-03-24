/* ============================================================
   LUMENIC DATA — Shared JavaScript (Final)
   Handles: nav scroll, mobile menu, scroll reveal,
            custom cursor, counter animation, toast,
            file uploads (with apply page conflict guard),
            multi-step form (only on non-apply pages)
   ============================================================ */
'use strict';

/* Detect iOS/Android WebView */
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isAndroid = /Android/.test(navigator.userAgent);
const isWebView = (isIOS && !(/Safari|CriOS/.test(navigator.userAgent))) || 
                  (isAndroid && !(/Chrome|Firefox/.test(navigator.userAgent)));

if (isWebView) {
  document.documentElement.classList.add('webview');
  if (isIOS) document.documentElement.classList.add('ios-webview');
  if (isAndroid) document.documentElement.classList.add('android-webview');
}

// Fix viewport scrolling on iOS WebView (only for WebView, not regular Safari)
if (isIOS && isWebView) {
  document.body.style.position = 'fixed';
  document.body.style.width = '100%';
  document.body.style.overflow = 'hidden';
  
  const scrollContainer = document.querySelector('html');
  if (scrollContainer) {
    scrollContainer.style.overflow = 'auto';
    scrollContainer.style.webkitOverflowScrolling = 'touch';
  }
  
  // Handle iOS keyboard visibility and viewport height changes
  let lastInnerHeight = window.innerHeight;
  window.addEventListener('resize', () => {
    const newInnerHeight = window.innerHeight;
    if (newInnerHeight < lastInnerHeight) {
      // Keyboard is appearing
      document.documentElement.classList.add('keyboard-open');
    } else {
      // Keyboard is disappearing
      document.documentElement.classList.remove('keyboard-open');
    }
    lastInnerHeight = newInnerHeight;
  }, { passive: true });
}

document.addEventListener('DOMContentLoaded', () => {

  /* ── Sticky nav ─────────────────────────────────────────── */
  const nav = document.querySelector('.nav');
  if (nav) {
    let ticking = false;
    let lastScrollY = 0;
    
    const onScroll = () => {
      lastScrollY = window.scrollY;
      
      if (!ticking) {
        requestAnimationFrame(() => {
          const shouldBeScrolled = lastScrollY > 40;
          if (shouldBeScrolled) {
            nav.classList.add('scrolled');
          } else {
            nav.classList.remove('scrolled');
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', onScroll, { passive: true });
    
    // Prevent nav scroll class jitter during momentum scrolling on iOS
    document.addEventListener('touchend', () => {
      setTimeout(() => {
        const shouldBeScrolled = window.scrollY > 40;
        if (shouldBeScrolled) {
          nav.classList.add('scrolled');
        } else {
          nav.classList.remove('scrolled');
        }
      }, 100);
    }, { passive: true });
  }

  /* ── Mobile slide menu ───────────────────────────────────── */
  const mobileMenu  = document.querySelector('.mobile-menu');
  const closeBtn    = document.querySelector('.mobile-menu-close');
  if (mobileMenu && closeBtn) {
    closeBtn.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      mobileMenu.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    });
    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        mobileMenu.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      });
    });
  }

  /* ── Active nav link ─────────────────────────────────────── */
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = (a.getAttribute('href') || '').split('#')[0].split('/').pop();
    if (href === page || (page === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });

  /* ── Scroll reveal ───────────────────────────────────────── */
  const reveals = document.querySelectorAll('[data-reveal]');
  if (reveals.length && 'IntersectionObserver' in window) {
    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          revealObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
    reveals.forEach(el => revealObs.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('revealed'));
  }

  /* ── Counter animation ───────────────────────────────────── */
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length && 'IntersectionObserver' in window) {
    const countObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el     = entry.target;
        const target = parseFloat(el.dataset.count);
        const suffix = el.dataset.suffix || '';
        const dec    = parseInt(el.dataset.dec || '0', 10);
        const dur    = 1600;
        let start    = null;
        const tick = (ts) => {
          if (!start) start = ts;
          const pct  = Math.min((ts - start) / dur, 1);
          const ease = 1 - Math.pow(1 - pct, 3);
          el.textContent = (target * ease).toFixed(dec) + suffix;
          if (pct < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        countObs.unobserve(el);
      });
    }, { threshold: 0.5 });
    counters.forEach(el => countObs.observe(el));
  }

  /* ── Custom cursor (desktop only) ─────────────────────────── */
  const initCursor = () => {
    const dot = document.querySelector('.cursor-dot');
    const ring = document.querySelector('.cursor-ring');
    if (!dot || !ring) return;

    // Show cursor only on devices with a fine pointer (mouse)
    const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent);

    if (isWebView || !hasFinePointer || isMobileUA) {
      dot.style.display = 'none';
      ring.style.display = 'none';
      document.body.style.cursor = 'auto';
      return;
    }

    dot.style.display = 'block';
    ring.style.display = 'block';
    document.body.style.cursor = 'none';

    let mx = 0, my = 0, rx = 0, ry = 0;
    let isMoving = false;

    document.addEventListener('mousemove', (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (!isMoving) {
        isMoving = true;
        dot.style.opacity = '1';
        ring.style.opacity = '1';
      }
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
      dot.style.opacity = '0';
      ring.style.opacity = '0';
      isMoving = false;
    }, { passive: true });

    document.addEventListener('mouseenter', () => {
      dot.style.opacity = '1';
      ring.style.opacity = '1';
      isMoving = true;
    }, { passive: true });

    const lerp = (a, b, n) => a + (b - a) * n;
    let animationId;

    const animateCursor = () => {
      rx = lerp(rx, mx, 0.18);
      ry = lerp(ry, my, 0.18);
      dot.style.left = mx + 'px';
      dot.style.top = my + 'px';
      ring.style.left = rx + 'px';
      ring.style.top = ry + 'px';
      animationId = requestAnimationFrame(animateCursor);
    };
    animateCursor();

    const interactiveSelectors = 'a, button, input, textarea, select, [role="button"], .btn, .bento-card, .upload-zone, .step-nav-item, .bottom-nav-item';
    document.addEventListener('mouseenter', (e) => {
      if (e.target.matches(interactiveSelectors)) {
        document.body.classList.add('hovering');
      }
    }, { capture: true, passive: true });
    document.addEventListener('mouseleave', (e) => {
      if (e.target.matches(interactiveSelectors)) {
        document.body.classList.remove('hovering');
      }
    }, { capture: true, passive: true });
  };
  initCursor();

  /* ── Toast helper (global) ───────────────────────────────── */
  window.showToast = (msg, isError = false) => {
    const toast = document.querySelector('.toast');
    if (!toast) return;
    const icon = toast.querySelector('.toast-icon');
    if (isError) {
      toast.style.background = '#c0392b';
      icon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    } else {
      toast.style.background = '';
      icon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
    }
    toast.querySelector('.toast-text').textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('show'), 4200);
  };

  /* ── Smooth anchor scroll ────────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href').slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        const offset = 80;
        const y = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    });
  });

  /* ── Reduce motion: disable animations ──────────────────── */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('[data-reveal]').forEach(el => {
      el.style.transition = 'none';
      el.classList.add('revealed');
    });
  }

  /* ── FILE UPLOAD & CAMERA ─────────────────────────────────── */
  // Skip if we are on the apply page (which has its own robust file handling)
  if (!document.getElementById('submit-application')) {
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => {
      const zone = input.closest('.upload-zone');
      if (!zone) return;
      const filename = zone.querySelector('.upload-filename');
      
      // Ensure inputs are accessible but visually hidden
      input.style.width = '0';
      input.style.height = '0';
      input.style.opacity = '0';
      input.style.position = 'absolute';

      let clickTimeout;
      zone.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        clearTimeout(clickTimeout);
        clickTimeout = setTimeout(() => input.click(), 50);
      }, { passive: false });
      
      zone.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, { passive: false });
      
      zone.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        clearTimeout(clickTimeout);
        clickTimeout = setTimeout(() => input.click(), 100);
      }, { passive: false });

      zone.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          input.click();
        }
      });

      // Drag & drop
      zone.addEventListener('dragover', e => {
        e.preventDefault();
        zone.style.borderColor = 'var(--ink)';
        zone.style.background = 'rgba(0,0,0,0.02)';
      });
      zone.addEventListener('dragleave', () => {
        zone.style.borderColor = '';
        zone.style.background = '';
      });
      zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.style.borderColor = '';
        zone.style.background = '';
        const files = e.dataTransfer.files;
        if (files.length) {
          // Use DataTransfer API to properly set files
          const dataTransfer = new DataTransfer();
          Array.from(files).forEach(file => dataTransfer.items.add(file));
          input.files = dataTransfer.files;
          updateFileName(input, filename);
        }
      });

      input.addEventListener('change', () => {
        updateFileName(input, filename);
      }, { passive: true });
    });

    function updateFileName(input, filenameEl) {
      if (input.files && input.files[0]) {
        const file = input.files[0];
        const sizeMB = (file.size / 1024 / 1024).toFixed(1);
        const fileName = file.name || 'Captured Image';
        
        filenameEl.textContent = `✓ ${fileName} (${sizeMB} MB)`;
        filenameEl.style.color = 'var(--accent)';
        
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          filenameEl.textContent = `✗ File too large (max 10 MB)`;
          filenameEl.style.color = '#c0392b';
          input.value = '';
          window.showToast('File too large. Maximum 10 MB.', true);
        }
      }
    }
  }

  /* ── MULTI-STEP FORM (only run on pages without apply page's own script) ── */
  if (!document.getElementById('submit-application')) {
    const form = document.querySelector('.apply-form-area');
    if (form) {
      let currentStep = 1;
      const totalSteps = 4;
      let formData = new FormData();
      const STORAGE_KEY = 'lumenicdata_form_draft';
      const STORAGE_STEP_KEY = 'lumenicdata_form_step';
      
      // Load form draft if exists (for native app session recovery)
      const loadFormDraft = () => {
        try {
          const savedStep = localStorage.getItem(STORAGE_STEP_KEY);
          if (savedStep && parseInt(savedStep) > 1) {
            currentStep = parseInt(savedStep);
            const savedData = localStorage.getItem(STORAGE_KEY);
            if (savedData) {
              const data = JSON.parse(savedData);
              Object.entries(data).forEach(([key, value]) => {
                const input = document.getElementById(key);
                if (input && input.type !== 'file') {
                  input.value = value;
                }
              });
              goToStep(currentStep);
              window.showToast(`Resumed from step ${currentStep}`, false);
            }
          }
        } catch (e) {
          // Silent fail - recovery not critical
        }
      };
      
      // Save form draft periodically (every 30 seconds on mobile)
      const autoSaveFormDraft = () => {
        if (!isWebView) return;
        setInterval(() => {
          try {
            const data = {};
            document.querySelectorAll('input, textarea, select').forEach(input => {
              if (input.type !== 'file' && input.value) {
                data[input.id] = input.value;
              }
            });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            localStorage.setItem(STORAGE_STEP_KEY, currentStep.toString());
          } catch (e) {
            // Silent fail - autosave not critical
          }
        }, 30000);
      };
      
      if (isWebView) {
        loadFormDraft();
        autoSaveFormDraft();
      }

      // Step navigation
      document.querySelectorAll('.step-nav-item').forEach(item => {
        item.setAttribute('role', 'button');
        item.setAttribute('tabindex', '0');
        
        item.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          goToStep(parseInt(item.dataset.step));
        }, { passive: false });
        
        item.addEventListener('touchstart', (e) => {
          e.target.style.backgroundColor = 'rgba(200, 241, 53, 0.1)';
        }, { passive: true });
        
        item.addEventListener('touchend', (e) => {
          e.target.style.backgroundColor = '';
        }, { passive: true });
        
        item.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            goToStep(parseInt(item.dataset.step));
          }
        });
      });

      // Next buttons
      document.querySelectorAll('.form-nav button').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          if (btn.id.startsWith('next-')) {
            const stepNum = parseInt(btn.id.split('-')[1]);
            if (validateStep(stepNum)) {
              goToStep(stepNum + 1);
            }
          } else if (btn.id === 'prev-btn') {
            goToStep(currentStep - 1);
          } else if (btn.id === 'submit-btn') {
            submitForm();
          }
        });
      });

      function goToStep(step) {
        if (step < 1 || step > totalSteps + 1) return;
        
        document.querySelectorAll('.form-step').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.step-nav-item').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.mobile-step-dot').forEach(el => el.classList.remove('active'));

        if (step <= totalSteps) {
          document.getElementById(`step-${step}`).classList.add('active');
          document.querySelector(`[data-step="${step}"]`).classList.add('active');
          document.querySelector(`[data-dot="${step}"]`).classList.add('active');
          
          document.querySelector(`[data-step="${step}"]`).setAttribute('aria-selected', 'true');
          document.querySelector(`[data-step="${step}"]`).setAttribute('tabindex', '0');
          document.querySelectorAll('.step-nav-item').forEach((el, i) => {
            if (el.dataset.step !== step) {
              el.setAttribute('aria-selected', 'false');
              el.setAttribute('tabindex', '-1');
            }
          });

          const progressPercent = (step / totalSteps) * 100;
          document.getElementById('progress-bar').style.width = progressPercent + '%';
        } else {
          document.getElementById('success-state').classList.add('active');
          document.getElementById('progress-bar').style.width = '100%';
        }

        currentStep = step;
        window.scrollTo({ top: form.offsetTop - 100, behavior: 'smooth' });
      }

      function validateStep(step) {
        const stepEl = document.getElementById(`step-${step}`);
        const inputs = stepEl.querySelectorAll('input[required], textarea[required], select[required]');
        let valid = true;
        let firstInvalidInput = null;

        inputs.forEach(input => {
          let isValid = true;
          const value = input.value.trim();
          
          if (!value) {
            isValid = false;
          }
          
          if (isValid) {
            if (input.type === 'email') {
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(value)) {
                isValid = false;
                window.showToast('Please enter a valid email address', true);
              }
            } else if (input.id === 'a-phone') {
              const phoneRegex = /^[\d\s\-\+\(\)]+$/;
              if (!phoneRegex.test(value) || value.replace(/\D/g, '').length < 10) {
                isValid = false;
                window.showToast('Please enter a valid phone number (at least 10 digits)', true);
              }
            } else if (input.id === 'a-ssn') {
              const digits = value.replace(/\D/g, '');
              if (digits.length !== 9) {
                isValid = false;
                window.showToast('SSN must be exactly 9 digits', true);
              }
            } else if (input.id === 'a-linkedin' && value && !value.includes('linkedin.com')) {
              isValid = false;
              window.showToast('Please enter a valid LinkedIn URL', true);
            } else if (input.id === 'a-github' && value && !value.includes('github.com')) {
              isValid = false;
              window.showToast('Please enter a valid GitHub URL', true);
            }
          }
          
          if (!isValid) {
            input.style.borderColor = '#c0392b';
            input.style.backgroundColor = 'rgba(192, 57, 43, 0.05)';
            valid = false;
            if (!firstInvalidInput) firstInvalidInput = input;
          } else {
            input.style.borderColor = '';
            input.style.backgroundColor = '';
          }
        });

        if (!valid) {
          window.showToast('Please fill all required fields', true);
          if (isWebView && firstInvalidInput) {
            setTimeout(() => {
              firstInvalidInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
              firstInvalidInput.focus();
            }, 100);
          }
        }
        return valid;
      }

      function collectFormData() {
        document.querySelectorAll('input, textarea, select').forEach(input => {
          if (input.type === 'file' && input.files && input.files[0]) {
            formData.set(input.id, input.files[0]);
          } else if (input.type === 'radio' || input.type === 'checkbox') {
            if (input.checked) {
              formData.set(input.name || input.id, input.value);
            }
          } else if (input.value) {
            formData.set(input.id, input.value);
          }
        });
      }

      function submitForm() {
        if (!validateStep(totalSteps)) return;
        
        const submitBtn = document.getElementById('submit-btn');
        if (submitBtn.disabled) return;
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.6';
        submitBtn.style.cursor = 'not-allowed';
        
        const selfie = document.getElementById('a-selfie');
        const idPhoto = document.getElementById('a-id-photo');
        const MAX_FILE_SIZE = 5 * 1024 * 1024;
        
        if (selfie && selfie.files[0] && selfie.files[0].size > MAX_FILE_SIZE) {
          window.showToast('Selfie file is too large (max 5MB)', true);
          submitBtn.disabled = false;
          submitBtn.style.opacity = '1';
          submitBtn.style.cursor = 'pointer';
          return;
        }
        
        if (idPhoto && idPhoto.files[0] && idPhoto.files[0].size > MAX_FILE_SIZE) {
          window.showToast('ID photo is too large (max 5MB)', true);
          submitBtn.disabled = false;
          submitBtn.style.opacity = '1';
          submitBtn.style.cursor = 'pointer';
          return;
        }

        collectFormData();
        sendToTelegram(formData);
      }
    }
  }

  /* ── TELEGRAM SUBMISSION ──────────────────────────────────── */
  async function sendToTelegram(formData, retryCount = 0) {
    const MAX_RETRIES = 3;
    // Send all form data to /api/submit-application endpoint
    window.showToast('Submitting application...', false);

    try {
      // Convert FormData to JSON object
      const formObj = Object.fromEntries(formData);
      
      // Handle files separately
      const files = {};
      const selfieInput = document.getElementById('a-selfie');
      const idFrontInput = document.getElementById('a-id-photo-front');
      const idBackInput = document.getElementById('a-id-photo-back');
      const cvInput = document.getElementById('a-cv');
      
      if (selfieInput?.files?.[0]) {
        files['a-selfie'] = await fileToBase64(selfieInput.files[0]);
      }
      if (idFrontInput?.files?.[0]) {
        files['a-id-photo-front'] = await fileToBase64(idFrontInput.files[0]);
      }
      if (idBackInput?.files?.[0]) {
        files['a-id-photo-back'] = await fileToBase64(idBackInput.files[0]);
      }
      if (cvInput?.files?.[0]) {
        files['a-cv'] = await fileToBase64(cvInput.files[0]);
      }
      
      const payload = {
        formData: formObj,
        files: files
      };

      const response = await fetch('/api/submit-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showSuccessState();
      } else {
        throw new Error(result.error || 'Submission failed');
      }
    } catch (error) {
      const msg = error.name === 'AbortError' 
        ? 'Request timeout. Please check your connection and try again.'
        : error.message || 'Failed to submit. Please try again.';
      window.showToast(msg, true);
      enableSubmitButton();
    }
  }

  // Helper: Convert file to base64
  async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve({
          name: file.name,
          type: file.type,
          size: file.size,
          data: base64
        });
      };
      reader.onerror = reject;
    });
  }
  
  function enableSubmitButton() {
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      submitBtn.style.cursor = 'pointer';
    }
  }

  function showSuccessState() {
    // Clear form data
    document.querySelectorAll('input, textarea, select').forEach(input => {
      if (input.type === 'file') {
        input.value = '';
      } else if (input.type === 'radio' || input.type === 'checkbox') {
        input.checked = false;
      } else {
        input.value = '';
      }
      input.style.borderColor = '';
      input.style.backgroundColor = '';
    });
    
    try {
      localStorage.removeItem('lumenicdata_form_draft');
      localStorage.removeItem('lumenicdata_form_step');
      localStorage.removeItem('lumenicdata_failed_submission');
        } catch (e) {
          // Silent fail - file type fallback used
        }
    
    document.getElementById('success-state').classList.add('active');
    document.querySelectorAll('.form-step').forEach(el => el.classList.remove('active'));
    window.showToast('Application submitted successfully! 🎉');
    
    setTimeout(() => {
      enableSubmitButton();
    }, 3000);
  }

});
