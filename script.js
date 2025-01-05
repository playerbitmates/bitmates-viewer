let originalOrder = [];
let selectedCards = [];
const MAX_SELECTED = 2;

async function performSearch() {
  // Limpa a seleção de forma segura
  selectedCards = [];
  const compareContainer = document.getElementById('compareContainer');
  const comparisonResult = document.getElementById('comparisonResult');
  const compareButtons = compareContainer.children;
  
  // Restaura a visibilidade dos botões ao fazer nova pesquisa
  compareButtons[0].style.display = 'block'; // Compare Selected BitMates
  compareButtons[1].style.display = 'block'; // Clear Selection
  
  if (compareContainer) compareContainer.style.display = 'none';
  if (comparisonResult) comparisonResult.style.display = 'none';
  
  originalOrder = [];
  const searchValue = document.getElementById('searchValue').value.trim();
  const resultDiv = document.getElementById('result');
  const sortingButtons = document.getElementById('sortingButtons');
  
  resultDiv.innerHTML = '<p class="error-message">Loading...</p>';
  if (sortingButtons) sortingButtons.style.display = 'none';

  if (!searchValue) {
    resultDiv.innerHTML = '<p class="error-message">Please, enter an ID, wallet address or player name.</p>';
    return;
  }

  try {
    let nftsToDisplay = [];
    let walletToSearch = '';

    // Verifica se é um endereço ETH válido (começa com 0x e tem 42 caracteres)
    if (/^0x[a-fA-F0-9]{40}$/.test(searchValue)) {
      walletToSearch = searchValue;
    } 
    // Verifica se é uma lista de IDs (contém apenas números, vírgulas e espaços)
    else if (/^[\d,\s]+$/.test(searchValue)) {
      const cleanedValue = searchValue.replace(/,\s*$/, '');
      nftsToDisplay = [...new Set(  // Usando Set para remover duplicatas
        cleanedValue
          .split(/[,\s]+/)
          .map(id => id.trim())
          .filter(id => id !== '')
          .filter(id => !isNaN(id))
      )];

      if (nftsToDisplay.length === 0) {
        resultDiv.innerHTML = '<p class="error-message">Por favor, insira IDs válidos.</p>';
        return;
      }

      // Armazena a ordem original da lista
      originalOrder = [...nftsToDisplay];

      resultDiv.innerHTML = `
        ${nftsToDisplay.length > 1 ? `<h2>Total BitMates: ${nftsToDisplay.length}</h2>` : ''}
        <div class="nft-grid"></div>
      `;
    }
    // Se não é wallet nem ID, tenta buscar como IGN
    else {
      try {
        const playerResponse = await fetch(`https://bitmatemediator.net/highscore/v1/player/${searchValue}`);
        const playerData = await playerResponse.json();
        
        if (playerData.data && playerData.data.address) {
          walletToSearch = playerData.data.address;
        } else {
          resultDiv.innerHTML = '<p class="error-message">Player not found.</p>';
          return;
        }
      } catch (error) {
        resultDiv.innerHTML = '<p class="error-message">Error fetching player information.</p>';
        return;
      }
    }

    // Se temos uma wallet para pesquisar (seja direta ou via IGN)
    if (walletToSearch) {
      const apiKey = 'alcht_Da0G0kZ5pKqzCqSqNzmOvtJ60iXFKd';
      const contractAddress = '0xF8C18Df7509c03b45e6247b2b9E73fcaDEF24dd6';
      let allNfts = [];
      let pageKey = null;
      
      // Função para aguardar um tempo específico
      const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
      
      do {
        const url = `https://eth-mainnet.g.alchemy.com/nft/v3/${apiKey}/getNFTsForOwner?owner=${walletToSearch}&withMetadata=true&pageSize=100&contractAddresses[]=${contractAddress}${pageKey ? `&pageKey=${pageKey}` : ''}`;
        try {
          const response = await fetch(url);
          const data = await response.json();
          
          if (data.ownedNfts) {
            allNfts = [...allNfts, ...data.ownedNfts];
            pageKey = data.pageKey;
          } else {
            pageKey = null;
          }
          
          // Aguarda 500ms entre as requisições
          await delay(500);
        } catch (error) {
          console.error('Error fetching page:', error);
          pageKey = null;
        }
      } while (pageKey);

      if (allNfts.length === 0) {
        resultDiv.innerHTML = '<p class="error-message">This wallet does not have BitMates.</p>';
        return;
      }

      nftsToDisplay = allNfts.map(nft => nft.tokenId);
      resultDiv.innerHTML = `
        ${nftsToDisplay.length > 1 ? `<h2>Total BitMates: ${nftsToDisplay.length}</h2>` : ''}
        <div class="nft-grid"></div>
      `;
    }

    const nftGrid = resultDiv.querySelector('.nft-grid');

    // Busca e exibe os NFTs
    for (const tokenId of nftsToDisplay) {
      try {
        const response = await fetch(`bitmates/${tokenId}.json`);
        if (!response.ok) continue;
        
        const data = await response.json();
        
        const nftCard = document.createElement('div');
        nftCard.className = 'nft-card';
        nftCard.innerHTML = `
          <div class="card-header">
            <h2>#${data.id}</h2>
            ${nftsToDisplay.length > 1 ? `
              <label class="compare-label">
                <input type="checkbox" class="compare-checkbox" onchange="handleSelection(this, ${data.id})" />
                Compare
              </label>
            ` : ''}
          </div>
          <img src="${data.image}" alt="${data.name}">

          <div class="section">
            <h3>Regions</h3>
            <ul class="region-list">
              ${data.region.map(region => `
                <li>
                  <span class="label">${region.type === 'main' ? 'Region' : 
                           region.type === 'sub' ? 'Sub-Region' : 
                           'Secondary-Region'}:</span> ${region.region} <span class="rarity-badge">${region.rarity}</span>
                </li>
              `).join('')}
            </ul>
          </div>

          <div class="section">
            <h3>Characteristics</h3>
            <ul class="characteristics-list">
              ${(() => {
                const species = data.characteristics.filter(char => char.trait_type === 'Species');
                const cosmetics = data.characteristics.filter(char => 
                  char.trait_type !== 'Species' && 
                  char.trait_type !== 'Favor' && 
                  !['Brain Type', 'Tempo', 'Charm', 'Physique', 'Fortune'].includes(char.trait_type)
                );
                const traits = data.characteristics.filter(char => 
                  ['Brain Type', 'Tempo', 'Charm', 'Physique', 'Fortune'].includes(char.trait_type)
                );

                return `
                  <div class="char-group species-group">
                    ${species.map(char => `
                      <li>
                        <span class="label">${char.trait_type}:</span> ${char.value} 
                        ${char.rare ? `<span class="rarity-badge">${char.rare}</span>` : ''}
                      </li>
                    `).join('')}
                  </div>

                  ${cosmetics.length > 0 ? `
                    <div class="char-group cosmetics-group">
                      ${cosmetics.map(char => `
                        <li>
                          <span class="label">${char.trait_type}:</span> ${char.value} 
                          ${char.rare ? `<span class="rarity-badge">${char.rare}</span>` : ''}
                        </li>
                      `).join('')}
                    </div>
                  ` : ''}

                  <div class="char-group traits-group">
                    ${traits.map(char => `
                      <li>
                        <span class="label">${char.trait_type}:</span> ${char.value} 
                        ${char.rare ? `<span class="rarity-badge">${char.rare}</span>` : ''}
                      </li>
                    `).join('')}
                  </div>
                `;
              })()}
            </ul>
          </div>

          <!-- Favor separado em sua própria div -->
          <div class="section">
            ${data.characteristics
              .filter(char => char.trait_type === 'Favor')
              .map(char => `
                <p class="total-stats favor-stats">
                  <span class="label">Favor:</span>
                  <span>${char.value}</span>
                </p>
              `).join('')}
          </div>

          <!-- Stats em sua própria div -->
          <div class="section">
            <h3>Stats</h3>
            <ul class="attribute-list">
              ${data.attributes.map(attr => `
                <li>
                  <div>
                    <span class="label">${attr.trait_type}:</span>
                    <span>${attr.value}</span>
                  </div>
                  <div class="stat-bar-container">
                    <div class="stat-bar" style="width: ${(attr.value / 99) * 100}%"></div>
                  </div>
                </li>
              `).join('')}
            </ul>
            <p class="total-stats stats-total">
              <span class="label">Total Stats:</span>
              <span>${data.totalStats}</span>
            </p>
          </div>
        `;
        
        nftGrid.appendChild(nftCard);
      } catch (error) {
        console.error(`Error fetching BitMate #${tokenId}:`, error);
      }
    }

    // Mostrar botões de ordenação se houver mais de 1 card
    if (nftsToDisplay.length > 1) {
      sortingButtons.style.display = 'block';
      // Popula o filtro de traits após renderizar todos os cards
      populateTraitFilter(document.querySelectorAll('.nft-card'));
      populateLandFilter(document.querySelectorAll('.nft-card'));
      // Marca o botão default como ativo
      initDefaultSort();
    }
  } catch (error) {
    resultDiv.innerHTML = `<p class="error">Erro ao buscar NFTs: ${error.message}</p>`;
  }
}

// Adiciona suporte para pressionar Enter no campo de busca
document.getElementById('searchValue').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    performSearch();
  }
});

function sortCards(sortType) {
  const nftGrid = document.querySelector('.nft-grid');
  if (!nftGrid) return;

  // Atualiza os botões ativos
  document.querySelectorAll('.sort-button').forEach(button => {
    button.classList.remove('active');
  });
  
  // Adiciona classe active no botão clicado
  const clickedButton = document.querySelector(`button[onclick*="sortCards('${sortType}')"]`);
  if (clickedButton) {
    clickedButton.classList.add('active');
  }

  const cards = Array.from(nftGrid.children);
  
  cards.sort((a, b) => {
    if (sortType === 'favor') {
      const favorA = parseInt(a.querySelector('.favor-stats span:not(.label)').textContent) || 0;
      const favorB = parseInt(b.querySelector('.favor-stats span:not(.label)').textContent) || 0;
      return favorB - favorA;
    } 
    else if (sortType === 'stats') {
      const statsA = parseInt(a.querySelector('.stats-total span:not(.label)').textContent) || 0;
      const statsB = parseInt(b.querySelector('.stats-total span:not(.label)').textContent) || 0;
      return statsB - statsA;
    }
    else if (sortType === 'species') {
      // Pega o elemento da espécie e sua raridade
      const getSpeciesRarity = (card) => {
        const speciesGroup = card.querySelector('.species-group');
        const rarityBadge = speciesGroup?.querySelector('.rarity-badge');
        if (rarityBadge) {
          // Remove o símbolo % e substitui vírgula por ponto
          const rarityText = rarityBadge.textContent
            .replace('%', '')
            .replace(',', '.');
          return parseFloat(rarityText) || 100;
        }
        return 100; // Valor padrão caso não encontre raridade
      };
      
      const rarityA = getSpeciesRarity(a);
      const rarityB = getSpeciesRarity(b);
      return rarityA - rarityB; // Ordem crescente (menor raridade primeiro)
    }
    else if (sortType === 'land') {
      // Função para pegar a raridade mais relevante do card
      const getLandRarity = (card) => {
        const regions = card.querySelectorAll('.region-list li');
        let bestRarity = 100;
        let hasSubRegion = false;
        
        regions.forEach(region => {
          const label = region.querySelector('.label').textContent;
          const rarity = parseFloat(region.querySelector('.rarity-badge').textContent.replace('%', '').replace(',', '.')) || 100;
          
          // Se tem Sub-Region, considera apenas ela
          if (label.includes('Sub-Region')) {
            hasSubRegion = true;
            bestRarity = rarity;
          }
          // Se não tem Sub mas tem Secondary, considera ela
          else if (!hasSubRegion && label.includes('Secondary-Region')) {
            bestRarity = rarity;
          }
          // Se só tem Region e ainda não achou melhor, usa ela
          else if (!hasSubRegion && label.includes('Region:')) {
            bestRarity = rarity;
          }
        });
        
        // Adiciona peso para priorizar BitMates com Sub-Region
        if (hasSubRegion) {
          return bestRarity;
        } else if (regions.length > 1) {
          return bestRarity + 100; // Secondary-Region
        } else {
          return bestRarity + 200; // Só Region
        }
      };
      
      const rarityA = getLandRarity(a);
      const rarityB = getLandRarity(b);
      return rarityA - rarityB;
    }
    else {
      // Ordem padrão - usa a ordem original se existir, senão ordena por ID
      if (originalOrder.length > 0) {
        const idA = parseInt(a.querySelector('h2').textContent.replace('#', ''));
        const idB = parseInt(b.querySelector('h2').textContent.replace('#', ''));
        return originalOrder.indexOf(idA.toString()) - originalOrder.indexOf(idB.toString());
      } else {
        const idA = parseInt(a.querySelector('h2').textContent.replace('#', '')) || 0;
        const idB = parseInt(b.querySelector('h2').textContent.replace('#', '')) || 0;
        return idA - idB;
      }
    }
  });

  // Limpa o grid e reinsere os cards ordenados
  while (nftGrid.firstChild) {
    nftGrid.removeChild(nftGrid.firstChild);
  }
  cards.forEach(card => nftGrid.appendChild(card));
}

// Marca o botão default como ativo quando carregar os cards
function initDefaultSort() {
  const defaultButton = document.querySelector(`button[onclick*="sortCards('default')"]`);
  if (defaultButton) {
    defaultButton.classList.add('active');
  }
}

function handleSelection(checkbox, id) {
  const compareContainer = document.getElementById('compareContainer');
  const comparisonResult = document.getElementById('comparisonResult');

  if (checkbox.checked) {
    if (selectedCards.length >= MAX_SELECTED) {
      checkbox.checked = false;
      alert('You can only select 2 BitMates to compare');
      return;
    }
    selectedCards.push(id);
  } else {
    selectedCards = selectedCards.filter(cardId => cardId !== id);
    comparisonResult.style.display = 'none';
  }

  // Mostra os botões apenas quando tiver exatamente 2 cards selecionados
  compareContainer.style.display = selectedCards.length === 2 ? 'flex' : 'none';
}

function clearSelection() {
  selectedCards = [];
  document.querySelectorAll('.compare-checkbox').forEach(checkbox => {
    checkbox.checked = false;
  });
  
  // Esconde os elementos de comparação
  const compareContainer = document.getElementById('compareContainer');
  const comparisonResult = document.getElementById('comparisonResult');
  const compareButtons = compareContainer.children;
  
  // Restaura a visibilidade dos botões
  compareButtons[0].style.display = 'block'; // Compare Selected BitMates
  compareButtons[1].style.display = 'block'; // Clear Selection
  
  if (compareContainer) compareContainer.style.display = 'none';
  if (comparisonResult) comparisonResult.style.display = 'none';
  
  // Mostra novamente a lista de BitMates e o total
  const nftGrid = document.querySelector('.nft-grid');
  const totalBitmates = document.querySelector('#result > h2');
  const sortingButtons = document.getElementById('sortingButtons');
  
  if (nftGrid) nftGrid.style.display = 'grid';
  if (totalBitmates) totalBitmates.style.display = 'block';
  if (sortingButtons && document.querySelectorAll('.nft-card').length > 1) {
    sortingButtons.style.display = 'block';
  }

  document.getElementById('backToTop').style.display = 'none';
}

async function compareSelected() {
  if (selectedCards.length !== 2) {
    alert('Please select 2 BitMates to compare');
    return;
  }

  // Esconde a lista de BitMates e o total
  document.querySelector('.nft-grid').style.display = 'none';
  document.querySelector('#result > h2').style.display = 'none';
  document.getElementById('sortingButtons').style.display = 'none';
  
  // Esconde apenas o botão de Compare Selected BitMates
  const compareButtons = document.getElementById('compareContainer').children;
  compareButtons[0].style.display = 'none'; // Compare Selected BitMates
  compareButtons[1].style.display = 'block'; // Clear Selection

  const comparisonResult = document.getElementById('comparisonResult');
  
  try {
    const card1Data = await fetch(`bitmates/${selectedCards[0]}.json`).then(r => r.json());
    const card2Data = await fetch(`bitmates/${selectedCards[1]}.json`).then(r => r.json());

    // Função auxiliar para calcular a diferença
    const getDifference = (val1, val2) => {
      const diff = val1 - val2;
      return diff === 0 ? '' : diff > 0 ? `+${diff}` : diff;
    };

    // Função para obter a classe CSS baseada na diferença
    const getDiffClass = diff => !diff ? '' : diff > 0 ? 'better' : 'worse';

    comparisonResult.innerHTML = `
      <div class="comparison-grid">
        <div class="comparison-card">
          <h3>#${card1Data.id}</h3>
          <span class="main-indicator">Main BitMate</span>
          <img src="${card1Data.image}" alt="BitMate #${card1Data.id}">
          
          <div class="favor-section">
            <h4>Favor</h4>
            ${(() => {
              const favor = card1Data.characteristics.find(c => c.trait_type === 'Favor')?.value || 0;
              return `
                <div class="favor-row">
                  <span class="label">Favor:</span>
                  <span class="value">${favor}</span>
                </div>
              `;
            })()}
          </div>

          <div class="stats-section">
            <h4>Stats</h4>
            ${card1Data.attributes.map(attr => `
              <div class="stat-row">
                <div>
                  <span class="label">${attr.trait_type}:</span>
                  <span class="value">${attr.value}</span>
                </div>
                <div class="stat-bar-container">
                  <div class="stat-bar" style="width: ${(attr.value / 99) * 100}%"></div>
                </div>
              </div>
            `).join('')}
            <div class="stat-row total">
              <span class="label">Total Stats:</span>
              <span class="value">${card1Data.totalStats}</span>
            </div>
          </div>

          <div class="regions-section">
            <h4>Regions</h4>
            ${card1Data.region.map(region => `
              <div class="region-row">
                <span class="label">${region.type === 'main' ? 'Region' : 
                             region.type === 'sub' ? 'Sub-Region' : 
                             'Secondary-Region'}:</span>
                <span class="value">${region.region}</span>
                <span class="rarity">${region.rarity}</span>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="comparison-details">
          <h4>Differences</h4>
          
          <!-- Favor Comparison -->
          <div class="diff-section">
            <h5>Favor</h5>
            ${(() => {
              const favor1 = card1Data.characteristics.find(c => c.trait_type === 'Favor')?.value || 0;
              const favor2 = card2Data.characteristics.find(c => c.trait_type === 'Favor')?.value || 0;
              const diff = getDifference(favor1, favor2);
              return `
                <div class="diff-row ${getDiffClass(diff)}">
                  <span class="diff-value">${diff || 'Equal'}</span>
                </div>
              `;
            })()}
          </div>

          <!-- Stats Comparison -->
          <div class="diff-section">
            <h5>Stats</h5>
            ${card1Data.attributes.map((attr, i) => {
              const diff = getDifference(attr.value, card2Data.attributes[i].value);
              return `
                <div class="diff-row ${getDiffClass(diff)}">
                  <span class="label">${attr.trait_type}:</span>
                  <span class="diff-value">${diff || 'Equal'}</span>
                </div>
              `;
            }).join('')}
            <div class="diff-row total ${getDiffClass(card1Data.totalStats - card2Data.totalStats)}">
              <span class="label">Total Difference:</span>
              <span class="diff-value">${getDifference(card1Data.totalStats, card2Data.totalStats) || 'Equal'}</span>
            </div>
          </div>

          <!-- Regions Comparison -->
          <div class="diff-section">
            <h5>Regions</h5>
            ${(() => {
              const regions1 = card1Data.region || [];
              const regions2 = card2Data.region || [];
              const regionTypes = ['main', 'sub', 'secondary'];
              
              return regionTypes.map(type => {
                const region1 = regions1.find(r => r.type === type);
                const region2 = regions2.find(r => r.type === type);
                
                // Só mostra a comparação se ambos os BitMates tiverem a região
                if (region1 && region2) {
                  const rarityDiff = parseFloat(region1.rarity) - parseFloat(region2.rarity);
                  const regionName = type === 'main' ? 'Region' : 
                                   type === 'sub' ? 'Sub-Region' : 
                                   'Secondary-Region';
                  
                  const getRarityDiffClass = diff => !diff ? '' : diff < 0 ? 'better' : 'worse';
                  
                  return `
                    <div class="diff-row ${getRarityDiffClass(rarityDiff)}">
                      <span class="label">${regionName}:</span>
                      <span class="value">${region1.region !== region2.region ? 'Different' : 'Same'}</span>
                      <span class="diff-value">${rarityDiff > 0 ? '+' : ''}${rarityDiff.toFixed(2)}%</span>
                    </div>
                  `;
                }
                // Se não tiver a região em ambos, não mostra nada
                return '';
              }).join('');
            })()}
          </div>
        </div>

        <div class="comparison-card">
          <h3>#${card2Data.id}</h3>
          <img src="${card2Data.image}" alt="BitMate #${card2Data.id}">
          
          <div class="favor-section">
            <h4>Favor</h4>
            ${(() => {
              const favor = card2Data.characteristics.find(c => c.trait_type === 'Favor')?.value || 0;
              return `
                <div class="favor-row">
                  <span class="label">Favor:</span>
                  <span class="value">${favor}</span>
                </div>
              `;
            })()}
          </div>

          <div class="stats-section">
            <h4>Stats</h4>
            ${card2Data.attributes.map(attr => `
              <div class="stat-row">
                <div>
                  <span class="label">${attr.trait_type}:</span>
                  <span class="value">${attr.value}</span>
                </div>
                <div class="stat-bar-container">
                  <div class="stat-bar" style="width: ${(attr.value / 99) * 100}%"></div>
                </div>
              </div>
            `).join('')}
            <div class="stat-row total">
              <span class="label">Total Stats:</span>
              <span class="value">${card2Data.totalStats}</span>
            </div>
          </div>

          <div class="regions-section">
            <h4>Regions</h4>
            ${card2Data.region.map(region => `
              <div class="region-row">
                <span class="label">${region.type === 'main' ? 'Region' : 
                                     region.type === 'sub' ? 'Sub-Region' : 
                                     'Secondary-Region'}:</span>
                <span class="value">${region.region}</span>
                <span class="rarity">${region.rarity}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      <div class="comparison-buttons">
        <button onclick="clearSelection()" class="compare-button">Close Comparison</button>
        <button onclick="invertComparison()" class="compare-button">Swap Position</button>
      </div>
    `;
    
    comparisonResult.style.display = 'block';
  } catch (error) {
    console.error('Error comparing BitMates:', error);
  }
}

function invertComparison() {
  // Inverte a ordem dos cards selecionados
  selectedCards.reverse();
  // Refaz a comparação com a nova ordem
  compareSelected();
}

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

function handleScroll() {
    const backToTopButton = document.getElementById('backToTop');
    const cardHeight = document.querySelector('.nft-card')?.offsetHeight || 0;
    
    // Altura aproximada de uma linha de cards mais um pequeno offset
    const showAfterHeight = cardHeight + 100; // Reduzido para uma linha + 100px de offset
    
    if (window.scrollY > showAfterHeight) {
        backToTopButton.style.display = 'block';
    } else {
        backToTopButton.style.display = 'none';
    }
}

// Adicione os event listeners
window.addEventListener('scroll', handleScroll);
window.addEventListener('resize', handleScroll);

// Adicione esta função após carregar os NFTs
function populateTraitFilter(nfts) {
    const optionsContainer = document.getElementById('traitOptions');
    if (!optionsContainer) return;

    const traitsByCategory = new Map();

    // Coleta todas as traits dos NFTs carregados
    nfts.forEach(card => {
        const charGroups = card.querySelectorAll('.char-group');
        charGroups.forEach(group => {
            group.querySelectorAll('li').forEach(trait => {
                const [category, value] = trait.textContent.split(':').map(s => s.trim());
                const cleanValue = value.split('(')[0].trim();
                
                if (!traitsByCategory.has(category)) {
                    traitsByCategory.set(category, new Map());
                }
                
                // Armazena o valor e sua porcentagem
                if (!traitsByCategory.get(category).has(cleanValue)) {
                    const rarityBadge = trait.querySelector('.rarity-badge');
                    const percentage = rarityBadge ? rarityBadge.textContent : null;
                    traitsByCategory.get(category).set(cleanValue, percentage);
                }
            });
        });
    });

    // Limpa o container
    optionsContainer.innerHTML = '';
    
    // Adiciona opção "All"
    const allOption = document.createElement('div');
    allOption.className = 'option-item';
    allOption.textContent = 'Show All';
    allOption.onclick = () => {
        filterByTrait('');
        document.querySelector('.selected-text').textContent = 'Filter by Trait';
        const dropdown = document.querySelector('.custom-select');
        toggleDropdown({ currentTarget: dropdown }, 'trait');
        updateClearButtons();
    };
    optionsContainer.appendChild(allOption);

    [...traitsByCategory.entries()]
        .sort((a, b) => {
            // Define a ordem específica das categorias
            const lastCategories = ['Brain Type', 'Tempo', 'Charm', 'Physique', 'Fortune'];
            
            // Species sempre primeiro
            if (a[0] === 'Species') return -1;
            if (b[0] === 'Species') return 1;
            
            // Categorias específicas sempre por último
            const isLastA = lastCategories.includes(a[0]);
            const isLastB = lastCategories.includes(b[0]);
            
            if (isLastA && !isLastB) return 1;
            if (!isLastA && isLastB) return -1;
            if (isLastA && isLastB) {
                return lastCategories.indexOf(a[0]) - lastCategories.indexOf(b[0]);
            }
            
            // Ordem alfabética para as demais categorias
            return a[0].localeCompare(b[0]);
        })
        .forEach(([category, traits]) => {
            if (traits.size > 0) {
                const groupDiv = document.createElement('div');
                groupDiv.className = 'option-group';
                
                const labelDiv = document.createElement('div');
                labelDiv.className = 'option-group-label';
                labelDiv.textContent = category;
                groupDiv.appendChild(labelDiv);
                
                [...traits.entries()]
                    .sort((a, b) => {
                        const percentA = parseFloat(a[1]?.replace('%', '').replace(',', '.')) || 100;
                        const percentB = parseFloat(b[1]?.replace('%', '').replace(',', '.')) || 100;
                        return percentA - percentB;
                    })
                    .forEach(([trait, percentage]) => {
                        const optionDiv = document.createElement('div');
                        optionDiv.className = 'option-item';
                        
                        // Remove qualquer texto entre parênteses e porcentagens para exibição
                        const baseText = trait.replace(/\s*\([^)]*\)\s*|\s*\d+([.,]\d+)?%\s*$/g, '');
                        const textSpan = document.createElement('span');
                        textSpan.textContent = baseText.trim();
                        // Armazena o valor original para o filtro
                        optionDiv.dataset.originalValue = trait;
                        optionDiv.appendChild(textSpan);
                        
                        // Se tiver porcentagem, adiciona o badge
                        if (percentage) {
                            const badge = document.createElement('span');
                            badge.className = 'dropdown-rarity-badge';
                            badge.textContent = percentage;
                            optionDiv.appendChild(badge);
                        }

                        optionDiv.onclick = () => {
                            filterByTrait(`${category}:${optionDiv.dataset.originalValue}`);
                            document.querySelector('.selected-text').textContent = baseText.trim();
                            const dropdown = document.querySelector('.custom-select');
                            toggleDropdown({ currentTarget: dropdown }, 'trait');
                            updateClearButtons();
                        };
                        groupDiv.appendChild(optionDiv);
                    });
                
                optionsContainer.appendChild(groupDiv);
            }
        });
}

// Função para filtrar por trait
function filterByTrait(value, keepExistingFilter = false) {
    const cards = document.querySelectorAll('.nft-card');
    const visibleCards = [];

    if (!value) {
        // Limpa o filtro de trait
        document.querySelector('.custom-select').querySelector('.selected-text').textContent = 'Filter by Trait';
        
        // Verifica se existe filtro de land ativo
        const currentLandFilter = getCurrentLandFilter();
        if (currentLandFilter) {
            // Se existe filtro de land, filtra apenas pelos cards que atendem ao filtro de land
            filterByLand(currentLandFilter, true);
        } else {
            cards.forEach(card => {
                card.style.display = '';
                visibleCards.push(card);
            });
        }
        
        // Atualiza os dropdowns com os cards atualmente visíveis
        const currentlyVisible = Array.from(cards).filter(card => card.style.display !== 'none');
        populateTraitFilter(currentlyVisible);
        populateLandFilter(currentlyVisible);
        updateTotalBitmates(currentlyVisible.length);
        updateCompareVisibility(visibleCards.length);
        updateClearButtons();
        return;
    }

    const [category, trait] = value.split(':');
    
    // Pega o filtro de land atual
    const currentLandFilter = getCurrentLandFilter();
    
    cards.forEach(card => {
        const hasTrait = Array.from(card.querySelectorAll('.char-group li'))
            .some(li => {
                const [itemCategory, itemValue] = li.textContent.split(':').map(s => s.trim());
                return itemCategory === category && itemValue === trait;
            });

        // Se tiver um filtro de land ativo, verifica se o card atende aos dois filtros
        if (currentLandFilter) {
            const [landCategory, landValue] = currentLandFilter.split(':');
            const hasLand = Array.from(card.querySelectorAll('.region-list li'))
                .some(li => {
                    const label = li.querySelector('.label');
                    if (!label) return false;
                    
                    const labelText = label.textContent.trim();
                    const fullText = li.textContent;
                    const valueText = fullText
                        .substring(fullText.indexOf(':') + 1)
                        .split('(')[0]
                        .trim();
                    
                    return (
                        (landCategory === 'Sub-Region' && labelText.includes('Sub-Region:') && valueText === landValue) ||
                        (landCategory === 'Secondary-Region' && labelText.includes('Secondary-Region:') && valueText === landValue) ||
                        (landCategory === 'Region' && labelText.includes('Region:') && valueText === landValue)
                    );
                });
            
            card.style.display = (hasTrait && hasLand) ? '' : 'none';
            if (hasTrait && hasLand) visibleCards.push(card);
        } else {
            card.style.display = hasTrait ? '' : 'none';
            if (hasTrait) visibleCards.push(card);
        }
    });
    
    populateLandFilter(visibleCards);
    updateTotalBitmates(visibleCards.length);
    updateCompareVisibility(visibleCards.length);
    updateClearButtons();
}

// Fechar dropdown quando clicar fora
document.addEventListener('click', (event) => {
    const containers = document.querySelectorAll('.custom-select-container');
    const clickedOutside = ![...containers].some(container => container.contains(event.target));
    
    if (clickedOutside) {
        document.querySelectorAll('.custom-options').forEach(dropdown => {
            dropdown.style.display = 'none';
        });
        document.querySelectorAll('.select-arrow').forEach(arrow => {
            arrow.style.transform = 'rotate(0deg)';
        });
    }
});

function toggleDropdown(event, type) {
    // Identifica qual dropdown foi clicado
    const currentSelect = event.currentTarget;
    const options = document.getElementById(`${type}Options`);
    const arrow = event.currentTarget.querySelector('.select-arrow');
    const isOpen = options.style.display === 'block';
    
    // Fecha todos os outros dropdowns primeiro
    document.querySelectorAll('.custom-options').forEach(dropdown => {
        if (dropdown !== options) {
            dropdown.style.display = 'none';
            dropdown.parentElement.querySelector('.select-arrow').style.transform = 'rotate(0deg)';
        }
    });
    
    options.style.display = isOpen ? 'none' : 'block';
    arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
}

function populateLandFilter(nfts) {
    const optionsContainer = document.getElementById('landOptions');
    if (!optionsContainer) return;

    const landsByCategory = {
        'Sub-Region': new Map(),
        'Secondary-Region': new Map(),
        'Region': new Map()
    };

    // Função para extrair a porcentagem de um elemento
    const getPercentage = (element) => {
        const rarityBadge = element.querySelector('.rarity-badge');
        if (rarityBadge) {
            return parseFloat(rarityBadge.textContent.replace('%', '').replace(',', '.')) || 100;
        }
        return 100;
    };

    // Coleta todas as lands dos NFTs carregados
    nfts.forEach(card => {
        const regions = card.querySelectorAll('.region-list li');
        if (!regions.length) return;

        regions.forEach(region => {
            const label = region.querySelector('.label');
            const fullText = region.textContent;
            const labelText = label.textContent.trim();
            const valueText = fullText
                .substring(fullText.indexOf(':') + 1)
                .split('(')[0]
                .trim();
            
            if (labelText && valueText) {
                const percentage = getPercentage(region);
                if (labelText.includes('Sub-Region:')) {
                    landsByCategory['Sub-Region'].set(valueText, percentage);
                } else if (labelText.includes('Secondary-Region:')) {
                    landsByCategory['Secondary-Region'].set(valueText, percentage);
                } else if (labelText.includes('Region:')) {
                    landsByCategory['Region'].set(valueText, percentage);
                }
            }
        });
    });

    // Limpa o container
    optionsContainer.innerHTML = '';
    
    // Adiciona opção "All"
    const allOption = document.createElement('div');
    allOption.className = 'option-item';
    allOption.textContent = 'Show All';
    allOption.onclick = () => {
        filterByLand('');
        document.querySelectorAll('.custom-select')[1].querySelector('.selected-text').textContent = 'Filter by Land';
        const dropdown = document.querySelectorAll('.custom-select')[1];
        toggleDropdown({ currentTarget: dropdown }, 'land');
        updateClearButtons();
    };
    optionsContainer.appendChild(allOption);

    // Ordem específica das categorias
    const categoryOrder = ['Sub-Region', 'Secondary-Region', 'Region'];
    
    // Popula as opções
    categoryOrder.forEach(category => {
        if (landsByCategory[category].size > 0) {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'option-group';
            
            const labelDiv = document.createElement('div');
            labelDiv.className = 'option-group-label';
            labelDiv.textContent = category;
            groupDiv.appendChild(labelDiv);
            
            // Converte o Map em array e ordena por porcentagem
            [...landsByCategory[category].entries()]
                .sort((a, b) => a[1] - b[1])
                .forEach(([land, percentage]) => {
                    const optionDiv = document.createElement('div');
                    optionDiv.className = 'option-item';
                    
                    // Remove qualquer texto entre parênteses e porcentagens para exibição
                    const baseText = land.replace(/\s*\([^)]*\)\s*|\s*\d+([.,]\d+)?%\s*$/g, '');
                    const textSpan = document.createElement('span');
                    textSpan.textContent = baseText.trim();
                    // Armazena o valor original para o filtro
                    optionDiv.dataset.originalValue = land;
                    optionDiv.appendChild(textSpan);
                    
                    // Se tiver porcentagem, adiciona o badge
                    if (percentage) {
                        const badge = document.createElement('span');
                        badge.className = 'dropdown-rarity-badge';
                        badge.textContent = percentage;
                        optionDiv.appendChild(badge);
                    }

                    optionDiv.onclick = () => {
                        filterByLand(`${category}:${optionDiv.dataset.originalValue}`);
                        document.querySelectorAll('.custom-select')[1].querySelector('.selected-text').textContent = baseText.trim();
                        const dropdown = document.querySelectorAll('.custom-select')[1];
                        toggleDropdown({ currentTarget: dropdown }, 'land');
                        updateClearButtons();
                    };
                    groupDiv.appendChild(optionDiv);
                });
            
            optionsContainer.appendChild(groupDiv);
        }
    });
}

function filterByLand(value, keepExistingFilter = false) {
    const cards = document.querySelectorAll('.nft-card');
    const visibleCards = [];

    if (!value) {
        // Limpa o filtro de land
        document.querySelectorAll('.custom-select')[1].querySelector('.selected-text').textContent = 'Filter by Land';
        
        // Verifica se existe filtro de trait ativo
        const currentTraitFilter = getCurrentTraitFilter();
        if (currentTraitFilter) {
            // Se existe filtro de trait, filtra apenas pelos cards que atendem ao filtro de trait
            filterByTrait(currentTraitFilter, true);
        } else {
            cards.forEach(card => {
                card.style.display = '';
                visibleCards.push(card);
            });
        }
        
        // Atualiza os dropdowns com os cards atualmente visíveis
        const currentlyVisible = Array.from(cards).filter(card => card.style.display !== 'none');
        populateTraitFilter(currentlyVisible);
        populateLandFilter(currentlyVisible);
        updateTotalBitmates(currentlyVisible.length);
        updateCompareVisibility(visibleCards.length);
        updateClearButtons();
        return;
    }

    const [category, land] = value.split(':');
    
    // Pega o filtro de trait atual
    const currentTraitFilter = getCurrentTraitFilter();
    
    cards.forEach(card => {
        const hasLand = Array.from(card.querySelectorAll('.region-list li'))
            .some(li => {
                const label = li.querySelector('.label');
                if (!label) return false;
                
                const labelText = label.textContent.trim();
                const fullText = li.textContent;
                const valueText = fullText
                    .substring(fullText.indexOf(':') + 1)
                    .split('(')[0]
                    .trim();
                
                return (
                    (category === 'Sub-Region' && labelText.includes('Sub-Region:') && valueText === land) ||
                    (category === 'Secondary-Region' && labelText.includes('Secondary-Region:') && valueText === land) ||
                    (category === 'Region' && labelText.includes('Region:') && valueText === land)
                );
            });

        // Se tiver um filtro de trait ativo, verifica se o card atende aos dois filtros
        if (currentTraitFilter) {
            const [traitCategory, traitValue] = currentTraitFilter.split(':');
            const hasTrait = Array.from(card.querySelectorAll('.char-group li'))
                .some(li => {
                    const [itemCategory, itemValue] = li.textContent.split(':').map(s => s.trim());
                    return itemCategory === traitCategory && itemValue === traitValue;
                });
            
            card.style.display = (hasLand && hasTrait) ? '' : 'none';
            if (hasLand && hasTrait) visibleCards.push(card);
        } else {
            card.style.display = hasLand ? '' : 'none';
            if (hasLand) visibleCards.push(card);
        }
    });
    
    populateTraitFilter(visibleCards);
    populateLandFilter(visibleCards);
    updateTotalBitmates(visibleCards.length);
    updateCompareVisibility(visibleCards.length);
    updateClearButtons();
}

function getCurrentLandFilter() {
    const landText = document.querySelectorAll('.custom-select')[1].querySelector('.selected-text').textContent;
    if (landText === 'Filter by Land') return '';
    
    const categories = ['Sub-Region', 'Secondary-Region', 'Region'];
    const groups = document.querySelectorAll('#landOptions .option-group');
    for (const group of groups) {
        const label = group.querySelector('.option-group-label');
        const category = label.textContent.trim();
        if (categories.includes(category)) {
            const options = group.querySelectorAll('.option-item');
            for (const option of options) {
                if (option.textContent.trim() === landText) {
                    return `${category}:${landText}`;
                }
            }
        }
    }
    return '';
}

function getCurrentTraitFilter() {
    const traitText = document.querySelector('.custom-select').querySelector('.selected-text').textContent;
    if (traitText === 'Filter by Trait') return '';
    
    const groups = document.querySelectorAll('#traitOptions .option-group');
    for (const group of groups) {
        const category = group.querySelector('.option-group-label').textContent;
        const items = group.querySelectorAll('.option-item');
        for (const item of items) {
            if (item.textContent.trim() === traitText) {
                return `${category}:${traitText}`;
            }
        }
    }
    return '';
}

// Função para atualizar o total de BitMates
function updateTotalBitmates(total) {
    const totalElement = document.querySelector('#result > h2');
    const resultDiv = document.getElementById('result');
    
    if (totalElement && total > 1) {
        totalElement.textContent = `Total BitMates: ${total}`;
    } else if (totalElement && total <= 1) {
        totalElement.remove();
    } else if (!totalElement && total > 1) {
        // Se não existe o elemento de total mas temos mais de 1 card, cria ele
        const totalH2 = document.createElement('h2');
        totalH2.textContent = `Total BitMates: ${total}`;
        // Insere antes do grid
        const nftGrid = resultDiv.querySelector('.nft-grid');
        if (nftGrid) {
            resultDiv.insertBefore(totalH2, nftGrid);
        }
    }
}

// Função para atualizar a visibilidade dos elementos de comparação
function updateCompareVisibility(totalVisible) {
    const checkboxes = document.querySelectorAll('.compare-checkbox');
    const compareLabels = document.querySelectorAll('.compare-label');
    
    // Conta quantos cards estão realmente visíveis
    const visibleCards = document.querySelectorAll('.nft-card:not([style*="display: none"])').length;
    
    checkboxes.forEach(checkbox => {
        checkbox.style.display = visibleCards > 1 ? '' : 'none';
    });
    
    compareLabels.forEach(label => {
        label.style.display = visibleCards > 1 ? '' : 'none';
    });
    
    // Se houver menos de 2 cards visíveis, limpa a seleção
    if (visibleCards < 2) {
        clearSelection();
    }
}

function clearFilter(type) {
    if (type === 'trait') {
        filterByTrait('');
    } else if (type === 'land') {
        filterByLand('');
    }
    updateClearButtons();
}

function updateClearButtons() {
    const traitText = document.querySelector('.custom-select').querySelector('.selected-text').textContent;
    const landText = document.querySelectorAll('.custom-select')[1].querySelector('.selected-text').textContent;
    
    const traitClearBtn = document.querySelector('.custom-select-container:first-child .clear-filter');
    const landClearBtn = document.querySelector('.custom-select-container:last-child .clear-filter');
    
    traitClearBtn.style.display = traitText === 'Filter by Trait' ? 'none' : 'flex';
    landClearBtn.style.display = landText === 'Filter by Land' ? 'none' : 'flex';
}
