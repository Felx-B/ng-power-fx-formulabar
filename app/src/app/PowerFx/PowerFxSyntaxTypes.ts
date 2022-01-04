/*!
 * Copyright (C) Microsoft Corporation. All rights reserved.
 */

export enum NameKind {
  HostSymbol,
  Variable,
  Function
}

/** Defines a name that should be highlighted in the editor. */
export interface HighlightedName {
  readonly name: string;
  readonly kind: NameKind;
}

/**
 * Defines the contract for the information we need to properly define the language's syntax tokenization rules.
 */
export interface SyntaxParameters {
  /**
   *  Defines whether we're in a locale that uses commas as decimal separators.
   */
  readonly useSemicolons: boolean;
  /**
   * The list of names to highlight in the editor.
   * This is used for colorizing function, variable and host symbol names
   */
  readonly highlightedNames: HighlightedName[];
  /**
   *  A function that can be called to register a subscription for name changes
   */
  readonly subscribeToNames?: (onNamesChanged: (names: HighlightedName[]) => void) => void;
  /**
   * A function that returns the normalized completion lookup for auto case correction
   */
  readonly getNormalizedCompletionLookup?: () => { [lowercase: string]: string };
}
