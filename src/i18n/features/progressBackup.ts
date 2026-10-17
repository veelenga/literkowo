interface ProgressBackupTexts {
  title: string;
  hint: string;
  export: string;
  import: string;
  imported: string;
  importFailed: string;
}

const pl: ProgressBackupTexts = {
  title: 'Kopia postępu',
  hint: 'Postęp wszystkich profili w jednym pliku. Profile z pliku zastąpią te same profile tutaj',
  export: 'Zapisz do pliku',
  import: 'Wczytaj z pliku',
  imported: 'Postęp wczytany',
  importFailed: 'Tego pliku nie da się wczytać',
};

const uk: ProgressBackupTexts = {
  title: 'Копія поступу',
  hint: 'Поступ усіх профілів в одному файлі. Профілі з файлу замінять такі самі профілі тут',
  export: 'Зберегти у файл',
  import: 'Завантажити з файлу',
  imported: 'Поступ завантажено',
  importFailed: 'Цей файл не вдається завантажити',
};

export const progressBackup = { pl, uk };
