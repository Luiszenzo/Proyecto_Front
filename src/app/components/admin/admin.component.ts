import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent } from '../map/map.component';
import { PackageTableComponent } from '../package-table/package-table.component';
import { AddPackageFormComponent } from '../add-package-form/add-package-form.component';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { DeliveryPersonnelService } from '../../services/delivery-personnel.service';
import { PackageService } from '../../services/package.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, MapComponent, PackageTableComponent, AddPackageFormComponent],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  showAddPackageModal = false;
  deliveryPersonnel: any[] = [];
  selectedDeliveryPerson: any = null;
  mapComponent: MapComponent | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private deliveryPersonnelService: DeliveryPersonnelService,
    private packageService: PackageService
  ) {}

  ngOnInit() {
    this.loadDeliveryPersonnel();
  }

  onPackageAdded(packageData: any) {
    console.log('Paquete agregado:', packageData);
    this.showAddPackageModal = false;
    // Aquí puedes agregar lógica para refrescar la tabla
  }

  closeModal(event: Event) {
    if (event.target === event.currentTarget) {
      this.showAddPackageModal = false;
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
  
  loadDeliveryPersonnel() {
    this.deliveryPersonnelService.getDeliveryPersonnel().subscribe(
      (personnel: any[]) => {
        this.deliveryPersonnel = personnel;
      },
      (error: any) => {
        console.error('Error loading delivery personnel:', error);
      }
    );
  }
  
  selectDeliveryPerson(person: any) {
    this.selectedDeliveryPerson = person;
  }

  /**
   * Handles the initialization of the map component
   * @param mapComponent Reference to the map component
   */
  onMapComponentInit(mapComponent: MapComponent) {
    this.mapComponent = mapComponent;
    console.log('Map component initialized:', mapComponent);
  }

  /**
   * Checks if a delivery person has at least the specified number of pending packages
   * @param person The delivery person object
   * @param threshold The minimum number of pending packages
   * @returns True if the person has at least the threshold number of pending packages
   */
  hasPendingPackages(person: any, threshold: number): boolean {
    if (!person || !person.assigned_packages) {
      return false;
    }
    
    // Count packages with status 'pending' or 'assigned'
    const pendingCount = person.assigned_packages.filter(
      (pkg: any) => pkg.status === 'pending' || pkg.status === 'assigned'
    ).length;
    
    return pendingCount >= threshold;
  }

  /**
   * Closes the delivery person modal
   * @param event The click event
   */
  closeDeliveryPersonModal(event: Event): void {
    // Prevent event propagation to avoid unwanted side effects
    event.stopPropagation();
    
    // Reset the selected delivery person
    this.selectedDeliveryPerson = null;
  }

  /**
   * Checks if a delivery person's location is considered remote
   * @param person The delivery person object
   * @returns True if the location is remote
   */
  isRemoteLocation(person: any): boolean {
    if (!person || !person.location) {
      return false;
    }
    
    // Define what constitutes a remote location
    // This is just an example - adjust based on your business logic
    const centralLatitude = 40.416775; // Example: Madrid center
    const centralLongitude = -3.703790;
    
    // Calculate distance using Haversine formula
    const distance = this.calculateDistance(
      centralLatitude, 
      centralLongitude,
      person.location.latitude,
      person.location.longitude
    );
    
    // Consider locations more than 10km away as remote
    return distance > 10;
  }

  /**
   * Calculates the distance between two coordinates using the Haversine formula
   * @param lat1 Latitude of first point
   * @param lon1 Longitude of first point
   * @param lat2 Latitude of second point
   * @param lon2 Longitude of second point
   * @returns Distance in kilometers
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
  }

  /**
   * Converts degrees to radians
   * @param deg Degrees
   * @returns Radians
   */
  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // Add this method to navigate to the delivery person's location on the map
  // Fix the method to handle null mapComponent
  navigateToDeliveryPerson(person: any): void {
    // First select the delivery person to update the selectedDeliveryPerson property
    this.selectDeliveryPerson(person);
    
    // Then scroll to the map section
    const mapSection = document.querySelector('.map-section');
    if (mapSection) {
      mapSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    // If we have a reference to the map component, tell it to focus on this delivery person
    if (this.mapComponent && typeof this.mapComponent.focusOnDeliveryPerson === 'function') {
      // Give a small delay to ensure the map is ready
      setTimeout(() => {
        this.mapComponent?.focusOnDeliveryPerson(person.id);
      }, 300);
    } else {
      console.warn('Map component or focusOnDeliveryPerson method not available');
    }
  }
}