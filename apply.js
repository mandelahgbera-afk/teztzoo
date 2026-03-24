/**
 * LUMENIC DATA — Apply Form Handler
 * =====================================
 * Multi-step form with complete validation, drag & drop uploads,
 * file size validation, error recovery, and offline detection.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // ════════════════════════════════════════════════════════════
  // 1. STATE & CONFIG
  // ════════════════════════════════════════════════════════════
  let currentStep = 1;
  let isSubmitting = false;
  const totalSteps = 4;
  
  const form = document.querySelector('.apply-form-area');
  if (!form) {
    return;
  }

  // Note: Telegram credentials are only used on the backend (/api/submit-application)
  // The frontend form handler sends data to the API which handles all Telegram integration

  // ════════════════════════════════════════════════════════════
  // 2. STEP NAVIGATION
  // ════════════════════════════════════════════════════════════
  function goToStep(step) {
    if (step < 1 || step > totalSteps + 1) return;

    // Hide all steps
    document.querySelectorAll('.form-step').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.step-nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.mobile-step-dot').forEach(el => el.classList.remove('active'));
    document.getElementById('success-state').classList.remove('active');

    if (step <= totalSteps) {
      // Show current step
      const stepEl = document.getElementById(`step-${step}`);
      if (stepEl) stepEl.classList.add('active');

      const navItem = document.querySelector(`[data-step="${step}"]`);
      if (navItem) navItem.classList.add('active');

      const dot = document.querySelector(`[data-dot="${step}"]`);
      if (dot) dot.classList.add('active');

      // Update progress
      const progressPercent = (step / totalSteps) * 100;
      const progressBar = document.getElementById('progress-bar');
      if (progressBar) progressBar.style.width = progressPercent + '%';

      // Scroll to form
      setTimeout(() => {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } else {
      // Show success state
      document.getElementById('success-state').classList.add('active');
      const progressBar = document.getElementById('progress-bar');
      if (progressBar) progressBar.style.width = '100%';
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    currentStep = step;
  }

  // ════════════════════════════════════════════════════════════
  // 3. FORM VALIDATION
  // ════════════════════════════════════════════════════════════
  function validateStep(step) {
    const stepEl = document.getElementById(`step-${step}`);
    if (!stepEl) return false;

    const requiredFields = stepEl.querySelectorAll('[required]');
    let isValid = true;
    let firstInvalid = null;

    requiredFields.forEach(field => {
      let valid = true;
      const value = field.value?.trim() || '';

      // Check if empty
      if (!value && field.type !== 'checkbox') {
        valid = false;
      }

      // Type-specific validation
      if (valid && value) {
        if (field.type === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            valid = false;
            showToast('Please enter a valid email address', true);
          }
        } else if (field.id === 'a-phone') {
          const digits = value.replace(/\D/g, '');
          if (digits.length < 10) {
            valid = false;
            showToast('Please enter a valid phone number (at least 10 digits)', true);
          }
        } else if (field.id === 'a-ssn') {
          const digits = value.replace(/\D/g, '');
          if (digits.length !== 9) {
            valid = false;
            showToast('SSN must be exactly 9 digits', true);
          }
        } else if (field.id === 'a-linkedin' && value && !value.includes('linkedin.com')) {
          valid = false;
          showToast('Please enter a valid LinkedIn URL', true);
        } else if (field.id === 'a-github' && value && !value.includes('github.com')) {
          valid = false;
          showToast('Please enter a valid GitHub URL', true);
        } else if (field.id === 'a-location' && value) {
          const locationRegex = /^[a-zA-Z\s,.\-']{2,100}$/;
          if (!locationRegex.test(value)) {
            valid = false;
            showToast('Please enter a valid location (city, state/country)', true);
          }
        }
      }

      // Checkbox validation
      if (field.type === 'checkbox' && field.required && !field.checked) {
        valid = false;
      }

      if (!valid) {
        field.classList.add('field-invalid');
        field.style.borderColor = '#c0392b';
        field.style.backgroundColor = 'rgba(192,57,43,0.05)';
        isValid = false;
        if (!firstInvalid) firstInvalid = field;
      } else {
        field.classList.remove('field-invalid');
        field.style.borderColor = '';
        field.style.backgroundColor = '';
      }
    });

    if (!isValid) {
      showToast('Please fill all required fields correctly', true);
      if (firstInvalid) {
        setTimeout(() => {
          firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstInvalid.focus({ preventScroll: true });
        }, 150);
      }
    }

    return isValid;
  }

  // ════════════════════════════════════════════════════════════
  // 4. FILE UPLOAD HANDLING
  // ════════════════════════════════════════════════════════════
  document.querySelectorAll('.upload-zone').forEach(zone => {
    const input = zone.querySelector('input[type="file"]');
    if (!input) return;

    // Prevent default behavior
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      zone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Drag highlighting
    ['dragenter', 'dragover'].forEach(eventName => {
      zone.addEventListener(eventName, () => {
        zone.style.borderColor = 'var(--ink)';
        zone.style.backgroundColor = 'rgba(0,0,0,0.02)';
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      zone.addEventListener(eventName, () => {
        zone.style.borderColor = '';
        zone.style.backgroundColor = '';
      });
    });

    // Drop handler - FIX: input.files is read-only, use DataTransfer API
    zone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length) {
        const dt = new DataTransfer();
        Array.from(files).forEach(f => dt.items.add(f));
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Click to upload
    zone.addEventListener('click', () => {
      input.click();
    });

    input.addEventListener('change', () => {
      updateFileDisplay(input, zone);
    });
    input.addEventListener('input', () => {
      updateFileDisplay(input, zone);
    });
  });

  // Clear validation errors on field input (including autofill)
  document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea').forEach(field => {
    field.addEventListener('input', (e) => {
      // Clear validation errors when user modifies field
      if (field.classList.contains('field-invalid')) {
        field.classList.remove('field-invalid');
        field.style.borderColor = '';
        field.style.backgroundColor = '';
      }
    });
  });

  function updateFileDisplay(input, zone) {
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];
    const maxSize = parseInt(zone.getAttribute('data-max-size')) || 4194304; // 4MB default
    const fieldName = zone.getAttribute('data-field-name') || 'File';
    
    // Clear previous error
    const errorEl = zone.querySelector('.upload-error');
    const filenameEl = zone.querySelector('.upload-filename');
    zone.classList.remove('has-error');
    
    // Validate file size
    if (file.size > maxSize) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      const maxMB = (maxSize / 1024 / 1024).toFixed(1);
      const errorMsg = `${fieldName} is ${sizeMB}MB. Maximum is ${maxMB}MB.`;
      
      if (errorEl) {
        errorEl.textContent = errorMsg;
        errorEl.style.display = 'flex';
      }
      zone.classList.add('has-error');
      
      if (filenameEl) {
        filenameEl.style.display = 'none';
      }
      
      // Mark input as invalid for form submission
      input.setAttribute('data-size-error', 'true');
      return;
    }
    
    // Size is valid
    input.removeAttribute('data-size-error');
    if (errorEl) {
      errorEl.style.display = 'none';
    }
    
    if (filenameEl) {
      filenameEl.textContent = `✓ ${file.name}`;
      filenameEl.style.color = '#0a0a0a';
      filenameEl.style.display = 'block';
    }
  }

  // ════════════════════════════════════════════════════════════
  // 5. FORM SUBMISSION
  // ════════════════════════════════════════════════════════════
  const submitBtn = document.getElementById('submit-application');
  if (submitBtn) {
    submitBtn.addEventListener('click', handleSubmit);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    // Prevent double-submit
    if (isSubmitting) {
      showToast('Your application is already being submitted. Please wait...', true);
      return;
    }
    
    if (!validateStep(totalSteps)) {
      showToast('Please fill all required fields before submitting', true);
      return;
    }
    
    // Validate file sizes and size errors BEFORE submission
    const fileValidation = validateFileSizes();
    if (!fileValidation.valid) {
      showToast(fileValidation.error, true);
      return;
    }
    
    // Check for any upload zones with size errors
    const sizeErrors = document.querySelectorAll('input[data-size-error="true"]');
    if (sizeErrors.length > 0) {
      showToast('Please fix file size errors before submitting', true);
      return;
    }
    
    isSubmitting = true;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.6';
      submitBtn.style.cursor = 'not-allowed';
      submitBtn.setAttribute('aria-busy', 'true');
    }
    
    showToast('Submitting your application...', false);

    try {
      const formDataObj = collectFormData();
      
      if (Object.keys(formDataObj).length === 0) {
        throw new Error('No form data collected');
      }
      
      // Separate files from text data
      const files = {};
      const textData = {};
      
      for (const [key, value] of Object.entries(formDataObj)) {
        if (value instanceof File) {
          files[key] = value;
        } else {
          textData[key] = value;
        }
      }
      
      const response = await sendToBackend(textData, files);
      
      if (!response.success && !response.message) {
        throw new Error(response.error || 'Submission failed without success confirmation');
      }
      
      showSuccessState();
    } catch (error) {
      const userMessage = error.message || 'Failed to submit. Please check your connection and try again.';
      showToast(userMessage, true);
      
      // Save submission data locally for recovery
      try {
        const recoveryData = {
          timestamp: new Date().toISOString(),
          error: error.message,
          formFields: Object.keys(formDataObj || {})
        };
        localStorage.setItem('lumenic_failed_submission', JSON.stringify(recoveryData));
      } catch (storageErr) {
        // Silently fail if localStorage unavailable
      }
      
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
        submitBtn.removeAttribute('aria-busy');
      }
      isSubmitting = false;
    }
  }

  // Validate all file sizes before processing
  function validateFileSizes() {
    const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB per file (safety margin for base64)
    const MAX_TOTAL_SIZE = 3.5 * 1024 * 1024; // 3.5MB total payload safety limit
    let totalSize = 0;

    const fileInputs = document.querySelectorAll('input[type="file"]');
    for (const input of fileInputs) {
      if (input.files && input.files[0]) {
        const file = input.files[0];
        const fieldName = input.id || 'file';
        
        // Check individual file size
        if (file.size > MAX_FILE_SIZE) {
          return {
            valid: false,
            error: `File "${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum is 4MB per file.`
          };
        }
        
        totalSize += file.size;
      }
    }

    // Check total size (accounting for base64 encoding expansion ~33%)
    const estimatedPayloadSize = totalSize * 1.35;
    if (estimatedPayloadSize > MAX_TOTAL_SIZE) {
      return {
        valid: false,
        error: `Total file size is too large. Please reduce file sizes or remove some files.`
      };
    }

    return { valid: true };
  }

  // Send form data to backend API
  async function sendToBackend(textData, files) {
    const convertedFiles = {};
    for (const [key, file] of Object.entries(files)) {
      try {
        const base64 = await fileToBase64(file);
        convertedFiles[key] = {
          name: file.name,
          type: file.type,
          size: file.size,
          data: base64
        };
      } catch (err) {
        throw new Error(`File conversion failed for ${key}`);
      }
    }
    
    const payload = {
      formData: textData,
      files: convertedFiles
    };

    let jsonString;
    try {
      jsonString = JSON.stringify(payload);
    } catch (jsonErr) {
      throw new Error('Failed to serialize form data');
    }
    
    let response;
    try {
      response = await fetch('/api/submit-application', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: jsonString,
        timeout: 30000
      });
    } catch (fetchErr) {
      let userError = 'Network error - check your connection';
      if (fetchErr.message.includes('timeout')) {
        userError = 'Request timeout - your connection is too slow. Please try again.';
      } else if (fetchErr.message.includes('Failed to fetch')) {
        userError = 'Network error - please check your internet connection and try again.';
      } else if (fetchErr.message.includes('CORS')) {
        userError = 'Server connection error - please try again in a few moments.';
      }
      throw new Error(userError);
    }

    let data;
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error('Server returned non-JSON response');
      }
    } catch (parseErr) {
      throw new Error('Failed to parse server response');
    }

    if (!response.ok) {
      const errorMsg = data.error || `HTTP ${response.status}`;
      throw new Error(errorMsg);
    }
    
    return data;
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      // Validate file
      if (!file || !(file instanceof File)) {
        reject(new Error('Invalid file object'));
        return;
      }

      // Check file size (max 20MB for safety)
      if (file.size > 20 * 1024 * 1024) {
        reject(new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB, max 20MB)`));
        return;
      }

      // Check if FileReader is available
      if (typeof FileReader === 'undefined') {
        reject(new Error('FileReader not supported on this browser'));
        return;
      }

      const reader = new FileReader();
      let timeout;
      
      // Add timeout handler (FileReader can hang on some devices)
      const startTimeout = () => {
        timeout = setTimeout(() => {
          try {
            reader.abort();
          } catch (e) {
            // Ignore abort error
          }
          reject(new Error('File reading timeout - file may be corrupted'));
        }, 15000); // 15 second timeout per file
      };
      
      reader.onload = () => {
        clearTimeout(timeout);
        try {
          const result = reader.result;
          if (!result) {
            throw new Error('FileReader returned empty result');
          }
          
          // Extract base64 part (after comma)
          const base64Match = result.match(/^data:[^;]+;base64,(.+)$/);
          if (!base64Match || !base64Match[1]) {
            throw new Error('Invalid DataURL format');
          }
          
          const base64 = base64Match[1];
          
          if (base64.length === 0) {
            throw new Error('File converted to empty base64');
          }
          
          resolve(base64);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = () => {
        clearTimeout(timeout);
        const errorName = reader.error?.name || 'Unknown';
        const errorMsg = reader.error?.message || 'Unknown error';
        
        // Map common error codes
        let userMessage = 'Failed to read file';
        if (errorName === 'NotReadableError') {
          userMessage = 'File is corrupted or cannot be read';
        } else if (errorName === 'SecurityError') {
          userMessage = 'File access denied (security restriction)';
        } else if (errorName === 'AbortError') {
          userMessage = 'File reading was cancelled';
        }
        
        reject(new Error(userMessage));
      };

      reader.onabort = () => {
        clearTimeout(timeout);
        reject(new Error('File reading was cancelled'));
      };

      // Start reading
      try {
        startTimeout();
        reader.readAsDataURL(file);
      } catch (err) {
        clearTimeout(timeout);
        reject(new Error(`Failed to start file reading: ${err.message}`));
      }
    });
  }

  function collectFormData() {
    const data = {};
    const processedRadios = new Set();
    const processedCheckboxes = new Set();
    
    document.querySelectorAll('input, textarea, select').forEach(field => {
      if (!field.id) return;
      
      // Handle file inputs
      if (field.type === 'file' && field.files && field.files[0]) {
        data[field.id] = field.files[0];
      }
      // Handle checkboxes - collect ALL checked values under field.name key
      else if (field.type === 'checkbox') {
        const fieldName = field.name || field.id;
        if (!processedCheckboxes.has(fieldName)) {
          const checkedBoxes = document.querySelectorAll(`input[name="${fieldName}"]:checked, input[id="${fieldName}"]:checked`);
          if (checkedBoxes.length > 0) {
            const values = Array.from(checkedBoxes).map(cb => cb.value || 'true');
            // If single checkbox, store string; if multiple, store array
            data[fieldName] = values.length === 1 ? values[0] : values.join(', ');
          }
          processedCheckboxes.add(fieldName);
        }
      }
      // Handle radio buttons - use the name attribute, not id
      else if (field.type === 'radio') {
        const fieldName = field.name || field.id;
        if (!processedRadios.has(fieldName)) {
          const checked = document.querySelector(`input[name="${fieldName}"]:checked`);
          if (checked) {
            data[fieldName] = checked.value;
          }
          processedRadios.add(fieldName);
        }
      }
      // Handle text fields
      else if (field.value && field.value.trim()) {
        data[field.id] = field.value.trim();
      }
    });
    
    return data;
  }



  function showSuccessState() {
    // Reset all form fields
    document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="number"], textarea, select').forEach(field => {
      field.value = '';
      field.style.borderColor = '';
      field.style.backgroundColor = '';
      field.classList.remove('field-invalid');
      field.removeAttribute('data-size-error');
    });

    // Clear radio and checkbox selections
    document.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(field => {
      field.checked = false;
      field.style.borderColor = '';
      field.style.backgroundColor = '';
      field.classList.remove('field-invalid');
    });

    // Clear file uploads
    document.querySelectorAll('input[type="file"]').forEach(field => {
      field.value = '';
      field.removeAttribute('data-size-error');
      // Reset file input to allow re-selection
      try {
        const dt = new DataTransfer();
        field.files = dt.files;
      } catch (e) {
        // Silently fail if DataTransfer unavailable
      }
    });

    // Clear file displays
    document.querySelectorAll('.upload-filename').forEach(el => {
      el.textContent = '';
      el.style.display = 'none';
      el.style.color = '';
    });

    // Clear error displays
    document.querySelectorAll('.upload-error').forEach(el => {
      el.style.display = 'none';
      el.textContent = '';
    });

    // Clear upload zone error states
    document.querySelectorAll('.upload-zone').forEach(zone => {
      zone.classList.remove('has-error');
      zone.style.borderColor = '';
      zone.style.backgroundColor = '';
    });

    // Reset form submission state
    isSubmitting = false;
    currentStep = 1;

    // Show success - schedule after DOM clears
    setTimeout(() => {
      goToStep(totalSteps + 1);
      showToast('Application submitted successfully!', false);
    }, 100);

    // Re-enable button
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      submitBtn.style.cursor = 'pointer';
      submitBtn.removeAttribute('aria-busy');
    }
  }

  // ════════════════════════════════════════════════════════════
  // 7. BUTTON HANDLERS
  // ════════════════════════════════════════════════════════════
  document.querySelectorAll('.form-nav button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();

      if (btn.id.startsWith('next-')) {
        const step = parseInt(btn.id.split('-')[1]);
        if (validateStep(step)) {
          goToStep(step + 1);
        }
      } else if (btn.id.startsWith('back-')) {
        const step = parseInt(btn.id.split('-')[1]);
        goToStep(step - 1);
      }
    });
  });

  // ════════════════════════════════════════════════════════════
  // 8. STEP NAV CLICKS (SIDEBAR)
  // ════════════════════════════════════════════════════════════
  document.querySelectorAll('.step-nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.button !== 0) return; // Only left-click
      e.preventDefault();
      e.stopPropagation();
      const step = parseInt(item.dataset.step);
      if (!isNaN(step) && step >= 1 && step <= totalSteps) {
        goToStep(step);
      }
    }, { passive: false });
    
    // Also support keyboard navigation
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        const step = parseInt(item.dataset.step);
        if (!isNaN(step) && step >= 1 && step <= totalSteps) {
          goToStep(step);
        }
      }
    }, { passive: false });
  });

  // ════════════════════════════════════════════════════════════
  // 9. TOAST NOTIFICATIONS
  // ════════════════════════════════════════════════════════════
  function showToast(message, isError = false) {
    const toast = document.querySelector('.toast');
    if (!toast) {
      try {
        const fallbackToast = document.createElement('div');
        fallbackToast.style.cssText = 'position:fixed;bottom:20px;left:20px;right:20px;max-width:400px;padding:12px 16px;background:#333;color:#fff;border-radius:6px;z-index:9999;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
        fallbackToast.textContent = message;
        document.body.appendChild(fallbackToast);
        setTimeout(() => fallbackToast.remove(), 4000);
      } catch (e) {
        // Silently fail if toast creation fails
      }
      return;
    }

    const icon = toast.querySelector('.toast-icon');
    if (isError) {
      toast.style.background = '#c0392b';
      toast.style.zIndex = '10000'; // Ensure above all other elements
      if (icon) {
        icon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
      }
    } else {
      toast.style.background = '';
      toast.style.zIndex = '9999';
      if (icon) {
        icon.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
      }
    }

    const textEl = toast.querySelector('.toast-text');
    if (textEl) {
      textEl.textContent = message;
    }
    
    toast.classList.add('show');

    clearTimeout(toast._timeout);
    
    const duration = isError ? 5000 : 3000;
    toast._timeout = setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }

  // ════════════════════════════════════════════════════════════
  // 10. OFFLINE DETECTION & RECOVERY
  // ════════════════════════════════════════════════════════════
  // Monitor network status for offline detection
  window.addEventListener('online', () => {
    showToast('Your connection has been restored', false);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
    }
  });

  window.addEventListener('offline', () => {
    showToast('No internet connection - changes are saved locally', true);
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.5';
    }
  });

  // Recovery system: if there was a failed submission, show recovery UI
  if (typeof localStorage !== 'undefined') {
    try {
      const failedSubmission = localStorage.getItem('lumenic_failed_submission');
      if (failedSubmission) {
        const data = JSON.parse(failedSubmission);
        const timeDiff = Date.now() - new Date(data.timestamp).getTime();
        const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
        
        // Show recovery message if within 24 hours
        if (hoursAgo < 24) {
          setTimeout(() => {
            showToast(`Recovery: A previous submission failed ${hoursAgo}h ago. Your data is saved.`, false);
          }, 1000);
        } else {
          localStorage.removeItem('lumenic_failed_submission');
        }
      }
    } catch (e) {
      // Silently fail if recovery data is inaccessible
    }
  }

  // ════════════════════════════════════════════════════════════
  // 11. INITIALIZE
  // ════════════════════════════════════════════════════════════
  goToStep(1);

  // Remove js-disabled fallback class once JS is loaded
  document.documentElement.classList.remove('js-disabled');
});
