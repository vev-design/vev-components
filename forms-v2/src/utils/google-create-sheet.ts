export default function createGoogleSheet({
  accessToken,
  refreshToken,
  formTitle,
}: {
  accessToken: string;
  refreshToken: string;
  formTitle: string;
}): Promise<string> {
  if (!accessToken || !refreshToken) {
    throw Error(`accessToken(${accessToken}) or refreshToken(${refreshToken}) is missing`);
  }
  return new Promise((resolve, reject) => {
    async function initializeGapiClient() {
      await (window as any).gapi.client.setToken({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      (window as any).gapi.client.load('sheets', 'v4');
    }

    const gapiLoaded = () => {
      (window as any).gapi.load('client', initializeGapiClient);
    };

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = gapiLoaded;
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    const checkClient = () => {
      setTimeout(async () => {
        if ((window as any).gapi?.client?.sheets) {
          try {
            const res = await (window as any).gapi.client.sheets.spreadsheets.create({
              properties: {
                title: formTitle,
              },
            });

            if (res?.result?.spreadsheetUrl) {
              return resolve(res.result.spreadsheetUrl);
            }
            return reject(res.result.error);
          } catch (e) {
            reject(e);
          }
        } else {
          checkClient();
        }
      }, 500);
    };

    checkClient();
  });
}
