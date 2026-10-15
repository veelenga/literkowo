const pl = {
  names: {
    jumper: 'Skoczek',
    balloon: 'Balonik',
    bat: 'Nietoperz',
    swarm: 'Rój',
    splitter: 'Rozszczep',
  },
  hints: {
    jumper: 'Wpisuj tę samą literę',
    balloon: 'Złap go, zanim odleci',
    bat: 'Wpisz słowo, zanim zrzuci bombę',
    swarm: 'Szukaj świecącej litery',
    splitter: 'Trafiony pęka na dwie mniejsze połówki',
  },
};

const uk: typeof pl = {
  names: {
    jumper: 'Стрибунець',
    balloon: 'Кулька',
    bat: 'Кажан',
    swarm: 'Рій',
    splitter: 'Розщеп',
  },
  hints: {
    jumper: 'Друкуй ту саму літеру',
    balloon: 'Злови її, поки не відлетіла',
    bat: 'Надрукуй слово, поки він не скинув бомбу',
    swarm: 'Шукай літеру, що світиться',
    splitter: 'Після влучання розпадається на дві менші половинки',
  },
};

export const enemyTypes = { pl, uk };
