/*****************************************
 * script.js
 *****************************************/

/**
 * Génère un ID unique basé sur l'heure actuelle et un nombre aléatoire.
 */
const generateUniqueId = () => {
  return `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

document.addEventListener('DOMContentLoaded', () => {
  // Récupère toutes les "étapes" du formulaire
  const steps = document.querySelectorAll('.form-step');
  let currentStep = 0;

  // Barre d’avancement (les pastilles)
  const wizardSteps = document.querySelectorAll('.wizard-step');

  // Écouteurs de clic sur les pastilles
  wizardSteps.forEach((stepElem, i) => {
    stepElem.addEventListener('click', () => {
      // On autorise seulement le clic sur étapes passées (.completed) ou active
      if (stepElem.classList.contains('completed') || stepElem.classList.contains('active')) {
        currentStep = i;
        // On relance la mise à jour globale (form + barre)
        initializeSteps();
      }
    });
  });

  // Boutons de navigation
  const submitBtn = document.getElementById('submitBtn');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const cguCheckbox = document.getElementById('acceptCgu');

  // Boutons de sélection (type d'intervention, priorité, rôle, etc.)
  const selectButtons = document.querySelectorAll('.select-btn');

  // Gestion de la suggestion de ville via code postal
  const postalCodeInput = document.getElementById('postalCode');
  const citySuggestionsContainer = document.createElement('div');
  citySuggestionsContainer.classList.add('city-suggestions');
  citySuggestionsContainer.setAttribute('role', 'listbox');
  postalCodeInput.parentElement.appendChild(citySuggestionsContainer);

  // Validation d'email
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Affichage de messages d'erreur / succès (ajout d'un 3e param: timeout)
  const showMessage = (message, type = 'error', timeout = 8000) => {
    const container = document.getElementById('messageContainer');
    container.innerHTML = message; // autorise un peu de HTML pour debug formaté
    container.className = `message ${type}`;
    container.style.display = 'block';
    if (timeout > 0) {
      clearTimeout(showMessage._t);
      showMessage._t = setTimeout(() => (container.style.display = 'none'), timeout);
    }
  };

  // Petite aide pour formater proprement les erreurs
  const formatErrorDetail = (err) => {
    try {
      if (!err) return '';
      const parts = [];
      if (typeof err === 'string') parts.push(err);
      if (err.status) parts.push(`Status: ${err.status}`);
      if (err.text) parts.push(`Text: ${err.text}`);
      if (err.message) parts.push(`Message: ${err.message}`);
      if (err.name) parts.push(`Name: ${err.name}`);
      return parts.filter(Boolean).join(' | ');
    } catch {
      return '';
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
          if (!response.ok) throw new Error('Erreur réseau');

          const data = await response.json();
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
            citySuggestionsContainer.innerHTML =
              '<p>Aucune ville trouvée pour ce code postal.</p>';
          }
        } catch (error) {
          console.error('Erreur lors de la récupération des données :', error);
          citySuggestionsContainer.innerHTML =
            '<p>Impossible de récupérer les données des villes.</p>';
        }
      } else {
        citySuggestionsContainer.style.display = 'none';
      }
    }, 300);
  });

  // Sélection de rôle, type, etc. via boutons
  selectButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const parent = btn.closest('.button-group');
      const hiddenInput = parent.nextElementSibling; // input caché après .button-group

      if (hiddenInput) {
        hiddenInput.value = btn.dataset.value;
      }
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

    // Met à jour la barre d’avancement
    updateWizardStepsDisplay(currentStep);

    // Mise à jour du résumé si on est à la dernière étape
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
    if (confirmationStep) {
      confirmationStep.remove();
    }
    const summaryElements = document.querySelectorAll('[id^="summary"]');
    summaryElements.forEach((el) => {
      el.textContent = 'Non renseigné';
    });
    currentStep = 0;
    initializeSteps();
  };

  // Affiche une page "Confirmation" quand le formulaire est soumis
  const showConfirmationMessage = (requestId) => {
    const confirmationStep = document.createElement('div');
    confirmationStep.classList.add('form-step', 'confirmation');

    // Ici, on affiche requestId pour que ce soit le même numéro qu'on a généré
    confirmationStep.innerHTML = `
      <h2>Confirmation</h2>
      <p>Votre demande a été enregistrée avec succès.</p>
      <p>Numéro unique : <strong>${requestId}</strong></p>
      <p>Nous vous contacterons prochainement.</p>
      <button id="newRequestBtn" class="action-btn">Faire une autre demande</button>
    `;

    document.querySelector('.form-container').appendChild(confirmationStep);

    // Masquer les autres étapes
    steps.forEach((step) => step.classList.remove('active'));
    confirmationStep.classList.add('active');

    // Masquer les boutons
    prevBtn.style.display = 'none';
    nextBtn.style.display = 'none';
    submitBtn.style.display = 'none';

    // Force l'étape 4 à être cochée
    currentStep = steps.length; 
    updateWizardStepsDisplay(currentStep);

    document.getElementById('newRequestBtn').addEventListener('click', resetForm);
  };

  // Soumission du formulaire (EmailJS) — AVEC DEBUG DÉTAILLÉ
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
      // Vérifie la présence d'EmailJS
      if (!window.emailjs || typeof emailjs.init !== 'function' || typeof emailjs.send !== 'function') {
        showMessage(
          "EmailJS n'est pas chargé. Vérifie la balise CDN dans index.html et l'ordre des scripts.<br><code>&lt;script src=\"https://cdn.jsdelivr.net/npm/@emailjs/browser@3.11.0/dist/email.min.js\"&gt;&lt;/script&gt;</code>",
          'error',
          12000
        );
        return;
      }

      // Initialise EmailJS (User ID)
      try {
        emailjs.init('mgZZQLZBSBI7EbaiG');
      } catch (initErr) {
        console.error('EmailJS init error:', initErr);
        showMessage(
          `Échec init EmailJS. Détails: <code>${formatErrorDetail(initErr)}</code>`,
          'error',
          12000
        );
        return;
      }

      // Envoi vers SmartImmo et vers le client en parallèle (debug partiel)
      const toOwnerPromise = emailjs.send('service_uzzmtzc', 'template_bes6bcg', {
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

      const toClientPromise = emailjs.send('service_uzzmtzc', 'template_dtvz9jh', {
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

      const results = await Promise.allSettled([toOwnerPromise, toClientPromise]);

      const ownerRes = results[0];
      const clientRes = results[1];

      const ownerOK = ownerRes.status === 'fulfilled';
      const clientOK = clientRes.status === 'fulfilled';

      if (ownerOK && clientOK) {
        // Succès complet
        showConfirmationMessage(requestId);
      } else {
        // Échec partiel ou total — on affiche précisément quoi
        const ownerErr = ownerOK ? '' : formatErrorDetail(ownerRes.reason);
        const clientErr = clientOK ? '' : formatErrorDetail(clientRes.reason);

        let msg = `<strong>Échec d'envoi EmailJS.</strong><br>`;
        msg += `<ul style="margin:6px 0 0 18px;padding:0">`;
        msg += `<li>Propriétaire (ben@smartimmo.pro) : ${ownerOK ? '✅ OK' : `❌ KO — <code>${ownerErr || 'Aucune info'}</code>`}</li>`;
        msg += `<li>Client (${formData.email}) : ${clientOK ? '✅ OK' : `❌ KO — <code>${clientErr || 'Aucune info'}</code>`}</li>`;
        msg += `</ul>`;
        msg += `<div style="margin-top:8px;font-size:0.9em;opacity:0.9">Astuce : vérifie <code>service_uzzmtzc</code>, <code>template_bes6bcg</code>, <code>template_dtvz9jh</code> et ton <code>userId</code>. Consulte aussi la console (F12 &gt; Console/Network).</div>`;

        showMessage(msg, 'error', 15000);
      }

    } catch (error) {
      // Erreur générale (réseau, CORS, exception JS, etc.)
      console.error('Erreur lors de l\'envoi :', error);
      const details = formatErrorDetail(error);
      const hint = (error && (error.name === 'TypeError' || /Network/i.test(error.message || '')))
        ? "<br><em>Indice :</em> problème réseau/CORS. Vérifie que ton site est bien servi en <strong>HTTPS</strong> et que les bloqueurs ne perturbent pas la requête."
        : '';
      showMessage(
        `Une erreur est survenue pendant l'envoi.<br><code>${details || 'Aucun détail transmis'}</code>${hint}`,
        'error',
        15000
      );
    }
  });

  // Initialisation globale
  initializeSteps();
});