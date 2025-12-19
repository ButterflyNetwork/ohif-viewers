export default {
  'viewportOverlay.topLeft': [
    // Study date and series description disabled
    // {
    //   id: 'StudyDate',
    //   inheritsFrom: 'ohif.overlayItem',
    //   label: '',
    //   title: 'Study date',
    //   condition: ({ referenceInstance }) => referenceInstance?.StudyDate,
    //   contentF: ({ referenceInstance, formatters: { formatDate } }) =>
    //     formatDate(referenceInstance.StudyDate),
    // },
    // {
    //   id: 'SeriesDescription',
    //   inheritsFrom: 'ohif.overlayItem',
    //   label: '',
    //   title: 'Series description',
    //   condition: ({ referenceInstance }) => {
    //     return referenceInstance && referenceInstance.SeriesDescription;
    //   },
    //   contentF: ({ referenceInstance }) => referenceInstance.SeriesDescription,
    // },
  ],
  'viewportOverlay.topRight': [],
  'viewportOverlay.bottomLeft': [
    {
      id: 'WindowLevel',
      inheritsFrom: 'ohif.overlayItem.windowLevel',
    },
    // Zoom level disabled
    // {
    //   id: 'ZoomLevel',
    //   inheritsFrom: 'ohif.overlayItem.zoomLevel',
    //   condition: props => {
    //     const activeToolName = props.toolGroupService.getActiveToolForViewport(props.viewportId);
    //     return activeToolName === 'Zoom';
    //   },
    // },
  ],
  'viewportOverlay.bottomRight': [
    // Instance number disabled
    // {
    //   id: 'InstanceNumber',
    //   inheritsFrom: 'ohif.overlayItem.instanceNumber',
    // },
  ],
};
