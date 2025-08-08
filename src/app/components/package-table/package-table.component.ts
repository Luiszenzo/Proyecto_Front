import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PackageService } from '../../services/package.service';

@Component({
  selector: 'app-package-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './package-table.component.html',
  styleUrls: ['./package-table.component.css']
})
export class PackageTableComponent implements OnInit {
  packages: any[] = [];
  loading = true;

  constructor(private packageService: PackageService) {}

  ngOnInit() {
    this.loadPackages();
  }

  loadPackages() {
    this.loading = true;
    this.packageService.getPackages().subscribe({
      next: (data) => {
        this.packages = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading packages:', error);
        this.loading = false;
      }
    });
  }

  // Método corregido para manejar el cambio de estado
  onStatusChange(event: Event, packageId: number) {
    const target = event.target as HTMLSelectElement;
    const newStatus = target.value;
    this.updateStatus(packageId, newStatus);
  }

  updateStatus(packageId: number, newStatus: string) {
    this.packageService.updatePackageStatus(packageId, newStatus).subscribe({
      next: () => {
        this.loadPackages(); // Recargar la tabla
      },
      error: (error) => {
        console.error('Error updating status:', error);
      }
    });
  }

  deletePackage(packageId: number) {
    if (confirm('¿Estás seguro de que quieres eliminar este paquete?')) {
      this.packageService.deletePackage(packageId).subscribe({
        next: () => {
          this.loadPackages(); // Recargar la tabla
        },
        error: (error) => {
          console.error('Error deleting package:', error);
        }
      });
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'in_transit': return 'status-transit';
      case 'delivered': return 'status-delivered';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'in_transit': return 'En tránsito';
      case 'delivered': return 'Entregado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  }
}