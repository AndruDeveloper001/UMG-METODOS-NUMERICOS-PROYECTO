import { Injectable } from '@angular/core';

export type StepType = 'info' | 'success' | 'warning' | 'error' | 'iter' | 'substep';

export interface JacobiStep {
  type: StepType;
  title: string;
  lines: string[];   // each line rendered as its own row
}

export interface JacobiIteration {
  iter: number;
  detail: IterDetail[];   // per-variable detail
  values: number[];
  error: number;
}

export interface IterDetail {
  varIdx: number;        // which x_i
  numerator: string;     // human-readable formula evaluation
  denominator: number;
  result: number;
}

export interface JacobiResult {
  steps: JacobiStep[];
  iterations: JacobiIteration[];
  solution: number[] | null;
  converged: boolean;
  iterCount: number;
  n: number;
}

@Injectable({ providedIn: 'root' })
export class JacobiService {

  solve(A: number[][], b: number[], tol: number, maxIter: number): JacobiResult {
    const n = A.length;
    const steps: JacobiStep[] = [];
    const iterHistory: JacobiIteration[] = [];

    /* ── 1. Diagonal zero check ── */
    for (let i = 0; i < n; i++) {
      if (A[i][i] === 0) {
        steps.push({ type: 'error', title: 'Error: elemento diagonal nulo',
          lines: [
            `A[${i+1}][${i+1}] = 0. El método de Jacobi requiere que todos los elementos de la diagonal sean distintos de cero.`,
            'Reordena las ecuaciones para que el coeficiente mayor de cada variable quede en la diagonal principal.'
          ]
        });
        return { steps, iterations: [], solution: null, converged: false, iterCount: 0, n };
      }
    }

    /* ── 2. Print system ── */
    const sysLines: string[] = [];
    for (let i = 0; i < n; i++) {
      let eq = '';
      for (let j = 0; j < n; j++) {
        const c = A[i][j];
        const sign = j === 0 ? (c < 0 ? '−' : '') : (c < 0 ? ' − ' : ' + ');
        eq += `${sign}(${Math.abs(c)})·x<sub>${j+1}</sub>`;
      }
      sysLines.push(`Ec.${i+1}: &nbsp; ${eq} &nbsp;=&nbsp; ${b[i]}`);
    }
    steps.push({ type: 'info', title: 'Sistema ingresado [A|b]', lines: sysLines });

    /* ── 3. Diagonal dominance ── */
    const ddLines: string[] = [];
    let allDom = true;
    for (let i = 0; i < n; i++) {
      const diag = Math.abs(A[i][i]);
      let offSum = 0;
      for (let j = 0; j < n; j++) { if (j !== i) offSum += Math.abs(A[i][j]); }
      const ok = diag > offSum;
      if (!ok) allDom = false;
      ddLines.push(`Fila ${i+1}: |${A[i][i]}| = ${diag} ${ok ? '>' : '≤'} ${offSum.toFixed(4)} = Σ|a<sub>${i+1}j</sub>| &nbsp;→ ${ok ? '✓ dominante' : '✗ no dominante'}`);
    }
    ddLines.push(allDom
      ? 'Conclusión: El sistema es estrictamente diagonalmente dominante → convergencia garantizada.'
      : 'Conclusión: El sistema NO es estrictamente diagonalmente dominante. El método podría no converger.');
    steps.push({ type: allDom ? 'success' : 'warning', title: 'Verificación de diagonal dominante', lines: ddLines });

    /* ── 4. Iteration formulas ── */
    const fLines: string[] = ['Para cada iteración k, se calcula x<sub>i</sub><sup>(k+1)</sup> usando los valores de la iteración anterior x<sup>(k)</sup>:'];
    for (let i = 0; i < n; i++) {
      let num = `${b[i]}`;
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const sign = A[i][j] < 0 ? ' + ' : ' − ';
        num += `${sign}(${Math.abs(A[i][j])})·x<sub>${j+1}</sub><sup>(k)</sup>`;
      }
      fLines.push(`x<sub>${i+1}</sub><sup>(k+1)</sup> = [ ${num} ] / ${A[i][i]}`);
    }
    steps.push({ type: 'info', title: 'Fórmulas iterativas de Jacobi', lines: fLines });

    /* ── 5. Initial vector ── */
    const x0 = new Array(n).fill(0);
    steps.push({ type: 'info', title: 'Vector inicial x⁽⁰⁾',
      lines: [
        'Se parte del vector cero como aproximación inicial (x<sub>i</sub><sup>(0)</sup> = 0 para todo i):',
        x0.map((v, i) => `x<sub>${i+1}</sub><sup>(0)</sup> = 0`).join(' &nbsp;|&nbsp; ')
      ]
    });

    /* ── 6. Iterate ── */
    let x = [...x0];
    let converged = false;
    let iterDone = 0;

    for (let k = 0; k < maxIter; k++) {
      const xNew = new Array(n).fill(0);
      const detail: IterDetail[] = [];

      for (let i = 0; i < n; i++) {
        // Build numerator string with substituted values
        let numVal = b[i];
        let numStr = `${b[i]}`;
        for (let j = 0; j < n; j++) {
          if (j === i) continue;
          const term = A[i][j] * x[j];
          numVal -= term;
          const sign = A[i][j] < 0 ? ' + ' : ' − ';
          numStr += `${sign}(${Math.abs(A[i][j])})·(${this.fmt(x[j], 4)})`;
        }
        numStr += ` = ${this.fmt(numVal, 6)}`;
        xNew[i] = numVal / A[i][i];
        detail.push({ varIdx: i, numerator: numStr, denominator: A[i][i], result: xNew[i] });
      }

      const err = Math.max(...xNew.map((v, i) => Math.abs(v - x[i])));
      iterHistory.push({ iter: k + 1, detail, values: [...xNew], error: err });
      x = [...xNew];
      iterDone = k + 1;
      if (err < tol) { converged = true; break; }
    }

    steps.push({
      type: converged ? 'success' : 'warning',
      title: converged ? `Convergencia alcanzada en ${iterDone} iteración(es)` : `No convergió tras ${maxIter} iteraciones`,
      lines: converged
        ? [`El error máximo entre x<sup>(${iterDone})</sup> y x<sup>(${iterDone-1})</sup> es menor que ε = ${tol}. El proceso termina.`]
        : [`Se alcanzó el límite de ${maxIter} iteraciones. Último error: ${iterHistory[iterHistory.length-1]?.error.toExponential(4)}. Considera aumentar el máximo o verificar el sistema.`]
    });

    return { steps, iterations: iterHistory, solution: x, converged, iterCount: iterDone, n };
  }

  fmt(v: number, d = 6): string { return Number(v).toFixed(d); }
}
