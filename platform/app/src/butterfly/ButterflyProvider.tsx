/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  CommandsManager,
  ExtensionManager,
  ServicesManager,
  UserAuthenticationService,
} from '@ohif/core';
import React from 'react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// TODO Remove when the BE is ready
const isInTesting = true;

type MessageData =
  | {
      type: 'navigate';
      studyId: string;
    }
  | {
      type: 'command';
      commandName: string;
      options?: Record<string, unknown>;
      context?: string | string[];
    }
  | {
      type: 'setTool';
      toolName: string;
      toolGroupId?: string;
    }
  | {
      type: 'captureViewport';
    }
  | {
      type: 'setZoomLevel';
      level: '50%' | '70%' | '100%' | '150%' | '200%' | 'fit';
    }
  | {
      type: 'clearFrameAnnotations';
    }
  | {
      type: 'enableWindowLevel';
    };

type ButterflyProviderProps = {
  userAuthenticationService: UserAuthenticationService;
  commandsManager: CommandsManager;
  extensionsManager: ExtensionManager;
  servicesManager: ServicesManager;
};

export default function ButterflyProvider({
  children,
  commandsManager,
  extensionsManager,
  servicesManager,
  userAuthenticationService,
}: React.PropsWithChildren<ButterflyProviderProps>) {
  const navigate = useNavigate();

  useEffect(() => {
    const onMessage = (ev: MessageEvent<MessageData>) => {
      console.log('ButterflyProvider: Received message', ev.data);

      if (!(typeof ev.data === 'object')) {
        return;
      }

      if (!('type' in ev.data)) {
        return;
      }

      const { type } = ev.data;

      if (isInTesting && type === 'navigate' && 'studyUuid' in ev.data) {
        const { studyUuid } = ev.data;
        const url = `/viewer?StudyInstanceUIDs=${studyUuid}`;
        navigate(url);

        // INFO  Notify parent that navigation occurred
        window.top.postMessage(
          {
            type: 'navigated',
            studyId: studyUuid,
            url: url,
          },
          '*'
        );
      }

      // INFO Handle navigation to a specific study
      if (!isInTesting && type === 'navigate' && 'studyId' in ev.data) {
        const { studyId } = ev.data;
        const query = new URLSearchParams({ StudyInstanceUIDs: studyId });
        const dataSource = extensionsManager.getActiveDataSource()[0];
        dataSource.initialize({ params: {}, query });

        const url = `/viewer?${query.toString()}`;
        navigate(url);

        // INFO  Notify parent that navigation occurred
        window.top.postMessage(
          {
            type: 'navigated',
            studyId: studyId,
            url: url,
          },
          '*'
        );

        if (!isInTesting) {
          // INFO Add BF auth token for requests
          userAuthenticationService.setServiceImplementation({
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
        }
      }

      if (type === 'command' && 'commandName' in ev.data) {
        const { commandName, options = {}, context } = ev.data;
        try {
          const result = commandsManager.runCommand(commandName, options, context || 'CORNERSTONE');
          window.top.postMessage(
            {
              type: 'commandResult',
              commandName,
              success: true,
              result,
            },
            '*'
          );
        } catch (error) {
          console.error('ButterflyProvider: Command failed', commandName, error);
          window.top.postMessage(
            {
              type: 'commandResult',
              commandName,
              success: false,
              error: error.message,
            },
            '*'
          );
        }
      }

      if (type === 'setTool' && 'toolName' in ev.data) {
        const { toolName, toolGroupId } = ev.data;
        try {
          commandsManager.runCommand(
            'setToolActiveToolbar',
            {
              toolName,
              toolGroupIds: toolGroupId ? [toolGroupId] : [],
            },
            'CORNERSTONE'
          );

          if (toolName === 'PlanarFreehandROI') {
            window.top.postMessage(
              {
                type: 'freehandROIToolActivated',
                toolName,
              },
              '*'
            );
          }

          window.top.postMessage(
            {
              type: 'toolChanged',
              toolName,
              success: true,
            },
            '*'
          );
        } catch (error) {
          console.error('ButterflyProvider: Tool activation failed', toolName, error);
          window.top.postMessage(
            {
              type: 'toolChanged',
              toolName,
              success: false,
              error: error.message,
            },
            '*'
          );
        }
      }

      if (type === 'captureViewport') {
        try {
          // INFO Add a small delay to ensure viewport and segmentation state are ready
          setTimeout(() => {
            commandsManager.runCommand('showDownloadViewportModal', {}, 'CORNERSTONE');
            window.top.postMessage(
              {
                type: 'captureViewportOpened',
                success: true,
              },
              '*'
            );
          }, 100);
        } catch (error) {
          console.error('ButterflyProvider: Failed to open capture viewport modal', error);
          window.top.postMessage(
            {
              type: 'captureViewportOpened',
              success: false,
              error: error.message,
            },
            '*'
          );
        }
      }

      if (type === 'setZoomLevel' && 'level' in ev.data) {
        const { level } = ev.data;
        try {
          const viewportGridService = servicesManager?.services?.viewportGridService;
          const cornerstoneViewportService = servicesManager?.services?.cornerstoneViewportService;

          if (viewportGridService && cornerstoneViewportService) {
            const activeViewportId = viewportGridService.getActiveViewportId();
            const viewport = cornerstoneViewportService.getCornerstoneViewport(activeViewportId);

            if (viewport) {
              let zoomScale: number;

              switch (level) {
                case '50%':
                  zoomScale = 0.5;
                  break;
                case '70%':
                  zoomScale = 0.7;
                  break;
                case '100%':
                  zoomScale = 1.0;
                  break;
                case '150%':
                  zoomScale = 1.5;
                  break;
                case '200%':
                  zoomScale = 2.0;
                  break;
                case 'fit':
                  // INFO Reset to fit the viewport
                  viewport.resetCamera();
                  viewport.render();
                  window.top.postMessage(
                    {
                      type: 'zoomLevelSet',
                      level,
                      success: true,
                    },
                    '*'
                  );
                  return;
                default:
                  throw new Error(`Invalid zoom level: ${level}`);
              }

              const currentCamera = viewport.getCamera();
              const savedCamera = { ...currentCamera };
              viewport.resetCamera();
              const defaultCamera = viewport.getCamera();
              const defaultParallelScale = defaultCamera.parallelScale;

              const newParallelScale = defaultParallelScale / zoomScale;

              viewport.setCamera({
                ...savedCamera,
                parallelScale: newParallelScale,
              });
              viewport.render();

              window.top.postMessage(
                {
                  type: 'zoomLevelSet',
                  level,
                  success: true,
                },
                '*'
              );
            } else {
              throw new Error('No active viewport found');
            }
          } else {
            throw new Error('Required services not available');
          }
        } catch (error) {
          console.error('ButterflyProvider: Failed to set zoom level', error);
          window.top.postMessage(
            {
              type: 'zoomLevelSet',
              level,
              success: false,
              error: error.message,
            },
            '*'
          );
        }
      }

      // INFO Handle clearing annotations for current frame only
      if (type === 'clearFrameAnnotations') {
        try {
          const viewportGridService = servicesManager?.services?.viewportGridService;
          const cornerstoneViewportService = servicesManager?.services?.cornerstoneViewportService;
          const measurementService = servicesManager?.services?.measurementService;

          if (viewportGridService && cornerstoneViewportService && measurementService) {
            const activeViewportId = viewportGridService.getActiveViewportId();
            const viewport = cornerstoneViewportService.getCornerstoneViewport(activeViewportId);

            if (viewport) {
              // INFO Using 'any' as viewport type doesn't include all Cornerstone methods
              const currentImageIdIndex = (viewport as any).getCurrentImageIdIndex
                ? (viewport as any).getCurrentImageIdIndex()
                : 0;
              const currentImageId = (viewport as any).getImageIds
                ? (viewport as any).getImageIds()[currentImageIdIndex]
                : null;

              if (currentImageId) {
                const allMeasurements = measurementService.getMeasurements();

                // INFO Filter and remove measurements that belong to the current frame
                allMeasurements.forEach(measurement => {
                  // INFO Check if measurement belongs to the current image/frame
                  if (
                    measurement.referenceImageId === currentImageId ||
                    (measurement.metadata &&
                      measurement.metadata.referencedImageId === currentImageId) ||
                    (measurement.data && measurement.data.imageId === currentImageId)
                  ) {
                    try {
                      commandsManager.runCommand(
                        'removeMeasurement',
                        { uid: measurement.uid },
                        'CORNERSTONE'
                      );
                    } catch (e) {
                      console.warn('Failed to remove measurement:', measurement.uid, e);
                    }
                  }
                });

                // INFO Force viewport render to update display
                viewport.render();

                window.top.postMessage(
                  {
                    type: 'frameAnnotationsCleared',
                    frameIndex: currentImageIdIndex + 1,
                    success: true,
                  },
                  '*'
                );
              } else {
                throw new Error('No current image found');
              }
            } else {
              throw new Error('No active viewport found');
            }
          } else {
            throw new Error('Required services not available');
          }
        } catch (error) {
          console.error('ButterflyProvider: Failed to clear frame annotations', error);
          window.top.postMessage(
            {
              type: 'frameAnnotationsCleared',
              success: false,
              error: error.message,
            },
            '*'
          );
        }
      }

      if (type === 'enableWindowLevel') {
        try {
          commandsManager.runCommand(
            'setToolActiveToolbar',
            {
              toolName: 'WindowLevel',
              toolGroupIds: [],
            },
            'CORNERSTONE'
          );

          window.top.postMessage(
            {
              type: 'windowLevelEnabled',
              success: true,
            },
            '*'
          );
        } catch (error) {
          console.error('ButterflyProvider: Failed to enable window level tool', error);
          window.top.postMessage(
            {
              type: 'windowLevelEnabled',
              success: false,
              error: error.message,
            },
            '*'
          );
        }
      }
    };

    window.addEventListener('message', onMessage);

    // INFO Notify parent that OHIF is ready to receive messages
    window.top.postMessage({ type: 'ready' }, '*');

    return () => {
      window.removeEventListener('message', onMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
