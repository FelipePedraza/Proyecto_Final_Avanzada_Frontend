import { inject, Injectable } from '@angular/core';
import { TokenService } from '../services/token-service';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class RolService {

  constructor(private tokenService: TokenService, private router: Router) { }

  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {

    const expectedRole: string[] = next.data["expectedRole"];
    const realRole = this.tokenService.getRole();

    if (!this.tokenService.isLogged() || !expectedRole.includes(realRole)) {
      this.router.navigate([""]);
      return false;
    }

    return true;
  }

}

export const RolGuard: CanActivateFn = (next: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean => {
  return inject(RolService).canActivate(next, state);
}
