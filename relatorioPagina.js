// Relatório semanal em HTML para a página de domingo do JV11 (lido no celular).
// Mesmos números do relatório em texto e da imagem — muda a roupa: nada de tabela larga, tudo em
// cartões que cabem em 390px, com os números que importam grandes no topo.
// A imagem (relatorioHtml.js) continua existindo como plano B, quando o JV11 não responde.
import { formatarData, formatarNumero, formatarPercentual } from './indicadores.js';
import {
  alocacao,
  dadosMacro,
  fraseResumo,
  juntarPendencias,
  linhasDaCarteira,
  linhasDaReserva,
  nivelDaReserva,
  notaDoExcedente,
  notasDaReserva,
  numeroDaSemana,
  paraEstaSemana,
  rotuloDoMarco,
  tituloDaCarteira,
  tituloDaReserva,
  tituloDaSemana,
  tituloDasPendencias,
  tituloDoJogo,
  tituloDoMacro,
  tituloDoPatrimonio,
  tituloDoSobra,
  totalDaReserva,
  variacaoDaSemana,
} from './relatorio.js';

const reais = (valor) => `R$ ${formatarNumero(valor, 2)}`;
const reaisCurto = (valor) =>
  Math.abs(valor) >= 1000 ? `R$ ${formatarNumero(valor / 1000, 1)} mil` : `R$ ${formatarNumero(valor, 0)}`;

// Mesma paleta da página do JV11 (modo escuro); os níveis de resultado são os mesmos da imagem.
const CSS = `
:root {
  --fundo: #0f1216;
  --cartao: #171b21;
  --cartao2: #1f242c;
  --texto: #e7e5e0;
  --apagado: #9aa1ab;
  --linha: #2a313b;
  --destaque: #9ece6a;
  --muito-bom: #6aa9ff;
  --bom: #2ecc71;
  --neutro: #9aa1ab;
  --ruim: #d4a017;
  --muito-ruim: #ff6b6b;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { color: var(--texto); font: 16.5px/1.5 system-ui, "Segoe UI", Roboto, sans-serif; }
.topo { margin-bottom: 14px; }
.topo .quando { color: var(--apagado); font-size: 14px; }
.topo .resumo { font-size: 18px; line-height: 1.4; margin-top: 6px; }
.kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 14px 0; }
.kpi { background: var(--cartao); border-radius: 12px; padding: 12px; }
.kpi .rotulo { color: var(--apagado); font-size: 13px; display: block; }
.kpi .valor { font-size: 22px; font-weight: 700; line-height: 1.2; display: block; margin-top: 2px; font-variant-numeric: tabular-nums; }
.kpi .sub { font-size: 13px; color: var(--apagado); display: block; margin-top: 2px; }
.cartao { background: var(--cartao); border-radius: 12px; padding: 14px; margin-bottom: 10px; }
.cartao h3 { font-size: 16.5px; line-height: 1.35; margin-bottom: 10px; }
.festa { border: 1px solid var(--bom); }
.festa h3 { color: var(--bom); }
.semana .pergunta { font-size: 17px; line-height: 1.45; background: var(--cartao2); border-left: 3px solid var(--destaque); padding: 10px 12px; border-radius: 6px; margin-top: 8px; }
.item { margin-top: 6px; }
.nota { color: var(--apagado); font-size: 13.5px; margin-top: 8px; }
.linha { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-top: 1px solid var(--linha); font-variant-numeric: tabular-nums; }
.linha:first-of-type { border-top: 0; }
.linha .r { text-align: right; white-space: nowrap; }
.barra-jogo { height: 12px; border-radius: 6px; background: var(--cartao2); overflow: hidden; margin: 4px 0 10px; }
.barra-jogo i { display: block; height: 100%; background: var(--bom); border-radius: 6px; }
.forte { color: var(--bom); font-weight: 600; }
.alocacao { display: flex; height: 14px; border-radius: 7px; overflow: hidden; background: var(--cartao2); margin-top: 8px; }
.alocacao i { display: block; height: 100%; }
.alocacao i:nth-child(1) { background: #6aa9ff; }
.alocacao i:nth-child(2) { background: #e0af68; }
.alocacao i:nth-child(3) { background: #bb9af7; }
.partes { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 13.5px; color: var(--apagado); margin-top: 6px; }
.partes b { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 5px; }
.ativo { background: var(--cartao2); border-radius: 10px; padding: 10px 12px; margin-top: 8px; }
.ativo .cab { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
.ativo .nome { font-weight: 650; }
.ativo .grande { font-size: 19px; font-weight: 700; font-variant-numeric: tabular-nums; }
.ativo .det { color: var(--apagado); font-size: 13.5px; margin-top: 2px; }
.macro { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.macro div { background: var(--cartao2); border-radius: 10px; padding: 10px; }
.macro span { display: block; color: var(--apagado); font-size: 13px; }
.macro b { display: block; font-size: 18px; font-variant-numeric: tabular-nums; }
.macro em { font-style: normal; font-size: 13px; color: var(--apagado); }
.pendencia { list-style: none; }
.pendencia li { color: var(--ruim); padding: 4px 0; }
.legenda { display: flex; flex-wrap: wrap; gap: 6px 14px; color: var(--apagado); font-size: 12.5px; margin-top: 6px; }
.muito-bom { color: var(--muito-bom); }
.bom { color: var(--bom); }
.neutro { color: var(--neutro); }
.ruim { color: var(--ruim); }
.muito-ruim { color: var(--muito-ruim); }
`;

const cartao = (titulo, corpo, classe = '') => `<div class="cartao${classe ? ` ${classe}` : ''}"><h3>${titulo}</h3>${corpo}</div>`;
const linha = (rotulo, valor, classe = '') => `<div class="linha"><span>${rotulo}</span><span class="r${classe ? ` ${classe}` : ''}">${valor}</span></div>`;

function kpisHtml(dados) {
  const { total } = alocacao(dados);
  const variacao = variacaoDaSemana(dados);
  const custo = Number(dados.custoMensal) || 0;
  const reserva = totalDaReserva(dados.reserva);
  const alvo = dados.reserva?.alvoMeses ?? 6;
  const meses = custo && reserva ? reserva / custo : null;
  const juroReal = dados.painel?.indicadores?.find((c) => c.id === 'juro-real')?.valor;
  const jogo = dados.jogo;

  const tiles = [
    `<div class="kpi"><span class="rotulo">Patrimônio</span><span class="valor">${reaisCurto(total)}</span>${
      variacao === null
        ? ''
        : `<span class="sub ${variacao >= 0 ? 'bom' : 'ruim'}">${variacao >= 0 ? '+' : '−'}${formatarPercentual(Math.abs(variacao))} na semana</span>`
    }</div>`,
  ];
  if (meses !== null) {
    tiles.push(
      `<div class="kpi"><span class="rotulo">Reserva</span><span class="valor ${nivelDaReserva(meses, alvo).classe}">${formatarNumero(meses, 1)} meses</span><span class="sub">meta: ${alvo} meses</span></div>`,
    );
  }
  if (jogo?.proximoMarco) {
    tiles.push(
      `<div class="kpi"><span class="rotulo">Próximo marco</span><span class="valor">${formatarPercentual(jogo.percentual, 0)}</span><span class="sub">de ${rotuloDoMarco(jogo.proximoMarco)}</span></div>`,
    );
  }
  if (Number.isFinite(juroReal)) {
    tiles.push(
      `<div class="kpi"><span class="rotulo">Juro real</span><span class="valor">${formatarNumero(juroReal, 2)}%</span><span class="sub">ao ano, acima da inflação</span></div>`,
    );
  }
  return `<div class="kpis">${tiles.join('')}</div>`;
}

function comemoracaoHtml(comemoracoes) {
  if (!comemoracoes?.length) return '';
  const corpo = comemoracoes
    .map(
      (c) =>
        `<p class="item">Você passou de <span class="forte">${rotuloDoMarco(c.marco)}</span> além da reserva! Prêmio liberado: até ${reais(
          c.valorLiberado,
        )}${c.premio ? ` (<span class="forte">${c.premio}</span>)` : ''}, para comprar até ${formatarData(c.prazo)}.</p>`,
    )
    .join('');
  return cartao(
    'Marco batido',
    `${corpo}<p class="nota">Depois de comprar, mande no Telegram: /premio &lt;valor gasto&gt; | &lt;a frase que você quer guardar&gt;</p>`,
    'festa',
  );
}

function paraEstaSemanaHtml(dados) {
  const { itens, pergunta } = paraEstaSemana(dados);
  const lista = itens.map((item) => `<p class="item">${item}</p>`).join('');
  const placar = dados.caderno?.placar?.linha ? `<p class="nota">${dados.caderno.placar.linha}</p>` : '';
  return cartao(tituloDaSemana(itens), `${lista}<p class="pergunta">${pergunta}</p>${placar}`, 'semana');
}

function jogoHtml(dados) {
  const jogo = dados.jogo;
  if (!jogo) return '';
  if (!jogo.proximoMarco) {
    return cartao('Jogo dos marcos', '<div class="barra-jogo"><i style="width:100%"></i></div><p>Você passou do último marco da lista: hora de escolher os próximos.</p>');
  }
  const meses = !Number.isFinite(jogo.meses)
    ? 'no ritmo atual não chega'
    : jogo.meses > 0
      ? `~${jogo.meses} ${jogo.meses === 1 ? 'mês' : 'meses'} no ritmo atual`
      : 'bateu o marco; falta a confirmação de mais um domingo';
  const juros = jogo.juros?.fracao;
  const partes = [
    `<div class="barra-jogo"><i style="width:${(jogo.percentual * 100).toFixed(1)}%"></i></div>`,
    linha('Faltam', reais(jogo.falta)),
    linha('Quando', meses),
    jogo.premio?.item
      ? linha('Prêmio', `até ${reais(jogo.premio.valor)} · <span class="forte">${jogo.premio.item.nome}</span>`)
      : linha('Prêmio', `escolha o prêmio de ${rotuloDoMarco(jogo.proximoMarco)}`),
  ];
  if (Number.isFinite(juros)) partes.push(`<p class="nota">Nesse trecho, ~${formatarPercentual(juros, 0)} virá dos juros. A reserva de emergência fica fora da conta.</p>`);
  const aberto = jogo.premioAberto;
  if (aberto && !aberto.expirado) {
    partes.push(
      `<p class="item">Prêmio liberado: até ${reais(aberto.valorLiberado)}${aberto.premio ? ` (<span class="forte">${aberto.premio}</span>)` : ''}, compre até ${formatarData(
        aberto.prazo,
      )} (${aberto.diasAteOPrazo} ${aberto.diasAteOPrazo === 1 ? 'dia' : 'dias'}).</p>`,
    );
  } else if (aberto?.expirado) {
    partes.push(`<p class="nota">O prêmio do marco de ${rotuloDoMarco(aberto.marco)} expirou; o dinheiro fica investido.</p>`);
  }
  if (jogo.semHistorico) partes.push('<p class="nota">Primeiro domingo do histórico: a confirmação do marco começa no próximo.</p>');
  return cartao(tituloDoJogo(jogo) ?? 'Jogo dos marcos', partes.join(''));
}

function patrimonioHtml(dados) {
  const { total, partes } = alocacao(dados);
  const variacao = variacaoDaSemana(dados);
  const linhas = [linha('Total', reais(total))];
  if (variacao !== null) {
    linhas.push(linha('Na semana (estimativa)', `${variacao >= 0 ? '+' : '−'}${formatarPercentual(Math.abs(variacao))}`, variacao >= 0 ? 'bom' : 'ruim'));
  }
  const cores = ['#6aa9ff', '#e0af68', '#bb9af7'];
  const barra = partes.length
    ? `<div class="alocacao">${partes.map((p) => `<i style="width:${(p.fracao * 100).toFixed(1)}%"></i>`).join('')}</div><div class="partes">${partes
        .map((p, i) => `<span><b style="background:${cores[i] ?? '#9aa1ab'}"></b>${p.nome} ${formatarPercentual(p.fracao, 1)}</span>`)
        .join('')}</div>`
    : '';
  return cartao(tituloDoPatrimonio(dados), `${linhas.join('')}${barra}`);
}

function reservaHtml(reserva, custoMensal) {
  const custo = Number(custoMensal) || Number(reserva?.custoMensal) || 0;
  const atual = totalDaReserva(reserva);
  if (!custo || !atual) return cartao(tituloDaReserva({}), '<p class="nota">sem dado para calcular</p>');
  const alvoMeses = reserva?.alvoMeses ?? 6;
  const meses = atual / custo;
  const partes = [
    linha('Saldo', reais(atual)),
    linha('Cobertura', `${formatarNumero(meses, 1)} meses de custo (meta ${alvoMeses})`, nivelDaReserva(meses, alvoMeses).classe),
  ];
  const excedente = notaDoExcedente({ meses, alvoMeses, atual, custo });
  if (excedente) partes.push(`<p class="nota">${excedente}</p>`);
  const { linhas } = linhasDaReserva(reserva);
  for (const l of linhas) {
    const detalhes = [`prometido ${l.prometido}`, `entregou <span class="${l.nivel?.classe ?? ''}">${l.entregou}</span>`, `ao ano ${l.aoAno}`]
      .filter((d) => !d.replace(/<[^>]+>/g, '').trim().endsWith('–')) // "–" = sem dado: some da linha
      .join(' · ');
    partes.push(`<div class="ativo"><div class="cab"><span class="nome">${l.onde}</span><span class="grande">R$ ${l.saldo}</span></div>${detalhes ? `<div class="det">${detalhes}</div>` : ''}</div>`);
  }
  for (const nota of notasDaReserva(linhas)) partes.push(`<p class="nota">${nota}</p>`);
  return cartao(tituloDaReserva({ reserva, custoMensal: custo }), partes.join(''));
}

function carteiraHtml(posicoes, { patrimonio = null } = {}) {
  const { linhas } = linhasDaCarteira(posicoes, { patrimonio });
  if (!linhas.length) return cartao(tituloDaCarteira([]), '<p class="nota">nenhuma posição em carteira.json</p>');
  const partes = linhas.map((l) => {
    const fracao = l.fracao === null ? '' : ` · ${formatarPercentual(l.fracao, 1)} do patrimônio`;
    const lotes = l.divergem
      ? `<div class="det">${l.lotes.map((lote) => `${lote.quantidade} un.: ${lote.aplicado} → ${lote.hoje} (<span class="${lote.nivel?.classe ?? ''}">${lote.resultado}</span>)`).join('<br>')}</div>`
      : '';
    return `<div class="ativo"><div class="cab"><span class="nome">${l.ticker}</span><span class="grande ${l.nivel?.classe ?? ''}">${l.resultado}</span></div><div class="det">aplicado ${l.aplicado} → hoje ${l.hoje}${fracao}</div>${lotes}${
      l.fraseCdi ? `<div class="det">${l.fraseCdi}</div>` : ''
    }</div>`;
  });
  partes.push('<p class="nota">Só preço; não inclui dividendos nem imposto.</p>');
  return cartao(tituloDaCarteira(posicoes), partes.join(''));
}

function sobraHtml({ receitaMensal, custoMensal, aporteMensal }) {
  if (!receitaMensal || !custoMensal) return '';
  const sobra = receitaMensal - custoMensal;
  const semDestino = sobra - (Number(aporteMensal) || 0);
  const partes = [linha('Sobra do mês', reais(sobra))];
  if (aporteMensal) partes.push(linha('Aporte programado', reais(aporteMensal)));
  partes.push(linha('Sem destino', semDestino > 0 ? reais(semDestino) : 'nada', semDestino > 0 ? 'ruim' : 'bom'));
  return cartao(tituloDoSobra({ receitaMensal, custoMensal, aporteMensal }), partes.join(''));
}

function macroHtml(painel) {
  const { linhas, notas } = dadosMacro(painel);
  const blocos = linhas.map((l) => `<div><span>${l.nome}</span><b>${l.valor}</b>${l.semana ? `<em>semana: ${l.semana}</em>` : ''}</div>`).join('');
  return cartao(tituloDoMacro(painel), `<div class="macro">${blocos}</div>${notas.length ? `<p class="nota">${notas.join(' · ')}</p>` : ''}`);
}

function legendaHtml() {
  return [
    ['muito-bom', '+20% ou mais'],
    ['bom', 'positivo'],
    ['neutro', 'perto de zero'],
    ['ruim', 'negativo'],
    ['muito-ruim', '−20% ou menos'],
  ]
    .map(([classe, texto]) => `<span class="${classe}">● ${texto}</span>`)
    .join('');
}

export function montarPagina(dados = {}) {
  const { data, painel, posicoes = [], reserva, custoMensal } = dados;
  const { total } = alocacao(dados);
  const { pendencias } = juntarPendencias({ ...dados, patrimonio: total });

  const partes = [
    `<div class="topo"><p class="quando">${formatarData(data)} · semana ${numeroDaSemana(data)}</p><p class="resumo">${fraseResumo(dados)}</p></div>`,
    kpisHtml(dados),
    comemoracaoHtml(dados.jogo?.comemoracoes),
    paraEstaSemanaHtml(dados),
    jogoHtml(dados),
    patrimonioHtml(dados),
    reservaHtml(reserva, custoMensal),
    carteiraHtml(posicoes, { patrimonio: total }),
    sobraHtml(dados),
    macroHtml(painel),
  ];
  if (pendencias.size) {
    partes.push(cartao(tituloDasPendencias(pendencias), `<ul class="pendencia">${[...pendencias].map((item) => `<li>${item}</li>`).join('')}</ul>`));
  }
  partes.push(`<p class="legenda">${legendaHtml()}</p>`);

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${CSS}</style></head><body>${partes.join(
    '',
  )}</body></html>`;
}
