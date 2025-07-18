const API_URL = 'https://miaou.vps.webdock.cloud/api';

document.addEventListener('DOMContentLoaded', () => {
    const leaderboardContainer = document.getElementById('leaderboard-container');

    const updateLeaderboard = (teams) => {
        const existingCards = new Map();
        leaderboardContainer.querySelectorAll('.leaderboard-card').forEach(card => {
            existingCards.set(card.dataset.teamId, card);
        });

        const teamIdsInOrder = teams.map(team => team.id);

        teams.forEach((team, index) => {
            const rank = `#${index + 1}`;
            const card = existingCards.get(team.id);

            if (card) {
                // Le carte existe, on la met à jour
                const rankElement = card.querySelector('.card-rank');
                if (rankElement.textContent !== rank) {
                    rankElement.textContent = rank;
                }

                const scoreElement = card.querySelector('.card-score');
                if (scoreElement.textContent !== String(team.score)) {
                    scoreElement.textContent = team.score;
                    scoreElement.classList.add('score-updated');
                    scoreElement.addEventListener('animationend', () => {
                        scoreElement.classList.remove('score-updated');
                    }, { once: true });
                }
                existingCards.delete(team.id); 
            } else {
                // La carte n'existe pas, on la crée
                const newCard = document.createElement('div');
                newCard.className = `leaderboard-card team-border-${team.name}`;
                newCard.dataset.teamId = team.id; 
                newCard.innerHTML = `
                    <div class="card-rank">#${index + 1}</div>
                    <h3 class="card-team-name team-tag-${team.name}">${team.name}</h3>
                    <div class="card-score">${team.score}</div>
                `;
                leaderboardContainer.appendChild(newCard);
            }
        });

        // Supprimer les anciennes cartes (équipes qui ne sont plus dans le top)
        existingCards.forEach(card => card.remove());

        // Réorganiser les cartes dans le DOM selon le nouveau classement
        const cardsToSort = Array.from(leaderboardContainer.children);
        cardsToSort.sort((a, b) => {
            const rankA = teamIdsInOrder.indexOf(a.dataset.teamId);
            const rankB = teamIdsInOrder.indexOf(b.dataset.teamId);
            return rankA - rankB;
        });
        cardsToSort.forEach(card => leaderboardContainer.appendChild(card));
    };

    const fetchScores = async () => {
        try {
            const response = await fetch(`${API_URL}/scores`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const teams = await response.json();
            
            if (teams.length === 0) {
                leaderboardContainer.innerHTML = '<p>Les scores ne sont pas encore disponibles.</p>';
                return;
            }

            updateLeaderboard(teams);

        } catch (error) {
            leaderboardContainer.innerHTML = '<p>Erreur de chargement des scores.</p>';
        }
    };

    fetchScores();
    setInterval(fetchScores, 5000); 
});