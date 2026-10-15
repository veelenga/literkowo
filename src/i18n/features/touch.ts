interface TouchTexts {
  tapToType: string;
  typingField: string;
  pause: string;
  resume: string;
}

const pl: TouchTexts = {
  tapToType: 'Stuknij, aby pisać',
  typingField: 'Pole do pisania',
  pause: 'Pauza',
  resume: 'Graj dalej',
};

const uk: TouchTexts = {
  tapToType: 'Торкнись, щоб друкувати',
  typingField: 'Поле для друку',
  pause: 'Пауза',
  resume: 'Грати далі',
};

export const touch = { pl, uk };
