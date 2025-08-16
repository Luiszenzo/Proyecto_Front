import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;

  constructor() {
    this.socket = io('http://localhost:3000'); // URL de tu servidor
  }

  // Método para conectar al socket
  connect(): void {
    if (this.socket.disconnected) {
      this.socket.connect();
    }
  }

  // Método para desconectar del socket
  disconnect(): void {
    if (this.socket.connected) {
      this.socket.disconnect();
    }
  }

  // Método para emitir eventos
  emit(eventName: string, data: any): void {
    this.socket.emit(eventName, data);
  }

  // Método para escuchar eventos
  listen(eventName: string): Observable<any> {
    return new Observable((subscriber) => {
      this.socket.on(eventName, (data) => {
        subscriber.next(data);
      });
    });
  }
}