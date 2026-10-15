const pl = {
  names: {
    jumper: 'Skoczek',
    balloon: 'Balonik',
    bat: 'Nietoperz',
    swarm: 'Rój',
    splitter: 'Rozszczep',
    shield: 'Tarczownik',
    ghost: 'Duch',
  },
  hints: {
    jumper: 'Wpisuj tę samą literę',
    balloon: 'Złap go, zanim odleci',
    bat: 'Wpisz słowo, zanim zrzuci bombę',
    swarm: 'Szukaj świecącej litery',
    splitter: 'Trafiony pęka na dwie mniejsze połówki',
    shield: 'Wpisz klucz z tarczy, a zobaczysz słowo',
    ghost: 'Znika i wraca, więc zapamiętaj jego słowo',
  },
};

const uk: typeof pl = {
  names: {
    jumper: 'Стрибунець',
    balloon: 'Кулька',
    bat: 'Кажан',
    swarm: 'Рій',
    splitter: 'Розщеп',
    shield: 'Щитоносець',
    ghost: 'Привид',
  },
  hints: {
    jumper: 'Друкуй ту саму літеру',
    balloon: 'Злови її, поки не відлетіла',
    bat: 'Надрукуй слово, поки він не скинув бомбу',
    swarm: 'Шукай літеру, що світиться',
    splitter: 'Після влучання розпадається на дві менші половинки',
    shield: 'Надрукуй ключ зі щита, і побачиш слово',
    ghost: 'Зникає і повертається, тож запам’ятай його слово',
  },
};

export const enemyTypes = { pl, uk };
