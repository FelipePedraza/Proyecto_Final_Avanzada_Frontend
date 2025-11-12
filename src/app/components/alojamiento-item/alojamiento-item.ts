import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ItemAlojamientoDTO } from '../../models/alojamiento-dto';
import { CalificacionService } from '../../services/calificacion-service';
import { PrecioService } from '../../services/precio-service';

@Component({
  selector: 'app-alojamiento-item',
  imports: [CommonModule, RouterLink],
  templateUrl: './alojamiento-item.html',
  styleUrl: './alojamiento-item.css'
})
export class AlojamientoItem {
  @Input() alojamiento!: ItemAlojamientoDTO;

  constructor(
    public calificacionService: CalificacionService,
    public precioService: PrecioService
  ) {}

}
