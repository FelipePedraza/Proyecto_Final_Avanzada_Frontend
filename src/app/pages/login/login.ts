import { Component } from '@angular/core';
import {ReactiveFormsModule, FormGroup, FormBuilder, Validators, AbstractControlOptions} from '@angular/forms';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  loginForm!: FormGroup;
  mostrarContrasena = false; // Variable para controlar el toggle

  constructor(private formBuilder: FormBuilder) {
    this.crearForm();
  }

  crearForm() {
    this.loginForm = this.formBuilder.group({
        email: ['', [Validators.required, Validators.email]],
        contrasena: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  // Método para cambiar el tipo de input
  toggleContrasena() {
    this.mostrarContrasena = !this.mostrarContrasena;
  }

  public login() {
    console.log('login de:', this.loginForm.value);
  }
}
