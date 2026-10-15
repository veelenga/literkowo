const pl = {
  names: {
    jumper: 'Skoczek',
    balloon: 'Balonik',
    bat: 'Nietoperz',
    swarm: 'Rój',
    splitter: 'Rozszczep',
    shield: 'Tarczownik',
    ghost: 'Duch',
    chameleon: 'Kameleon',
  },
  hints: {
    jumper: 'Wpisuj tę samą literę',
    balloon: 'Złap go, zanim odleci',
    bat: 'Wpisz słowo, zanim zrzuci bombę',
    swarm: 'Szukaj świecącej litery',
    splitter: 'Trafiony pęka na dwie mniejsze połówki',
    shield: 'Wpisz klucz z tarczy, a zobaczysz słowo',
    ghost: 'Znika i wraca, więc zapamiętaj jego słowo',
    chameleon: 'Zmienia słowo, dopóki nie wpiszesz pierwszej litery',
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
    chameleon: 'Хамелеон',
  },
  hints: {
    jumper: 'Друкуй ту саму літеру',
    balloon: 'Злови її, поки не відлетіла',
    bat: 'Надрукуй слово, поки він не скинув бомбу',
    swarm: 'Шукай літеру, що світиться',
    splitter: 'Після влучання розпадається на дві менші половинки',
    shield: 'Надрукуй ключ зі щита, і побачиш слово',
    ghost: 'Зникає і повертається, тож запам’ятай його слово',
    chameleon: 'Змінює слово, поки не надрукуєш першу літеру',
  },
};

export const enemyTypes = { pl, uk };
