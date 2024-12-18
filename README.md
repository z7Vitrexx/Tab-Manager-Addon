# Tab Manager Browser Extension

Eine Chrome-Erweiterung zur effizienten Verwaltung von Browser-Tabs mit automatischer Gruppierung, Ressourcenüberwachung und Ruhezustandsfunktion.

## Funktionen

### Tab-Gruppierung
- **Automatische Gruppierung**: Gruppiert Tabs automatisch nach ihrer Domain
- **Farbkodierung**: Jede Gruppe erhält eine eindeutige Farbe für bessere Übersichtlichkeit
- **Manuelle Gruppierung**: Erstelle eigene Gruppen mit benutzerdefinierten Namen und Farben
- **Drag & Drop**: Verschiebe Tabs zwischen Gruppen per Drag & Drop

### Ressourcen-Management
- **CPU-Überwachung**: Zeigt CPU-Auslastung pro Tab
- **RAM-Überwachung**: Zeigt Speicherverbrauch pro Tab
- **Ressourcen-Warnung**: Markiert Tabs mit hohem Ressourcenverbrauch
- **Ruhezustand**: Versetzt nicht benötigte Tabs in den Ruhezustand, um Ressourcen zu sparen

### Organisation
- **Tab-Suche**: Durchsuche Tabs nach Titel oder URL
- **Duplikate entfernen**: Entfernt doppelte Tabs automatisch
- **Gruppen auflösen**: Löse einzelne oder alle Gruppen auf
- **Ressourcen-Anzeige**: Visueller Indikator für CPU- und RAM-Nutzung

## Installation

1. Lade das Repository herunter oder klone es:
   ```bash
   git clone https://github.com/z7Vitrexx/Tab-Manager-Addon.git
   ```

2. Öffne Chrome und navigiere zu `chrome://extensions/`

3. Aktiviere den "Entwicklermodus" (oben rechts)

4. Klicke auf "Entpackte Erweiterung laden" und wähle den Ordner mit der Erweiterung

## Verwendung

1. **Tab-Gruppierung**:
   - Klicke auf "Nach Domain gruppieren" für automatische Gruppierung
   - Wähle mehrere Tabs aus und klicke "Neue Gruppe" für manuelle Gruppierung
   - Ziehe Tabs zwischen Gruppen per Drag & Drop

2. **Ressourcen-Management**:
   - Beobachte CPU- und RAM-Nutzung pro Tab
   - Klicke auf das Schlaf-Symbol (💤), um einen Tab in den Ruhezustand zu versetzen
   - Tabs mit hohem Ressourcenverbrauch werden automatisch markiert

3. **Organisation**:
   - Nutze die Suchleiste, um Tabs zu finden
   - Klicke "Duplikate schließen" zum Entfernen doppelter Tabs
   - Nutze "×" zum Auflösen einzelner Gruppen oder "Alle Gruppen auflösen"

## Entwicklung

### Voraussetzungen
- Chrome Browser
- Grundkenntnisse in HTML, CSS und JavaScript
- Git (für Versionskontrolle)

### Projektstruktur
```
Tab-Manager-Addon/
├── icons/              # Icons in verschiedenen Größen
├── popup.html          # Hauptbenutzeroberfläche
├── popup.js           # Hauptlogik der Erweiterung
├── popup.css          # Styling der Benutzeroberfläche
├── manifest.json      # Erweiterungs-Konfiguration
└── README.md          # Dokumentation
```

### Lokale Entwicklung
1. Nehme Änderungen an den Dateien vor
2. Lade die Erweiterung in Chrome neu (auf der Extensions-Seite)
3. Teste die Änderungen
4. Committe und pushe die Änderungen

## Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert - siehe die [LICENSE](LICENSE) Datei für Details.
