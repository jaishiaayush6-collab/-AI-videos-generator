document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("creatorForm");
  const result = document.getElementById("result");
  const fileInput = document.getElementById("imageFile");
  const preview = document.getElementById("preview");

  if (fileInput && preview) {
    fileInput.addEventListener("change", () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) { preview.hidden = true; preview.removeAttribute("src"); return; }
      if (!file.type.startsWith("image/")) {
        alert("Please choose a valid image file.");
        fileInput.value = "";
        return;
      }
      preview.src = URL.createObjectURL(file);
      preview.hidden = false;
    });
  }

  if (!form || !result) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const prompt = document.getElementById("prompt").value.trim();
    if (!prompt) {
      alert("Please enter a prompt first.");
      return;
    }
    result.className = "result-text";
    result.textContent =
      "Demo preview only\\n\\nYour request:\\n" + prompt +
      "\\n\\nTo generate a real result, connect this form to your own secure backend API. " +
      "The backend should validate the input, call the selected AI service, and return the result URL or content.";
  });
});