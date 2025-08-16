import { Component, OnInit, AfterViewInit, Inject, PLATFORM_ID, OnDestroy, Input, OnChanges, SimpleChanges } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PackageService } from '../../services/package.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-map',
  standalone: true,
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @Input() selectedDeliveryPerson: any = null; // Add this input property
  
  private map: any;
  private deliveryPersons: any[] = [];
  private deliveryMarkers: Map<number, any> = new Map(); // Store markers by delivery person ID
  private packages: any[] = [];
  private userLocationMarker: any; // Marker for user's current location
  private locationUpdateSubscription: Subscription | null = null;
  
  // Coordenadas exactas de la Universidad Tecnológica de Querétaro (UTEQ)
  private readonly UTEQ_LAT = 20.65636;
  private readonly UTEQ_LNG = -100.40507;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private packageService: PackageService
  ) { }

  ngOnInit(): void {
    this.loadData();
    
    // Start real-time location updates
    if (isPlatformBrowser(this.platformId)) {
      this.startLocationUpdates();
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initMap();
    }
  }
  
  ngOnDestroy(): void {
    // Stop location updates when component is destroyed
    if (this.locationUpdateSubscription) {
      this.locationUpdateSubscription.unsubscribe();
    }
  }

  private startLocationUpdates(): void {
    // Update delivery locations more frequently (every 3 seconds)
    this.locationUpdateSubscription = interval(3000).subscribe(() => {
      this.updateDeliveryLocations();
    });
  }
  
  private updateDeliveryLocations(): void {
    // Update to use the new API endpoint
    this.packageService.getDeliveryMapLocations().subscribe({
      next: (deliveryPersons) => {
        console.log('Delivery map locations received:', deliveryPersons);
        
        // Check if we received any locations
        if (!deliveryPersons || deliveryPersons.length === 0) {
          console.warn('No delivery locations received from API');
          return;
        }
        
        // Log each delivery person's location for debugging
        deliveryPersons.forEach((person: any) => {
          console.log(`Delivery person ${person.name} (ID: ${person.id}):`, 
            person.latitude, person.longitude);
            
          // Update marker for this delivery person if they have valid coordinates
          if (person.latitude && person.longitude) {
            this.updateDeliveryMarker(person);
          }
        });
      },
      error: (error) => {
        console.error('Error fetching delivery map locations:', error);
      }
    });
  }
  
  // Modify the updateDeliveryMarker method to use the new data structure
  private updateDeliveryMarker(person: any): void {
    if (!this.map) return;
    
    const deliveryId = person.id;
    const lat = person.latitude;
    const lng = person.longitude;
    const status = person.status || 'busy'; // Default to busy if status is not provided
    
    // If we already have a marker for this delivery person, update its position
    if (this.deliveryMarkers.has(deliveryId)) {
      const marker = this.deliveryMarkers.get(deliveryId);
      
      // Update marker position with real coordinates
      marker.setLatLng([lat, lng]);
      
      // Check if this is the selected delivery person
      const isSelected = this.selectedDeliveryPerson && this.selectedDeliveryPerson.id === deliveryId;
      
      // Update popup content with new location
      this.getLocationName(lat, lng).then(locationName => {
        marker.setPopupContent(`
          <div style="text-align: center;">
            <h4>🚗 ${person.name} ${isSelected ? '(Seleccionado)' : ''}</h4>
            <p><strong>Teléfono:</strong> ${person.phone || 'N/A'}</p>
            <p><strong>Estado:</strong> <span style="color: ${status === 'available' ? 'green' : 'red'}">
              ${status === 'available' ? 'Disponible' : 'Ocupado'}
            </span></p>
            <p><strong>Zona:</strong> ${locationName}</p>
            <p><strong>Coordenadas:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
            <p><strong>Actualizado:</strong> ${person.last_update ? new Date(person.last_update).toLocaleTimeString() : new Date().toLocaleTimeString()}</p>
            <p><strong>Paquetes:</strong> ${person.packages?.length || 0}</p>
          </div>
        `);
      });
      
      // If this is the selected delivery person, focus on them
      if (isSelected) {
        this.map.setView([lat, lng], 16);
        marker.openPopup();
      }
      
      console.log(`Marcador de ${person.name} actualizado a: ${lat}, ${lng}`);
    } else {
      console.warn(`No se encontró marcador para el repartidor ID: ${deliveryId}`);
      // If marker doesn't exist yet, refresh the entire map
      this.addDeliveryPersonsToMap();
    }
  }

  private loadData(): void {
    // Cargar repartidores
    this.packageService.getDeliveries().subscribe({
      next: (deliveries) => {
        this.deliveryPersons = deliveries;
        console.log('Repartidores cargados:', this.deliveryPersons);
        if (this.map) {
          this.addDeliveryPersonsToMap();
        }
      },
      error: (error) => {
        console.error('Error cargando repartidores:', error);
      }
    });

    // Cargar paquetes
    this.packageService.getPackages().subscribe({
      next: (packages) => {
        this.packages = packages;
        console.log('Paquetes cargados:', this.packages);
        if (this.map) {
          this.addPackagesToMap();
        }
      },
      error: (error) => {
        console.error('Error cargando paquetes:', error);
      }
    });
    
    // Get initial delivery locations
    this.updateDeliveryLocations();
  }

  private async initMap(): Promise<void> {
    // Importar Leaflet dinámicamente solo en el navegador
    const L = await import('leaflet');
    
    // Configurar los iconos por defecto de Leaflet
    const iconRetinaUrl = 'assets/marker-icon-2x.png';
    const iconUrl = 'assets/marker-icon.png';
    const shadowUrl = 'assets/marker-shadow.png';
    const iconDefault = L.icon({
      iconRetinaUrl,
      iconUrl,
      shadowUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41]
    });
    L.Marker.prototype.options.icon = iconDefault;

    // Inicializar el mapa centrado en las coordenadas exactas de la UTEQ
    this.map = L.map('map').setView([this.UTEQ_LAT, this.UTEQ_LNG], 15); // Aumenté el zoom a 15 para mejor detalle

    // Agregar capa de tiles (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // Agregar marcador exacto de la Universidad Tecnológica de Querétaro
    L.marker([this.UTEQ_LAT, this.UTEQ_LNG])
      .addTo(this.map)
      .bindPopup(`
        <div style="text-align: center;">
          <h4>🎓 Universidad Tecnológica de Querétaro (UTEQ)</h4>
          <p><strong>Coordenadas exactas:</strong></p>
          <p>Lat: ${this.UTEQ_LAT}° N</p>
          <p>Lng: ${this.UTEQ_LNG}° O</p>
        </div>
      `)
      .openPopup();

    // Obtener ubicación actual del usuario
    this.getUserLocation();

    // Agregar repartidores y paquetes si ya están cargados
    if (this.deliveryPersons.length > 0) {
      this.addDeliveryPersonsToMap();
    }
    if (this.packages.length > 0) {
      this.addPackagesToMap();
    }
  }

  private async addDeliveryPersonsToMap(): Promise<void> {
    if (!this.map) return;

    const L = await import('leaflet');

    // Crear icono personalizado para los repartidores usando delivery.jpg
    const carIcon = L.icon({
      iconUrl: '/delivery.jpg', 
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20]
    });

    // Clear existing markers
    this.deliveryMarkers.forEach(marker => {
      this.map.removeLayer(marker);
    });
    this.deliveryMarkers.clear();

    // Get delivery persons from the new API endpoint
    this.packageService.getDeliveryMapLocations().subscribe({
      next: (deliveryPersons) => {
        if (!deliveryPersons || deliveryPersons.length === 0) {
          console.warn('No se recibieron ubicaciones para los repartidores');
          return; // Exit early if no locations are available
        }
        
        console.log('Agregando repartidores al mapa:', deliveryPersons);
        
        // Add each delivery person to the map
        deliveryPersons.forEach((person: any) => {
          // Only add markers for delivery persons with location data
          if (person.latitude && person.longitude) {
            const lat = parseFloat(person.latitude);
            const lng = parseFloat(person.longitude);
            
            // Skip if coordinates are invalid
            if (isNaN(lat) || isNaN(lng)) {
              console.warn(`Coordenadas inválidas para ${person.name}: ${person.latitude}, ${person.longitude}`);
              return;
            }
            
            const status = person.status || 'busy'; // Default to busy if status is not provided
            console.log(`Usando ubicación para ${person.name}:`, lat, lng);
            
            // Create marker with the location data
            const marker = L.marker([lat, lng], { icon: carIcon })
              .addTo(this.map)
              .bindPopup(`
                <div style="text-align: center;">
                  <h4>🚗 ${person.name}</h4>
                  <p><strong>Teléfono:</strong> ${person.phone || 'N/A'}</p>
                  <p><strong>Estado:</strong> <span style="color: ${status === 'available' ? 'green' : 'red'}">
                    ${status === 'available' ? 'Disponible' : 'Ocupado'}
                  </span></p>
                  <p><strong>Coordenadas:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
                  <p><strong>Actualizado:</strong> ${person.last_update ? new Date(person.last_update).toLocaleTimeString() : new Date().toLocaleTimeString()}</p>
                  <p><strong>Paquetes:</strong> ${person.packages?.length || 0}</p>
                </div>
              `);
            
            // Store marker reference for future updates
            this.deliveryMarkers.set(person.id, marker);
            
            // If this is the selected delivery person, focus on them
            if (this.selectedDeliveryPerson && this.selectedDeliveryPerson.id === person.id) {
              this.map.setView([lat, lng], 16);
              marker.openPopup();
            }
            
            // Update popup with location name
            this.getLocationName(lat, lng).then(locationName => {
              marker.setPopupContent(`
                <div style="text-align: center;">
                  <h4>🚗 ${person.name}</h4>
                  <p><strong>Teléfono:</strong> ${person.phone || 'N/A'}</p>
                  <p><strong>Estado:</strong> <span style="color: ${status === 'available' ? 'green' : 'red'}">
                    ${status === 'available' ? 'Disponible' : 'Ocupado'}
                  </span></p>
                  <p><strong>Zona:</strong> ${locationName}</p>
                  <p><strong>Coordenadas:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
                  <p><strong>Actualizado:</strong> ${person.last_update ? new Date(person.last_update).toLocaleTimeString() : new Date().toLocaleTimeString()}</p>
                  <p><strong>Paquetes:</strong> ${person.packages?.length || 0}</p>
                </div>
              `);
            });
          } else {
            console.warn(`No se encontró ubicación para ${person.name}, no se mostrará en el mapa`);
          }
        });
      },
      error: (error) => {
        console.error('Error obteniendo ubicaciones de repartidores:', error);
      }
    });
  }

  // Método para obtener el nombre de la ubicación mediante geocodificación inversa
  // Add this method if it doesn't exist
  private async getLocationName(lat: number, lng: number): Promise<string> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      return data.display_name || 'Ubicación desconocida';
    } catch (error) {
      console.error('Error obteniendo nombre de ubicación:', error);
      return 'Ubicación desconocida';
    }
  }

  private async addPackagesToMap(): Promise<void> {
    if (!this.map) return;

    const L = await import('leaflet');

    // Crear icono para paquetes
    const packageIcon = L.icon({
      iconUrl: 'assets/marker-icon.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowUrl: 'assets/marker-shadow.png',
      shadowSize: [41, 41]
    });

    // Agregar cada paquete al mapa cerca de la UTEQ
    this.packages.forEach(pkg => {
      // Generar posición aleatoria para el paquete cerca de la UTEQ
      const randomLat = this.UTEQ_LAT + (Math.random() - 0.5) * 0.05; // Radio más amplio para paquetes
      const randomLng = this.UTEQ_LNG + (Math.random() - 0.5) * 0.05;

      // Determinar color del marcador según el estado
      let statusColor = '#007bff'; // azul por defecto
      switch(pkg.status) {
        case 'pending': statusColor = '#ffc107'; break; // amarillo
        case 'in_transit': statusColor = '#17a2b8'; break; // azul claro
        case 'delivered': statusColor = '#28a745'; break; // verde
        case 'cancelled': statusColor = '#dc3545'; break; // rojo
      }

      L.marker([randomLat, randomLng], { icon: packageIcon })
        .addTo(this.map)
        .bindPopup(`
          <div style="text-align: center;">
            <h4>📦 Paquete #${pkg.id}</h4>
            <p><strong>Destinatario:</strong> ${pkg.recipient}</p>
            <p><strong>Dirección:</strong> ${pkg.address}</p>
            <p><strong>Repartidor:</strong> ${pkg.delivery_person_name || 'No asignado'}</p>
            <p><strong>Estado:</strong> <span style="color: ${statusColor}; font-weight: bold;">${pkg.status}</span></p>
            <p><strong>Zona:</strong> Querétaro</p>
            <p><strong>Fecha:</strong> ${new Date(pkg.created_at).toLocaleDateString()}</p>
          </div>
        `);
    });
  }

  // Método público para recargar datos (puede ser llamado desde el componente padre)
  // Update the refreshMapData method to ensure it updates locations
  public refreshMapData(): void {
    this.loadData();
    this.updateDeliveryLocations(); // Explicitly update locations
    
    // If there's a selected delivery person, focus on them
    if (this.selectedDeliveryPerson) {
      this.focusOnSelectedDeliveryPerson();
    }
  }

  // Método para obtener la ubicación actual del usuario
  private getUserLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          console.log('Ubicación del usuario:', latitude, longitude);
          
          // Centrar el mapa en la ubicación del usuario
          this.map.setView([latitude, longitude], 15);
          
          // Agregar marcador para la ubicación del usuario
          await this.addUserLocationMarker(latitude, longitude);
          
          // Iniciar seguimiento continuo de la ubicación
          this.watchUserLocation();
        },
        (error) => {
          console.error('Error obteniendo ubicación:', error);
          alert('No se pudo obtener tu ubicación. Por favor, verifica los permisos de ubicación en tu navegador.');
        }
      );
    } else {
      console.error('Geolocalización no soportada por este navegador');
      alert('Tu navegador no soporta geolocalización');
    }
  }

  // Método para agregar el marcador de ubicación del usuario
  private async addUserLocationMarker(latitude: number, longitude: number): Promise<void> {
    if (!this.map) return;
    
    const L = await import('leaflet');
    
    // Crear icono personalizado para la ubicación del usuario
    const userIcon = L.icon({
      iconUrl: 'assets/user-location.png', // Asegúrate de tener este icono en tu carpeta assets
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -15]
    });
    
    // Si ya existe un marcador, actualizarlo; si no, crear uno nuevo
    if (this.userLocationMarker) {
      this.userLocationMarker.setLatLng([latitude, longitude]);
    } else {
      this.userLocationMarker = L.marker([latitude, longitude], { icon: userIcon })
        .addTo(this.map)
        .bindPopup(`
          <div style="text-align: center;">
            <h4>📍 Tu ubicación actual</h4>
            <p><strong>Coordenadas:</strong></p>
            <p>Lat: ${latitude.toFixed(5)}° N</p>
            <p>Lng: ${longitude.toFixed(5)}° O</p>
          </div>
        `);
    }
    
    // Agregar un círculo para mostrar la precisión aproximada
    L.circle([latitude, longitude], {
      color: 'blue',
      fillColor: '#3388ff',
      fillOpacity: 0.2,
      radius: 100 // Radio en metros
    }).addTo(this.map);
  }

  // Método para seguimiento continuo de la ubicación
  private watchUserLocation(): void {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          // Actualizar el marcador con la nueva posición
          await this.addUserLocationMarker(latitude, longitude);
        },
        (error) => {
          console.error('Error en seguimiento de ubicación:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // When selectedDeliveryPerson changes, focus the map on that delivery person
    if (changes['selectedDeliveryPerson'] && this.map) {
      this.focusOnSelectedDeliveryPerson();
    }
  }

  // Add this method to focus on the selected delivery person
  private focusOnSelectedDeliveryPerson(): void {
    if (!this.selectedDeliveryPerson || !this.map) return;
    
    const deliveryId = this.selectedDeliveryPerson.id;
    
    // Check if we have a marker for this delivery person
    if (this.deliveryMarkers.has(deliveryId)) {
      const marker = this.deliveryMarkers.get(deliveryId);
      const position = marker.getLatLng();
      
      // Center the map on the delivery person's position and zoom in
      this.map.setView([position.lat, position.lng], 16);
      
      // Open the popup for this marker
      marker.openPopup();
    } else {
      console.warn(`No marker found for delivery person ID: ${deliveryId}`);
    }
  }

  // Add this public method to focus on a specific delivery person
  /**
     * Focuses the map on a specific delivery person
     * @param deliveryPersonId The ID of the delivery person to focus on
     */
    public focusOnDeliveryPerson(deliveryPersonId: number): void {
      if (!this.map) {
        console.warn('Map not initialized');
        return;
      }
      
      // Find the marker for this delivery person
      const marker = this.deliveryMarkers.get(deliveryPersonId);
      if (marker) {
        // Get the position of the marker
        const position = marker.getLatLng();
        
        // Center the map on this position with a higher zoom level
        this.map.setView(position, 16);
        
        // Open the popup for this marker
        marker.openPopup();
        
        console.log(`Focused map on delivery person ID: ${deliveryPersonId}`);
      } else {
        console.warn(`No marker found for delivery person ID: ${deliveryPersonId}`);
        
        // Try to find the delivery person in the data
        this.packageService.getDeliveryMapLocations().subscribe({
          next: (deliveryPersons) => {
            const person = deliveryPersons.find(p => p.id === deliveryPersonId);
            if (person && person.latitude && person.longitude) {
              // If we found the person but don't have a marker, center the map on their coordinates
              this.map.setView([person.latitude, person.longitude], 16);
              console.log(`Centered map on delivery person coordinates: ${person.latitude}, ${person.longitude}`);
            }
          }
        });
      }
    }
  }