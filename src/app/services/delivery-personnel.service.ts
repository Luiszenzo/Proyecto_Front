import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DeliveryPersonnelService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  getDeliveryPersonnel(): Observable<any> {
    return this.http.get(`${this.apiUrl}/deliveries`);
  }

  getDeliveryPersonById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/deliveries/${id}`);
  }

  updateDeliveryPersonStatus(id: number, isAvailable: boolean): Observable<any> {
    return this.http.put(`${this.apiUrl}/deliveries/${id}/status`, { is_available: isAvailable });
  }

  // Añade este método al DeliveryPersonnelService
  getDeliveryPersonnelForMap() {
    return this.http.get(`${this.apiUrl}/deliveries/map`);
  }
}