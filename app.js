const tools = [
  { id:"text-to-video", icon:"🎬", title:"Text to Video", desc:"Generate a video from a text prompt.", label:"Describe your video idea", placeholder:"A cinematic scene of a peaceful Himalayan village at sunrise…", hint:"Describe the subject, setting, motion, lighting and camera style.", kind:"video" },
  { id:"text-to-movie", icon:"🎥", title:"Text to Movie", desc:"Create a short movie scene from your idea.", label:"Describe your movie scene", placeholder:"A short adventure film scene about two friends exploring an ancient city…", hint:"Write a scene description. For longer films, generate separate scenes and edit them together.", kind:"video" },
  { id:"text-to-image", icon:"🖼️", title:"Text to Image", desc:"Turn words into an original image.", label:"Describe the image you want", placeholder:"A beautiful traditional Nepali village beneath the Himalayas, cinematic light…", hint:"Mention subject, environment, art style, lighting and composition.", kind:"text" },
  { id:"text-to-voice", icon:"🎙️", title:"Text to Voice", desc:"Convert a script into spoken audio.", label:"Enter the text to speak", placeholder:"Namaste! Welcome to my creative studio…", hint:"Use punctuation to help the voice sound natural.", kind:"voice" },
  { id:"text-to-story", icon:"📖", title:"Text to Story", desc:"Write a story from your idea.", label:"What should the story be about?", placeholder:"A young student discovers a mysterious old book in a village library…", hint:"Include the characters, setting, mood and preferred ending.", kind:"text" },
  { id:"text-to-song", icon:"🎵", title:"Text to Song", desc:"Create a song from a prompt.", label:"Describe your song", placeholder:"An uplifting Nepali folk-pop song about friendship and hope…", hint:"Describe genre, mood, language, instruments and theme. A compatible music model must be configured.", kind:"video" },
  { id:"image-to-video", icon:"✨", title:"Image to Video", desc:"Animate a still image into a video.", label:"Describe the motion", placeholder:"Gentle camera push-in, moving clouds and subtle natural movement…", hint:"Upload an image, then describe the motion and camera movement.", kind:"image-video" },
  { id:"image-to-story", icon:"📚", title:"Image to Story", desc:"Write a story inspired by an image.", label:"Add a story direction (optional)", placeholder:"Write a warm, imaginative story inspired by this scene…", hint:"Upload an image. You can add a theme or story direction.", kind:"image-text" },
  { id:"image-to-song", icon:"🎼", title:"Image to Song", desc:"Create music inspired by an image.", label:"Describe the music mood", placeholder:"Create a peaceful, cinematic instrumental inspired by the colours and mood…", hint:"Upload an image and describe the sound or mood. A compatible music model must be configured.", kind:"image-video" },
  { id:"ai-editor", icon:"✂️", title:"AI Editor", desc:"Improve, rewrite and polish your text.", label:"Paste the content you want to edit", placeholder:"Paste your paragraph, script, caption or draft here…", hint:"Specify the desired tone or improvement in your prompt, or paste the text as-is.", kind:"text" }
];

const $ = (id) => document.getElementById(id);
const dashboard = $("dashboard");
const generator = $("generator");
const form = $("generatorForm");
const promptField = $("prompt");
const resultBody = $("resultBody");
let activeTool = null;
let selectedImage = null;
let toastTimer;

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3800);
}

function renderTools() {
  $("toolGrid").innerHTML = tools.map(tool => `
    <button class="tool-card" type="button" data-open="${tool.id}">
      <span class="tool-icon">${tool.icon}</span>
      <span><b>${tool.title}</b><small>${tool.desc}</small></span>
      <span class="arrow">↗</span>
    </button>`).join("");
  $("toolGrid").querySelectorAll("[data-open]").forEach(button => button.addEventListener("click", () => openTool(button.dataset.open)));
}

function openTool(id) {
  activeTool = tools.find(tool => tool.id === id);
  if (!activeTool) return;
  dashboard.classList.add("hidden");
  generator.classList.remove("hidden");
  $("crumb").textContent = activeTool.title;
  $("toolTitle").textContent = activeTool.title;
  $("toolSubtitle").textContent = activeTool.desc;
  $("promptLabel").textContent = activeTool.label;
  promptField.placeholder = activeTool.placeholder;
  promptField.required = activeTool.id !== "image-to-story";
  promptField.value = "";
  $("formHint").textContent = activeTool.hint;
  const needsImage = activeTool.kind === "image-video" || activeTool.kind === "image-text";
  $("imageUploadWrap").classList.toggle("hidden", !needsImage);
  $("videoOptions").classList.toggle("hidden", activeTool.kind !== "video" && activeTool.kind !== "image-video");
  $("voiceOptions").classList.toggle("hidden", activeTool.kind !== "voice");
  clearSelectedImage();
  resetResult();
  document.querySelectorAll(".nav-item").forEach(button => button.classList.toggle("active", button.dataset.mode === id));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetResult() {
  $("resultStatus").textContent = "READY";
  $("resultSubtitle").textContent = "Your output will appear here";
  resultBody.className = "empty-result";
  resultBody.innerHTML = '<span class="result-icon">✧</span><b>Your result will appear here</b><p>Enter a prompt and select Generate to get started.</p>';
}

function clearSelectedImage() {
  selectedImage = null;
  $("imageInput").value = "";
  $("imagePreview").hidden = true;
  $("imagePreview").removeAttribute("src");
  $("uploadPlaceholder").classList.remove("hidden");
  $("removeImage").classList.add("hidden");
}

function setLoading(message = "Creating your result…") {
  $("resultStatus").textContent = "WORKING";
  $("resultSubtitle").textContent = message;
  resultBody.className = "empty-result";
  resultBody.innerHTML = `<div class="spinner"></div><b>${message}</b><p>This may take a little while. Keep this page open.</p>`;
}

function addHistory(tool, description, resultType) {
  let history = [];
  try { history = JSON.parse(localStorage.getItem("creatorHistory") || "[]"); } catch {}
  history.unshift({ tool: tool.title, icon: tool.icon, description: description.slice(0, 90), resultType, time: new Date().toLocaleString() });
  localStorage.setItem("creatorHistory", JSON.stringify(history.slice(0, 8)));
  renderHistory();
}

function renderHistory() {
  let history = [];
  try { history = JSON.parse(localStorage.getItem("creatorHistory") || "[]"); } catch {}
  $("historyList").innerHTML = history.length ? history.map(item => `
    <div class="history-item"><span class="mini-icon">${item.icon}</span><div><b>${escapeHtml(item.tool)}</b><small>${escapeHtml(item.description)} · ${escapeHtml(item.time)}</small></div></div>`).join("") : '<div class="empty-history">Your recent generations will appear here.</div>';
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[char]);
}

function showText(text) {
  resultBody.className = "result-content";
  resultBody.textContent = text;
  $("resultStatus").textContent = "COMPLETED";
  $("resultSubtitle").textContent = "Your text result is ready";
}

function showMedia(result) {
  resultBody.className = "result-content";
  if (result.type === "image") {
    const source = result.dataUrl || result.url;
    const img = document.createElement("img");
    img.src = source;
    img.alt = "AI generated image";
    resultBody.appendChild(img);
    addDownload(source, "ai-creator-image.png", "Download image");
  } else if (result.type === "audio") {
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.src = result.dataUrl;
    resultBody.appendChild(audio);
    addDownload(result.dataUrl, "ai-creator-voice.mp3", "Download audio");
  }
  $("resultStatus").textContent = "COMPLETED";
  $("resultSubtitle").textContent = "Your media result is ready";
}

function addDownload(href, filename, label) {
  const link = document.createElement("a");
  link.className = "download-btn";
  link.href = href;
  link.download = filename;
  link.textContent = "↓ " + label;
  link.target = href.startsWith("http") ? "_blank" : "_self";
  link.rel = "noopener";
  resultBody.appendChild(link);
}

async function pollJob(jobId) {
  const started = Date.now();
  while (Date.now() - started < 8 * 60 * 1000) {
    await new Promise(resolve => setTimeout(resolve, 4000));
    const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Could not check generation status.");
    if (data.status === "succeeded") {
      const output = data.output;
      const urls = Array.isArray(output) ? output : [output];
      const mediaUrl = urls.find(value => typeof value === "string" && /^https?:\/\//.test(value));
      if (!mediaUrl) throw new Error("The provider finished but did not return a downloadable media URL.");
      const isAudio = activeTool.id.includes("song");
      resultBody.className = "result-content";
      if (isAudio) {
        const audio = document.createElement("audio");
        audio.controls = true;
        audio.src = mediaUrl;
        resultBody.appendChild(audio);
      } else {
        const video = document.createElement("video");
        video.controls = true;
        video.playsInline = true;
        video.src = mediaUrl;
        resultBody.appendChild(video);
      }
      addDownload(mediaUrl, isAudio ? "ai-creator-song.mp3" : "ai-creator-video.mp4", "Open / download result");
      $("resultStatus").textContent = "COMPLETED";
      $("resultSubtitle").textContent = "Your media is ready";
      return;
    }
    if (data.status === "failed" || data.status === "canceled") {
      throw new Error(data.error || `Generation ${data.status}.`);
    }
    $("resultSubtitle").textContent = `Generation status: ${data.status || "processing"}`;
  }
  throw new Error("This generation is taking longer than expected. Check your provider dashboard for its status.");
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  if (!activeTool) return;
  const prompt = promptField.value.trim();
  const requiresPrompt = activeTool.id !== "image-to-story";
  if (requiresPrompt && !prompt) return showToast("Please enter a prompt first.");
  if ((activeTool.kind === "image-video" || activeTool.kind === "image-text") && !selectedImage) {
    return showToast("Please upload an image first.");
  }

  const formData = new FormData();
  formData.append("mode", activeTool.id);
  formData.append("prompt", prompt);
  formData.append("duration", $("duration").value);
  formData.append("aspectRatio", $("aspectRatio").value);
  if (selectedImage) formData.append("image", selectedImage);

  const button = $("generateBtn");
  button.disabled = true;
  button.textContent = "Generating…";
  setLoading();
  try {
    let response;
    try {
      response = await fetch("/api/generate", { method: "POST", body: formData });
    } catch {
      throw new Error("Cannot reach the backend. Start the Node.js server with npm start and open http://localhost:3000.");
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Generation request failed (HTTP ${response.status}).`);
    if (data.type === "job" && data.job?.id) {
      setLoading("Your media is processing…");
      await pollJob(data.job.id);
      addHistory(activeTool, prompt || "Image-based creation", "media");
    } else if (data.type === "text") {
      showText(data.text);
      addHistory(activeTool, prompt, "text");
    } else if (data.type === "image" || data.type === "audio") {
      showMedia(data);
      addHistory(activeTool, prompt, data.type);
    } else {
      throw new Error("The server returned an unsupported result.");
    }
  } catch (error) {
    $("resultStatus").textContent = "ERROR";
    $("resultSubtitle").textContent = "Generation could not be completed";
    resultBody.className = "empty-result";
    resultBody.innerHTML = `<span class="result-icon">!</span><b>Something went wrong</b><p>${escapeHtml(error.message)}</p>`;
    showToast(error.message);
  } finally {
    button.disabled = false;
    button.innerHTML = "<span>✦</span> Generate";
  }
});

$("imageInput").addEventListener("change", event => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) {
    showToast("Choose a PNG, JPG or WEBP image up to 10 MB.");
    clearSelectedImage();
    return;
  }
  selectedImage = file;
  $("imagePreview").src = URL.createObjectURL(file);
  $("imagePreview").hidden = false;
  $("uploadPlaceholder").classList.add("hidden");
  $("removeImage").classList.remove("hidden");
});
$("removeImage").addEventListener("click", clearSelectedImage);
$("backHome").addEventListener("click", () => {
  generator.classList.add("hidden");
  dashboard.classList.remove("hidden");
  $("crumb").textContent = "Dashboard";
  document.querySelectorAll(".nav-item").forEach(button => button.classList.toggle("active", button.dataset.mode === "dashboard"));
});
document.querySelectorAll(".nav-item").forEach(button => button.addEventListener("click", () => {
  if (button.dataset.mode === "dashboard") {
    generator.classList.add("hidden"); dashboard.classList.remove("hidden");
    $("crumb").textContent = "Dashboard";
    document.querySelectorAll(".nav-item").forEach(item => item.classList.toggle("active", item === button));
  } else openTool(button.dataset.mode);
}));
$("clearHistory").addEventListener("click", () => {
  localStorage.removeItem("creatorHistory"); renderHistory(); showToast("History cleared from this browser.");
});
$("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("light");
  localStorage.setItem("creatorTheme", document.body.classList.contains("light") ? "light" : "dark");
});
if (localStorage.getItem("creatorTheme") === "light") document.body.classList.add("light");

async function checkServer() {
  const indicator = $("apiStatus");
  try {
    const response = await fetch("/api/health");
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error("Backend offline");
    const openaiReady = Boolean(data.providers?.openai?.configured);
    const replicateReady = Boolean(data.providers?.replicate?.configured);
    const anyProvider = openaiReady || replicateReady;
    indicator.textContent = anyProvider
      ? `Backend online · OpenAI ${openaiReady ? "ready" : "not set"} · Replicate ${replicateReady ? "ready" : "not set"}`
      : "Backend online · API keys not configured";
    indicator.className = anyProvider ? "api-indicator online" : "api-indicator offline";
    indicator.title = "API keys are checked on the server and are never sent to the browser.";
  } catch {
    indicator.textContent = "Backend offline";
    indicator.className = "api-indicator offline";
  }
}
renderTools();
renderHistory();
checkServer();
