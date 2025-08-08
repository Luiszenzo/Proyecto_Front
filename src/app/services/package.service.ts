import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PackageService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  // Obtener todos los paquetes
  getPackages(): Observable<any> {
    return this.http.get(`${this.apiUrl}/packages`);
  }

  // Crear nuevo paquete
  createPackage(packageData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/packages`, packageData);
  }

  // Obtener todos los repartidores
  getDeliveries(): Observable<any> {
    return this.http.get(`${this.apiUrl}/deliveries`);
  }

  // Actualizar estado del paquete
  updatePackageStatus(id: number, status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/packages/${id}/status`, { status });
  }

  // Eliminar paquete
  deletePackage(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/packages/${id}`);
  }

  // Add this method to your PackageService class
  
  /**
   * Updates the delivery person's location in the database
   * @param deliveryPersonId The ID of the delivery person
   * @param lat Latitude coordinate
   * @param lng Longitude coordinate
   * @param isAvailable Availability status of the delivery person
   */
  updateDeliveryLocation(deliveryPersonId: number, lat: number, lng: number, isAvailable: boolean): Observable<any> {
    return this.http.post(`${this.apiUrl}/delivery/location`, {
      delivery_person_id: deliveryPersonId,
      latitude: lat,
      longitude: lng,
      is_available: isAvailable,
      timestamp: new Date().toISOString()
    });
  }
}