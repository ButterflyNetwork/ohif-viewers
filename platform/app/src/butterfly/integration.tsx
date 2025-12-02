import { useAppConfig } from '@state';
import { useEffect } from 'react'
import {useNavigate} from 'react-router'

type MessageData = {
    type: 'navigate';
    studyId: string;
} | {};

export function useButterflyIntegration() {
    const navigate = useNavigate();
    const appConfig = useAppConfig();
    useEffect(() => {
        const onMessage = (ev: MessageEvent<MessageData>) => {
            if (!(typeof ev.data === 'object')) {
                return;
            }

            if (!('type' in ev.data)) {
                return;

            }

            if ('type' in ev.data && ev.data.type === 'navigate') {
                navigate(`${appConfig.routerBasename ?? ''}/viewer?StudyInstanceUID=${ev.data.studyId}`)
            }
        }

        window.addEventListener('message', onMessage);

        window.top.postMessage({type: 'ready'});
        return () => {
            window.removeEventListener('message', onMessage);
        }
    }, [appConfig]);
}