import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent } from '../map/map.component';
import { PackageTableComponent } from '../package-table/package-table.component';
import { AddPackageFormComponent } from '../add-package-form/add-package-form.component';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, MapComponent, PackageTableComponent, AddPackageFormComponent],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent {
  showAddPackageModal = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

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
}