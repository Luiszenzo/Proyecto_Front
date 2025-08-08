import { Component, OnInit, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PackageService } from '../../services/package.service';

@Component({
  selector: 'app-map',
  standalone: true,
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit, AfterViewInit {
  private map: any;
  private deliveryPersons: any[] = [];
  private packages: any[] = [];
  
  // Coordenadas exactas de la Universidad Tecnológica de Querétaro (UTEQ)
  private readonly UTEQ_LAT = 20.65636;
  private readonly UTEQ_LNG = -100.40507;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private packageService: PackageService
  ) { }

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initMap();
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

    // Crear icono personalizado para los repartidores usando coche.png
    const carIcon = L.icon({
      iconUrl: '/coche.png', // Cambiado de 'coche.png' a '/coche.png'
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20]
    });

    // Agregar cada repartidor al mapa en posiciones aleatorias cerca de la UTEQ
    this.deliveryPersons.forEach((delivery, index) => {
      // Generar posición aleatoria cerca de la UTEQ (radio de ~3km)
      const randomLat = this.UTEQ_LAT + (Math.random() - 0.5) * 0.03; // ±0.015 grados (~1.5km)
      const randomLng = this.UTEQ_LNG + (Math.random() - 0.5) * 0.03; // ±0.015 grados (~1.5km)

      // Crear marcador para el repartidor
      const marker = L.marker([randomLat, randomLng], { icon: carIcon })
        .addTo(this.map)
        .bindPopup(`
          <div style="text-align: center;">
            <h4>🚗 ${delivery.name}</h4>
            <p><strong>Teléfono:</strong> ${delivery.phone}</p>
            <p><strong>Estado:</strong> <span style="color: green;">Disponible</span></p>
            <p><strong>Zona:</strong> Cerca de UTEQ</p>
            <p><strong>Ubicación:</strong> ${randomLat.toFixed(4)}, ${randomLng.toFixed(4)}</p>
          </div>
        `);

      // Agregar animación de movimiento cada 10 segundos
      setInterval(() => {
        const newLat = this.UTEQ_LAT + (Math.random() - 0.5) * 0.03;
        const newLng = this.UTEQ_LNG + (Math.random() - 0.5) * 0.03;
        marker.setLatLng([newLat, newLng]);
        
        // Actualizar popup con nueva ubicación
        marker.setPopupContent(`
          <div style="text-align: center;">
            <h4>🚗 ${delivery.name}</h4>
            <p><strong>Teléfono:</strong> ${delivery.phone}</p>
            <p><strong>Estado:</strong> <span style="color: green;">En movimiento</span></p>
            <p><strong>Zona:</strong> Cerca de UTEQ</p>
            <p><strong>Ubicación:</strong> ${newLat.toFixed(4)}, ${newLng.toFixed(4)}</p>
          </div>
        `);
      }, 10000 + (index * 2000)); // Diferentes intervalos para cada repartidor
    });
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
  public refreshMapData(): void {
    this.loadData();
  }
}