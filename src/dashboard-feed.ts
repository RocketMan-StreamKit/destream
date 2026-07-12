import { PLATFORM } from './constants';

const userName = (name: string) => `destream:${name.trim().toLowerCase()}`;

export type DestreamDonation = {
  id: string;
  username: string;
  sourceCurrencyId: string;
  sourceCurrencyAmount: number;
  description?: string;
};

export const pushDonation = async (payload: DestreamDonation) => {
  const donorName = payload.username?.trim() || 'Anonymous';
  const currency = payload.sourceCurrencyId?.trim() || 'USD';
  const amount = payload.sourceCurrencyAmount || 0;

  const profile = {
    id: userName(donorName),
    name: donorName,
    avatar: '',
    platform: PLATFORM,
  };

  return dashboard.addRecord(
    {
      id: `destream:donation:${payload.id}`,
      type: 'donation' as const,
      platform: PLATFORM,
      from: profile.id,
      amount: [amount, currency],
      message: payload.description?.trim() || undefined,
    },
    profile,
    { trigger: { type: 'donation', key: currency, value: amount } }
  );
};
