import { Component, OnInit, AfterViewInit, Inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PackageService } from '../../services/package.service';
import { AuthService } from '../../services/auth.service';
import { interval, Subscription } from 'rxjs';

// Import PrimeNG modules
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { RippleModule } from 'primeng/ripple';

@Component({
  selector: 'app-delivery-view',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    // PrimeNG imports
    ToolbarModule,
    ButtonModule,
    CardModule,
    TagModule,
    RippleModule
  ],
  templateUrl: './delivery-view.component.html',
  styleUrls: ['./delivery-view.component.css']
})
export class DeliveryViewComponent implements OnInit, AfterViewInit, OnDestroy {
  private map: any;
  private deliveryPersonId: number = 0; // Cambiar de 1 a 0 inicialmente
  private currentMarker: any;
  private locationUpdateSubscription: Subscription | null = null;
  
  // Coordenadas exactas de la UTEQ
  private readonly UTEQ_LAT = 20.65636;
  private readonly UTEQ_LNG = -100.40507;
  
  // Estado del repartidor
  public deliveryPerson: any = {};
  public assignedPackages: any[] = [];
  public isAvailable: boolean = true;
  public currentLocation = { lat: this.UTEQ_LAT, lng: this.UTEQ_LNG };
  public isLocationSharing: boolean = true;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private packageService: PackageService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Suscribirse a cambios de usuario
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.deliveryPersonId = user.id;
        this.deliveryPerson = user;
        console.log('Usuario actualizado:', user);
        // Recargar paquetes asignados cuando cambie el usuario
        this.loadAssignedPackages();
        
        // Get real device location when user logs in
        this.getCurrentLocation();
      }
    });
    
    this.loadDeliveryPersonData();
    this.loadAssignedPackages();
    
    // Iniciar el intervalo de actualización de ubicación
    if (isPlatformBrowser(this.platformId)) {
      this.startLocationSharing();
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initMap();
    }
  }
  
  ngOnDestroy(): void {
    // Detener el intervalo de actualización de ubicación al destruir el componente
    this.stopLocationSharing();
  }

  // Iniciar compartición de ubicación
  private startLocationSharing(): void {
    if (isPlatformBrowser(this.platformId) && this.isLocationSharing) {
      // Detener cualquier suscripción existente
      this.stopLocationSharing();
      
      // Crear nueva suscripción que se ejecuta cada 10 segundos
      this.locationUpdateSubscription = interval(10000).subscribe(() => {
        if (this.isLocationSharing) {
          // Obtener ubicación actual y compartirla
          this.updateAndShareLocation();
        }
      });
      
      // Compartir ubicación inmediatamente al iniciar
      this.updateAndShareLocation();
      
      console.log('Compartición de ubicación iniciada');
    }
  }
  
  // Detener compartición de ubicación
  private stopLocationSharing(): void {
    if (this.locationUpdateSubscription) {
      this.locationUpdateSubscription.unsubscribe();
      this.locationUpdateSubscription = null;
      console.log('Compartición de ubicación detenida');
    }
  }
  
  // Método para obtener la ubicación actual del dispositivo
  private getCurrentLocation(): void {
    if (isPlatformBrowser(this.platformId) && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log('Ubicación real obtenida:', latitude, longitude);
          
          // Actualizar la ubicación actual
          this.currentLocation = { lat: latitude, lng: longitude };
          
          // Si el mapa ya está inicializado, actualizar la vista y el marcador
          if (this.map) {
            this.map.setView([latitude, longitude], 15);
            this.addDeliveryPersonMarker();
          }
          
          // Compartir la ubicación real con el servidor
          this.updateAndShareLocation();
        },
        (error) => {
          console.error('Error obteniendo ubicación real:', error);
          // Fallback a la ubicación por defecto (UTEQ)
          console.log('Usando ubicación por defecto (UTEQ)');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      console.log('Geolocalización no disponible o no estamos en el navegador');
    }
  }
  
  // Actualizar y compartir ubicación
  private updateAndShareLocation(): void {
    // Intentar obtener la ubicación actual si estamos compartiendo ubicación
    if (isPlatformBrowser(this.platformId) && navigator.geolocation && this.isLocationSharing) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          
          console.log('Nueva ubicación obtenida:', latitude, longitude);
          
          // Actualizar la ubicación actual
          this.currentLocation = { lat: latitude, lng: longitude };
          
          // Actualizar el marcador si el mapa está inicializado
          if (this.map && this.currentMarker) {
            this.addDeliveryPersonMarker();
          }
          
          // Enviar la ubicación actualizada al servidor
          this.sendLocationToServer(latitude, longitude);
        },
        (error) => {
          console.error('Error obteniendo ubicación en tiempo real:', error);
          // Usar la ubicación actual (que podría ser la última conocida o la predeterminada)
          this.sendLocationToServer(this.currentLocation.lat, this.currentLocation.lng);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      // Si no podemos obtener la ubicación real, usar la ubicación actual
      this.sendLocationToServer(this.currentLocation.lat, this.currentLocation.lng);
    }
  }

  // Método para enviar la ubicación al servidor
  // Añadir propiedad para controlar la notificación
  public showLocationUpdateNotification: boolean = false;
  public notificationMessage: string = '';
  
  private sendLocationToServer(latitude: number, longitude: number): void {
    if (!this.deliveryPersonId) {
      console.error('No hay ID de repartidor disponible');
      return;
    }
    
    console.log(`Enviando ubicación al servidor: ${latitude}, ${longitude} para repartidor ID: ${this.deliveryPersonId}`);
    
    this.packageService.updateDeliveryLocation(
      this.deliveryPersonId, 
      latitude, 
      longitude,
      this.isAvailable
    ).subscribe({
      next: (response) => {
        console.log('Ubicación compartida con éxito:', response);
        // Actualizar datos del usuario si es necesario
        if (response.user) {
          this.deliveryPerson = response.user;
        }
        
        // Mostrar notificación de actualización
        this.showNotification(`Ubicación actualizada: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      },
      error: (error) => {
        console.error('Error al compartir ubicación:', error);
        this.showNotification('Error al actualizar ubicación', true);
      }
    });
  }
  
  // Método para mostrar notificación
  private showNotification(message: string, isError: boolean = false): void {
    this.notificationMessage = message;
    this.showLocationUpdateNotification = true;
    
    // Cambiar el estilo según si es error o no
    const notificationElement = document.getElementById('location-notification');
    if (notificationElement) {
      if (isError) {
        notificationElement.classList.add('error-notification');
      } else {
        notificationElement.classList.remove('error-notification');
      }
    }
    
    // Ocultar la notificación después de 3 segundos
    setTimeout(() => {
      this.showLocationUpdateNotification = false;
    }, 3000);
  }
  
  // Toggle para activar/desactivar compartición de ubicación
  public toggleLocationSharing(): void {
    this.isLocationSharing = !this.isLocationSharing;
    
    if (this.isLocationSharing) {
      this.startLocationSharing();
    } else {
      this.stopLocationSharing();
    }
    
    console.log('Compartición de ubicación:', this.isLocationSharing ? 'Activada' : 'Desactivada');
  }

  private loadDeliveryPersonData(): void {
    // Si ya tenemos los datos del usuario autenticado, no necesitamos buscar
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.deliveryPerson = currentUser;
      this.deliveryPersonId = currentUser.id;
      console.log('Datos del repartidor desde AuthService:', this.deliveryPerson);
      return;
    }
    
    // Fallback: buscar en la lista de repartidores
    this.packageService.getDeliveries().subscribe({
      next: (deliveries) => {
        this.deliveryPerson = deliveries.find((d: any) => d.id === this.deliveryPersonId) || deliveries[0] || {};
        
        if (deliveries.length > 0 && !deliveries.find((d: any) => d.id === this.deliveryPersonId)) {
          this.deliveryPersonId = deliveries[0].id;
          this.deliveryPerson = deliveries[0];
        }
        
        console.log('Datos del repartidor:', this.deliveryPerson);
        console.log('ID del repartidor actual:', this.deliveryPersonId);
      },
      error: (error) => {
        console.error('Error cargando datos del repartidor:', error);
      }
    });
  }

  private loadAssignedPackages(): void {
    this.packageService.getPackages().subscribe({
      next: (packages) => {
        this.assignedPackages = packages.filter((pkg: any) => 
          pkg.delivery_person_id === this.deliveryPersonId
        );
        console.log('Paquetes asignados:', this.assignedPackages);
        if (this.map) {
          this.addPackagesToMap();
        }
      },
      error: (error) => {
        console.error('Error cargando paquetes asignados:', error);
      }
    });
  }

  private async initMap(): Promise<void> {
    const L = await import('leaflet');
    
    // Configurar iconos por defecto
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

    // Inicializar mapa centrado en la ubicación actual
    this.map = L.map('delivery-map').setView([this.currentLocation.lat, this.currentLocation.lng], 15);

    // Agregar capa de tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // Agregar marcador de la UTEQ
    L.marker([this.UTEQ_LAT, this.UTEQ_LNG])
      .addTo(this.map)
      .bindPopup('🎓 Universidad Tecnológica de Querétaro (UTEQ)');

    // Agregar marcador del repartidor
    this.addDeliveryPersonMarker();
    
    // Agregar paquetes si ya están cargados
    if (this.assignedPackages.length > 0) {
      this.addPackagesToMap();
    }
  }

  private async addDeliveryPersonMarker(): Promise<void> {
    if (!this.map) return;

    const L = await import('leaflet');

    // Crear icono del coche para el repartidor
    const carIcon = L.icon({
      iconUrl: '/coche.png',
      iconSize: [50, 50],
      iconAnchor: [25, 25],
      popupAnchor: [0, -25]
    });

    // Remover marcador anterior si existe
    if (this.currentMarker) {
      this.map.removeLayer(this.currentMarker);
    }

    // Agregar nuevo marcador
    this.currentMarker = L.marker([this.currentLocation.lat, this.currentLocation.lng], { icon: carIcon })
      .addTo(this.map)
      .bindPopup(`
        <div style="text-align: center;">
          <h4>🚗 ${this.deliveryPerson.name || 'Mi Ubicación'}</h4>
          <p><strong>Estado:</strong> <span style="color: ${this.isAvailable ? 'green' : 'red'}">
            ${this.isAvailable ? 'Disponible' : 'Ocupado'}
          </span></p>
          <p><strong>Paquetes asignados:</strong> ${this.assignedPackages.length}</p>
          <p><strong>Ubicación:</strong> ${this.currentLocation.lat.toFixed(4)}, ${this.currentLocation.lng.toFixed(4)}</p>
        </div>
      `);
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

    // Agregar cada paquete asignado
    this.assignedPackages.forEach(pkg => {
      // Generar posición aleatoria cerca de la UTEQ para cada paquete
      const randomLat = this.UTEQ_LAT + (Math.random() - 0.5) * 0.02;
      const randomLng = this.UTEQ_LNG + (Math.random() - 0.5) * 0.02;

      let statusColor = '#007bff';
      switch(pkg.status) {
        case 'pending': statusColor = '#ffc107'; break;
        case 'in_transit': statusColor = '#17a2b8'; break;
        case 'delivered': statusColor = '#28a745'; break;
        case 'cancelled': statusColor = '#dc3545'; break;
      }

      const marker = L.marker([randomLat, randomLng], { icon: packageIcon })
        .addTo(this.map)
        .bindPopup(`
          <div style="text-align: center;">
            <h4>📦 Paquete #${pkg.id}</h4>
            <p><strong>Destinatario:</strong> ${pkg.recipient}</p>
            <p><strong>Dirección:</strong> ${pkg.address}</p>
            <p><strong>Estado:</strong> <span style="color: ${statusColor}; font-weight: bold;">${pkg.status}</span></p>
            <button onclick="updatePackageStatus(${pkg.id}, 'in_transit')" style="margin: 2px; padding: 5px; background: #17a2b8; color: white; border: none; border-radius: 3px;">En Tránsito</button>
            <button onclick="updatePackageStatus(${pkg.id}, 'delivered')" style="margin: 2px; padding: 5px; background: #28a745; color: white; border: none; border-radius: 3px;">Entregado</button>
          </div>
        `);
    });
  }

  // Cambiar estado de disponibilidad
  public toggleAvailability(): void {
    this.isAvailable = !this.isAvailable;
    if (this.currentMarker) {
      this.addDeliveryPersonMarker(); // Actualizar marcador
    }
    
    // Compartir el nuevo estado inmediatamente
    this.updateAndShareLocation();
    
    console.log('Estado cambiado a:', this.isAvailable ? 'Disponible' : 'Ocupado');
  }

  // Simular movimiento del repartidor
  public moveToRandomLocation(): void {
    const newLat = this.UTEQ_LAT + (Math.random() - 0.5) * 0.03;
    const newLng = this.UTEQ_LNG + (Math.random() - 0.5) * 0.03;
    
    this.currentLocation = { lat: newLat, lng: newLng };
    this.addDeliveryPersonMarker();
    this.map.setView([newLat, newLng], 15);
    
    // Compartir la nueva ubicación inmediatamente
    this.updateAndShareLocation();
    
    console.log('Nueva ubicación:', this.currentLocation);
  }

  // Actualizar estado de paquete
  public updatePackageStatus(packageId: number, status: string): void {
    this.packageService.updatePackageStatus(packageId, status).subscribe({
      next: (response) => {
        console.log('Estado del paquete actualizado:', response);
        this.loadAssignedPackages(); // Recargar paquetes
      },
      error: (error) => {
        console.error('Error actualizando estado del paquete:', error);
      }
    });
  }

  // Recargar datos
  public refreshData(): void {
    this.loadDeliveryPersonData();
    this.loadAssignedPackages();
  }

  public logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}