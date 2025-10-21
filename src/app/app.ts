import { Component, signal } from '@angular/core';
import {RouterOutlet, RouterModule} from '@angular/router';
import {Encabezado} from './components/encabezado/encabezado';
import {PiePagina} from './components/pie-pagina/pie-pagina';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterModule, Encabezado, PiePagina],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('ViviGo');

}
