/*!
 * Copyright (C) Microsoft Corporation. All rights reserved.
 */
// import monaco from 'monaco-editor/esm/vs/editor/editor.api';

export const themeName = 'powerfx-theme';

/** Defines an editor theme to be used for PowerFx and sets it as the active theme. */
export function ensureThemeSetup(monacoParam: typeof monaco) {
  monacoParam.editor.defineTheme(themeName, {
    base: 'vs',
    inherit: true,
    colors: {},
    rules: [
      { token: 'boolean', foreground: '#795548' },
      { token: 'keyword', foreground: '#B54B8C' },
      { token: 'function', foreground: '#295EA3' },
      { token: 'number', foreground: '#B64900' },
      { token: 'operator', foreground: '#656871' },
      { token: 'hostSymbol', foreground: '#742774', fontStyle: 'italic' },
      { token: 'variable', foreground: '#007C85' }
    ]
  });
  monacoParam.editor.setTheme(themeName);
}
