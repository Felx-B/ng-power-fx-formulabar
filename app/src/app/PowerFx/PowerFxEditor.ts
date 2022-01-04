import { CompletionItemKind, CompletionTriggerKind, DiagnosticSeverity } from "vscode-languageserver-protocol";

export const editorFontFamily = "'Menlo', 'Consolas', monospace,sans-serif";
export const editorFontSize = 14;

/** The default option configuration that we use for all the Monaco code editors inside PowerFx. */
export const defaultEditorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
//monaco.editor.IEditorConstructionOptions & monaco.editor.IGlobalEditorOptions = {
  fontSize: editorFontSize,
  lineDecorationsWidth: 4,
  scrollbar: {
    vertical: 'auto',
    verticalScrollbarSize: 8,
    horizontal: 'auto',
    horizontalScrollbarSize: 8
  },
  // This fixes the first time render bug, and handles additional resizes.
  automaticLayout: true,
  contextmenu: false,
  // Don't show a border above and below the current line in the editor.
  renderLineHighlight: 'none',
  lineNumbers: 'off',
  wordWrap: 'on',
  autoClosingBrackets: 'never',
  quickSuggestions: true,
  scrollBeyondLastLine: false,
  // Don't show the minimap (the scaled down thumbnail view of the code)
  minimap: { enabled: false },
  selectionClipboard: false,
  // Don't add a margin on the left to render special editor symbols
  glyphMargin: false,
  revealHorizontalRightPadding: 24,
  find: {
    seedSearchStringFromSelection: 'never',
    autoFindInSelection: 'never'
  },
  suggestOnTriggerCharacters: true,
  codeLens: false,
  // Don't allow the user to collapse the curly brace sections
  folding: false,
  formatOnType: true,
  fontFamily: editorFontFamily,
  wordBasedSuggestions: false,
  // This option helps to fix some of the overflow issues when using the suggestion widget in grid rows
  // NOTE: This doesn't work when it's hosted inside Fluent Callout control
  // More details in https://github.com/microsoft/monaco-editor/issues/2503
  fixedOverflowWidgets: true,
  language: 'powerfx'
};
