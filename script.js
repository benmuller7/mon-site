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

    // Fonction pour valider l'adresse email
    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // Fonction pour afficher les messages globaux
    const showMessage = (message, type = 'error') => {
        const container = document.getElementById('messageContainer');
        container.textContent = message;
        container.className = `message ${type}`;
        container.style.display = 'block';
        setTimeout(() => (container.style.display = 'none'), 5000);
    };

    // Gestion des propositions de villes en fonction du code postal avec debounce
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
        }, 300); // Délai de 300ms
    });

    // Gestion des boutons dynamiques
    selectButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const parent = btn.closest('.button-group');
            const inputId = parent.nextElementSibling?.id; // Trouve l'input caché lié au bouton
            const selectedValue = btn.dataset.value; // Récupère la valeur associée au bouton

            // Met à jour la valeur de l'input caché
            if (inputId) {
                document.getElementById(inputId).value = selectedValue;
            }

            // Désactive les autres boutons de la même catégorie
            parent.querySelectorAll('.select-btn').forEach((b) => b.classList.remove('active'));

            // Active le bouton sélectionné
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');
        });
    });

    // Fonction d'initialisation des étapes
    const initializeSteps = () => {
        steps.forEach((step, index) => {
            step.classList.toggle('active', index === currentStep);
        });

        prevBtn.disabled = currentStep === 0;
        nextBtn.style.display = currentStep === steps.length - 1 ? 'none' : 'inline-block';
        submitBtn.style.display = currentStep === steps.length - 1 ? 'inline-block' : 'none';

        if (currentStep === steps.length - 1) {
            updateSummary();
        }
    };

    // Fonction pour mettre à jour le résumé
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
            document.getElementById(summaryId).textContent = document.getElementById(fieldId).value || 'Non renseigné';
        }
    };

    // Validation des champs obligatoires
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

    // Suppression dynamique des erreurs
    document.querySelectorAll('input, textarea').forEach((input) => {
        input.addEventListener('input', () => {
            input.classList.remove('invalid');
        });
    });

    // Gestion de la navigation entre les étapes
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

    // Gestion de la soumission du formulaire
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
            console.log('Données envoyées :', formData);
            showMessage('Votre demande a été envoyée avec succès.', 'success');
            setTimeout(() => window.location.reload(), 3000);
        } catch (error) {
            console.error('Erreur lors de l\'envoi :', error);
            showMessage('Une erreur est survenue. Veuillez réessayer.', 'error');
        }
    });

    initializeSteps();
});
