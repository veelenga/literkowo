const pl = {
  names: {
    jumper: 'Skoczek',
    balloon: 'Balonik',
    bat: 'Nietoperz',
    swarm: 'Rój',
  },
  hints: {
    jumper: 'Wpisuj tę samą literę',
    balloon: 'Złap go, zanim odleci',
    bat: 'Wpisz słowo, zanim zrzuci bombę',
    swarm: 'Szukaj świecącej litery',
  },
};

const uk: typeof pl = {
  names: {
    jumper: 'Стрибунець',
    balloon: 'Кулька',
    bat: 'Кажан',
    swarm: 'Рій',
  },
  hints: {
    jumper: 'Друкуй ту саму літеру',
    balloon: 'Злови її, поки не відлетіла',
    bat: 'Надрукуй слово, поки він не скинув бомбу',
    swarm: 'Шукай літеру, що світиться',
  },
};

export const enemyTypes = { pl, uk };
