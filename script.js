/*****************************************
 * script.js
 *****************************************/

/**
 * Génère un ID unique basé sur l'heure actuelle et un nombre aléatoire.
 */
const generateUniqueId = () => {
  return `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

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
  const btn = document.createElement('button');

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
  document.addEventListener('DOMContentLoaded', ()=>document.body.appendChild(panel));

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
  document.addEventListener('DOMContentLoaded', ()=>document.body.appendChild(btn));

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
  document.addEventListener('click', (function(){
    let clicks = 0, t;
    return ()=>{ clicks++; clearTimeout(t); t=setTimeout(()=>{ if (clicks>=3){ DBG.showToggle(); DBG.open(); } clicks=0; }, 450); };
  })());

  // Appui long sur header pour afficher
  document.addEventListener('DOMContentLoaded', ()=>{
    const header = document.querySelector('header') || document.body;
    let timer=null;
    header.addEventListener('touchstart', ()=>{ timer=setTimeout(()=>{ DBG.showToggle(); DBG.open(); },1500); }, {passive:true});
    header.addEventListener('touchend', ()=>{ clearTimeout(timer); }, {passive:true});
  });

  document.addEventListener('click', (e)=> {
    if (e.target && e.target.id==='dbg-clear') DBG.clear();
  });

  // Hooks globaux
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
  // Récupère toutes les "étapes" du formulaire
  const steps = document.querySelectorAll('.form-step');
  let currentStep = 0;

  // Barre d’avancement (les pastilles)
  const wizardSteps = document.querySelectorAll('.wizard-step');

  // Écouteurs de clic sur les pastilles
  wizardSteps.forEach((stepElem, i) => {
    stepElem.addEventListener('click', () => {
      if (stepElem.classList.contains('completed') || stepElem.classList.contains('active')) {
        currentStep = i;
        initializeSteps();
      }
    });
  });

  // Boutons de navigation
  const submitBtn = document.getElementById('submitBtn');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const cguCheckbox = document.getElementById('acceptCgu');

  // Boutons de sélection (type/priorité/rôle)
  const selectButtons = document.querySelectorAll('.select-btn');

  // Suggestion de ville
  const postalCodeInput = document.getElementById('postalCode');
  const citySuggestionsContainer = document.createElement('div');
  citySuggestionsContainer.classList.add('city-suggestions');
  citySuggestionsContainer.setAttribute('role', 'listbox');
  postalCodeInput.parentElement.appendChild(citySuggestionsContainer);

  // Validation d'email
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Affichage messages (supporte HTML + durée paramétrable)
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

  // Débounce pour la suggestion de ville
  let debounceTimeout;
  postalCodeInput.addEventListener('input', () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(async () => {
      const postalCode = postalCodeInput.value.trim();
      if (postalCode.length === 5 && /^[0-9]{5}$/.test(postalCode)) {
        try {
          const response = await fetch(
            `https://geo.api.gouv.fr/communes?codePostal=${postalCode}&fields=nom&format=json&geometry=centre`
          );
          if (!response.ok) throw new Error(`Erreur réseau: ${response.status}`);
          const data = await response.json();
          DBG.log('Villes API OK', data);

          if (data.length > 0) {
            citySuggestionsContainer.innerHTML =
              '<ul>' + data.map((city) => `<li tabindex="0">${city.nom}</li>`).join('') + '</ul>';
            citySuggestionsContainer.style.display = 'block';

            citySuggestionsContainer.querySelectorAll('li').forEach((li) => {
              const pick = () => {
                document.getElementById('city').value = li.textContent;
                citySuggestionsContainer.style.display = 'none';
              };
              li.addEventListener('click', pick);
              li.addEventListener('keydown', (e) => { if (e.key === 'Enter') pick(); });
            });
          } else {
            citySuggestionsContainer.innerHTML = '<p>Aucune ville trouvée pour ce code postal.</p>';
          }
        } catch (error) {
          DBG.error('Villes API KO', error);
          citySuggestionsContainer.innerHTML = '<p>Impossible de récupérer les données des villes.</p>';
        }
      } else {
        citySuggestionsContainer.style.display = 'none';
      }
    }, 300);
  });

  // Sélection de rôle / type / priorité via boutons
  selectButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const parent = btn.closest('.button-group');
      const hiddenInput = parent.nextElementSibling; // input caché après .button-group
      if (hiddenInput) hiddenInput.value = btn.dataset.value;

      parent.querySelectorAll('.select-btn').forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
    });
  });

  // Met à jour la barre d’avancement : active / completed
  function updateWizardStepsDisplay(currentStep) {
    const wizardSteps = document.querySelectorAll('.wizard-step');
    wizardSteps.forEach((stepElem, i) => {
      if (i < currentStep) {
        stepElem.classList.add('completed');
        stepElem.classList.remove('active');
      } else if (i === currentStep) {
        stepElem.classList.add('active');
        stepElem.classList.remove('completed');
      } else {
        stepElem.classList.remove('active', 'completed');
      }
    });
  }

  // Affiche/masque les .form-step et met à jour la barre
  const initializeSteps = () => {
    steps.forEach((step, index) => {
      step.classList.toggle('active', index === currentStep);
    });

    prevBtn.style.display = currentStep > 0 ? 'inline-block' : 'none';
    nextBtn.style.display = currentStep < steps.length - 1 ? 'inline-block' : 'none';
    submitBtn.style.display = currentStep === steps.length - 1 ? 'inline-block' : 'none';

    updateWizardStepsDisplay(currentStep);

    if (currentStep === steps.length - 1) {
      updateSummary();
    }
  };

  // Mets à jour le récap final
  const updateSummary = () => {
    const summaryFields = {
      summaryRole: 'role',
      summaryName: 'name',
      summaryEmail: 'email',
      summaryPhone: 'phone',
      summaryAddress: 'address',
      summaryType: 'type',
      summaryDescription: 'description',
      summaryPriority: 'priority',
    };

    for (const [summaryId, fieldId] of Object.entries(summaryFields)) {
      const inputElement = document.getElementById(fieldId);
      const summaryElement = document.getElementById(summaryId);
      if (!inputElement || !summaryElement) continue;
      const value = inputElement.value.trim() || 'Non renseigné';
      summaryElement.textContent = value;
    }
  };

  // Vérifie les champs obligatoires de l’étape courante
  const validateStep = () => {
    const currentStepElement = steps[currentStep];
    const inputs = currentStepElement.querySelectorAll('input[required], textarea[required]');
    let isValid = true;

    inputs.forEach((input) => {
      if (input.type === 'email' && !validateEmail(input.value.trim())) {
        input.classList.add('invalid');
        isValid = false;
      } else if (!input.value.trim()) {
        input.classList.add('invalid');
        isValid = false;
      } else {
        input.classList.remove('invalid');
      }
    });
    return isValid;
  };

  // Retire la classe .invalid quand on modifie le champ
  document.querySelectorAll('input, textarea').forEach((input) => {
    input.addEventListener('input', () => {
      input.classList.remove('invalid');
    });
  });

  // Navigation "Précédent"
  prevBtn.addEventListener('click', () => {
    if (currentStep > 0) {
      currentStep--;
      initializeSteps();
    }
  });

  // Navigation "Suivant"
  nextBtn.addEventListener('click', () => {
    if (validateStep()) {
      if (currentStep < steps.length - 1) {
        currentStep++;
        initializeSteps();
      }
    } else {
      showMessage('Veuillez remplir tous les champs obligatoires correctement avant de continuer.', 'error');
    }
  });

  // Réinitialise le formulaire
  const resetForm = () => {
    document.getElementById('repairForm').reset();
    const confirmationStep = document.querySelector('.form-step.confirmation');
    if (confirmationStep) confirmationStep.remove();

    const summaryElements = document.querySelectorAll('[id^="summary"]');
    summaryElements.forEach((el) => { el.textContent = 'Non renseigné'; });

    currentStep = 0;
    initializeSteps();
  };

  // Affiche une page "Confirmation" quand le formulaire est soumis
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

    steps.forEach((step) => step.classList.remove('active'));
    confirmationStep.classList.add('active');

    prevBtn.style.display = 'none';
    nextBtn.style.display = 'none';
    submitBtn.style.display = 'none';

    currentStep = steps.length; 
    updateWizardStepsDisplay(currentStep);

    document.getElementById('newRequestBtn').addEventListener('click', resetForm);
  };

  // Soumission du formulaire (EmailJS) — avec DEBUG détaillé
  document.getElementById('repairForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!cguCheckbox.checked) {
      showMessage('Vous devez accepter les Conditions Générales d\'Utilisation avant de soumettre le formulaire.', 'error');
      return;
    }

    // On génère l'ID unique
    const requestId = generateUniqueId();

    // Récupération des données
    const formData = {
      name: document.getElementById('name').value,
      email: document.getElementById('email').value,
      phone: document.getElementById('phone').value,
      address: document.getElementById('address').value,
      city: document.getElementById('city').value,
      postalCode: document.getElementById('postalCode').value,
      addressComplement: document.getElementById('addressComplement').value || 'Non renseigné',
      role: document.getElementById('role').value,
      type: document.getElementById('type').value,
      description: document.getElementById('description').value,
      priority: document.getElementById('priority').value
    };

    try {
      if (!window.emailjs || typeof emailjs.init !== 'function' || typeof emailjs.send !== 'function') {
        const hint = `EmailJS n'est pas chargé.
Vérifie le CDN dans index.html :
<code>&lt;script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@3.11.0/dist/email.min.js"&gt;&lt;/script&gt;</code>`;
        DBG.error('EmailJS non chargé');
        showMessage(hint.replace(/\n/g,'<br>'), 'error', 15000);
        return;
      }

      try { emailjs.init('mgZZQLZBSBI7EbaiG'); }
      catch (initErr) {
        DBG.error('EmailJS init error', initErr);
        showMessage(`Échec init EmailJS: <code>${initErr && (initErr.message || initErr)}</code>`, 'error', 12000);
        return;
      }

      // Envoi propriétaire + client en parallèle
      const toOwner = emailjs.send('service_uzzmtzc', 'template_bes6bcg', {
        to_email: 'ben@smartimmo.pro',
        from_name: formData.name,
        from_email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        postalCode: formData.postalCode,
        addressComplement: formData.addressComplement,
        role: formData.role,
        type: formData.type,
        description: formData.description,
        priority: formData.priority,
        request_id: requestId
      });

      const toClient = emailjs.send('service_uzzmtzc', 'template_dtvz9jh', {
        to_email: formData.email,
        from_name: formData.name,
        from_email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        postalCode: formData.postalCode,
        addressComplement: formData.addressComplement,
        role: formData.role,
        type: formData.type,
        description: formData.description,
        priority: formData.priority,
        request_id: requestId
      });

      const results = await Promise.allSettled([toOwner, toClient]);
      DBG.log('EmailJS results', results);

      const mapRes = (r) => r.status === 'fulfilled'
        ? { ok:true, value:r.value }
        : { ok:false, error: r.reason };

      const owner = mapRes(results[0]);
      const client = mapRes(results[1]);

      if (owner.ok && client.ok) {
        showConfirmationMessage(requestId);
      } else {
        let msg = `<strong>Échec d'envoi EmailJS.</strong><br><ul style="margin:6px 0 0 18px;padding:0">`;
        if (!owner.ok) msg += `<li>Propriétaire (ben@smartimmo.pro): ❌ KO — <code>${(owner.error && (owner.error.text||owner.error.message||owner.error.status||owner.error))||'Aucune info'}</code></li>`;
        else            msg += `<li>Propriétaire (ben@smartimmo.pro): ✅ OK</li>`;
        if (!client.ok) msg += `<li>Client (${formData.email}): ❌ KO — <code>${(client.error && (client.error.text||client.error.message||client.error.status||client.error))||'Aucune info'}</code></li>`;
        else            msg += `<li>Client (${formData.email}): ✅ OK</li>`;
        msg += `</ul><div style="margin-top:8px;font-size:.9em;opacity:.9">Vérifie <code>service_uzzmtzc</code>, <code>template_bes6bcg</code>, <code>template_dtvz9jh</code>, et l’UserID dans <code>emailjs.init(...)</code>.</div>`;
        showMessage(msg, 'error', 16000);
        DBG.warn('EmailJS partial failure', {owner, client, payload: formData});
      }
    } catch (error) {
      DBG.error('Soumission KO', error);
      const details = (error && (error.text||error.status||error.message||error.name)) || String(error);
      const hint = /Network|TypeError/i.test(String(error?.message||error))
        ? "<br><em>Indice :</em> réseau/CORS. Assure-toi d’être en <strong>HTTPS</strong> et sans bloqueur de contenu."
        : "";
      showMessage(`Erreur pendant l'envoi.<br><code>${details}</code>${hint}`, 'error', 16000);
    }
  });

  // Initialisation globale
  initializeSteps();
});