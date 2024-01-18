export default {
  config: {
    locales: [
      // 'ar',
      // 'fr',
      // 'cs',
      // 'de',
      // 'dk',
      // 'es',
      // 'he',
      // 'id',
      // 'it',
      // 'ja',
      // 'ko',
      // 'ms',
      // 'nl',
      // 'no',
      // 'pl',
      // 'pt-BR',
      // 'pt',
      // 'ru',
      // 'sk',
      // 'sv',
      // 'th',
      // 'tr',
      // 'uk',
      // 'vi',
      // 'zh-Hans',
      // 'zh',
      "en-GB",
    ],
    theme: {
      light: {
        colors: {
          primary100: "#c9ffeb",
          primary200: '#5effc3',
          primary500: '#00f298',
          buttonPrimary500: '#fff298',
          primary600: '#00bd77',
          buttonPrimary600: '#ffbd77',
          primary700: '#008755',
        }
      }
    },
    translations: {
      en: {
        'app.components.LeftMenu.navbrand.title': 'Ruuby CMS',
      }
    },
  },
  bootstrap(app) {
    console.log(app);
  },
};
