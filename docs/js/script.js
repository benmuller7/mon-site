function selectStatus(status) {
    const statusField = document.getElementById('status');
    const ownerButton = document.getElementById('owner-button');
    const tenantButton = document.getElementById('tenant-button');

    statusField.value = status;
    if (status === 'proprietaire') {
        ownerButton.classList.add('selected');
        tenantButton.classList.remove('selected');
    } else {
        tenantButton.classList.add('selected');
        ownerButton.classList.remove('selected');
    }
}

function nextStep(step) {
    if (!validateStep(step)) return;

    const currentStep = document.getElementById(`step-${step}`);
    const nextStep = document.getElementById(`step-${step + 1}`);
    currentStep.classList.remove('active');
    nextStep.classList.add('active');

    updateProgressBar(step + 1);
}

function previousStep(step) {
    const currentStep = document.getElementById(`step-${step + 1}`);
    const previousStep = document.getElementById(`step-${step}`);
    currentStep.classList.remove('active');
    previousStep.classList.add('active');

    updateProgressBar(step);
}

function validateStep(step) {
    let isValid = true;
    const inputs = document.querySelectorAll(`#step-${step} input:required, #step-${step} textarea:required`);
    inputs.forEach(input => {
        const errorMessage = input.nextElementSibling;
        if (!input.checkValidity()) {
            input.classList.add('error-border');
            if (errorMessage) errorMessage.textContent = input.validationMessage;
            isValid = false;
        } else {
            input.classList.remove('error-border');
            if (errorMessage) errorMessage.textContent = '';
        }
    });
    return isValid;
}

function updateProgressBar(step) {
    const progressBar = document.getElementById('progress-bar');
    const totalSteps = 4;
    const progress = (step / totalSteps) * 100;
    progressBar.style.width = `${progress}%`;
    progressBar.setAttribute('aria-valuenow', progress);
}

document.getElementById('multi-step-form').addEventListener('submit', event => {
    event.preventDefault();
    const termsCheckbox = document.getElementById('terms-checkbox');
    if (!termsCheckbox.checked) {
        alert("Veuillez accepter les conditions générales.");
        return;
    }

    document.getElementById('multi-step-form').style.display = 'none';
    document.getElementById('confirmation-message').style.display = 'block';
});
