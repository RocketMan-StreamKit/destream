const currencyOption = (code: string) => ({
  value: code,
  label: { en: code, ru: code, uk: code },
});

const CURRENCY_OPTIONS = ['EUR', 'GBP', 'INR', 'USD'].map(currencyOption);

export const registerDestreamOverlayTriggers = () => {
  return dashboard.registerTriggers([
    {
      type: 'donation',
      label: {
        en: 'Donation',
        ru: 'Донат',
        uk: 'Донат',
      },
      valueType: 'number',
      keyOptions: CURRENCY_OPTIONS,
      keyLabel: {
        en: 'Currency',
        ru: 'Валюта',
        uk: 'Валюта',
      },
      valueHint: {
        en: 'Donation amount',
        ru: 'Сумма доната',
        uk: 'Сума донату',
      },
    },
  ]);
};
