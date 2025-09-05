/*****************************************
 * script.js — version complète (Smartimmo)
 * - Wizard multi-étapes + validations
 * - Popup hors zone (départements autorisés)
 * - Suggestions de villes (API Gouv)
 * - Récap + spinner + confirmation
 * - Waitlist popup
 * - EmailJS (2 emails)
 * - Enregistrement Google Sheet via Apps Script
 * - Debug iPad (coccinelle) activable
 *****************************************/

/** Génère un ID unique format : DEP-YYMMDDHHMM-RR */
const generateUniqueId = (postalCode) => {
  const dep = (postalCode || '').slice(0, 2) || '00';
  const now = new Date();
  const YY = String(now.getFullYear()).slice(-2);
  const MM = String(now.getMonth() + 1).padStart(2, "0");
  const DD = String(now.getDate()).padStart(2, "0");
  const HH = String(now.getHours()).padStart(2, "0");
  const MI = String(now.getMinutes()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 90 + 10);
  return `${dep}-${YY}${MM}${DD}${HH}${MI}-${rand}`;
};

/** Départements autorisés */
const ALLOWED_DEPARTMENTS = ['08', '51'];

/** URL Apps Script (Web App /exec) — utilise bien TON URL déployée */
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxgw61JQiws1iKf2HHMl8XGDiw8dDGUxZR6NabXoT88seVFNhgiQDBl5W820wElCwOgjw/exec";

/* =========================================
   DEBUG HELPER iPad (amovible)
   Active: ?debug=1, triple-tap, ou appui long (1.5s) sur <header>
========================================= */
(function setupSmartDebug() {
  const qsDebug = /[?&]debug=1\b/.test(location.search);
  const panel = document.createElement('div');
  panel.id = 'smart-debug-panel';
  panel.style.cssText = `position:fixed;left:8px;right:8px;bottom:8px;max-height:42vh;overflow:auto;z-index:999999;background:#0b1020;color:#e6f0ff;font:12px/1.4 -apple-system,Segoe UI,Arial;border:1px solid #223;border-radius:10px;padding:10px;display:${qsDebug?'block':'none'};box-shadow:0 10px 30px rgba(0,0,0,.35);`;
  panel.innerHTML = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
    <strong>🐞 Debug</strong><span style="opacity:.7">— iPad console</span><span style="margin-left:auto"></span>
    <button id="dbg-clear" style="background:#263;color:#fff;border:none;border-radius:8px;padding:6px 10px;">Effacer</button>
  </div><div id="dbg-log" style="white-space:pre-wrap;"></div>`;
  const btn = document.createElement('button');
  btn.id = 'smart-debug-toggle'; btn.type='button'; btn.textContent='🐞';
  btn.style.cssText = `position:fixed;right:8px;bottom:56vh;z-index:999999;width:44px;height:44px;border-radius:50%;border:none;background:#4A5BBE;color:#fff;box-shadow:0 6px 18px rgba(0,0,0,.25);display:${qsDebug?'block':'none'};`;
  btn.addEventListener('click', ()=>{ panel.style.display = (panel.style.display==='none'?'block':'none'); });
  document.addEventListener('DOMContentLoaded', ()=>{ document.body.appendChild(panel); document.body.appendChild(btn); });
  function addLine(kind,args){ const log=document.getElementById('dbg-log'); if(!log) return;
    const t=new Date().toLocaleTimeString();
    const msg=args.map(a=>a instanceof Error?`${a.name}: ${a.message}\n${a.stack||''}`: typeof a==='object'?(()=>{try{return JSON.stringify(a,null,2)}catch{return String(a)}})():String(a)).join(' ');
    const color=kind==='error'?'#ff8a80':(kind==='warn'?'#ffd180':'#9be7ff');
    const div=document.createElement('div'); div.style.cssText=`border-left:3px solid ${color};padding-left:8px;margin:6px 0;`; div.textContent=`[${t}] ${kind.toUpperCase()} — ${msg}`;
    log.appendChild(div); log.scrollTop=log.scrollHeight; }
  const DBG={ showToggle:()=>{btn.style.display='block'}, open:()=>{panel.style.display='block'}, clear:()=>{const l=document.getElementById('dbg-log'); if(l) l.innerHTML='';},
    log:(...a)=>addLine('log',a), warn:(...a)=>addLine('warn',a), error:(...a)=>addLine('error',a),
    show:(html)=>{ const mc=document.getElementById('messageContainer'); if(!mc) return alert(html.replace(/<[^>]+>/g,'')); mc.innerHTML=html; mc.className='message error'; mc.style.display='block'; }};
  window.DBG=DBG;
  document.addEventListener('click', (function(){ let c=0,t; return ()=>{ c++; clearTimeout(t); t=setTimeout(()=>{ if(c>=3){ DBG.showToggle(); DBG.open(); } c=0; }, 450); }; })());
  document.addEventListener('DOMContentLoaded', ()=>{ const header=document.querySelector('header')||document.body; let timer=null;
    header.addEventListener('touchstart', ()=>{ timer=setTimeout(()=>{ DBG.showToggle(); DBG.open(); },1500); }, {passive:true});
    header.addEventListener('touchend', ()=>{ clearTimeout(timer); }, {passive:true}); });
  document.addEventListener('click', (e)=>{ if(e.target && e.target.id==='dbg-clear') DBG.clear(); });
  window.onerror=(msg,src,line,col,err)=>{ DBG.error('window.onerror',{msg,src,line,col,err:(err?(err.stack||err.message||String(err)):String(msg))}); DBG.show(`Erreur JS : <code>${String(msg)}</code><br>Source: <code>${src}:${line}:${col}</code>`); };
  window.addEventListener('unhandledrejection',(e)=>{ const r=e.reason||{}; DBG.error('unhandledrejection',r); DBG.show(`Promesse rejetée : <code>${String(r.message||r)}</code>`); });
})();
/* ===== FIN DEBUG HELPER ===== */

document.addEventListener('DOMContentLoaded', () => {
  /* ========= EmailJS ========= */
  if (window.emailjs && typeof emailjs.init === 'function') {
    emailjs.init('mgZZQLZBSBI7EbaiG');
  }

  /* ========= Références ========= */
  const form = document.getElementById('repairForm');
  const steps = document.querySelectorAll('.form-step');
  const wizardSteps = document.querySelectorAll('.wizard-step');

  const submitBtn = document.getElementById('submitBtn');
  const prevBtn   = document.getElementById('prevBtn');
  const nextBtn   = document.getElementById('nextBtn');
  const cguCheckbox = document.getElementById('acceptCgu');

  const messageContainer = document.getElementById('messageContainer');

  const postalCodeInput = document.getElementById('postalCode');
  const cityInput = document.getElementById('city');

  // Suggestions ville
  const citySuggestionsContainer = document.createElement('div');
  citySuggestionsContainer.classList.add('city-suggestions');
  citySuggestionsContainer.setAttribute('role', 'listbox');
  citySuggestionsContainer.style.display = 'none';
  postalCodeInput.parentElement.appendChild(citySuggestionsContainer);

  // Popup “hors zone”
  const popupOverlay  = document.getElementById('popup-departement');
  const popupContent  = popupOverlay?.querySelector('.popup-content') || null;
  const popupSendBtn  = document.getElementById('popupSendBtn');
  const popupCloseBtn = document.getElementById('popupCloseBtn');
  const waitlistEmail = document.getElementById('waitlistEmail');

  let currentStep = 0;

  /* ========= Helpers ========= */
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isAllowedPostalCode = (val) => /^\d{5}$/.test(val) && ALLOWED_DEPARTMENTS.includes(val.slice(0,2));

  const showMessage = (message, type = 'error', timeout = 5000) => {
    if (!messageContainer) return;
    messageContainer.innerHTML = message;
    messageContainer.className = `message ${type}`;
    messageContainer.style.display = 'block';
    if (timeout > 0) {
      clearTimeout(showMessage._t);
      showMessage._t = setTimeout(() => (messageContainer.style.display = 'none'), timeout);
    }
  };

  const openPopup = () => {
    if (!popupOverlay) {
      showMessage("Désolé, le service n’est pas encore disponible dans votre département. Laissez votre email pour être prévenu.", 'error', 7000);
      return;
    }
    popupOverlay.style.display = 'flex';
    popupOverlay.setAttribute('aria-hidden','false');
    setTimeout(() => waitlistEmail?.focus(), 0);
  };

  const closePopup = () => {
    if (!popupOverlay) return;
    popupOverlay.style.display = 'none';
    popupOverlay.setAttribute('aria-hidden','true');
  };

  popupOverlay?.addEventListener('click', (e) => { if (e.target === popupOverlay) closePopup(); });
  popupCloseBtn?.addEventListener('click', closePopup);
  popupOverlay?.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || !popupContent) return;
    const focusables = popupContent.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
    const list = [...focusables]; if (!list.length) return;
    const first = list[0], last = list[list.length-1];
    if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && popupOverlay?.style.display === 'flex') closePopup(); });

  /* ========= Wizard ========= */
  wizardSteps.forEach((stepElem, i) => {
    stepElem.addEventListener('click', () => {
      if (stepElem.classList.contains('completed') || stepElem.classList.contains('active')) {
        currentStep = i;
        initializeSteps();
      }
    });
  });

  const updateWizardStepsDisplay = (iActive) => {
    wizardSteps.forEach((stepElem, i) => {
      if (i < iActive) { stepElem.classList.add('completed'); stepElem.classList.remove('active'); }
      else if (i === iActive) { stepElem.classList.add('active'); stepElem.classList.remove('completed'); }
      else { stepElem.classList.remove('active', 'completed'); }
    });
  };

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

  /* ========= Sélecteurs (rôle / type / priorité) ========= */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.select-btn');
    if (!btn) return;
    const group = btn.closest('.button-group');
    if (!group) return;

    group.querySelectorAll('.select-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // input[type=hidden] situé juste après
    let hidden = group.nextElementSibling;
    if (hidden && hidden.classList?.contains('field-error')) hidden = hidden.nextElementSibling;
    if (hidden && hidden.type === 'hidden') hidden.value = btn.dataset.value || '';

    // Nettoie erreurs
    const err = group.nextElementSibling?.classList?.contains('field-error') ? group.nextElementSibling : null;
    group.classList.remove('invalid');
    if (err) err.hidden = true;
  });

  /* ========= Suggestions de villes ========= */
  let debounceTimeout, abortCtrl;
  const fetchWithTimeout = (url, ms=8000) =>
    Promise.race([
      fetch(url, { signal: abortCtrl?.signal }),
      new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')), ms))
    ]);

  const renderCityList = (list) => {
    if (!Array.isArray(list) || !list.length) {
      citySuggestionsContainer.innerHTML = '<p>Aucune ville trouvée pour ce code postal.</p>';
      citySuggestionsContainer.style.display = 'block';
      return;
    }
    citySuggestionsContainer.innerHTML =
      '<ul>' + list.map(c => `<li tabindex="0">${c.nom}</li>`).join('') + '</ul>';
    citySuggestionsContainer.style.display = 'block';

    citySuggestionsContainer.querySelectorAll('li').forEach((li) => {
      const pick = () => { cityInput.value = li.textContent; citySuggestionsContainer.style.display = 'none'; };
      li.addEventListener('click', pick);
      li.addEventListener('keydown', (e) => { if (e.key === 'Enter') pick(); });
    });
  };

  postalCodeInput.addEventListener('input', () => {
    postalCodeInput.classList.remove('invalid');
    clearTimeout(debounceTimeout);
    if (abortCtrl) abortCtrl.abort();
    abortCtrl = new AbortController();

    debounceTimeout = setTimeout(async () => {
      const cp = postalCodeInput.value.trim();
      if (!/^\d{5}$/.test(cp)) { citySuggestionsContainer.style.display = 'none'; return; }

      try {
        const res = await fetchWithTimeout(
          `https://geo.api.gouv.fr/communes?codePostal=${cp}&fields=nom&format=json&geometry=centre`,
          8000
        );
        if (!res.ok) throw new Error('Erreur réseau');
        const data = await res.json();
        renderCityList(data || []);
      } catch (e) {
        console.error('Erreur villes :', e);
        citySuggestionsContainer.innerHTML = '<p>Impossible de récupérer les données des villes.</p>';
        citySuggestionsContainer.style.display = 'block';
      }
    }, 300);
  });

  // Popup au blur si CP valide mais hors zone
  postalCodeInput.addEventListener('blur', () => {
    const v = postalCodeInput.value.trim();
    if (/^\d{5}$/.test(v) && !isAllowedPostalCode(v)) openPopup();
  });

  /* ========= Validation par étape ========= */
  const validateStep = () => {
    const stepEl = steps[currentStep];
    let isValid = true;

    // Visibles
    stepEl.querySelectorAll('input[required]:not([type="hidden"]), textarea[required]').forEach((input) => {
      const val = (input.value || '').trim();

      if (input.type === 'email') {
        const ok = validateEmail(val);
        input.classList.toggle('invalid', !ok);
        if (!ok) isValid = false;
        return;
      }
      if (input.id === 'postalCode') {
        const ok = isAllowedPostalCode(val);
        input.classList.toggle('invalid', !ok);
        if (!ok) isValid = false;
        return;
      }

      const ok = !!val && (!input.pattern || new RegExp(input.pattern).test(val));
      input.classList.toggle('invalid', !ok);
      if (!ok) isValid = false;
    });

    // Cachés (role/type/priority)
    stepEl.querySelectorAll('input[type="hidden"][required]').forEach((hidden) => {
      const ok = !!(hidden.value || '').trim();
      let group = hidden.previousElementSibling;
      if (group && !group.classList?.contains('button-group') && group.classList?.contains('field-error')) {
        group = group.previousElementSibling;
      }
      if (group?.classList?.contains('button-group')) {
        group.classList.toggle('invalid', !ok);
        const err = group.nextElementSibling?.classList?.contains('field-error') ? group.nextElementSibling : null;
        if (err) err.hidden = ok;
      }
      if (!ok) isValid = false;
    });

    return isValid;
  };

  // Nettoyage invalid en saisie
  document.querySelectorAll('input, textarea').forEach((el) =>
    el.addEventListener('input', () => el.classList.remove('invalid'))
  );

  /* ========= Navigation ========= */
  prevBtn.addEventListener('click', () => { if (currentStep > 0) { currentStep--; initializeSteps(); } });
  nextBtn.addEventListener('click', () => {
    if (!validateStep()) {
      if (currentStep === 1) {
        const v = postalCodeInput.value.trim();
        if (/^\d{5}$/.test(v) && !isAllowedPostalCode(v)) openPopup();
      }
      showMessage('Veuillez remplir tous les champs obligatoires correctement avant de continuer.', 'error');
      return;
    }
    if (currentStep === 1) {
      const v = postalCodeInput.value.trim();
      if (!/^\d{5}$/.test(v)) { showMessage('Veuillez saisir un code postal valide (5 chiffres).', 'error'); return; }
      if (!isAllowedPostalCode(v)) { openPopup(); return; }
    }
    if (currentStep < steps.length - 1) { currentStep++; initializeSteps(); }
  });

  /* ========= Spinner & état d’envoi ========= */
  const setSubmittingState = (isSubmitting) => {
    if (!submitBtn) return;
    if (isSubmitting) {
      submitBtn.dataset.originalText = submitBtn.textContent;
      submitBtn.textContent = 'Envoi en cours…';
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;
    } else {
      submitBtn.textContent = submitBtn.dataset.originalText || 'Soumettre la demande';
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
    }
  };

  const resetInteractiveState = () => {
    document.querySelectorAll('button, input, textarea, select').forEach(el => el.disabled = false);
    document.querySelectorAll('.loading').forEach(el => el.classList.remove('loading'));
    if (submitBtn) {
      submitBtn.textContent = 'Soumettre la demande';
      submitBtn.removeAttribute('data-original-text');
      submitBtn.disabled = false;
    }
  };

  /* ========= Reset & Confirmation ========= */
  const resetForm = () => {
    form.reset();
    document.querySelectorAll('.button-group').forEach(g => g.classList.remove('invalid'));
    document.querySelectorAll('.select-btn.active').forEach(b => b.classList.remove('active'));
    citySuggestionsContainer.style.display = 'none';
    ['role','type','priority'].forEach(id => { const h = document.getElementById(id); if (h) h.value = ''; });
    document.querySelector('.form-step.confirmation')?.remove();
    document.querySelectorAll('[id^="summary"]').forEach((el) => el.textContent = 'Non renseigné');
    if (messageContainer) { messageContainer.style.display = 'none'; messageContainer.textContent = ''; }
    resetInteractiveState(); setSubmittingState(false);
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
      <div class="form-navigation">
        <button type="button" id="newRequestBtn" class="nav-btn nav-next">
          <span>Nouvelle demande</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
          </svg>
        </button>
      </div>
    `;
    document.querySelector('.form-container').appendChild(confirmationStep);
    steps.forEach((s) => s.classList.remove('active'));
    confirmationStep.classList.add('active');
    prevBtn.style.display = 'none'; nextBtn.style.display = 'none'; submitBtn.style.display = 'none';
    updateWizardStepsDisplay(wizardSteps.length);
    document.getElementById('newRequestBtn').addEventListener('click', resetForm);
  };

  /* ========= Popup : liste d’attente ========= */
  popupSendBtn?.addEventListener('click', async () => {
    const email = (waitlistEmail?.value || '').trim();
    if (!validateEmail(email)) { alert('Veuillez saisir un email valide.'); return; }
    try {
      if (window.emailjs?.send) {
        await emailjs.send('service_uzzmtzc', 'template_waitlist', {
          to_email: 'ben@smartimmo.pro',
          prospect_email: email,
          postal_code: (postalCodeInput.value || '').trim()
        });
      }
      alert('Merci ! Nous vous préviendrons dès que le service sera disponible.');
      closePopup(); if (waitlistEmail) waitlistEmail.value = '';
    } catch (err) {
      console.error('Erreur waitlist :', err);
      alert("Impossible d'enregistrer votre email pour le moment. Réessayez plus tard.");
    }
  });

  /* ========= Soumission ========= */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateStep()) {
      showMessage('Veuillez remplir tous les champs obligatoires correctement avant de soumettre.', 'error');
      return;
    }
    if (!cguCheckbox?.checked) {
      showMessage('Vous devez accepter les Conditions Générales d’Utilisation avant de soumettre le formulaire.', 'error');
      return;
    }

    const cp = (postalCodeInput.value || '').trim();
    if (!/^\d{5}$/.test(cp) || !isAllowedPostalCode(cp)) { openPopup(); return; }

    const requestId = generateUniqueId(cp);
    const data = {
      name: document.getElementById('name').value,
      email: document.getElementById('email').value,
      phone: document.getElementById('phone').value,
      address: document.getElementById('address').value,
      city: cityInput.value,
      postalCode: cp,
      addressComplement: document.getElementById('addressComplement').value || 'Non renseigné',
      role: document.getElementById('role').value,
      type: document.getElementById('type').value,
      description: document.getElementById('description').value,
      priority: document.getElementById('priority').value,
      request_id: requestId,      // ⛳️ cet ID sera écrit tel quel dans le Sheet (serveur ne le change pas)
      _ua: navigator.userAgent,   // debug utile côté Sheet
      _origin: location.origin    // debug utile côté Sheet
    };

    try {
      setSubmittingState(true);

      /* 1) Enregistrement Google Sheet (Apps Script)
         - pas de headers (évite préflight iOS)
         - si échec réseau, on tente un fallback no-cors pour au moins envoyer
         - on ne lit PAS la réponse (CORS), l’ID côté client fait foi car le serveur le conserve
      */
      let wrote = false;
      try {
        await fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify(data) });
        wrote = true;
      } catch (err1) {
        try {
          await fetch(WEB_APP_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(data) });
          wrote = true; // réponse opaque mais POST parti
        } catch (err2) {
          console.error('Apps Script KO', err2);
          showMessage("Impossible d'enregistrer votre demande dans Google Sheet. Merci de réessayer.", 'error', 12000);
          setSubmittingState(false);
          return;
        }
      }

      /* 2) Emails — utilisent le MÊME requestId que celui envoyé au serveur */
      if (!window.emailjs || !emailjs.send) throw new Error('EmailJS non chargé');

      const toOwner = emailjs.send('service_uzzmtzc', 'template_bes6bcg', { to_email: 'ben@smartimmo.pro', ...data });
      const toClient = emailjs.send('service_uzzmtzc', 'template_dtvz9jh', { to_email: data.email, ...data });

      const results = await Promise.allSettled([toOwner, toClient]);
      const ownerOK  = results[0].status === 'fulfilled';
      const clientOK = results[1].status === 'fulfilled';

      if (!ownerOK || !clientOK) {
        let msg = `<strong>Demande enregistrée</strong> (ID: <code>${requestId}</code>) — mais problème d’envoi d’email.<br><ul style="margin:6px 0 0 18px;padding:0">`;
        msg += `<li>Propriétaire : ${ownerOK ? '✅ OK' : `❌ KO — <code>${results[0].reason?.text || results[0].reason?.message || 'inconnu'}</code>`}</li>`;
        msg += `<li>Client : ${clientOK ? '✅ OK' : `❌ KO — <code>${results[1].reason?.text || results[1].reason?.message || 'inconnu'}</code>`}</li>`;
        msg += `</ul>`;
        showMessage(msg, 'error', 15000);
      } else {
        showMessage('Demande enregistrée ✅ et emails envoyés.', 'success', 4000);
      }

      /* 3) Confirmation — affiche le même ID que le Sheet et les emails */
      showConfirmationMessage(requestId);

    } catch (err) {
      console.error('Erreur lors de l’envoi :', err);
      showMessage(`Une erreur est survenue lors de l’envoi.<br><code>${err?.message || err}</code>`, 'error', 12000);
    } finally {
      setSubmittingState(false);
    }
  });

  /* GO */
  initializeSteps();

  // Alerte utile si ouvert en local
  if (location.protocol === 'file:') {
    showMessage(
      "Vous visualisez la page en <b>local (file://)</b>. Certains appels réseau peuvent être bloqués.<br>" +
      "Utilisez <b>https://smartimmo.pro</b> (ou Textastic en mode <b>Remote</b>).",
      'error',
      12000
    );
  }
});