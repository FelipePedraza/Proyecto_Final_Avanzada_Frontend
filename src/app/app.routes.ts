import { Routes } from '@angular/router';
import { Inicio } from './pages/inicio/inicio';
import { Login } from './pages/login/login';
import { Registro } from './pages/registro/registro';
import { Busqueda } from './pages/busqueda/busqueda';
import { DetalleAlojamiento } from './pages/detalle-alojamiento/detalle-alojamiento';
import { MisAlojamientos } from './pages/mis-alojamientos/mis-alojamientos';
import { CrearAlojamiento } from './pages/crear-alojamiento/crear-alojamiento';
import { EditarPerfil } from './pages/editar-perfil/editar-perfil';
import { MisReservas } from './pages/mis-reservas/mis-reservas';

export const routes: Routes = [
  { path: '', component: Inicio },
  { path: 'login', component: Login },
  { path: 'registro', component: Registro },
  { path: 'busqueda', component: Busqueda },
  { path: 'alojamiento/:id', component: DetalleAlojamiento },
  { path: 'mis-alojamientos', component: MisAlojamientos },
  { path: 'crear-alojamiento', component: CrearAlojamiento },
  { path: 'editar-alojamiento/:id', component: CrearAlojamiento },
  { path: 'editar-perfil', component: EditarPerfil },
  { path: 'mis-reservas', component: MisReservas },
  { path: '**', pathMatch: "full", redirectTo: "" }
];
