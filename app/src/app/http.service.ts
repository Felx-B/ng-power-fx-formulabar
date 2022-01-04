import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class HttpService {

  constructor() { }

  private getServerUrl() {
    // dev mode use dev server
    if (window.location.hostname === 'localhost') {
      return 'https://localhost:5001/';
    };

    return `${window.location.origin}${window.location.pathname}`;
  }

  public async sendDataAsync(endpoint: string, data: string): Promise<Response> {
    const url = this.getServerUrl();
    return await fetch(url + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data
    });
  }


}
