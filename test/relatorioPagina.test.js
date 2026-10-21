// A versão em HTML para o celular (página de domingo do JV11): sem tabela, números no topo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { montarPagina } from '../relatorioPagina.js';
import { resumoPosicao } from '../relatorio.js';

const PAINEL = {
  atualizadoEm: '2026-10-11T04:00:00.000Z',
  indicadores: [
    { id: 'meta-selic', valor: 13.75, serie: [{ data: '2026-09-20', valor: 14 }, { data: '2026-10-04', valor: 13.75 }] },
    { id: 'cdi', valor: 13.65, extra: { rotulo: 'acumulado em 12 meses', percentual: 0.1451 }, serie: [{ data: '2026-10-08', valor: 0.05166 }] },
    { id: 'ipca', valor: 4.58, serie: [] },
    { id: 'juro-real', valor: 8.77, serie: [] },
    { id: 'dolar', valor: 4.9918, serie: [{ data: '2026-10-01', valor: 5.0119 }, { data: '2026-10-09', valor: 4.9892 }] },
  ],
};

const montar = (extra = {}) =>
  montarPagina({
    data: '2026-10-11',
    painel: PAINEL,
    posicoes: [
      resumoPosicao(
        { ticker: 'RENT3', quantidade: 10, precoMedio: 20, dataCompra: '2023-01-10' },
        { preco: 21, variacaoDia: 0.012, variacaoSemana: 0.05 },
        { cdiNoPeriodo: 0.5 },
      ),
    ],
    reserva: {
      alvoMeses: 6,
      detalhe: [
        { nome: 'Conta corrente', saldo: 2500 },
        { nome: 'Caixinha X', saldo: 10000, rendimento: 1000, dataAporte: '2025-06-30', medido: { dias: 469, total: 0.1111, taxaAnual: 0.0888, percentualDoCdi: 0.8 } },
      ],
    },
    receitaMensal: 7000,
    custoMensal: 4000,
    aporteMensal: 1000,
    ...extra,
  });

test('página do celular: sem tabela, com os números no topo', () => {
  const html = montar();
  assert.doesNotMatch(html, /<table/);
  assert.match(html, /class="kpis"/);
  assert.match(html, /Patrimônio/);
  assert.match(html, /meses<\/span>/);
  assert.match(html, /Juro real/);
  assert.match(html, /RENT3/);
  assert.match(html, /Caixinha X/);
  assert.match(html, /width=device-width/);
});

test('linha da reserva sem dado não mostra "prometido –"', () => {
  const html = montar();
  assert.doesNotMatch(html, /prometido –/);
});

test('comemoração do marco aparece no topo, sem emoji', () => {
  const html = montar({ jogo: { comemoracoes: [{ marco: 25000, valorLiberado: 900, premio: 'Tatuagem', prazo: '2026-11-10' }] } });
  assert.match(html, /Marco batido/);
  assert.match(html, /Tatuagem/);
  assert.doesNotMatch(html, /🎉/);
});
