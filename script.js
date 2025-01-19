const generateUniqueId = () => {
    return `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
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

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const showMessage = (message, type = 'error') => {
        const container = document.getElementById('messageContainer');
        container.textContent = message;
        container.className = `message ${type}`;
        container.style.display = 'block';
        setTimeout(() => (container.style.display = 'none'), 5000);
    };

    let debounceTimeout;
    postalCodeInput.addEventListener('input', () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(async () => {
            const postalCode = postalCodeInput.value.trim();

            if (postalCode.length === 5 && /^[0-9]{5}$/.test(postalCode)) {
                try {
                    const response = await fetch(`https://geo.api.gouv.fr/communes?codePostal=${postalCode}&fields=nom&format=json&geometry=centre`);
                    if (!response.ok) throw new Error('Erreur réseau');

                    const data = await response.json();

                    if (data.length > 0) {
                        citySuggestionsContainer.innerHTML = '<ul>' + data.map(city => `<li>${city.nom}</li>`).join('') + '</ul>';
                        citySuggestionsContainer.style.display = 'block';

                        citySuggestionsContainer.querySelectorAll('li').forEach(li => {
                            li.addEventListener('click', () => {
                                document.getElementById('city').value = li.textContent;
                                citySuggestionsContainer.style.display = 'none';
                            });
                        });
                    } else {
                        citySuggestionsContainer.innerHTML = '<p>Aucune ville trouvée pour ce code postal.</p>';
                    }
                } catch (error) {
                    console.error('Erreur lors de la récupération des données :', error);
                    citySuggestionsContainer.innerHTML = '<p>Impossible de récupérer les données des villes.</p>';
                }
            } else {
                citySuggestionsContainer.style.display = 'none';
            }
        }, 300);
    });

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

        // Mettez à jour le résumé uniquement à l'étape récapitulative
        if (currentStep === steps.length - 1) {
            updateSummary();
        }
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

            if (!inputElement) {
                console.warn(`Champ ${fieldId} introuvable !`);
                continue;
            }

            const summaryElement = document.getElementById(summaryId);
            if (!summaryElement) {
                console.warn(`Élément de résumé ${summaryId} introuvable !`);
                continue;
            }

            const value = inputElement.value.trim() || 'Non renseigné';
            summaryElement.textContent = value;
        }
    };

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

    document.querySelectorAll('input, textarea').forEach((input) => {
        input.addEventListener('input', () => {
            input.classList.remove('invalid');
        });
    });

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
        document.getElementById('repairForm').reset();
        const confirmationStep = document.querySelector('.form-step.confirmation');
        if (confirmationStep) {
            confirmationStep.remove();
        }

        // Réinitialisez les champs du résumé
        const summaryElements = document.querySelectorAll('[id^="summary"]');
        summaryElements.forEach((el) => {
            el.textContent = 'Non renseigné';
        });

        currentStep = 0;
        initializeSteps();
    };

    const showConfirmationMessage = () => {
        const uniqueId = generateUniqueId();
        const confirmationStep = document.createElement('div');
        confirmationStep.classList.add('form-step', 'confirmation'); // Ajout de la classe 'confirmation'

        confirmationStep.innerHTML = `
            <h2>Confirmation</h2>
            <p>Votre demande a été enregistrée avec succès.</p>
            <p>Numéro unique : <strong>${uniqueId}</strong></p>
            <p>Nous vous contacterons prochainement.</p>
            <button id="newRequestBtn" class="action-btn">Faire une autre demande</button>
        `;

        document.querySelector('.form-container').appendChild(confirmationStep);
        steps.forEach((step) => step.classList.remove('active'));
        confirmationStep.classList.add('active');

        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'none';

        document.getElementById('newRequestBtn').addEventListener('click', resetForm);
    };

    document.getElementById('repairForm').addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!cguCheckbox.checked) {
            showMessage('Vous devez accepter les Conditions Générales d\'Utilisation avant de soumettre le formulaire.', 'error');
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
            await emailjs.send('service_uzzmtzc', 'template_bes6bcg', {
                from_name: formData.name,
                from_email: formData.email,
                message: `Type: ${formData.type}\nDescription: ${formData.description}\nPriorité: ${formData.priority}`,
                address: `${formData.address}, ${formData.city}, ${formData.postalCode}`,
                phone: formData.phone,
            });

            showConfirmationMessage();
        } catch (error) {
            console.error('Erreur lors de l\'envoi :', error);
            showMessage('Une erreur est survenue. Veuillez réessayer.', 'error');
        }
    });

    initializeSteps();
});
