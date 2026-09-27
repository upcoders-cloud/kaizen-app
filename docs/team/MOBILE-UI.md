# Mobile UI

System wizualny klienta Expo jest gotowy do użycia w ekranach mobile-a i mobile-b. Nie dodano zależności.

## Tokeny

```jsx
import colors from 'theme/colors';
import {spacing, radius, typography, shadows} from 'theme/theme';
```

`theme/colors.js` zachowuje dotychczasowe klucze i eksporty. Nowe klucze: `textMuted`, `textSubtle`, `surfaceAlt`, `surfaceRaised`, `borderStrong`, `white`, `success`, `warning`, `dangerSoft`, `successSoft`, `warningSoft`, `infoSoft`, `primarySoft`, `backdrop`, `statusSubmitted`, `statusInProgress`, `statusImplemented`, `statusToVerify`, `statusCancelled` oraz odpowiadające im `statusText*`.

Kolory dekoracyjne i gamifikacja: `accentWash` to półprzezroczysty cyjan dla tła, `medalGold`, `medalSilver`, `medalBronze` to wspólna paleta podium i odznak. Oznaczenia ról mają trzy tokeny na rolę: `roleLeadSurface/Border/Text`, `roleManagerSurface/Border/Text`, `roleDirectorSurface/Border/Text`, `roleEmployeeSurface/Border/Text`. Wartości `Surface`, `Border`, `Text` służą odpowiednio za tło, obramowanie i tekst/ikonę.

Skala odstępów: `spacing.xs` 4, `sm` 8, `md` 12, `lg` 16, `xl` 20, `xxl` 24, `xxxl` 32. Promienie: `radius.sm` 8, `md` 12, `lg` 16, `xl` 22, `pill` 999. Typografia: `caption`, `body`, `bodyStrong`, `subtitle`, `title`, `display`. Cienie: `shadows.card`, `shadows.floating`.

## Prymitywy

Każdy komponent można importować bezpośrednio z `components/ui/Nazwa` albo jako nazwany eksport z `components/ui`.

| Komponent | Najważniejsze propsy | Przeznaczenie |
| --- | --- | --- |
| `Card` | `children`, `style`, `onPress`, `padded`, `elevated` | Powierzchnia z opcjonalną akcją i cieniem. |
| `Avatar` | `name`, `uri`, `size`, `style` | Zdjęcie lub inicjały użytkownika. |
| `Chip` | `label`, `selected`, `onPress`, `style` | Filtr lub mała etykieta. |
| `StatusPill` | `status`, `label`, `style` | Status posta: `TO_VERIFY`, `SUBMITTED`, `IN_PROGRESS`, `IMPLEMENTED`, `CANCELLED`. |
| `IconButton` | `icon`, `onPress`, `accessibilityLabel`, `variant`, `disabled` | Przycisk z ikoną Feather, rozmiar dotyku 44. |
| `EmptyState` | `icon`, `title`, `description`, `action` | Pusta lista lub brak wyników. |
| `ErrorState` | `title`, `description`, `onRetry` | Błąd ładowania z ponowieniem. |
| `Skeleton` | `width`, `height`, `rounded`, `style` | Pulsujący placeholder przez `Animated`. |
| `Divider` | `style` | Separator. |
| `SectionHeader` | `title`, `subtitle`, `action` | Nagłówek sekcji. |
| `ScreenContainer` | `scroll`, `edges`, `style`, `contentStyle` | Tło i bezpieczny obszar ekranu, opcjonalnie przewijanie. |
| `PressableScale` | `onPress`, `pressedScale`, `style`, `disabled` | Animacja naciśnięcia przez `Animated`. |

```jsx
import {Card, StatusPill, SectionHeader, EmptyState} from 'components/ui';

<SectionHeader title="Pomysły" subtitle="Najnowsze zgłoszenia" />
<Card elevated onPress={() => openIdea(id)}><StatusPill status="IN_PROGRESS" /></Card>
<EmptyState title="Brak pomysłów" description="Dodaj pierwszy pomysł." />
```

Decyzja projektowa: jasne powierzchnie, granatowy akcent i semantyczne statusy. Wszystkie etykiety dostępne dla użytkownika są po polsku.
