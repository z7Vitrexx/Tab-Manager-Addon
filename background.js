// Speichert die letzte Aktivitätszeit für jeden Tab
let tabLastActive = {};
let settings = {
    autoHibernate: true,
    autoCloseTime: 60 // Minuten
};

// Lädt die Einstellungen beim Start
chrome.storage.local.get(['settings'], (result) => {
    if (result.settings) {
        settings = result.settings;
    }
});

// Überwacht Tab-Aktivitäten
chrome.tabs.onActivated.addListener((activeInfo) => {
    tabLastActive[activeInfo.tabId] = Date.now();
    checkTabResources();
});

// Überprüft regelmäßig inaktive Tabs
const checkInactiveTabs = async () => {
    const tabs = await chrome.tabs.query({});
    const now = Date.now();

    for (const tab of tabs) {
        if (!tabLastActive[tab.id]) {
            tabLastActive[tab.id] = now;
            continue;
        }

        const inactiveTime = (now - tabLastActive[tab.id]) / 1000 / 60; // in Minuten

        // Automatischer Ruhezustand
        if (settings.autoHibernate && inactiveTime > 30 && !tab.discarded) {
            chrome.tabs.discard(tab.id);
        }

        // Automatisches Schließen
        if (settings.autoCloseTime !== 'never' && inactiveTime > settings.autoCloseTime) {
            chrome.tabs.remove(tab.id);
        }
    }
};

// Überprüft inaktive Tabs jede Minute
const inactiveCheckInterval = setInterval(checkInactiveTabs, 60000);

// Cleanup bei Deaktivierung
chrome.runtime.onSuspend.addListener(() => {
    clearInterval(inactiveCheckInterval);
});

// Überwacht Ressourcennutzung
async function checkTabResources() {
    try {
        const tabs = await chrome.tabs.query({});
        const oldResources = await chrome.storage.local.get(['tabResources']);
        let tabResources = {};

        for (const tab of tabs) {
            if (tab.discarded) {
                // Wenn der Tab im Ruhezustand ist, behalte die alten Werte bei
                tabResources[tab.id] = oldResources.tabResources?.[tab.id] || {
                    cpu: 0,
                    memory: 0,
                    isDiscarded: true
                };
                continue;
            }

            // CPU-Nutzung simulieren (zufällig für Demo)
            const cpu = Math.random() * 30; // 0-30%
            
            // Speichernutzung über chrome.system.memory API
            const memory = Math.random() * 500 * 1024 * 1024; // 0-500MB (simuliert)
            
            tabResources[tab.id] = {
                cpu: cpu,
                memory: memory,
                isDiscarded: false
            };
        }

        // Nur speichern, wenn sich etwas geändert hat
        const hasChanged = JSON.stringify(tabResources) !== JSON.stringify(oldResources.tabResources);
        if (hasChanged) {
            await chrome.storage.local.set({ tabResources });
        }
    } catch (e) {
        console.error('Fehler bei der Ressourcenüberwachung:', e);
    }
}

// Überprüft Ressourcen alle 3 Sekunden
const resourceCheckInterval = setInterval(checkTabResources, 3000);

// Cleanup bei Deaktivierung
chrome.runtime.onSuspend.addListener(() => {
    clearInterval(resourceCheckInterval);
});

// Event Listener für Tab-Änderungen
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' || changeInfo.discarded !== undefined) {
        checkTabResources();
    }
});
