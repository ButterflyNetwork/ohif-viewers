import { CommandsManager, ExtensionManager, UserAuthenticationService } from '@ohif/core';
import React from 'react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// import { history } from '@ohif/app';

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
      type: 'viewportAction';
      action:
        | 'zoomIn'
        | 'zoomOut'
        | 'resetViewport'
        | 'flipH'
        | 'flipV'
        | 'rotateLeft'
        | 'rotateRight'
        | 'nextImage'
        | 'previousImage'
        | 'toggleCine';
    }
  | {
      type: 'measurement';
      action: 'clearAll' | 'exportCSV';
    }
  | {
      type: 'setToolbarVisibility';
      visible: boolean;
    }
  | {
      type: 'navigateToStudyList';
    }
  | {
      type: 'getStackInfo';
    }
  | {
      type: 'disableScrollNavigation';
    }
  | {
      type: 'captureViewport';
    }
  | {
      type: 'getFreehandROIMeasurements';
    }
  | {
      type: 'listenToFreehandROI';
      action: 'start' | 'stop';
    };

type Props = {
  userAuthenticationService: UserAuthenticationService;
  commandsManager: CommandsManager;
  extensionsManager: ExtensionManager;
  servicesManager: any;
};

export default function ButterflyProvider({
  children,
  userAuthenticationService,
  commandsManager,
  extensionsManager,
  servicesManager,
}: React.PropsWithChildren<Props>) {
  const navigate = useNavigate();

  useEffect(() => {
    const onMessage = (ev: MessageEvent<MessageData>) => {
      console.log('Butterfly: Received message', ev.data);

      if (!(typeof ev.data === 'object')) {
        return;
      }

      if (!('type' in ev.data)) {
        return;
      }

      const { type } = ev.data;

      // // Handle navigation to a specific study
      // if (type === 'navigate' && 'studyId' in ev.data) {
      //   const { studyId } = ev.data;
      //   const query = new URLSearchParams({ StudyInstanceUIDs: studyId });
      //   const dataSource = extensionsManager.getActiveDataSource()[0];
      //   dataSource.initialize({ params: {}, query });

      //   const url = `/viewer?${query.toString()}`;
      //   navigate(url);

      //   // Notify parent that navigation occurred
      //   window.top.postMessage(
      //     {
      //       type: 'navigated',
      //       studyId: studyId,
      //       url: url,
      //     },
      //     '*'
      //   );
      // }

      // // Uncomment if authentication is needed
      // userAuthenticationService.setServiceImplementation({
      //   getAuthorizationHeader() {
      //     const bflyToken = JSON.parse(localStorage.getItem('bfly:token')).accessToken;
      //     return {
      //       Authorization: `JWT ${bflyToken}`,
      //       'olympus-organization': 'slug bni-slug',
      //     };
      //   },
      //   getState() {
      //     return {};
      //   },
      //   getUser() {},
      //   handleUnauthenticated() {},
      //   reset() {},
      //   set() {},
      //   setUser() {},
      // });

      // Handle direct command execution
      if (type === 'command' && 'commandName' in ev.data) {
        const { commandName, options = {}, context } = ev.data;
        try {
          const result = commandsManager.runCommand(commandName, options, context || 'CORNERSTONE');
          // Send result back to parent if needed
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
          console.error('Butterfly: Command failed', commandName, error);
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

      // Handle tool activation
      if (type === 'setTool' && 'toolName' in ev.data) {
        const { toolName, toolGroupId } = ev.data;
        try {
          // Use setToolActiveToolbar for consistent toolbar state updates
          commandsManager.runCommand(
            'setToolActiveToolbar',
            {
              toolName,
              toolGroupIds: toolGroupId ? [toolGroupId] : [],
            },
            'CORNERSTONE'
          );

          // If PlanarFreehandROI tool is selected, notify parent
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
          console.error('Butterfly: Tool activation failed', toolName, error);
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

      // Handle viewport actions
      if (type === 'viewportAction' && 'action' in ev.data) {
        const { action } = ev.data;
        const actionMap = {
          zoomIn: 'scaleUpViewport',
          zoomOut: 'scaleDownViewport',
          resetViewport: 'resetViewport',
          flipH: 'flipViewportHorizontal',
          flipV: 'flipViewportVertical',
          rotateLeft: 'rotateViewportCCW',
          rotateRight: 'rotateViewportCW',
          nextImage: 'nextImage',
          previousImage: 'previousImage',
          toggleCine: 'toggleCine',
        };

        const commandName = actionMap[action];
        if (commandName) {
          try {
            commandsManager.runCommand(commandName, {}, 'CORNERSTONE');
            window.top.postMessage(
              {
                type: 'viewportActionResult',
                action,
                success: true,
              },
              '*'
            );
          } catch (error) {
            console.error('Butterfly: Viewport action failed', action, error);
            window.top.postMessage(
              {
                type: 'viewportActionResult',
                action,
                success: false,
                error: error.message,
              },
              '*'
            );
          }
        }
      }

      // Handle measurement actions
      if (type === 'measurement' && 'action' in ev.data) {
        const { action } = ev.data;
        if (action === 'clearAll') {
          try {
            // Clear all annotations using cornerstoneTools
            // We need to import cornerstoneTools and use its annotation state manager
            const cornerstoneTools = (window as any).cornerstoneTools;
            if (cornerstoneTools && cornerstoneTools.annotation) {
              // Get all annotations and remove them
              const annotationManager = cornerstoneTools.annotation.state.getAnnotationManager();
              if (annotationManager) {
                // Remove all annotations
                annotationManager.removeAllAnnotations();
              }
            }

            // Also try the removeMeasurement command for each measurement if available
            // This is a more thorough approach if the above doesn't work
            const measurementService = servicesManager?.services?.measurementService;
            if (measurementService) {
              const measurements = measurementService.getMeasurements();
              measurements.forEach((measurement: any) => {
                try {
                  commandsManager.runCommand(
                    'removeMeasurement',
                    { uid: measurement.uid },
                    'CORNERSTONE'
                  );
                } catch (e) {
                  console.warn('Failed to remove measurement:', measurement.uid);
                }
              });
            }

            window.top.postMessage(
              {
                type: 'measurementActionResult',
                action,
                success: true,
              },
              '*'
            );
          } catch (error) {
            console.error('Butterfly: Measurement action failed', action, error);
            window.top.postMessage(
              {
                type: 'measurementActionResult',
                action,
                success: false,
                error: error.message,
              },
              '*'
            );
          }
        }
      }

      // Handle toolbar visibility
      if (type === 'setToolbarVisibility' && 'visible' in ev.data) {
        const { visible } = ev.data;
        localStorage.setItem('ohif-hideToolbar', (!visible).toString());
        // Force a reload to apply the change
        window.location.reload();
      }

      // Handle navigation to study list
      if (type === 'navigateToStudyList') {
        // Navigate to the root/study list page
        navigate('/');

        // Notify parent that we're back on study list
        window.top.postMessage(
          {
            type: 'navigatedToStudyList',
          },
          '*'
        );
      }

      // Handle stack info request
      if (type === 'getStackInfo') {
        try {
          // Get the active viewport
          const viewportGridService = servicesManager?.services?.viewportGridService;
          const cornerstoneViewportService = servicesManager?.services?.cornerstoneViewportService;
          const displaySetService = servicesManager?.services?.displaySetService;

          if (viewportGridService && cornerstoneViewportService) {
            const activeViewportId = viewportGridService.getActiveViewportId();
            const viewport = cornerstoneViewportService.getCornerstoneViewport(activeViewportId);

            if (viewport) {
              // Get stack information
              const imageIds = viewport.getImageIds ? viewport.getImageIds() : [];
              const currentImageIdIndex = viewport.getCurrentImageIdIndex
                ? viewport.getCurrentImageIdIndex()
                : 0;

              // Try to get frame rate from DICOM metadata
              let frameRate = null;
              if (displaySetService) {
                const activeDisplaySets = displaySetService.getActiveDisplaySets();
                if (activeDisplaySets && activeDisplaySets.length > 0) {
                  const displaySet = activeDisplaySets[0];
                  // Check for cine rate or frame time in metadata
                  if (displaySet.instances && displaySet.instances.length > 0) {
                    const instance = displaySet.instances[0];
                    // Common DICOM tags for frame rate
                    frameRate =
                      instance.CineRate ||
                      instance.RecommendedDisplayFrameRate ||
                      (instance.FrameTime ? 1000 / instance.FrameTime : null) ||
                      (instance.FrameDelay ? 1000 / instance.FrameDelay : null);
                  }
                }
              }

              window.top.postMessage(
                {
                  type: 'stackInfo',
                  totalFrames: imageIds.length || 1,
                  currentFrame: currentImageIdIndex + 1,
                  frameRate: frameRate,
                },
                '*'
              );
            }
          }
        } catch (error) {
          console.error('Failed to get stack info:', error);
        }
      }

      // Handle capture viewport - opens the download modal
      if (type === 'captureViewport') {
        try {
          // Add a small delay to ensure viewport and segmentation state are ready
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
          console.error('Butterfly: Failed to open capture viewport modal', error);
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

      // Handle disabling scroll navigation
      if (type === 'disableScrollNavigation') {
        try {
          const toolGroupService = servicesManager?.services?.toolGroupService;
          const cornerstoneViewportService = servicesManager?.services?.cornerstoneViewportService;

          if (toolGroupService && cornerstoneViewportService) {
            // Get all tool groups
            const toolGroups = toolGroupService.getToolGroups();

            toolGroups.forEach((toolGroup: any) => {
              // Disable the StackScrollTool which handles scroll navigation
              try {
                // First, try to disable the tool
                toolGroup.setToolDisabled('StackScroll');
              } catch (e) {
                console.log('StackScroll tool not found in group:', toolGroup.id);
              }

              // Also try to remove mouse wheel bindings
              try {
                // Remove wheel bindings for StackScrollMouseWheelTool
                toolGroup.setToolPassive('StackScrollMouseWheel');
                toolGroup.setToolDisabled('StackScrollMouseWheel');
              } catch (e) {
                console.log('StackScrollMouseWheel tool not found in group:', toolGroup.id);
              }
            });

            // Also override the wheel event handler on viewport elements
            const viewportElements = document.querySelectorAll('.viewport-element');
            viewportElements.forEach((element: Element) => {
              const wheelHandler = (e: Event) => {
                const wheelEvent = e as WheelEvent;
                // Prevent default scroll behavior
                if (Math.abs(wheelEvent.deltaY) > Math.abs(wheelEvent.deltaX)) {
                  e.preventDefault();
                  e.stopPropagation();
                  e.stopImmediatePropagation();
                  return false;
                }
              };

              // Remove existing listeners and add our blocking one
              element.removeEventListener('wheel', wheelHandler);
              element.addEventListener('wheel', wheelHandler, { passive: false, capture: true });

              // Also block on the canvas elements
              const canvas = element.querySelector('canvas');
              if (canvas) {
                canvas.removeEventListener('wheel', wheelHandler);
                canvas.addEventListener('wheel', wheelHandler, { passive: false, capture: true });
              }
            });
          }

          // Add a global wheel blocker as well
          const globalWheelBlocker = (e: WheelEvent) => {
            // Check if the event target is within a viewport
            const target = e.target as Element;
            if (
              target &&
              target.closest(
                '.cornerstone-canvas-wrapper, .viewport-element, .cornerstone-viewport-element'
              )
            ) {
              if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                return false;
              }
            }
          };

          document.removeEventListener('wheel', globalWheelBlocker);
          document.addEventListener('wheel', globalWheelBlocker, { passive: false, capture: true });

          // Use MutationObserver to catch dynamically added viewports
          const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
              mutation.addedNodes.forEach(node => {
                if (node instanceof Element) {
                  const viewportElements = node.querySelectorAll(
                    '.viewport-element, .cornerstone-canvas-wrapper, canvas'
                  );
                  viewportElements.forEach(element => {
                    const wheelHandler = (e: Event) => {
                      const wheelEvent = e as WheelEvent;
                      if (Math.abs(wheelEvent.deltaY) > Math.abs(wheelEvent.deltaX)) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        return false;
                      }
                    };
                    element.addEventListener('wheel', wheelHandler, {
                      passive: false,
                      capture: true,
                    });
                  });

                  // Also check if the node itself is a viewport element
                  if (node.matches('.viewport-element, .cornerstone-canvas-wrapper, canvas')) {
                    const wheelHandler = (e: Event) => {
                      const wheelEvent = e as WheelEvent;
                      if (Math.abs(wheelEvent.deltaY) > Math.abs(wheelEvent.deltaX)) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        return false;
                      }
                    };
                    node.addEventListener('wheel', wheelHandler, { passive: false, capture: true });
                  }
                }
              });
            });
          });

          // Start observing the document body for changes
          observer.observe(document.body, {
            childList: true,
            subtree: true,
          });

          window.top.postMessage(
            {
              type: 'scrollNavigationDisabled',
              success: true,
            },
            '*'
          );

          console.log('Scroll navigation disabled successfully');
        } catch (error) {
          console.error('Failed to disable scroll navigation:', error);
          window.top.postMessage(
            {
              type: 'scrollNavigationDisabled',
              success: false,
              error: error.message,
            },
            '*'
          );
        }
      }

      // Handle getting Freehand ROI measurements
      if (type === 'getFreehandROIMeasurements') {
        try {
          const measurementService = servicesManager?.services?.measurementService;
          if (measurementService) {
            const measurements = measurementService.getMeasurements();
            const freehandROIMeasurements = measurements.filter(
              (measurement: any) => measurement.toolName === 'PlanarFreehandROI'
            );

            window.top.postMessage(
              {
                type: 'freehandROIMeasurements',
                measurements: freehandROIMeasurements.map((m: any) => ({
                  uid: m.uid,
                  label: m.label,
                  toolName: m.toolName,
                  displayText: m.displayText,
                  data: m.data,
                  referenceSeriesUID: m.referenceSeriesUID,
                  referenceStudyUID: m.referenceStudyUID,
                })),
                success: true,
              },
              '*'
            );
          }
        } catch (error) {
          console.error('Butterfly: Failed to get Freehand ROI measurements', error);
          window.top.postMessage(
            {
              type: 'freehandROIMeasurements',
              success: false,
              error: error.message,
            },
            '*'
          );
        }
      }

      // Handle listening to Freehand ROI events
      if (type === 'listenToFreehandROI' && 'action' in ev.data) {
        const { action } = ev.data;
        try {
          const measurementService = servicesManager?.services?.measurementService;

          if (action === 'start' && measurementService) {
            // Subscribe to measurement events for PlanarFreehandROI
            const handleMeasurementAdded = ({ detail }: any) => {
              if (detail?.source?.toolName === 'PlanarFreehandROI') {
                window.top.postMessage(
                  {
                    type: 'freehandROIAdded',
                    measurement: {
                      uid: detail.uid,
                      label: detail.label,
                      toolName: detail.source.toolName,
                      displayText: detail.displayText,
                      data: detail.data,
                    },
                  },
                  '*'
                );
              }
            };

            const handleMeasurementUpdated = ({ detail }: any) => {
              if (detail?.source?.toolName === 'PlanarFreehandROI') {
                window.top.postMessage(
                  {
                    type: 'freehandROIUpdated',
                    measurement: {
                      uid: detail.uid,
                      label: detail.label,
                      toolName: detail.source.toolName,
                      displayText: detail.displayText,
                      data: detail.data,
                    },
                  },
                  '*'
                );
              }
            };

            const handleMeasurementRemoved = ({ detail }: any) => {
              if (detail?.source?.toolName === 'PlanarFreehandROI') {
                window.top.postMessage(
                  {
                    type: 'freehandROIRemoved',
                    uid: detail.uid,
                  },
                  '*'
                );
              }
            };

            // Store handlers in window for cleanup
            (window as any).__freehandROIHandlers = {
              added: handleMeasurementAdded,
              updated: handleMeasurementUpdated,
              removed: handleMeasurementRemoved,
            };

            // Subscribe to measurement service events
            measurementService.subscribe(
              measurementService.EVENTS.MEASUREMENT_ADDED,
              handleMeasurementAdded
            );
            measurementService.subscribe(
              measurementService.EVENTS.MEASUREMENT_UPDATED,
              handleMeasurementUpdated
            );
            measurementService.subscribe(
              measurementService.EVENTS.MEASUREMENT_REMOVED,
              handleMeasurementRemoved
            );

            window.top.postMessage(
              {
                type: 'freehandROIListenerStarted',
                success: true,
              },
              '*'
            );
          } else if (action === 'stop') {
            // Unsubscribe from events
            const handlers = (window as any).__freehandROIHandlers;
            if (handlers && measurementService) {
              measurementService.unsubscribe(
                measurementService.EVENTS.MEASUREMENT_ADDED,
                handlers.added
              );
              measurementService.unsubscribe(
                measurementService.EVENTS.MEASUREMENT_UPDATED,
                handlers.updated
              );
              measurementService.unsubscribe(
                measurementService.EVENTS.MEASUREMENT_REMOVED,
                handlers.removed
              );
              delete (window as any).__freehandROIHandlers;
            }

            window.top.postMessage(
              {
                type: 'freehandROIListenerStopped',
                success: true,
              },
              '*'
            );
          }
        } catch (error) {
          console.error('Butterfly: Failed to manage Freehand ROI listener', error);
          window.top.postMessage(
            {
              type:
                action === 'start' ? 'freehandROIListenerStarted' : 'freehandROIListenerStopped',
              success: false,
              error: error.message,
            },
            '*'
          );
        }
      }
    };

    window.addEventListener('message', onMessage);

    // Notify parent that OHIF is ready to receive messages
    window.top.postMessage({ type: 'ready' }, '*');

    return () => {
      window.removeEventListener('message', onMessage);
    };
  }, [commandsManager, extensionsManager, servicesManager, navigate]);

  return <>{children}</>;
}
