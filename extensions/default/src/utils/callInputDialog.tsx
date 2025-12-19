import React from 'react';
import { setAnnotationLabel } from '@cornerstonejs/tools/utilities';
import { annotation } from '@cornerstonejs/tools';
import { LabellingFlow } from '@ohif/ui-next';
import { InlineAnnotationInput } from '@ohif/ui-next';

interface InputDialogDefaultProps {
  hide: () => void;
  onSave: (value: string) => void;
  placeholder: string;
  defaultValue: string;
  submitOnEnter: boolean;
}

function InputDialogDefault({
  hide,
  onSave,
  placeholder = 'Enter annotation text',
  defaultValue = '',
  submitOnEnter,
}: InputDialogDefaultProps) {
  return (
    <InlineAnnotationInput
      onSave={onSave}
      onCancel={hide}
      hide={hide}
      defaultValue={defaultValue}
      placeholder={placeholder}
      submitOnEnter={submitOnEnter}
    />
  );
}

/**
 * Shows an inline annotation input for entering text
 * @param uiDialogService - Service for showing UI dialogs
 * @param defaultValue - Initial value to show in input field
 * @param placeholder - Placeholder text for input field
 * @param submitOnEnter - Whether to submit dialog when Enter key is pressed
 */
export async function callInputDialog({
  uiDialogService,
  defaultValue = '',
  placeholder = 'Enter annotation text',
  submitOnEnter = true,
}: {
  uiDialogService: AppTypes.UIDialogService;
  defaultValue?: string;
  placeholder?: string;
  submitOnEnter?: boolean;
}) {
  const dialogId = 'dialog-enter-annotation';

  const value = await new Promise<string>(resolve => {
    uiDialogService.show({
      id: dialogId,
      content: InputDialogDefault,
      unstyled: true,
      shouldCloseOnEsc: true,
      contentProps: {
        onSave: value => {
          resolve(value);
        },
        placeholder,
        defaultValue,
        submitOnEnter,
      },
    });
  });

  return value;
}

export async function callInputDialogAutoComplete({
  measurement,
  uiDialogService,
  labelConfig,
  renderContent = LabellingFlow,
  element,
}) {
  const exclusive = labelConfig ? labelConfig.exclusive : false;
  const dropDownItems = labelConfig ? labelConfig.items : [];

  const value = await new Promise<Map<string, string>>((resolve, reject) => {
    const labellingDoneCallback = newValue => {
      uiDialogService.hide('select-annotation');
      if (measurement && typeof newValue === 'string') {
        const sourceAnnotation = annotation.state.getAnnotation(measurement.uid);
        setAnnotationLabel(sourceAnnotation, element, newValue);
      }
      resolve(newValue);
    };

    uiDialogService.show({
      id: 'select-annotation',
      title: 'Annotation',
      content: renderContent,
      contentProps: {
        labellingDoneCallback: labellingDoneCallback,
        measurementData: measurement,
        componentClassName: {},
        labelData: dropDownItems,
        exclusive: exclusive,
      },
    });
  });

  return value;
}

export default callInputDialog;
