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
  matrixA = signal<string[][]>(this.mkMatrix(3));
  vectorB = signal<string[]>(this.mkVec(3));
  tolerance = signal('0.0001');
  maxIterations = signal('50');
  result = signal<JacobiResult | null>(null);
  errors = signal<Record<string, string>>({});

  /* which iteration is expanded for detail view (-1 = none) */
  expandedIter = signal<number>(-1);

  rows = computed(() => Array.from({ length: this.n() }, (_, i) => i));
  cols = computed(() => Array.from({ length: this.n() }, (_, i) => i));

  constructor(private svc: JacobiService) {}

  mkMatrix(n: number): string[][] { return Array.from({ length: n }, () => Array(n).fill('0')); }
  mkVec(n: number): string[]      { return Array(n).fill('0'); }

  setSize(n: number) {
    this.n.set(n);
    this.matrixA.set(this.mkMatrix(n));
    this.vectorB.set(this.mkVec(n));
    this.result.set(null); this.errors.set({});
  }

  getA(i: number, j: number) { return this.matrixA()[i][j]; }
  setA(i: number, j: number, v: string) {
    const m = this.matrixA().map(r => [...r]);
    m[i][j] = v;
    this.matrixA.set(m);
    this.validateCell(`a_${i}_${j}`, v);
  }

  getB(i: number) { return this.vectorB()[i]; }
  setB(i: number, v: string) {
    const vec = [...this.vectorB()]; vec[i] = v;
    this.vectorB.set(vec);
    this.validateCell(`b_${i}`, v);
  }

  validateCell(key: string, val: string) {
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
    this.setSize(3);
    setTimeout(() => {
      this.matrixA.set([['4','-1','0'],['2','5','1'],['0','1','4']]);
      this.vectorB.set(['3','10','9']);
      this.tolerance.set('0.0001');
      this.maxIterations.set('50');
    });
  }

  reset() {
    this.matrixA.set(this.mkMatrix(this.n()));
    this.vectorB.set(this.mkVec(this.n()));
    this.tolerance.set('0.0001');
    this.maxIterations.set('50');
    this.result.set(null); this.errors.set({});
    this.expandedIter.set(-1);
  }

  solve() {
    const n = this.n();
    const A: number[][] = [];
    const b: number[]  = [];
    const errs: Record<string, string> = {};

    for (let i = 0; i < n; i++) {
      A.push([]);
      for (let j = 0; j < n; j++) {
        const v = this.parse(this.getA(i, j));
        if (v === null) { errs[`a_${i}_${j}`] = '!'; } else { A[i].push(v); }
      }
      const bv = this.parse(this.getB(i));
      if (bv === null) { errs[`b_${i}`] = '!'; } else { b.push(bv); }
    }

    const tol   = this.parse(this.tolerance());
    const maxIt = parseInt(this.maxIterations());
    if (!tol || tol <= 0)    { errs['tol']   = 'Debe ser > 0'; }
    if (isNaN(maxIt) || maxIt < 1) { errs['maxIt'] = 'Debe ser ≥ 1'; }

    if (Object.keys(errs).length) { this.errors.set(errs); return; }

    this.expandedIter.set(-1);
    this.result.set(this.svc.solve(A, b, tol!, maxIt));
  }

  toggleIter(k: number) {
    this.expandedIter.set(this.expandedIter() === k ? -1 : k);
  }

  fmt(v: number, d = 8) { return Number(v).toFixed(d); }
  fmtE(v: number)        { return v.toExponential(4); }
}
