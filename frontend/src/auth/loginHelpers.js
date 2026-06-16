export function showInlineError(root, panelWrap, message) {
  let el = root.querySelector(".error-message");
  if (!el) {
    el = root.ownerDocument.createElement("div");
    el.className = "error-message";
    if (panelWrap) {
      panelWrap.insertBefore(el, panelWrap.firstChild);
    }
  }
  el.textContent = message;
}

export function showConfirmationMessage(panelWrap) {
  if (panelWrap) {
    panelWrap.innerHTML = `<div class="confirmation-message"><p>Check your email for a confirmation link to complete signup.</p></div>`;
  }
}

export function showSuccessMessage(panelWrap, message) {
  if (panelWrap) {
    panelWrap.innerHTML = `<div class="success-message"><p>${message}</p></div>`;
  }
}
