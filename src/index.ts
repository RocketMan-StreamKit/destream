import './config';
import { PLATFORM } from './constants';
import { registerDestreamOverlayTriggers } from './triggers';

void dashboard.registerPlatform({
  id: PLATFORM,
  name: {
    en: 'Destream',
    ru: 'Destream',
    uk: 'Destream',
  },
});

void registerDestreamOverlayTriggers();

status.OnClick(() => {
  api.restart();
});
