import type { UiLanguage } from '../i18n/languages';

export type Speaker = 'owl' | 'fox' | 'shadow';

export interface StoryLine {
  speaker: Speaker;
  text: Record<UiLanguage, string>;
}

export interface StoryScene {
  id: string;
  lines: StoryLine[];
}

const line = (speaker: Speaker, pl: string, uk: string): StoryLine => ({
  speaker,
  text: { pl, uk },
});

const SCENES: StoryScene[] = [
  {
    id: 'intro',
    lines: [
      line(
        'owl',
        'Felku, obudź się! Mrok zakradł się nocą do Wielkiej Księgi i ukradł wszystkie litery.',
        'Фелеку, прокинься! Морок уночі прокрався до Великої Книги і вкрав усі літери.',
      ),
      line(
        'fox',
        'Bez liter nikt nie opowie żadnej bajki! Musimy je odzyskać.',
        'Без літер ніхто не розповість жодної казки! Ми мусимо їх повернути.',
      ),
      line(
        'owl',
        'Mrok zamknął litery w kryształach i rozsypał je po całym Literkowie. Tylko klawiatura może je uwolnić.',
        'Морок замкнув літери в кристалах і розсипав їх по всьому Літеркову. Лише клавіатура може їх звільнити.',
      ),
      line(
        'owl',
        'Każdy palec ma swoje klawisze. Zaczniemy od F i J. Poczuj pod palcami wskazującymi małe wypustki.',
        'Кожен палець має свої клавіші. Почнемо з F та J. Відчуй під вказівними пальцями маленькі горбики.',
      ),
    ],
  },
  {
    id: 'boss-polana',
    lines: [
      line(
        'shadow',
        'Ha! Myślisz, że kilka liter cię uratuje? Mój Strażnik Polany zmiażdży cię.',
        'Ха! Думаєш, кілька літер тебе врятують? Мій Вартовий Галявини розчавить тебе.',
      ),
      line(
        'owl',
        'Spokojnie, Felku. Strażnik jest duży, ale powolny. Wpisuj długie słowa, a rozpadnie się na kawałki.',
        'Спокійно, Фелеку. Вартовий великий, але повільний. Друкуй довгі слова, і він розсиплеться на шматки.',
      ),
    ],
  },
  {
    id: 'after-polana',
    lines: [
      line(
        'fox',
        'Polana znów śpiewa! Pierwsze litery wróciły do Księgi.',
        'Галявина знову співає! Перші літери повернулися до Книги.',
      ),
      line(
        'owl',
        'Przed nami Las. Robi się ciemno, ale świetliki pokażą nam drogę.',
        'Попереду Ліс. Темніє, але світлячки покажуть нам дорогу.',
      ),
    ],
  },
  {
    id: 'boss-las',
    lines: [
      line(
        'shadow',
        'Zabłądzisz w moim lesie, lisku. Strażnik Lasu nie śpi nigdy.',
        'Ти заблукаєш у моєму лісі, лисеня. Вартовий Лісу ніколи не спить.',
      ),
      line(
        'owl',
        'Palce na swoich miejscach. Patrz na ekran, nie na klawiaturę!',
        'Пальці на своїх місцях. Дивись на екран, а не на клавіатуру!',
      ),
    ],
  },
  {
    id: 'after-las',
    lines: [
      line(
        'owl',
        'Las jest wolny! Teraz w górę, na ośnieżone szczyty. Tam Mrok schował górny rząd klawiszy.',
        'Ліс вільний! Тепер угору, на засніжені вершини. Там Морок сховав верхній ряд клавіш.',
      ),
    ],
  },
  {
    id: 'boss-gory',
    lines: [
      line(
        'shadow',
        'Zimno ci, lisku? Strażnik Gór jest zrobiony z lodu.',
        'Холодно тобі, лисеня? Вартовий Гір зроблений з льоду.',
      ),
      line('fox', 'Moje palce są rozgrzane. Zaczynamy!', 'Мої пальці розігріті. Починаємо!'),
    ],
  },
  {
    id: 'after-gory',
    lines: [
      line(
        'owl',
        'Szczyty są czyste! Zostały tylko litery z dolnego rzędu. Mrok ukrył je głęboko w Jaskini.',
        'Вершини чисті! Залишилися лише літери нижнього ряду. Морок сховав їх глибоко в Печері.',
      ),
    ],
  },
  {
    id: 'boss-jaskinia',
    lines: [
      line('shadow', 'W ciemności nikt nie widzi klawiszy!', 'У темряві ніхто не бачить клавіш!'),
      line(
        'owl',
        'Nie musisz ich widzieć, Felku. Twoje palce już pamiętają drogę.',
        'Тобі не треба їх бачити, Фелеку. Твої пальці вже памʼятають дорогу.',
      ),
    ],
  },
  {
    id: 'after-jaskinia',
    lines: [
      line(
        'fox',
        'Cały alfabet jest wolny! Ale coś mi tu nie pasuje. Gdzie są ą, ę i ł?',
        'Увесь алфавіт вільний! Але щось тут не так. Де ą, ę та ł?',
      ),
      line(
        'owl',
        'Na Wyspie Ogonków. Tam litery noszą ogonki i kreski. Przytrzymaj prawy Alt i naciśnij literę.',
        'На Острові Хвостиків. Там літери носять хвостики та рисочки. Утримуй правий Alt і натисни літеру.',
      ),
    ],
  },
  {
    id: 'boss-wyspa',
    lines: [
      line(
        'shadow',
        'To mój ostatni Strażnik. Tym razem nie wygrasz.',
        'Це мій останній Вартовий. Цього разу ти не переможеш.',
      ),
      line('fox', 'Już wygrałem, Mroku. Umiem pisać.', 'Я вже переміг, Мороку. Я вмію друкувати.'),
    ],
  },
  {
    id: 'finale',
    lines: [
      line(
        'owl',
        'Wielka Księga jest pełna! Mrok uciekł, a ty piszesz jak prawdziwy mistrz klawiatury.',
        'Велика Книга повна! Морок утік, а ти друкуєш як справжній майстер клавіатури.',
      ),
      line(
        'fox',
        'Dziękuję, Klaro. A teraz... napiszemy nową bajkę?',
        'Дякую, Кларо. А тепер... напишемо нову казку?',
      ),
    ],
  },
];

export const INTRO_STORY_ID = 'intro';
export const FINALE_STORY_ID = 'finale';

export function bossStoryId(regionId: string): string {
  return `boss-${regionId}`;
}

export function afterStoryId(regionId: string): string {
  return `after-${regionId}`;
}

export function storyScene(id: string): StoryScene | undefined {
  return SCENES.find((scene) => scene.id === id);
}
