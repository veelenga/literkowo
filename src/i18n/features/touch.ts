interface TouchTexts {
  tapToType: string;
  typingField: string;
  pause: string;
  resume: string;
  phoneKeyboard: string;
}

const pl: TouchTexts = {
  tapToType: 'Stuknij, aby pisać',
  typingField: 'Pole do pisania',
  pause: 'Pauza',
  resume: 'Graj dalej',
  phoneKeyboard: 'Klawiatura telefonu',
};

const uk: TouchTexts = {
  tapToType: 'Торкнись, щоб друкувати',
  typingField: 'Поле для друку',
  pause: 'Пауза',
  resume: 'Грати далі',
  phoneKeyboard: 'Клавіатура телефону',
};

export const touch = { pl, uk };
