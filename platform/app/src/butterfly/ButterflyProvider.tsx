import { CommandsManager, ExtensionManager, UserAuthenticationService } from '@ohif/core';
import React from 'react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { history } from '@ohif/app';

type MessageData =
  | {
      type: 'navigate';
      studyId: string;
    }
  | {};

type Props = {
  userAuthenticationService: UserAuthenticationService;
  commandsManager: CommandsManager;
  extensionsManager: ExtensionManager;
};

function useButterflyIntegration(props: Props) {
  const navigate = useNavigate();

  useEffect(() => {
    const onMessage = (ev: MessageEvent<MessageData>) => {
      console.log('handling message in child');

      if (!(typeof ev.data === 'object')) {
        return;
      }

      if (!('type' in ev.data)) {
        return;
      }

      if ('type' in ev.data && ev.data.type === 'navigate') {
        const query = new URLSearchParams({ StudyInstanceUIDs: ev.data.studyId });
        const dataSource = props.extensionsManager.getActiveDataSource()[0];
        dataSource.initialize({ params: {}, query });

        const url = `/viewer?${query.toString()}`;
        navigate(url);
      }
    };

    props.userAuthenticationService.setServiceImplementation({
      getAuthorizationHeader() {
        const bflyToken = JSON.parse(localStorage.getItem('bfly:token')).accessToken;

        return {
          Authorization: `JWT ${bflyToken}`,
          'olympus-organization': 'slug bni-slug',
        };
      },
      getState() {
        return {};
      },
      getUser() {},
      handleUnauthenticated() {},
      reset() {},
      set() {},
      setUser() {},
    });

    window.addEventListener('message', onMessage);

    // must be the last thing in the function to ensure everything is wired
    // and initialized
    window.top.postMessage({ type: 'ready' });
    return () => {
      window.removeEventListener('message', onMessage);
    };
  }, []);
}

export default function ButterflyProvider({ children, ...rest }: React.PropsWithChildren<Props>) {
  useButterflyIntegration(rest);

  return <>{children}</>;
}
