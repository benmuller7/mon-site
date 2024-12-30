document.addEventListener("DOMContentLoaded", () => {
    const steps = document.querySelectorAll(".step");
    const nextButtons = document.querySelectorAll(".next-btn");
    const prevButtons = document.querySelectorAll(".prev-btn");
    const form = document.getElementById("repairRequestForm");
    const acceptButton = document.getElementById("accept-cgu");
    const submissionArea = document.getElementById("submission-area");
    const cguConfirmation = document.getElementById("cgu-confirmation");
    const preview = document.getElementById("preview");
    let currentStep = 0;

    // Met à jour l'étape active
    const updateStep = () => {
        steps.forEach((step, index) => {
            step.classList.toggle("active", index === currentStep);
        });

        // Remplir le résumé des étapes précédentes à l'étape 4
        if (currentStep === 3) {
            document.getElementById("summaryName").textContent = document.getElementById("name").value;
            document.getElementById("summaryEmail").textContent = document.getElementById("email").value;
            document.getElementById("summaryPhone").textContent = document.getElementById("phone").value;
            document.getElementById("summaryStatus").textContent =
                document.getElementById("status").value === "proprietaire" ? "Propriétaire" : "Locataire";
            document.getElementById("summaryAddress").textContent = document.getElementById("address").value;
            document.getElementById("summaryJobType").textContent = document.getElementById("jobType").value;
            document.getElementById("summaryDescription").textContent = document.getElementById("description").value;
        }
    };

    // Gestion des boutons "Suivant"
    nextButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            if (currentStep < steps.length - 1) {
                currentStep++;
                updateStep();
            }
        });
    });

    // Gestion des boutons "Précédent"
    prevButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            if (currentStep > 0) {
                currentStep--;
                updateStep();
            }
        });
    });

    // Gestion de la soumission du formulaire
    form.addEventListener("submit", (e) => {
        if (!cguCheckbox.checked) {
            e.preventDefault();
            alert("Vous devez accepter les conditions générales d'utilisation pour continuer.");
        } else {
            alert("Votre demande a bien été envoyée !");
            form.reset();
            currentStep = 0;
            updateStep();
        }
    });

    // Gestion de l'aperçu des images téléchargées
    document.getElementById("photos").addEventListener("change", function () {
        preview.innerHTML = ""; // Réinitialise l'aperçu à chaque changement
        const files = this.files;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            // Vérifie si le fichier est une image
            if (file.type.startsWith("image/")) {
                const reader = new FileReader();

                reader.onload = function (e) {
                    const img = document.createElement("img");
                    img.src = e.target.result;
                    img.alt = "Aperçu de l'image";
                    img.style.width = "100px";
                    img.style.margin = "5px";
                    img.style.borderRadius = "8px";
                    img.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
                    preview.appendChild(img);
                };

                reader.readAsDataURL(file);
            } else {
                alert("Veuillez sélectionner uniquement des fichiers image.");
            }
        }
    });
});
document.addEventListener("DOMContentLoaded", () => {
    const acceptButton = document.getElementById("accept-cgu");
    const submissionArea = document.getElementById("submission-area");
    const cguConfirmation = document.getElementById("cgu-confirmation");

        acceptButton.addEventListener("click", () => {
        // Masquer le bouton "J'accepte" et afficher le bouton "Envoyer"
        cguConfirmation.style.display = "none";
        submissionArea.style.display = "flex"; // Utiliser flex pour aligner les boutons
        alert("Merci d'avoir accepté les conditions générales d'utilisation !");
    });

    const form = document.getElementById("repairRequestForm");
    form.addEventListener("submit", (e) => {
        alert("Votre demande a bien été envoyée !");
        form.reset();
    });
});
