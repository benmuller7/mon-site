const generateUniqueId = () => {
    // Obtenir l'horodatage actuel en millisecondes
    const timestamp = Date.now().toString(); // Exemple : "1673928435000"

    // Prendre les 5 derniers chiffres de l'horodatage
    const timePart = timestamp.slice(-5); // Exemple : "43500"

    // Générer un nombre aléatoire entre 0 et 999
    const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0'); // Exemple : "097"

    // Combiner pour obtenir 8 chiffres
    const uniqueId = `${timePart}${randomPart}`.slice(0, 8);

    return uniqueId;
};


document.addEventListener('DOMContentLoaded', () => {
    const steps = document.querySelectorAll('.form-step');
    let currentStep = 0;

    const submitBtn = document.getElementById('submitBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const cguCheckbox = document.getElementById('acceptCgu');
    const selectButtons = document.querySelectorAll('.select-btn');
    const postalCodeInput = document.getElementById('postalCode');

    const citySuggestionsContainer = document.createElement('div');
    citySuggestionsContainer.classList.add('city-suggestions');
    citySuggestionsContainer.setAttribute('role', 'listbox');
    postalCodeInput.parentElement.appendChild(citySuggestionsContainer);

    const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const showMessage = (message, type = 'error') => {
        const container = document.getElementById('messageContainer');
        container.textContent = message;
        container.className = `message ${type}`;
        container.style.display = 'block';
        setTimeout(() => (container.style.display = 'none'), 5000);
    };

    const debounce = (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), delay);
        };
    };

    const fetchCitySuggestions = async (postalCode) => {
        try {
            const response = await fetch(
                `https://geo.api.gouv.fr/communes?codePostal=${postalCode}&fields=nom&format=json&geometry=centre`
            );
            if (!response.ok) throw new Error('Erreur réseau');

            const data = await response.json();
            return data.length > 0
                ? data.map((city) => city.nom)
                : ['Aucune ville trouvée pour ce code postal.'];
        } catch (error) {
            console.error('Erreur lors de la récupération des données :', error);
            return ['Impossible de récupérer les données des villes.'];
        }
    };

    postalCodeInput.addEventListener(
        'input',
        debounce(async () => {
            const postalCode = postalCodeInput.value.trim();
            if (/^[0-9]{5}$/.test(postalCode)) {
                const cities = await fetchCitySuggestions(postalCode);
                citySuggestionsContainer.innerHTML = `<ul>${cities
                    .map((city) => `<li>${city}</li>`)
                    .join('')}</ul>`;
                citySuggestionsContainer.style.display = 'block';

                citySuggestionsContainer.querySelectorAll('li').forEach((li) =>
                    li.addEventListener('click', () => {
                        document.getElementById('city').value = li.textContent;
                        citySuggestionsContainer.style.display = 'none';
                    })
                );
            } else {
                citySuggestionsContainer.style.display = 'none';
            }
        }, 300)
    );

    selectButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const parent = btn.closest('.button-group');
            const hiddenInput = parent.nextElementSibling;

            if (hiddenInput) {
                hiddenInput.value = btn.dataset.value;
            }

            parent.querySelectorAll('.select-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
        });
    });

    const initializeSteps = () => {
        steps.forEach((step, index) => {
            step.classList.toggle('active', index === currentStep);
        });

        prevBtn.style.display = currentStep > 0 ? 'inline-block' : 'none';
        nextBtn.style.display = currentStep < steps.length - 1 ? 'inline-block' : 'none';
        submitBtn.style.display = currentStep === steps.length - 1 ? 'inline-block' : 'none';

        if (currentStep === steps.length - 1) updateSummary();
    };

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

            if (inputElement && summaryElement) {
                summaryElement.textContent = inputElement.value.trim() || 'Non renseigné';
            }
        }
    };

    const validateStep = () => {
        const currentStepElement = steps[currentStep];
        const inputs = currentStepElement.querySelectorAll('input[required], textarea[required]');
        let isValid = true;

        inputs.forEach((input) => {
            if (
                (input.type === 'email' && !validateEmail(input.value.trim())) ||
                !input.value.trim()
            ) {
                input.classList.add('invalid');
                isValid = false;
            } else {
                input.classList.remove('invalid');
            }
        });

        return isValid;
    };

    document.querySelectorAll('input, textarea').forEach((input) =>
        input.addEventListener('input', () => input.classList.remove('invalid'))
    );

    prevBtn.addEventListener('click', () => {
        if (currentStep > 0) {
            currentStep--;
            initializeSteps();
        }
    });

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

    const resetForm = () => {
        // Supprimer l'étape de confirmation si elle existe
        const confirmationStep = document.querySelector('.form-step.confirmation');
        if (confirmationStep) {
            confirmationStep.remove(); // Supprime complètement l'élément de confirmation
        }

        // Réinitialiser le formulaire
        document.getElementById('repairForm').reset();

        // Réinitialiser les champs du résumé
        const summaryElements = document.querySelectorAll('[id^="summary"]');
        summaryElements.forEach((el) => (el.textContent = 'Non renseigné'));

        // Réinitialiser l'étape active
        currentStep = 0;
        initializeSteps(); // Réaffiche la première étape
    };

    const showConfirmationMessage = () => {
        const uniqueId = generateUniqueId();
        const confirmationStep = document.createElement('div');
        confirmationStep.classList.add('form-step', 'confirmation');

        confirmationStep.innerHTML = `
            <h2>Confirmation</h2>
            <p>Votre demande a été enregistrée avec succès.</p>
            <p>Demande d'intervention N°: <strong>${uniqueId}</strong></p>
            <p>Nous vous contacterons prochainement.</p>
            <button id="newRequestBtn" class="action-btn">Faire une autre demande</button>
        `;

        const formContainer = document.querySelector('.form-container');
        formContainer.appendChild(confirmationStep);

        document.querySelectorAll('.form-step').forEach((step) => step.classList.remove('active'));
        confirmationStep.classList.add('active');

        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'none';

        document.getElementById('newRequestBtn').addEventListener('click', resetForm);
    };

    document.getElementById('repairForm').addEventListener('submit', async (event) => {
        event.preventDefault();

        const uniqueId = generateUniqueId();

        if (!cguCheckbox.checked) {
            showMessage(
                'Vous devez accepter les Conditions Générales d\'Utilisation avant de soumettre le formulaire.',
                'error'
            );
            return;
        }

        const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            address: document.getElementById('address').value,
            addressComplement: document.getElementById('addressComplement').value || 'Non renseigné',
            city: document.getElementById('city').value,
            postalCode: document.getElementById('postalCode').value,
            type: document.getElementById('type').value,
            description: document.getElementById('description').value,
            priority: document.getElementById('priority').value,
            role: document.getElementById('role').value,
        };

        try {
            emailjs.init('mgZZQLZBSBI7EbaiG');

            console.log('Envoi de l\'email à l\'entreprise...');
            await emailjs.send('service_uzzmtzc', 'template_bes6bcg', {
                from_name: formData.name,
                from_email: formData.email,
                phone: formData.phone,
                address: `${formData.address}, ${formData.city}, ${formData.postalCode}`,
                addressComplement: formData.addressComplement,
                role: formData.role,
                type: formData.type,
                description: formData.description,
                priority: formData.priority,
                request_id: uniqueId,
            });

            console.log('Envoi de l\'email de confirmation au client...');
            await emailjs.send('service_uzzmtzc', 'template_dtvz9jh', {
                from_name: formData.name,
                to_email: formData.email,
                type: formData.type,
                description: formData.description,
                priority: formData.priority,
                request_id: uniqueId,
            });

            console.log('Emails envoyés avec succès. Affichage de la confirmation.');
            showConfirmationMessage();
        } catch (error) {
            console.error('Erreur lors de l\'envoi :', error);
            showMessage('Une erreur est survenue. Veuillez réessayer.', 'error');
        }
    });

    initializeSteps();
});
