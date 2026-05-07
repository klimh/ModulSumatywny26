# RehabSense – System wspomagania rehabilitacji

**Instytucja:** Politechnika Łódzka  
**Data:** 1 kwietnia 2026  
**Zespół:** Remigiusz Tomecki, Kacper Błaszczyk, Maciej Miazek, Klim Hudzenko, Kacper Romek

---

## O Projekcie
RehabSense to inteligentny interfejs człowiek-maszyna stworzony do analizy zachowań i ruchu użytkownika. Aplikacja wspiera proces diagnostyki, terapii i rehabilitacji poprzez wykorzystanie sztucznej inteligencji do precyzyjnej oceny aktywności fizycznej pacjenta.

### Problemy, które rozwiązujemy:
* **Brak nadzoru w domu:** Umożliwienie poprawnego wykonywania ćwiczeń bez fizycznej obecności terapeuty.
* **Ograniczone śledzenie postępów:** Obiektywny pomiar zakresu ruchu przy użyciu technologii wizyjnej.
* **Spadek motywacji:** System informacji zwrotnej w czasie rzeczywistym oraz mechanizmy grywalizacji.

---

## Kluczowe Funkcjonalności

### Dla Pacjenta
* **Sesje ćwiczeń z AI:** Analiza ruchu w czasie rzeczywistym przy użyciu kamery internetowej.
* **Panel statystyk:** Wgląd w historię rehabilitacji, postępy i zakresy ruchu.
* **System passy:** Nagradzanie za regularność i jakość wykonywanych sesji.
* **Czat:** Bezpośrednia komunikacja tekstowa z fizjoterapeutą.

### Dla Fizjoterapeuty
* **Zarządzanie pacjentami:** Przeglądanie listy podopiecznych i ich historii urazów.
* **Plany rehabilitacji:** Tworzenie i przypisywanie spersonalizowanych zestawów ćwiczeń.
* **Monitoring:** Dostęp do szczegółowych danych o postępach i poprawności ćwiczeń pacjenta.

---

##  Stack Technologiczny
* **Frontend:** Next.js, Tailwind CSS
* **Backend:** Python
* **Sztuczna Inteligencja:** Google MediaPipe (analiza postawy i zakresu ruchu)
* **Bezpieczeństwo:** Pełne szyfrowanie danych użytkowników

---

##  Architektura Systemu
System został zaprojektowany w modelu trójwarstwowym:
1. **Warstwa Prezentacji:** Intuicyjny interfejs graficzny (maksymalnie 5 kliknięć do kluczowych funkcji).
2. **Warstwa Logiki:** Moduły Pacjenta, Fizjoterapeuty, Administracji oraz Moduł AI.
3. **Warstwa Danych:** Centralna baza przechowująca profile, historię wyników i materiały instruktażowe.

---

## Harmonogram Prac
| Faza | Tydzień | Kluczowe Zadania |
| :--- | :--- | :--- |
| **1. Analiza** | 1-4 | Zbieranie wymagań, specyfikacja i architektura. |
| **2. Projektowanie** | 5-8 | UX/UI, struktura bazy danych, logika biznesowa. |
| **3. Implementacja** | 9-16 | Prace nad frontendem, backendem i modułem AI. |
| **4. Testowanie** | 17-20 | Testy funkcjonalne, poprawa wydajności i błędów. |
| **5. Wdrożenie** | 21-24 | Produkcja, szkolenia i wsparcie techniczne. |

---

## Zespół Projektowy
* **Kacper Błaszczyk** - Project Manager
* **Klim Hudzenko** - Backend Developer
* **Maciej Miazek** - Frontend Developer
* **Remigiusz Tomecki** - Frontend Developer
* **Kacper Romek** - Tester
