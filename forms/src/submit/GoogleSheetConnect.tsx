import React, { useCallback, useEffect, useState } from 'react';
import { SchemaFieldProps, StringField } from '@vev/react';
import { SilkeBox, SilkeButton, SilkeIcon, SilkeLink, SilkeButtonLink } from '@vev/silke';
import createGoogleSheet from '../utils/google-create-sheet';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

function RevokeButton(props: {
  googleSheetUrl: string | undefined;
  handleRevokeAccess: () => void;
  handleDisconnectSheet: () => void;
}) {
  const { googleSheetUrl, handleRevokeAccess, handleDisconnectSheet } = props;

  return (
    <SilkeBox column gap="s">
      <SilkeBox gap="s">
        <SilkeBox gap="s">
          <SilkeIcon icon="check" style={{ color: 'lightgreen', fontSize: 24 }} />
          Connected
        </SilkeBox>
        <SilkeButtonLink style={{ color: 'red' }} onClick={handleRevokeAccess}>
          Revoke access
        </SilkeButtonLink>
      </SilkeBox>
      {googleSheetUrl && (
        <>
          <SilkeBox>
            <SilkeLink href={googleSheetUrl} target="_blank" style={{ wordBreak: 'break-all' }}>
              {googleSheetUrl}
            </SilkeLink>
          </SilkeBox>
          <div>
            <SilkeButton
              onClick={() => {
                handleDisconnectSheet();
              }}
              label="Disconnect sheet"
              size="s"
              kind="tertiary"
            />
          </div>
        </>
      )}
    </SilkeBox>
  );
}

function GoogleSheetConnect(props: SchemaFieldProps<StringField>) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [needReAuth, setNeedReAuth] = useState<boolean>(false);

  const {
    context: { storage, actions },
    value: googleSheetUrl,
  } = props;

  useEffect(() => {
    (async () => {
      const accessToken = await storage.getItem('accessToken', 'project');
      if (accessToken) {
        setIsAuthenticated(true);
        setLoading(false);
      }
    })();
  }, []);

  const handleRequestAccess = useCallback(async () => {
    try {
      setLoading(true);
      const res = await actions.authenticateGoogle('https://www.googleapis.com/auth/drive.file');
      await handleCreateSheet(res);
      setLoading(false);
      if (res.accessToken && res.refreshToken) setIsAuthenticated(true);
    } catch (e) {
      setLoading(false);
    }
  }, []);

  const handleReAuth = useCallback(async () => {
    const res = await actions.authenticateGoogle('https://www.googleapis.com/auth/drive.file');
    if (res.accessToken && res.refreshToken) {
      setIsAuthenticated(true);
      setNeedReAuth(false);
    }
  }, []);

  const handleCheckHasAccess = useCallback(async () => {
    if (googleSheetUrl) {
      try {
        setLoading(true);
        const hasAccess = await actions.hasAccessGoogle(googleSheetUrl);
        setNeedReAuth(!hasAccess);
        setLoading(false);
      } catch (e) {
        setLoading(false);
      }
    }
  }, [googleSheetUrl]);

  const handleRevokeAccess = useCallback(async () => {
    setIsAuthenticated(false);
    props.onChange(null);
    await actions.revokeGoogle();
  }, [isAuthenticated]);

  const handleCreateSheet = useCallback(async ({ accessToken, refreshToken }: AuthResponse) => {
    setLoading(true);
    const sheet = await createGoogleSheet({
      accessToken,
      refreshToken,
      formTitle: 'Vev Form Submission',
    });
    if (sheet) props.onChange(sheet);
    setLoading(false);
  }, []);

  useEffect(() => {
    handleCheckHasAccess();
  }, [googleSheetUrl]);

  if (!isAuthenticated) {
    return (
      <SilkeButton
        onClick={handleRequestAccess}
        label="Authenticate Google"
        icon="google"
        size="s"
        loading={loading}
        kind="tertiary"
      />
    );
  }

  if (needReAuth) {
    return (
      <SilkeButton
        onClick={handleReAuth}
        label="Reauthenticate Google"
        icon="google"
        size="s"
        loading={loading}
        kind="tertiary"
      />
    );
  }

  return (
    <SilkeBox column gap="s">
      <RevokeButton
        googleSheetUrl={googleSheetUrl}
        handleRevokeAccess={handleRevokeAccess}
        handleDisconnectSheet={() => {
          props.onChange(null);
        }}
      />
      {!props.value && (
        <SilkeBox>
          <SilkeButton
            onClick={async () => {
              const accessToken = await storage.getItem('accessToken', 'project');
              const refreshToken = await storage.getItem('refreshToken', 'project');
              handleCreateSheet({ accessToken, refreshToken });
            }}
            label="Create Google Sheet"
            icon="google"
            size="s"
            loading={loading}
            kind="tertiary"
          />
        </SilkeBox>
      )}
    </SilkeBox>
  );
}

export default GoogleSheetConnect;
