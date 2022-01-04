import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { EditorComponent } from './editor/editor.component';
import { NuMonacoEditorModule } from '@ng-util/monaco-editor';
import { FormsModule } from '@angular/forms';
// import { _getCompletionKind, _getMarkerSeverity } from './monaco/defaultEditor';

// import * as monaco from 'monaco-editor';

@NgModule({
  declarations: [
    AppComponent,
    EditorComponent
  ],
  imports: [
    BrowserModule,
    NuMonacoEditorModule.forRoot({
      baseUrl: `lib`,
      monacoLoad: (m: any) => {
      }
    }),
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }

