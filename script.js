document.addEventListener('DOMContentLoaded', () => {
    const steps = document.querySelectorAll('.form-step');
    let currentStep = 0;

    const submitBtn = document.getElementById('submitBtn');
    const cguCheckbox = document.getElementById('acceptCgu');
    const selectButtons = document.querySelectorAll('.select-btn');

    // Initialisation des étapes
    const initializeSteps = () => {
        steps.forEach((step, index) => {
            step.classList.toggle('active', index === currentStep);
        });

        document.getElementById('prevBtn').disabled = currentStep === 0;
        document.getElementById('nextBtn').style.display = currentStep === steps.length - 1 ? 'none' : 'inline-block';
        submitBtn.style.display = currentStep === steps.length - 1 ? 'inline-block' : 'none';

        if (currentStep === steps.length - 1) {
            // Mise à jour du résumé
            document.getElementById('summaryName').textContent = document.getElementById('name').value;
            document.getElementById('summaryEmail').textContent = document.getElementById('email').value;
            document.getElementById('summaryPhone').textContent = document.getElementById('phone').value;
            document.getElementById('summaryAddress').textContent = document.getElementById('address').value;
            document.getElementById('summaryType').textContent = document.getElementById('type').value;
            document.getElementById('summaryDescription').textContent = document.getElementById('description').value;
            document.getElementById('summaryPriority').textContent = document.getElementById('priority').value || 'Non spécifié';
            document.getElementById('summaryRole').textContent = document.getElementById('role').value || 'Non spécifié';
        }
    };

    // Validation des champs obligatoires
    const validateStep = () => {
        const currentStepElement = steps[currentStep];
        const inputs = currentStepElement.querySelectorAll('input[required], textarea[required]');

        for (const input of inputs) {
            if (!input.value.trim()) {
                input.classList.add('invalid');
                return false;
            } else {
                input.classList.remove('invalid');
            }
        }
        return true;
    };

    // Navigation entre les étapes
    document.getElementById('prevBtn').addEventListener('click', () => {
        if (currentStep > 0) {
            currentStep--;
            initializeSteps();
        }
    });

    document.getElementById('nextBtn').addEventListener('click', () => {
        if (validateStep()) {
            if (currentStep < steps.length - 1) {
                currentStep++;
                initializeSteps();
            }
        } else {
            alert('Veuillez remplir tous les champs obligatoires avant de continuer.');
        }
    });

    // Gestion de la case à cocher CGU
    if (cguCheckbox && submitBtn) {
        cguCheckbox.addEventListener('change', () => {
            submitBtn.disabled = !cguCheckbox.checked;
        });
    }

    // Gestion des boutons dynamiques
    selectButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const inputId = btn.parentNode.nextElementSibling?.id;
            const selectedValue = btn.dataset.value;

            // Met à jour la valeur cachée
            if (inputId) {
                document.getElementById(inputId).value = selectedValue;
            }

            // Réinitialise les autres boutons
            btn.parentNode.querySelectorAll('.select-btn').forEach((b) => {
                b.classList.remove('active');
            });

            // Active le bouton sélectionné
            btn.classList.add('active');
        });
    });

    // Gestion de l'envoi du formulaire
    document.getElementById('repairForm').addEventListener('submit', async (event) => {
        event.preventDefault();

        // Génération de l'identifiant unique
        const uniqueId = `REQ-${Date.now()}`;

        // Récupération des données du formulaire
        const formData = {
            uniqueId,
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            address: document.getElementById('address').value,
            city: document.getElementById('city').value,
            postalCode: document.getElementById('postalCode').value,
            type: document.getElementById('type').value,
            description: document.getElementById('description').value,
            priority: document.getElementById('priority').value,
            role: document.getElementById('role').value,
        };

        try {
            // Envoi de l'email via EmailJS
            await emailjs.send('service_uzzmtzc', 'template_bes6bcg', {
                unique_id: formData.uniqueId,
                user_name: formData.name,
                user_email: formData.email,
                user_phone: formData.phone,
                user_address: formData.address,
                user_city: formData.city,
                user_postal_code: formData.postalCode,
                request_type: formData.type,
                request_description: formData.description,
                request_priority: formData.priority || 'Non spécifié',
                user_role: formData.role || 'Non spécifié',
            });

            alert('Demande envoyée avec succès ! Un email de confirmation a été envoyé.');
            // Réinitialisation du formulaire après l'envoi
            document.getElementById('repairForm').reset();
            currentStep = 0; // Revenir à la première étape
            initializeSteps();
        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'email :', error);
            alert('Une erreur est survenue lors de l\'envoi de votre demande. Veuillez réessayer.');
        }
    });

    // Initialisation des étapes au chargement
    initializeSteps();
});
