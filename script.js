// Génération d'un identifiant unique
const generateUniqueId = () => {
    const timestampPart = String(Date.now()).slice(-5);
    const randomPart = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return timestampPart + randomPart;
};
// Informations GitHub
const GITHUB_OWNER = 'benmuller7'; // Remplacez par votre nom d'utilisateur GitHub
const GITHUB_REPO = 'Images-Depannage'; // Nom du dépôt
const GITHUB_TOKEN = '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'; // Token GitHub avec les permissions nécessaires

// Fonction pour uploader un fichier sur GitHub
async function uploadToGitHub(file) {
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
        reader.onload = async () => {
            const base64Content = reader.result(',')[1];
            const filePath = `${Date.now()}_${file.name}`; // Chemin unique pour le fichier

            try {
                const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/uploads/${filePath}`, {
                    method: 'PUT',
                    headers: {
                        Authorization: `Bearer ${GITHUB_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: `Ajout de la photo ${file.name}`,
                        content: base64Content,
                    }),
                });

                if (response.ok) {
                    const jsonResponse = await response.json();
                    resolve(jsonResponse.content.download_url); // Lien du fichier
                } else {
                    reject(`Erreur lors de l'upload : ${response.statusText}`);
                }
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Sélection des étapes
const steps = document.querySelectorAll('.form-step');
let currentStep = 0;

// Mise à jour des boutons de navigation
const updateButtons = () => {
    document.getElementById('prevBtn').disabled = currentStep === 0;
    document.getElementById('nextBtn').style.display = currentStep === steps.length - 1 ? 'none' : 'inline-block';
    document.getElementById('submitBtn').style.display = currentStep === steps.length - 1 ? 'inline-block' : 'none';

    // Mettre à jour le résumé dans la dernière étape
    if (currentStep === steps.length - 1) {
        document.getElementById('summaryName').textContent = document.getElementById('name').value;
        document.getElementById('summaryEmail').textContent = document.getElementById('email').value;
        document.getElementById('summaryPhone').textContent = document.getElementById('phone').value;
        document.getElementById('summaryAddress').textContent = document.getElementById('address').value;
        document.getElementById('summaryType').textContent = document.getElementById('type').value;
        document.getElementById('summaryUrgency').textContent = document.getElementById('urgency').value;
        document.getElementById('summaryDescription').textContent = document.getElementById('description').value;
    }

    // Affiche ou masque l'ajout de photos en fonction de l'étape
    const photoUpload = document.querySelector('.photo-upload');
    if (photoUpload) {
        photoUpload.style.display = currentStep === 2 ? 'block' : 'none';
    }
};

// Initialisation des étapes
const initializeSteps = () => {
    steps.forEach((step, index) => {
        step.classList.toggle('active', index === currentStep);
    });

    updateButtons();
};

// Bouton "Précédent"
document.getElementById('prevBtn').addEventListener('click', () => {
    if (currentStep > 0) {
        currentStep--;
        initializeSteps();
    }
});

// Bouton "Suivant"
document.getElementById('nextBtn').addEventListener('click', () => {
    if (currentStep < steps.length - 1) {
        currentStep++;
        initializeSteps();
    }
});

// Gestion des boutons dynamiques et tooltips
document.querySelectorAll('.select-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
        const inputId = btn.parentNode.nextElementSibling?.id;
        const selectedValue = btn.dataset.value;

        // Met à jour la valeur cachée
        if (inputId) {
            document.getElementById(inputId).value = selectedValue;
        }

        // Active visuellement le bouton sélectionné
        btn.parentNode.querySelectorAll('.select-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        // Remplace le logo dans le bouton sélectionné
        const img = btn.querySelector('img');
        switch (selectedValue) {
            case 'Électricité':
                img.src = 'images/electricity-dynamic.png';
                img.alt = 'Logo Électricité';
                break;
            case 'Plomberie':
                img.src = 'images/plumbing-dynamic.png';
                img.alt = 'Logo Plomberie';
                break;
            case 'Serrurerie':
                img.src = 'images/locksmith-dynamic.png';
                img.alt = 'Logo Serrurerie';
                break;
            case 'Vitrerie':
                img.src = 'images/glass-dynamic.png';
                img.alt = 'Logo Vitrerie';
                break;
            case 'Autre':
                img.src = 'images/other.png';
                img.alt = 'Logo Autre';
                break;
        }

        // Réinitialise les autres boutons à leur état classique
        btn.parentNode.querySelectorAll('.select-btn').forEach((b) => {
            if (b !== btn) {
                const bImg = b.querySelector('img');
                switch (b.dataset.value) {
                    case 'Électricité':
                        bImg.src = 'images/electricity.png';
                        bImg.alt = 'Logo Électricité';
                        break;
                    case 'Plomberie':
                        bImg.src = 'images/plumbing.png';
                        bImg.alt = 'Logo Plomberie';
                        break;
                    case 'Serrurerie':
                        bImg.src = 'images/locksmith.png';
                        bImg.alt = 'Logo Serrurerie';
                        break;
                    case 'Vitrerie':
                        bImg.src = 'images/glass.png';
                        bImg.alt = 'Logo Vitrerie';
                        break;
                    case 'Autre':
                        bImg.src = 'images/other.png';
                        bImg.alt = 'Logo Autre';
                        break;
                }
            }
        });
    });
});

const photoInput = document.getElementById('photoInput');
const photoPreviewContainer = document.getElementById('photoPreviewContainer');

// Fonction pour afficher les photos ajoutées
const handlePhotoUpload = (event) => {
    const files = event.target.files;

    Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const photoItem = document.createElement('div');
            photoItem.className = 'photo-item';

            const img = document.createElement('img');
            img.src = e.target.result;
            img.alt = 'Photo ajoutée';

            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-photo';
            deleteButton.textContent = '×';
            deleteButton.addEventListener('click', () => {
                photoItem.remove();
            });

            photoItem.appendChild(img);
            photoItem.appendChild(deleteButton);
            photoPreviewContainer.appendChild(photoItem);
        };
        reader.readAsDataURL(file);
    });
};

photoInput.addEventListener('change', handlePhotoUpload);

// Soumission du formulaire
document.getElementById('repairForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const cguChecked = document.getElementById('cgu').checked;
    if (!cguChecked) {
        document.getElementById('cguError').textContent = 'Vous devez accepter les CGU.';
        return;
    }

    const requestId = generateUniqueId();
    const photoLinks = await handlePhotoSubmit(); // Récupérer les liens des photos

    const formData = {
        request_id: requestId,
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value,
        type: document.getElementById('type').value,
        urgency: document.getElementById('urgency').value,
        description: document.getElementById('description').value,
        photos: photoLinks, // Liens GitHub des photos
    };

    console.log('Form data being submitted:', formData);

    emailjs.send('service_uzzmtzc', 'template_bes6bcg', formData)
        .then((response) => {
            console.log('Email envoyé avec succès:', response);
            alert(`Demande envoyée avec succès ! ID : ${requestId}`);
        })
        .catch((error) => {
            console.error('Erreur lors de l\'envoi de l\'email:', error);
            alert('Une erreur est survenue. Veuillez réessayer.');
        });
});

// Gestion des photos ajoutées et envoi à GitHub
async function handlePhotoSubmit() {
    const files = photoInput.files;
    const links = [];

    for (const file of files) {
        try {
            const link = await uploadToGitHub(file);
            links.push(link);
        } catch (error) {
            console.error('Erreur lors de l\'upload GitHub:', error);
        }
    }

    return links;
}


// Initialisation au chargement
initializeSteps();
