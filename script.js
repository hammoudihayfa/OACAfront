const API_BASE_URL = 'http://localhost:8081/equipements-en-panne';

document.addEventListener('DOMContentLoaded', () => {
    // Charger l'historique des pannes au chargement de la page "panne"
    if (window.location.hash === '#panne' || !window.location.hash) {
        loadIssueHistory();
    }

    // Écouter la soumission du formulaire de déclaration de panne
    const issueForm = document.getElementById('issue-form');
    if (issueForm) {
        issueForm.addEventListener('submit', handleIssueFormSubmit);
    }

    // Fonction pour gérer la navigation (si ce script gère toute la navigation)
    setupNavigation();
});

function setupNavigation() {
    const navLinks = document.querySelectorAll('nav a');
    const mainContent = document.querySelector('.main-content');

    navLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            let filePath = '';

            switch (targetId) {
                case 'inventory':
                    filePath = 'inventory.html';
                    break;
                case 'panne':
                    filePath = 'panne.html';
                    break;
                case 'notifications':
                    filePath = 'NotificationAgent.html';
                    break;
                case 'history':
                    filePath = 'historique.html';
                    break;
                case 'profile':
                    filePath = 'profile.html';
                    break;
                default:
                    filePath = 'panne.html'; // Page par défaut
                    break;
            }
            loadContent(filePath);
        });
    });

    function loadContent(filePath) {
        fetch(filePath)
            .then(response => response.text())
            .then(html => {
                mainContent.innerHTML = html;
                // Après avoir chargé le contenu de la panne, on attache les événements
                if (filePath === 'panne.html') {
                    const issueForm = document.getElementById('issue-form');
                    if (issueForm) {
                        issueForm.addEventListener('submit', handleIssueFormSubmit);
                    }
                    loadIssueHistory();
                }
                // Ajouter ici d'autres initialisations spécifiques à la page chargée
            })
            .catch(error => {
                console.error('Erreur lors du chargement de la page:', error);
                mainContent.innerHTML = '<p>Erreur lors du chargement du contenu.</p>';
            });
    }

    // Charger le contenu initial (par défaut la page "panne" ici)
    if (!window.location.hash) {
        loadContent('panne.html');
    } else {
        const initialTarget = window.location.hash.substring(1);
        let initialFilePath = '';
        switch (initialTarget) {
            case 'inventory':
                initialFilePath = 'inventory.html';
                break;
            case 'panne':
                initialFilePath = 'panne.html';
                break;
            case 'notifications':
                initialFilePath = 'NotificationAgent.html';
                break;
            case 'history':
                initialFilePath = 'historique.html';
                break;
            case 'profile':
                initialFilePath = 'profile.html';
                break;
            default:
                initialFilePath = 'panne.html';
                break;
        }
        loadContent(initialFilePath);
    }
}

function handleIssueFormSubmit(event) {
    event.preventDefault();

    const equipementId = document.getElementById('equipement-id').value;
    const typeDePanne = document.getElementById('issue-type').value;
    const priorite = document.getElementById('issue-priority').value;
    const description = document.getElementById('issue-description').value;

    const nouvellePanne = {
        equipement: { numeroPatrimoine: equipementId }, // Assurez-vous que votre backend attend un objet equipement avec numeroPatrimoine
        typeDePanne: typeDePanne,
        priorite: priorite,
        description: description,
        statut: 'Non résolu' // Statut initial
        // datePanne sera gérée par le backend (généralement)
    };

    fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(nouvellePanne)
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => { throw new Error(`Erreur lors de l'ajout de la panne: ${response.status} - ${text}`) });
        }
        return response.text();
    })
    .then(data => {
        console.log('Panne ajoutée:', data);
        alert('Panne déclarée avec succès!');
        document.getElementById('issue-form').reset();
        loadIssueHistory(); // Recharger l'historique après l'ajout
    })
    .catch(error => {
        console.error('Erreur:', error);
        alert('Erreur lors de la déclaration de la panne.');
    });
}

function loadIssueHistory() {
    const historyTableBody = document.getElementById('history-table').querySelector('tbody');
    if (!historyTableBody) {
        console.error("Le corps du tableau d'historique n'a pas été trouvé.");
        return;
    }
    historyTableBody.innerHTML = ''; // Effacer le tableau précédent

    fetch(API_BASE_URL)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erreur lors de la récupération de l'historique: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            data.forEach(panne => {
                const row = historyTableBody.insertRow();
                row.insertCell().textContent = panne.idEquipementEnPanne;
                row.insertCell().textContent = panne.equipement ? panne.equipement.numeroPatrimoine : 'N/A'; // Afficher l'ID de l'équipement
                row.insertCell().textContent = panne.typeDePanne;
                row.insertCell().textContent = new Date(panne.datePanne).toLocaleDateString();
                row.insertCell().textContent = panne.priorite;
                row.insertCell().textContent = panne.statut;
                const actionsCell = row.insertCell();
                actionsCell.innerHTML = `
                    <div class="action-icons">
                        <div class="action-icon view" data-id="${panne.idEquipementEnPanne}"><i class="fas fa-eye"></i></div>
                        <div class="action-icon delete" data-id="${panne.idEquipementEnPanne}"><i class="fas fa-trash-alt"></i></div>
                    </div>
                `;
            });
            attachViewIssueListeners();
            attachDeleteIssueListeners();
        })
        .catch(error => {
            console.error('Erreur lors du chargement de l\'historique:', error);
            historyTableBody.innerHTML = '<tr><td colspan="7">Erreur lors du chargement de l\'historique des pannes.</td></tr>';
        });
}

function attachViewIssueListeners() {
    const viewIcons = document.querySelectorAll('#history-table .action-icon.view');
    viewIcons.forEach(icon => {
        icon.addEventListener('click', function() {
            const issueId = this.getAttribute('data-id');
            fetchIssueDetails(issueId);
        });
    });
}

function fetchIssueDetails(issueId) {
    fetch(`${API_BASE_URL}/${issueId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erreur lors de la récupération des détails de la panne: ${response.status}`);
            }
            return response.json();
        })
        .then(panne => {
            const detailsContainer = document.getElementById('view-issue-details');
            if (detailsContainer) {
                detailsContainer.innerHTML = `
                    <p><strong>ID:</strong> ${panne.idEquipementEnPanne}</p>
                    <p><strong>Équipement ID:</strong> ${panne.equipement ? panne.equipement.numeroPatrimoine : 'N/A'}</p>
                    <p><strong>Type de panne:</strong> ${panne.typeDePanne}</p>
                    <p><strong>Date de la panne:</strong> ${new Date(panne.datePanne).toLocaleDateString()}</p>
                    <p><strong>Priorité:</strong> ${panne.priorite}</p>
                    <p><strong>Statut:</strong> ${panne.statut}</p>
                    <p><strong>Description:</strong> ${panne.description}</p>
                    ${panne.idProgrammeMaintenance ? `<p><strong>ID Programme Maintenance:</strong> ${panne.idProgrammeMaintenance}</p>` : ''}
                `;
                const modal = document.getElementById('view-issue-modal');
                if (modal) {
                    modal.classList.add('show');
                }
            }
        })
        .catch(error => {
            console.error('Erreur lors de la récupération des détails:', error);
            alert('Erreur lors de la récupération des détails de la panne.');
        });
}

function setupViewIssueModal() {
    const closeModalButton = document.getElementById('close-view-issue');
    const closeModalFooterButton = document.getElementById('close-view-issue-btn');
    const modal = document.getElementById('view-issue-modal');

    if (closeModalButton) {
        closeModalButton.addEventListener('click', () => modal.classList.remove('show'));
    }
    if (closeModalFooterButton) {
        closeModalFooterButton.addEventListener('click', () => modal.classList.remove('show'));
    }
    if (modal) {
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.classList.remove('show');
            }
        });
    }
}

function attachDeleteIssueListeners() {
    const deleteIcons = document.querySelectorAll('#history-table .action-icon.delete');
    deleteIcons.forEach(icon => {
        icon.addEventListener('click', function() {
            const issueId = this.getAttribute('data-id');
            if (confirm(`Êtes-vous sûr de vouloir supprimer la panne avec l'ID ${issueId} ?`)) {
                deleteIssue(issueId);
            }
        });
    });
}

function deleteIssue(issueId) {
    fetch(`${API_BASE_URL}/${issueId}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => { throw new Error(`Erreur lors de la suppression de la panne: ${response.status} - ${text}`) });
        }
        console.log(`Panne avec l'ID ${issueId} supprimée avec succès.`);
        alert('Panne supprimée avec succès!');
        loadIssueHistory(); // Recharger l'historique après la suppression
    })
    .catch(error => {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression de la panne.');
    });
}