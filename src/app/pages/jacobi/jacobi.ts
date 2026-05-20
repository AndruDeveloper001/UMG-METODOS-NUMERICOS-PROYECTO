import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { JacobiService, JacobiResult } from '../../services/jacobi';

@Component({
  selector: 'app-jacobi',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './jacobi.html',
  styleUrl: './jacobi.scss'
})
export class JacobiComponent {
  sizes = [2, 3, 4, 5];
  n = signal(3);
  matrixA = signal<string[][]>(this.buildMatrix(3));
  vectorB = signal<string[]>(this.buildVector(3));
  tolerance = signal('0.0001');
  maxIterations = signal('50');
  result = signal<JacobiResult | null>(null);
  errors = signal<Record<string, string>>({});

  rows = computed(() => Array.from({ length: this.n() }, (_, i) => i));
  cols = computed(() => Array.from({ length: this.n() }, (_, i) => i));

  constructor(private jacobi: JacobiService) {}

  buildMatrix(n: number): string[][] {
    return Array.from({ length: n }, () => Array(n).fill('0'));
  }

  buildVector(n: number): string[] {
    return Array(n).fill('0');
  }

  setSize(n: number) {
    this.n.set(n);
    this.matrixA.set(this.buildMatrix(n));
    this.vectorB.set(this.buildVector(n));
    this.result.set(null);
    this.errors.set({});
  }

  getA(i: number, j: number): string {
    return this.matrixA()[i][j];
  }

  setA(i: number, j: number, val: string) {
    const m = this.matrixA().map(r => [...r]);
    m[i][j] = val;
    this.matrixA.set(m);
    this.validateCell(`a_${i}_${j}`, val);
  }

  getB(i: number): string {
    return this.vectorB()[i];
  }

  setB(i: number, val: string) {
    const v = [...this.vectorB()];
    v[i] = val;
    this.vectorB.set(v);
    this.validateCell(`b_${i}`, val);
  }

  validateCell(key: string, val: string) {
    const errs = { ...this.errors() };
    if (val.trim() === '' || val.trim() === '-') { delete errs[key]; }
    else if (isNaN(parseFloat(val.replace(',', '.')))) { errs[key] = 'Valor no numérico'; }
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
    this.setSize(3);
    setTimeout(() => {
      const A = [['4', '-1', '0'], ['2', '5', '1'], ['0', '1', '4']];
      const b = ['3', '10', '9'];
      this.matrixA.set(A);
      this.vectorB.set(b);
      this.tolerance.set('0.0001');
      this.maxIterations.set('50');
      this.result.set(null);
    }, 10);
  }

  reset() {
    this.matrixA.set(this.buildMatrix(this.n()));
    this.vectorB.set(this.buildVector(this.n()));
    this.tolerance.set('0.0001');
    this.maxIterations.set('50');
    this.result.set(null);
    this.errors.set({});
  }

  solve() {
    const n = this.n();
    const A: number[][] = [];
    const b: number[] = [];
    const errs: Record<string, string> = {};

    for (let i = 0; i < n; i++) {
      A.push([]);
      for (let j = 0; j < n; j++) {
        const v = this.parseNum(this.getA(i, j));
        if (v === null) { errs[`a_${i}_${j}`] = 'Requerido'; }
        else A[i].push(v);
      }
      const bv = this.parseNum(this.getB(i));
      if (bv === null) { errs[`b_${i}`] = 'Requerido'; }
      else b.push(bv);
    }

    const tol = this.parseNum(this.tolerance());
    const maxIt = parseInt(this.maxIterations());

    if (tol === null || tol <= 0) errs['tol'] = 'Debe ser > 0';
    if (isNaN(maxIt) || maxIt < 1) errs['maxIt'] = 'Debe ser ≥ 1';

    if (Object.keys(errs).length > 0) { this.errors.set(errs); return; }

    this.result.set(this.jacobi.solve(A, b, tol!, maxIt));
  }

  fmt(v: number, d = 8): string { return v.toFixed(d); }
  fmtE(v: number): string { return v.toExponential(4); }
}
