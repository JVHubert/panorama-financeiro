// Alertas da automação no Telegram: quando um workflow falha e quando ele nem chega a rodar.
// Módulo puro (sem rede e sem disco): quem fala com o GitHub e o Telegram são os tools/.
// As mensagens nunca levam dado pessoal: só o nome do workflow, o passo e o link.

const FUSO = 'America/Sao_Paulo';
const HORA = 3600000;

// O que costuma estar por trás de cada passo, pelo nome que ele tem nos workflows.
export const DICAS = [
  {
    passo: /indicadores|coletar/i,
    dica: 'o Banco Central ou a cotação do dólar não responderam. Costuma voltar sozinho em algumas horas.',
  },
  {
    passo: /telegram/i,
    dica: 'o Telegram não respondeu, ou o token do bot mudou (confira o secret TELEGRAM_TOKEN).',
  },
  {
    passo: /privado/i,
    dica: 'o repositório privado recusou a leitura ou a gravação. O mais comum é o token DADOS_TOKEN ter vencido: gere outro no GitHub e atualize o secret.',
  },
  {
    passo: /contas|test/i,
    dica: 'uma conta deu diferente do esperado nos testes. Não muda nada no seu dinheiro, mas o site não foi atualizado.',
  },
  {
    passo: /relat[óo]rio/i,
    dica: 'o relatório não conseguiu ser montado ou enviado.',
  },
  {
    passo: /publicar|json/i,
    dica: 'o GitHub não aceitou salvar os indicadores novos. Costuma resolver sozinho na próxima rodada.',
  },
  {
    passo: /site|pages|deploy|artifact/i,
    dica: 'o GitHub não publicou o site. O painel continua mostrando os números anteriores.',
  },
  {
    passo: /depend[êe]ncias|npm ci|setup-node|checkout/i,
    dica: 'o GitHub não conseguiu preparar o ambiente. Costuma ser temporário.',
  },
];

const DICA_PADRAO = 'erro inesperado.';
const O_QUE_FAZER = 'Se repetir na próxima rodada, mande o link para o Claude ou o DeepSeek.';

export function dicaDoPasso(passo) {
  const nome = String(passo ?? '');
  return DICAS.find((item) => item.passo.test(nome))?.dica ?? DICA_PADRAO;
}

export function dataHoraBr(instante) {
  const data = new Date(instante);
  if (Number.isNaN(data.getTime())) return '–';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(data);
}

// Um workflow falhou: onde parou, o que costuma ser e o link para ver os detalhes.
export function mensagemDeFalha({ workflow, passo, link }) {
  return [
    `⚠️ Falhou: ${workflow}`,
    `Onde parou: ${passo || 'não consegui descobrir o passo'}`,
    `O que costuma ser: ${dicaDoPasso(passo)}`,
    O_QUE_FAZER,
    link ? `Detalhes: ${link}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

// O workflow terminou, mas com um passo que pode falhar sem derrubar o resto (o relatório que
// sai com os indicadores da coleta anterior, por exemplo).
export function mensagemDeAviso({ workflow, passo, consequencia, link }) {
  return [
    `ℹ️ ${workflow} rodou, mas com um problema`,
    `Onde: ${passo}`,
    `O que costuma ser: ${dicaDoPasso(passo)}`,
    consequencia ?? '',
    link ? `Detalhes: ${link}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

// --- O vigia: o que deveria ter rodado e não rodou ---

// O que o vigia acompanha. `arquivo` é o nome do .yml (é por ele que a API do GitHub acha o workflow).
export const VIGIADOS = [
  {
    arquivo: 'atualizar.yml',
    nome: 'Atualizar indicadores',
    // Roda 2×/dia, mas o GitHub atrasa horas: 30 h sem sucesso já é problema de verdade.
    maximoSemSucesso: 30 * HORA,
    comoRodar: 'rodar à mão',
  },
  {
    arquivo: 'semanal.yml',
    nome: 'Relatório semanal',
    semanal: true,
    comoRodar: 'rodar o relatório à mão',
  },
];

// O domingo às 18h de Brasília (21h UTC) mais recente que já passou.
export function ultimoDomingoDoRelatorio(agora) {
  const instante = new Date(agora);
  const domingo = new Date(
    Date.UTC(instante.getUTCFullYear(), instante.getUTCMonth(), instante.getUTCDate() - instante.getUTCDay(), 21),
  );
  if (domingo.getTime() > instante.getTime()) domingo.setUTCDate(domingo.getUTCDate() - 7);
  return domingo.getTime();
}

// O GitHub atrasa o agendamento em até algumas horas: só cobra o relatório 5 h depois das 18h.
export const FOLGA_DO_RELATORIO = 5 * HORA;

const sucessos = (execucoes = []) =>
  execucoes
    .filter((execucao) => execucao?.conclusion === 'success')
    .map((execucao) => Date.parse(execucao.created_at))
    .filter(Number.isFinite)
    .sort((a, b) => b - a);

// Devolve o atraso de um workflow ({ chave, nome, ultimoSucesso, ... }) ou null se está em dia.
// `chave` identifica o atraso para não avisar duas vezes do mesmo problema.
export function atrasoDoWorkflow(vigiado, execucoes, agora) {
  const momento = new Date(agora).getTime();
  const ultimoSucesso = sucessos(execucoes)[0] ?? null;

  if (vigiado.semanal) {
    const domingo = ultimoDomingoDoRelatorio(momento);
    if (momento < domingo + FOLGA_DO_RELATORIO) return null;
    // Vale qualquer sucesso desde 1 h antes do horário (inclusive um disparado à mão).
    if (ultimoSucesso !== null && ultimoSucesso >= domingo - HORA) return null;
    return {
      chave: `${vigiado.arquivo}:${new Date(domingo).toISOString().slice(0, 10)}`,
      nome: vigiado.nome,
      arquivo: vigiado.arquivo,
      ultimoSucesso,
      motivo: 'O relatório de domingo (18h) não saiu até agora.',
      comoRodar: vigiado.comoRodar,
    };
  }

  if (ultimoSucesso !== null && momento - ultimoSucesso <= vigiado.maximoSemSucesso) return null;
  const desde = ultimoSucesso ?? momento - vigiado.maximoSemSucesso;
  return {
    // Um aviso por dia de atraso, no máximo.
    chave: `${vigiado.arquivo}:${new Date(momento).toISOString().slice(0, 10)}`,
    nome: vigiado.nome,
    arquivo: vigiado.arquivo,
    ultimoSucesso,
    motivo: `Faz ${Math.floor((momento - desde) / HORA)} h que não roda até o fim.`,
    comoRodar: vigiado.comoRodar,
  };
}

export function mensagemDeAtraso(atraso, { repositorio }) {
  const link = `https://github.com/${repositorio}/actions/workflows/${atraso.arquivo}`;
  return [
    `⚠️ Não rodou: ${atraso.nome}`,
    atraso.motivo,
    atraso.ultimoSucesso === null
      ? 'Não achei nenhuma execução que tenha dado certo recentemente.'
      : `Última vez que deu certo: ${dataHoraBr(atraso.ultimoSucesso)}.`,
    `O que fazer: abra o link e toque em "Run workflow" para ${atraso.comoRodar}. Se falhar, chega outro alerta dizendo onde parou.`,
    `Link: ${link}`,
  ].join('\n');
}

// Só os atrasos ainda não avisados. `enviados` é { chave: dataDoAviso } e é podado para não crescer
// para sempre (guarda 30 dias).
export function alertasNovos(atrasos, enviados = {}, agora = Date.now()) {
  const limite = new Date(agora).getTime() - 30 * 24 * HORA;
  const mantidos = Object.fromEntries(
    Object.entries(enviados ?? {}).filter(([, quando]) => Date.parse(quando) >= limite),
  );
  const novos = atrasos.filter((atraso) => atraso && !mantidos[atraso.chave]);
  const registro = { ...mantidos };
  for (const atraso of novos) registro[atraso.chave] = new Date(agora).toISOString();
  return { novos, registro };
}
