import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ItemAlojamientoDTO } from '../../models/alojamiento-dto';
import { AlojamientoService } from '../../services/alojamiento-service';

@Component({
  selector: 'app-alojamiento-item',
  imports: [CommonModule, RouterLink],
  templateUrl: './alojamiento-item.html',
  styleUrl: './alojamiento-item.css'
})
export class AlojamientoItem {
  @Input() alojamiento!: ItemAlojamientoDTO;

  constructor(public alojamientoService: AlojamientoService) {}

  generarEstrellas(): number[] {
    return this.alojamientoService.generarEstrellas(this.alojamiento.promedioCalificaciones);
  }

  formatearPrecio(): string {
    return this.alojamientoService.formatearPrecio(this.alojamiento.precioPorNoche);
  }
}
