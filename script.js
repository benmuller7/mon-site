/*****************************************
 * script.js — Smartimmo.Pro (Apps Script + EmailJS + Debug iPad)
 *****************************************/

/** Génère un ID unique basé sur l'heure actuelle et un nombre aléatoire. */
const generateUniqueId = () => `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

/** URL de ta Web App Apps Script (doit finir par /exec) */
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxgw61JQiws1iKf2HHMl8XGDiw8dDGUxZR6NabXoT88seVFNhgiQDBl5W820wElCwOgjw/exec";

/* =========================================
   === DEBUG HELPER (amovible, spécial iPad) ===
   - Panneau debug embarqué (toggle ?debug=1, appui long 1.5s sur <header>, ou triple-tap)
   - Capture window.onerror / unhandledrejection
   - API: DBG.log(...), DBG.warn(...), DBG.error(...), DBG.show(msgHTML), DBG.clear()
   Pour retirer: supprimer ce bloc + appels DBG.*
========================================= */
(function setupSmartDebug() {
  const qsDebug = /[?&]debug=1\b/.test(location.search);

  const panel = document.createElement('div');
  panel.id = 'smart-debug-panel';
  panel.style.cssText = `
    position: fixed; inset: auto 8px 8px 8px;
    max-height: 42vh; overflow:auto; z-index:999999;
    background:#0b1020; color:#e6f0ff; font:12px/1.4 -apple-system,Segoe UI,Arial;
    border:1px solid #223; border-radius:10px; padding:10px; display:${qsDebug?'block':'none'};
    box-shadow:0 10px 30px rgba(0,0,0,.35);
  `;
  panel.innerHTML = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
    <strong>🐞 Debug</strong>
    <span style="opacity:.7">— iPad console</span>
    <span style="margin-left:auto"></span>
    <button id="dbg-clear" style="background:#263; color:#fff; border:none; border-radius:8px; padding:6px 10px;">Effacer</button>
  </div>
  <div id="dbg-log" style="white-space:pre-wrap;"></div>`;

  const btn = document.createElement('button');
  btn.id = 'smart-debug-toggle';
  btn.type = 'button';
  btn.textContent = '🐞';
  btn.style.cssText = `
    position: fixed; right: 8px; bottom: 56vh; z-index:999999;
    width:44px;height:44px;border-radius:50%;border:none;
    background:#4A5BBE;color:#fff;box-shadow:0 6px 18px rgba(0,0,0,.25);
    display:${qsDebug?'block':'none'};
  `;
  btn.addEventListener('click', ()=>{ panel.style.display = (panel.style.display==='none'?'block':'none'); });

  document.addEventListener('DOMContentLoaded', ()=>{
    document.body.appendChild(panel);
    document.body.appendChild(btn);
  });

  function addLine(kind, args) {
    const log = document.getElementById('dbg-log');
    if (!log) return;
    const time = new Date().toLocaleTimeString();
    const msg = args.map(a=>{
      if (a instanceof Error) return `${a.name}: ${a.message}\n${a.stack||''}`;
      if (typeof a==='object') { try { return JSON.stringify(a,null,2); } catch { return String(a); } }
      return String(a);
    }).join(' ');
    const color = kind==='error'?'#ff8a80':(kind==='warn'?'#ffd180':'#9be7ff');
    const div = document.createElement('div');
    div.style.cssText = `border-left:3px solid ${color};padding-left:8px;margin:6px 0;`;
    div.textContent = `[${time}] ${kind.toUpperCase()} — ${msg}`;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  }

  const DBG = {
    showToggle: () => { btn.style.display = 'block'; },
    hideToggle: () => { btn.style.display = 'none';  },
    open:  () => { panel.style.display = 'block'; },
    close: () => { panel.style.display = 'none';  },
    clear: () => { const log = document.getElementById('dbg-log'); if (log) log.innerHTML=''; },
    log:  (...a)=> addLine('log', a),
    warn: (...a)=> addLine('warn', a),
    error:(...a)=> addLine('error', a),
    show: (html)=> {
      const mc = document.getElementById('messageContainer');
      if (!mc) return alert(html.replace(/<[^>]+>/g,''));
      mc.innerHTML = html; mc.className='message error'; mc.style.display='block';
    }
  };
  window.DBG = DBG;

  // Triple-tap pour afficher le bouton
  document.addEventListener('click', (function(){
    let clicks = 0, t;
    return ()=>{ clicks++; clearTimeout(t); t=setTimeout(()=>{ if (clicks>=3){ DBG.showToggle(); DBG.open(); } clicks=0; }, 450); };
  })());

  // Appui long sur le header pour afficher
  document.addEventListener('DOMContentLoaded', ()=>{
    const header = document.querySelector('header') || document.body;
    let timer=null;
    header.addEventListener('touchstart', ()=>{ timer=setTimeout(()=>{ DBG.showToggle(); DBG.open(); },1500); }, {passive:true});
    header.addEventListener('touchend', ()=>{ clearTimeout(timer); }, {passive:true});
  });

  document.addEventListener('click', (e)=> {
    if (e.target && e.target.id==='dbg-clear') DBG.clear();
  });

  // Hooks globaux d'erreurs
  window.onerror = function (msg, src, line, col, err) {
    DBG.error('window.onerror', {msg, src, line, col, err: (err? (err.stack||err.message||String(err)) : String(msg))});
    DBG.show(`Erreur JS : <code>${String(msg)}</code><br>Source: <code>${src}:${line}:${col}</code>`);
  };
  window.addEventListener('unhandledrejection', (e)=>{
    const r = e.reason || {};
    DBG.error('unhandledrejection', r);
    DBG.show(`Promesse rejetée : <code>${String(r.message||r)}</code>`);
  });
})();
/* ===== FIN DEBUG HELPER ===== */

document.addEventListener('DOMContentLoaded', () => {
  /* Références & UI */
  const form = document.getElementById('repairForm');
  const steps = document.querySelectorAll('.form-step');
  const wizardSteps = document.querySelectorAll('.wizard-step');
  const submitBtn = document.getElementById('submitBtn');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const cguCheckbox = document.getElementById('acceptCgu');
  const selectButtons = document.querySelectorAll('.select-btn');
  const postalCodeInput = document.getElementById('postalCode');
  const cityInput = document.getElementById('city');

  // Conteneur de suggestions de villes
  const citySuggestionsContainer = document.createElement('div');
  citySuggestionsContainer.classList.add('city-suggestions');
  citySuggestionsContainer.setAttribute('role', 'listbox');
  postalCodeInput.parentElement.appendChild(citySuggestionsContainer);

  let currentStep = 0;

  /* Helpers */
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const showMessage = (message, type = 'error', timeout = 8000) => {
    const container = document.getElementById('messageContainer');
    if (!container) { alert(message.replace(/<[^>]+>/g,'')); return; }
    container.innerHTML = message;
    container.className = `message ${type}`;
    container.style.display = 'block';
    if (timeout > 0) {
      clearTimeout(showMessage._t);
      showMessage._t = setTimeout(() => (container.style.display = 'none'), timeout);
    }
  };

  /* Wizard */
  wizardSteps.forEach((stepElem, i) => {
    stepElem.addEventListener('click', () => {
      if (stepElem.classList.contains('completed') || stepElem.classList.contains('active')) {
        currentStep = i; initializeSteps();
      }
    });
  });

  function updateWizardStepsDisplay(iActive) {
    wizardSteps.forEach((stepElem, i) => {
      if (i < iActive) { stepElem.classList.add('completed'); stepElem.classList.remove('active'); }
      else if (i === iActive) { stepElem.classList.add('active'); stepElem.classList.remove('completed'); }
      else { stepElem.classList.remove('active', 'completed'); }
    });
  }

  const initializeSteps = () => {
    steps.forEach((step, index) => step.classList.toggle('active', index === currentStep));
    prevBtn.style.display   = currentStep > 0 ? 'inline-block' : 'none';
    nextBtn.style.display   = currentStep < steps.length - 1 ? 'inline-block' : 'none';
    submitBtn.style.display = currentStep === steps.length - 1 ? 'inline-block' : 'none';
    updateWizardStepsDisplay(currentStep);
    if (currentStep === steps.length - 1) updateSummary();
  };

  const updateSummary = () => {
    const map = {
      summaryRole: 'role',
      summaryName: 'name',
      summaryEmail: 'email',
      summaryPhone: 'phone',
      summaryAddress: 'address',
      summaryType: 'type',
      summaryDescription: 'description',
      summaryPriority: 'priority',
    };
    Object.entries(map).forEach(([sumId, fieldId]) => {
      const inputEl = document.getElementById(fieldId);
      const sumEl = document.getElementById(sumId);
      if (inputEl && sumEl) sumEl.textContent = (inputEl.value || '').trim() || 'Non renseigné';
    });
  };

  /* Sélecteurs (rôle / type / priorité) */
  selectButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const parent = btn.closest('.button-group');
      const hiddenInput = parent.nextElementSibling;
      if (hiddenInput) hiddenInput.value = btn.dataset.value || '';
      parent.querySelectorAll('.select-btn').forEach((b) => {
        b.classList.remove('active'); b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true');
    });
  });

  /* Suggestions de villes via API */
  let debounceTimeout;
  postalCodeInput.addEventListener('input', () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(async () => {
      const cp = postalCodeInput.value.trim();
      if (/^\d{5}$/.test(cp)) {
        try {
          const response = await fetch(
            `https://geo.api.gouv.fr/communes?codePostal=${cp}&fields=nom&format=json&geometry=centre`
          );
          if (!response.ok) throw new Error(`Erreur réseau: ${response.status}`);
          const data = await response.json();
          DBG.log('API communes OK', data);

          if (data.length > 0) {
            citySuggestionsContainer.innerHTML =
              '<ul>' + data.map((city) => `<li tabindex="0">${city.nom}</li>`).join('') + '</ul>';
            citySuggestionsContainer.style.display = 'block';
            citySuggestionsContainer.querySelectorAll('li').forEach((li) => {
              const pick = () => { cityInput.value = li.textContent; citySuggestionsContainer.style.display = 'none'; };
              li.addEventListener('click', pick);
              li.addEventListener('keydown', (e) => { if (e.key === 'Enter') pick(); });
            });
          } else {
            citySuggestionsContainer.innerHTML = '<p>Aucune ville trouvée pour ce code postal.</p>';
            citySuggestionsContainer.style.display = 'block';
          }
        } catch (error) {
          DBG.error('API communes KO', error);
          citySuggestionsContainer.innerHTML = '<p>Impossible de récupérer les données des villes.</p>';
          citySuggestionsContainer.style.display = 'block';
        }
      } else {
        citySuggestionsContainer.style.display = 'none';
      }
    }, 300);
  });

  /* Validation par étape */
  const validateStep = () => {
    const stepEl = steps[currentStep];
    let isValid = true;

    stepEl.querySelectorAll('input[required]:not([type="hidden"]), textarea[required]').forEach((input) => {
      const val = (input.value || '').trim();
      if (input.type === 'email') {
        const ok = validateEmail(val);
        input.classList.toggle('invalid', !ok);
        if (!ok) isValid = false;
      } else {
        const ok = !!val && (!input.pattern || new RegExp(input.pattern).test(val));
        input.classList.toggle('invalid', !ok);
        if (!ok) isValid = false;
      }
    });

    stepEl.querySelectorAll('input[type="hidden"][required]').forEach((hidden) => {
      const ok = !!(hidden.value || '').trim();
      const group = hidden.previousElementSibling?.classList?.contains('button-group') ? hidden.previousElementSibling : null;
      if (group) group.classList.toggle('invalid', !ok);
      if (!ok) isValid = false;
    });

    return isValid;
  };

  document.querySelectorAll('input, textarea').forEach((el) =>
    el.addEventListener('input', () => el.classList.remove('invalid'))
  );

  /* Navigation */
  prevBtn.addEventListener('click', () => { if (currentStep > 0) { currentStep--; initializeSteps(); } });
  nextBtn.addEventListener('click', () => {
    if (!validateStep()) { showMessage('Veuillez remplir tous les champs obligatoires correctement avant de continuer.', 'error'); return; }
    if (currentStep < steps.length - 1) { currentStep++; initializeSteps(); }
  });

  /* Reset & confirmation */
  const resetForm = () => {
    form.reset();
    document.querySelector('.form-step.confirmation')?.remove();
    document.querySelectorAll('[id^="summary"]').forEach((el) => el.textContent = 'Non renseigné');
    currentStep = 0; initializeSteps();
  };

  const showConfirmationMessage = (requestId) => {
    const confirmationStep = document.createElement('div');
    confirmationStep.classList.add('form-step', 'confirmation');
    confirmationStep.innerHTML = `
      <h2>Confirmation</h2>
      <p>Votre demande a été enregistrée avec succès.</p>
      <p>Numéro unique : <strong>${requestId}</strong></p>
      <p>Nous vous contacterons prochainement.</p>
      <button id="newRequestBtn" class="action-btn">Faire une autre demande</button>
    `;
    document.querySelector('.form-container').appendChild(confirmationStep);
    steps.forEach((s) => s.classList.remove('active'));
    confirmationStep.classList.add('active');
    prevBtn.style.display = 'none'; nextBtn.style.display = 'none'; submitBtn.style.display = 'none';
    updateWizardStepsDisplay(steps.length);
    document.getElementById('newRequestBtn').addEventListener('click', resetForm);
  };

  /* ===== Soumission : Apps Script -> EmailJS ===== */
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!validateStep()) {
      showMessage('Veuillez remplir tous les champs obligatoires correctement avant de soumettre.', 'error');
      return;
    }
    if (!cguCheckbox?.checked) {
      showMessage('Vous devez accepter les Conditions Générales d’Utilisation avant de soumettre le formulaire.', 'error');
      return;
    }

    const requestId = generateUniqueId();
    const data = {
      name: document.getElementById('name').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      address: document.getElementById('address').value.trim(),
      city: (cityInput.value || '').trim(),
      postalCode: (postalCodeInput.value || '').trim(),
      addressComplement: (document.getElementById('addressComplement').value || 'Non renseigné').trim(),
      role: document.getElementById('role').value.trim(),
      type: document.getElementById('type').value.trim(),
      description: document.getElementById('description').value.trim(),
      priority: document.getElementById('priority').value.trim(),
      request_id: requestId
    };

    try {
      // 1) Enregistrer dans Google Sheet via Apps Script — SANS headers (évite le préflight iOS)
      let resp;
      try {
        resp = await fetch(WEB_APP_URL, {
          method: "POST",
          // ne pas mettre de headers pour éviter OPTIONS/CORS sur iOS
          body: JSON.stringify(data)
        });
      } catch (netErr) {
        DBG.error('Apps Script fetch KO', netErr);
        showMessage(`Connexion à Apps Script impossible.<br><code>${netErr && netErr.message}</code>`, 'error', 12000);
        return;
      }

      if (!resp.ok) {
        const text = await resp.text().catch(()=>"(réponse vide)");
        DBG.error('Apps Script HTTP != 200', { status: resp.status, text });
        showMessage(`Apps Script a répondu <b>${resp.status}</b>.<br><code>${text}</code>`, 'error', 15000);
        return;
      }

      let result;
      try { result = await resp.json(); }
      catch (parseErr) {
        const raw = await resp.text().catch(()=>"(vide)");
        DBG.error('Apps Script JSON parse KO', { parseErr, raw });
        showMessage(`Réponse Apps Script invalide (JSON).<br><code>${raw}</code>`, 'error', 12000);
        return;
      }

      if (result.status !== 'success') {
        DBG.error('Apps Script payload error', result);
        showMessage(`Erreur Apps Script : <code>${result.message || 'Inconnue'}</code>`, 'error', 12000);
        return;
      }

      const finalRequestId = result.requestId || requestId;
      DBG.log('Apps Script OK', result);

      // 2) Envoyer les emails (ne bloque pas la confirmation si ça échoue)
      let emailWarningShown = false;

      if (!window.emailjs || typeof emailjs.init !== 'function' || typeof emailjs.send !== 'function') {
        DBG.warn('EmailJS non chargé – on confirme quand même');
        showMessage("Demande enregistrée ✅, mais EmailJS n'est pas chargé.", 'error', 10000);
        emailWarningShown = true;
      } else {
        try { emailjs.init('mgZZQLZBSBI7EbaiG'); } catch(e){ DBG.error('emailjs.init KO', e); }

        const toOwner = emailjs.send('service_uzzmtzc', 'template_bes6bcg', {
          to_email:'ben@smartimmo.pro', ...data, request_id: finalRequestId
        });
        const toClient = emailjs.send('service_uzzmtzc', 'template_dtvz9jh', {
          to_email: data.email, ...data, request_id: finalRequestId
        });

        const results = await Promise.allSettled([toOwner, toClient]);
        DBG.log('EmailJS results', results);
        const someFail = results.some(r => r.status === 'rejected');
        if (someFail) {
          showMessage("Demande enregistrée ✅, mais l'email n'a pas pu être envoyé à tous les destinataires.", 'error', 12000);
          emailWarningShown = true;
        }
      }

      // 3) Confirmation (toujours si enregistrement OK)
      if (!emailWarningShown) showMessage("Demande enregistrée ✅ et emails envoyés.", 'success', 4000);
      showConfirmationMessage(finalRequestId);

    } catch (err) {
      DBG.error('Soumission KO', err);
      showMessage(`Erreur inattendue.<br><code>${err && err.message}</code>`, 'error', 15000);
    }
  });

  /* GO */
  initializeSteps();

  // Alerte utile si la page est ouverte en file:// (Textastic Local)
  if (location.protocol === 'file:') {
    showMessage(
      "Vous visualisez la page en <b>local (file://)</b>. Les enregistrements vers Google Apps Script peuvent être <b>bloqués</b> par le navigateur.<br>" +
      "Ouvrez le site via <b>https://smartimmo.pro</b> (ou Textastic en mode <b>Remote</b>).",
      'error',
      15000
    );
  }
});