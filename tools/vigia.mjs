// O vigia: confere se o que deveria ter rodado rodou de fato (o GitHub às vezes nem começa o
// agendamento, ou desliga um workflow). Roda junto com o workflow "Telegram", que é o mais frequente.
// Avisa uma vez só por problema: o que já foi avisado fica em alertas.json, nos dados privados.
// Precisa de GITHUB_TOKEN com `actions: read`.
import { mkdir, writeFile } from 'node:fs/promises';
import { VIGIADOS, alertasNovos, atrasoDoWorkflow, mensagemDeAtraso } from '../alertas.js';
import { dadosUrl, lerJson } from './arquivos.mjs';
import { enviarAlerta } from './notificar.mjs';

const { GITHUB_API_URL = 'https://api.github.com', GITHUB_REPOSITORY, GITHUB_TOKEN } = process.env;
const REGISTRO = dadosUrl('alertas.json');

if (!GITHUB_REPOSITORY || !GITHUB_TOKEN) {
  console.log('vigia: sem GITHUB_REPOSITORY e GITHUB_TOKEN, nada a conferir');
  process.exit(0);
}

async function execucoes(arquivo) {
  const resposta = await fetch(
    `${GITHUB_API_URL}/repos/${GITHUB_REPOSITORY}/actions/workflows/${arquivo}/runs?per_page=30`,
    { headers: { authorization: `Bearer ${GITHUB_TOKEN}`, accept: 'application/vnd.github+json' } },
  );
  if (!resposta.ok) throw new Error(`${resposta.status} ao listar ${arquivo}`);
  return (await resposta.json()).workflow_runs ?? [];
}

const agora = Date.now();
const atrasos = [];
for (const vigiado of VIGIADOS) {
  try {
    atrasos.push(atrasoDoWorkflow(vigiado, await execucoes(vigiado.arquivo), agora));
  } catch (erro) {
    // A API do GitHub fora do ar não é atraso nosso: tenta de novo na próxima rodada.
    console.log(`::warning::vigia não conseguiu conferir ${vigiado.nome} (${erro.message})`);
  }
}

let enviados = {};
try {
  enviados = await lerJson(REGISTRO, '');
} catch {
  // Primeira vez: nada avisado ainda.
}

const { novos, registro } = alertasNovos(atrasos.filter(Boolean), enviados, agora);
for (const atraso of novos) {
  await enviarAlerta(mensagemDeAtraso(atraso, { repositorio: GITHUB_REPOSITORY }));
}

if (novos.length || Object.keys(registro).length !== Object.keys(enviados ?? {}).length) {
  await mkdir(new URL('./', REGISTRO), { recursive: true });
  await writeFile(REGISTRO, `${JSON.stringify(registro, null, 2)}\n`, 'utf8');
}
console.log(`vigia: ${atrasos.filter(Boolean).length} atraso(s), ${novos.length} alerta(s) novo(s)`);
