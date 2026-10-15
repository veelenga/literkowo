import type { ThemeId } from '../../course/catalog';

interface WorldMapTexts {
  moods: Record<ThemeId, string>;
}

const pl: WorldMapTexts = {
  moods: {
    meadow: 'Słoneczna łąka, gdzie zaczyna się przygoda',
    forest: 'Szumiące drzewa skrywają leśne sekrety',
    mountains: 'Wysokie szczyty dla odważnych palców',
    cave: 'Świecące kryształy rozjaśniają ciemność',
    island: 'Ciepła plaża i litery z ogonkami',
  },
};

const uk: WorldMapTexts = {
  moods: {
    meadow: 'Сонячна галявина, де починається пригода',
    forest: 'Шумливі дерева ховають лісові таємниці',
    mountains: 'Високі вершини для сміливих пальців',
    cave: 'Сяйливі кристали освітлюють темряву',
    island: 'Теплий пляж і літери з хвостиками',
  },
};

export const worldMap = { pl, uk };
