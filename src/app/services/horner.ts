import { Injectable } from '@angular/core';

export interface HornerStep {
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  body: string;
}

export interface HornerTableRow {
  step: number;
  label: string;
  coeff: number;
  mult: number | null;
  accumulated: number;
}

export interface HornerResult {
  steps: HornerStep[];
  tableRows: HornerTableRow[];
  value: number;
  polynomial: string;
}

@Injectable({ providedIn: 'root' })
export class HornerService {

  evaluate(coeffs: number[], x: number): HornerResult {
    const n = coeffs.length - 1; // degree
    const steps: HornerStep[] = [];
    const tableRows: HornerTableRow[] = [];

    const poly = this.formatPolynomial(coeffs, n);

    steps.push({
      type: 'info',
      title: 'Polinomio ingresado',
      body: `P(x) = ${poly}<br><small>Evaluado en x = ${x}</small>`
    });

    steps.push({
      type: 'info',
      title: 'Principio del método de Horner (Evaluación Sintética)',
      body: `El polinomio se reescribe en forma anidada para minimizar operaciones:<br>
             <div class="formula-block">
               <div class="formula-row">P(x) = (...((a<sub>n</sub>&middot;x + a<sub>n-1</sub>)&middot;x + a<sub>n-2</sub>)&middot;x + ... + a<sub>0</sub>)</div>
             </div>
             Esto reduce n² multiplicaciones a solo n multiplicaciones y n sumas.`
    });

    // Horner's algorithm
    let b = coeffs[0];
    tableRows.push({
      step: 0,
      label: `b₀ = a${n}`,
      coeff: coeffs[0],
      mult: null,
      accumulated: b
    });

    for (let i = 1; i < coeffs.length; i++) {
      const mult = b * x;
      const acc = mult + coeffs[i];
      tableRows.push({
        step: i,
        label: `Paso ${i}`,
        coeff: coeffs[i],
        mult: mult,
        accumulated: acc
      });
      b = acc;
    }

    steps.push({
      type: 'success',
      title: 'Evaluación completada',
      body: `P(${x}) = <strong>${b.toFixed(8)}</strong>`
    });

    return { steps, tableRows, value: b, polynomial: poly };
  }

  private formatPolynomial(coeffs: number[], degree: number): string {
    let parts: string[] = [];
    for (let i = 0; i < coeffs.length; i++) {
      const c = coeffs[i];
      const exp = degree - i;
      if (c === 0) continue;
      const sign = parts.length > 0 ? (c < 0 ? ' &minus; ' : ' + ') : (c < 0 ? '&minus;' : '');
      const absC = Math.abs(c);
      const coefStr = (absC === 1 && exp > 0) ? '' : String(absC);
      const xStr = exp === 0 ? '' : exp === 1 ? 'x' : `x<sup>${exp}</sup>`;
      parts.push(`${sign}${coefStr}${xStr}`);
    }
    return parts.length ? parts.join('') : '0';
  }
}
