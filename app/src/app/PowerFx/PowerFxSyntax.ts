/*!
 * Copyright (C) Microsoft Corporation. All rights reserved.
 */
/**
 * This file contains the functions to extend the MonacoEditor with information about the PowerFx language.
 */
// import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

import { HighlightedName, NameKind, SyntaxParameters } from './PowerFxSyntaxTypes';

/** Name used to represent our language */
export const languageName = 'powerfx';

/** Creates an entry for our language with the monaco editor */
export function ensureLanguageRegistered(monacoParam: typeof monaco, syntax: SyntaxParameters): void {
  if (monacoParam.languages.getLanguages().some(language => language.id === languageName)) {
    return;
  }

  monacoParam.languages.register({
    id: languageName
  });

  function refresh(names: HighlightedName[]) {
    monacoParam.languages.setMonarchTokensProvider(
      languageName,
      formulaEditorSyntax(syntax.useSemicolons, names)
    );
  }

  refresh(syntax.highlightedNames);

  syntax.subscribeToNames?.(refresh);

  const getTokenForPosition = (position: monaco.Position, tokens: monaco.Token[]): monaco.Token | null => {
    for (let i = tokens.length - 1; i >= 0; i--) {
      const token = tokens[i];
      if (token.offset <= position.column) {
        return token;
      }
    }

    return null;
  };

  function isPositionAStringToken(position: monaco.Position, model: monaco.editor.IReadOnlyModel): boolean {
    // Get 0'th element since we're tokenizing one line
    const tokens = monacoParam.editor.tokenize(model.getLineContent(position.lineNumber), languageName)[0];
    const token = getTokenForPosition(position, tokens);
    return !!(token && token.type.indexOf('string') === 0);
  }

  monacoParam.languages.registerCompletionItemProvider(languageName, {
    triggerCharacters: ['.', '!', '(', ',', '{', ';'],
    provideCompletionItems: async (model, ...rest) => {
      if (completionProviderMapping.has(model)) {
        const completionProvider = completionProviderMapping.get(model)!;
        return completionProvider(model, ...rest);
      } else {
        return {
          incomplete: false,
          suggestions: []
        } as monaco.languages.CompletionList;
      }
    }
  });

  // Register an auto-fix for fixing case of auto-completion items
  monacoParam.languages.registerOnTypeFormattingEditProvider(languageName, {
    autoFormatTriggerCharacters: ['(', '[', '{', ')', ']', '}', ',', ';', '.'],
    provideOnTypeFormattingEdits: (model, position) => {
      if (!syntax.getNormalizedCompletionLookup) {
        return [];
      }

      // Get the token just before the trigger character
      const word = model.getWordUntilPosition(model.modifyPosition(position, -1));

      // Only normalize words that are part of the auto-completion table,
      // don't auto-format casing within strings
      const normalizedWord = word.word.toLowerCase();
      const normalizedCompletionLookup = syntax.getNormalizedCompletionLookup();
      if (normalizedWord in normalizedCompletionLookup && !isPositionAStringToken(position, model)) {
        return [
          {
            range: {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn
            },
            text: normalizedCompletionLookup[normalizedWord]
          }
        ];
      }

      return [];
    }
  });

  monacoParam.languages.registerSignatureHelpProvider(languageName, {
    signatureHelpTriggerCharacters: ['(', ',', ';'],
    signatureHelpRetriggerCharacters: ['(', ',', ';'],
    provideSignatureHelp: (model, position, token, context) => {
      if (signatureHelpProviderMapping.has(model)) {
        const signatureHelpProvider = signatureHelpProviderMapping.get(model)!;
        return signatureHelpProvider(model, position, token, context);
      }

      return {
        value: {
          signatures: [],
          activeSignature: 0,
          activeParameter: 0
        },
        dispose: () => {
          return;
        }
      };
    }
  });

  // Set language configuration to show matching brackets
  monacoParam.languages.setLanguageConfiguration(languageName, {
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' }
    ],
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')']
    ]
  });
}

function formulaEditorSyntax(
  useSemicolons: boolean,
  names: HighlightedName[]
): monaco.languages.IMonarchLanguage {
  return {
    booleans: ['true', 'false'],

    keywords: ['ThisItem', 'Self', 'Parent'],

    operators: [
      '+',
      '-',
      '*',
      '/',
      '^',
      '%',
      '=',
      '>',
      '>=',
      '<',
      '<=',
      '<>',
      '&',
      '&&',
      '||',
      '!',
      '.',
      '@',
      ';;'
    ],

    hostSymbols: names.filter(name => name.kind === NameKind.HostSymbol).map(name => name.name),
    variables: names.filter(name => name.kind === NameKind.Variable).map(name => name.name),
    functions: names.filter(name => name.kind === NameKind.Function).map(name => name.name),

    // Captures blocks of symbols that are checked for being operators later.
    symbols: /[=><!~?:&|+\-*\/\^%@;]+/,

    // C# style strings
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

    tokenizer: {
      root: [
        // Record keys must always be plain identifier color.
        [/[a-zA-Z_][\w]*\s*:/, 'identifier'],

        // Identifiers and keywords
        [
          /[a-zA-Z_][\w]*/,
          {
            cases: {
              '@functions': 'function',
              '@booleans': 'boolean',
              '@keywords': 'keyword',
              '@hostSymbols': 'hostSymbol',
              '@variables': 'variable',
              '@default': 'identifier'
            }
          }
        ],

        { include: '@whitespace' },

        // Delimiters and operators
        [/[{}()\[\]]/, '@brackets'],
        [/[<>](?!@symbols)/, '@brackets'],
        [
          /@symbols/,
          {
            cases: {
              '@operators': 'operator',
              '@default': ''
            }
          }
        ],

        // numbers
        [useSemicolons ? /\d*\,\d+([eE][\-+]?\d+)?/ : /\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
        [/\d+/, 'number'],

        // delimiter: after number because of .\d floats
        [/[;,.]/, 'delimiter'],

        // strings
        [/"([^"\\]|\\.)*$/, 'string.invalid'], // non-teminated string
        [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],

        [/'([^'\\]|\\.)*$/, 'unicodeIdentifier.invalid'], // non-teminated string
        [/'/, { token: 'unicodeIdentifier.quote', bracket: '@open', next: '@unicodeIdentifier' }],

        // Unknown literals (could be unicode names)
        [
          /.\S*/,
          {
            cases: {
              '@hostSymbols': 'hostSymbol',
              '@variables': 'variable',
              '@default': 'identifier'
            }
          }
        ]
      ],

      comment: [
        [/[^\/*]+/, 'comment'],
        [/\/\*/, 'comment', '@push'], // nested comment
        ['\\*/', 'comment', '@pop'],
        [/[\/*]/, 'comment']
      ],

      string: [
        [/[^\\"]+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
      ],

      unicodeIdentifier: [
        [/[^\\']+/, 'unicodeIdentifier'],
        [/@escapes/, 'unicodeIdentifier.escape'],
        [/\\./, 'unicodeIdentifier.escape.invalid'],
        [/'/, { token: 'unicodeIdentifier.quote', bracket: '@close', next: '@pop' }]
      ],

      whitespace: [
        [/[ \t\r\n]+/, 'white'],
        [/\/\*/, 'comment', '@comment'],
        [/\/\/.*$/, 'comment']
      ]
    }
  } as monaco.languages.IMonarchLanguage;
}

/**
 * Because the language is a singleton, but our current language service has a completion provider per editor
 * we need to keep a mapping of models to the completion provider implementation to use
 */
const completionProviderMapping = new Map<
  monaco.editor.ITextModel,
  monaco.languages.CompletionItemProvider['provideCompletionItems']
>();

const signatureHelpProviderMapping = new Map<
  monaco.editor.ITextModel,
  monaco.languages.SignatureHelpProvider['provideSignatureHelp']
>();

/** Registers providers to be used for the specified model */
export function addProvidersForModel(
  model: monaco.editor.ITextModel,
  completionProvider: monaco.languages.CompletionItemProvider['provideCompletionItems'],
  signatureHelpProvider: monaco.languages.SignatureHelpProvider['provideSignatureHelp']
): monaco.IDisposable {
  if (completionProviderMapping.has(model)) {
    throw new Error('Completion provider already exists for this model.');
  }

  if (signatureHelpProviderMapping.has(model)) {
    throw new Error('SignatureHelp provider already exists for this model.');
  }

  completionProviderMapping.set(model, completionProvider);
  signatureHelpProviderMapping.set(model, signatureHelpProvider);

  return {
    dispose: () => {
      completionProviderMapping.delete(model);
      signatureHelpProviderMapping.delete(model);
    }
  };
}
