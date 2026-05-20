import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HornerService, HornerResult } from '../../services/horner';

@Component({
  selector: 'app-horner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './horner.html',
  styleUrl: './horner.scss'
})
export class HornerComponent {
  degrees = [2, 3, 4, 5, 6];
  degree = signal(3);
  coefficients = signal<string[]>(this.buildCoeffs(3));
  xValue = signal('2');
  result = signal<HornerResult | null>(null);
  errors = signal<Record<string, string>>({});

  indices = computed(() => Array.from({ length: this.degree() + 1 }, (_, i) => i));

  constructor(private horner: HornerService) {}

  buildCoeffs(deg: number): string[] {
    return Array(deg + 1).fill('1');
  }

  setDegree(d: number) {
    this.degree.set(d);
    this.coefficients.set(this.buildCoeffs(d));
    this.result.set(null);
    this.errors.set({});
  }

  getCoeff(i: number): string {
    return this.coefficients()[i];
  }

  setCoeff(i: number, val: string) {
    const c = [...this.coefficients()];
    c[i] = val;
    this.coefficients.set(c);
    this.validateField(`c_${i}`, val);
  }

  exponent(i: number): number {
    return this.degree() - i;
  }

  validateField(key: string, val: string) {
    const errs = { ...this.errors() };
    if (val.trim() === '' || val.trim() === '-') { delete errs[key]; }
    else if (isNaN(parseFloat(val.replace(',', '.')))) { errs[key] = 'Inválido'; }
    else { delete errs[key]; }
    this.errors.set(errs);
  }

  hasError(key: string): boolean {
    return !!this.errors()[key];
  }

  parseNum(s: string): number | null {
    const v = parseFloat(s.replace(',', '.'));
    return isNaN(v) ? null : v;
  }

  loadExample() {
    this.setDegree(3);
    setTimeout(() => {
      this.coefficients.set(['2', '-6', '2', '-1']);
      this.xValue.set('3');
      this.result.set(null);
    }, 10);
  }

  reset() {
    this.coefficients.set(this.buildCoeffs(this.degree()));
    this.xValue.set('2');
    this.result.set(null);
    this.errors.set({});
  }

  evaluate() {
    const errs: Record<string, string> = {};
    const coeffs: number[] = [];

    for (let i = 0; i <= this.degree(); i++) {
      const v = this.parseNum(this.getCoeff(i));
      if (v === null) { errs[`c_${i}`] = 'Requerido'; }
      else coeffs.push(v);
    }

    const x = this.parseNum(this.xValue());
    if (x === null) { errs['x'] = 'Valor x inválido'; }

    if (Object.keys(errs).length > 0) { this.errors.set(errs); return; }

    this.result.set(this.horner.evaluate(coeffs, x!));
  }

  fmt(v: number, d = 6): string { return v.toFixed(d); }
}
