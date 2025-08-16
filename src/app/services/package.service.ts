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

  // Update this method to use the correct endpoint
  getDeliveryLocations(): Observable<any> {
    return this.http.get(`${this.apiUrl}/deliveries/locations`);
  }
  
  /**
   * Updates the delivery person's location in the database
   * @param deliveryPersonId The ID of the delivery person
   * @param latitude Latitude coordinate
   * @param longitude Longitude coordinate
   * @param isAvailable Availability status of the delivery person
   */
  updateDeliveryLocation(deliveryPersonId: any, latitude: number, longitude: number, isAvailable: boolean): Observable<any> {
    // Make sure we're using the correct ID format
    const id = typeof deliveryPersonId === 'object' ? deliveryPersonId.id : deliveryPersonId;
    
    console.log(`Sending location update for delivery person ID: ${id}, lat: ${latitude}, lng: ${longitude}`);
    console.trace('Call stack for updateDeliveryLocation:');
    
    // Use the delivery person's ID in the URL
    const url = `${this.apiUrl}/deliveries/${id}/location`;
    console.log('Request URL from updateDeliveryLocation:', url);
    
    // Simplify the payload to match exactly what the backend expects
    const payload = {
      latitude,
      longitude,
      isAvailable
    };
    console.log('Request payload from updateDeliveryLocation:', payload);
    
    // Make the POST request with the correct URL and payload
    return this.http.post(url, payload);
  }
  
  /**
   * Updates the delivery person's initial location when logging in
   * @param deliveryPersonId The ID of the delivery person
   * @param latitude Latitude coordinate
   * @param longitude Longitude coordinate
   */
  updateInitialLocation(deliveryPersonId: any, latitude: number, longitude: number): Observable<any> {
    // Make sure we're using the correct ID format
    const id = typeof deliveryPersonId === 'object' ? deliveryPersonId.id : deliveryPersonId;
    
    console.log(`Sending initial location for ID: ${id}, lat: ${latitude}, lng: ${longitude}`);
    
    // Check if we're using the correct URL format
    const url = `${this.apiUrl}/deliveries/${id}/location`;
    console.log('Request URL:', url);
    
    return this.http.post(url, {
      latitude,
      longitude,
      isAvailable: true // Por defecto, el repartidor está disponible al iniciar sesión
    });
  }
  
  // Add this method to your PackageService
  // Modify this method to get all delivery persons with their locations
  getDeliveryMapLocations(): Observable<any[]> {
    console.log('Fetching delivery map locations from:', `${this.apiUrl}/deliveries/map`);
    return this.http.get<any[]>(`${this.apiUrl}/deliveries/map`);
  }
}