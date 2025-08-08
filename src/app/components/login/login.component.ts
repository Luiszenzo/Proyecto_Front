
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
    private router: Router
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