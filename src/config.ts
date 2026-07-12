import { DESTREAM_OVERLAY_BASE } from './constants';
import { DestreamSocketClient, ConnectionState } from './socket-client';
import { notifyConnectionStatus } from './status-notify';
import { mergeDestreamParams } from './params';

const socketClient = new DestreamSocketClient();

const parseOverlayId = (url: string): string | null => {
  const trimmed = url.trim();
  if (!trimmed.startsWith(DESTREAM_OVERLAY_BASE)) return null;
  const parts = trimmed.replace(/\/+$/, '').split('/');
  const last = parts[parts.length - 1];
  if (!last) return null;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(last) ? last : null;
};

const onConnectionState = (state: ConnectionState) => {
  switch (state) {
    case 'online':
      status.Update({ current: 'online', message: { en: 'Destream' } });
      notifyConnectionStatus('online');
      break;
    case 'error':
      status.Update({ current: 'error' });
      notifyConnectionStatus('error');
      break;
    case 'connecting':
      status.Update({ current: 'connecting' });
      break;
    case 'offline':
      status.Update({ current: 'offline' });
      notifyConnectionStatus('offline');
      break;
  }
};

socketClient.setOnStateChange(onConnectionState);

export const RegenerateConfig = () => {
  api.config.getParams().then(async params => {
    const overlayUrl = (params.overlay_url as string)?.trim() || '';
    const overlayId = (params.overlay_id as string) || '';
    const hasValidOverlay = !!(overlayUrl && overlayId);

    if (overlayUrl && !overlayId) {
      const parsedId = parseOverlayId(overlayUrl);
      if (parsedId) {
        await mergeDestreamParams({ overlay_id: parsedId });
        void socketClient.start(parsedId);
      }
    } else if (hasValidOverlay) {
      void socketClient.start(overlayId);
    }

    const fields: Parameters<typeof GenerateConfig>[0] = [];

    fields.push(
      {
        key: 'overlay_url',
        type: 'text',
        default: '',
        editor: {
          label: {
            en: 'Overlay Widget URL',
            ru: 'Ссылка на OBS виджет',
            uk: 'Посилання на OBS віджет',
          },
          description: {
            en: 'Paste the overlay URL from destream.net/overlays',
            ru: 'Вставьте ссылку на виджет с destream.net/overlays',
            uk: 'Вставте посилання на віджет з destream.net/overlays',
          },
          placeholder: {
            en: 'https://overlays.destream.net/550e8400-e29b-41d4-a716-446655440000',
            ru: 'https://overlays.destream.net/550e8400-e29b-41d4-a716-446655440000',
            uk: 'https://overlays.destream.net/550e8400-e29b-41d4-a716-446655440000',
          },
        },
      },
      {
        key: 'overlay_id',
        type: 'hidden',
        default: '',
      },
      {
        type: 'button',
        key: 'get_overlay_url',
        event: 'destreamOpenOverlayUrl',
        editor: {
          label: {
            en: 'Get overlay URL',
            ru: 'Получить ссылку на виджет',
            uk: 'Отримати посилання на віджет',
          },
        },
      }
    );

    if (hasValidOverlay) {
      fields.push({
        type: 'info',
        key: 'status_connected',
        editor: {
          description: {
            en: 'Overlay: ' + overlayId,
            ru: 'Виджет: ' + overlayId,
            uk: 'Віджет: ' + overlayId,
          },
        },
      });
    }

    GenerateConfig(fields);
  });
};

events.On('destreamOpenOverlayUrl', () => {
  api.openUrl('https://destream.net/overlays');
});

RegenerateConfig();
