import { Injectable } from '@angular/core';

export interface JacobiStep {
  type: 'info' | 'warning' | 'success' | 'error' | 'iteration';
  title: string;
  body: string;
}

export interface JacobiIteration {
  iter: number;
  values: number[];
  error: number;
}

export interface JacobiResult {
  steps: JacobiStep[];
  iterations: JacobiIteration[];
  solution: number[] | null;
  converged: boolean;
  iterCount: number;
}

@Injectable({ providedIn: 'root' })
export class JacobiService {

  solve(A: number[][], b: number[], tol: number, maxIter: number): JacobiResult {
    const n = A.length;
    const steps: JacobiStep[] = [];
    const iterHistory: JacobiIteration[] = [];

    for (let i = 0; i < n; i++) {
      if (A[i][i] === 0) {
        steps.push({
          type: 'error',
          title: 'Error: diagonal nula',
          body: `El elemento diagonal A[${i + 1}][${i + 1}] = 0. Reordena las ecuaciones para que los mayores coeficientes queden en la diagonal.`
        });
        return { steps, iterations: [], solution: null, converged: false, iterCount: 0 };
      }
    }

    steps.push({
      type: 'info',
      title: 'Sistema de ecuaciones ingresado',
      body: this.formatSystem(A, b, n)
    });

    const dd = this.isDiagDominant(A, n);
    steps.push({
      type: dd ? 'success' : 'warning',
      title: 'Verificación: diagonal dominante',
      body: dd
        ? 'El sistema es estrictamente diagonalmente dominante (|a<sub>ii</sub>| &gt; Σ|a<sub>ij</sub>|, j≠i). La convergencia está garantizada.'
        : 'Advertencia: el sistema <strong>no</strong> es estrictamente diagonalmente dominante. El método podría no converger.'
    });

    steps.push({
      type: 'info',
      title: 'Fórmulas iterativas de Jacobi',
      body: this.buildFormula(A, b, n)
    });

    steps.push({
      type: 'info',
      title: 'Vector inicial x⁽⁰⁾',
      body: `Se inicia con x<sub>i</sub><sup>(0)</sup> = 0 para todo i &rarr; [${new Array(n).fill('0').join(', ')}]`
    });

    let x = new Array(n).fill(0);
    let converged = false;
    let iterDone = 0;

    for (let k = 0; k < maxIter; k++) {
      const xNew = new Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        let sum = b[i];
        for (let j = 0; j < n; j++) {
          if (j !== i) sum -= A[i][j] * x[j];
        }
        xNew[i] = sum / A[i][i];
      }
      const err = Math.max(...xNew.map((v, i) => Math.abs(v - x[i])));
      iterHistory.push({ iter: k + 1, values: [...xNew], error: err });
      x = [...xNew];
      iterDone = k + 1;
      if (err < tol) { converged = true; break; }
    }

    steps.push({
      type: converged ? 'success' : 'warning',
      title: converged
        ? `Convergencia en ${iterDone} iteración(es)`
        : `No convergió tras ${maxIter} iteraciones`,
      body: converged
        ? `El error máximo entre iteraciones cayó por debajo de ε = ${tol}.`
        : `Se alcanzó el límite de ${maxIter} iteraciones sin cumplir ε = ${tol}.`
    });

    return { steps, iterations: iterHistory, solution: x, converged, iterCount: iterDone };
  }

  private formatSystem(A: number[][], b: number[], n: number): string {
    let html = '<div class="equation-system">';
    for (let i = 0; i < n; i++) {
      let eq = '';
      for (let j = 0; j < n; j++) {
        const c = A[i][j];
        const sign = j === 0 ? (c < 0 ? '&minus;' : '') : (c < 0 ? ' &minus; ' : ' + ');
        eq += `${sign}(${Math.abs(c)})x<sub>${j + 1}</sub>`;
      }
      html += `<div class="eq-row"><span class="eq-label">Ec. ${i + 1}:</span><span class="eq-body">${eq} = ${b[i]}</span></div>`;
    }
    return html + '</div>';
  }

  private buildFormula(A: number[][], b: number[], n: number): string {
    let html = '<div class="formula-block">';
    for (let i = 0; i < n; i++) {
      let terms = '';
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        terms += ` &minus; (${A[i][j]})&middot;x<sub>${j + 1}</sub><sup>(k)</sup>`;
      }
      html += `<div class="formula-row">x<sub>${i + 1}</sub><sup>(k+1)</sup> = [ ${b[i]}${terms} ] / ${A[i][i]}</div>`;
    }
    return html + '</div>';
  }

  private isDiagDominant(A: number[][], n: number): boolean {
    for (let i = 0; i < n; i++) {
      const diag = Math.abs(A[i][i]);
      let offSum = 0;
      for (let j = 0; j < n; j++) { if (j !== i) offSum += Math.abs(A[i][j]); }
      if (diag <= offSum) return false;
    }
    return true;
  }
}
