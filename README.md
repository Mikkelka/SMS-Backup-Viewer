# SMS Backup Viewer

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

En moderne, responsiv webapplikation til visning og søgning i SMS-backup-filer fra Android-enheder. Værktøjet tilbyder en intuitiv brugergrænseflade til at gennemse samtaler, søge i beskeder og se mediefiler - alt sammen direkte i browseren uden at uploade data til eksterne servere.

## ✨ Funktioner

- **📱 Komplet SMS/MMS Support**: Understøtter både SMS-beskeder og MMS med mediefiler (billeder, video, audio)
- **🔍 Avanceret Søgning**: Søg i alle beskeder og kontaktnavne med realtids fremhævning af søgeord
- **📧 Kontakthåndtering**: Intelligent håndtering af kontaktnavne med automatisk formatering af telefonnumre
- **🖼️ Medievisning**: Fuld support for billeder, videoer og lydfiler med modal-visning
- **📱 Mobil-optimeret**: Responsivt design der fungerer perfekt på både desktop og mobile enheder
- **🎨 Moderne UI**: Mørkt tema med iOS-inspireret design og glatte animationer
- **🔒 Privatliv**: Alt foregår lokalt i din browser - ingen data sendes til eksterne servere
- **📊 Samtalestatistikker**: Vis antal beskeder per samtale sorteret efter seneste aktivitet
- **🇩🇰 Dansk Lokalisering**: Komplet dansk brugergrænseflade og telefonnummerformatering

## 🚀 Installation og Brug

### Forudsætninger
- En moderne webbrowser (Chrome, Firefox, Safari, Edge)
- En XML-backup-fil fra din Android-enhed (f.eks. via SMS Backup & Restore app)

### Kom i gang
1. **Download projektet** eller klon repositoryet
2. **Åbn `index.html`** i din webbrowser
3. **Klik på "Vælg SMS backup XML fil"** og vælg din XML-backup-fil
4. **Gennemse dine samtaler** i venstre panel og klik på en for at se beskederne
5. **Brug søgefunktionen** til at finde specifikke beskeder eller kontakter

### Sådan får du en XML-backup fra Android
1. Download en SMS backup app som "SMS Backup & Restore" fra Google Play Store
2. Opret en backup af dine SMS'er til XML-format
3. Overfør XML-filen til din computer
4. Upload filen til SMS Backup Viewer

## 🛠️ Teknologier

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Styling**: Custom CSS med modern dark theme
- **Responsive Design**: Mobile-first approach med CSS Grid og Flexbox
- **File Processing**: Native File API og DOM Parser
- **Media Handling**: Base64 encoding/decoding for billeder og videoer

## 📁 Projektstruktur

```
SMS-Backup-Viewer/
│
├── index.html          # Hoved-HTML fil med applikationsstruktur
├── styles.css          # CSS styling med responsive design
├── script.js           # JavaScript funktionalitet og logik
└── README.md           # Projektdokumentation
```

## 🔧 Funktionaliteter i detaljer

### SMS/MMS Parsing
- Parser både `<sms>` og `<mms>` elementer fra XML-backup
- Understøtter mediefiler (billeder, video, audio) i MMS
- Intelligent kontaktnavnhåndtering med fallback til telefonnumre

### Søgning og Filtrering
- Realtids søgning i alle beskeder og kontaktnavne
- Fremhævning af søgeord i resultater
- Avanceret resultatvisning med tidsstempel og kontekst

### Mobil Support
- Touch-venlige kontrolelementer
- Responsive panel-system der tilpasser sig skærmstørrelse
- Optimeret for både portrait og landscape orientering

## 🤝 Bidrag

Vi modtager gerne bidrag til projektet! Sådan kan du hjælpe:

1. **Fork** projektet
2. **Opret en feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit dine ændringer** (`git commit -m 'Add some AmazingFeature'`)
4. **Push til branchen** (`git push origin feature/AmazingFeature`)
5. **Åbn en Pull Request**

### Retningslinjer for bidrag
- Følg den eksisterende kodestil
- Test dine ændringer på både desktop og mobile
- Opdater dokumentation hvis nødvendigt
- Sørg for at alle funktioner virker som forventet

## 📝 Licens

Dette projekt er licenseret under MIT License - se [LICENSE](LICENSE) filen for detaljer.

MIT License tillader fri brug, ændring og distribution af softwaren, både til kommercielle og ikke-kommercielle formål.

## 📞 Kontakt

**Projektvedligeholder**: [INDSÆT KONTAKTOPLYSNINGER]

- GitHub: [INDSÆT GITHUB PROFIL]
- Email: [INDSÆT EMAIL]

---

## 🔐 Sikkerhed og Privatliv

SMS Backup Viewer er designet med privatliv i fokus:
- **Lokale operationer**: Alle filer behandles lokalt i din browser
- **Ingen data-upload**: Ingen informationer sendes til eksterne servere
- **Ingen tracking**: Ingen cookies eller analyseværktøjer
- **Open source**: Kildekoden er åben og kan inspiceres

## 🐛 Fejlrapportering

Har du fundet en fejl eller ønsker en ny funktion? 
- **Åbn et issue** på GitHub med detaljeret beskrivelse
- **Inkluder systemoplysninger** (browser, OS, filtype)
- **Beskriv reproduktionstrin** for fejl

## 🙏 Anerkendelser

Tak til alle der har bidraget til at gøre dette projekt bedre!