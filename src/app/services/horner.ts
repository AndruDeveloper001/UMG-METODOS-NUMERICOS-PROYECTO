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
  isResidue: boolean;   // último elemento = residuo
}

/** Coeficientes del polinomio cociente Q(x) */
export interface QuotientTerm {
  exp: number;
  coeff: number;
  formatted: string;  // ej: "2x²"
}

export interface HornerResult {
  steps: HornerStep[];
  tableRows: HornerTableRow[];
  quotientTerms: QuotientTerm[];
  quotientPoly: string;      // Q(x) formateado
  residue: number;           // R
  value: number;             // P(x) = valor evaluado = R cuando x es raíz
  polynomial: string;
  nestedForm: string;
  isRoot: boolean;           // R ≈ 0 → x es raíz
  divisionIdentity: string;  // P(x) = Q(x)·(x − a) + R
}

@Injectable({ providedIn: 'root' })
export class HornerService {

  evaluate(coeffs: number[], x: number): HornerResult {
    const n = coeffs.length - 1;   // grado de P(x)
    const steps: HornerStep[] = [];
    const tableRows: HornerTableRow[] = [];

    const poly   = this.formatPolynomial(coeffs, n);
    const nested = this.buildNestedForm(coeffs, n);

    /* ────────────────────────────────────────────
       PASO 1 — Presentación del polinomio
    ──────────────────────────────────────────── */
    steps.push({ type: 'info', title: 'Polinomio ingresado',
      lines: [
        `P(x) = ${poly}`,
        `Grado: <strong>${n}</strong> &nbsp;·&nbsp; Número de coeficientes: <strong>${coeffs.length}</strong>`,
        `Valor a evaluar / divisor: &nbsp; x = <strong>${x}</strong> &nbsp;→&nbsp; divisor (x − ${x})`
      ]
    });

    /* ────────────────────────────────────────────
       PASO 2 — Forma anidada
    ──────────────────────────────────────────── */
    steps.push({ type: 'info', title: 'Paso 1 — Forma anidada de Horner',
      lines: [
        'Se reescribe P(x) en forma anidada para reducir operaciones al mínimo:',
        `P(x) = ${nested}`,
        `Ventaja: solo <strong>${n}</strong> multiplicaciones y <strong>${n}</strong> sumas ` +
        `(la forma estándar necesita hasta ${n + (n*(n-1)/2)} operaciones).`
      ]
    });

    /* ────────────────────────────────────────────
       PASO 3 — Lista de coeficientes
    ──────────────────────────────────────────── */
    const coeffLine = coeffs
      .map((c, i) => `a<sub>${n - i}</sub> = ${c}`)
      .join(' &nbsp;|&nbsp; ');
    steps.push({ type: 'info', title: 'Paso 2 — Coeficientes ordenados (mayor → menor grado)',
      lines: [
        coeffLine,
        'Estos son los valores que se usarán en la tabla de división sintética.'
      ]
    });

    /* ────────────────────────────────────────────
       PASO 4 — Inicialización
    ──────────────────────────────────────────── */
    steps.push({ type: 'info', title: 'Paso 3 — Inicialización del acumulador',
      lines: [
        `El primer coeficiente líder a<sub>${n}</sub> baja directo como primer valor acumulado:`,
        `b<sub>0</sub> = a<sub>${n}</sub> = <strong>${coeffs[0]}</strong>`,
        'Este b₀ es el primer coeficiente del cociente Q(x).'
      ]
    });

    tableRows.push({
      step: 0,
      label: `b₀ = a${n}`,
      coeff: coeffs[0],
      multExpr: null, multVal: null, addExpr: null,
      accumulated: coeffs[0],
      isResidue: n === 0
    });

    /* ────────────────────────────────────────────
       PASO 5 — División sintética iteración a iteración
    ──────────────────────────────────────────── */
    let b = coeffs[0];

    for (let i = 1; i < coeffs.length; i++) {
      const ai   = coeffs[i];
      const expB = n - i;          // exponente del término en Q(x) o R
      const mult = b * x;
      const acc  = mult + ai;

      const isLast = i === coeffs.length - 1;

      const multExpr = `${this.fmt(b, 4)} × ${x}`;
      const addExpr  = `${this.fmt(mult, 4)} + (${ai})`;

      steps.push({
        type: 'substep',
        title: `Paso ${i + 3} — ${isLast ? 'Residuo R' : `Coeficiente b<sub>${i}</sub> (para x<sup>${expB}</sup>`})`,
        lines: [
          `Tomar acumulador anterior b<sub>${i-1}</sub> = ${this.fmt(b, 6)} y multiplicar por x = ${x}:`,
          `&nbsp;&nbsp;&nbsp;b<sub>${i-1}</sub> × x &nbsp;=&nbsp; ${this.fmt(b,6)} × ${x} &nbsp;=&nbsp; <strong>${this.fmt(mult, 6)}</strong>`,
          `Sumar el coeficiente a<sub>${n - i}</sub> = ${ai}:`,
          `&nbsp;&nbsp;&nbsp;${this.fmt(mult,6)} + (${ai}) &nbsp;=&nbsp; <strong>${this.fmt(acc, 6)}</strong>`,
          isLast
            ? `Este es el <strong>residuo R = ${this.fmt(acc, 8)}</strong>. ` +
              `(Si R = 0, entonces x = ${x} es raíz de P(x).)`
            : `Nuevo coeficiente del cociente: &nbsp; b<sub>${i}</sub> = <strong>${this.fmt(acc, 8)}</strong> &nbsp;→ término x<sup>${expB}</sup> de Q(x)`
        ]
      });

      tableRows.push({
        step: i,
        label: isLast ? `R (residuo)` : `b${i} → x^${expB}`,
        coeff: ai,
        multExpr,
        multVal: mult,
        addExpr,
        accumulated: acc,
        isResidue: isLast
      });

      b = acc;
    }

    const residue = b;
    const isRoot  = Math.abs(residue) < 1e-9;

    /* ────────────────────────────────────────────
       PASO 6 — Construir cociente Q(x)
       Los primeros n valores acumulados (sin el último = R)
    ──────────────────────────────────────────── */
    const qCoeffs = tableRows.slice(0, tableRows.length - 1).map(r => r.accumulated);
    const quotientTerms: QuotientTerm[] = qCoeffs.map((c, i) => {
      const e = n - 1 - i;
      return { exp: e, coeff: c, formatted: this.formatTerm(c, e) };
    });
    const quotientPoly = this.formatPolynomial(qCoeffs, n - 1);

    /* ────────────────────────────────────────────
       PASO 7 — Identidad de la división
    ──────────────────────────────────────────── */
    const signR = residue >= 0 ? `+ ${this.fmt(residue, 6)}` : `− ${this.fmt(Math.abs(residue), 6)}`;
    const divisionIdentity = `P(x) = (${quotientPoly}) · (x − ${x}) ${signR}`;

    steps.push({ type: 'info', title: `Paso ${coeffs.length + 3} — Cociente Q(x) y Residuo R`,
      lines: [
        'Los primeros <strong>n</strong> valores acumulados de la tabla forman los coeficientes de Q(x):',
        `Q(x) = ${quotientPoly}`,
        `Residuo: &nbsp; R = <strong>${this.fmt(residue, 8)}</strong>`,
        'Verificación con la identidad de división:'
      ]
    });

    steps.push({ type: 'iter', title: 'Identidad de la división polinomial',
      lines: [
        'Por el teorema de la división:',
        `P(x) = Q(x) · (x − a) + R`,
        `P(x) = (${quotientPoly}) · (x − ${x}) + (${this.fmt(residue, 6)})`,
        `Evaluando en x = ${x}: &nbsp; P(${x}) = Q(${x}) · 0 + R = <strong>${this.fmt(residue, 8)}</strong>`
      ]
    });

    /* ────────────────────────────────────────────
       PASO 8 — Veredicto raíz
    ──────────────────────────────────────────── */
    steps.push({
      type: isRoot ? 'success' : 'info',
      title: isRoot ? `✓ x = ${x} ES raíz de P(x)` : `x = ${x} NO es raíz de P(x)`,
      lines: isRoot
        ? [
            `R = ${this.fmt(residue, 8)} ≈ 0 → x = ${x} es raíz exacta.`,
            `P(x) se factoriza como: P(x) = (${quotientPoly}) · (x − ${x})`,
            `Puedes aplicar Horner nuevamente a Q(x) para encontrar más raíces.`
          ]
        : [
            `R = ${this.fmt(residue, 8)} ≠ 0 → x = ${x} no es raíz.`,
            `P(${x}) = ${this.fmt(residue, 8)} (el residuo ES el valor de P en x = ${x}).`
          ]
    });

    return {
      steps, tableRows, quotientTerms, quotientPoly,
      residue, value: residue,
      polynomial: poly, nestedForm: nested,
      isRoot, divisionIdentity
    };
  }

  private fmt(v: number, d = 6): string { return Number(v).toFixed(d); }

  private formatTerm(c: number, exp: number): string {
    if (c === 0) return '';
    const absC = Math.abs(c);
    const coefStr = (absC === 1 && exp > 0) ? '' : String(absC);
    const xStr = exp === 0 ? '' : exp === 1 ? 'x' : `x^${exp}`;
    return `${coefStr}${xStr}`;
  }

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
