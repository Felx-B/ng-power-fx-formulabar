import { DiagnosticSeverity } from "vscode-languageserver-protocol";

export const getMarkerSeverity = (severity?: DiagnosticSeverity): monaco.MarkerSeverity => {
  switch (severity) {
    case DiagnosticSeverity.Error:
      return monaco.MarkerSeverity.Error;
    case DiagnosticSeverity.Hint:
      return monaco.MarkerSeverity.Hint;
    case DiagnosticSeverity.Information:
      return monaco.MarkerSeverity.Info;
    case DiagnosticSeverity.Warning:
      return monaco.MarkerSeverity.Warning;
    default:
      return monaco.MarkerSeverity.Error;
  }
};
