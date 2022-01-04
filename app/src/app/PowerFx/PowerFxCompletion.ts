import { CompletionItemKind, CompletionTriggerKind } from "vscode-languageserver-protocol";

export const getCompletionTriggerKind = (
  kind: monaco.languages.CompletionTriggerKind
): CompletionTriggerKind => {
  switch (kind) {
    case monaco.languages.CompletionTriggerKind.Invoke:
      return CompletionTriggerKind.Invoked;
    case monaco.languages.CompletionTriggerKind.TriggerCharacter:
      return CompletionTriggerKind.TriggerCharacter;
    case monaco.languages.CompletionTriggerKind.TriggerForIncompleteCompletions:
      return CompletionTriggerKind.TriggerForIncompleteCompletions;
    default:
      throw new Error('Unknown trigger kind!');
  }
};

export const getCompletionKind = (kind?: CompletionItemKind): monaco.languages.CompletionItemKind => {
  switch (kind) {
    case CompletionItemKind.Text:
      return monaco.languages.CompletionItemKind.Text;
    case CompletionItemKind.Method:
      return monaco.languages.CompletionItemKind.Method;
    case CompletionItemKind.Function:
      return monaco.languages.CompletionItemKind.Function;
    case CompletionItemKind.Constructor:
      return monaco.languages.CompletionItemKind.Constructor;
    case CompletionItemKind.Field:
      return monaco.languages.CompletionItemKind.Field;
    case CompletionItemKind.Variable:
      return monaco.languages.CompletionItemKind.Variable;
    case CompletionItemKind.Class:
      return monaco.languages.CompletionItemKind.Class;
    case CompletionItemKind.Interface:
      return monaco.languages.CompletionItemKind.Interface;
    case CompletionItemKind.Module:
      return monaco.languages.CompletionItemKind.Module;
    case CompletionItemKind.Property:
      return monaco.languages.CompletionItemKind.Property;
    case CompletionItemKind.Unit:
      return monaco.languages.CompletionItemKind.Unit;
    case CompletionItemKind.Value:
      return monaco.languages.CompletionItemKind.Value;
    case CompletionItemKind.Enum:
      return monaco.languages.CompletionItemKind.Enum;
    case CompletionItemKind.Keyword:
      return monaco.languages.CompletionItemKind.Keyword;
    case CompletionItemKind.Snippet:
      return monaco.languages.CompletionItemKind.Snippet;
    case CompletionItemKind.Color:
      return monaco.languages.CompletionItemKind.Color;
    case CompletionItemKind.File:
      return monaco.languages.CompletionItemKind.File;
    case CompletionItemKind.Reference:
      return monaco.languages.CompletionItemKind.Reference;
    case CompletionItemKind.Folder:
      return monaco.languages.CompletionItemKind.Folder;
    case CompletionItemKind.EnumMember:
      return monaco.languages.CompletionItemKind.EnumMember;
    case CompletionItemKind.Constant:
      return monaco.languages.CompletionItemKind.Constant;
    case CompletionItemKind.Struct:
      return monaco.languages.CompletionItemKind.Struct;
    case CompletionItemKind.Event:
      return monaco.languages.CompletionItemKind.Event;
    case CompletionItemKind.Operator:
      return monaco.languages.CompletionItemKind.Operator;
    case CompletionItemKind.TypeParameter:
      return monaco.languages.CompletionItemKind.TypeParameter;
    default:
      return monaco.languages.CompletionItemKind.Method;
  }
};
