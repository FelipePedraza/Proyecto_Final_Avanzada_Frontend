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
import { GestionarReservas } from './pages/gestionar-reservas/gestionar-reservas';
import {LoginGuard} from './guards/login-service';
import {RolGuard} from './guards/rol-service';

export const routes: Routes = [
  { path: '', component: Inicio },
  { path: 'login', component: Login, canActivate: [LoginGuard]},
  { path: 'registro', component: Registro, canActivate: [LoginGuard]},
  { path: 'busqueda', component: Busqueda },
  { path: 'alojamiento/:id', component: DetalleAlojamiento },
  { path: 'mis-alojamientos', component: MisAlojamientos, canActivate: [RolGuard], data: { expectedRole: ["ROL_Anfitrion"] } },
  { path: 'crear-alojamiento', component: CrearAlojamiento, canActivate: [RolGuard], data: { expectedRole: ["ROL_Anfitrion"] }  },
  { path: 'editar-alojamiento/:id', component: CrearAlojamiento, canActivate: [RolGuard], data: { expectedRole: ["ROL_Anfitrion"] } },
  { path: 'editar-perfil', component: EditarPerfil, canActivate: [RolGuard], data: { expectedRole: ["ROL_Anfitrion", "ROL_Huespedes"] } },
  { path: 'mis-reservas', component: MisReservas, canActivate: [RolGuard], data: { expectedRole: ["ROL_Anfitrion", "ROL_Huespedes"] } },
  { path: 'gestionar-reservas', component: GestionarReservas, canActivate: [RolGuard], data: { expectedRole: ["ROL_Anfitrion"] } },
  { path: '**', pathMatch: "full", redirectTo: "" }
];
