import { ChangeDetectorRef, Component } from '@angular/core';
import { HttpService } from './http.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  result = "";
  context = JSON.stringify({ "A": "ABC", "B": { "Inner": 123 } })
  expression = "";

  constructor(private http: HttpService, private cdr: ChangeDetectorRef){  }

  valueChanged(expression: any){
    this.expression = expression;
   this.evalAsync(this.context, expression);
  }

  contextChanged(){
    this.evalAsync(this.context, this.expression);
  }

  private async evalAsync (context: string, expression: string): Promise<void> {
    const result = await this.http.sendDataAsync('eval', JSON.stringify({ context, expression }));
    if (!result.ok) {
      return;
    }

    const response = await result.json();

    this.result = response.result || response.error || "";
    this.cdr.detectChanges();
  };
}
