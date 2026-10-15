import type { WordLanguage } from '../profiles/Profile';

const pl = `dom kot las sok rak mak lis sad ser los tak jak dal kij fala sala lala kasa sala
jad kadź dar dał lak lek lok kok sok dla alf sal jaka laska klasa salsa dala gdak
hak gaz gad hala haha gala gasł dach jadł gaj jaga sagi digi kisi kije siki dieje
ser sieje lesie jesie idea aleje jedz jeż kies lis sile sieć kij dies jak fik
rura ruda rusa rudy druga rude jura kura kurs rusk rusa drugi serial dres kres
tyle tyka tata teatr test taka lata data sety ety typ tyl ryt tryk lity suty
wada wata woda sowa wola owa owad wady wyt woda tylko rower torty osa osy dwa
pies pole pora palec prosta pisze kupa pokój kupa plaża pies papuga pstrąg
mama mewa most mysz lampa mapa wiem wam mamy motyl mewy mewa mop mama
noc nos nowy noga cena cera ocet owoc cały centrum nic nasz nocny
zupa zima zegar zamek zły zły wózek koza foka zebra zjazd zebra złoty
baba bal bok lub byk brat bajka barwa buzia buty bułka borsuk balon bób
ząb mąka pięć sęk gęś kąt wąż ósmy góra król bóbr pójść są mą tę
łoś śnieg ćma łódź łyżka śliwka ćwierć łza ślad łapa łoś śruba ćwik łuk
żaba źrebak koń dżem żółw źle żyrafa pączki dzień żagiel źródło książka słońce`;

const en = `dad fad jak lad sad sal ask all fall salsa flask lass jaks dals
had has gas gal hall glad lash dash flag shall halls
die lie see kid elf lake sale like idea aisle slide sail jail field
fire tree ride rule sure free rare dear read lead rural ear tire
tea tie yet tyre sty star rest test taste sister try tray
wow own owl two tow slow show wood world lower tower water yellow
pop pit peak quiz quit quiet pupil paper deep soap quest
mom milk moon move van vim seven view movie smile mama summer
cat cave can cool nice once cent coin ice moon noon night chance
zoo box six zone fix zebra jazz buzz wax mix exit zero quiz
bee bag bob bear bread jump boat crab banana rabbit bubble`;

export const WORD_LISTS: Record<WordLanguage, string[]> = {
  pl: [...new Set(pl.split(/\s+/).filter(Boolean))],
  en: [...new Set(en.split(/\s+/).filter(Boolean))],
};
