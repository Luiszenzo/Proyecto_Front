
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PackageService } from '../../services/package.service';

// Import PrimeNG modules
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { PasswordModule } from 'primeng/password';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ButtonModule, 
    InputTextModule, 
    CardModule,
    DividerModule,
    PasswordModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private packageService: PackageService // Añadir este servicio
  ) {}

  onSubmit(): void {
    if (!this.email || !this.password) {
      this.errorMessage = 'Por favor, completa todos los campos';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.email, this.password).subscribe({
      next: (response) => {
        console.log('Login exitoso:', response);
        
        // Si el usuario es un repartidor, obtener y guardar su ubicación
        if (response.user.role === 'delivery') {
          this.saveDeliveryLocation(response.user.id);
        }
        
        // Redirigir según el rol del usuario
        if (response.user.role === 'admin') {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/delivery']);
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error en login:', error);
        this.errorMessage = 'Credenciales incorrectas';
        this.isLoading = false;
      }
    });
  }

  // Método para obtener y guardar la ubicación del repartidor
  private saveDeliveryLocation(deliveryId: number): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log('Ubicación obtenida:', latitude, longitude);
          
          // Guardar la ubicación en la base de datos
          this.packageService.updateInitialLocation(deliveryId, latitude, longitude)
            .subscribe({
              next: (response) => {
                console.log('Ubicación inicial guardada:', response);
              },
              error: (error) => {
                console.error('Error al guardar ubicación inicial:', error);
              }
            });
        },
        (error) => {
          console.error('Error al obtener ubicación:', error);
          // Si hay error, usar una ubicación predeterminada (por ejemplo, la UTEQ)
          const defaultLat = 20.65636;
          const defaultLng = -100.40507;
          
          this.packageService.updateInitialLocation(deliveryId, defaultLat, defaultLng)
            .subscribe({
              next: (response) => {
                console.log('Ubicación predeterminada guardada:', response);
              },
              error: (error) => {
                console.error('Error al guardar ubicación predeterminada:', error);
              }
            });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      console.log('Geolocalización no disponible');
      // Usar ubicación predeterminada
      const defaultLat = 20.65636;
      const defaultLng = -100.40507;
      
      this.packageService.updateInitialLocation(deliveryId, defaultLat, defaultLng)
        .subscribe({
          next: (response) => {
            console.log('Ubicación predeterminada guardada:', response);
          },
          error: (error) => {
            console.error('Error al guardar ubicación predeterminada:', error);
          }
        });
    }
  }

  // Método para llenar credenciales de prueba
  fillTestCredentials(role: 'admin' | 'delivery', userIndex?: number): void {
    if (role === 'admin') {
      this.email = 'admin@delivery.com';
      this.password = 'admin123';
    } else {
      const deliveryUsers = [
        { email: 'juan@delivery.com', password: 'juan123' },
        { email: 'maria@delivery.com', password: 'maria123' },
        { email: 'carlos@delivery.com', password: 'carlos123' },
        { email: 'ana@delivery.com', password: 'ana123' }
      ];
      
      const user = deliveryUsers[userIndex || 0];
      this.email = user.email;
      this.password = user.password;
    }
  }
  
  // Add these to your component class:
  showCredentials = false;
  
  toggleCredentials() {
    this.showCredentials = !this.showCredentials;
  }
}