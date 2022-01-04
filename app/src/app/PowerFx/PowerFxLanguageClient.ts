/*!
 * Copyright (C) Microsoft Corporation. All rights reserved.
 */

import { v4 as uuid } from 'uuid';
import {
  CompletionList,
  CompletionParams,
  CompletionTriggerKind,
  DidChangeTextDocumentParams,
  DidOpenTextDocumentParams,
  DocumentUri,
  PublishDiagnosticsParams,
  SignatureHelp,
  SignatureHelpParams
} from 'vscode-languageserver-protocol';

import { languageName } from './PowerFxSyntax';

enum Methods {
  didOpen = 'textDocument/didOpen',
  didChange = 'textDocument/didChange',
  completion = 'textDocument/completion',
  signatureHelp = 'textDocument/signatureHelp',
  publishDiagnostics = 'textDocument/publishDiagnostics',
  publishTokens = '$/publishTokens',
  initialFixup = '$/initialFixup'
}

type InitialFixupParams = DidOpenTextDocumentParams;

const ApiTimeoutInMilliseconds: number = 20000;

interface SendRequestResult {
  success: boolean;
  response?: string;
}

interface PendingPromise {
  id: string;
  resolve: (value?: string) => void;
}

/**
 * Token result type mapped to rules index in PowerFxTheme.ts
 */
export enum TokenResultType {
  Boolean = 0,
  Keyword = 1,
  Function = 2,
  Number = 3,
  Operator = 4,
  HostSymbol = 5,
  Variable = 6
}

export enum GetTokensFlags {
  None = 0,
  UsedInExpression = 1,
  AllFunctions = 2
}

export interface PublishTokensParams {
  uri: DocumentUri;
  tokens: { [name: string]: TokenResultType };
}

export class PowerFxLanguageClient {
  private _pendingPromises: PendingPromise[] = [];

  public constructor(
    private _getDocumentUriAsync: () => Promise<string>,
    private _sendToLanguageServerAsync: (payload: string) => Promise<void>,
    private _handleDiagnosticsNotification: (params: PublishDiagnosticsParams) => void,
    private _handleTokensNotification: (params: PublishTokensParams) => void
  ) {}

  public async notifyDidOpenAsync(text: string): Promise<void> {
    const uri = await this._getDocumentUriAsync();
    const documentUrl = new URL(uri);
    documentUrl.searchParams.set(
      'getTokensFlags',
      (GetTokensFlags.AllFunctions + GetTokensFlags.UsedInExpression).toString()
    );

    const params: DidOpenTextDocumentParams = {
      textDocument: {
        uri: documentUrl.href,
        languageId: languageName,
        version: 0,
        text
      }
    };

    const body = {
      jsonrpc: '2.0',
      method: Methods.didOpen,
      params
    };

    await this._sendNotificationAsync(JSON.stringify(body));
  }

  public async notifyDidChangeAsync(text: string, version: number): Promise<void> {
    const uri = await this._getDocumentUriAsync();
    const documentUrl = new URL(uri);
    documentUrl.searchParams.set('getTokensFlags', GetTokensFlags.UsedInExpression.toString());
    const params: DidChangeTextDocumentParams = {
      textDocument: {
        uri: documentUrl.href,
        version
      },
      contentChanges: [{ text }]
    };

    const body = {
      jsonrpc: '2.0',
      method: Methods.didChange,
      params
    };

    await this._sendNotificationAsync(JSON.stringify(body));
  }

  public async requestProvideCompletionItemsAsync(
    currentText: string,
    line: number, // starts at 0
    character: number, // starts at 0
    triggerKind: CompletionTriggerKind,
    triggerCharacter?: string
  ): Promise<CompletionList> {
    const uri = await this._getDocumentUriAsync();
    const documentUrl = new URL(uri);
    documentUrl.searchParams.set('expression', currentText);

    const params: CompletionParams = {
      textDocument: {
        uri: documentUrl.href
      },
      position: {
        line,
        character
      },
      context: {
        triggerKind,
        triggerCharacter
      }
    };

    const body = {
      jsonrpc: '2.0',
      id: uuid(),
      method: Methods.completion,
      params
    };

    const result = await this._sendRequestAsync(body.id, JSON.stringify(body));

    const noSuggestions: CompletionList = { isIncomplete: false, items: [] };
    if (!result.success || !result.response) {
      return noSuggestions;
    }

    const responseObject = JSON.parse(result.response);
    if (!responseObject || !responseObject.result || !Array.isArray(responseObject.result.items)) {
      return noSuggestions;
    }

    return responseObject.result;
  }

  public async requestInitialFixupAsync(text: string): Promise<string> {
    const uri = await this._getDocumentUriAsync();
    const params: InitialFixupParams = {
      textDocument: {
        uri,
        languageId: languageName,
        version: 0,
        text
      }
    };

    const body = {
      jsonrpc: '2.0',
      id: uuid(),
      method: Methods.initialFixup,
      params
    };

    const result = await this._sendRequestAsync(body.id, JSON.stringify(body));

    if (!result.success || !result.response) {
      return text;
    }

    const responseObject = JSON.parse(result.response);
    if (!responseObject || !responseObject.result || typeof responseObject.result.text !== 'string') {
      return text;
    }

    return responseObject.result.text;
  }

  public async requestProvideSignatureHelpAsync(
    currentText: string,
    line: number, // starts at 0
    character: number // starts at 0
  ): Promise<SignatureHelp> {
    const uri = await this._getDocumentUriAsync();
    const documentUrl = new URL(uri);
    documentUrl.searchParams.set('expression', currentText);

    const params: SignatureHelpParams = {
      textDocument: {
        uri: documentUrl.href
      },
      position: {
        line,
        character
      }
    };

    const body = {
      jsonrpc: '2.0',
      id: uuid(),
      method: Methods.signatureHelp,
      params
    };

    const result = await this._sendRequestAsync(body.id, JSON.stringify(body));

    const noSignatureHelp: SignatureHelp = { signatures: [], activeSignature: null, activeParameter: null };
    if (!result.success || !result.response) {
      return noSignatureHelp;
    }

    const responseObject = JSON.parse(result.response);
    if (!responseObject || !responseObject.result || !Array.isArray(responseObject.result.signatures)) {
      return noSignatureHelp;
    }

    return responseObject.result;
  }

  public onDataReceivedFromLanguageServer(payload: string): void {
    try {
      const payloadObject = JSON.parse(payload);
      const responseArray = Array.isArray(payloadObject) ? payloadObject : [payload];

      responseArray.forEach(responsePayload => {
        const response = JSON.parse(responsePayload);

        // Handle publishDiagnostics notification
        if (response.method === Methods.publishDiagnostics) {
          this._handleDiagnosticsNotification(response.params);
          return;
        }

        // Handle publishTokens notification
        if (response.method === Methods.publishTokens) {
          this._handleTokensNotification(response.params);
          return;
        }

        // Handle response with id
        if (response.id) {
          this._pendingPromises.forEach(item => {
            if (item.id === response.id) {
              item.resolve(JSON.stringify(response));
            }
          });
        }
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(error);
    }
  }

  private _sendNotificationAsync = async (payload: string): Promise<void> => {
    return this._sendToLanguageServerAsync(payload);
  };

  private _sendRequestAsync = async (id: string, payload: string): Promise<SendRequestResult> => {
    const result: SendRequestResult = { success: false };

    let receiveMessageResolve: (value?: string) => void;
    const initializePromise = new Promise<string | undefined>(resolve => {
      receiveMessageResolve = resolve;

      this._pendingPromises.push({
        id,
        resolve: receiveMessageResolve
      });
    });

    try {
      await this._sendToLanguageServerAsync(payload);

      let timeout: boolean = false;
      const waitTimeout = setTimeout(() => {
        timeout = true;
        receiveMessageResolve();
      }, ApiTimeoutInMilliseconds);

      result.response = await initializePromise;
      clearTimeout(waitTimeout);

      result.success = !timeout;
    } finally {
      // cleanup id from _pendingPromises
      const index = this._pendingPromises.findIndex(item => item.id === id);
      if (index !== -1) {
        this._pendingPromises.splice(index, 1);
      }
    }

    return result;
  };
}
