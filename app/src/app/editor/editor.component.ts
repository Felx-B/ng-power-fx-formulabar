import {
  EventEmitter,
  ChangeDetectorRef,
  Component,
  Output,
  Input,
  forwardRef,
  OnDestroy,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  NuMonacoEditorEvent,
  NuMonacoEditorModel,
} from '@ng-util/monaco-editor';

import {
  Diagnostic,
  PublishDiagnosticsParams,
} from 'vscode-languageserver-protocol';
import { HttpService } from '../http.service';
import {
  getCompletionKind,
  getCompletionTriggerKind,
} from '../PowerFx/PowerFxCompletion';
import { getMarkerSeverity } from '../PowerFx/PowerFxDiagnostic';
import { defaultEditorOptions } from '../PowerFx/PowerFxEditor';
import {
  PowerFxLanguageClient,
  PublishTokensParams,
  TokenResultType,
} from '../PowerFx/PowerFxLanguageClient';
import {
  addProvidersForModel,
  ensureLanguageRegistered,
} from '../PowerFx/PowerFxSyntax';
import { HighlightedName, NameKind } from '../PowerFx/PowerFxSyntaxTypes';
import { ensureThemeSetup } from '../PowerFx/PowerFxTheme';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PowerFxEditorComponent),
      multi: true,
    },
  ],
})
export class PowerFxEditorComponent implements ControlValueAccessor, OnDestroy {
  public editorOptions = defaultEditorOptions;
  public model?: NuMonacoEditorModel;
  private modelMonaco?: monaco.editor.ITextModel | null;
  private monacoEditor?: monaco.editor.IStandaloneCodeEditor;
  private languageClient?: PowerFxLanguageClient;
  private normalizedCompletionLookup: { [lowercase: string]: string } = {};
  private version: number = 0;
  private onNamesChanged: (names: HighlightedName[]) => void = () => null;
  private providers?: monaco.IDisposable;

  @Input()
  public context: string = '';

  constructor(private http: HttpService, private cdr: ChangeDetectorRef) {}

  ngOnDestroy(): void {
    this.providers?.dispose();
    this.modelMonaco?.dispose();
    this.monacoEditor?.dispose();
  }

  private value: string = '';

  public get myValue(): string {
    return this.modelMonaco?.getValue() || this.value;
  }
  public set myValue(v: string) {
    this.value = v;
    const value = this.modelMonaco?.getValue();
    if (v !== value) {
      this.modelMonaco?.setValue(v);
      this.onChange(v);
    }
  }

  onChange = (_: any) => {};
  onTouched = () => {};

  writeValue(value: any): void {
    this.myValue = value;
  }
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
  setDisabledState?(isDisabled: boolean): void {
    this.monacoEditor?.updateOptions({ readOnly: isDisabled });
    throw new Error('Method not implemented.');
  }

  private getDocumentUriAsync = async () =>
    `powerfx://demo?context=${this.context}`;

  showEvent(e: NuMonacoEditorEvent) {
    if (e.type === 'init') {
      this.monacoEditor = e.editor as monaco.editor.IStandaloneCodeEditor;
      this.onMonacoInit();
    }
  }

  private onMonacoInit() {
    const modelUri = monaco.Uri.parse('powerfx://demo');

    this.model = {
      language: 'powerfx',
      uri: modelUri,
    };

    this.cdr.detectChanges();

    const model = monaco.editor.getModel(modelUri);
    this.modelMonaco = model;
    if (!this.modelMonaco) return;

    ensureThemeSetup(monaco);
    ensureLanguageRegistered(monaco, {
      useSemicolons: false,
      highlightedNames: [],
      subscribeToNames: (namesChanged) => {
        this.onNamesChanged = namesChanged;
      },
      getNormalizedCompletionLookup: () => this.normalizedCompletionLookup,
    });

    this.languageClient = new PowerFxLanguageClient(
      this.getDocumentUriAsync,
      this.sendToLanguageServerAsync,
      this.handleDiagnosticsNotification,
      this.handleTokensNotification
    );

    this.providers = addProvidersForModel(
      this.modelMonaco,
      this.provideCompletionItemsAsync,
      this.provideSignatureHelpAsync
    );

    this.languageClient.notifyDidOpenAsync(this.modelMonaco.getValue());

    this.modelMonaco.onDidChangeContent((e) => {
      const value = this.modelMonaco?.getValue();
      this.onChange(value);
      this.languageClient?.notifyDidChangeAsync(value || '', this.version++);
    });
  }

  private sendToLanguageServerAsync = async (payload: string) => {
    await this.sendAsync(payload);
  };

  private handleTokensNotification = (params: PublishTokensParams) => {
    if (!monaco || !this.modelMonaco) {
      return;
    }

    const names: HighlightedName[] = [];
    for (const [key, value] of Object.entries(params.tokens)) {
      this.normalizedCompletionLookup[key.toLowerCase()] = key;
      switch (value) {
        case TokenResultType.Function:
          names.push({ name: key, kind: NameKind.Function });
          break;

        case TokenResultType.Variable:
          names.push({ name: key, kind: NameKind.Variable });
          break;

        case TokenResultType.HostSymbol:
          names.push({ name: key, kind: NameKind.HostSymbol });
          break;

        default:
          break;
      }
    }

    this.onNamesChanged?.(names);
  };

  private handleDiagnosticsNotification = (
    params: PublishDiagnosticsParams
  ) => {
    if (!monaco || !this.modelMonaco) {
      return;
    }

    const markers = params.diagnostics.map((error: Diagnostic) => {
      const { start, end } = error.range;
      return {
        severity: getMarkerSeverity(error.severity),
        message: error.message,
        startLineNumber: start.line,
        startColumn: start.character,
        endLineNumber: end.line,
        endColumn: end.character + 1, // end character is included
      };
    });

    monaco.editor.setModelMarkers(this.modelMonaco, '', markers);
  };

  private async sendAsync(data: string) {
    try {
      const result = await this.http.sendDataAsync('lsp', data);
      if (!result.ok) {
        return;
      }

      const response = await result.text();
      if (response) {
        const responseArray = JSON.parse(response);
        responseArray.forEach((item: string) => {
          this.languageClient?.onDataReceivedFromLanguageServer(item);
        });
      }
    } catch (err) {
      console.log(err);
    }
  }

  private provideCompletionItemsAsync = async (
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    context: monaco.languages.CompletionContext
  ) => {
    const currentText = model.getValue();
    const currentWordPosition = model.getWordAtPosition(position);
    const triggerKind = context.triggerKind;
    const triggerCharacter = context.triggerCharacter;

    const result =
      await this.languageClient?.requestProvideCompletionItemsAsync(
        currentText,
        position.lineNumber - 1,
        position.column - 1,
        getCompletionTriggerKind(triggerKind),
        triggerCharacter
      );

    if (!result) {
      return { suggestions: [] };
    }

    const range = currentWordPosition
      ? {
          startColumn: currentWordPosition.startColumn,
          endColumn: currentWordPosition.endColumn,
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
        }
      : {
          startColumn: position.column,
          endColumn: position.column,
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
        };

    const suggestions: monaco.languages.CompletionItem[] = result.items.map(
      (item) => {
        const label = item.label;
        this.normalizedCompletionLookup[label.toLowerCase()] = label;
        return {
          label,
          documentation: item.documentation,
          detail: item.detail,
          kind: getCompletionKind(item.kind),
          range,
          insertText: item.label,
        };
      }
    );

    return {
      incomplete: !currentWordPosition,
      suggestions,
    };
  };

  private provideSignatureHelpAsync = async (
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    token: monaco.CancellationToken,
    context: monaco.languages.SignatureHelpContext
  ): Promise<monaco.languages.SignatureHelpResult> => {
    const currentText = model.getValue();

    const noResult: monaco.languages.SignatureHelpResult = {
      value: {
        signatures: [],
        activeSignature: 0,
        activeParameter: 0,
      },
      dispose: () => {
        return;
      },
    };

    const result = await this.languageClient?.requestProvideSignatureHelpAsync(
      currentText,
      position.lineNumber - 1,
      position.column - 1
    );

    if (!result || result.signatures.length === 0) {
      return noResult;
    }

    return {
      value: {
        signatures: result.signatures.map((item) => ({
          label: item.label,
          documentation: item.documentation,
          parameters: item.parameters || [],
          activeParameter: item.activeParameter,
        })),
        activeSignature: result.activeSignature || 0,
        activeParameter: result.activeParameter || 0,
      },
      dispose: () => {
        return;
      },
    };
  };
}
