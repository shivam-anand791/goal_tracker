// -------- CONFIG --------

const API_URL = "http://localhost:5000/api";
const TOKEN_KEY = "token";

// Compatibility with simpler snippet: expose AUTH_URL and TOKEN
const AUTH_URL = "http://localhost:5000/api/auth";
let TOKEN = localStorage.getItem(TOKEN_KEY) || null;

// -------- DOM ELEMENTS --------

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const errorMsg = document.getElementById("errorMsg");
const successMsg = document.getElementById("successMsg");

// -------- INIT --------

document.addEventListener("DOMContentLoaded", () => {
  // Check if user already logged in
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    redirectToApp();
  }

  // Form submissions
  loginForm.addEventListener("submit", handleLogin);
  registerForm.addEventListener("submit", handleRegister);
});

// -------- FORM TOGGLE --------

function toggleForms() {
  loginForm.classList.toggle("active");
  registerForm.classList.toggle("active");
  clearMessages();
}

// Simple global functions (compatible with the snippet you provided)
// These will read inputs with ids `email` and `password` if present,
// otherwise they fall back to the form inputs used above.
async function login() {
  const emailEl = document.getElementById("email") || document.getElementById("loginEmail");
  const passwordEl = document.getElementById("password") || document.getElementById("loginPassword");
  if (!emailEl || !passwordEl) return;

  const email = emailEl.value.trim();
  const password = passwordEl.value;

  try {
    const res = await fetch(`${AUTH_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (res.ok && data.token) {
      TOKEN = data.token;
      // store token under the standardized key
      localStorage.setItem(TOKEN_KEY, data.token);
      // hide legacy authScreen if present
      const authScreen = document.getElementById("authScreen");
      if (authScreen) authScreen.style.display = "none";
      redirectToApp();
    } else {
      alert(data.message || "Login failed");
    }
  } catch (err) {
    console.error(err);
    alert("Network error");
  }
}

async function register() {
  const emailEl = document.getElementById("email") || document.getElementById("regEmail");
  const passwordEl = document.getElementById("password") || document.getElementById("regPassword");
  if (!emailEl || !passwordEl) return;

  const email = emailEl.value.trim();
  const password = passwordEl.value;

  try {
    const res = await fetch(`${AUTH_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: email.split("@")[0], email, password })
    });
    const data = await res.json();
    if (res.ok) {
      alert("Registered. Now log in.");
    } else {
      alert(data.message || "Registration failed");
    }
  } catch (err) {
    console.error(err);
    alert("Network error");
  }
}

// -------- LOGIN --------

async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) {
    showError("Please fill in all fields");
    return;
  }

  try {
    showError(""); // clear previous errors
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      showError(data.message || "Login failed");
      return;
    }

    // Save token and redirect
    localStorage.setItem(TOKEN_KEY, data.token);
    showSuccess("Login successful! Redirecting...");
    setTimeout(() => redirectToApp(), 1500);
  } catch (err) {
    showError("Network error. Please try again.");
    console.error(err);
  }
}

// -------- REGISTER --------

async function handleRegister(e) {
  e.preventDefault();

  const name = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;
  const confirmPassword = document.getElementById("regConfirmPassword").value;

  if (!name || !email || !password || !confirmPassword) {
    showError("Please fill in all fields");
    return;
  }

  if (password.length < 6) {
    showError("Password must be at least 6 characters");
    return;
  }

  if (password !== confirmPassword) {
    showError("Passwords do not match");
    return;
  }

  try {
    showError(""); // clear previous errors
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      showError(data.message || "Registration failed");
      return;
    }

    showSuccess("Registration successful! Logging in...");
    // Auto-login after successful registration
    setTimeout(() => handleLogin(new Event("submit")), 1500);
  } catch (err) {
    showError("Network error. Please try again.");
    console.error(err);
  }
}

// -------- MESSAGE HELPERS --------

function showError(msg) {
  if (!msg) {
    errorMsg.classList.remove("show");
    return;
  }
  errorMsg.textContent = msg;
  errorMsg.classList.add("show");
  successMsg.classList.remove("show");
}

function showSuccess(msg) {
  if (!msg) {
    successMsg.classList.remove("show");
    return;
  }
  successMsg.textContent = msg;
  successMsg.classList.add("show");
  errorMsg.classList.remove("show");
}

function clearMessages() {
  errorMsg.classList.remove("show");
  successMsg.classList.remove("show");
}

// -------- REDIRECT --------

function redirectToApp() {
  window.location.href = "index.html";
}
