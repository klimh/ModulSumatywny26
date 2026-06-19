# RehabSense – System wspomagania rehabilitacji

## Zespół Projektowy

- **Kacper Błaszczyk** 251485
- **Klim Hudzenko** 253833
- **Maciej Miazek** 251589
- **Remigiusz Tomecki** 251652
- **Kacper Romek** 251619

## O Projekcie

RehabSense to inteligentny interfejs człowiek-maszyna stworzony do analizy zachowań i ruchu użytkownika. Aplikacja wspiera proces diagnostyki, terapii i rehabilitacji poprzez wykorzystanie sztucznej inteligencji do precyzyjnej oceny aktywności fizycznej pacjenta.

### Problemy, które rozwiązujemy:

- **Brak nadzoru w domu:** Umożliwienie poprawnego wykonywania ćwiczeń bez fizycznej obecności terapeuty.
- **Ograniczone śledzenie postępów:** Obiektywny pomiar zakresu ruchu przy użyciu technologii wizyjnej.
- **Spadek motywacji:** System informacji zwrotnej w czasie rzeczywistym oraz mechanizmy grywalizacji.

---

## Kluczowe Funkcjonalności

### Dla Pacjenta

- **Sesje ćwiczeń z AI:** Analiza ruchu w czasie rzeczywistym przy użyciu kamery internetowej.
- **Panel statystyk:** Wgląd w historię rehabilitacji, postępy i zakresy ruchu.
- **System passy:** Nagradzanie za regularność i jakość wykonywanych sesji.
- **Czat:** Bezpośrednia komunikacja tekstowa z fizjoterapeutą.

### Dla Fizjoterapeuty

- **Zarządzanie pacjentami:** Przeglądanie listy podopiecznych i ich historii urazów.
- **Plany rehabilitacji:** Tworzenie i przypisywanie spersonalizowanych zestawów ćwiczeń.
- **Monitoring:** Dostęp do szczegółowych danych o postępach i poprawności ćwiczeń pacjenta.

## Instrukcja uruchomienia

### Wymagania

- Zainstalowany Docker oraz Docker Compose

### Uruchamianie przy pomocy Docker Compose

1. Upewnij się, że w folderze `backend` znajduje się plik `.env` (z odpowiednimi zmiennymi środowiskowymi, np. kluczami API).
2. Otwórz terminal w głównym katalogu projektu i wpisz poniższą komendę:
   ```bash
   docker-compose up --build
   ```
3. Aplikacja będzie dostępna pod adresem: http://localhost:3000
