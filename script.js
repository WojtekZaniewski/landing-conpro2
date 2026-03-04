const form = document.querySelector("#lead-form");
const statusEl = document.querySelector("#form-status");
const newsletterModal = document.querySelector("#newsletter-modal");
const newsletterForm = document.querySelector("#newsletter-form");
const newsletterStatusEl = document.querySelector("#newsletter-status");
const newsletterEmailInput = document.querySelector("#newsletter-email");
const redirectScreen = document.querySelector("#redirect-screen");
const LEAD_NOTIFICATION_EMAIL = "kancelaria.krakow@conpro.pl";
const CALENDLY_BOOKING_URL =
  "https://calendly.com/kancelaria-krakow-conpro/30min?back=1&month=2026-03";
const FORM_SUBMIT_ENDPOINT = `https://formsubmit.co/ajax/${encodeURIComponent(
  LEAD_NOTIFICATION_EMAIL
)}`;

function setNewsletterStatus(message, type) {
  if (!newsletterStatusEl) return;
  newsletterStatusEl.textContent = message;
  newsletterStatusEl.classList.remove("ok", "err");
  if (type) newsletterStatusEl.classList.add(type);
}

function closeNewsletterModal() {
  if (!newsletterModal) return;
  newsletterModal.classList.remove("active");
  newsletterModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function openNewsletterModal() {
  if (!newsletterModal) return;
  newsletterModal.classList.add("active");
  newsletterModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  if (newsletterEmailInput) newsletterEmailInput.focus();
}

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.classList.remove("ok", "err");
  if (type) statusEl.classList.add(type);
}

function showRedirectScreen() {
  if (!redirectScreen) return;
  redirectScreen.classList.add("active");
  redirectScreen.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function setCampaignParams() {
  const params = new URLSearchParams(window.location.search);
  const set = (name) => {
    const field = document.getElementById(name);
    if (!field) return;
    field.value = params.get(name) || "";
  };

  set("utm_source");
  set("utm_medium");
  set("utm_campaign");
  set("utm_content");

  if (!params.get("utm_source")) {
    const utmSourceField = document.getElementById("utm_source");
    if (utmSourceField) utmSourceField.value = "meta_ads";
  }
}

function isValidPhone(value) {
  const digits = value.replace(/[^\d+]/g, "");
  return digits.length >= 9;
}

async function submitLead(payload) {
  if (!LEAD_NOTIFICATION_EMAIL) {
    return { ok: false, configError: true };
  }

  const response = await fetch(FORM_SUBMIT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      ...payload,
      sourcePage: window.location.href,
      submittedAt: new Date().toISOString(),
      _subject: "Nowy lead - Meta Ads - Windykacja",
      _template: "table",
      _captcha: "false",
    }),
  });

  const body = await response.json().catch(() => ({}));
  return {
    ok: response.ok && body.success !== "false",
    configError: false,
    message: body.message || "",
  };
}

async function submitNewsletterLead(email) {
  if (!LEAD_NOTIFICATION_EMAIL) return { ok: false, configError: true };
  const response = await fetch(FORM_SUBMIT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      newsletterEmail: email,
      sourcePage: window.location.href,
      submittedAt: new Date().toISOString(),
      _subject: "Newsletter lead - checklista windykacji należności",
      _template: "table",
      _captcha: "false",
    }),
  });

  const body = await response.json().catch(() => ({}));
  return {
    ok: response.ok && body.success !== "false",
    configError: false,
    message: body.message || "",
  };
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("", "");

  const data = new FormData(form);
  const payload = Object.fromEntries(data.entries());

  if (!isValidPhone(payload.phone || "")) {
    setStatus("Podaj poprawny numer telefonu.", "err");
    return;
  }

  if (!payload.rodoConsent) {
    setStatus("Musisz zaznaczyć zgodę RODO.", "err");
    return;
  }

  const button = form.querySelector(".submit-btn");
  button.disabled = true;
  button.textContent = "Wysyłanie...";

  try {
    const result = await submitLead(payload);
    if (result.configError) {
      setStatus(
        "Skonfiguruj adres e-mail i link Calendly w pliku script.js, aby uruchomić workflow.",
        "err"
      );
      return;
    }
    if (!result.ok) {
      if (result.message.includes("open this page through a web server")) {
        setStatus("Uruchom stronę przez serwer (np. http://localhost:5500), a nie z pliku index.html.", "err");
        return;
      }
      if (result.message.includes("activate your form")) {
        setStatus(`Sprawdź skrzynkę ${LEAD_NOTIFICATION_EMAIL} i kliknij link aktywacyjny FormSubmit.`, "err");
        return;
      }
      throw new Error("Submit failed");
    }

    form.reset();
    setCampaignParams();
    setStatus("", "");
    showRedirectScreen();
    setTimeout(() => {
      window.location.href = CALENDLY_BOOKING_URL;
    }, 1600);
  } catch (error) {
    setStatus(
      "Wystąpił błąd podczas wysyłki. Spróbuj ponownie lub skontaktuj się telefonicznie.",
      "err"
    );
  } finally {
    button.disabled = false;
    button.textContent = "Wyślij formularz";
  }
});

setCampaignParams();

if (newsletterModal) {
  openNewsletterModal();

  document
    .querySelectorAll("[data-close-newsletter], #newsletter-close")
    .forEach((element) => {
      element.addEventListener("click", closeNewsletterModal);
    });

  newsletterForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setNewsletterStatus("", "");

    const email = newsletterEmailInput?.value?.trim() || "";
    if (!email) {
      setNewsletterStatus("Podaj poprawny adres e-mail.", "err");
      return;
    }

    const submitButton = newsletterForm.querySelector(".newsletter-btn");
    submitButton.disabled = true;
    submitButton.textContent = "Wysyłanie...";

    try {
      const result = await submitNewsletterLead(email);
      if (result.configError) {
        setNewsletterStatus("Skonfiguruj adres e-mail odbiorcy w script.js.", "err");
        return;
      }
      if (!result.ok) {
        if (result.message.includes("open this page through a web server")) {
          setNewsletterStatus("Uruchom stronę przez serwer (localhost), wtedy zapis zadziała.", "err");
          return;
        }
        if (result.message.includes("activate your form")) {
          setNewsletterStatus(`Aktywuj formularz przez link wysłany na ${LEAD_NOTIFICATION_EMAIL}.`, "err");
          return;
        }
        throw new Error("Newsletter submit failed");
      }

      setNewsletterStatus("Dziękujemy! Checklistę wyślemy na podany adres.", "ok");
      setTimeout(closeNewsletterModal, 700);
    } catch (error) {
      setNewsletterStatus("Nie udało się zapisać. Spróbuj ponownie.", "err");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Wyślij i odbierz checklistę";
    }
  });
}
