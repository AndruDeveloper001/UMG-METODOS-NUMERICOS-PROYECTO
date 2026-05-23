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
  degree  = signal(3);
  coefficients = signal<string[]>(Array(4).fill('1'));
  xValue  = signal('2');
  result  = signal<HornerResult | null>(null);
  errors  = signal<Record<string, string>>({});

  indices = computed(() =>
    Array.from({ length: this.degree() + 1 }, (_, i) => i)
  );

  /* columnas de la tabla de cociente (excluye el residuo = último) */
  quotientCols = computed(() =>
    this.result()?.quotientTerms ?? []
  );

  constructor(private svc: HornerService) {}

  setDegree(d: number) {
    this.degree.set(d);
    this.coefficients.set(Array(d + 1).fill('1'));
    this.result.set(null);
    this.errors.set({});
  }

  getCoeff(i: number) { return this.coefficients()[i]; }
  setCoeff(i: number, v: string) {
    const c = [...this.coefficients()]; c[i] = v;
    this.coefficients.set(c);
    this.validate(`c_${i}`, v);
  }

  exp(i: number) { return this.degree() - i; }

  validate(key: string, val: string) {
    const e = { ...this.errors() };
    if (val.trim() === '' || val.trim() === '-') { delete e[key]; }
    else if (isNaN(parseFloat(val.replace(',', '.')))) { e[key] = '!'; }
    else { delete e[key]; }
    this.errors.set(e);
  }

  hasError(k: string) { return !!this.errors()[k]; }

  parse(s: string): number | null {
    const v = parseFloat(s.replace(',', '.'));
    return isNaN(v) ? null : v;
  }

  loadExample() {
    this.setDegree(3);
    setTimeout(() => {
      // P(x) = 2x³ − 6x² + 2x − 1, x = 3
      // Q(x) = 2x² + 0x + 8, R = 23
      this.coefficients.set(['2', '-6', '2', '-1']);
      this.xValue.set('3');
    });
  }

  loadExampleRoot() {
    this.setDegree(3);
    setTimeout(() => {
      // P(x) = x³ − 6x² + 11x − 6, raíz en x = 1 → Q(x) = x² − 5x + 6, R = 0
      this.coefficients.set(['1', '-6', '11', '-6']);
      this.xValue.set('1');
    });
  }

  reset() {
    this.coefficients.set(Array(this.degree() + 1).fill('1'));
    this.xValue.set('2');
    this.result.set(null);
    this.errors.set({});
  }

  evaluate() {
    const errs: Record<string, string> = {};
    const coeffs: number[] = [];

    for (let i = 0; i <= this.degree(); i++) {
      const v = this.parse(this.getCoeff(i));
      if (v === null) { errs[`c_${i}`] = '!'; } else { coeffs.push(v); }
    }
    const x = this.parse(this.xValue());
    if (x === null) { errs['x'] = 'Inválido'; }

    if (Object.keys(errs).length) { this.errors.set(errs); return; }
    this.result.set(this.svc.evaluate(coeffs, x!));
  }

  fmt(v: number, d = 6) { return Number(v).toFixed(d); }
  abs(v: number) { return Math.abs(v); }
}
