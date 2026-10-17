import { i18n } from '../i18n/i18n';
import { PROGRESS_FILE_EXTENSION, PROGRESS_FILE_TYPE } from '../profiles/progressFile';
import { el } from './dom';
import './backupControls.css';

const FILE_ACCEPT = `${PROGRESS_FILE_EXTENSION},${PROGRESS_FILE_TYPE}`;
const BUTTON_CLASS = 'button button-ghost backup-button';

export interface ProgressBackupActions {
  readonly onExport: () => void;
  readonly onImport: (file: File) => void;
}

export function backupControls({ onExport, onImport }: ProgressBackupActions): HTMLElement {
  const copy = i18n.t.features.progressBackup;
  const picker = filePicker(onImport);
  return el(
    'div',
    { class: 'backup-actions' },
    el('button', { class: BUTTON_CLASS, type: 'button', text: copy.export, onClick: onExport }),
    el('button', {
      class: `${BUTTON_CLASS} backup-import`,
      type: 'button',
      text: copy.import,
      onClick: () => picker.click(),
    }),
    picker,
  );
}

function filePicker(onPick: (file: File) => void): HTMLInputElement {
  const input = el('input', {
    type: 'file',
    class: 'backup-file',
    onChange: () => {
      const file = input.files?.[0];
      input.value = '';
      if (file) onPick(file);
    },
  });
  input.accept = FILE_ACCEPT;
  input.hidden = true;
  return input;
}
