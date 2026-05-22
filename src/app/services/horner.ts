import { Injectable } from '@angular/core';
import { StepType } from './jacobi';

export interface HornerStep {
  type: StepType;
  title: string;
  lines: string[];
}

export interface HornerTableRow {
  step: number;
  label: string;
  coeff: number;
  multExpr: string | null;
  multVal: number | null;
  addExpr: string | null;
  accumulated: number;
}

export interface HornerResult {
  steps: HornerStep[];
  tableRows: HornerTableRow[];
  value: number;
  polynomial: string;
  nestedForm: string;
}

@Injectable({ providedIn: 'root' })
export class HornerService {

  evaluate(coeffs: number[], x: number): HornerResult {
    const n = coeffs.length - 1;
    const steps: HornerStep[] = [];
    const tableRows: HornerTableRow[] = [];

    const poly = this.formatPolynomial(coeffs, n);
    const nested = this.buildNestedForm(coeffs, n);

    steps.push({ type: 'info', title: 'Polinomio ingresado',
      lines: [
        `P(x) = ${poly}`,
        `Grado: ${n} &nbsp;·&nbsp; Número de coeficientes: ${coeffs.length}`,
        `Valor a evaluar: x = ${x}`
      ]
    });

    steps.push({ type: 'info', title: 'Paso 1 — Forma anidada (Horner)',
      lines: [
        'Se reescribe P(x) agrupando de adentro hacia afuera para minimizar operaciones:',
        `P(x) = ${nested}`,
        `Esta forma requiere solo <strong>${n}</strong> multiplicaciones y <strong>${n}</strong> sumas (vs. ${n + (n*(n-1)/2)} operaciones en la forma estándar).`
      ]
    });

    const coeffLine = coeffs.map((c, i) => `a<sub>${n-i}</sub> = ${c}`).join(' &nbsp;|&nbsp; ');
    steps.push({ type: 'info', title: 'Paso 2 — Lista de coeficientes (mayor a menor grado)',
      lines: [coeffLine]
    });

    const b0 = coeffs[0];
    steps.push({ type: 'info', title: 'Paso 3 — Inicialización',
      lines: [
        `El acumulador b se inicializa con el coeficiente líder a<sub>${n}</sub>:`,
        `b<sub>0</sub> = a<sub>${n}</sub> = ${b0}`
      ]
    });

    tableRows.push({
      step: 0, label: `Inicio — b₀ = a${n}`,
      coeff: b0, multExpr: null, multVal: null, addExpr: null,
      accumulated: b0
    });

    let b = b0;
    for (let i = 1; i < coeffs.length; i++) {
      const ai = coeffs[i];
      const exp = n - i;
      const mult = b * x;
      const acc  = mult + ai;

      const multExpr = `${this.fmt(b, 6)} × ${x}`;
      const addExpr  = `${this.fmt(mult, 6)} + (${ai})`;

      steps.push({ type: 'substep', title: `Paso ${i + 3} — Coeficiente a<sub>${exp}</sub> = ${ai}`,
        lines: [
          `Multiplicar acumulador anterior por x: &nbsp; b × x = ${this.fmt(b,6)} × ${x} = <strong>${this.fmt(mult,6)}</strong>`,
          `Sumar coeficiente a<sub>${exp}</sub>: &nbsp; ${this.fmt(mult,6)} + (${ai}) = <strong>${this.fmt(acc,6)}</strong>`,
          `Nuevo acumulador: &nbsp; b<sub>${i}</sub> = ${this.fmt(acc, 8)}`
        ]
      });

      tableRows.push({
        step: i, label: `Paso ${i} — exp ${exp}`,
        coeff: ai, multExpr, multVal: mult, addExpr,
        accumulated: acc
      });

      b = acc;
    }

    steps.push({ type: 'success', title: 'Resultado final',
      lines: [
        `El último valor acumulado es el resultado de P(${x}):`,
        `P(${x}) = <strong>${this.fmt(b, 8)}</strong>`
      ]
    });

    return { steps, tableRows, value: b, polynomial: poly, nestedForm: nested };
  }

  private fmt(v: number, d = 6): string { return Number(v).toFixed(d); }

  private formatPolynomial(coeffs: number[], degree: number): string {
    const parts: string[] = [];
    for (let i = 0; i < coeffs.length; i++) {
      const c = coeffs[i];
      const exp = degree - i;
      if (c === 0) continue;
      const sign = parts.length > 0 ? (c < 0 ? ' − ' : ' + ') : (c < 0 ? '−' : '');
      const absC = Math.abs(c);
      const coefStr = (absC === 1 && exp > 0) ? '' : String(absC);
      const xStr = exp === 0 ? '' : exp === 1 ? 'x' : `x<sup>${exp}</sup>`;
      parts.push(`${sign}${coefStr}${xStr}`);
    }
    return parts.length ? parts.join('') : '0';
  }

  private buildNestedForm(coeffs: number[], degree: number): string {
    let form = `${coeffs[0]}`;
    for (let i = 1; i < coeffs.length; i++) {
      const c = coeffs[i];
      const sign = c >= 0 ? ` + ${c}` : ` − ${Math.abs(c)}`;
      form = `(${form})·x${sign}`;
    }
    return form;
  }
}
