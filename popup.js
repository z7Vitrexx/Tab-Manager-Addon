// Lädt die Einstellungen und initialisiert die UI
document.addEventListener('DOMContentLoaded', async function() {
    // Lade gespeicherte Einstellungen
    const result = await chrome.storage.local.get(['settings']);
    if (result.settings) {
        document.getElementById('autoHibernate').checked = result.settings.autoHibernate;
        document.getElementById('autoCloseTime').value = result.settings.autoCloseTime;
    }

    // Event Listener für Einstellungen
    document.getElementById('autoHibernate').addEventListener('change', saveSettings);
    document.getElementById('autoCloseTime').addEventListener('change', saveSettings);

    // Event Listener für Tab-Organisation
    document.getElementById('groupTabs').addEventListener('click', groupTabs);
    document.getElementById('closeDuplicates').addEventListener('click', closeDuplicates);
    document.getElementById('createGroup').addEventListener('click', createNewGroup);
    document.getElementById('autoGroup').addEventListener('click', autoGroupByDomain);
    document.getElementById('removeAllGroups').addEventListener('click', removeAllGroups);

    // Event Listener für die Suche
    const searchInput = document.getElementById('searchTabs');
    let searchTimeout;
    
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const searchTerm = searchInput.value.toLowerCase().trim();
            searchTabs(searchTerm);
        }, 200);
    });

    // Farb-Auswahl Event Listener
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
        });
    });

    // Initialer Tab-Load
    updateTabList();

    // Überwache Änderungen in chrome.storage
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.tabResources) {
            updateResourceValues(changes.tabResources.newValue);
        }
    });

    // Initialisiere Drag & Drop
    initializeDragAndDrop();
});

// Entfernt alle Tab-Gruppen
async function removeAllGroups() {
    try {
        // Hole alle Tabs im aktuellen Fenster
        const tabs = await chrome.tabs.query({currentWindow: true});
        
        // Entferne alle Tabs aus ihren Gruppen
        const tabIds = tabs.map(tab => tab.id);
        if (tabIds.length > 0) {
            await chrome.tabs.ungroup(tabIds);
        }
        
        // Aktualisiere die Anzeige
        await updateTabList();
    } catch (e) {
        console.error('Fehler beim Entfernen aller Gruppen:', e);
    }
}

// Entfernt eine einzelne Gruppe
async function removeGroup(groupId) {
    try {
        // Hole alle Tabs in dieser Gruppe
        const tabs = await chrome.tabs.query({groupId: groupId});
        
        // Entferne die Tabs aus der Gruppe
        const tabIds = tabs.map(tab => tab.id);
        await chrome.tabs.ungroup(tabIds);
        
        // Aktualisiere die Anzeige
        await updateTabList();
    } catch (e) {
        console.error('Fehler beim Entfernen der Gruppe:', e);
    }
}

// Aktualisiert die Tab-Liste
async function updateTabList() {
    try {
        const tabList = document.getElementById('tabList');
        tabList.innerHTML = '';

        const tabs = await chrome.tabs.query({ currentWindow: true });
        const groups = await chrome.tabGroups.query({});
        const resources = await chrome.storage.local.get(['tabResources']) || {};

        // Gruppiere Tabs nach ihrer Gruppe
        const groupedTabs = {};
        const ungroupedTabs = [];

        // Zuerst Tabs in ihre Gruppen einordnen
        tabs.forEach(tab => {
            if (tab.groupId !== -1) {
                if (!groupedTabs[tab.groupId]) {
                    groupedTabs[tab.groupId] = [];
                }
                groupedTabs[tab.groupId].push(tab);
            } else {
                ungroupedTabs.push(tab);
            }
        });

        // Gruppen anzeigen
        groups.forEach(group => {
            if (groupedTabs[group.id]) {
                const groupContainer = document.createElement('div');
                groupContainer.className = 'tab-group';
                groupContainer.style.borderColor = group.color || '#666';

                const groupHeader = document.createElement('div');
                groupHeader.className = 'group-header';
                
                const groupTitle = document.createElement('div');
                groupTitle.className = 'group-title';
                groupTitle.textContent = group.title || 'Unbenannte Gruppe';
                
                const groupCount = document.createElement('span');
                groupCount.className = 'tab-count';
                groupCount.textContent = `${groupedTabs[group.id].length} Tabs`;

                const deleteButton = document.createElement('button');
                deleteButton.className = 'delete-group';
                deleteButton.textContent = '×';
                deleteButton.onclick = () => removeGroup(group.id);

                groupHeader.appendChild(groupTitle);
                groupHeader.appendChild(groupCount);
                groupHeader.appendChild(deleteButton);
                groupContainer.appendChild(groupHeader);

                // Tabs in der Gruppe anzeigen
                groupedTabs[group.id].forEach(tab => {
                    const tabElement = createTabElement(tab, resources.tabResources || {});
                    groupContainer.appendChild(tabElement);
                });

                tabList.appendChild(groupContainer);
            }
        });

        // Nicht gruppierte Tabs anzeigen
        ungroupedTabs.forEach(tab => {
            const tabElement = createTabElement(tab, resources.tabResources || {});
            tabList.appendChild(tabElement);
        });

    } catch (error) {
        console.error('Fehler beim Aktualisieren der Tab-Liste:', error);
    }
}

// Aktualisiert einen einzelnen Tab ohne die ganze Liste neu zu laden
async function updateSingleTab(tabId) {
    try {
        const tab = await chrome.tabs.get(tabId);
        const resources = await chrome.storage.local.get(['tabResources']) || {};
        
        // Finde das existierende Tab-Element
        const existingTab = document.querySelector(`[data-tab-id="${tabId}"]`);
        if (!existingTab) return;

        // Erstelle das neue Tab-Element
        const newTabElement = createTabElement(tab, resources.tabResources || {});
        
        // Ersetze das alte Element mit dem neuen
        existingTab.parentNode.replaceChild(newTabElement, existingTab);
    } catch (error) {
        console.error('Fehler beim Aktualisieren des einzelnen Tabs:', error);
    }
}

// Aktualisiert die Tab-Liste ohne die Scroll-Position zu ändern
async function updateTabListWithoutScroll() {
    const scrollPosition = document.querySelector('.tab-list').scrollTop;
    await updateTabList();
    document.querySelector('.tab-list').scrollTop = scrollPosition;
}

// Drag & Drop Funktionalität
function initializeDragAndDrop() {
    let draggedItem = null;
    let draggedTabId = null;

    document.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('tab-item')) {
            draggedItem = e.target;
            draggedTabId = parseInt(e.target.dataset.tabId);
            e.target.classList.add('dragging');
        }
    });

    document.addEventListener('dragend', (e) => {
        if (e.target.classList.contains('tab-item')) {
            e.target.classList.remove('dragging');
            draggedItem = null;
            draggedTabId = null;
        }
    });

    document.addEventListener('dragover', async (e) => {
        e.preventDefault();
        const tabItem = e.target.closest('.tab-item');
        
        if (tabItem && draggedItem && tabItem !== draggedItem && draggedTabId) {
            const targetTabId = parseInt(tabItem.dataset.tabId);
            
            try {
                const [targetTab, draggedTab] = await Promise.all([
                    chrome.tabs.get(targetTabId),
                    chrome.tabs.get(draggedTabId)
                ]);

                // Wenn beide Tabs in der gleichen Gruppe sind oder beide nicht gruppiert sind
                if (targetTab.groupId === draggedTab.groupId) {
                    const rect = tabItem.getBoundingClientRect();
                    const mouseY = e.clientY - rect.top;
                    const newIndex = mouseY < rect.height / 2 ? targetTab.index : targetTab.index + 1;

                    // Verschiebe den Tab nur innerhalb der gleichen Gruppe
                    await chrome.tabs.move(draggedTabId, { index: newIndex });
                    await updateTabList();
                }
                // Wenn der Tab in eine andere Gruppe gezogen wird
                else if (targetTab.groupId !== -1 && draggedTab.groupId !== targetTab.groupId) {
                    // Füge den Tab zur neuen Gruppe hinzu
                    await chrome.tabs.group({
                        tabIds: draggedTabId,
                        groupId: targetTab.groupId
                    });
                    // Verschiebe den Tab an die richtige Position
                    const newIndex = mouseY < rect.height / 2 ? targetTab.index : targetTab.index + 1;
                    await chrome.tabs.move(draggedTabId, { index: newIndex });
                    await updateTabList();
                }
                // Wenn der Tab aus einer Gruppe herausgezogen wird
                else if (targetTab.groupId === -1 && draggedTab.groupId !== -1) {
                    // Entferne den Tab aus der Gruppe
                    await chrome.tabs.ungroup(draggedTabId);
                    // Verschiebe den Tab an die richtige Position
                    const newIndex = mouseY < rect.height / 2 ? targetTab.index : targetTab.index + 1;
                    await chrome.tabs.move(draggedTabId, { index: newIndex });
                    await updateTabList();
                }
            } catch (error) {
                console.error('Fehler beim Verschieben des Tabs:', error);
            }
        }
    });

    document.addEventListener('drop', (e) => {
        e.preventDefault();
    });
}

// Erstellt eine neue Tab-Gruppe
async function createNewGroup() {
    const groupName = document.getElementById('groupName').value;
    if (!groupName) return;

    const selectedColor = document.querySelector('.color-option.selected');
    const color = selectedColor ? selectedColor.dataset.color : 'grey';

    const tabs = await chrome.tabs.query({highlighted: true, currentWindow: true});
    if (tabs.length === 0) return;

    const group = await chrome.tabs.group({tabIds: tabs.map(tab => tab.id)});
    await chrome.tabGroups.update(group, {
        title: groupName,
        color: color
    });

    updateTabList();
}

// Automatische Gruppierung nach Domain
async function autoGroupByDomain() {
    try {
        // 1. Hole alle Tabs
        const tabs = await chrome.tabs.query({currentWindow: true});
        
        // Zuerst alle Tabs aus Gruppen entfernen
        const allTabIds = tabs.map(tab => tab.id);
        await chrome.tabs.ungroup(allTabIds);
        
        const domains = {};
        const specialTabs = [];
        const colors = ['blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];
        let colorIndex = 0;

        // 2. Gruppiere Tabs nach Domain
        for (const tab of tabs) {
            try {
                // Ignoriere leere Tabs oder spezielle URLs
                if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
                    specialTabs.push(tab.id);
                    continue;
                }

                const url = new URL(tab.url);
                const hostname = url.hostname;
                
                // Extrahiere die Hauptdomain (z.B. "google.com" aus "www.google.com")
                const domainParts = hostname.split('.');
                const domain = domainParts.length >= 2 
                    ? domainParts.slice(-2).join('.') 
                    : hostname;
                
                if (!domains[domain]) {
                    domains[domain] = {
                        tabs: [],
                        color: colors[colorIndex % colors.length]
                    };
                    colorIndex++;
                }
                domains[domain].tabs.push(tab.id);
            } catch (e) {
                console.log('Problem mit Tab URL:', tab.url, e);
                specialTabs.push(tab.id);
            }
        }

        // 3. Erstelle Gruppen für jede Domain
        for (const [domain, data] of Object.entries(domains)) {
            if (data.tabs.length > 0) {
                try {
                    const group = await chrome.tabs.group({ tabIds: data.tabs });
                    await chrome.tabGroups.update(group, {
                        title: domain,
                        color: data.color,
                        collapsed: false
                    });
                } catch (e) {
                    console.error('Fehler beim Gruppieren:', domain, e);
                }
            }
        }

        // Spezielle Tabs in einer eigenen Gruppe
        if (specialTabs.length > 0) {
            try {
                const group = await chrome.tabs.group({tabIds: specialTabs});
                await chrome.tabGroups.update(group, {
                    title: 'Andere',
                    color: 'grey',
                    collapsed: false
                });
            } catch (e) {
                console.error('Fehler beim Gruppieren spezieller Tabs:', e);
            }
        }

        // 4. Aktualisiere die Anzeige
        await updateTabList();
    } catch (e) {
        console.error('Hauptfehler in autoGroupByDomain:', e);
    }
}

// Durchsucht die Tabs nach Titel und URL
async function searchTabs(searchTerm) {
    if (!searchTerm) {
        document.querySelectorAll('.tab-item').forEach(tab => {
            tab.style.display = '';
        });
        return;
    }

    const tabs = await chrome.tabs.query({});
    const tabElements = document.querySelectorAll('.tab-item');
    
    tabElements.forEach(tabElement => {
        const tabId = parseInt(tabElement.dataset.tabId);
        const tab = tabs.find(t => t.id === tabId);
        
        if (!tab) return;

        const matchesTitle = tab.title.toLowerCase().includes(searchTerm);
        const matchesUrl = tab.url.toLowerCase().includes(searchTerm);

        tabElement.style.display = (matchesTitle || matchesUrl) ? '' : 'none';
    });
}

// Erstellt ein Tab-Element
function createTabElement(tab, resources) {
    const tabResources = resources[tab.id] || { cpu: 0, memory: 0 };
    const isHighUsage = tabResources.cpu > 20 || tabResources.memory > 200000000;

    const tabElement = document.createElement('div');
    tabElement.className = `tab-item ${tab.discarded ? 'hibernated' : ''}`;
    tabElement.draggable = true;
    tabElement.dataset.tabId = tab.id;
    
    const favicon = document.createElement('img');
    favicon.src = tab.favIconUrl || 'icon16.png';
    favicon.width = 16;
    favicon.height = 16;

    const tabInfo = document.createElement('div');
    tabInfo.className = 'tab-info';
    
    const title = document.createElement('div');
    title.className = 'tab-title';
    title.textContent = tab.title;
    
    const resourceInfo = document.createElement('div');
    resourceInfo.className = 'resource-info';

    if (tab.discarded) {
        const hibernatedInfo = document.createElement('div');
        hibernatedInfo.className = 'hibernated-info';
        hibernatedInfo.innerHTML = '<i>💤</i> Im Ruhezustand';
        resourceInfo.appendChild(hibernatedInfo);
    } else {
        // CPU-Metrik
        const cpuMetric = document.createElement('div');
        cpuMetric.className = `resource-metric ${isHighUsage ? 'warning' : ''}`;
        cpuMetric.innerHTML = `<i>📊</i> CPU: ${tabResources.cpu.toFixed(1)}%`;
        
        // RAM-Metrik
        const ramMetric = document.createElement('div');
        ramMetric.className = `resource-metric ${isHighUsage ? 'warning' : ''}`;
        ramMetric.innerHTML = `<i>💾</i> RAM: ${formatBytes(tabResources.memory)}`;
        
        resourceInfo.appendChild(cpuMetric);
        resourceInfo.appendChild(ramMetric);

        // Ruhezustand-Button
        const hibernateButton = document.createElement('button');
        hibernateButton.className = 'hibernate-button';
        hibernateButton.innerHTML = '💤';
        hibernateButton.title = 'In Ruhezustand versetzen';
        hibernateButton.onclick = async (e) => {
            e.stopPropagation();
            
            // Füge sofort die hibernated Klasse hinzu für sanften Übergang
            tabElement.classList.add('hibernated');
            
            // Aktualisiere die Ressourcenanzeige sofort
            resourceInfo.innerHTML = '';
            const hibernatedInfo = document.createElement('div');
            hibernatedInfo.className = 'hibernated-info';
            hibernatedInfo.innerHTML = '<i>💤</i> Im Ruhezustand';
            resourceInfo.appendChild(hibernatedInfo);
            
            // Entferne den Hibernate-Button
            hibernateButton.remove();
            
            // Führe die eigentliche Hibernation durch
            await chrome.tabs.discard(tab.id);
            
            // Aktualisiere nur diesen einen Tab
            setTimeout(() => updateSingleTab(tab.id), 100);
        };
        tabElement.appendChild(hibernateButton);
    }

    // Ressourcen-Balken
    const resourceBar = document.createElement('div');
    resourceBar.className = 'resource-bar';
    
    const resourceBarFill = document.createElement('div');
    resourceBarFill.className = `resource-bar-fill ${isHighUsage ? 'high-usage' : ''}`;
    resourceBarFill.style.width = `${tab.discarded ? 0 : Math.min(tabResources.cpu, 100)}%`;
    
    resourceBar.appendChild(resourceBarFill);

    tabInfo.appendChild(title);
    tabInfo.appendChild(resourceInfo);
    tabInfo.appendChild(resourceBar);

    tabElement.appendChild(favicon);
    tabElement.appendChild(tabInfo);

    // Click-Event zum Aktivieren des Tabs
    tabElement.onclick = () => {
        chrome.tabs.update(tab.id, { active: true });
    };

    return tabElement;
}

// Speichert die Einstellungen
function saveSettings() {
    const settings = {
        autoHibernate: document.getElementById('autoHibernate').checked,
        autoCloseTime: document.getElementById('autoCloseTime').value
    };
    chrome.storage.local.set({ settings });
}

// Formatiert Bytes in lesbare Größen
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Gruppiert Tabs nach Domain
async function groupTabs() {
    try {
        const tabs = await chrome.tabs.query({currentWindow: true});
        const groups = {};
        const colors = ['blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];
        let colorIndex = 0;
        
        // Zuerst alle Tabs aus Gruppen entfernen
        const allTabIds = tabs.map(tab => tab.id);
        await chrome.tabs.ungroup(allTabIds);

        // Tabs nach Domain gruppieren
        for (const tab of tabs) {
            try {
                const url = new URL(tab.url);
                // Ignoriere spezielle Chrome-URLs
                if (url.protocol === 'chrome:' || url.protocol === 'chrome-extension:') {
                    continue;
                }
                const domain = url.hostname;
                
                // Extrahiere die Hauptdomain
                const domainParts = domain.split('.');
                const mainDomain = domainParts.length >= 2 
                    ? domainParts.slice(-2).join('.') 
                    : domain;
                
                if (!groups[mainDomain]) {
                    groups[mainDomain] = {
                        tabs: [],
                        color: colors[colorIndex % colors.length]
                    };
                    colorIndex++;
                }
                groups[mainDomain].tabs.push(tab);
            } catch (error) {
                console.log('Fehler beim Verarbeiten der URL:', tab.url, error);
            }
        }

        // Nur Domains mit mehr als einem Tab gruppieren
        for (const [domain, data] of Object.entries(groups)) {
            if (data.tabs.length > 1) {
                const tabIds = data.tabs.map(tab => tab.id);
                const group = await chrome.tabs.group({ tabIds });
                await chrome.tabGroups.update(group, {
                    title: domain,
                    collapsed: false,
                    color: data.color
                });
            }
        }

        await updateTabList();
    } catch (error) {
        console.error('Fehler beim Gruppieren der Tabs:', error);
    }
}

// Entfernt eine einzelne Gruppe
async function removeGroup(groupId) {
    try {
        // Hole alle Tabs in dieser Gruppe
        const tabs = await chrome.tabs.query({groupId: groupId});
        
        // Entferne die Tabs aus der Gruppe
        const tabIds = tabs.map(tab => tab.id);
        await chrome.tabs.ungroup(tabIds);
        
        // Aktualisiere die Anzeige
        await updateTabList();
    } catch (e) {
        console.error('Fehler beim Entfernen der Gruppe:', e);
    }
}

// Schließt doppelte Tabs
async function closeDuplicates() {
    const tabs = await chrome.tabs.query({currentWindow: true});
    const urls = new Set();
    const duplicates = [];

    tabs.forEach(tab => {
        if (urls.has(tab.url)) {
            duplicates.push(tab.id);
        } else {
            urls.add(tab.url);
        }
    });

    await chrome.tabs.remove(duplicates);
    updateTabList();
}

// Aktualisiert nur die Ressourcenwerte ohne die Liste neu zu laden
function updateResourceValues(resources) {
    const tabElements = document.querySelectorAll('.tab-item');
    
    tabElements.forEach(tabElement => {
        const tabId = parseInt(tabElement.dataset.tabId);
        const tabResources = resources[tabId] || { cpu: 0, memory: 0 };
        
        // Finde die Ressourcen-Anzeigen
        const resourceInfo = tabElement.querySelector('.resource-info');
        if (!resourceInfo) return;

        // Wenn Tab im Ruhezustand ist, nicht aktualisieren
        if (tabElement.classList.contains('hibernated')) return;

        // CPU und RAM Werte aktualisieren
        const cpuMetric = resourceInfo.querySelector('.resource-metric:first-child');
        const ramMetric = resourceInfo.querySelector('.resource-metric:last-child');
        
        if (cpuMetric && ramMetric) {
            const isHighUsage = tabResources.cpu > 20 || tabResources.memory > 200000000;
            
            // Aktualisiere CPU
            cpuMetric.innerHTML = `<i>📊</i> CPU: ${tabResources.cpu.toFixed(1)}%`;
            cpuMetric.className = `resource-metric ${isHighUsage ? 'warning' : ''}`;
            
            // Aktualisiere RAM
            ramMetric.innerHTML = `<i>💾</i> RAM: ${formatBytes(tabResources.memory)}`;
            ramMetric.className = `resource-metric ${isHighUsage ? 'warning' : ''}`;
            
            // Aktualisiere den Ressourcen-Balken
            const resourceBar = tabElement.querySelector('.resource-bar-fill');
            if (resourceBar) {
                resourceBar.style.width = `${Math.min(tabResources.cpu, 100)}%`;
                resourceBar.className = `resource-bar-fill ${isHighUsage ? 'high-usage' : ''}`;
            }
        }
    });
}

// Konvertiert eine Hex-Farbe in die nächstgelegene Chrome-Tab-Gruppenfarbe
function getNearestChromeColor(hexColor) {
    const chromeColors = {
        'blue': '#1A73E8',
        'red': '#D93025',
        'yellow': '#F9AB00',
        'green': '#188038',
        'pink': '#E51C63',
        'purple': '#9334E6',
        'cyan': '#00A9BB',
        'orange': '#FA903E',
        'grey': '#888888'
    };

    // Konvertiert Hex zu RGB
    const hexToRgb = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
    };

    // Berechnet die Farbdistanz
    const colorDistance = (color1, color2) => {
        return Math.sqrt(
            Math.pow(color1[0] - color2[0], 2) +
            Math.pow(color1[1] - color2[1], 2) +
            Math.pow(color1[2] - color2[2], 2)
        );
    };

    const inputRgb = hexToRgb(hexColor);
    let minDistance = Infinity;
    let closestColor = 'grey';

    for (const [name, hex] of Object.entries(chromeColors)) {
        const distance = colorDistance(inputRgb, hexToRgb(hex));
        if (distance < minDistance) {
            minDistance = distance;
            closestColor = name;
        }
    }

    return closestColor;
}

// Extrahiert die dominante Farbe aus einem Favicon
async function getDominantColor(tab) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            
            ctx.drawImage(img, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            const colorCounts = {};
            let maxCount = 0;
            let dominantColor = '#000000';
            
            // Analysiere jeden Pixel
            for (let i = 0; i < imageData.length; i += 4) {
                const r = imageData[i];
                const g = imageData[i + 1];
                const b = imageData[i + 2];
                const rgb = `rgb(${r},${g},${b})`;
                
                colorCounts[rgb] = (colorCounts[rgb] || 0) + 1;
                
                if (colorCounts[rgb] > maxCount) {
                    maxCount = colorCounts[rgb];
                    dominantColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                }
            }
            
            resolve(getNearestChromeColor(dominantColor));
        };
        
        img.onerror = function() {
            // Fallback-Farbe bei Fehler
            resolve('grey');
        };
        
        // Versuche zuerst das Favicon zu laden
        img.src = tab.favIconUrl || `https://www.google.com/s2/favicons?domain=${new URL(tab.url).hostname}&sz=64`;
    });
}
