import Player = YT.Player;
import PlayerEventHandler = YT.PlayerEventHandler;
import OnStateChangeEvent = YT.OnStateChangeEvent;

declare global {
  interface Window {
    __vevYouTubeManager?: VideoManager;
    onYouTubeIframeAPIReady: () => void;
    vevDebugYT: boolean;
  }
}

interface RegisterRequest {
  videoId: string;
  el: HTMLIFrameElement;
  onPlayerStateChange: PlayerEventHandler<OnStateChangeEvent>;
}

class VideoManager {
  apiReady = false;
  players: Record<string, Player>;
  playerMeta: Record<string, RegisterRequest> = {};

  constructor() {
    if (typeof YT === 'undefined') {
      const tag = document.createElement('script');

      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }
    this.players = {};
    window.onYouTubeIframeAPIReady = this.onAPIReady.bind(this);
  }

  onAPIReady() {
    this.apiReady = true;
  }

  registerPlayer(register: RegisterRequest) {
    const interval = setInterval(() => {
      if (this.apiReady) {
        clearInterval(interval);
        const { videoId, el, onPlayerStateChange } = register;
        this.playerMeta[videoId] = register;
        new YT.Player(el, {
          events: {
            onStateChange: onPlayerStateChange,
            onReady: ({ target }) => {
              this.players[videoId] = target;
            },
          },
        });
      }
    }, 100);
  }

  async getPlayer(videoId: string): Promise<Player> {
    return new Promise((resolve) => {
      if (this.players[videoId]) {
        resolve(this.players[videoId]);
      } else {
        setInterval(() => {
          if (this.players[videoId]) {
            resolve(this.players[videoId]);
          }
        }, 100);
      }
    });
  }
}

/**
 * The YouTube iframe API is annoying when it comes to multiple videos and videos being hidden
 * So wrapping it in a manager to take care of those issues
 */
export default function getManager() {
  if (window.__vevYouTubeManager) return window.__vevYouTubeManager;
  window.__vevYouTubeManager = new VideoManager();
  return window.__vevYouTubeManager;
}
