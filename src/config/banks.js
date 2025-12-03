// Bank type definitions matching israeli-bank-scrapers
export const COMPANY_TYPES = {
  hapoalim: 'hapoalim',
  beinleumi: 'beinleumi',
  union: 'union',
  amex: 'amex',
  isracard: 'isracard',
  visaCal: 'visaCal',
  max: 'max',
  otsarHahayal: 'otsarHahayal',
  discount: 'discount',
  mercantile: 'mercantile',
  mizrahi: 'mizrahi',
  leumi: 'leumi',
  massad: 'massad',
  yahav: 'yahav',
  behatsdaa: 'behatsdaa',
  beyahadBishvilha: 'beyahadBishvilha',
  oneZero: 'oneZero',
  pagi: 'pagi',
};

export const SCRAPERS = {
  [COMPANY_TYPES.hapoalim]: {
    name: 'Bank Hapoalim',
    loginFields: ['userCode', 'password'],
  },
  [COMPANY_TYPES.leumi]: {
    name: 'Bank Leumi',
    loginFields: ['username', 'password'],
  },
  [COMPANY_TYPES.mizrahi]: {
    name: 'Mizrahi Bank',
    loginFields: ['username', 'password'],
  },
  [COMPANY_TYPES.discount]: {
    name: 'Discount Bank',
    loginFields: ['id', 'password', 'num'],
  },
  [COMPANY_TYPES.mercantile]: {
    name: 'Mercantile Bank',
    loginFields: ['id', 'password', 'num'],
  },
  [COMPANY_TYPES.otsarHahayal]: {
    name: 'Bank Otsar Hahayal',
    loginFields: ['username', 'password'],
  },
  [COMPANY_TYPES.max]: {
    name: 'Max',
    loginFields: ['username', 'password'],
  },
  [COMPANY_TYPES.visaCal]: {
    name: 'Visa Cal',
    loginFields: ['username', 'password'],
  },
  [COMPANY_TYPES.isracard]: {
    name: 'Isracard',
    loginFields: ['id', 'card6Digits', 'password'],
  },
  [COMPANY_TYPES.amex]: {
    name: 'Amex',
    loginFields: ['id', 'card6Digits', 'password'],
  },
  [COMPANY_TYPES.union]: {
    name: 'Union',
    loginFields: ['username', 'password'],
  },
  [COMPANY_TYPES.beinleumi]: {
    name: 'Beinleumi',
    loginFields: ['username', 'password'],
  },
  [COMPANY_TYPES.massad]: {
    name: 'Massad',
    loginFields: ['username', 'password'],
  },
  [COMPANY_TYPES.yahav]: {
    name: 'Bank Yahav',
    loginFields: ['username', 'nationalID', 'password'],
  },
  [COMPANY_TYPES.beyahadBishvilha]: {
    name: 'Beyahad Bishvilha',
    loginFields: ['id', 'password'],
  },
  [COMPANY_TYPES.oneZero]: {
    name: 'One Zero',
    loginFields: ['email', 'password', 'otpCodeRetriever', 'phoneNumber', 'otpLongTermToken'],
  },
  [COMPANY_TYPES.behatsdaa]: {
    name: 'Behatsdaa',
    loginFields: ['id', 'password'],
  },
  [COMPANY_TYPES.pagi]: {
    name: 'Pagi',
    loginFields: ['username', 'password'],
  },
};
