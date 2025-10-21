import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControlOptions, AbstractControl } from '@angular/forms';

@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule],
  templateUrl: './registro.html',
  styleUrl: './registro.css'
})
export class Registro {
  registroForm!: FormGroup;

  constructor(private formBuilder: FormBuilder) {
    this.crearForm();
  }

  crearForm() {
    this.registroForm = this.formBuilder.group({
      nombre: ['', [Validators.required]],
      apellido: ['', [Validators.required]],
      telefono: ['', [Validators.required, Validators.maxLength(10), Validators.pattern(/^[\+]?[0-9\s\-\(\)]{10,}$/)]],
      fechaNacimiento: ['', [Validators.required, this.edadMinimaValidador(18)]],
      email: ['', [Validators.required, Validators.email]],
      contrasena: ['', [Validators.required, Validators.minLength(8), this.ContrasenaFuerteValidador]],
      confirmarContrasena: ['', [Validators.required]],
      terminos: [false, [Validators.requiredTrue]]
    },
    { validators: this.contrasenasMatchValidador } as AbstractControlOptions
    );
  }
  public contrasenasMatchValidador(formGroup: FormGroup) {
    const contrasena = formGroup.get('contrasena')?.value;
    const confirmarContrasena = formGroup.get('confirmarContrasena')?.value;

    // Si las contraseñas no coinciden, devuelve un error, de lo contrario, null
    return contrasena == confirmarContrasena ? null : { contrasenasNoCoinciden: true };
  }

  // Validador de contraseña segura
  ContrasenaFuerteValidador() {
    return (control: AbstractControl) => {
      const value = control.value;
      if (!value) return null;

      const tieneMayuscula = /[A-Z]/.test(value);
      const tieneNumero = /\d/.test(value);

      const valid = tieneMayuscula && tieneNumero;

      return valid ? null : { contrasenaSegura: true };
    };
  }

  public crearUsuario() {
    if (this.registroForm.valid) {
      const formValues = this.registroForm.value;

      const fullName = `${formValues.nombre} ${formValues.apellido}`;

      const user = {
        nombre: fullName,
        telefono: formValues.telefono,
        fechaNacimiento: formValues.fechaNacimiento,
        email: formValues.email,
        contrasena: formValues.contrasena
      };

      console.log('Usuario a registrar:', user);

    } else {
      console.log('Formulario no válido', this.registroForm.value);
    }
  }

  edadMinimaValidador(edadMinima: number) {
    return (control: AbstractControl) => {
      const fechaNacimiento = new Date(control.value);
      const hoy = new Date();
      let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
      const mes = hoy.getMonth() - fechaNacimiento.getMonth();

      if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNacimiento.getDate())) {
        edad--;
      }

      return edad >= edadMinima ? null : { edadMinima: true };
    };
  }
}
