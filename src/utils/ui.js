// UI utility functions for notifications, loading, and modal management

function showNotification(message, type = "success", duration = 4000) {
  // Remove existing notifications
  document.querySelectorAll(".toast-notification").forEach((n) => n.remove());

  // Create notification element
  const toast = document.createElement("div");
  toast.className = `toast-notification toast-${type}`;

  // Set content based on type
  let icon, title;
  if (type === "success") {
    icon = "✅";
    title = "ជោគជ័យ!";
  } else if (type === "error") {
    icon = "❌";
    title = "មានកំហុស!";
  } else if (type === "warning") {
    icon = "⚠️";
    title = "ការព្រមាន!";
  } else {
    icon = "♻️";
    title = "ជោគជ័យ!";
  }

  toast.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close">&times;</button>
  `;

  // Add close button functionality
  const closeBtn = toast.querySelector(".toast-close");
  if (closeBtn) {
    closeBtn.onclick = function () {
      toast.style.animation = "toastSlideOut 0.25s ease-in forwards";
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    };
  }

  document.body.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.animation = "toastSlideOut 0.25s ease-in forwards";
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }
  }, duration);
}

function showLoading(
  show = true,
  title = "កំពុងដំណើរការ...",
  subtitle = "Processing..."
) {
  const loadingTitle = document.getElementById("loadingTitle");
  const loadingSubtitle = document.getElementById("loadingSubtitle");
  const loadingOverlay = document.getElementById("loadingOverlay");

  if (show) {
    if (loadingTitle) loadingTitle.textContent = title;
    if (loadingSubtitle) loadingSubtitle.textContent = subtitle;
    if (loadingOverlay) loadingOverlay.classList.add("show");
  } else {
    if (loadingOverlay) loadingOverlay.classList.remove("show");
  }
}

function setButtonLoading(button, loading = true) {
  if (!button) return;
  if (loading) {
    button.classList.add("loading");
    button.disabled = true;
  } else {
    button.classList.remove("loading");
    button.disabled = false;
  }
}

module.exports = {
  showNotification,
  showLoading,
  setButtonLoading,
};
